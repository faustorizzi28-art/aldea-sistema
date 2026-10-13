# Videos con Remotion — guía desde cero

## ¿Qué es Remotion?

Remotion es una herramienta para **hacer videos escribiendo código** (React) en vez de
arrastrar clips en un editor. La idea clave:

> Un video es una seguidilla de fotos (cuadros / *frames*). A 30 cuadros por segundo,
> un video de 10 segundos son 300 cuadros. En Remotion vos describís **cómo se ve
> cada cuadro**, y Remotion los saca uno por uno y los pega en un .mp4.

¿Por qué sirve para vos? Porque si el video es código, **Claude lo puede escribir**.
Vos le contás la idea ("algo sobre la clase de hoy con los chicos") y Claude arma el
guion con tu estilo y genera el video.

## Cómo está armado este proyecto

```
videos/
├── guiones/          ← UN ARCHIVO = UN VIDEO (lo único que hay que tocar)
│   └── ejemplo-karate.json
├── public/fotos/     ← fotos que pueden usar los videos
├── src/
│   ├── marca.ts      ← tus colores, tu usuario, tu frase madre
│   ├── Reel.tsx      ← el "molde" del video: animaciones, texto, fotos
│   └── Root.tsx      ← registra el video para que Remotion lo encuentre
└── out/              ← acá salen los .mp4
```

Un guion se ve así:

```json
{
  "titulo": "Lo que el karate me enseñó",
  "escenas": [
    { "tipo": "gancho", "texto": "La gente ve el cinturón. Nadie ve las caídas.", "destacar": "caídas", "foto": "clase-karate.jpg", "segundos": 3.5 },
    { "texto": "Días de no tener ganas. Y entrenar igual.", "destacar": "igual", "foto": "jiujitsu.jpg" },
    { "tipo": "cierre", "texto": "Un día sin movimiento es un día perdido.", "destacar": "movimiento" }
  ]
}
```

- `tipo`: `gancho` (letra grande, en mayúsculas), `normal` (texto abajo), `cierre` (fondo rojo).
- `destacar`: la palabra que se pinta en amarillo.
- `foto`: un archivo de `public/fotos/`. Para sumar fotos nuevas, copialas a esa carpeta.
- `segundos`: cuánto dura la escena (si no lo ponés, 3).

## La forma fácil: pedírselo a Claude

En Claude Code, con este repositorio abierto, escribí algo como:

- *"Armame un reel sobre lo que aprendí dando clases de karate a chicos"*
- *"Hoy en la Aldea 20 pibes aprendieron a caer bien, haceme un video"*
- *"Un video para promocionar los cumples de GLORIN"*

Claude usa la habilidad `armar-video` (está en `.claude/skills/armar-video/SKILL.md`),
que tiene tu filosofía de marca y los pasos. Te devuelve el .mp4 y un caption.

## Hacerlo a mano en tu compu

Necesitás [Node.js](https://nodejs.org) instalado (versión 18 o más). Después, en una terminal:

```bash
cd videos
npm install          # una sola vez: baja Remotion
npm run estudio      # abre el Estudio en el navegador: ves el video y lo podés reproducir
```

En el Estudio podés tocar el guion en el panel de la derecha y ver el cambio al instante.

Para sacar el .mp4:

```bash
npm run render                                              # el ejemplo
npx remotion render src/index.ts Reel out/mi-video.mp4 --props=guiones/mi-video.json
```

## Conceptos de Remotion (para cuando quieras tocar el diseño)

| Concepto | Qué hace | Dónde lo usamos |
|---|---|---|
| `<Composition>` | Define un video: tamaño, fps, duración | `Root.tsx` |
| `useCurrentFrame()` | Te dice en qué cuadro estás (0, 1, 2…) | todo `Reel.tsx` |
| `interpolate()` | Convierte el cuadro en un valor: "del cuadro 0 al 90, el zoom va de 1 a 1.12" | zoom de la foto, fundido |
| `spring()` | Animación con rebote natural | palabras que entran |
| `<Sequence>` | Hace que algo aparezca desde el cuadro X durante N cuadros | cada escena |
| `<Img>` + `staticFile()` | Muestra una foto de `public/` | fondo de cada escena |

Un ejercicio para arrancar: abrí `src/marca.ts`, cambiá `amarillo` por otro color,
y mirá el Estudio. Después, en `Reel.tsx`, cambiá `[1, 1.12]` por `[1, 1.4]` y vas a
ver que el zoom de las fotos es mucho más fuerte.
