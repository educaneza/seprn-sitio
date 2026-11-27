#!/bin/bash
# Hook PostToolUse (Edit/Write): revisa la sintaxis de un .gs de apps-script/ en cuanto se edita.
# Un error de sintaxis publicado tumba el Web App completo (todas sus escuelas), y node no
# acepta la extensión .gs, así que se copia a un .js temporal y se corre `node --check`.
# Si falla -> decision "block" con el error, para que Claude lo corrija antes de seguir.
# Sin node instalado, no hace nada (no debe estorbar).

ARCHIVO=$(jq -r '.tool_input.file_path // empty')
case "$ARCHIVO" in
  */apps-script/*.gs) ;;
  *) exit 0 ;;
esac
[ -f "$ARCHIVO" ] || exit 0
command -v node >/dev/null 2>&1 || exit 0

TMP=$(cd "$(mktemp -d)" && pwd -P)   # ruta real (/private/var/...), la que imprime node
trap 'rm -rf "$TMP"' EXIT
cp "$ARCHIVO" "$TMP/revisar.js"

if ! ERROR=$(node --check "$TMP/revisar.js" 2>&1); then
  # Línea del error + código + "SyntaxError: ...", sin la pila interna de node.
  ERROR=$(echo "$ERROR" | sed "s|$TMP/revisar.js|$(basename "$ARCHIVO")|g" \
    | grep -v -E '^[[:space:]]+at |^Node\.js v' | sed '/^[[:space:]]*$/d' | head -10)
  jq -n --arg r "Error de sintaxis en $(basename "$ARCHIVO") (node --check). Corrígelo antes de publicar:
$ERROR" '{decision: "block", reason: $r}'
fi
exit 0
