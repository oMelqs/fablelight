#!/bin/sh
# Duplo clique no Finder para abrir o Fablelight.
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
IP=$(ipconfig getifaddr en0 2>/dev/null)
echo "Mestre: http://localhost:4317"
[ -n "$IP" ] && echo "TV:     http://$IP:4317/mesa"
(sleep 3 && open http://localhost:4317) &
npm start
