# Escuela de Verano · Aldea de Valle + Colonia Dewey

Una sola app web para las dos escuelas de verano. Funciona igual que GLORIN y el Marcaje: una planilla de Google con Apps Script, sin costo y dentro de tu cuenta de Google.

Tiene **tres puertas** con el mismo link:

| Quién | Link | Cómo entra |
|---|---|---|
| Familias | `…/exec` | Sin cuenta para inscribirse. Después entran con su mail y les llega un código de 6 números (no hay contraseñas). |
| Equipo (profes, auxiliares de área, guardavidas, coordinación, administración) | `…/exec?p=profes` | Con su mail y un código. La administración los da de alta con su rol. |
| Administración | `…/exec?p=admin` | Con PIN. Cada sede tiene el suyo y hay un PIN general que ve las dos. |

## Cómo se entra (definido por Fausto, 1/11/2026)
1. **¿De qué escuela de verano sos?** La primera pantalla muestra las dos sedes con su logo: **Aldea de Valle** o **Colonia Dewey**. La app recuerda la elección: la próxima vez entra directo a esa sede, con un botón para cambiarla.
2. **¿Quién sos?** Dentro de cada sede, con su logo y sus colores:
   - **Mamá, papá o tutor:** inscribir, mi cuenta (fotos, asistencia, avisos), pagar e información y precios.
   - **Equipo:** profes, auxiliares de área, coordinación y guardavidas.
   - **Administración.**
3. Arriba de todo, un botón grande: **Inscribí a tu hijo**.

**Links directos** (están para copiar en Administración → Ajustes):

| Para | Link |
|---|---|
| Entrada general (elegir la escuela) | `…/exec` |
| Entrada de una sede | `…/exec?sede=aldea` · `…/exec?sede=colonia` |
| **Inscripción directa** (Instagram, WhatsApp, flyers) | `…/exec?p=inscribir&sede=aldea` · `…/exec?p=inscribir&sede=colonia` |
| Pagos de las familias | `…/exec?p=pagar` |

### Pagos
- Al inscribirse, la familia recibe **un link de pago** en pantalla y por mail. Lo abre sin usuario ni contraseña y elige pagar la **seña** o **todo el saldo**.
- **Mercado Pago**, si la sede lo conectó: tarjeta de débito, crédito o dinero en cuenta. El pago **se registra solo** (Mercado Pago le avisa a la app) y a la familia le llega el mail de "recibimos tu pago". Cada sede conecta su propia cuenta en **Administración → Ajustes**, pegando el *Access Token de producción* (Mercado Pago → Tu negocio → Configuración → Credenciales). El token no queda en el código. Si querés trasladar la comisión de Mercado Pago, cambiá `mercadoPagoRecargoPct` en `CONFIG`.
- **Transferencia:** la familia ve el alias de la sede (o un botón para pedirlo por WhatsApp mientras no esté cargado) y **sube el comprobante** (foto o PDF).
  - A la administración le llega un aviso. En **Cobros → Comprobantes para revisar** lo abre, lo **aprueba** y el pago queda registrado y la familia avisada. También lo puede **rechazar**.
  - Los comprobantes se guardan en Drive, en `Escuela de Verano — Comprobantes / <sede>`.
- Los recordatorios de deuda también traen el botón **Pagar ahora**.

### Efectivo y transferencia
- **Hasta el 13/12 se cobra solo por transferencia, sin recargo.** Hasta esa fecha, la app no ofrece efectivo en la web, en los mails ni en los mensajes de WhatsApp. Al registrar un pago, la opción por defecto es **Transferencia**.
- **Desde el 14/12 se suma el efectivo** en la sede. Desde ese día rige el recargo por transferencia que esté en Ajustes. La fecha se cambia en `CONFIG.efectivoDesde`.
- La mayoría de los pagos van a ser en **efectivo**, que es el precio más barato. **Los precios cargados en `CONFIG` son los de efectivo.**
- **Transferencia y Mercado Pago** pagan un **% más**: 10% de ejemplo, a confirmar. Lo cambia la administración general en **Ajustes → Recargo por transferencia**. Si querés, `mercadoPagoRecargoPct` suma un extra solo para Mercado Pago.
- La familia ve los dos precios en todos lados: presupuesto, inscripción, mails y pagos. Ejemplo: *$100.000 en efectivo · $110.000 por transferencia*.
- El saldo se lleva **en pesos de efectivo**:
  - Al registrar un pago, la administración pone la plata que entró, con **Efectivo** como opción por defecto.
  - Si fue por transferencia o Mercado Pago, la app descuenta sola el recargo. Por ejemplo, $110.000 transferidos cubren $100.000 del saldo.
