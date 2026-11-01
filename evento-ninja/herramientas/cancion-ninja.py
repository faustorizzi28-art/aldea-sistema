"""Pista ORIGINAL (sin derechos de autor) estilo "fight night" para el reel del Ninja.

Uso:  python3 evento-ninja/herramientas/cancion-ninja.py
Crea: evento-ninja/redes/cancion-ninja.mp3  (~31 s, 140 BPM, Re menor frigio)

Estructura (compases de 4 tiempos):
  0-3   intro: drone oscuro + taikos + latido
  4-7   subida: hi-hats, redoble y "riser" hasta el golpe
  8-15  drop: bombo 808, caja, hats, riff distorsionado
  16-17 cierre: golpe final y cola
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
BPM = 140
NEGRA = 60 / BPM
COMPAS = 4 * NEGRA
COMPASES = 18
AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(AQUI, "..", "redes", "cancion-ninja.mp3")
rng = np.random.default_rng(14)


def t(seg):
    return np.arange(int(SR * seg)) / SR


def filtro(x, bajo=None, alto=None):
    """Filtro por FFT: deja pasar entre `alto` y `bajo` Hz (con caída suave)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    g = np.ones_like(f)
    if bajo:
        g *= 1 / (1 + (f / bajo) ** 4)
    if alto:
        g *= 1 / (1 + (alto / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * g, len(x))


def ruido(seg):
    return rng.standard_normal(int(SR * seg))


# ---- instrumentos ----
def bombo808(seg=0.9, f0=48):
    tt = t(seg)
    fase = 2 * np.pi * np.cumsum(f0 + 160 * np.exp(-tt * 38)) / SR
    return np.tanh(2.2 * np.sin(fase) * np.exp(-tt * 3.2))


def taiko(seg=1.2):
    tt = t(seg)
    cuerpo = np.sin(2 * np.pi * np.cumsum(70 + 60 * np.exp(-tt * 20)) / SR) * np.exp(-tt * 4)
    golpe = filtro(ruido(seg), bajo=900) * np.exp(-tt * 30)
    return cuerpo + 0.6 * golpe


def caja(seg=0.35):
    tt = t(seg)
    tono = np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25)
    rui = filtro(ruido(seg), bajo=7000, alto=900) * np.exp(-tt * 14)
    return np.tanh(1.5 * (0.5 * tono + rui))


def hat(seg=0.06, abierto=False):
    tt = t(0.25 if abierto else seg)
    return filtro(ruido(len(tt) / SR), alto=7000) * np.exp(-tt * (12 if abierto else 80))


def palmada(seg=0.3):
    tt = t(seg)
    env = sum(np.exp(-np.maximum(tt - d, 0) * 60) * (tt >= d) for d in (0, 0.012, 0.024))
    return filtro(ruido(seg), bajo=3500, alto=800) * env


def impacto(seg=2.5):
    tt = t(seg)
    sub = np.sin(2 * np.pi * np.cumsum(35 + 80 * np.exp(-tt * 9)) / SR) * np.exp(-tt * 1.6)
    rui = filtro(ruido(seg), bajo=2500) * np.exp(-tt * 3)
    return np.tanh(2 * sub) + 0.5 * rui


def riser(seg):
    tt = t(seg)
    barrido = np.sin(2 * np.pi * np.cumsum(200 + 1800 * (tt / seg) ** 2) / SR)
    rui = filtro(ruido(seg), alto=2000) * (tt / seg) ** 2
    return (0.4 * barrido + rui) * (tt / seg) ** 1.5


def sierra(f, seg):
    tt = t(seg)
    return sum(2 * ((f * k * tt) % 1) - 1 for k in (1, 1.005, 0.995)) / 3


# Re frigio: Re, Mib, Fa, Sol, La, Sib, Do  (suena "marcial" y tenso)
RE, MIB, FA, SOL, LA, SIB = 73.42, 77.78, 87.31, 98.0, 110.0, 116.54


