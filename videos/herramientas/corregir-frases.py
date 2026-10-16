"""Reemplaza el texto de cada frase por el corregido y reparte los tiempos de las palabras.
Uso (desde Python): from corregir import corregir; frases = corregir(frases, {indice: "texto corregido", ...}, borrar=[indices])
"""


def corregir(frases, textos, borrar=()):
    out = []
    for k, f in enumerate(frases):
        if k in borrar:
            continue
        texto = textos.get(k, f["texto"])
        ws = texto.split()
        pesos = [len(w) + 2 for w in ws]
        tot = sum(pesos)
        acc, pal = 0, []
        for w, p in zip(ws, pesos):
            a = f["inicio"] + acc / tot * (f["fin"] - f["inicio"])
            acc += p
            b = f["inicio"] + acc / tot * (f["fin"] - f["inicio"])
            pal.append({"p": w, "i": round(a, 2), "f": round(b, 2)})
        out.append({"texto": texto, "inicio": f["inicio"], "fin": f["fin"], "palabras": pal})
    return out
