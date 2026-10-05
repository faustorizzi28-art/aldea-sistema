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
3. En `CONFIG` (arriba de `Code.gs`) completá **`pago.alias`**, `pago.cbu`, `pago.titular` y, si tenés, `pago.linkMercadoPago`.
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