- En la planilla, la hoja `Pagos` guarda lo que entró (`monto`) y lo que cubrió del saldo (`acredita`).

### Eventos que se cobran aparte
- **Administración → Eventos**: campamento, festejo con las familias, cierre de temporada o cualquier otro, con botones para arrancar cada uno ya armado.
- Cada evento tiene:
  - fecha, horario, lugar y descripción
  - **precio por chico** en efectivo
  - si pueden venir **adultos** y cuánto pagan
  - **cupo** y para qué **grupos** es
  - hasta cuándo se anotan
  - estado: abierto, cerrado o cancelado
- Con **Avisar a las familias** les llega un mail con el evento y el botón para anotarse. Va solo a las familias de esos grupos.
- Las familias se anotan desde **Mi cuenta → 🎉 Eventos** y pagan aparte: en efectivo en la sede, por transferencia (con comprobante) o con Mercado Pago. El evento se paga entero, sin seña.
- La administración ve en cada evento los chicos y adultos anotados, lo cobrado y lo que falta, con botones de **Pago** y **WhatsApp**. Las deudas de eventos también aparecen en **Cobros**.
- Los eventos no cuentan para los cupos por grupo, la asistencia diaria ni los avisos de renovación.

### Fotos: un Drive para cada escuela
- Cada sede tiene su carpeta de Drive (`Fotos <sede> — Escuela de Verano`) con dos partes:
  - **Material del equipo / <día>**: todo lo que suben los profes. Es privado y sirve como material para redes.
  - **Para las familias / <día>**: solo lo aprobado por la coordinación, compartido por link.
- Cuando la coordinación aprueba una foto o video, el archivo pasa solo a la carpeta del día de las familias. Si después se oculta, vuelve a la del equipo.
- En **Mi cuenta → Fotos**, cada día tiene el botón **📁 Todas las fotos del día en Drive** para verlas y descargarlas.
- **A las 19 h** les llega a las familias de los chicos que fueron ese día un mail con el link a las fotos de hoy. Se apaga con `mailFotosDelDia: false`.
- Si una escuela quiere usar **su propio Drive**:
  1. Crea una carpeta y la comparte como **Editor** con la cuenta de la planilla.
  2. En **Ajustes → Drive de fotos**, pega el link.
- Si ya tenías la app instalada, volvé a correr `configurarInicial` una vez para que quede programado el mail de las 19 h.

### Logos y tipografía
- **Aldea de Valle:** el logo de la web de Aldea.
- **Colonia Dewey:** ya está cargado, en sus dos versiones (en `logos/`): en color sobre fondo claro (la tarjeta para elegir escuela) y en blanco sobre las barras de la sede. La sede usa los colores del logo, rojo y celeste. Si algún día cambia, cada administración sube el nuevo desde **Administración → Ajustes → Logo**.
- **GLORIN Animaciones:** aparece al pie, con link a las reservas de cumpleaños.
- **Tipografía:** Lilita One en los títulos y Archivo en el texto, como el folleto. Se cambia en dos variables al principio de `Index.html` (`--f-titulo` y `--f-texto`).

## Qué hace

### Familias
- Al entrar eligen **Aldea de Valle** o **Colonia Dewey**. 
- Por cada sede ven cómo funciona, los grupos por edad, la **temática de cada semana**, los precios y los descuentos.
- **Presupuesto al instante:** eligen semanas o días sueltos, mañana o jornada completa, pre hora y almuerzo. El precio aparece en vivo según la etapa (preventa, segunda etapa u oficial) y ya incluye los descuentos por hermanos y por renovación.
- **Inscripción en 4 pasos:** cuándo, quién (con ficha de salud: alergias, medicación, si sabe nadar y si autoriza fotos), datos del adulto (contacto de emergencia y quiénes pueden retirar) y reglamento. Si cierran la página, al volver sigue lo que habían cargado.
- Al terminar ven los datos para la seña (con botón para copiar el alias y para mandar el comprobante por WhatsApp) y les llega un mail con todo.
- **Mi cuenta:**
  - cuántos días le quedan a cada hijo
  - el saldo
  - las fotos y novedades del día
  - si llegó y quién lo retiró
  - el cronograma y la temática de la semana
  - editar la ficha de salud
  - **renovar** o sumar días en un minuto
