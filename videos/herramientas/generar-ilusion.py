"""Música ORIGINAL (sin derechos de autor) alegre y de ilusión: para previas de campeonato, partidos, viajes.

Uso:  python3 herramientas/generar-ilusion.py
Crea:
  public/musica/ilusion-campeonato.mp3   16 s, 120 bpm (1 tiempo = 0,5 s), tonalidad mayor (G – D – Em – C).
                                          0–4 s: plucks y colchón · 4–8 s: palmas y subida · 8 s: DROP
                                          (bombo en negras, bajo, melodía) · 14–16 s: acorde final que se apaga.
Reutiliza las funciones de herramientas/generar-lounge.py.
"""
import importlib.util
import os

import numpy as np

AQUI = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("lounge", os.path.join(AQUI, "generar-lounge.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
SR, tt, filtro, pegar, nota, reverb, colchon, guardar, bombo = L.SR, L.tt, L.filtro, L.pegar, L.nota, L.reverb, L.colchon, L.guardar, L.bombo
rng = L.rng

TIEMPO = 0.5
COMPAS = 4 * TIEMPO
LARGO = 16.0
DROP = 8.0


def pluck(m, largo=0.4, vel=1.0):
    t = tt(largo)
    f = nota(m)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t)
    return filtro(s * np.exp(-t * 9) * np.minimum(1, t / 0.003), None, 4000) * vel


def palma():
    t = tt(0.18)
    s = np.zeros_like(t)
    for d in (0, 0.008, 0.017):  # tres golpes muy juntos = palmas de varias personas
        i = int(d * SR)
        s[i:] += filtro(rng.standard_normal(len(t) - i), 900, 5000) * np.exp(-t[: len(t) - i] * 40)
    return s


def subida(largo):
    t = tt(largo)
    ruido = filtro(rng.standard_normal(len(t)), 2000, 10000)
    return ruido * (t / largo) ** 2


def ilusion():
    n = int((LARGO + 2) * SR)
    pl, pad, bajo, ritmo, mel, efx = (np.zeros(n) for _ in range(6))
    acordes = [(43, [67, 71, 74]), (38, [66, 69, 74]), (40, [67, 71, 76]), (36, [67, 72, 76])]  # G D Em C
    melodia = [79, 81, 83, 81, 79, 78, 76, 78, 79, 81, 83, 86, 84, 83, 81, 79]  # frase alegre que sube
    for c in range(int(LARGO / COMPAS)):
        raiz, voces = acordes[c % 4]
        ini = c * COMPAS
        ultimo = ini >= LARGO - COMPAS
        pegar(pad, colchon(voces, COMPAS + 0.3), ini)
        if ultimo:  # acorde final largo
            for v in voces + [raiz + 24]:
                pegar(pl, pluck(v, 2.2, 0.9), ini)
            pegar(bajo, L.bajo(raiz, 2.0), ini)
            pegar(ritmo, bombo(), ini)
            continue
        for k in range(8):  # corcheas en las voces del acorde
            pegar(pl, pluck(voces[k % 3] + (12 if k in (3, 7) else 0), 0.35, 0.8 if k % 2 == 0 else 0.55), ini + k * TIEMPO / 2)
        if ini >= COMPAS * 2:
            for b in (1, 3):
                pegar(ritmo, palma() * 0.7, ini + b * TIEMPO)
        if ini >= DROP:
            for b in range(4):
                pegar(ritmo, bombo(), ini + b * TIEMPO)
                pegar(bajo, L.bajo(raiz + (12 if b % 2 else 0), TIEMPO * 0.45), ini + b * TIEMPO + TIEMPO / 2)  # bajo a contratiempo
            for k in range(4):
                m = melodia[((c - 4) * 4 + k) % len(melodia)]
                pegar(mel, pluck(m, 0.55, 1.0) + pluck(m + 12, 0.55, 0.3), ini + k * TIEMPO)
        elif ini >= COMPAS * 2:
            pegar(ritmo, bombo() * 0.8, ini)
            pegar(ritmo, bombo() * 0.6, ini + 2 * TIEMPO)
    pegar(efx, subida(2 * COMPAS), DROP - 2 * COMPAS)
    t = np.arange(n) / SR
    pl *= np.where(t < DROP, 0.75, 1.0)
    pl = reverb(pl, seg=1.4, mezcla=0.22)
    mel = reverb(mel, seg=1.6, mezcla=0.25)
    mono = pl * 0.32 + filtro(pad, 150, 3000) * 0.14 + filtro(bajo, 30, 500) * 0.35 + ritmo * 0.42 + mel * 0.3 + efx * 0.12
    dly = int(0.012 * SR)
    izq = mono + np.roll(pl, dly) * 0.08 + np.roll(mel, dly) * 0.06
    der = mono + pl * 0.08 + mel * 0.06
    st = np.stack([izq, der], axis=1)[: int(LARGO * SR)]
    fin = int(1.2 * SR)
    st[-fin:] *= np.linspace(1, 0, fin)[:, None]
    return st


if __name__ == "__main__":
    guardar(ilusion(), os.path.join(L.PUBLIC, "musica", "ilusion-campeonato.mp3"))
