# Reserva de cancha online — Aldea del Valle

Página pública donde cualquiera elige cancha, día y horario libre, deja su
nombre y WhatsApp, y reserva. Escribe directo en la pestaña **Cancha** del
mismo Sheet que usa la app interna (Centro de Gestión) — el personal la ve
mezclada con las reservas que carga a mano, sin nada duplicado.

## Qué hace

**Para quien reserva** (desde el celular)
- Elige el día (próximos 14 días), la cancha (Media Cancha 11, Sintético 7
  o Fútbol 11) y un horario libre (turnos de 1 hora, de 9 a 23hs).
- Los horarios ya ocupados (sean reservas de la web o cargadas a mano por
  el personal, incluyendo los turnos fijos semanales) aparecen tachados.
- Carga nombre, WhatsApp, y marca si va a necesitar mesa/consumir en
  Cantina.
- Al confirmar, ve los datos para transferir la seña ($10.000) y un botón
  para mandar el comprobante por WhatsApp.

**Para vos**
- Cada reserva entra directo a la pestaña **Cancha** como "🔵 Reservado",
  con la seña en la columna transferencia y el resto del precio anotado en
  observaciones (junto con si pidió mesa).
- Te llega un mail de aviso con un botón para escribirle por WhatsApp a la
  persona.
- Si no te pagan la seña a tiempo y querés liberar el horario: borrá esa
  fila de la pestaña Cancha, o cambiale el estado a "❌ Cancelado" (ese
  estado no cuenta como ocupado para la página).

## Instalación (una sola vez)

Igual que con GLORIN: todo corre desde un solo proyecto de Apps Script,
que sirve la página y guarda los datos — no hace falta subir nada a
Netlify ni a ningún otro lado.

1. Andá a **script.google.com** → **Nuevo proyecto** (no hace falta que
   esté adentro del Sheet, porque el script abre la planilla por su ID).
2. Borrá el contenido de `Code.gs` que aparece por defecto y pegá el
   `Code.gs` de esta carpeta completo.
3. Arriba del todo revisá el bloque `CONFIG`: el `sheetId` ya apunta a tu
   planilla "Aldea del Valle — Base de Datos", el WhatsApp y el alias de
   transferencia son los mismos que ya usás en GLORIN. Si cambia el
   precio de la cancha o la seña, los números están ahí arriba
   (`precioHora`, `sena`).
4. En el editor, al lado de "Archivos", tocá el **+** → **HTML** → y
   ponele de nombre exactamente **Index** (sin ".html", Apps Script se lo
   agrega solo). Pegá ahí adentro todo el contenido de `index.html` de
   esta carpeta.
5. Guardá (disquete o Ctrl+S).
6. **Implementar → Nueva implementación → tipo "Aplicación web"** →
   Ejecutar como: **Yo** → Quién tiene acceso: **Cualquier usuario** →
   Implementar. Va a pedir que aceptes permisos (para leer/escribir tu
   Sheet y mandar mails) — aceptalo.
7. Copiá la URL que termina en `/exec` — ese es el link que compartís
   para que la gente reserve.

No hace falta tocar nada de `API_URL_FIJA` en `index.html`: al estar
servida por el mismo Apps Script, la página usa su propia URL sola.
Esa línea solo se usa si en algún momento preferís publicar la página
aparte (por ejemplo en el mismo Netlify del Centro de Gestión) — en ese
caso sí hay que pegar ahí la URL `/exec`.

## Si después cambiás el código

Implementar → Administrar implementaciones → ✏️ (lápiz) → **Nueva
versión** → Implementar. Así el link `/exec` no cambia y no hay que
volver a pegarlo en `index.html`.

## Fuera de alcance (por ahora)

- No pide pago con Mercado Pago, solo transferencia con comprobante por
  WhatsApp (como en GLORIN).
- No manda mail de confirmación a quien reserva (solo te avisa a vos). Si
  lo querés, se puede agregar pidiendo también el email en el formulario.
- No bloquea el calendario de Google, solo la pestaña Cancha del Sheet.
