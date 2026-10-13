"""Genera efectos de sonido y una pista de música ORIGINALES (sin derechos de autor).

Uso:  python3 herramientas/generar-sonidos.py
Crea: public/sonidos/*.mp3 y public/musica/ritmo-entreno.mp3
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(AQUI, "..", "public")
rng = np.random.default_rng(7)


def t(seg):
    return np.arange(int(SR * seg)) / SR


def pasabajos(x, corte):
    """Filtro simple que deja pasar los graves (suaviza el sonido)."""
    a = np.exp(-2 * np.pi * corte / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def guardar_mp3(x, ruta):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.9
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    tmp = ruta.replace(".mp3", ".wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-b:a", "160k", ruta], check=True)
    os.remove(tmp)
    print("  ✓", os.path.relpath(ruta, PUBLIC))


# ---------------- Efectos ----------------
def whoosh():
    tt = t(0.45)
    ruido = rng.standard_normal(len(tt))
    env = np.sin(np.pi * tt / tt[-1]) ** 2
    # barrido: mezcla de ruido grave y agudo que va cambiando
    grave = pasabajos(ruido, 600)
    agudo = ruido - pasabajos(ruido, 2500)
    mezcla = np.linspace(0, 1, len(tt))
    return (grave * (1 - mezcla) * 3 + agudo * mezcla * 0.6) * env


def impacto():
    tt = t(0.9)
    frec = 120 * np.exp(-tt * 9) + 42
    fase = 2 * np.pi * np.cumsum(frec) / SR
    golpe = np.sin(fase) * np.exp(-tt * 4.5)
    chasquido = pasabajos(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 40) * 2
    return golpe + chasquido


def pop():
    tt = t(0.12)
    frec = 900 * np.exp(-tt * 30) + 400
    return np.sin(2 * np.pi * np.cumsum(frec) / SR) * np.exp(-tt * 35)


def subida():
    tt = t(1.2)
    ruido = rng.standard_normal(len(tt)) - pasabajos(rng.standard_normal(len(tt)), 800)
    tono = np.sin(2 * np.pi * np.cumsum(200 + 600 * (tt / tt[-1]) ** 2) / SR)
    env = (tt / tt[-1]) ** 2
    return (ruido * 0.25 + tono * 0.5) * env


# ---------------- Música ----------------
def ritmo_entreno(bpm=96, compases=16):
    """Base de percusión + bajo + colchón de acordes. Tono "épico tranquilo", para reflexión y entreno."""
    negra = 60 / bpm
    total = int(SR * negra * 4 * compases)
    out = np.zeros(total)

    def poner(muestra, seg, vol=1.0):
        i = int(seg * SR)
        j = min(total, i + len(muestra))
        out[i:j] += muestra[: j - i] * vol

    kt = t(0.4)
    bombo = np.sin(2 * np.pi * np.cumsum(55 + 90 * np.exp(-kt * 30)) / SR) * np.exp(-kt * 7)
    st = t(0.25)
    caja = (rng.standard_normal(len(st)) - pasabajos(rng.standard_normal(len(st)), 1200)) * np.exp(-st * 18)
    ht = t(0.05)
    platillo = (rng.standard_normal(len(ht)) - pasabajos(rng.standard_normal(len(ht)), 6000)) * np.exp(-ht * 90)

    # La menor - Fa - Do - Sol (progresión clásica, emotiva)
    acordes = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (130.81, 164.81, 196.0), (196.0, 246.94, 293.66)]
    bajos = [55.0, 43.65, 65.41, 49.0]

    for c in range(compases):
        ini = c * 4 * negra
        idx = c % 4
        intensidad = 0.55 if c < 4 else 1.0  # arranca suave y después entra todo
        # colchón de acordes (onda de sierra suavizada)
        dur = 4 * negra
        tt = t(dur)
        pad = sum(2 * ((f * tt) % 1) - 1 for f in acordes[idx])
        pad = pasabajos(pad, 900) * np.minimum(1, tt / 0.4) * np.minimum(1, (dur - tt) / 0.3)
        poner(pad, ini, 0.16)
        # bajo
        for b in (0, 1.5, 2, 3.5):
            bt = t(negra * 0.9)
            nota = np.sin(2 * np.pi * bajos[idx] * bt) * np.exp(-bt * 2.5)
            poner(nota, ini + b * negra, 0.55 * intensidad)
        if c >= 4:
            for b in (0, 1.75, 2.5):
                poner(bombo, ini + b * negra, 0.9)
            for b in (1, 3):
                poner(caja, ini + b * negra, 0.5)
        for b in range(8):
            poner(platillo, ini + b * negra / 2, 0.18 if b % 2 else 0.1)
    # fundido de entrada y salida
    fade = int(SR * 1.5)
    out[:fade] *= np.linspace(0, 1, fade)
    out[-fade:] *= np.linspace(1, 0, fade)
    return out


if __name__ == "__main__":
    print("Generando efectos…")
    guardar_mp3(whoosh(), os.path.join(PUBLIC, "sonidos", "whoosh.mp3"))
    guardar_mp3(impacto(), os.path.join(PUBLIC, "sonidos", "impacto.mp3"))
    guardar_mp3(pop(), os.path.join(PUBLIC, "sonidos", "pop.mp3"))
    guardar_mp3(subida(), os.path.join(PUBLIC, "sonidos", "subida.mp3"))
    print("Generando música…")
    guardar_mp3(ritmo_entreno(), os.path.join(PUBLIC, "musica", "ritmo-entreno.mp3"))
