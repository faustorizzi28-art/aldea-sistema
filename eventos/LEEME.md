# Aldea de Valle · Eventos (cotizá, reservá y agendá una cita)

Página web para que la gente cotice su evento, vea las fechas libres y reserve con la seña del 30%
al alias **aldea.de.valle**, sin tener que escribir antes. Los eventos formales (15, casamientos),
los empresariales y las escuelas piden una **cita para conocer el lugar** con Aldea India o con Milagros.
Funciona igual que GLORIN: Google Sheets + Calendar + Gmail + WhatsApp, gratis, en tu cuenta de Google.

## Qué hace

**Para el cliente** (desde el celular, 2 o 3 minutos)
1. Elige qué festeja: cumple infantil, cumple de adultos, bautismo/comunión, baby shower, recibida/egresados,
   asado entre semana, 15 años, casamiento, empresarial o jornada escolar.
2. Dice cuántos son y ve qué sectores le entran.
3. Elige día (punto verde = hay lugar), sector, duración y hora de inicio. Solo ve lo que está libre.
4. Arma el evento: cómo quiere la bebida (pack barra, barra libre o solo espacio), pileta en verano, extras y código de descuento.
5. Deja sus datos y ve el resumen con todo desglosado.
6. **Reserva**: le aparece el alias con botón **Copiar**, el botón para **mandar el comprobante por WhatsApp**,
   el PDF del presupuesto y, si pidió animación, el botón a **GLORIN** con la fecha ya cargada.
   O **agenda la cita** (lunes a viernes desde las 18 h) y la confirma por WhatsApp.
7. En cualquier momento puede **descargar el presupuesto en PDF** sin reservar. Esto queda guardado como consulta.

Si cierra la página, al volver sigue donde estaba.

**Para ustedes**
- Cada reserva entra a la pestaña `Reservas` y al calendario **Aldea · Eventos** como `⏳ A CONFIRMAR`,
  con la línea `SECTOR:`, para que entren varios eventos el mismo día en sectores distintos.
- Cada cita entra a la pestaña `Citas` y al calendario **Aldea · Citas**. Si es de Aldea India y cargaste `emailIndia`, les llega a ellas.
- Cada PDF descargado sin reservar queda en `Consultas`, con un botón de WhatsApp para hacer el seguimiento.
- Te llega un mail por cada reserva o cita, con el botón para escribirle por WhatsApp con el mensaje ya armado.
- Cambiás el **Estado** en la planilla y se actualiza todo solo:
  - `Señado` → `✅ CONFIRMADO` en el calendario y mail de confirmación al cliente.
  - `Cancelado` → el sector vuelve a quedar libre en la página.
  - `Realizado` → `🎉 REALIZADO`.
- Menú **🏡 Aldea Eventos** en la planilla: WhatsApp al cliente con mensajes listos (reserva + datos de pago,
  reclamar seña, confirmar, recordatorio del día antes, gracias + reseña), **Reprogramar** (chequea que la nueva fecha esté libre y mueve el evento) y Cancelar.
- Todos los días a las 8 te llega un mail con los eventos de mañana, las citas de mañana y las reservas que siguen sin seña después de 48 hs.

> El "panel" es la planilla misma: `Reservas`, `Citas` y `Consultas` reemplazan a las pestañas
> CONFIRMADOS y CONTACTOS que se llevaban a mano.

## Precios (pestaña `Precios`, se cambian sin tocar código)

