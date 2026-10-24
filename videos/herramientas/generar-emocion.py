"""Música ORIGINAL (sin derechos de autor) emotiva: piano + cuerdas, para ceremonias, egresos y logros.

Uso:  python3 herramientas/generar-emocion.py
Crea:
  public/musica/emocion-dojo.mp3   ~26 s, 76 bpm. Piano solo al principio, entran cuerdas y bajo,
                                   golpe grave tipo taiko en el segundo ~18.4 (momento de la foto grupal / cierre).
Reutiliza las funciones de herramientas/generar-lounge.py.
"""
import importlib.util
import os

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lounge", os.path.join(AQUI, "generar-lounge.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, tt, filtro, pegar, nota, reverb, colchon, guardar = L.SR, L.tt, L.filtro, L.pegar, L.nota, L.reverb, L.colchon, L.guardar

BPM = 76
TIEMPO = 60 / BPM
COMPAS = 4 * TIEMPO
LARGO = 26.0
GOLPE = 18.4  # segundo del golpe grave


def piano(m, largo=3.0, vel=1.0):
    t = tt(largo)
    f = nota(m)
    s = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k * 0.9)) for k, a in ((1, 1), (2, 0.45), (3, 0.2), (4, 0.08)))
    return s * np.minimum(1, t / 0.004) * vel


def taiko():
    t = tt(2.5)
    f = 48 + 40 * np.exp(-t * 18)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    piel = L.filtro(L.rng.standard_normal(len(t)), 80, 900) * np.exp(-t * 14) * 0.5
    return cuerpo + piel


def emocion():
    n = int(LARGO * SR) + SR
    pno, cuerdas, graves, golpes = (np.zeros(n) for _ in range(4))
    # Am – F – C – G  (la clásica progresión emotiva)
    acordes = [(45, [57, 60, 64]), (41, [57, 60, 65]), (48, [55, 60, 64]), (43, [55, 59, 62])]
    melodia = [76, 74, 72, 71, 72, 69, 67, 71]  # una nota larga por medio compás, simple
    c = 0
    ini = 0.0
    while ini < LARGO - 1:
        raiz, voces = acordes[c % 4]
        # arpegio suave en corcheas: raíz, quinta, tercera...
        patron = [raiz + 12, voces[0], voces[1], voces[2], voces[1], voces[0], voces[1], voces[2]]
        for k, m in enumerate(patron):
            pegar(pno, piano(m, 2.5, 0.55 if k else 0.75), ini + k * TIEMPO / 2)
        if c >= 2:  # entra la melodía
            for k in range(2):
                pegar(pno, piano(melodia[(c * 2 + k) % 8], 3.0, 0.9), ini + k * 2 * TIEMPO)
        if c >= 2:
            pegar(cuerdas, colchon(voces + [raiz + 12], COMPAS + 0.8), ini)
            pegar(graves, piano(raiz - 12, COMPAS, 0.9), ini)
        c += 1
        ini += COMPAS
    pegar(golpes, taiko(), GOLPE)
    pegar(golpes, taiko() * 0.5, GOLPE + TIEMPO * 0.5)
    # las cuerdas crecen hacia el golpe y quedan arriba
    t = np.arange(n) / SR
    cuerdas *= np.clip((t - 2 * COMPAS) / (GOLPE - 2 * COMPAS), 0, 1) * 0.7 + 0.3
    pno = reverb(filtro(pno, 60, 6000), seg=2.8, mezcla=0.35)
    cuerdas = reverb(filtro(cuerdas, 150, 3000), seg=3.0, mezcla=0.4)
    mono = pno * 0.5 + cuerdas * 0.22 + filtro(graves, 30, 400) * 0.3 + golpes * 0.45
    dly = int(0.013 * SR)
    izq = mono + np.roll(cuerdas, dly) * 0.06
    der = mono + cuerdas * 0.06
    st = np.stack([izq, der], axis=1)[: int(LARGO * SR)]
    fin = int(2.5 * SR)
    st[-fin:] *= np.linspace(1, 0, fin)[:, None]
    return st


if __name__ == "__main__":
    guardar(emocion(), os.path.join(L.PUBLIC, "musica", "emocion-dojo.mp3"))
