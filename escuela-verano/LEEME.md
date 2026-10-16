# Escuela de Verano · Aldea de Valle + Colonia de Güey

Una sola app web para las dos escuelas de verano. Funciona igual que GLORIN y el Marcaje: una planilla de Google con Apps Script, sin costo y dentro de tu cuenta de Google.

Tiene **tres puertas** con el mismo link:

| Quién | Link | Cómo entra |
|---|---|---|
| Familias | `…/exec` | Sin cuenta para inscribirse. Después entran con su mail y les llega un código de 6 números (no hay contraseñas). |
| Profes | `…/exec?p=profes` | Con su mail y un código. La administración los da de alta. |
| Administración | `…/exec?p=admin` | Con PIN. Cada sede tiene el suyo y hay un PIN general que ve las dos. |

## Qué hace

### Familias
- Al entrar eligen **Aldea de Valle** o **Colonia de Güey**. Hay una tabla de **“¿Qué diferencia hay?”** con horarios, pileta, comida, actividades y precios de cada sede.
- Por cada sede ven cómo funciona, los grupos por edad, la **temática de cada semana**, los precios y los descuentos.
- **Presupuesto al instante:** eligen semanas o días sueltos, mañana o jornada completa y si suman almuerzo. El precio aparece en vivo y ya incluye los descuentos por hermanos, por inscripción anticipada y por renovación.
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
- **Profes:** alta (le llega un mail con su link), sede, grupos, forma de pago (por hora, por día, por semana o fijo mensual) y liquidación del mes. También se registran pagos, se ven los turnos y se carga un marcaje a mano si alguien se olvidó.
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
   - Parado en Colonia de Güey, tocá **Usar mi ubicación**. La de Aldea ya está cargada.
8. En **Profes**, sumá a cada profe con su mail.
9. Compartí los links: el de familias en Instagram y en la web de Aldea, y el de profes en el grupo de WhatsApp.

Si cambiás el código: **Implementar → Administrar implementaciones → Editar → Nueva versión**. Así el link no cambia.

## Cosas para tener en cuenta
- **Límite de mails de Google:** con una cuenta de Gmail común se pueden mandar unos **100 mails por día** (con Google Workspace, 1.500). La app muestra cuántos quedan y no deja pasarse en un envío masivo.
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
  - descuento por inscripción anticipada (para llenar cupos antes de diciembre)
  - aviso de renovación unos días antes de que termine, con la temática de la semana siguiente como gancho
  - cupos limitados visibles
- **Lo que más complica a la administración:** cobrar saldos y saber quién se va. Por eso hay recordatorios automáticos y un resumen diario con WhatsApp listo para mandar.

## Ideas para más adelante
- Cobro online con link de Mercado Pago por inscripción (necesita credenciales de MP).
- Pasar a Firebase o Supabase si se superan unas 300 familias por temporada (Sheets se pone lento).
- Notificaciones push instalando la app como PWA.
