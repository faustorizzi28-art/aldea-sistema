"""Une tomas de un video hablado con fundidos suaves (video y audio), sin cortes bruscos.

Uso: python3 herramientas/unir-tomas.py tomas.json salida.mp4
tomas.json: [{"archivo": "...", "desde": 0.5, "hasta": 2.4, "congelar": 1.2}, ...]
  - "congelar": segundos extra con la última imagen quieta y silencio (para tapar con una imagen de apoyo)
Cada unión es un fundido de 0.2 s (xfade + acrossfade). La voz no se procesa: queda natural.
"""
import json
import subprocess
import sys

tomas = json.load(open(sys.argv[1]))
salida = sys.argv[2]
FUNDIDO = 0.2
VF = "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,eq=contrast=1.05:saturation=1.06:brightness=0.015,fps=30,format=yuv420p,settb=AVTB"

args, filtros, duraciones = [], [], []
for k, t in enumerate(tomas):
    args += ["-ss", str(t["desde"]), "-to", str(t["hasta"]), "-i", t["archivo"]]
    d = t["hasta"] - t["desde"]
    v = f"[{k}:v]{VF}"
    a = f"[{k}:a]aresample=48000,aformat=channel_layouts=mono,afade=t=in:d=0.03"
    if t.get("congelar"):
        v += f",tpad=stop_mode=clone:stop_duration={t['congelar']}"
        a += f",apad=pad_dur={t['congelar']}"
        d += t["congelar"]
    filtros.append(f"{v}[v{k}]")
    filtros.append(f"{a},atrim=0:{d:.3f},asetpts=PTS-STARTPTS[a{k}]")
    duraciones.append(d)

va, aa, acum = "v0", "a0", duraciones[0]
for k in range(1, len(tomas)):
    off = acum - FUNDIDO
    filtros.append(f"[{va}][v{k}]xfade=transition=fade:duration={FUNDIDO}:offset={off:.3f}[vx{k}]")
    filtros.append(f"[{aa}][a{k}]acrossfade=d={FUNDIDO}:c1=tri:c2=tri[ax{k}]")
    va, aa = f"vx{k}", f"ax{k}"
    acum += duraciones[k] - FUNDIDO

subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-y", *args, "-filter_complex", ";".join(filtros),
     "-map", f"[{va}]", "-map", f"[{aa}]", "-c:v", "libx264", "-crf", "18", "-preset", "medium",
     "-c:a", "aac", "-b:a", "256k", "-ar", "48000", salida],
    check=True,
)
print(f"listo: {salida} ({acum:.2f} s)")
