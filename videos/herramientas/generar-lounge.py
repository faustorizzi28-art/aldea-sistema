"""Música ORIGINAL (sin derechos de autor) para contenido premium de Aldea: eventos, bodas, empresas.

Uso:  python3 herramientas/generar-lounge.py
Crea:
  public/musica/lounge-eventos.mp3   ~20 s, 96 bpm. Lounge / deep house suave:
                                     piano eléctrico con acordes de 9na, colchón cálido, bajo redondo,
                                     bombo apagado y shaker muy bajito. Entra el ritmo en el compás 2.
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(AQUI, "..", "public")
rng = np.random.default_rng(7)

BPM = 96
TIEMPO = 60 / BPM
COMPAS = 4 * TIEMPO
LARGO = 8 * COMPAS  # 20 s


def nota(m):
    return 440 * 2 ** ((m - 69) / 12)


def tt(seg):
    return np.arange(int(SR * seg)) / SR


def filtro(x, corte_bajo=None, corte_alto=None):
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if corte_alto:
        g *= 1 / np.sqrt(1 + (f / corte_alto) ** 4)
    if corte_bajo:
        g *= 1 / np.sqrt(1 + (corte_bajo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, n)


def pegar(pista, sonido, seg):
    i = int(seg * SR)
    if i >= len(pista):
        return
    n = min(len(sonido), len(pista) - i)
    pista[i : i + n] += sonido[:n]


def rhodes(m, largo):
    """Piano eléctrico: FM suave con ataque de campana y caída larga."""
    t = tt(largo)
    f = nota(m)
    mod = np.sin(2 * np.pi * f * 14 * t) * 0.9 * np.exp(-t * 9)  # el "tin" del ataque
    cuerpo = np.sin(2 * np.pi * f * t + np.sin(2 * np.pi * f * t) * 0.6 * np.exp(-t * 2.5) + mod)
    env = np.minimum(1, t / 0.006) * np.exp(-t * 1.1)
    return cuerpo * env


def colchon(ms, largo):
    t = tt(largo)
    s = np.zeros_like(t)
    for m in ms:
        for d in (-0.07, 0.07):
            s += np.sin(2 * np.pi * nota(m) * 2 ** (d / 12) * t + rng.random() * 6)
    env = np.minimum(1, t / 0.8) * np.minimum(1, (largo - t) / 0.8)
    return s * env / len(ms)


def bombo():
    t = tt(0.4)
    f = 52 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def aro():
    t = tt(0.12)
    s = np.sin(2 * np.pi * 1700 * t) * 0.5 + filtro(rng.standard_normal(len(t)), 1500, 6000)
    return s * np.exp(-t * 55)


def shaker():
    t = tt(0.07)
    return filtro(rng.standard_normal(len(t)), 5000, 12000) * np.exp(-t * 60) * np.minimum(1, t / 0.01)


def bajo(m, largo):
    t = tt(largo)
    f = nota(m)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return s * np.minimum(1, t / 0.01) * np.minimum(1, (largo - t) / 0.05) * np.exp(-t * 0.8)


def reverb(x, seg=2.2, mezcla=0.28):
    t = tt(seg)
    ir = rng.standard_normal(len(t)) * np.exp(-t * 3.2)
    ir = filtro(ir, 200, 5000)
    n = len(x) + len(ir)
    h = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ir, n), n)[: len(x)]
    h = h / (np.max(np.abs(h)) + 1e-9) * np.max(np.abs(x))
    return x * (1 - mezcla) + h * mezcla


def lounge():
    n = int(LARGO * SR) + SR
    piano, pad, graves, ritmo = (np.zeros(n) for _ in range(4))
    # Fmaj9 – Em7 – Dm9 – Cmaj9 (sube y baja, nada estridente)
    acordes = [
        (41, [57, 60, 64, 67]),
        (40, [55, 59, 62, 66]),
        (38, [53, 57, 60, 64]),
        (36, [52, 55, 59, 62]),
    ]
    for c in range(8):
        raiz, voces = acordes[c % 4]
        ini = c * COMPAS
        pegar(pad, colchon([v - 12 for v in voces[:3]] + voces[1:], COMPAS + 0.4), ini)
        # piano: acorde arpegiado apenas (humano) en 1 y en el "y" del 3
        for golpe, vel in ((0, 1.0), (2.5 * TIEMPO, 0.6)):
            for k, v in enumerate(voces):
                pegar(piano, rhodes(v, COMPAS) * vel, ini + golpe + k * 0.012)
        if c >= 1:
            pegar(graves, bajo(raiz, 1.5 * TIEMPO), ini)
            pegar(graves, bajo(raiz, 0.9 * TIEMPO) * 0.7, ini + 2.5 * TIEMPO)
            pegar(graves, bajo(raiz + 7, 0.8 * TIEMPO) * 0.6, ini + 3.5 * TIEMPO)
            for b in range(4):
                pegar(ritmo, bombo() * 0.9, ini + b * TIEMPO)
            for b in (1, 3):
                pegar(ritmo, aro() * 0.18, ini + b * TIEMPO)
            for s in range(16):
                vel = 0.10 if s % 2 else 0.05
                pegar(ritmo, shaker() * vel, ini + s * TIEMPO / 4 + rng.random() * 0.006)
    piano = reverb(filtro(piano, 90, 5500), mezcla=0.32)
    pad = filtro(pad, 120, 2200)
    graves = filtro(graves, 30, 600)
    ritmo = filtro(ritmo, 35, 11000)
    mono = piano * 0.42 + pad * 0.16 + graves * 0.38 + ritmo * 0.32
    # ancho estéreo: piano y colchón levemente corridos entre canales
    dly = int(0.011 * SR)
    izq = mono + np.roll(piano, dly) * 0.08 + np.roll(pad, dly) * 0.05
    der = mono + piano * 0.08 + pad * 0.05
    st = np.stack([izq, der], axis=1)[: int(LARGO * SR)]
    fin = int(1.5 * SR)
    st[-fin:] *= np.linspace(1, 0, fin)[:, None]
    return st


def guardar(st, ruta):
    st = st / (np.max(np.abs(st)) + 1e-9) * 0.9
    tmp = ruta.replace(".mp3", ".wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", tmp, "-b:a", "192k", ruta], check=True)
    os.remove(tmp)
    print("listo:", ruta)


if __name__ == "__main__":
    guardar(lounge(), os.path.join(PUBLIC, "musica", "lounge-eventos.mp3"))