- Formulario para “quiero recibir novedades”, para las familias que todavía no se deciden.

### Datos de la temporada 2026-27 (folleto "Escuela de Verano ALDEA", 2/11/2026)
- **Fechas:** del lunes 14/12 al viernes 19/2: 10 semanas, de lunes a viernes. No hay escuela el 25/12, el 1/1 ni en Carnaval (8 y 9/2).
- **Edades:** de 3 a 13 años, en grupos por edad, cada uno con sus profes. Hasta 30 chicos por grupo; si un grupo se llena, la inscripción entra igual y se abre otro.
- **Campamento:** la semana del 11 al 15 de enero (semana 5), en las dos sedes.
- **Aldea de Valle × GLORIN Animaciones.** Todos los días: natación y pileta, karate, patín, gimnasia, fútbol, arte, música y naturaleza. **Viernes: día temático con show de GLORIN.**
- **Horarios:** Mañana de 9 a 13 h · Tarde de 13:30 a 17 h · Completa de 9 a 17 h.
- **Opcionales:**
  - Pre-hora (8 a 9 h): desde $30.000 por semana.
  - Post-hora (13 a 14 h, solo turno mañana): desde $30.000 por semana.
  - Almuerzo: $10.000 por día, solo jornada completa.
- **Valores de preventa por chico** (hasta el 15/11, en efectivo o transferencia):

| | Semana | Quincena | Temporada (10 semanas) |
|---|---|---|---|
| Mañana | $89.000 | $170.000 | $714.000 |
| Tarde | $80.000 | $153.000 | $643.000 |
| Completa | $161.000 | $305.000 | $1.285.000 |

  - Las semanas que no son quincena se arman como quincenas + semana, y nunca superan el valor de la temporada.
  - **Inscripción:** $35.000 en preventa; desde el 16/11 pasa a $50.000. Se cobra una vez por chico en la temporada.
  - **Hermanos:** 20% al 2.º y 30% del 3.º en adelante. Según el reglamento se aplica **solo sobre la cuota**: no sobre la inscripción, los opcionales ni los eventos, y no se suma a otras promociones (vale la mejor).
  - **Cómo reservar:**
    1. Completar el formulario.
    2. Pagar la inscripción y la seña del 50% antes del 15/11.
    3. Pagar el saldo antes de empezar.
  - **La seña congela el precio.** Si al 16/11 una inscripción de preventa no tiene la seña, pasa sola al precio regular (con la inscripción a $50.000) y le llega un mail a la familia. Las semanas que se suman después se pagan al valor vigente.
  - ⚠️ **Precio regular desde el 16/11:** el folleto solo dice que "los valores aumentan". Cargué la preventa sin el 15% (Mañana $105.000 / $200.000 / $840.000; Tarde $94.000 / $180.000 / $756.000; Completa $189.000 / $359.000 / $1.512.000). Hay que confirmarlo.
  - ⚠️ **Días sueltos:** el folleto no los tiene. Quedaron a $27.000 (Mañana), $24.000 (Tarde) y $48.000 (Completa) de preventa, a confirmar.
  - ⚠️ **Colonia Dewey:** usa los mismos valores hasta que pasen los suyos.
- **Efectivo y transferencia:** en preventa valen lo mismo, como dice el folleto. Desde el 16/11, transferencia y Mercado Pago pagan el recargo que se ponga en Ajustes.
- **Estética:** la de la campaña. Azul pileta, azul marino, tarjetas blancas con borde marino y los colores de "VERANO". Títulos en **Lilita One** y texto en **Archivo**.

### Contacto: todo pasa por la administración
- Aldea de Valle: **+54 9 3515 30-8489** · Colonia Dewey: **+54 9 3512 79-9950** (WhatsApp).
- La tarjeta **"¿Dudas o consultas?"** con el número de la sede está en la entrada, en la página de la sede y en Mi cuenta. El botón 💬 flotante también va a la administración.
- Todos los mails terminan con el WhatsApp de la administración de esa sede.
- Los números se cambian en `CONFIG.sedes.<sede>.whatsapp` (solo dígitos) y `telefono` (como se muestra).

