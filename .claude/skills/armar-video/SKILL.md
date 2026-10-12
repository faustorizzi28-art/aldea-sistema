---
name: armar-video
description: Arma un video vertical (Reel/TikTok/Short/Estado) para Profe Fausto Rizzi con Remotion. Usar cuando pida "armame un video/reel sobre...", cuente algo que le pasó y quiera un video, o pida renderizar un guion.
---

# Armar un video de Profe Fausto con Remotion

El proyecto está en `videos/`. Un video = un archivo de guion JSON en `videos/guiones/`.
Claude escribe el guion siguiendo la filosofía de marca y Remotion lo convierte en .mp4.

## 1. Filosofía de marca (no negociable)

- Quién es: Fausto, formador de personas a través del movimiento, el deporte, el juego y las artes marciales.
  Educación Física, Karate (Bunkai Dojo), Kickboxing, animaciones infantiles (GLORIN) y coordinación deportiva (Aldea de Valle). Córdoba, Argentina.
- Frase madre: "Un día sin movimiento es un día perdido."
- Arquetipos: Mentor (60%), Constructor de Comunidad (25%), Guerrero Disciplinado (15%).
- Tono: humano, cercano, firme, reflexivo. Habla desde la experiencia. Voseo argentino ("entrenás", "te animás").
- Mostrar el PROCESO, no solo el resultado: el esfuerzo, el error, la vuelta, la constancia.
- El movimiento tiene doble sentido: físico y vital (accionar, decidir, animarse).
- Nunca: frases de influencer, "¡Tú puedes!", "No pain no gain", positivismo hueco, lenguaje corporativo, sonar a ChatGPT.
- Si Fausto cuenta una historia propia, usarla: es lo más fuerte de la marca.
- Formatos de reel que funcionan: "Lo que el karate me enseñó", "La gente ve el resultado, no el proceso", "Un día en mi vida", detrás de escena de clases, GLORIN y Aldea de Valle.

## 2. Estructura del guion

- Escena 1 `"tipo": "gancho"`: frase que frena el scroll en 1-2 segundos. Máx 10 palabras.
- 2 a 4 escenas `normal`: desarrollo, una idea por escena, 5-12 palabras cada una.
- Última escena `"tipo": "cierre"`: mensaje final, la frase madre o un llamado a la acción. Sin foto (fondo rojo de marca).
- Duración total ideal: 12-20 segundos. Cada escena 2.5-4 s (más texto = más segundos).
- `destacar`: UNA palabra de la escena que se pinta en amarillo (la palabra con más peso emocional).
- `foto`: archivo existente en `videos/public/fotos/` (listar la carpeta antes de elegir). Elegir la foto que corresponda al tema.

Formato:
```json
{
  "titulo": "Nombre corto",
  "escenas": [
    { "tipo": "gancho", "texto": "...", "destacar": "...", "foto": "clase-karate.jpg", "segundos": 3.5 },
    { "texto": "...", "destacar": "...", "foto": "kickboxing.jpg", "segundos": 3 },
    { "tipo": "cierre", "texto": "Un día sin movimiento es un día perdido.", "destacar": "movimiento", "segundos": 3.5 }
  ]
}
```

## 3. Pasos

1. Si el pedido es ambiguo, proponer 2 ángulos en una línea cada uno y elegir el más fuerte (no frenar a preguntar salvo que falte algo esencial).
2. Escribir `videos/guiones/<nombre-en-minusculas-con-guiones>.json`.
3. `cd videos && npm install` (solo si no existe `node_modules`).
4. Renderizar:
   `npx remotion render src/index.ts Reel out/<nombre>.mp4 --props=guiones/<nombre>.json`
   En la nube de Claude Code agregar `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` si Remotion no puede descargar Chrome.
5. Revisar 2-3 cuadros con `npx remotion still src/index.ts Reel out/prueba.png --props=guiones/<nombre>.json --frame=<n> --scale=0.3` y mirar que el texto se lea y no tape caras.
6. Entregar: el .mp4, y además un caption para Instagram (gancho + 2-4 líneas + 3-5 hashtags de la marca, p. ej. #ProfeFaustoRizzi #BunkaiDojo #UnDíaSinMovimientoEsUnDíaPerdido).
7. Commitear el guion (no el .mp4: `out/` está en .gitignore).

## 4. Cambiar el diseño

- Colores, usuario y tipografía: `videos/src/marca.ts`.
- Animaciones y estilos de escena: `videos/src/Reel.tsx`.
