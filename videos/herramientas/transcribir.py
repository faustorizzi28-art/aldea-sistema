"""Transcribe un video a subtítulos palabra por palabra (español), sin internet.

Uso:  python3 -I herramientas/transcribir.py <video> <salida.json> [carpeta_modelo]
Modelo: Whisper "small" de sherpa-onnx (se baja de GitHub releases de k2-fsa/sherpa-onnx)
        + silero_vad.onnx para cortar por frases.
Salida: [{"texto": "...", "inicio": s, "fin": s, "palabras": [{"p": "hola", "i": s, "f": s}, ...]}]
Los tiempos de cada palabra se reparten dentro de la frase según su largo (suficiente para subtítulos de 1–3 palabras).
"""
import json
import os
import subprocess
import sys

import numpy as np
import sherpa_onnx

video, salida = sys.argv[1], sys.argv[2]
M = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("MODELO_ASR", "")
SR = 16000

pcm = subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", video, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
    capture_output=True, check=True,
).stdout
audio = np.frombuffer(pcm, dtype=np.float32).copy()

rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{M}/sherpa-onnx-whisper-small/small-encoder.int8.onnx",
    decoder=f"{M}/sherpa-onnx-whisper-small/small-decoder.int8.onnx",
    tokens=f"{M}/sherpa-onnx-whisper-small/small-tokens.txt",
    language="es", task="transcribe", num_threads=4,
)

cfg = sherpa_onnx.VadModelConfig()
cfg.silero_vad.model = f"{M}/silero_vad.onnx"
cfg.silero_vad.min_silence_duration = 0.25
cfg.silero_vad.min_speech_duration = 0.2
cfg.silero_vad.max_speech_duration = 8
cfg.sample_rate = SR
vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=120)

ventana = cfg.silero_vad.window_size
segs = []
for i in range(0, len(audio), ventana):
    vad.accept_waveform(audio[i : i + ventana])
    while not vad.empty():
        segs.append((vad.front.start / SR, np.array(vad.front.samples)))
        vad.pop()
vad.flush()
while not vad.empty():
    segs.append((vad.front.start / SR, np.array(vad.front.samples)))
    vad.pop()

out = []
for ini, s in segs:
    st = rec.create_stream()
    st.accept_waveform(SR, s)
    rec.decode_stream(st)
    texto = st.result.text.strip()
    if not texto:
        continue
    fin = ini + len(s) / SR
    palabras = texto.split()
    pesos = np.array([len(p) + 2 for p in palabras], dtype=float)
    bordes = ini + np.concatenate([[0], np.cumsum(pesos)]) / pesos.sum() * (fin - ini)
    out.append({
        "texto": texto, "inicio": round(ini, 2), "fin": round(fin, 2),
        "palabras": [{"p": p, "i": round(bordes[k], 2), "f": round(bordes[k + 1], 2)} for k, p in enumerate(palabras)],
    })
    print(f"[{ini:6.2f}-{fin:6.2f}] {texto}")

json.dump(out, open(salida, "w"), ensure_ascii=False, indent=1)
