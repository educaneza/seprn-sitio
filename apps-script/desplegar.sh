#!/bin/bash
# Publica un backend de Apps Script desde la terminal con clasp, sin copiar y pegar.
#
#   apps-script/desplegar.sh <proyecto>                      vista previa: diff contra lo publicado, no cambia nada
#   apps-script/desplegar.sh <proyecto> --publicar "motivo"  sube los .gs y crea Nueva versión en la MISMA URL
#
# <proyecto> es una llave de apps-script/proyectos-clasp.json. Requiere `clasp login` una vez
# con la cuenta OTDE y la API de Apps Script activada (script.google.com/home/usersettings).
#
# Protecciones:
#   - aborta si el proyecto remoto tiene un archivo de código que no está en el repo (push lo borraría)
#   - aborta si appsscript.json no tiene el Web App con acceso "Cualquier usuario" (QA-NOTES #49)
#   - aborta si un .gs no pasa `node --check`
#   - después de publicar, vuelve a bajar el proyecto y compara contra el repo (hash antes/después)

set -euo pipefail

CLASP=(npx -y @google/clasp@3.4.1)
DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG="$DIR/proyectos-clasp.json"

PROYECTO="${1:-}"
MODO="${2:-}"
MOTIVO="${3:-}"

if [ -z "$PROYECTO" ] || ! jq -e --arg p "$PROYECTO" 'has($p) and ($p | startswith("_") | not)' "$CONFIG" >/dev/null; then
  echo "Uso: $0 <proyecto> [--publicar \"motivo\"]"
  echo "Proyectos: $(jq -r 'keys - ["_nota"] | join(", ")' "$CONFIG")"
  exit 1
fi
if [ -n "$MODO" ] && [ "$MODO" != "--publicar" ]; then
  echo "Segundo argumento desconocido: $MODO (solo --publicar)"; exit 1
fi
if [ "$MODO" = "--publicar" ] && [ -z "$MOTIVO" ]; then
  echo "--publicar necesita un motivo (va como descripción de la versión)"; exit 1
fi

SCRIPT_ID=$(jq -r --arg p "$PROYECTO" '.[$p].scriptId' "$CONFIG")
DEPLOYMENT_ID=$(jq -r --arg p "$PROYECTO" '.[$p].deploymentId' "$CONFIG")
ARCHIVOS=()
while IFS= read -r a; do ARCHIVOS+=("$a"); done < <(jq -r --arg p "$PROYECTO" '.[$p].archivos[]' "$CONFIG")

if [ -z "$SCRIPT_ID" ]; then
  echo "Falta scriptId de '$PROYECTO' en $CONFIG"; exit 1
fi

TRABAJO=$(mktemp -d)
trap 'rm -rf "$TRABAJO"' EXIT

# Baja el proyecto remoto a $1 y deja los archivos de código con extensión .gs
bajar() {
  mkdir -p "$1"
  jq -n --arg s "$SCRIPT_ID" '{scriptId: $s, rootDir: ".", scriptExtensions: [".gs", ".js"]}' > "$1/.clasp.json"
  (cd "$1" && "${CLASP[@]}" pull >/dev/null)
  find "$1" -name '*.js' | while IFS= read -r f; do mv "$f" "${f%.js}.gs"; done
}

# Nombre con que vive en Apps Script: nombresRemotos del JSON (mantenimiento.gs -> Código.gs)
# o, si no está, el nombre sin carpeta (correo/WebApp.gs -> WebApp.gs)
nombre_remoto() {
  jq -r --arg p "$PROYECTO" --arg a "$1" '.[$p].nombresRemotos[$a] // ($a | split("/") | last)' "$CONFIG"
}

echo "== Bajando lo publicado de '$PROYECTO'..."
bajar "$TRABAJO/remoto"