### Reglamento e Info Familias (aplicados en la app)
- **Reglamento a la vista:** en la página de cada sede hay un botón **📋 Reglamento** con las 9 secciones del PDF. Antes de inscribir hay que aceptarlo. El texto está en `CONFIG.reglamento` (Code.gs), por si cambia algo.
- **Chicos de 3 años:** el formulario pide confirmar el **control de esfínteres**. Sin eso, la inscripción no avanza.
- **Apto físico:** ningún chico empieza sin el apto.
  - La familia lo sube desde **Mi cuenta** (foto o PDF). Se guarda en Drive, en "Escuela de Verano — Aptos físicos/<sede>", y a la administración le llega un mail.
  - En **Administración → Inicio** aparece la tarjeta **🩺 Sin apto físico**, con los chicos que empiezan en los próximos 7 días. Cada uno tiene el botón **Entregado** y otro de WhatsApp. El apto también se puede marcar desde la ficha del chico, si lo traen en papel.
  - El aviso de las 8 h le manda un recordatorio a la familia cada 3 días mientras falte.
- **Salida temprana:** el 24 y el 31/12 la salida es a las 14 h. Se ve al elegir el plan y en el reglamento. Se cambia en `CONFIG.salidaTemprana`.
- **Retiro fuera de horario:** si en la asistencia se anota un retiro más de **15 minutos** después de la salida del chico, se genera solo un cargo de **post-hora del día** ($6.000, a confirmar). Se carga una sola vez por chico y por día.
  - La salida es 13 h para Mañana, 14 h si contrató post-hora, 17 h para Tarde y Completa, y 14 h los días de salida temprana.
  - El cargo aparece en Cobros como "⏰ Post-hora por retiro fuera de horario", y la familia lo ve para pagar.
  - Se apaga con `CONFIG.cobrarRetiroTarde: false`. La tolerancia se cambia en `toleranciaRetiroMin`.

### Roles del equipo
Cada persona se carga una vez en **Administración → Equipo** con su mail, sede y **rol**. Cuando entra a la app, ve solo lo que le corresponde:

| Rol | Qué ve y qué hace |
|---|---|
| 🧑‍🏫 **Profe** | Marca entrada y salida, toma asistencia **solo de sus grupos**, sube fotos (quedan pendientes hasta que las aprueba el coordinador), ve el cronograma y sus horas. |
| 🙋 **Auxiliar de área** | Igual que el profe: asistencia de sus grupos y fotos (obligatorias para cerrar el turno). Cobra por quincena. |
| 🛟 **Guardavidas** | Marca entrada y salida y ve la **lista de pileta** del día, por grupo: quién no sabe nadar, quién nada un poco y quién no tiene el dato cargado. |
| 📋 **Coordinador/a** | Todo lo del profe, pero con **todos los grupos**. Además ve el **equipo de hoy** (quién marcó, quién no, quién llegó tarde) y arma los **turnos** de cada uno. Corrige marcajes olvidados, **aprueba las fotos** antes de que las vean las familias, arma el cronograma y las temáticas y ve salud y pileta. **No ve la plata.** |
| 🗂️ **Administración** | Todo lo del coordinador y además el panel de administración de su sede (cobros, deudas, pagos al equipo). Entra con su mail, sin PIN. Solo la administración general puede dar este rol. |
| 👑 **Dueño** | El PIN general: ve y maneja las dos sedes. |

### Turnos y control del equipo
- El coordinador (o la administración) carga el **horario habitual** de cada persona: días, desde, hasta y tarea. Por ejemplo: lunes a viernes de 9 a 13, grupo Aventureros.
- Cada persona ve “**Tu turno hoy**” al abrir la app.
- En **Equipo de hoy** se ve quién está adentro, quién **no marcó** (pasados 10 minutos del inicio del turno), quién entra más tarde y quién ya salió. Si alguien llegó tarde, aparece marcado.
- Hay un botón de WhatsApp para escribirle a quien no marcó y otro para **marcar a mano**, que deja registrado quién lo cargó.
- Las horas de los marcajes se usan para la liquidación de pagos al equipo.

### Asistencia vinculada a la inscripción
- La lista de cada día sale **sola de las inscripciones** que hacen los padres en la web: solo aparecen los chicos que tienen ese día pago o reservado, en su grupo.
- Los **padres avisan** desde su cuenta: 🏠 no va, ⏰ llega tarde (con hora), 🚪 se va temprano o 👤 lo retira otra persona (con nombre y DNI). Lo pueden hacer para hoy o cualquier día que tengan inscripto.
- El profe ve el aviso en la lista y **confirma**:
  - Al que llega le toca P y queda la hora.
  - A los que avisaron que no vienen los marca ausentes con un toque.
  - Los que **faltan llegar sin aviso** aparecen aparte, con un botón de WhatsApp para preguntarle a la familia.
