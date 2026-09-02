#!/bin/bash
# Hook Stop — affiche l'état git (fichiers modifiés) à la fin de chaque
# réponse, pour renforcer mécaniquement le réflexe "vérifier le diff
# avant de considérer une tâche finie" (docs/protocole-ia-vefa.md).
cd "$(dirname "$0")/../.." || exit 0
out=$(git status --short 2>/dev/null)
if [ -n "$out" ]; then
  esc=$(printf '%s' "$out" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\n/\\n/g')
  printf '{"systemMessage": "Fichiers modifies non commites :\\n%s"}' "$esc"
fi