| Qué | Precio base |
|---|---|
| Cumple infantil (sector + 6 gaseosas + encargado + limpieza, 2 h 30) | $380.000 hasta 30 chicos |
| Chico extra | $9.000 |
| Alquiler del espacio (mismo precio en cualquier sector, según la cantidad de personas) | hasta 30: $380.000 · 31-50: $480.000 · 51-80: $650.000 · 81-100: $800.000 · 101-150: $1.000.000 |
| **Pack barra** (recomendado para adultos) | espacio $200.000 + crédito de barra de $10.000 por persona (mínimo $300.000). Barman incluido |
| Barra libre | espacio $200.000 + $12.000 por persona. Barman incluido |
| Asado de lunes a jueves | espacio sin cargo, se consume en la cantina |
| Descuento de lunes a jueves | 15% del espacio (cumples y celebraciones) |
| Hora extra | $45.000 (se cobra de a media hora) |
| Predio completo exclusivo | + $500.000 |
| Pileta + guardavidas (diciembre a marzo) | $120.000 |
| Seguridad · barman · parrillero | $90.000 c/u |
| Fogonero · cuidacoches | $70.000 c/u |
| Limpieza durante el evento | $50.000 |
| Chulengo / estufa | $60.000 |
| Panchos · empanadas · pizza | $3.000 · $3.000 · $17.000 |
| Jornada escolar (lunes, miércoles y viernes de 8 a 17 h) | $16.000 por alumno con almuerzo · $20.000 con merienda (mínimo 40) |
| 15 y casamientos (parte de Aldea) | espacio por cantidad + 1 seguridad cada 60 personas + limpieza durante el evento. Catering, DJ y ambientación los cotiza Aldea India |

- **Inflación**: en `Precios`, cambiá `ajusteInflacion` (por ejemplo `8`) y todos los montos suben 8%, redondeados a miles.
- **Códigos para conocidos**: en la pestaña `Códigos`. Viene cargado `AMIGOSDEALDEA`: 20% sobre el espacio y nunca baja de $300.000.
  Podés crear uno por persona o desactivarlo con `Activo = No`.
- La seña es siempre el 30% del total y vence a las 48 hs (`porcentajeSena` y `horasParaSenar` en `CONFIG`).

## Reglamento

Está en `CONFIG.reglamento` de `Code.gs`, dividido en secciones: reserva y pagos, reprogramación, horarios, personas,
**bebidas y crédito de barra** (se consume en el horario del evento y lo que sobra no se devuelve), qué incluye el espacio
(vajilla, manteles y mobiliario), cuidado del predio, chicos y pileta, seguridad y fotos.
- Se ve en la web (sección al pie y en el paso final) y va completo en cada PDF.
- Para reservar hay que tildar que se acepta. La columna **Reglamento** de la planilla guarda cuándo lo aceptaron.
- Para cambiar un punto, editá el texto en `CONFIG.reglamento` y publicá una nueva versión.

## Sectores y capacidad (en `CONFIG` de `Code.gs`)

| Sector | Entran | Para |
|---|---|---|
| Quincho + cancha sintética | 40 | cumples infantiles, adultos, asados |
| Patio de piedra + parque + cancha de 11 | 80 | cumples (2.º infantil del día), adultos, sunset |
| Salón cerrado | 100 | fiestas de noche, 15, casamientos |
| Deck | 40 | reuniones chicas |
| Predio completo exclusivo | 400 | 15, casamientos, empresas, escuelas |

- El salón está bloqueado de **lunes a viernes de 17 a 23 h** por las clases (`bloqueosFijos`). Si un viernes
  quieren venderlo, se puede sacar el viernes de esa lista.
- Entre dos eventos del mismo sector se deja **1 hora** para limpiar y armar (`bufferMin`).
- Ningún evento termina después de las **2 a.m.** (`finMaximo`).

## Instalación (una sola vez)

1. Creá una planilla nueva de Google Sheets (por ejemplo "Aldea · Eventos online") con la cuenta de Aldea.
2. **Extensiones → Apps Script**. Pegá `Code-para-copiar.txt` en `Code.gs` y creá un archivo HTML llamado
   **`Index`** con el contenido de `Index-para-copiar.txt`.
3. En **Configuración del proyecto** (el engranaje), poné la zona horaria **(GMT-03:00) Córdoba / Buenos Aires**.
4. En `CONFIG`, revisá:
   - `pago.titular`: ya está cargado *Fausto Agustino Rizzi Szkolka*. Revisá que coincida con lo que ve la gente al transferir a `aldea.de.valle`.
   - `emailAviso` (vacío = te llega a la cuenta dueña) y `emailIndia` (mail de Luli/Nati para sus citas).
   - `whatsapp`: el de Milagros (`5493515308489`), que recibe consultas y comprobantes.
5. Elegí la función **`configurarInicial`** y tocá **Ejecutar** (aceptá los permisos). Crea las pestañas,
   los dos calendarios y los avisos automáticos.