- La familia ve en su cuenta si su hijo llegó, a qué hora y quién lo retiró.

### Profes (desde el celular)
- **Marcan entrada y salida con GPS.** La app detecta en qué sede están y no deja marcar si están a más de 150 m.
- **Asistencia:** lista de los chicos que tienen inscripto ese día, por grupo. Tienen botones P, T y A (presente, tarde y ausente) y uno para marcar a todos presentes. Al lado de cada nombre aparecen avisos de alergia, medicación, “no sabe nadar”, “sin fotos” y “debe plata”. Tocando el nombre ven la ficha completa con el contacto de emergencia.
- **Retiro:** registran quién retiró a cada chico, eligiendo de la lista de autorizados. Si es otra persona, la app avisa.
- **Subir fotos y novedades** por grupo. Antes de publicar, la app les muestra qué chicos **no pueden salir en fotos**. Las fotos se achican solas y se guardan en Drive.
- Cronograma de esta semana y la que viene.
- **Mis horas:** horas y días trabajados en el mes, cuánto les toca cobrar y cuánto cobraron.

### Administración
- **Inicio:**
  - chicos inscriptos, facturado, cobrado y por cobrar
  - presentes de hoy
  - ocupación de cada grupo contra el cupo
  - profes que están adentro
  - a quién se le termina y no renovó
  - quién debe
  - Cada alerta tiene botones de **WhatsApp con el mensaje ya escrito** y de **mail**.
- **Inscriptos:**
  - buscar y filtrar
  - ver la ficha completa
  - cambiar de grupo
  - corregir el precio
  - cancelar, que libera el cupo
  - exportar a CSV
- **Cobros:** registrar pagos (opcionalmente le llega a la familia el mail de “recibimos tu pago”), ver las deudas y los últimos pagos por medio de pago.
- **Equipo:**
  - el **equipo de hoy** y los turnos (lo mismo que ve el coordinador)
  - alta de cada persona con su **rol** (le llega un mail con su link), sede y grupos
  - forma de pago (por hora, por día, por semana o fijo mensual) y liquidación del mes
  - registro de pagos y marcajes a mano
- **Contenido:** temáticas de cada semana, cronograma semanal (con botón para copiar una semana a la siguiente) y ocultar fotos.
- **Mails:** mail masivo a familias activas, a todas, a las que deben o a los interesados, filtrando por grupo. Trae plantillas listas: inscripciones abiertas, qué traer, últimos cupos y lluvia.
- **Ajustes:** ubicación de cada sede (parate en el lugar y tocá **“Usar mi ubicación”**), PIN, mails de aviso y links para compartir.

Cada administración entra con su PIN y **solo ve y toca lo de su sede**. El PIN general ve todo y puede filtrar.

### Avisos automáticos
- **Todos los días a las 8:**
  - A la familia que **le quedan 2 días** y no renovó le llega un mail para renovar con descuento y con la temática que viene. Se manda una sola vez.
  - A quien **debe** y ya empezó, o empieza en 3 días, le llega un recordatorio cada 3 días.
  - A cada administración le llega un **resumen** de quién termina, quién debe y quién se inscribió hace más de 48 h sin seña, con botones de WhatsApp.
- **Domingos a las 18:** a las familias que tienen días la semana siguiente les llega la **temática y el cronograma**.
- **Con cada inscripción:** le llega un mail a la familia y un aviso a la administración de esa sede, con botón para escribirle por WhatsApp.

## Instalación (una sola vez, unos 10 minutos)

