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

## 4. Sonido y efectos (Reel de fotos)

En el guion se puede sumar:
- `"musica"`: archivo de `videos/public/musica/` (por defecto `ritmo-entreno.mp3`, música original sin derechos). `null` = sin música.
- `"volumenMusica"`: 0 a 1 (por defecto 0.35).
- `"sonidos": false` para apagar los efectos (whoosh en transiciones, impacto en gancho/cierre, pop en la palabra destacada).
- `"voz"`: voz en off grabada con el celu, en `videos/public/voz/`.
- Por escena: `"transicion"`: `deslizar` (por defecto) | `barrido` | `fundido` | `corte`; `"efecto"`: `temblor` | `flash` | `zoom` | `ninguno`.
- Variar transiciones y efectos: no repetir el mismo en todas las escenas. `flash` o `zoom` en el momento de mayor peso.
- Para regenerar los sonidos: `python3 videos/herramientas/generar-sonidos.py`. Si Fausto trae música propia, copiarla a `videos/public/musica/` (solo música con permiso: propia, YouTube Audio Library, Pixabay, etc.).

## 5. Editar un video que grabó Fausto (hablando a cámara)

Composición `VideoHablado` (`videos/src/VideoHablado.tsx`): zooms de ritmo, gancho, subtítulos, música bajita y placa final de marca.
1. Pasar el clip a vertical, corregir color y limpiar la voz:
   `ffmpeg -i <original> -vf "scale=1080:1920:flags=lanczos,eq=brightness=0.03:contrast=1.07:saturation=1.1,unsharp=5:5:0.4" -r 30 -c:v libx264 -crf 18 -af "highpass=f=90,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11" -ar 48000 videos/public/clips/<nombre>.mp4`
   (si el original es horizontal de verdad, usar recorte/crop en vez de escalar).
2. Transcribir para subtítulos: `pip install faster-whisper` y modelo `small` en español con `word_timestamps=True` (necesita acceso a huggingface.co). Si no hay acceso, pedirle a Fausto el texto.
3. Escribir `videos/guiones/hablado-<fecha>.json` con `video`, `segundos` (ffprobe), `gancho` (frase de los primeros 3 s, sacada de lo que dice), `subtitulos` (frases de 3-7 palabras con `inicio`/`fin` en segundos y una palabra `destacar`), `volumenMusica` ~0.07.
4. `npx remotion render src/index.ts VideoHablado out/<nombre>.mp4 --props=guiones/<nombre>.json`
5. Los clips de Fausto NO se suben al repositorio (`public/clips/` está en .gitignore).

## 6. Edición "de tendencia" (EspaciosPro) — usar por defecto para Aldea

Investigado en octubre 2026: lo que funciona en Reels es cortar al ritmo de la música, intro que sube con un "drop",
transiciones rápidas (whip/zoom con desenfoque, glitch RGB), cámara lenta, flash en los golpes, grano/destellos
cinematográficos y textos animados. Todo eso está en `videos/src/EspaciosPro.tsx` (composiciones `EspaciosPro` y
`EspaciosProHorizontal`, mismo guion que `Espacios`).
- Música: `house-aldea.mp3` (120 bpm, drop en el segundo 4) y `phonk-bunkai.mp3` (130 bpm, para entrenamiento).
  Se regeneran con `python3 videos/herramientas/generar-musica-v2.py` (también whip, boom, riser, shutter, glitch).
- Entregar SIEMPRE también una versión con `"musica": null`, para que Fausto le ponga un audio en tendencia
  desde Instagram (da más alcance que la música propia).
- Normalizar el audio final: `ffmpeg ... -af "loudnorm=I=-14:TP=-1.5:LRA=9"`.
- Datos de Aldea: WhatsApp 351 530 8489 · Instagram @aldeadevalle · República de China 1890, Valle Escondido.
- La pileta no se muestra hasta que esté limpia para la temporada.

## 7. ESTILO DE LA CASA para videos hablados (HabladoPro) — usar siempre que alguien hable a cámara

Es el estilo de los reels que ya publica Aldea (referencias que pasó Fausto el 16/10/2026):
persona hablando a cámara en el predio + subtítulos palabra por palabra (Montserrat ExtraBold blanca con sombra,
centro-abajo) + "destacados" en las frases clave (línea chica arriba, PALABRA ENORME en Montserrat Black cursiva,
línea fina en cursiva abajo con barrita de color, y un emoji) + cortes a imágenes de apoyo con título condensado
en cursiva (Anton) + destellos de luz al entrar/salir + zoom alternado por frase + música bajita.
Gancho de entrada tipo "Este video es para ese amigo…" / "Tu hijo llega de la escuela ¿y pasa horas con el celular?"
y cierre con llamado ("Mandá este video al grupo", "Escribinos FÚTBOL").

Pasos:
1. Pasar el clip a `videos/public/clips/` vertical 1080x1920 con la voz limpia (ver sección 5, paso 1).
2. Transcribir SIN internet abierto: modelo Whisper small de sherpa-onnx (se baja de GitHub, que sí está permitido):
   `curl -L -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2`
   y `.../asr-models/silero_vad.onnx`; `pip install sherpa-onnx`;
   `python3 -I videos/herramientas/transcribir.py <clip> videos/guiones/transcripcion-X.json <carpeta_modelo>`.
3. Corregir a mano los nombres propios (Claude, Bunkai Dojo, Aldea, GLORIN…) y recalcular tiempos (ver guion de ejemplo
   `videos/guiones/hablado-pro-2026-10-12.json`). Si una frase no se entiende, NO inventarla: dejarla con "…".
4. Elegir 3–4 destacados (gancho, idea central, llamado final) y apoyos (b-roll) cuando nombra lugares/actividades.
5. `npx remotion render src/index.ts HabladoPro out/X.mp4 --props=guiones/X.json` y normalizar a -14 LUFS.
6. VOZ NATURAL (pedido de Fausto, 16/10): NO usar reducción de ruido (afftdn) ni highpass ni loudnorm comprimido
   sobre la voz. Solo cortar y subir volumen: loudnorm en DOS pasadas con `linear=true` (mide y aplica ganancia, no comprime).
7. Priorizar SIEMPRE material propio de Fausto (sus clases, alumnos, salidas) por sobre fotos genéricas de la web.

## 8. Cambiar el diseño

- Colores, usuario y tipografía: `videos/src/marca.ts`.
- Animaciones y estilos de escena: `videos/src/Reel.tsx`.
