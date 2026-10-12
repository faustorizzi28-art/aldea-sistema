---
name: cargar-cumple-glorin
description: Carga un cumpleaños de GLORIN Animaciones en el portal de profes. Usalo cuando Fausto comparte un cumple para agendar (mensaje o captura de WhatsApp, audio transcripto, nota, foto de una agenda) o dice "cargá este cumple", "agendá este cumple", "nuevo cumple". Devuelve un link que abre el portal con el formulario completo, listo para revisar y guardar.
---

# Cargar un cumple en el portal de GLORIN

Fausto (dueño de GLORIN Animaciones, Córdoba, Argentina) te pasa los datos de un cumple tal como le llegaron.
Tu trabajo: sacar los datos, armar **un link** que abre el portal con el formulario "Nueva fecha" ya completo,
y un **bloque de texto** de respaldo para pegar en el portal. Fausto revisa y toca "Crear fecha": vos no guardás nada.

## 1. Sacá los datos

| Campo (parámetro del link) | Qué va | Formato |
|---|---|---|
| `fecha` | día del cumple | `AAAA-MM-DD`. Si no dicen el año, el próximo que viene. |
| `hora` | hora de inicio | `HH:MM` 24 h (las "4 de la tarde" → `16:00`) |
| `fin` | hora de fin | `HH:MM`. Si no la dicen: inicio + 2 h 30 min (+30 o +60 si pidieron tiempo extra). |
| `cumple` | nombre del cumpleañero/a | texto |
| `edad` | años que cumple | número |
| `paquete` | uno de: `Individual` (1 profe) · `Ultra Básico` (2) · `Recreación` (3) · `Premium` (3, con inflable y metegol) | texto exacto |
| `necesarios` | profes necesarios | número (si no lo dicen, el del paquete) |
| `zona` | una de: Córdoba Capital · Villa Allende · La Calera · Manantiales · Aldea de Valle (Valle Escondido) · Villa Carlos Paz · Falda del Carmen · Otra zona (a confirmar) | texto exacto |
| `direccion` | calle, número, barrio | texto |
| `adulto` | adulto responsable | texto |
| `whatsapp` | celular de la familia | solo números con característica, ej. `3516197928` |
| `chicos` | cantidad de chicos | número |
| `edades` | rango de edades | ej. `5 a 8` |
| `extras` | Inflable 3x6, Metegol, Maquillaje artístico, Taller de masas, Globología, Kermés, tiempo extra | texto, separado por comas |
| `notas` | temática, horario de torta/merienda, alergias, lo que el equipo tenga que saber | texto |
| `estado` | `Señado` si ya pagó la seña, `A confirmar` si todavía no | texto (por defecto `Señado`) |
| `pago` | **solo** si Fausto dice un pago fijo especial para esa fecha | número sin puntos |

Imprescindibles: **fecha, hora y nombre del cumpleañero/a**. Si falta alguno, preguntá solo eso, en una línea.
Lo demás, si no está, dejalo afuera (no inventes). Si algo es dudoso, ponelo en `notas` con un "(a confirmar)".

## 2. Armá el link

Base (siempre igual):

```
https://script.google.com/macros/s/AKfycbycWz4e_VbE3eLYiqZk1aT26_u5UbYacbLj23O0bAje4BVjRl7BPGPCCi8S-Tpt25wiSQ/exec?profes=1&nueva=1
```

A eso sumale `&campo=valor` por cada dato, con el valor **codificado para URL**: espacio → `%20`, `ñ` → `%C3%B1`,
`á` → `%C3%A1`, `é` → `%C3%A9`, `í` → `%C3%AD`, `ó` → `%C3%B3`, `ú` → `%C3%BA`, `,` → `%2C`, `:` → `%3A`, `/` → `%2F`, `#` → `%23`, `&` → `%26`.
Con código disponible, generalo con `encodeURIComponent` en vez de a mano.

## 3. Respondé así (corto)

1. Un resumen de 3 o 4 líneas para que Fausto chequee (quién, cuándo, dónde, paquete).
2. El link, como link clickeable: **[Abrir en el portal y guardar](LINK)**
3. El bloque de respaldo, para pegar en el portal (pestaña ➕ Nueva → "Pegá lo que te dio Claude"):

```
Fecha: 2026-11-15
Hora: 16:00
Fin: 18:30
Cumple: Martina
Edad: 6
Paquete: Premium
Zona: Villa Allende
Direccion: Av. Goycoechea 1234
Adulto: Ana López
WhatsApp: 3515550000
Chicos: 25
Edades: 5 a 7
Extras: Maquillaje artístico
Notas: Temática Frozen. Torta 17:30.
Estado: Señado
```

Si te pasa varios cumples juntos, hacé un link y un bloque por cada uno.

## Ejemplo

Fausto: *"Cumple de Benja, cumple 4, sábado 24/10 a las 11 en Bv. Chacabuco 800, la mamá es Caro 351 555 1111, Ultra básico, ya señó"*

Link:
```
…/exec?profes=1&nueva=1&fecha=2026-10-24&hora=11%3A00&fin=13%3A30&cumple=Benja&edad=4&paquete=Ultra%20B%C3%A1sico&direccion=Bv.%20Chacabuco%20800&adulto=Caro&whatsapp=3515551111&estado=Se%C3%B1ado
```
