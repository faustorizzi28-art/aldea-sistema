"""Música ORIGINAL (sin derechos de autor) estilo electro house de fiesta 2010–2012 (onda "Proyecto X").

Uso:  python3 herramientas/generar-fiesta.py
Crea:
  public/musica/fiesta-recuerdos.mp3   24 s, 128 bpm (1 tiempo = 0,46875 s, 1 compás = 1,875 s).
     0 – 7,5 s     intro: acordes filtrados + bombo apagado (4 compases)
     7,5 – 11,25 s subida: redoble que se acelera + ruido que sube (2 compases)
     11,25 s       DROP: bombo en negras, acordes de sierra "bombeando", bajo y hats a contratiempo (6 compases)
     22,5 – 24 s   golpe final y cola
Reutiliza las funciones de herramientas/generar-lounge.py.
"""
import importlib.util
import os

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lounge", os.path.join(AQUI, "generar-lounge.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, tt, filtro, pegar, nota, reverb, guardar = L.SR, L.tt, L.filtro, L.pegar, L.nota, L.reverb, L.guardar
rng = L.rng

TIEMPO = 60 / 128
COMPAS = 4 * TIEMPO
SUBIDA = 4 * COMPAS
DROP = 6 * COMPAS
FIN = 12 * COMPAS
LARGO = 24.0


def sierra(f, largo, voces=5, desafine=0.18):
    t = tt(largo)
    s = np.zeros_like(t)
    for v in range(voces):
        ff = f * 2 ** (((v - (voces - 1) / 2) * desafine) / 12)
        s += 2 * ((ff * t + rng.random()) % 1) - 1
    return s / voces


def acorde(ms, largo):
    return sum(sierra(nota(m), largo) for m in ms) / len(ms)


def bombo():
    t = tt(0.35)
    f = 50 + 140 * np.exp(-t * 35)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * 2.5)


def palma():
    t = tt(0.2)
    s = np.zeros_like(t)
    for d in (0, 0.01, 0.02):
        i = int(d * SR)
        s[i:] += filtro(rng.standard_normal(len(t) - i), 1000, 6000) * np.exp(-t[: len(t) - i] * 30)
    return s


def hat():
    t = tt(0.08)
    return filtro(rng.standard_normal(len(t)), 7000, None) * np.exp(-t * 50)


def redoble():
    t = tt(0.12)
    return (filtro(rng.standard_normal(len(t)), 300, 7000) + np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 28)


def fiesta():
    n = int((LARGO + 2) * SR)
    sint, graves, ritmo, efx = (np.zeros(n) for _ in range(4))
    # Am – F – C – G : la progresión de las fiestas de esa época
    acordes = [(33, [69, 72, 76]), (29, [65, 69, 72]), (36, [67, 72, 76]), (31, [67, 71, 74])]
    c = 0
    while c * COMPAS < FIN:
        ini = c * COMPAS
        raiz, voces = acordes[c % 4]
        if ini < SUBIDA:  # intro: acordes en corcheas, filtrados como "desde otra habitación"
            for k in range(8):
                pegar(sint, filtro(acorde(voces, TIEMPO / 2 * 0.8), None, 700 + c * 250) * (1 if k % 2 else 0.6), ini + k * TIEMPO / 2)
            pegar(ritmo, filtro(bombo(), None, 300) * 0.7, ini)
            pegar(ritmo, filtro(bombo(), None, 300) * 0.7, ini + 2 * TIEMPO)
        elif ini < DROP:  # subida: redoble cada vez más rápido
            for k in range(8):
                pegar(sint, filtro(acorde(voces, TIEMPO / 2 * 0.8), None, 1800 + (c - 4) * 1500) * 0.8, ini + k * TIEMPO / 2)
            golpes = 8 if c == 4 else 16  # primero en corcheas, después en semicorcheas
            paso = COMPAS / golpes
            for k in range(golpes):
                pegar(ritmo, redoble() * (0.4 + 0.6 * (ini + k * paso - SUBIDA) / (DROP - SUBIDA)), ini + k * paso)
        else:  # DROP
            for b in range(4):
                pegar(ritmo, bombo(), ini + b * TIEMPO)
                pegar(ritmo, hat() * 0.35, ini + b * TIEMPO + TIEMPO / 2)
                # acorde que "bombea": entra después de cada bombo (sidechain)
                a = acorde([v + 12 for v in voces] + voces, TIEMPO)
                env = np.clip(np.arange(len(a)) / (0.12 * SR), 0, 1) ** 1.5
                pegar(sint, filtro(a * env, None, 6000), ini + b * TIEMPO)
                b2 = sierra(nota(raiz + 12), TIEMPO * 0.45, voces=2)
                pegar(graves, filtro(b2, None, 500) * np.exp(-np.arange(len(b2)) / SR * 4), ini + b * TIEMPO + TIEMPO / 2)
            for b in (1, 3):
                pegar(ritmo, palma() * 0.6, ini + b * TIEMPO)
        c += 1
    # golpe final con acorde largo
    a = acorde([69, 72, 76, 81], 1.6) * np.exp(-tt(1.6) * 2)
    pegar(sint, filtro(a, None, 5000), FIN)
    pegar(ritmo, bombo() * 1.2, FIN)
    pegar(graves, filtro(sierra(nota(33), 1.5, voces=2), None, 300) * np.exp(-tt(1.5) * 2), FIN)
    # efectos: ruido que sube antes del drop, "golpe" de ruido en el drop
    t = tt(DROP - SUBIDA)
    pegar(efx, filtro(rng.standard_normal(len(t)), 1500, 12000) * (t / t[-1]) ** 2.5, SUBIDA)
    t2 = tt(1.2)
    pegar(efx, filtro(rng.standard_normal(len(t2)), 300, 9000) * np.exp(-t2 * 4) * 0.8, DROP)
    sint = reverb(sint, seg=1.2, mezcla=0.18)
    mono = np.tanh((sint * 0.42 + filtro(graves, 30, 400) * 0.45 + ritmo * 0.6 + efx * 0.18) * 1.3)
    dly = int(0.014 * SR)
    izq = mono + np.roll(sint, dly) * 0.1
    der = mono + sint * 0.1
    st = np.stack([izq, der], axis=1)[: int(LARGO * SR)]
    fin = int(0.6 * SR)
    st[-fin:] *= np.linspace(1, 0, fin)[:, None]
    return st


if __name__ == "__main__":
    guardar(fiesta(), os.path.join(L.PUBLIC, "musica", "fiesta-recuerdos.mp3"))