6. **Implementar → Nueva implementación → Aplicación web** · Ejecutar como: *Yo* · Acceso: *Cualquier persona*.
7. Copiá el link que termina en `/exec` y pegalo en `CONFIG.urlWeb` (para los mails). Si cambiás el código:
   **Implementar → Administrar implementaciones → Editar → Nueva versión**, así el link no cambia.
8. Compartí los calendarios **Aldea · Eventos** y **Aldea · Citas** con Milagros, Luli y Nati, para que los vean en el celular.

### Eventos que ya están confirmados (planilla de Milagros)

No hace falta cargarlos de nuevo: la página lee sola la pestaña **CONFIRMADOS** de la planilla
"EVENTOS CONFIRMADOS" (`CONFIG.planillaConfirmados`) y bloquea esas fechas, horarios y sectores.
Milagros sigue anotando como siempre:
- Una fila de mes (JULIO, AGOSTO… o `ENERO 2027`) y debajo la fila de títulos FECHA · NOMBRE · … · HORA · MOTIVO · OBSERVACIONES · CERRADO.
- **FECHA**: alcanza con el día ("SABADO 15", "viernes 2/10", "04/12/26").
- **HORA**: "16 a 18:30", "19 a 2am", "sunset", "mediodía". Sin hora, bloquea el día entero.
- **Sector**: se lee de OBSERVACIONES/MOTIVO. "salon", "patio", "cancha de 11", "quincho", "cancha", "parrilla", "deck" o
  "todo el predio" / "uso exclusivo". Si no dice nada, un cumple infantil ocupa el quincho y cualquier otro evento ocupa todo el predio.
- Si en CERRADO u OBSERVACIONES dice **REPROGRAMA** o **CANCELADO**, esa fila no bloquea nada.
- Los cambios se ven en la página en hasta 5 minutos. Al reservar se vuelve a chequear al instante.

La cuenta que instala el Apps Script tiene que poder abrir esa planilla (hoy es de Milagros y está compartida con Fausto).

Para bloquear un día o un sector a mano: evento de todo el día en el calendario **Aldea · Eventos** con `BLOQUEADO`
en el título (o `BLOQUEADO salon` para un solo sector).

### Publicarla con un link lindo (opcional)

El link de Apps Script es largo. Para Instagram conviene publicar `Index.html` en GitHub Pages, como GLORIN:
poné el link `/exec` en `API_URL` dentro de `Index.html` y la página habla con la planilla por internet.
Con un dominio propio (por ejemplo `aldeadevalle.com.ar`, se registra en nic.ar) se apunta a esa página.

## Fotos

Las fotos de eventos reales están en `img/ev-*.jpg`, optimizadas para que carguen rápido en el celular. En `CONFIG` se elige:
`fotoPortada`, la `foto` de cada sector, `fotoIndia` (bloque de Aldea India) y `galeria` (sección "Así se vive la Aldea").
Para sumar una foto: guardala en `img/` y agregala a `galeria` con su texto.
La versión de Apps Script las toma de `main` en GitHub (`urlFotos`), así que se ven ahí una vez que esta rama esté mergeada.

## Links útiles

- Con el tipo ya elegido (para historias, bio, botones): `…/exec?tipo=infantil`, `?tipo=adultos`, `?tipo=quince`, `?tipo=boda`, `?tipo=asado`, `?tipo=empresa`, `?tipo=escuela`
- Directo a pedir una cita: `…/exec?cita=1`
- Demo sin guardar nada: abrí `Index.html` en el navegador (o agregale `?demo` al link). En la demo, el código de descuento es `DEMO`.

## Si cambiás algo del código

`Code.gs` e `Index.html` tienen la misma función `cotizar()`, así la página y el servidor cobran exactamente igual.
Si la cambiás, editala en `Code.gs` y corré:

```
node eventos/herramientas/sincronizar.js
```

Eso copia la función y la configuración a `Index.html`, regenera las dos copias `-para-copiar.txt` y prueba
unas cotizaciones conocidas (por ejemplo, un cumple infantil de 30 chicos un sábado tiene que dar $380.000).
