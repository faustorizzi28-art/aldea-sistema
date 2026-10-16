"""Pasa las transcripciones de cada toma a la línea de tiempo del video unido con unir-tomas.py.

Uso: python3 herramientas/frases-de-tomas.py tomas.json salida.json transcripcion1.json transcripcion2.json ...
(una transcripción por archivo de toma, en el mismo orden de aparición de archivos distintos en tomas.json)
Salida: lista de frases {texto, inicio, fin, palabras} en tiempo del video final (fundido de 0.2 s entre tomas).
"""
import json
import sys

FUNDIDO = 0.2
tomas = json.load(open(sys.argv[1]))
archivos = list(dict.fromkeys(t["archivo"] for t in tomas))
trans = dict(zip(archivos, [json.load(open(p)) for p in sys.argv[3:]]))

frases, inicio = [], 0.0
for t in tomas:
    d = t["hasta"] - t["desde"] + t.get("congelar", 0)
    for s in trans[t["archivo"]]:
        if s["fin"] <= t["desde"] + 0.05 or s["inicio"] >= t["hasta"] - 0.05:
            continue
        pal = [
            {"p": w["p"], "i": round(inicio + max(0, w["i"] - t["desde"]), 2), "f": round(inicio + min(t["hasta"], w["f"]) - t["desde"], 2)}
            for w in s["palabras"]
            if w["f"] > t["desde"] and w["i"] < t["hasta"]
        ]
        if pal:
            frases.append({"texto": " ".join(w["p"] for w in pal), "inicio": pal[0]["i"], "fin": pal[-1]["f"], "palabras": pal})
    inicio += d - FUNDIDO
json.dump(frases, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
for k, f in enumerate(frases):
    print(k, f"[{f['inicio']:.2f}-{f['fin']:.2f}]", f["texto"])
print(f"duración total ≈ {inicio + FUNDIDO:.2f} s")
