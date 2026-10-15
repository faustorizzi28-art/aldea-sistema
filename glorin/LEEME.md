# GLORIN Animaciones · Sistema de reservas

Formulario web para que las familias reserven la animación del cumple, conectado a
**Google Calendar**, **Google Sheets**, **Gmail** y **WhatsApp**. Todo gratis, corre en tu cuenta de Google.

## Qué hace

**Para la familia** (desde el celular, ~5 minutos)
- Ve solo los días y horarios libres (respeta traslados, equipos de profes, tope por día y stock de inflable/metegoles).
- Arma paquete + tiempo extra + extras y ve el presupuesto en vivo.
- Si cierra la página, al volver sigue todo lo que había cargado.
- Al terminar: datos para la seña (con botón **Copiar alias**), botón de **Mercado Pago**, botón para **mandar el comprobante por WhatsApp** y para **agendarlo en su calendario**.
- Si dejó mail: le llega un resumen lindo y la invitación al evento.
- Botón flotante de WhatsApp para consultas en cualquier paso.

**Para vos**
- Cada reserva entra a la planilla (pestaña `Reservas`) y al calendario `GLORIN` como `⏳ A CONFIRMAR`.
- Te llega un mail con un botón para escribirle a la familia por WhatsApp con el mensaje ya armado.
- Cambiás el **Estado** en la planilla y todo se actualiza solo:
  - `Señado` → el evento pasa a `✅ CONFIRMADO` (verde) y le llega el mail de confirmación a la familia.
  - `Cancelado` → `❌ CANCELADO` y el horario vuelve a quedar libre en la página.
  - `Realizado` → `🎉 REALIZADO`.
- Menú **🎈 GLORIN** en la planilla → *WhatsApp a la familia*: botones con mensajes listos
  (reserva recibida + datos de pago, reclamar seña, confirmar, recordatorio del día antes, gracias + reseña).
- Todos los días a las 8 te llega un resumen: cumples de mañana (con botón de recordatorio por WhatsApp)
  y reservas que siguen sin seña después de 48 hs.

## Instalación (una sola vez)

1. Abrí la planilla de Google Sheets → **Extensiones → Apps Script**.
2. Pegá `Code.gs` en el archivo `Code.gs` y creá un archivo HTML llamado **`Index`** con el contenido de `Index.html`.
3. En `CONFIG` (arriba de `Code.gs`) ya está cargado el alias `faustorizzi` (Brubank). Revisá que el **titular** sea exactamente el nombre que aparece al transferir. `linkMercadoPago` va vacío salvo que tengas un link de pago **fijo** (los de Naranja X vencen a los 7 días, no sirven acá).
4. Elegí la función **`configurarInicial`** y tocá **Ejecutar** (acepta los permisos). Crea la hoja, el calendario y los disparadores automáticos.
   Si ya tenías la planilla con reservas, no se borra nada: solo agrega columnas nuevas al final.
5. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: *Yo* · Acceso: *Cualquier persona*.
6. Ese link es el que compartís. Si cambiás el código: **Implementar → Administrar implementaciones → Editar → Nueva versión** (así el link no cambia).

> Las reservas que ya tenías de antes no tienen guardado el ID del evento, así que cambiarles el Estado no mueve el calendario. Las nuevas sí.

## Links útiles

- Link con paquete o zona ya elegidos (para Instagram, historias, etc.):
  `…/exec?paquete=premium` · `…/exec?zona=vcp` · `…/exec?paquete=ultra&zona=allende`
- Bloquear un día: evento de todo el día en el calendario GLORIN con `BLOQUEADO` en el título.
- Evento cargado a mano que usa inflable/metegol: agregá en la descripción `RECURSOS: inflable=1; metegol=1`.

## Profes (convocatoria)

1. Pestaña **Profes**: un profe por fila con Nombre, WhatsApp, Email (opcional) y **Activo = Sí**.
2. En **Reservas**, pará en la fila del cumple → menú **🎈 GLORIN → 📣 Convocar profes**:
   - **Copiar texto** y pegarlo en el grupo de WhatsApp de profes, o **Abrir WhatsApp y elegir el grupo**.
   - **Mandar por mail a todos los activos**, o un botón de WhatsApp por cada profe.
3. Cada profe abre el link, toca su nombre y **Voy / No puedo**. Los primeros N (los que pide el paquete) quedan en el equipo;
   el resto, suplentes. Si alguien se baja, entra el primer suplente y te llega un mail.
4. Los profes con mail quedan invitados al evento del calendario. La dirección y el contacto de la familia solo los ven los que quedaron en el equipo.
5. Al pasar una reserva a **Señado**, se manda la convocatoria por mail sola (`convocarAlSenar` en CONFIG).
6. El resumen diario de las 8 te muestra los cumples de la semana con equipo incompleto y, el día antes, un botón de WhatsApp para recordarle a cada profe (con hora de llegada, dirección y contacto de la familia).
