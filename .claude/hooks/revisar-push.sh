#!/bin/bash
# Hook PreToolUse (Bash): revisa un `git push` antes de que salga a producción.
# Reglas 4 y 5 de CLAUDE.md:
#   - la cuenta activa de gh debe ser educaneza
#   - origin/main no debe tener commits que falten en local
#   - archivos nuevos/modificados: aviso desde 80 MB, bloqueo desde 100 MB (límite de GitHub)
#   - contenido publicado total: aviso desde 800 MB
# Bloqueo duro -> permissionDecision "deny"; aviso -> "ask" (Jorge confirma en pantalla).
# Compara HEAD contra origin/main: si se publica desde una rama publish-*, hacer checkout a ella.

CMD=$(jq -r '.tool_input.command // empty')
echo "$CMD" | grep -Eq '(^|[;&|[:space:]])git[[:space:]]+push([[:space:]]|$)' || exit 0

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

MB=$((1024 * 1024))
AVISO_ARCHIVO=$((80 * MB))
LIMITE_ARCHIVO=$((100 * MB))
AVISO_TOTAL=$((800 * MB))

responder() {
  jq -n --arg d "$1" --arg r "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $d, permissionDecisionReason: $r}}'
  exit 0
}

# 1. Cuenta de gh
if ! gh auth status --active 2>&1 | grep -q 'account educaneza'; then
  responder deny "La cuenta activa de gh no es educaneza. Corre: gh auth switch -u educaneza"
fi

# 2. origin/main al día
if ! git fetch -q origin main 2>/dev/null; then
  responder ask "No se pudo hacer git fetch de origin/main para revisar el push. ¿Continuar de todos modos?"
fi
if ! git merge-base --is-ancestor origin/main HEAD; then
  FALTAN=$(git log --oneline HEAD..origin/main | head -5)
  responder deny "origin/main tiene commits que no están en local (git pull --rebase primero):
$FALTAN"
fi

# 3. Tamaño de cada archivo nuevo o modificado
BLOQUEO=""
AVISO=""
while IFS= read -r f; do
  [ -z "$f" ] && continue
  T=$(git cat-file -s "HEAD:$f" 2>/dev/null) || continue
  if [ "$T" -ge "$LIMITE_ARCHIVO" ]; then
    BLOQUEO="$BLOQUEO
  $f ($((T / MB)) MB)"
  elif [ "$T" -ge "$AVISO_ARCHIVO" ]; then
    AVISO="$AVISO
  $f ($((T / MB)) MB)"
  fi
done < <(git diff --name-only --diff-filter=AM origin/main HEAD)

if [ -n "$BLOQUEO" ]; then
  responder deny "Archivos de 100 MB o más (GitHub los rechaza):$BLOQUEO"
fi

# 4. Contenido publicado total
TOTAL=$(git ls-tree -r -l HEAD | awk '{s += $4} END {print s + 0}')
if [ "$TOTAL" -ge "$AVISO_TOTAL" ]; then
  AVISO="$AVISO
  Contenido publicado total: $((TOTAL / MB)) MB (umbral de aviso 800 MB, ROADMAP ítem 10)"
fi

if [ -n "$AVISO" ]; then
  responder ask "Umbral de aviso cruzado, avisar a Jorge antes de publicar:$AVISO"
fi

exit 0
