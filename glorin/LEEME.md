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
- Portal de profes con cuentas, calendario, elección de equipo, recordatorios y pagos (ver abajo).
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
3. Creá otro archivo HTML llamado **`Profes`** con el contenido de `Profes.html` (el portal de profes).
4. En `CONFIG` (arriba de `Code.gs`) ya está cargado el alias `faustorizzi` (Brubank). Revisá que el **titular** sea exactamente el nombre que aparece al transferir. `linkMercadoPago` va vacío salvo que tengas un link de pago **fijo** (los de Naranja X vencen a los 7 días, no sirven acá).
5. Elegí la función **`configurarInicial`** y tocá **Ejecutar** (acepta los permisos). Crea la hoja, el calendario y los disparadores automáticos.
   Si ya tenías la planilla con reservas, no se borra nada: solo agrega columnas nuevas al final.
6. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: *Yo* · Acceso: *Cualquier persona*.
7. Ese link es el que compartís. Si cambiás el código: **Implementar → Administrar implementaciones → Editar → Nueva versión** (así el link no cambia).

> Las reservas que ya tenías de antes no tienen guardado el ID del evento, así que cambiarles el Estado no mueve el calendario. Las nuevas sí.

## Links útiles

- Link con paquete o zona ya elegidos (para Instagram, historias, etc.):
  `…/exec?paquete=premium` · `…/exec?zona=vcp` · `…/exec?paquete=ultra&zona=allende`
- Bloquear un día: evento de todo el día en el calendario GLORIN con `BLOQUEADO` en el título.
- Evento cargado a mano que usa inflable/metegol: agregá en la descripción `RECURSOS: inflable=1; metegol=1`.

## Portal de profes (cuentas, fechas, equipo, recordatorios y pagos)

Link: `…/exec?profes=1` (también lo ves en el menú **🎈 GLORIN → 🧑‍🏫 Link del portal de profes**).

**Instalación extra:** en Apps Script creá un archivo HTML llamado **`Profes`** con el contenido de `Profes.html`
(o `Profes-para-copiar.txt`), pegá el `Code.gs` nuevo, corré **`configurarInicial`** otra vez (crea la pestaña `Pagos` y las
columnas nuevas, sin borrar nada) y publicá una **nueva versión** de la implementación.

**Para los profes** (desde el celu)
- Crean su cuenta con nombre, mail, WhatsApp y contraseña. Si ya los tenías cargados en la pestaña `Profes`, usan el mismo mail y se quedan con esa fila.
- Las cuentas nuevas quedan **Pendiente** hasta que las aprobás (te llega un mail). Al aprobar, les llega un mail avisando.
- **📅 Fechas**: calendario del mes con las fechas que publicaste. Tocan **🙋 Me propongo** (o *Sacar mi propuesta*).
- **⭐ Mis cumples**: los confirmados, con dirección, contacto de la familia, hora de llegada, *Cómo llegar* y *No puedo ir* (te avisa por mail).
- **💵 Pagos**: cuánto les deben y cuánto cobraron.
- Recordatorio por mail **3 días y 1 día antes** de cada cumple en el que están (`recordatoriosProfes` en CONFIG).
- Si se olvidan la contraseña, les llega un link por mail para elegir una nueva.

**Para vos** (entrás al portal con el mail de la cuenta dueña del script, o uno de `adminEmails`)
- **➕ Nueva**: cargás una fecha a mano (cumples que entran por WhatsApp). Queda en `Reservas` y en el calendario GLORIN, y si tildás *Publicar*, les llega la convocatoria por mail a todos los profes activos.
- Las reservas que hacen los padres desde la página de reservas aparecen solas en **📅 Fechas**. Se publican para los profes cuando pasan a **Señado** (o con el botón *📣 Publicar*).
- En cada fecha ves quiénes se propusieron, tildás el equipo, ponés el **pago por profe** y tocás **Guardar equipo y avisar por mail**:
  - a los elegidos les llega la confirmación con todos los datos y quedan invitados al evento del calendario;
  - a los que se propusieron y no quedaron, que quedaron como suplentes;
  - si sacás a alguien del equipo, le llega el aviso.
- **👥 Profes**: aprobar cuentas, activar o desactivar.
- **💵 Pagos**: lo que le debés a cada profe, con botón **Pagado** (al profe le llega un mail). Todo queda en la pestaña `Pagos`.
- Si cancelás un cumple (Estado = Cancelado), al equipo le llega el aviso y sus pagos pendientes quedan *Anulado*.
- **Pagos por nivel** (`tarifasProfes` en CONFIG): Animador avanzado $50.000 · Animador intermedio $45.000 · Auxiliar $40.000.
  A cada profe le ponés el nivel en el portal (pestaña Profes). Al armar el equipo marcás con 🚚 quién pone o transporta los
  elementos: suma **$40.000 extra** (`extraElementos`). Si una fecha tiene un pago especial, ponés un *pago fijo* en esa fecha.

Los links viejos de convocatoria (`…?convocatoria=…`) siguen funcionando: abren el portal en ese cumple.
El menú **📣 Convocar profes** sigue armando el texto para el grupo de WhatsApp, con el link al portal.
