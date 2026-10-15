"""Música y efectos de sonido v2: estilos actuales, ORIGINALES (sin derechos de autor).

Uso:  python3 herramientas/generar-musica-v2.py
Crea:
  public/musica/house-aldea.mp3   122 bpm aprox → 120 bpm exactos (1 tiempo = 15 cuadros a 30 fps)
                                   intro filtrada 2 compases + subida, DROP en el segundo 4, después compases de 2 s
  public/musica/phonk-bunkai.mp3  130 bpm, 808 + cencerro (estilo phonk) para contenido de entrenamiento
  public/sonidos/whip.mp3         whoosh corto para transiciones rápidas
  public/sonidos/boom.mp3         golpe grave (sub drop) para el drop / títulos
  public/sonidos/riser.mp3        subida de tensión antes del drop
  public/sonidos/shutter.mp3      click de cámara (para fotos)
  public/sonidos/glitch.mp3       tartamudeo digital para transiciones glitch
"""
import os
import subprocess
import wave

import numpy as np

SR = 44100
AQUI = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(AQUI, "..", "public")
rng = np.random.default_rng(11)


def t(seg):
    return np.arange(int(SR * seg)) / SR


def filtro(x, corte_bajo=None, corte_alto=None):
    """Filtro por FFT: deja pasar entre corte_bajo y corte_alto (Hz)."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    g = np.ones_like(f)
    if corte_alto:
        g *= 1 / np.sqrt(1 + (f / corte_alto) ** 4)
    if corte_bajo:
        g *= 1 / np.sqrt(1 + (corte_bajo / np.maximum(f, 1e-3)) ** 4)
    return np.fft.irfft(X * g, n)


def sierra(frec, tt, voces=3, desafine=0.12):
    s = np.zeros_like(tt)
    for v in range(voces):
        d = (v - (voces - 1) / 2) * desafine
        ff = frec * 2 ** (d / 12)
        s += 2 * ((ff * tt + rng.random()) % 1) - 1
    return s / voces


def nota(m):
    return 440 * 2 ** ((m - 69) / 12)


def guardar(x, ruta, estereo=None, normal=0.9):
    x = x / (np.max(np.abs(x)) + 1e-9) * normal
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    tmp = ruta.replace(".mp3", ".wav")
    with wave.open(tmp, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-b:a", "192k", ruta], check=True)
    os.remove(tmp)
    print("  ✓", os.path.relpath(ruta, PUBLIC))


class Pista:
    def __init__(self, segundos):
        self.x = np.zeros(int(SR * segundos))

    def poner(self, m, seg, vol=1.0):
        i = int(seg * SR)
        if i >= len(self.x):
            return
        j = min(len(self.x), i + len(m))
        self.x[i:j] += m[: j - i] * vol


# ---------------- Instrumentos ----------------
def bombo(largo=0.45, grave=48, golpe=170):
    tt = t(largo)
    f = grave + golpe * np.exp(-tt * 38)
    cuerpo = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6.5)
    click = filtro(rng.standard_normal(len(tt)), 2000, None) * np.exp(-tt * 300) * 0.4
    return np.tanh((cuerpo + click) * 1.6)


def palmas():
    tt = t(0.3)
    r = filtro(rng.standard_normal(len(tt)), 900, 6000)
    env = np.zeros_like(tt)
    for k, d in enumerate([0, 0.011, 0.022]):
        env += np.where(tt >= d, np.exp(-(tt - d) * (90 if k < 2 else 16)), 0)
    return r * env


def hat(abierto=False):
    tt = t(0.25 if abierto else 0.05)
    r = filtro(rng.standard_normal(len(tt)), 7000, None)
    return r * np.exp(-tt * (14 if abierto else 110))


def ochocientos(frec, largo, desliz_a=None):
    tt = t(largo)
    f = np.full_like(tt, frec)
    if desliz_a:
        f = frec + (desliz_a - frec) * np.clip((tt - largo * 0.5) / (largo * 0.3), 0, 1)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    s = np.tanh(s * 2.2) * np.minimum(1, tt / 0.005) * np.exp(-tt * 0.9)
    return s * np.minimum(1, (largo - tt) / 0.03)


def cencerro(frec, largo=0.18):
    tt = t(largo)
    s = np.sign(np.sin(2 * np.pi * frec * tt)) + np.sign(np.sin(2 * np.pi * frec * 1.48 * tt))
    return filtro(s * np.exp(-tt * 16), 500, 5000) * 0.5


# ---------------- Música ----------------
def house_aldea():
    """120 bpm. 0–4 s: intro filtrada con subida. 4 s: DROP. Luego 16 compases. Final con cola."""
    bpm = 120
    b = 60 / bpm  # 0.5 s
    compases_drop = 16
    total = 4 + compases_drop * 4 * b + 2.5
    p = Pista(total)
    bajo = Pista(total)
    acordes_p = Pista(total)

    # Progresión cálida y alegre: Fa – La menor – Re menor – Si bemol (en Fa mayor)
    acordes = [[65, 69, 72, 76], [64, 69, 72, 76], [62, 65, 69, 74], [62, 65, 70, 74]]
    raices = [41, 45, 38, 46]

    def compas_acorde(c, ini, vol=1.0):
        idx = c % 4
        # stabs en el contratiempo (estilo house actual)
        for k in range(4):
            for off in (0.5,):
                tt = t(b * 0.42)
                s = sum(sierra(nota(m), tt) for m in acordes[idx])
                s = s * np.exp(-tt * 7)
                acordes_p.poner(s, ini + (k + off) * b, 0.22 * vol)
        # bajo en contratiempo
        for k in range(4):
            tt = t(b * 0.45)
            s = np.sin(2 * np.pi * nota(raices[idx]) * tt) + 0.35 * sierra(nota(raices[idx]), tt, 1)
            s *= np.minimum(1, tt / 0.004) * np.exp(-tt * 3)
            bajo.poner(s, ini + (k + 0.5) * b, 0.7 * vol)

    # Intro: 2 compases (4 s) con acordes filtrados + hats que entran + subida
    for c in range(2):
        compas_acorde(c, c * 4 * b, 0.8)
        for k in range(8):
            if c == 1 or k % 2 == 1:
                p.poner(hat(), c * 4 * b + k * b / 2, 0.25)
    # redoble de palmas acelerando en el último medio compás
    for k, d in enumerate(np.linspace(3.0, 3.94, 8)):
        p.poner(palmas(), d, 0.15 + 0.06 * k)

    # Drop
    ini0 = 4.0
    for c in range(compases_drop):
        ini = ini0 + c * 4 * b
        compas_acorde(c, ini)
        for k in range(4):
            p.poner(bombo(), ini + k * b, 1.0)
            p.poner(hat(abierto=True), ini + (k + 0.5) * b, 0.22)
            p.poner(hat(), ini + (k + 0.25) * b, 0.1)
            p.poner(hat(), ini + (k + 0.75) * b, 0.12)
        for k in (1, 3):
            p.poner(palmas(), ini + k * b, 0.6)
        # pluck arpegiado cada dos compases
        if c % 2 == 0:
            idx = c % 4
            for k, m in enumerate([acordes[idx][i % 4] + 12 for i in range(8)]):
                tt = t(0.2)
                s = sierra(nota(m), tt, 2, 0.05) * np.exp(-tt * 22)
                p.poner(s, ini + k * b / 2 + 4 * b, 0.12)
    # final: un golpe y cola de acorde
    fin = ini0 + compases_drop * 4 * b
    p.poner(bombo(1.2), fin, 1.0)
    tt = t(2.4)
    s = sum(sierra(nota(m), tt) for m in acordes[0]) * np.exp(-tt * 1.4)
    acordes_p.poner(s, fin, 0.25)

    # Filtro de la intro: se va abriendo (barrido) hasta el drop
    a = acordes_p.x
    corte = 4 * SR
    trozos = 16
    salida = a.copy()
    for k in range(trozos):
        i, j = corte * k // trozos, corte * (k + 1) // trozos
        salida[i:j] = filtro(a[: j + 2048], None, 300 + 3500 * (k / trozos) ** 2)[i:j]
    salida[corte:] = filtro(a, None, 5000)[corte:]
    a = salida

    # "Sidechain": los acordes y el bajo respiran con el bombo (bombeo típico)
    env = np.ones_like(p.x)
    for c in range(compases_drop):
        for k in range(4):
            i = int((ini0 + c * 4 * b + k * b) * SR)
            n = int(b * SR)
            env[i : i + n] = np.minimum(env[i : i + n], 0.25 + 0.75 * np.minimum(1, np.arange(n) / (n * 0.55)) ** 1.5)
    mezcla = p.x + filtro(bajo.x, None, 800) * env + a * env
    # subida (riser) en la intro
    mezcla[: len(riser_snd)] += 0
    rz = riser(3.6)
    i = int(0.4 * SR)
    mezcla[i : i + len(rz)] += rz * 0.25
    return np.tanh(mezcla * 1.1)


def phonk_bunkai():
    bpm = 130
    b = 60 / bpm
    compases = 12
    total = compases * 4 * b + 1.5
    p = Pista(total)
    mel = [72, 72, 75, 72, 70, 72, 67, 70]  # cencerro en Do menor
    raiz = [36, 36, 39, 34]
    for c in range(compases):
        ini = c * 4 * b
        full = c >= 2
        for k, m in enumerate(mel):
            p.poner(cencerro(nota(m)), ini + k * b / 2, 0.35)
        if full:
            # 808: notas largas con deslizamiento
            r = raiz[c % 4]
            p.poner(ochocientos(nota(r), b * 1.5), ini, 0.9)
            p.poner(ochocientos(nota(r), b * 1.5, nota(r + 3)), ini + 2 * b, 0.9)
            p.poner(bombo(0.3, 50, 120), ini, 0.6)
            p.poner(bombo(0.3, 50, 120), ini + 2.5 * b, 0.6)
            p.poner(palmas(), ini + 2 * b, 0.8)
            # hats con redobles (rolls) típicos del trap
            for k in range(8):
                p.poner(hat(), ini + k * b / 2, 0.18)
            if c % 2 == 1:
                for k in range(6):
                    p.poner(hat(), ini + 3 * b + k * b / 6, 0.15)
        else:
            for k in range(4):
                p.poner(hat(), ini + k * b, 0.12)
    return np.tanh(p.x * 1.3)


# ---------------- Efectos ----------------
def whip():
    tt = t(0.28)
    r = rng.standard_normal(len(tt))
    env = np.sin(np.pi * np.clip(tt / 0.28, 0, 1)) ** 3
    barrido = np.zeros_like(r)
    for k in range(8):
        i, j = len(r) * k // 8, len(r) * (k + 1) // 8
        barrido[i:j] = filtro(r, 400 + 900 * k, 1500 + 1600 * k)[i:j]
    return barrido * env


def boom():
    tt = t(1.4)
    f = 32 + 90 * np.exp(-tt * 12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 2.6)
    golpe = filtro(rng.standard_normal(len(tt)), 60, 900) * np.exp(-tt * 25)
    return np.tanh((s + golpe * 0.6) * 1.8)


def riser(largo=1.6):
    tt = t(largo)
    r = rng.standard_normal(len(tt))
    s = np.zeros_like(r)
    trozos = 12
    for k in range(trozos):
        i, j = len(r) * k // trozos, len(r) * (k + 1) // trozos
        s[i:j] = filtro(r, 300 + 500 * k, 1200 + 900 * k)[i:j]
    tono = np.sin(2 * np.pi * np.cumsum(220 + 700 * (tt / largo) ** 2) / SR) * 0.3
    return (s * 0.6 + tono) * (tt / largo) ** 2.2


def shutter():
    tt = t(0.12)
    a = filtro(rng.standard_normal(len(tt)), 1500, 9000) * np.exp(-tt * 160)
    b2 = np.where(tt > 0.045, filtro(rng.standard_normal(len(tt)), 1200, 7000) * np.exp(-(tt - 0.045) * 140), 0)
    return a + b2 * 0.8


def glitch():
    tt = t(0.32)
    s = np.zeros_like(tt)
    bloque = int(0.02 * SR)
    for i in range(0, len(tt), bloque):
        if rng.random() < 0.7:
            f = rng.choice([180, 360, 720, 1440, 2880])
            seg = tt[i : i + bloque]
            s[i : i + bloque] = np.sign(np.sin(2 * np.pi * f * seg)) * rng.uniform(0.3, 1)
    return filtro(s, 150, 8000) * np.exp(-tt * 3)


riser_snd = np.zeros(1)

if __name__ == "__main__":
    print("Efectos…")
    guardar(whip(), os.path.join(PUBLIC, "sonidos", "whip.mp3"))
    guardar(boom(), os.path.join(PUBLIC, "sonidos", "boom.mp3"))
    guardar(riser(), os.path.join(PUBLIC, "sonidos", "riser.mp3"))
    guardar(shutter(), os.path.join(PUBLIC, "sonidos", "shutter.mp3"))
    guardar(glitch(), os.path.join(PUBLIC, "sonidos", "glitch.mp3"))
    print("Música…")
    guardar(house_aldea(), os.path.join(PUBLIC, "musica", "house-aldea.mp3"), normal=0.85)
    guardar(phonk_bunkai(), os.path.join(PUBLIC, "musica", "phonk-bunkai.mp3"), normal=0.85)
