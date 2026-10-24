"""Arma un video vertical de FOTOS al ritmo de la música (recuerdos, fiestas, viajes). Sin textos.

Uso:  python3 herramientas/fotos-al-ritmo.py guiones/<guion>.json
Guion:
  {
    "salida": "out/xxx.mp4",
    "musica": "public/musica/xxx.mp3",
    "bpm": 128,
    "fotos": "carpeta/con/las/fotos",
    "tomas": [ { "foto": "a.jpg", "tiempos": 4, "flash": false, "pulso": false, "giro": 0 }, ... ]
  }
  - "tiempos": cuánto dura la foto, en tiempos de la música (4 = un compás).
  - "flash": entra con un destello blanco (como flash de cámara).
  - "pulso": la foto "late" con cada bombo (para el drop).
  - "giro": grados para enderezar una foto torcida.
Cada foto entra completa sobre un fondo de ella misma desenfocada (no se corta a nadie),
con un acercamiento lento y grano suave para que todas las fotos viejas se vean parejas.
"""
import json
import os
import subprocess
import sys
import tempfile

W, H, FPS = 1080, 1920, 30


def toma(foto, seg, flash, pulso, giro, beat, salida):
    rot = f"rotate={giro}*PI/180:ow=rotw({giro}*PI/180):oh=roth({giro}*PI/180):c=black@0," if giro else ""
    # zoom: lento y parejo; con "pulso", un golpecito al principio de cada tiempo
    z = f"(1.04+0.05*t/{seg})" + (f"+0.035*exp(-mod(t\\,{beat})*9)" if pulso else "")
    fc = (
        f"[0]{rot}split[a][b];"
        f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=30:3,eq=brightness=-0.18:saturation=0.8[f];"
        f"[b]scale={W - 60}:{H - 420}:force_original_aspect_ratio=decrease[p];"
        f"[f][p]overlay=(W-w)/2:(H-h)/2,setsar=1,fps={FPS},"
        f"scale=w='trunc({W}*{z}/2)*2':h=-2:eval=frame,crop={W}:{H},"
        f"noise=alls=7:allf=t,eq=contrast=1.06:saturation=1.1"
        + (",fade=t=in:st=0:d=0.12:color=white" if flash else "")
        + "[v]"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-loop", "1", "-t", f"{seg:.4f}", "-i", foto, "-filter_complex", fc, "-map", "[v]",
         "-frames:v", str(round(seg * FPS)), "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", salida],
        check=True,
    )


def main(ruta):
    g = json.load(open(ruta))
    beat = 60 / g["bpm"]
    tmp = tempfile.mkdtemp()
    partes = []
    hecho = 0.0  # para que el redondeo a cuadros no desfase los cortes del ritmo
    for i, t in enumerate(g["tomas"]):
        fin = hecho + t["tiempos"] * beat
        seg = (round(fin * FPS) - round(hecho * FPS)) / FPS
        hecho = fin
        out = os.path.join(tmp, f"{i:02d}.mp4")
        toma(os.path.join(g["fotos"], t["foto"]), seg, t.get("flash", False), t.get("pulso", False), t.get("giro", 0), beat, out)
        partes.append(out)
    lista = os.path.join(tmp, "lista.txt")
    open(lista, "w").write("".join(f"file '{p}'\n" for p in partes))
    total = round(hecho * FPS) / FPS
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lista, "-i", g["musica"],
         "-vf", f"fade=t=in:d=0.4,fade=t=out:st={total - 0.8:.3f}:d=0.8", "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.3f}", g["salida"]],
        check=True,
    )
    print("listo:", g["salida"], f"({total:.1f} s)")


if __name__ == "__main__":
    main(sys.argv[1])