1. Creá una planilla nueva en Google Sheets, por ejemplo “Escuela de Verano 2026-27”, y entrá a **Extensiones → Apps Script**.
2. Pegá `Code.gs` en el archivo `Code.gs`. Después creá un archivo HTML llamado **`Index`** (sin .html) y pegá ahí `Index.html`.
3. En **Configuración del proyecto ⚙️**, tildá “Mostrar el archivo de manifiesto appsscript.json” y reemplazá su contenido por el de `appsscript.json`. Así queda la hora de Argentina.
4. Arriba de `Code.gs`, en `CONFIG`, poné **tus precios, fechas, feriados, dirección y WhatsApp de cada sede**. Los que vienen cargados son de ejemplo.
5. Elegí la función **`configurarInicial`** y tocá **Ejecutar**, aceptando los permisos. Eso crea todas las hojas, carga temáticas de ejemplo y deja programados los avisos de las 8 y del domingo.
6. **Implementar → Nueva implementación → Aplicación web.** Ejecutar como: *Yo*. Acceso: *Cualquier persona*.
7. Abrí `…/exec?p=admin` con el PIN general **2026**. En **Ajustes**:
   - Cambiá los PIN. Los de cada sede también están en la hoja `Config`.
   - Poné el mail de cada administración.
   - Parado en Colonia Dewey, tocá **Usar mi ubicación**. La de Aldea ya está cargada.
8. En **Ajustes**, subí el logo de Colonia Dewey y conectá Mercado Pago en cada sede (si lo van a usar). En **Equipo**, sumá a cada persona con su mail y su rol. Después, el coordinador carga los turnos.
9. Compartí los links: el de **inscripción directa** de cada sede en Instagram y en la web de Aldea, y el del equipo en el grupo de WhatsApp.

Si cambiás el código: **Implementar → Administrar implementaciones → Editar → Nueva versión**. Así el link no cambia.

## Cosas para tener en cuenta
- **Videos:** la subida en partes necesita que la app pueda conectarse con Drive. La primera vez, Google pide un permiso más (“conectarse a un servicio externo”): aceptalo.
- **Límite de mails de Google:** con una cuenta de Gmail común se pueden mandar unos **100 mails por día** (con Google Workspace, 1.500). La app muestra cuántos quedan y no deja pasarse en un envío masivo.
- **Aprobación de fotos:** está activada (`aprobarFotos: true`). Si preferís que las fotos de los profes salgan directo, cambialo a `false` en `CONFIG`.
- Las **fotos** se guardan en Drive, en la carpeta “Escuela de Verano — Fotos”, y quedan visibles solo para quien tenga el link. Los chicos sin autorización de fotos aparecen marcados con 📵 para los profes.
- **Precios:** los días sueltos nunca cuestan más que la semana completa. Si una semana tiene feriado, se cobra igual que una semana normal. Si preferís otra regla, se cambia en `cotizarPuro_`.
- La **edad** que define el grupo se cuenta a la fecha de inicio de la temporada. La administración puede mover a un chico de grupo.
- Todo queda en la planilla, con una columna `sede` en cada hoja. Se puede filtrar, hacer tablas dinámicas o ver quién es de cada sede directo desde Sheets.
- Menú **☀️ Escuela de Verano** en la planilla: ver los links, correr el aviso diario a mano y recalcular saldos.

## Lo que investigué (octubre 2026)
- **Precios de referencia:** las escuelas de verano de la provincia de Córdoba (Agencia Córdoba Deportes) cobraron en 2023-24 alrededor de $750 por día y $7.500 por mes. Son muy subsidiadas y tienen un público distinto. En la temporada 2024-25 fueron del 16 de diciembre al 14 de febrero, en dos ciclos, con grupos de 4 a 14 años. Las colonias de clubes privados en otras provincias arrancaron en 2025-26 desde unos $255.000 por chico. No encontré precios 2026-27 de Córdoba: **conviene relevar 3 o 4 colonias de clubes de la zona** (Villa Allende, Mendiolaza, Valle Escondido) antes de fijar los tuyos.
- **Qué piden las familias** (apps como “Mi Jardín” y los sistemas de campamentos de EE. UU.: CampMinder, UltraCamp): fotos del día, asistencia, avisos y ficha médica en un solo lugar, y saber quién retiró al chico. Por eso la app tiene ficha de salud obligatoria, autorizados a retirar, permiso de fotos y fotos por grupo.
- **Lo que más vende:**
  - descuento por hermanos
  - precio de preventa (para llenar cupos antes de diciembre)
  - aviso de renovación unos días antes de que termine, con la temática de la semana siguiente como gancho
  - cupos limitados visibles
- **Lo que más complica a la administración:** cobrar saldos y saber quién se va. Por eso hay recordatorios automáticos y un resumen diario con WhatsApp listo para mandar.

## Ideas para más adelante
- Cobro online con link de Mercado Pago por inscripción (necesita credenciales de MP).
- Pasar a Firebase o Supabase si se superan unas 300 familias por temporada (Sheets se pone lento).
- Notificaciones push instalando la app como PWA.
