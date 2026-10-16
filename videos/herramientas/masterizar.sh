#!/bin/bash
# Uso: herramientas/masterizar.sh entrada.mp4 salida.mp4 [crf]
# Lleva el audio a -14 LUFS en dos pasadas SIN comprimir (linear=true): la voz queda natural.
set -e
M=$(ffmpeg -i "$1" -af loudnorm=I=-14:TP=-1.5:LRA=18:print_format=json -f null - 2>&1 < /dev/null | python3 -c "import sys,json; t=sys.stdin.read(); d=json.loads(t[t.rindex('{'):]); print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -loglevel error -y -i "$1" -c:v libx264 -crf "${3:-23}" -preset slow -af "loudnorm=I=-14:TP=-1.5:LRA=18:$M:linear=true" -ar 48000 -c:a aac -b:a 192k -movflags +faststart "$2" < /dev/null
echo "$2 $(stat -c %s "$2") bytes"
