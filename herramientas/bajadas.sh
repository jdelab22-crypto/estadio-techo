#!/bin/zsh
# Baja los clips de Kling, los pega por tribuna y los deja listos para la web.
# uso: herramientas/bajadas.sh nombre url1 url2   (desde la raíz del proyecto)
set -e
n=$1; mkdir -p clips
curl -s -o clips/bajada-$n-1.mp4 "$2"
curl -s -o clips/bajada-$n-2.mp4 "$3"
swift herramientas/unir.swift clips/bajada-$n.mp4 clips/bajada-$n-1.mp4 clips/bajada-$n-2.mp4 2>/dev/null
swift herramientas/video-web.swift clips/bajada-$n.mp4 boletas/media/bajada-$n.mp4 2>/dev/null
S=${TMPDIR:-/tmp}/bajadas-$n; mkdir -p $S
for t in 0.02 2.5 -0.05; do swift herramientas/cuadro.swift clips/bajada-$n-1.mp4 $t $S/a$t.jpg 2>/dev/null >/dev/null; done
for t in 0.02 2.5 -0.05; do swift herramientas/cuadro.swift clips/bajada-$n-2.mp4 $t $S/b$t.jpg 2>/dev/null >/dev/null; done
ls -la boletas/media/bajada-$n.mp4; echo $S