def main():
    total = int(SR * COMPAS * COMPASES)
    L = np.zeros(total)
    Rr = np.zeros(total)

    def poner(m, seg, vol=1.0, pan=0.0):
        i = int(seg * SR)
        j = min(total, i + len(m))
        if i >= total:
            return
        L[i:j] += m[: j - i] * vol * (1 - max(pan, 0))
        Rr[i:j] += m[: j - i] * vol * (1 + min(pan, 0))

    b = lambda compas, tiempo=0: compas * COMPAS + tiempo * NEGRA

    # Drone oscuro (todo el tema menos el cierre)
    dur = b(16)
    tt = t(dur)
    drone = filtro(sierra(RE / 2, dur) + 0.6 * sierra(RE, dur), bajo=500)
    drone *= np.minimum(1, tt / 3) * (0.5 + 0.5 * np.minimum(1, tt / b(8)))
    poner(drone, 0, 0.22)

    tk, bb, cj, pl = taiko(), bombo808(), caja(), palmada()
    # Intro: taikos + latido
    for c in range(0, 8):
        for tiempo, v in ((0, 1), (1.5, 0.6), (2, 0.8), (3.5, 0.5)):
            poner(tk, b(c, tiempo), 0.55 * v, pan=(-0.3 if tiempo % 2 else 0.3))
    # Subida: hats que se aceleran + redoble + riser
    for c in range(4, 8):
        div = 2 if c < 6 else 4
        for k in range(4 * div):
            poner(hat(), b(c, k / div), 0.22, pan=0.25)
    for k in range(16):  # redoble del último compás de la subida
        poner(cj, b(7, k / 4), 0.15 + 0.5 * k / 16)
    poner(riser(COMPAS * 2), b(6), 0.45)

    # DROP
    poner(impacto(), b(8), 1.0)
    riff = [RE, RE, MIB, RE, FA, MIB, RE, SIB / 2]
    for c in range(8, 16):
        for tiempo in (0, 1.75, 2.5):
            poner(bb, b(c, tiempo), 0.95)
        for tiempo in (1, 3):
            poner(cj, b(c, tiempo), 0.75)
            poner(pl, b(c, tiempo), 0.35, pan=-0.2)
        for k in range(8):
            poner(hat(), b(c, k / 2), 0.25 if k % 2 else 0.15, pan=0.3)
        if c % 2 == 1:
            for k in range(6):  # trap roll de hats
                poner(hat(0.03), b(c, 3 + k / 6), 0.18, pan=0.3)
        # riff distorsionado (corcheas)
        for k, f in enumerate(riff):
            nota = np.tanh(3 * filtro(sierra(f * 2, NEGRA * 0.45), bajo=1400)) * np.exp(-t(NEGRA * 0.45) * 4)
            poner(nota, b(c, k / 2), 0.18, pan=(-0.4 if k % 2 else 0.4))
        # sub 808 siguiendo la tónica
        tsub = t(COMPAS)
        sub = np.sin(2 * np.pi * (RE if c % 4 < 3 else FA) / 2 * tsub) * np.exp(-tsub * 0.8)
        poner(np.tanh(1.8 * sub), b(c), 0.45)
        if c in (11, 15):
            poner(tk, b(c, 3), 0.8)
            poner(tk, b(c, 3.5), 0.8)

    # Cierre
    poner(impacto(3.5), b(16), 1.0)
    poner(tk, b(16), 0.9)

    est = np.stack([L, Rr], axis=1)
    fade = int(SR * 1.2)
    est[-fade:] *= np.linspace(1, 0, fade)[:, None]
    est = np.tanh(1.3 * est / (np.max(np.abs(est)) + 1e-9)) * 0.95  # "glue" y techo

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    tmp = SALIDA.replace(".mp3", ".wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((est * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-af", "loudnorm=I=-12:TP=-1",
                    "-ar", "44100", "-b:a", "192k", SALIDA], check=True)
    os.remove(tmp)
    print("OK", SALIDA, round(total / SR, 2), "s")


if __name__ == "__main__":
    main()