# 1. Manifest: Web App con acceso "Cualquier usuario"
MANIFEST="$TRABAJO/remoto/appsscript.json"
ACCESO=$(jq -r '.webapp.access // "SIN_WEBAPP"' "$MANIFEST")
if [ "$ACCESO" != "ANYONE_ANONYMOUS" ]; then
  echo "ALTO: appsscript.json tiene webapp.access = $ACCESO (debe ser ANYONE_ANONYMOUS, QA-NOTES #49)"; exit 1
fi

# 2. Ningún archivo de código remoto fuera del repo
ESPERADOS=$(for a in "${ARCHIVOS[@]}"; do nombre_remoto "$a"; done | sort)
SOBRANTES=$(cd "$TRABAJO/remoto" && find . -type f \( -name '*.gs' -o -name '*.html' \) | sed 's|^\./||' | sort | comm -23 - <(echo "$ESPERADOS"))
if [ -n "$SOBRANTES" ]; then
  echo "ALTO: el proyecto remoto tiene archivos que no están en el repo (push los borraría):"
  echo "$SOBRANTES" | sed 's/^/  /'
  exit 1
fi

# 3. Sintaxis y diff
CAMBIOS=0
for a in "${ARCHIVOS[@]}"; do
  LOCAL="$DIR/$a"
  REMOTO="$TRABAJO/remoto/$(nombre_remoto "$a")"
  cp "$LOCAL" "$TRABAJO/check.js"
  if ! node --check "$TRABAJO/check.js" 2>"$TRABAJO/err"; then
    echo "ALTO: $a no pasa node --check:"; sed 's/^/  /' "$TRABAJO/err"; exit 1
  fi
  if [ ! -f "$REMOTO" ]; then
    echo "-- $a: nuevo (no existe en el proyecto remoto)"; CAMBIOS=1
  elif ! diff -q "$REMOTO" "$LOCAL" >/dev/null; then
    echo "-- $a: cambia ($(diff "$REMOTO" "$LOCAL" | grep -c '^[<>]') líneas)"
    diff -u --label "publicado/$(nombre_remoto "$a")" --label "repo/$a" "$REMOTO" "$LOCAL" | head -200 || true
    CAMBIOS=1
  fi
done

if [ "$CAMBIOS" = 0 ]; then
  echo "== Sin cambios: lo publicado ya es igual al repo."
  [ "$MODO" = "--publicar" ] && echo "   (no se creó versión nueva)"
  exit 0
fi

if [ "$MODO" != "--publicar" ]; then
  echo "== Vista previa: nada se publicó. Para publicar: $0 $PROYECTO --publicar \"motivo\""
  exit 0
fi

# 4. Push: manifest remoto intacto + .gs del repo
echo "== Subiendo código..."
mkdir -p "$TRABAJO/subir"
cp "$TRABAJO/remoto/.clasp.json" "$MANIFEST" "$TRABAJO/subir/"
for a in "${ARCHIVOS[@]}"; do cp "$DIR/$a" "$TRABAJO/subir/$(nombre_remoto "$a")"; done
(cd "$TRABAJO/subir" && "${CLASP[@]}" push -f)

echo "== Nueva versión en la misma implementación..."
(cd "$TRABAJO/subir" && "${CLASP[@]}" update-deployment "$DEPLOYMENT_ID" -d "$MOTIVO")

# 5. Verificación: lo publicado debe ser idéntico al repo
echo "== Verificando..."
bajar "$TRABAJO/verif"
for a in "${ARCHIVOS[@]}"; do
  if ! cmp -s "$DIR/$a" "$TRABAJO/verif/$(nombre_remoto "$a")"; then
    echo "ALTO: después de publicar, $a no coincide con el repo. Revisar el editor de Apps Script."; exit 1
  fi
done
(cd "$TRABAJO/subir" && "${CLASP[@]}" list-deployments | grep "$DEPLOYMENT_ID" || true)
echo "== Publicado '$PROYECTO': código idéntico al repo, misma URL /exec."
