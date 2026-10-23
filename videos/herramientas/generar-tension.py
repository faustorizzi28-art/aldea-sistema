"""Pista de tensión ORIGINAL para teasers: drone grave + latidos que se aceleran + subida + golpe final.
Uso: python3 herramientas/generar-tension.py [segundos=24]  ->  public/musica/tension-teaser.mp3
Los golpes fuertes caen en: 0 s (arranque), latidos cada vez más rápidos, silencio en (total-5.2 s) y BOOM en (total-4.6 s).
"""
import os, subprocess, sys, wave
import numpy as np
SR = 44100
T = float(sys.argv[1]) if len(sys.argv) > 1 else 24.0
rng = np.random.default_rng(3)
t = lambda s: np.arange(int(SR * s)) / SR
x = np.zeros(int(SR * T))
def poner(m, s, v=1.0):
    i = int(s * SR); j = min(len(x), i + len(m))
    if i < len(x): x[i:j] += m[: j - i] * v
def latido():
    tt = t(0.5)
    a = np.sin(2 * np.pi * np.cumsum(55 + 40 * np.exp(-tt * 30)) / SR) * np.exp(-tt * 12)
    b = np.where(tt > 0.17, np.sin(2 * np.pi * np.cumsum(50 + 30 * np.exp(-(tt - 0.17) * 30)) / SR) * np.exp(-(tt - 0.17) * 14), 0) * 0.7
    return np.tanh((a + b) * 2.5)
# drone: dos ondas graves desafinadas + aire filtrado, que crece
tt = t(T); fin_silencio = T - 5.2; boom_t = T - 4.6
drone = np.sin(2 * np.pi * 41.2 * tt) + 0.6 * np.sin(2 * np.pi * 41.9 * tt) + 0.3 * np.sin(2 * np.pi * 82.4 * tt)
crece = np.clip(tt / fin_silencio, 0, 1) ** 1.5
drone *= (0.25 + 0.75 * crece)
ruido = np.convolve(rng.standard_normal(len(tt)), np.ones(400) / 400, mode="same") * 6 * crece
x += (drone * 0.35 + ruido * 0.15)
# latidos que se aceleran
s, gap = 0.6, 1.2
while s < fin_silencio - 0.3:
    poner(latido(), s, 0.9); s += gap; gap = max(0.42, gap * 0.93)
# subida aguda en los últimos segundos antes del silencio
r = t(3.5); sub = np.sin(2 * np.pi * np.cumsum(300 + 1500 * (r / 3.5) ** 2) / SR) * (r / 3.5) ** 2 * 0.25
poner(sub, fin_silencio - 3.5)
# silencio total y BOOM
x[int(fin_silencio * SR):int(boom_t * SR)] = 0
b = t(4.5); boom = np.sin(2 * np.pi * np.cumsum(30 + 80 * np.exp(-b * 8)) / SR) * np.exp(-b * 0.9)
boom += np.convolve(rng.standard_normal(len(b)), np.ones(30) / 30, mode="same") * np.exp(-b * 9) * 2
poner(np.tanh(boom * 2), boom_t, 1.0)
# acorde abierto que queda sonando al final (esperanza)
for f in (110, 164.8, 220, 277.2):
    poner(np.sin(2 * np.pi * f * b) * np.minimum(1, b / 0.3) * np.exp(-b * 0.5) * 0.12, boom_t + 0.1)
x[:int(SR*0.05)] *= np.linspace(0,1,int(SR*0.05)); x[-int(SR*1.2):] *= np.linspace(1,0,int(SR*1.2))
x = x / np.max(np.abs(x)) * 0.9
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "musica", "tension-teaser.mp3")
w = out.replace(".mp3", ".wav")
with wave.open(w, "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((x * 32767).astype(np.int16).tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", w, "-b:a", "192k", out], check=True); os.remove(w)
print("ok", out, T)
