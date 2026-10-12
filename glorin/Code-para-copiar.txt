/**
 * GLORIN Animaciones — Sistema de reservas (v2)
 * ------------------------------------------------------------
 * Página pública donde la familia elige fecha y horario libres,
 * arma el paquete con extras, ve el presupuesto al instante y
 * reserva. Cada reserva:
 *   1) se guarda en la pestaña "Reservas" de esta planilla
 *   2) se agenda en el calendario "GLORIN" como "⏳ A CONFIRMAR"
 *      (y, si la familia dejó su mail, le llega la invitación)
 *   3) te llega un mail de aviso con el botón para escribirle por WhatsApp
 *   4) la familia recibe un mail con el resumen y los datos para la seña,
 *      y en pantalla un botón para mandarte el comprobante por WhatsApp
 *
 * Desde la planilla (menú "🎈 GLORIN" o cambiando la columna Estado):
 *   · "Señado"     → el evento pasa a ✅ CONFIRMADO y se avisa a la familia
 *   · "Cancelado"  → el evento pasa a ❌ CANCELADO y se libera el horario
 *   · "Realizado"  → el evento pasa a 🎉 REALIZADO
 *
 * Todos los días (8 hs) te llega un resumen con:
 *   · los cumples de mañana, con botón de WhatsApp para recordarle a cada familia
 *   · las reservas que siguen sin seña, con botón para reclamarla
 *
 * Portal de profes (…/exec?profes=1): cada profe crea su cuenta, ve las
 * fechas publicadas en un calendario y se propone. Vos elegís el equipo,
 * les llega la confirmación por mail, recordatorios antes del cumple y
 * llevás lo que se le paga a cada uno (pestaña "Pagos").
 *
 * Bloquear un día entero: evento de todo el día en el calendario
 * GLORIN con la palabra BLOQUEADO en el título.
 *
 * Stock de inflable y metegoles: cada evento lleva en su descripción
 * una línea "RECURSOS: inflable=1; metegol=2". Si cargás un evento a
 * mano que usa inflable o metegoles, escribí esa línea en la
 * descripción para que la página no los ofrezca en ese horario.
 * ------------------------------------------------------------
 */

// ======== CONFIGURACIÓN (editá acá precios y reglas) ========
const CONFIG = {
  marca: 'GLORIN Animaciones',
  nombreCalendario: 'GLORIN',
  whatsapp: '5493516197928',          // número que recibe los mensajes (formato internacional, sin + ni espacios)
  instagram: '',                       // opcional, ej: 'glorinanimaciones'
  emailAviso: '',                      // vacío = te llega al mail de la cuenta dueña del script
  invitarFamilia: true,                // si la familia deja mail, la invitamos al evento del calendario
  sena: 40000,
  pago: {                              // datos que ve la familia para pagar la seña
    alias: 'faustorizzi',              // se puede transferir desde cualquier banco o billetera
    banco: 'Brubank',
    cbu: '',                           // opcional (CVU/CBU de 22 dígitos)
    titular: 'Fausto Rizzi',           // tiene que coincidir con el nombre que ve la familia al transferir
    linkMercadoPago: ''                // opcional: link de pago FIJO (vacío = no se muestra el botón)
  },
  horasParaSenar: 48,                  // plazo que le damos a la familia para mandar la seña
  duracionMin: 150,                    // 2 h 30 min (duración incluida en los paquetes)
  tiempoExtra: [30, 60],               // opciones de tiempo extra en minutos (se cobra proporcional al paquete)
  bufferMin: 60,                       // margen de traslado entre un evento y otro
  maxSimultaneos: 2,                   // cuántos cumples pueden solaparse (equipos de profes disponibles)
  maxPorDia: 4,                        // tope de cumples por día
  diasAnticipacionMin: 2,              // no se puede reservar con menos de X días
  diasHaciaAdelante: 120,              // cuántos días se muestran en el calendario
  horaResumenDiario: 8,                // hora del mail diario de resumen
  // ---- Profes ----
  urlWeb: 'https://script.google.com/macros/s/AKfycbzOiwz0lWWgExbIeJ7nF7bwWm2GSPg7NRR3C3zZRh81RhQ6NHVqX9u8sN8eJKOlxd1N/exec',
  convocarAlSenar: true,               // al pasar a Señado, se manda la convocatoria por mail a los profes activos
  minutosAntesProfes: 20,              // cuánto antes tienen que llegar los profes a armar
  // ---- Portal de profes ----
  adminEmails: [],                     // mails que entran al portal como administración (además de la cuenta dueña del script)
  aprobarCuentas: true,                // las cuentas nuevas quedan "Pendiente" hasta que las aprobás
  avisarPostulaciones: true,           // te llega un mail cada vez que un profe se propone para una fecha
  recordatoriosProfes: [3, 1],         // días antes del cumple en que le llega un recordatorio por mail a cada profe del equipo
  tarifasProfes: {                     // lo que cobra cada profe por cumple, según su nivel (el nivel se lo ponés en el portal → Profes)
    'Animador avanzado': 50000,
    'Animador intermedio': 45000,
    'Auxiliar': 40000
  },
  extraElementos: 40000,               // extra para el que pone o transporta los elementos (inflable, metegol, equipo)
  avisarPagoAlProfe: true,             // al marcar un pago como hecho, le llega un mail al profe
  diasSesion: 60,                      // cuántos días queda abierta la sesión en el celu del profe
  horarios: ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','14:00','14:30','15:00','15:30',
             '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00'],
  stock: { metegol: 2, inflable: 1 },  // cuántos tenés de cada uno
  paquetes: [
    { id: 'individual', nombre: 'Individual', profes: 1, precio: 125000, detalle: '1 profe animador · ideal hasta 12-15 chicos', maxChicos: 15 },
    { id: 'ultra',      nombre: 'Ultra Básico', profes: 2, precio: 195000, detalle: '2 profes · recreación y juegos · hasta 27-30 chicos', maxChicos: 30, destacado: true },
    { id: 'recreacion', nombre: 'Recreación', profes: 3, precio: 235000, detalle: '3 profes · animación y recreación · grupos grandes o muy chiquitos' },
    { id: 'premium',    nombre: 'Premium', profes: 3, precio: 335000, detalle: '3 profes + inflable 3x6 con tobogán + metegol',
      incluye: { inflable: 1, metegol: 1 } }
  ],
  extras: [
    { id: 'inflable',   nombre: 'Inflable 3x6 con tobogán', precio: 80000, recurso: 'inflable', maxCant: 1, detalle: 'Necesita un espacio de 3x6 m y un enchufe' },
    { id: 'metegol',    nombre: 'Metegol', precio: 35000, recurso: 'metegol', maxCant: 2, detalle: 'Precio por metegol · podés sumar hasta 2' },
    { id: 'maquillaje', nombre: 'Maquillaje artístico', precio: 150000, maxChicos: 25, detalle: 'Hasta 25 chicos' },
    { id: 'masas',      nombre: 'Taller de masas', precio: 35000, detalle: 'Cada chico arma y se lleva lo suyo' },
    { id: 'globologia', nombre: 'Globología', precio: 30000, detalle: 'Una figura de globo para cada chico' },
    { id: 'kermes',     nombre: 'Kermés (juegos de feria)', precio: 30000, detalle: 'Juegos de feria con premios' }
  ],
  zonas: [
    { id: 'cba',       nombre: 'Córdoba Capital', recargo: 0 },
    { id: 'allende',   nombre: 'Villa Allende', recargo: 0 },
    { id: 'calera',    nombre: 'La Calera', recargo: 0 },
    { id: 'manant',    nombre: 'Manantiales', recargo: 0 },
    { id: 'aldea',     nombre: 'Aldea de Valle (Valle Escondido)', recargo: 0 },
    { id: 'vcp',       nombre: 'Villa Carlos Paz', recargo: 50000 },
    { id: 'falda',     nombre: 'Falda del Carmen', recargo: 50000 },
    { id: 'otra',      nombre: 'Otra zona (a confirmar)', recargo: 50000 }
  ]
};

const HOJA = 'Reservas';
const ESTADOS = ['Consulta', 'Presupuesto enviado', 'A confirmar', 'Señado', 'Realizado', 'Cancelado'];
const PREFIJO_ESTADO = {
  'Consulta': '❔ CONSULTA', 'Presupuesto enviado': '📨 PRESUPUESTO', 'A confirmar': '⏳ A CONFIRMAR',
  'Señado': '✅ CONFIRMADO', 'Realizado': '🎉 REALIZADO', 'Cancelado': '❌ CANCELADO'
};
const COLOR_ESTADO = {
  'A confirmar': CalendarApp.EventColor.YELLOW, 'Señado': CalendarApp.EventColor.GREEN,
  'Realizado': CalendarApp.EventColor.BLUE, 'Cancelado': CalendarApp.EventColor.GRAY
};
const COLUMNAS = [
  'ID', 'Recibido', 'Estado', 'Fecha evento', 'Hora inicio', 'Hora fin', 'Duración',
  'Adulto responsable', 'WhatsApp', 'Email', 'Cumpleañero/a', 'Edad que cumple',
  'Cant. chicos', 'Rango de edades', 'Adultos aprox.', 'Tipo de evento',
  'Lugar', 'Zona', 'Dirección', 'Espacio', 'Tamaño del espacio', 'Plan lluvia',
  'Enchufe/parlante', 'Paquete', 'Extras', 'Inflables', 'Metegoles', 'Total estimado', 'Seña',
  'Personalidad', 'Le gusta / temática', 'Música', 'Estilo de juegos', 'Evitar',
  'Momentos (merienda/torta/piñata)', 'Hora merienda', 'Hora torta', 'Atención especial',
  'Cómo nos conoció', 'Comentarios', 'Detalle completo (JSON)',
  // columnas nuevas (v2) — se agregan solas al final si tu planilla ya existía
  'Saldo', 'WhatsApp link', 'ID evento calendario', 'Último aviso',
  // columnas de profes (v3)
  'Profes necesarios', 'Profes asignados', 'Suplentes', 'Convocatoria',
  // portal de profes (v4)
  'Postulados', 'Pago por profe', 'Recordatorios profes', 'Lleva elementos'
];
const HOJA_PROFES = 'Profes';
const COLUMNAS_PROFES = ['Nombre', 'WhatsApp', 'Email', 'Activo', 'Notas', 'Clave', 'Alta', 'Último ingreso', 'Nivel'];
const HOJA_PAGOS = 'Pagos';
const COLUMNAS_PAGOS = ['ID pago', 'Reserva', 'Fecha evento', 'Cumple', 'Profe', 'Monto', 'Estado', 'Fecha de pago', 'Notas', 'Detalle'];

// ======== SERVIR LA PÁGINA ========
function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (prm.profes !== undefined || prm.convocatoria !== undefined || prm.reset !== undefined) {
    return HtmlService.createHtmlOutputFromFile('Profes')
      .setTitle('GLORIN · Portal de profes')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (prm.api === 'datos') return json_(getDatosIniciales);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GLORIN Animaciones · Reservá tu cumple')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ======== API para la página publicada afuera (GitHub Pages / Instagram) ========
function doPost(e) {
  return json_(function () {
    const pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (pedido.accion === 'enviarReserva') return enviarReserva(pedido.datos);
    if (pedido.accion === 'portal' && Object.prototype.hasOwnProperty.call(API_PORTAL, pedido.fn)) {
      return API_PORTAL[pedido.fn].apply(null, Array.isArray(pedido.args) ? pedido.args : []);
    }
    throw new Error('Acción desconocida.');
  });
}

function json_(fn) {
  let salida;
  try { salida = { ok: true, data: fn() }; } catch (err) { salida = { ok: false, error: err.message }; }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

// ======== CONFIGURACIÓN INICIAL (correr UNA vez a mano) ========
function configurarInicial() {
  const sh = obtenerHoja_();
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
  sh.getRange(2, columna_(sh, 'Estado'), 1000, 1).setDataValidation(regla);
  colorearEstados_(sh);
  obtenerCalendario_();
  obtenerHojaProfes_();
  obtenerHojaPagos_();

  // Disparadores: al editar la planilla y resumen diario. Se recrean sin duplicar.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['alEditarPlanilla', 'resumenDiario'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alEditarPlanilla').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('resumenDiario').timeBased().everyDays(1).atHour(CONFIG.horaResumenDiario).create();

  Logger.log('Listo. Ahora: Implementar > Nueva implementación > Aplicación web (Ejecutar como: Yo · Acceso: Cualquier persona).');
}

function obtenerHoja_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA);
  if (!sh) sh = ss.insertSheet(HOJA);
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNAS);
    sh.setFrozenRows(1);
  } else {
    // Migración: agrega al final las columnas que falten, sin tocar las existentes
    const actuales = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const faltan = COLUMNAS.filter(function (c) { return actuales.indexOf(c) < 0; });
    if (faltan.length) sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#C8161A').setFontColor('#FFFFFF');
  return sh;
}

function encabezados_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
}

function columna_(sh, nombre) {
  const i = encabezados_(sh).indexOf(nombre);
  if (i < 0) throw new Error('No encuentro la columna "' + nombre + '". Corré configurarInicial().');
  return i + 1;
}

function colorearEstados_(sh) {
  const rango = sh.getRange(2, columna_(sh, 'Estado'), 1000, 1);
  const colores = { 'A confirmar': '#FFF4C2', 'Señado': '#D6F5DD', 'Realizado': '#DCE8FB', 'Cancelado': '#EEEEEE' };
  const reglas = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (x) { return x.getColumn() === rango.getColumn(); });
  });
  Object.keys(colores).forEach(function (estado) {
    reglas.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(estado)
      .setBackground(colores[estado]).setRanges([rango]).build());
  });
  sh.setConditionalFormatRules(reglas);
}

function obtenerCalendario_() {
  const cals = CalendarApp.getCalendarsByName(CONFIG.nombreCalendario);
  if (cals.length) return cals[0];
  return CalendarApp.createCalendar(CONFIG.nombreCalendario, { color: CalendarApp.Color.RED });
}

// Lee "inflable=1; metegol=2" del título o la descripción del evento
function leerRecursos_(texto) {
  const r = {};
  Object.keys(CONFIG.stock).forEach(function (rec) {
    const m = new RegExp(rec + '\\s*[=:]\\s*(\\d+)', 'i').exec(texto || '');
    if (m) r[rec] = Number(m[1]);
  });
  return r;
}

// ======== DATOS PARA LA PÁGINA ========
function getDatosIniciales() {
  const tz = Session.getScriptTimeZone();
  return {
    config: configPublica_(),
    hoy: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
    ocupados: leerOcupados_()
  };
}

// Solo lo que la página necesita (no expone mail de aviso ni nada interno)
function configPublica_() {
  const c = JSON.parse(JSON.stringify(CONFIG));
  delete c.emailAviso;
  delete c.nombreCalendario;
  delete c.adminEmails;
  delete c.tarifasProfes;
  delete c.extraElementos;
  return c;
}

function leerOcupados_() {
  const cal = obtenerCalendario_();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hasta = new Date(hoy.getTime() + (CONFIG.diasHaciaAdelante + 1) * 86400000);
  const tz = Session.getScriptTimeZone();
  const ocupados = {};   // { 'yyyy-MM-dd': { bloqueado, eventos: [[iniMin, finMin, {inflable, metegol}], ...] } }

  cal.getEvents(hoy, hasta).forEach(function (ev) {
    const titulo = (ev.getTitle() || '').toUpperCase();
    if (titulo.indexOf('CANCELAD') >= 0) return;
    if (ev.isAllDayEvent()) {
      if (titulo.indexOf('BLOQUEAD') >= 0) {
        let d = new Date(ev.getAllDayStartDate());
        const fin = ev.getAllDayEndDate();
        while (d < fin) {
          const k = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
          ocupados[k] = ocupados[k] || { bloqueado: false, eventos: [] };
          ocupados[k].bloqueado = true;
          d = new Date(d.getTime() + 86400000);
        }
      }
      return;
    }
    const ini = ev.getStartTime(), fin = ev.getEndTime();
    const k = Utilities.formatDate(ini, tz, 'yyyy-MM-dd');
    const m = function (t) { return Number(Utilities.formatDate(t, tz, 'H')) * 60 + Number(Utilities.formatDate(t, tz, 'm')); };
    // Si el evento termina otro día, lo contamos hasta medianoche
    const finMin = Utilities.formatDate(fin, tz, 'yyyy-MM-dd') === k ? m(fin) : 24 * 60;
    ocupados[k] = ocupados[k] || { bloqueado: false, eventos: [] };
    ocupados[k].eventos.push([m(ini), finMin, leerRecursos_(ev.getTitle() + '\n' + ev.getDescription())]);
  });
  return ocupados;
}

// ======== PRESUPUESTO (se recalcula en el servidor) ========
function calcularPresupuesto_(d) {
  const buscar = function (lista, id) { return lista.filter(function (x) { return x.id === id; })[0]; };
  const paq = buscar(CONFIG.paquetes, d.paquete);
  if (!paq) throw new Error('Elegí un paquete.');
  const zona = buscar(CONFIG.zonas, d.zona) || CONFIG.zonas[CONFIG.zonas.length - 1];
  const extraMin = CONFIG.tiempoExtra.indexOf(Number(d.extraMin)) >= 0 ? Number(d.extraMin) : 0;
  const precioExtraMin = Math.round(paq.precio * extraMin / CONFIG.duracionMin / 1000) * 1000;

  let total = paq.precio + zona.recargo + precioExtraMin;
  const recursos = {};
  Object.keys(paq.incluye || {}).forEach(function (r) { recursos[r] = paq.incluye[r]; });
  const extras = [];
  const avisos = [];
  if (extraMin) extras.push('Tiempo extra +' + extraMin + ' min');

  const elegidos = d.extras || {};
  CONFIG.extras.forEach(function (e) {
    let cant = Math.floor(Number(elegidos[e.id]) || 0);
    if (cant <= 0) return;
    cant = Math.min(cant, e.maxCant || 1);
    total += e.precio * cant;
    let txt = e.nombre + (cant > 1 ? ' x' + cant : '');
    if (e.maxChicos && Number(d.cantChicos) > e.maxChicos) {
      txt += ' (son ' + d.cantChicos + ' chicos: cotizar adicional)';
      avisos.push(e.nombre + ': incluye hasta ' + e.maxChicos + ' chicos, el adicional se cotiza aparte.');
    }
    extras.push(txt);
    if (e.recurso) recursos[e.recurso] = (recursos[e.recurso] || 0) + cant;
  });
  if (paq.maxChicos && Number(d.cantChicos) > paq.maxChicos) {
    avisos.push('Para ' + d.cantChicos + ' chicos te recomendamos un paquete con más profes.');
  }
  if (zona.recargo) extras.push('Recargo distancia ' + zona.nombre);
  return { paquete: paq, zona: zona, extras: extras, total: total, recursos: recursos, avisos: avisos,
           duracion: CONFIG.duracionMin + extraMin };
}

// ======== GUARDAR RESERVA ========
function enviarReserva(d) {
  validar_(d);
  const p = calcularPresupuesto_(d);
  const tz = Session.getScriptTimeZone();

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hay mucha gente reservando en este momento. Probá de nuevo en unos segundos.');
  let id, ev, iniReal, finReal;
  try {
    // Re-chequear disponibilidad y stock por si otra familia reservó mientras tanto
    const dia = leerOcupados_()[d.fecha];
    if (!horarioLibre_(dia, d.hora, p.duracion)) {
      throw new Error('Ese horario se acaba de ocupar. Elegí otro, por favor.');
    }
    Object.keys(p.recursos).forEach(function (r) {
      if (usoEnHorario_(dia, d.hora, p.duracion, r) + p.recursos[r] > (CONFIG.stock[r] || 0)) {
        throw new Error('Se acaba de reservar el ' + r + ' en ese horario. Sacalo de los extras o elegí otro horario.');
      }
    });

    id = 'GL-' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const partes = d.hora.split(':');
    iniReal = new Date(Number(d.fecha.slice(0, 4)), Number(d.fecha.slice(5, 7)) - 1, Number(d.fecha.slice(8, 10)),
                       Number(partes[0]), Number(partes[1]));
    finReal = new Date(iniReal.getTime() + p.duracion * 60000);

    const opciones = { description: descripcionEvento_(id, d, p), location: d.direccion || '' };
    if (CONFIG.invitarFamilia && d.email) { opciones.guests = d.email; opciones.sendInvites = true; }
    ev = obtenerCalendario_().createEvent(tituloEvento_('A confirmar', d, p), iniReal, finReal, opciones);
    try { ev.setColor(COLOR_ESTADO['A confirmar']); } catch (e) {}
  } finally {
    lock.releaseLock();
  }

  const hhmm = function (t) { return Utilities.formatDate(t, tz, 'HH:mm'); };
  const durTxt = duracionTexto_(p.duracion);
  const waFamilia = linkWhatsApp_(d.whatsapp, mensajeParaFamilia_('recibida', { id: id, adulto: d.adulto, cumpleanero: d.cumpleanero, fecha: d.fecha, hora: d.hora, total: p.total }));

  // Guardar en la planilla (por nombre de columna, así no se rompe si reordenás)
  const sh = obtenerHoja_();
  const fila = {
    'ID': id, 'Recibido': new Date(), 'Estado': 'A confirmar', 'Fecha evento': d.fecha, 'Hora inicio': d.hora,
    'Hora fin': hhmm(finReal), 'Duración': durTxt,
    'Adulto responsable': d.adulto, 'WhatsApp': d.whatsapp, 'Email': d.email, 'Cumpleañero/a': d.cumpleanero,
    'Edad que cumple': d.edad, 'Cant. chicos': d.cantChicos, 'Rango de edades': d.rangoEdades,
    'Adultos aprox.': d.adultos, 'Tipo de evento': d.tipoEvento, 'Lugar': d.lugar, 'Zona': p.zona.nombre,
    'Dirección': d.direccion, 'Espacio': d.espacio, 'Tamaño del espacio': d.tamanoEspacio, 'Plan lluvia': d.planLluvia,
    'Enchufe/parlante': d.enchufe, 'Paquete': p.paquete.nombre, 'Extras': p.extras.join(', '),
    'Inflables': p.recursos.inflable || 0, 'Metegoles': p.recursos.metegol || 0,
    'Total estimado': p.total, 'Seña': CONFIG.sena, 'Saldo': p.total - CONFIG.sena,
    'Personalidad': d.personalidad, 'Le gusta / temática': d.gustos, 'Música': d.musica, 'Estilo de juegos': d.estilo,
    'Evitar': d.evitar, 'Momentos (merienda/torta/piñata)': (d.momentos || []).join(', '),
    'Hora merienda': d.horaMerienda, 'Hora torta': d.horaTorta, 'Atención especial': d.atencionEspecial,
    'Cómo nos conoció': d.comoNosConocio, 'Comentarios': d.comentarios, 'Detalle completo (JSON)': JSON.stringify(d),
    'WhatsApp link': waFamilia, 'ID evento calendario': ev.getId(), 'Último aviso': '',
    'Profes necesarios': p.paquete.profes || 1
  };
  const fechaYHora = { 'Fecha evento': 1, 'Hora inicio': 1, 'Hora fin': 1 };
  sh.appendRow(encabezados_(sh).map(function (h) {
    const v = fila[h];
    if (v === undefined || v === null) return '';
    if (fechaYHora[h]) return "'" + v;            // que Sheets no lo convierta en fecha/hora rara
    return limpiarCelda_(v);
  }));

  // Avisos por mail (si falla el mail, la reserva igual quedó hecha)
  try { avisarDueno_(id, d, p, durTxt, waFamilia); } catch (e) { console.error(e); }
  try { if (d.email) mailFamilia_('recibida', d.email, { id: id, d: d, p: p, durTxt: durTxt, fin: hhmm(finReal) }); } catch (e) { console.error(e); }

  return {
    ok: true, id: id, total: p.total, sena: CONFIG.sena, saldo: p.total - CONFIG.sena,
    paquete: p.paquete.nombre, fin: hhmm(finReal), avisos: p.avisos,
    linkCalendario: linkGoogleCalendar_('Cumple de ' + d.cumpleanero + ' · ' + CONFIG.marca, iniReal, finReal, d.direccion),
    whatsappComprobante: linkWhatsApp_(CONFIG.whatsapp,
      '¡Hola GLORIN! 🎈 Soy ' + d.adulto + '. Acabo de reservar el cumple de ' + d.cumpleanero +
      ' para el ' + fechaLarga_(d.fecha) + ' a las ' + d.hora + ' hs (reserva ' + id + '). Te mando el comprobante de la seña 👇')
  };
}

function validar_(d) {
  if (!d) throw new Error('No llegaron los datos. Recargá la página.');
  const faltan = [];
  if (!d.fecha) faltan.push('fecha');
  if (!d.hora) faltan.push('horario');
  if (!d.adulto) faltan.push('nombre del adulto');
  if (!d.whatsapp) faltan.push('WhatsApp');
  if (!d.cumpleanero) faltan.push('nombre del cumpleañero/a');
  if (!d.direccion) faltan.push('dirección');
  if (faltan.length) throw new Error('Falta completar: ' + faltan.join(', ') + '.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha) || CONFIG.horarios.indexOf(d.hora) < 0) throw new Error('Fecha u horario inválido.');
  if (String(d.whatsapp).replace(/\D/g, '').length < 10) throw new Error('Revisá el WhatsApp: poné código de área y número (ej: 351 6197928).');
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('Revisá el email.');

  const tz = Session.getScriptTimeZone();
  const minimo = Utilities.formatDate(new Date(Date.now() + CONFIG.diasAnticipacionMin * 86400000), tz, 'yyyy-MM-dd');
  const maximo = Utilities.formatDate(new Date(Date.now() + CONFIG.diasHaciaAdelante * 86400000), tz, 'yyyy-MM-dd');
  if (d.fecha < minimo) throw new Error('Para esa fecha escribinos por WhatsApp así vemos si llegamos.');
  if (d.fecha > maximo) throw new Error('Esa fecha todavía no está abierta. Escribinos por WhatsApp.');

  // Recortar textos largos
  Object.keys(d).forEach(function (k) { if (typeof d[k] === 'string') d[k] = d[k].trim().slice(0, 1000); });
}

// Evita que un texto que empieza con = + - @ se interprete como fórmula
function limpiarCelda_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function tituloEvento_(estado, d, p) {
  return (PREFIJO_ESTADO[estado] || estado) + ' · Cumple ' + d.cumpleanero + (d.edad ? ' (' + d.edad + ')' : '') + ' · ' + p.paquete.nombre;
}

function descripcionEvento_(id, d, p) {
  const recursosTxt = Object.keys(p.recursos).map(function (r) { return r + '=' + p.recursos[r]; }).join('; ');
  return [
    'ID: ' + id,
    'Adulto: ' + d.adulto + ' · WhatsApp: ' + d.whatsapp,
    'Chicos: ' + (d.cantChicos || '?') + ' (' + (d.rangoEdades || '-') + ')',
    'Lugar: ' + (d.lugar || '-') + ' · ' + p.zona.nombre + ' · ' + d.direccion,
    'Espacio: ' + (d.espacio || '-') + ' · Plan lluvia: ' + (d.planLluvia || '-') + ' · Enchufe: ' + (d.enchufe || '-'),
    'Paquete: ' + p.paquete.nombre + ' · Duración: ' + duracionTexto_(p.duracion),
    'Extras: ' + (p.extras.length ? p.extras.join(', ') : '-'),
    'Total estimado: ' + pesos_(p.total) + ' · Seña: ' + pesos_(CONFIG.sena) + ' · Saldo: ' + pesos_(p.total - CONFIG.sena),
    'Estilo: ' + (d.estilo || '-') + ' · Gustos: ' + (d.gustos || '-') + ' · Música: ' + (d.musica || '-'),
    'Evitar: ' + (d.evitar || '-'),
    'Momentos: ' + ((d.momentos || []).join(', ') || '-') + ' · Merienda: ' + (d.horaMerienda || '-') + ' · Torta: ' + (d.horaTorta || '-'),
    'Atención especial: ' + (d.atencionEspecial || '-'),
    'Comentarios: ' + (d.comentarios || '-'),
    recursosTxt ? 'RECURSOS: ' + recursosTxt : ''
  ].join('\n');
}

// ======== WHATSAPP ========
// Normaliza un celular argentino al formato que pide wa.me: 549 + área + número
function normalizarWhatsApp_(tel) {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.indexOf('54') === 0) n = n.slice(2);
  if (n.indexOf('9') === 0 && n.length === 11) n = n.slice(1);
  if (n.indexOf('0') === 0) n = n.slice(1);
  // Saca el "15" después del código de área (área de 2, 3 o 4 dígitos)
  if (n.length === 12) {
    [2, 3, 4].some(function (a) {
      if (n.substr(a, 2) === '15') { n = n.slice(0, a) + n.slice(a + 2); return true; }
      return false;
    });
  }
  return n.length === 10 ? '549' + n : String(tel || '').replace(/\D/g, '');
}

function linkWhatsApp_(tel, texto) {
  return 'https://wa.me/' + normalizarWhatsApp_(tel) + '?text=' + encodeURIComponent(texto || '');
}

function mensajeParaFamilia_(tipo, r) {
  const nombre = String(r.adulto || '').split(' ')[0];
  const cuando = fechaLarga_(r.fecha) + ' a las ' + r.hora + ' hs';
  const pago = datosPagoTexto_();
  if (tipo === 'recibida') {
    return '¡Hola ' + nombre + '! 🎈 Te escribimos de GLORIN Animaciones. Recibimos la reserva del cumple de ' + r.cumpleanero +
      ' para el ' + cuando + ' (reserva ' + r.id + ').\n\nPara confirmar la fecha necesitamos la seña de ' + pesos_(CONFIG.sena) + '.' +
      (pago ? '\n' + pago : '') + '\n\nCualquier duda, ¡escribinos!';
  }
  if (tipo === 'sena') {
    return '¡Hola ' + nombre + '! 😊 Te recordamos que la reserva del cumple de ' + r.cumpleanero + ' (' + cuando +
      ') sigue pendiente de seña (' + pesos_(CONFIG.sena) + '). ¿La querés mantener?' + (pago ? '\n' + pago : '');
  }
  if (tipo === 'confirmada') {
    return '¡Hola ' + nombre + '! ✅ Recibimos la seña: el cumple de ' + r.cumpleanero + ' quedó CONFIRMADO para el ' + cuando + '. ¡Nos vemos ahí! 🎉';
  }
  if (tipo === 'recordatorio') {
    return '¡Hola ' + nombre + '! 🎈 Mañana es el cumple de ' + r.cumpleanero + ' (' + cuando + '). Llegamos un ratito antes para armar.' +
      (r.saldo ? ' Recordá que el saldo es de ' + pesos_(r.saldo) + '.' : '') + ' ¡Nos vemos!';
  }
  if (tipo === 'gracias') {
    return '¡Hola ' + nombre + '! 💛 Gracias por elegirnos para el cumple de ' + r.cumpleanero + '. Si les gustó, nos ayuda muchísimo una reseña o que nos recomienden. ¡Hasta la próxima!';
  }
  return '';
}

function datosPagoTexto_() {
  const pg = CONFIG.pago || {};
  const l = [];
  if (pg.alias) l.push('Alias: ' + pg.alias);
  if (pg.banco) l.push('Banco: ' + pg.banco);
  if (pg.cbu) l.push('CBU: ' + pg.cbu);
  if (pg.titular) l.push('Titular: ' + pg.titular);
  if (pg.linkMercadoPago) l.push('Mercado Pago: ' + pg.linkMercadoPago);
  return l.join('\n');
}

// ======== MAILS ========
function avisarDueno_(id, d, p, durTxt, waFamilia) {
  const mail = CONFIG.emailAviso || Session.getEffectiveUser().getEmail();
  if (!mail) return;
  const html =
    '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
    '<h2 style="color:#C8161A;margin:0 0 8px">🎈 Nueva reserva ' + esc_(id) + '</h2>' +
    '<p><b>' + esc_(fechaLarga_(d.fecha)) + ' · ' + esc_(d.hora) + ' hs</b> (' + esc_(durTxt) + ')<br>' +
    'Cumple de <b>' + esc_(d.cumpleanero) + '</b> ' + (d.edad ? '(' + esc_(d.edad) + ')' : '') + ' · ' + esc_(d.cantChicos || '?') + ' chicos<br>' +
    esc_(p.paquete.nombre) + ' · <b>' + pesos_(p.total) + '</b></p>' +
    boton_(waFamilia, '💬 Escribirle a ' + String(d.adulto).split(' ')[0] + ' por WhatsApp', '#25D366') +
    '<pre style="font-family:inherit;white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px">' +
    esc_(descripcionEvento_(id, d, p)) + '</pre>' +
    '<p style="color:#777">Cuando llegue la seña, cambiá el Estado a <b>Señado</b> en la planilla: el evento se confirma solo y le avisamos a la familia.</p></div>';
  MailApp.sendEmail({ to: mail, subject: '🎈 Nueva reserva · ' + d.fecha + ' ' + d.hora + ' · ' + d.cumpleanero,
                      body: descripcionEvento_(id, d, p) + '\n\nWhatsApp: ' + waFamilia, htmlBody: html, name: CONFIG.marca });
}

function mailFamilia_(tipo, email, x) {
  const d = x.d, p = x.p;
  const nombre = String(d.adulto || '').split(' ')[0];
  const pago = datosPagoTexto_();
  const waGlorin = linkWhatsApp_(CONFIG.whatsapp, '¡Hola GLORIN! Te escribo por la reserva ' + x.id + ' (cumple de ' + d.cumpleanero + ').');
  let asunto, cuerpo;
  if (tipo === 'recibida') {
    asunto = '🎈 Recibimos tu reserva · Cumple de ' + d.cumpleanero;
    cuerpo = '<p>¡Hola ' + esc_(nombre) + '! Recibimos la reserva del cumple de <b>' + esc_(d.cumpleanero) + '</b>. ' +
      'Te guardamos el horario por ' + CONFIG.horasParaSenar + ' hs: para confirmarlo necesitamos la seña.</p>' +
      tablaResumen_(x) +
      '<h3 style="color:#C8161A">Seña: ' + pesos_(CONFIG.sena) + '</h3>' +
      (pago ? '<pre style="font-family:inherit;background:#FFF4E5;padding:12px;border-radius:8px">' + esc_(pago) + '</pre>' : '') +
      (CONFIG.pago.linkMercadoPago ? boton_(CONFIG.pago.linkMercadoPago, 'Pagar la seña con Mercado Pago', '#009EE3') : '') +
      boton_(linkWhatsApp_(CONFIG.whatsapp, '¡Hola GLORIN! 🎈 Te mando el comprobante de la seña de la reserva ' + x.id + ' (cumple de ' + d.cumpleanero + ').'),
             '💬 Mandar comprobante por WhatsApp', '#25D366');
  } else {
    asunto = '✅ ¡Cumple confirmado! · ' + d.cumpleanero;
    cuerpo = '<p>¡Hola ' + esc_(nombre) + '! Recibimos la seña y el cumple de <b>' + esc_(d.cumpleanero) + '</b> quedó <b>confirmado</b>. 🎉</p>' +
      tablaResumen_(x) + boton_(waGlorin, '💬 Escribinos por WhatsApp', '#25D366');
  }
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px">' +
    '<h2 style="color:#C8161A;margin:0 0 12px">' + esc_(CONFIG.marca) + '</h2>' + cuerpo +
    '<p style="color:#888;font-size:12px;margin-top:24px">Reserva ' + esc_(x.id) + '</p></div>';
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: html, name: CONFIG.marca, replyTo: CONFIG.emailAviso || undefined,
                      body: asunto + '\n\nReserva ' + x.id + '\n' + fechaLarga_(d.fecha) + ' ' + d.hora + ' hs\n' + (pago || '') });
}

function tablaResumen_(x) {
  const d = x.d, p = x.p;
  const fila = function (a, b) { return '<tr><td style="padding:4px 12px 4px 0;color:#777">' + a + '</td><td style="padding:4px 0"><b>' + esc_(b) + '</b></td></tr>'; };
  return '<table style="border-collapse:collapse;margin:12px 0">' +
    fila('Fecha', fechaLarga_(d.fecha)) + fila('Horario', d.hora + ' a ' + x.fin + ' hs') +
    fila('Lugar', d.direccion + ' (' + p.zona.nombre + ')') + fila('Paquete', p.paquete.nombre) +
    (p.extras.length ? fila('Extras', p.extras.join(', ')) : '') +
    fila('Total estimado', pesos_(p.total)) + fila('Seña', pesos_(CONFIG.sena)) + fila('Saldo el día del cumple', pesos_(p.total - CONFIG.sena)) +
    '</table>';
}

function boton_(url, texto, color) {
  return '<p><a href="' + esc_(url) + '" style="display:inline-block;background:' + color + ';color:#fff;text-decoration:none;' +
    'padding:12px 18px;border-radius:10px;font-weight:bold">' + esc_(texto) + '</a></p>';
}

// ======== PLANILLA: menú y cambios de estado ========
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🎈 GLORIN')
    .addItem('💬 WhatsApp a la familia (fila seleccionada)', 'menuWhatsApp')
    .addItem('✅ Marcar como Señado', 'menuSenado')
    .addItem('❌ Cancelar reserva', 'menuCancelar')
    .addSeparator()
    .addItem('📣 Convocar profes (fila seleccionada)', 'menuConvocar')
    .addItem('🧑‍🏫 Link del portal de profes', 'menuPortal')
    .addItem('👥 Ver la pestaña de profes', 'menuVerProfes')
    .addItem('💵 Ver la pestaña de pagos', 'menuVerPagos')
    .addSeparator()
    .addItem('📋 Mandarme el resumen ahora', 'resumenDiario')
    .addItem('⚙️ Configuración inicial', 'configurarInicial')
    .addToUi();
}

function menuSenado() { cambiarEstadoFilaActiva_('Señado'); }
function menuCancelar() { cambiarEstadoFilaActiva_('Cancelado'); }

function cambiarEstadoFilaActiva_(estado) {
  const sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== HOJA) throw new Error('Pará en la pestaña ' + HOJA + '.');
  const filaN = sh.getActiveRange().getRow();
  if (filaN < 2) throw new Error('Seleccioná una reserva.');
  sh.getRange(filaN, columna_(sh, 'Estado')).setValue(estado);
  aplicarEstado_(sh, filaN, estado);
  SpreadsheetApp.getActive().toast('Reserva marcada como ' + estado, 'GLORIN');
}

// Abre un cuadrito con botones de WhatsApp listos para la fila seleccionada
function menuWhatsApp() {
  const sh = SpreadsheetApp.getActiveSheet();
  const filaN = sh.getActiveRange().getRow();
  if (sh.getName() !== HOJA || filaN < 2) throw new Error('Seleccioná una reserva en la pestaña ' + HOJA + '.');
  const r = leerFila_(sh, filaN);
  const botones = ['recibida', 'sena', 'confirmada', 'recordatorio', 'gracias'].map(function (t) {
    const etiqueta = { recibida: 'Reserva recibida + datos de pago', sena: 'Reclamar seña', confirmada: 'Confirmar fecha',
                       recordatorio: 'Recordatorio (día antes)', gracias: 'Gracias + pedir reseña' }[t];
    return '<a target="_blank" href="' + esc_(linkWhatsApp_(r.whatsapp, mensajeParaFamilia_(t, r))) + '" ' +
      'style="display:block;margin:6px 0;padding:10px 12px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-family:Arial">' +
      '💬 ' + etiqueta + '</a>';
  }).join('');
  const html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:14px">' +
    '<p><b>' + esc_(r.adulto) + '</b> · ' + esc_(r.whatsapp) + '<br>Cumple de ' + esc_(r.cumpleanero) + ' · ' + esc_(fechaLarga_(r.fecha)) + '</p>' +
    botones + '</div>').setWidth(360).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'WhatsApp');
}

// Disparador instalable (lo crea configurarInicial)
function alEditarPlanilla(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() === HOJA_PROFES && e.range.getNumRows() === 1 && e.range.getNumColumns() === 1 && e.range.getRow() >= 2 &&
      e.range.getColumn() === columna_(sh, 'Activo') && /^s/i.test(String(e.value || '')) && /pend/i.test(String(e.oldValue || ''))) {
    const p = leerProfes_().filter(function (x) { return x.fila === e.range.getRow(); })[0];
    if (p && p.clave) { try { mailProfe_('aprobado', p, null); } catch (err) { console.error(err); } }
    return;
  }
  if (sh.getName() !== HOJA || e.range.getRow() < 2) return;
  const colEstado = columna_(sh, 'Estado');
  if (e.range.getColumn() > colEstado || e.range.getLastColumn() < colEstado) return;
  for (let f = e.range.getRow(); f <= e.range.getLastRow(); f++) {
    aplicarEstado_(sh, f, String(sh.getRange(f, colEstado).getValue()));
  }
}

function aplicarEstado_(sh, filaN, estado) {
  const r = leerFila_(sh, filaN);
  if (!r.id) return;
  const ev = r.eventoId ? obtenerCalendario_().getEventById(r.eventoId) : null;
  if (ev) {
    const titulo = ev.getTitle().replace(/^[^·]*·\s*/, '');
    ev.setTitle((PREFIJO_ESTADO[estado] || estado) + ' · ' + titulo);
    if (COLOR_ESTADO[estado]) { try { ev.setColor(COLOR_ESTADO[estado]); } catch (err) {} }
  }
  if (estado === 'Señado' && r.email && r.json) {
    try {
      const d = JSON.parse(r.json);
      mailFamilia_('confirmada', r.email, { id: r.id, d: d, p: calcularPresupuesto_(d), fin: r.horaFin });
    } catch (err) { console.error(err); }
  }
  if (estado === 'Señado' && CONFIG.convocarAlSenar) {
    try { mailConvocatoriaProfes_(sh, filaN); } catch (err) { console.error(err); }
  }
  if (estado === 'Cancelado') {
    try { avisarCancelacionProfes_(r); } catch (err) { console.error(err); }
  }
  sh.getRange(filaN, columna_(sh, 'Último aviso')).setValue(estado + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
}

function leerFila_(sh, filaN) {
  const h = encabezados_(sh);
  return filaDesdeValores_(h, sh.getRange(filaN, 1, 1, h.length).getValues()[0], filaN);
}

// Lee todas las reservas de una sola vez (mucho más rápido que fila por fila)
function leerTodas_(sh) {
  if (sh.getLastRow() < 2) return [];
  const h = encabezados_(sh);
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues().map(function (v, i) { return filaDesdeValores_(h, v, i + 2); });
}

function filaDesdeValores_(h, v, filaN) {
  const g = function (n) { const i = h.indexOf(n); return i < 0 ? '' : v[i]; };
  const tz = Session.getScriptTimeZone();
  const txt = function (x, fmt) { return x instanceof Date ? Utilities.formatDate(x, tz, fmt) : String(x || ''); };
  const total = Number(g('Total estimado')) || 0;
  const pago = g('Pago por profe');
  return {
    filaN: filaN, id: g('ID'), estado: g('Estado'), fecha: txt(g('Fecha evento'), 'yyyy-MM-dd'), hora: txt(g('Hora inicio'), 'HH:mm'),
    horaFin: txt(g('Hora fin'), 'HH:mm'), adulto: g('Adulto responsable'), whatsapp: g('WhatsApp'), email: g('Email'),
    cumpleanero: g('Cumpleañero/a'), recibido: g('Recibido'), total: total,
    saldo: Number(g('Saldo')) || (total ? total - (Number(g('Seña')) || 0) : 0),
    eventoId: g('ID evento calendario'), json: g('Detalle completo (JSON)'),
    direccion: g('Dirección'), zona: g('Zona'), paquete: g('Paquete'), cantChicos: g('Cant. chicos'),
    rangoEdades: g('Rango de edades'), edad: g('Edad que cumple'), extras: g('Extras'),
    profesNecesarios: Number(g('Profes necesarios')) || 0,
    asignados: lista_(g('Profes asignados')), suplentes: lista_(g('Suplentes')), token: String(g('Convocatoria') || ''),
    postulados: lista_(g('Postulados')), pagoProfe: pago === '' || pago === null ? '' : Number(pago) || 0,
    recordatorios: String(g('Recordatorios profes') || ''), comentarios: g('Comentarios'), llevan: lista_(g('Lleva elementos'))
  };
}

// ======== RESUMEN DIARIO (disparador a las 8 hs) ========
function resumenDiario() {
  try { recordatoriosProfes_(); } catch (e) { console.error(e); }
  const sh = obtenerHoja_();
  const tz = Session.getScriptTimeZone();
  const manana = Utilities.formatDate(new Date(Date.now() + 86400000), tz, 'yyyy-MM-dd');
  const limite = new Date(Date.now() - CONFIG.horasParaSenar * 3600000);
  const enUnaSemana = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), tz, 'yyyy-MM-dd');
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const deManana = [], sinSena = [], faltanProfes = [];
  leerTodas_(sh).forEach(function (r) {
    if (!r.id) return;
    if (r.estado === 'Señado' && r.fecha >= hoy && r.fecha <= enUnaSemana && r.asignados.length < necesarios_(r)) faltanProfes.push(r);
    if (r.fecha === manana && (r.estado === 'Señado' || r.estado === 'A confirmar')) deManana.push(r);
    if (r.estado === 'A confirmar' && r.recibido instanceof Date && r.recibido < limite) sinSena.push(r);
  });
  if (!deManana.length && !sinSena.length && !faltanProfes.length) return;
  const profes = leerProfes_();

  const item = function (r, tipo, nota) {
    return '<li style="margin:8px 0"><b>' + esc_(r.cumpleanero) + '</b> · ' + esc_(fechaLarga_(r.fecha)) + ' ' + esc_(r.hora) + ' hs · ' +
      esc_(r.adulto) + (nota ? ' · ' + nota : '') + '<br><a href="' + esc_(linkWhatsApp_(r.whatsapp, mensajeParaFamilia_(tipo, r))) +
      '" style="color:#128C7E;font-weight:bold">💬 Mandar WhatsApp</a></li>';
  };
  let html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">';
  if (deManana.length) html += '<h3 style="color:#C8161A">🎈 Mañana (' + deManana.length + ')</h3><ul>' +
    deManana.map(function (r) { return item(r, 'recordatorio', r.estado === 'A confirmar' ? '<b style="color:#C8161A">¡SIN SEÑA!</b>' : ''); }).join('') + '</ul>';
  if (sinSena.length) html += '<h3 style="color:#C8161A">⏳ Sin seña hace más de ' + CONFIG.horasParaSenar + ' hs (' + sinSena.length + ')</h3>' +
    '<p style="color:#777">Si no responden, cambiá el Estado a Cancelado para liberar el horario.</p><ul>' +
    sinSena.map(function (r) { return item(r, 'sena', ''); }).join('') + '</ul>';
  // Recordatorio para cada profe asignado a los cumples de mañana
  const recProfes = deManana.filter(function (r) { return r.asignados.length; }).map(function (r) {
    return '<li style="margin:8px 0"><b>' + esc_(r.cumpleanero) + '</b> ' + esc_(r.hora) + ' hs · ' +
      r.asignados.map(function (n) {
        const pf = buscarProfe_(profes, n);
        return pf && pf.whatsapp ? '<a href="' + esc_(linkWhatsApp_(pf.whatsapp, mensajeProfe_('recordatorio', r, n))) +
          '" style="color:#128C7E;font-weight:bold">💬 ' + esc_(n) + '</a>' : esc_(n);
      }).join(' · ') + '</li>';
  });
  if (recProfes.length) html += '<h3 style="color:#C8161A">👥 Avisarle a los profes de mañana</h3><ul>' + recProfes.join('') + '</ul>';
  if (faltanProfes.length) html += '<h3 style="color:#C8161A">⚠️ Faltan profes (próximos 7 días)</h3><ul>' +
    faltanProfes.map(function (r) {
      return '<li style="margin:8px 0"><b>' + esc_(r.cumpleanero) + '</b> · ' + esc_(fechaLarga_(r.fecha)) + ' ' + esc_(r.hora) + ' hs · ' +
        r.asignados.length + ' de ' + necesarios_(r) + (r.asignados.length ? ' (' + esc_(r.asignados.join(', ')) + ')' : '') +
        (r.postulados.length > r.asignados.length ? '<br>Se propusieron: ' + esc_(r.postulados.join(', ')) : '') +
        '<br><a href="' + esc_(linkPortal_(r.id)) + '" style="color:#C8161A;font-weight:bold">' + (r.token ? '👥 Elegir el equipo en el portal' : '📣 Publicar la fecha en el portal') + '</a></li>';
    }).join('') + '</ul>';
  html += '</div>';
  MailApp.sendEmail({ to: CONFIG.emailAviso || Session.getEffectiveUser().getEmail(),
                      subject: '📋 GLORIN · ' + deManana.length + ' cumple(s) mañana · ' + sinSena.length + ' sin seña' + (faltanProfes.length ? ' · ' + faltanProfes.length + ' sin equipo completo' : ''),
                      htmlBody: html, name: CONFIG.marca });
}

// ======== PROFES: cuentas, portal, postulaciones, equipo y pagos ========
// Los profes crean su cuenta en el portal (…/exec?profes=1), ven las fechas publicadas
// en un calendario y se proponen. Vos elegís el equipo desde el mismo portal: a los
// elegidos les llega un mail con todos los datos y quedan invitados al evento.
// Antes del cumple les llegan recordatorios y en "Pagos" llevás lo que se les debe.

function obtenerHojaProfes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_PROFES);
  let formatear = false;
  if (!sh) {
    sh = ss.insertSheet(HOJA_PROFES);
    sh.appendRow(COLUMNAS_PROFES);
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 180); sh.setColumnWidth(5, 320);
    formatear = true;
  } else {
    const actuales = encabezados_(sh);
    const faltan = COLUMNAS_PROFES.filter(function (c) { return actuales.indexOf(c) < 0; });
    if (faltan.length) { sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]); formatear = true; }
  }
  if (formatear) {
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#C8161A').setFontColor('#FFFFFF');
    sh.getRange(2, columna_(sh, 'Activo'), 500, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No', 'Pendiente'], true).build());
    sh.getRange(2, columna_(sh, 'Nivel'), 500, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(CONFIG.tarifasProfes), true).build());
    sh.hideColumns(columna_(sh, 'Clave'));   // la contraseña va cifrada, igual no hace falta verla
  }
  return sh;
}

function menuVerProfes() { SpreadsheetApp.getActive().setActiveSheet(obtenerHojaProfes_()); }
function menuVerPagos() { SpreadsheetApp.getActive().setActiveSheet(obtenerHojaPagos_()); }

function leerProfes_() {
  const sh = obtenerHojaProfes_();
  if (sh.getLastRow() < 2) return [];
  const h = encabezados_(sh);
  const g = function (f, n) { const i = h.indexOf(n); return i < 0 ? '' : f[i]; };
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues().map(function (f, i) {
    const estado = String(g(f, 'Activo') || '').trim();
    return { fila: i + 2, nombre: String(g(f, 'Nombre')).trim(), whatsapp: String(g(f, 'WhatsApp') || ''),
             email: String(g(f, 'Email') || '').trim().toLowerCase(), estado: estado,
             activo: /^s/i.test(estado), clave: String(g(f, 'Clave') || ''), nivel: String(g(f, 'Nivel') || '').trim() };
  }).filter(function (p) { return p.nombre || p.email; });
}

function buscarProfe_(profes, nombre) {
  return profes.filter(function (p) { return p.nombre.toLowerCase() === String(nombre).toLowerCase(); })[0];
}

function buscarProfePorEmail_(profes, email) {
  email = String(email || '').trim().toLowerCase();
  return email ? profes.filter(function (p) { return p.email === email; })[0] : null;
}

function escribirProfe_(fila, campos) {
  const sh = obtenerHojaProfes_();
  Object.keys(campos).forEach(function (k) { sh.getRange(fila, columna_(sh, k)).setValue(limpiarCelda_(campos[k])); });
}

function lista_(v) {
  return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

function sinNombre_(lista, nombre) {
  return lista.filter(function (n) { return n.toLowerCase() !== String(nombre).toLowerCase(); });
}

function tieneNombre_(lista, nombre) {
  return lista.some(function (n) { return n.toLowerCase() === String(nombre).toLowerCase(); });
}

function necesarios_(r) {
  if (r.profesNecesarios) return r.profesNecesarios;
  const paq = CONFIG.paquetes.filter(function (p) { return p.nombre === r.paquete; })[0];
  return paq ? paq.profes : 1;
}

// Lo que cobra un profe en un cumple: pago fijo de esa fecha (si lo pusiste) o la tarifa de su nivel,
// más el extra si es el que lleva los elementos. Sin nivel ni pago fijo → monto '' (a definir).
function pagoDe_(r, nombre, profes) {
  const p = buscarProfe_(profes || leerProfes_(), nombre);
  const nivel = p ? p.nivel : '';
  const fijo = r.pagoProfe !== '' && r.pagoProfe !== undefined && r.pagoProfe !== null;
  const base = fijo ? Number(r.pagoProfe) : (CONFIG.tarifasProfes[nivel] || '');
  const extra = tieneNombre_(r.llevan || [], nombre) ? CONFIG.extraElementos : 0;
  const partes = [];
  if (base !== '') partes.push((fijo ? 'Pago fijo' : nivel) + ' ' + pesos_(base));
  else partes.push('sin nivel cargado');
  if (extra) partes.push('elementos ' + pesos_(extra));
  return { monto: base === '' ? '' : base + extra, detalle: partes.join(' + '), extra: extra };
}

function tarifasTexto_() {
  return Object.keys(CONFIG.tarifasProfes).map(function (n) { return n + ' ' + pesos_(CONFIG.tarifasProfes[n]); }).join(' · ') +
    ' · +' + pesos_(CONFIG.extraElementos) + ' si llevás los elementos';
}

function urlBase_() { return CONFIG.urlWeb || ScriptApp.getService().getUrl(); }

function linkPortal_(id) {
  return urlBase_() + '?profes=1' + (id ? '&fecha=' + encodeURIComponent(id) : '');
}

// Los links viejos de convocatoria (…?convocatoria=xxxx) siguen andando: abren el portal en ese cumple
function linkConvocatoria_(token) {
  return urlBase_() + '?convocatoria=' + encodeURIComponent(token);
}

// Crea (una sola vez) el código de convocatoria de la reserva. Tenerlo = fecha publicada para los profes.
function asegurarToken_(sh, filaN) {
  const col = columna_(sh, 'Convocatoria');
  let t = String(sh.getRange(filaN, col).getValue() || '');
  if (!t) {
    t = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
    sh.getRange(filaN, col).setValue(t);
  }
  return t;
}

function buscarPorToken_(token) {
  if (!token) return null;
  const sh = obtenerHoja_();
  const x = leerTodas_(sh).filter(function (r) { return r.token === token; })[0];
  return x ? { sh: sh, filaN: x.filaN, r: x } : null;
}

function buscarPorId_(id) {
  if (!id) return null;
  const sh = obtenerHoja_();
  const x = leerTodas_(sh).filter(function (r) { return String(r.id) === String(id); })[0];
  return x ? { sh: sh, filaN: x.filaN, r: x } : null;
}

function horaLlegada_(hora) {
  const p = String(hora).split(':');
  const m = Number(p[0]) * 60 + Number(p[1] || 0) - CONFIG.minutosAntesProfes;
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
}

function mensajeProfe_(tipo, r, nombre) {
  const quien = nombre ? String(nombre).split(' ')[0] : '';
  const base = '🎈 Cumple de ' + r.cumpleanero + (r.edad ? ' (' + r.edad + ' años)' : '') + '\n' +
    '📅 ' + fechaLarga_(r.fecha) + ' · ' + r.hora + ' a ' + r.horaFin + ' hs\n' +
    '📍 ' + (tipo === 'convocatoria' || tipo === 'base' ? (r.zona || '') : (r.direccion || '') + (r.zona ? ' (' + r.zona + ')' : '')) + '\n' +
    '👦 ' + (r.cantChicos || '?') + ' chicos' + (r.rangoEdades ? ' · ' + r.rangoEdades : '') + ' · ' + (r.paquete || '') +
    (r.extras ? '\n🎁 ' + r.extras : '') +
    '\n💵 ' + (r.pagoProfe ? pesos_(r.pagoProfe) + ' por profe' : 'según tu nivel');
  if (tipo === 'convocatoria') {
    return '📣 CONVOCATORIA GLORIN\n' + base + '\n👥 Necesitamos ' + necesarios_(r) + ' profe' + (necesarios_(r) > 1 ? 's' : '') +
      '\n\n¿Quién puede? Proponete desde el portal de profes 👉 ' + linkConvocatoria_(r.token) +
      '\nArmamos el equipo y a los que quedan les llega la confirmación por mail 📅';
  }
  if (tipo === 'recordatorio') {
    return '¡Hola ' + quien + '! Mañana tenemos cumple 💪\n' + base + '\n⏰ Llegada: ' + horaLlegada_(r.hora) + ' hs para armar' +
      '\n👥 Equipo: ' + r.asignados.join(', ') + '\n📞 Familia: ' + r.adulto + ' · ' + r.whatsapp;
  }
  return base;
}

// Menú: cuadrito con el link, mensaje para el grupo y un botón por profe
function menuConvocar() {
  const sh = SpreadsheetApp.getActiveSheet();
  const filaN = sh.getActiveRange().getRow();
  if (sh.getName() !== HOJA || filaN < 2) throw new Error('Seleccioná una reserva en la pestaña ' + HOJA + '.');
  obtenerHoja_();
  const token = asegurarToken_(sh, filaN);
  const r = leerFila_(sh, filaN);
  if (!r.profesNecesarios) sh.getRange(filaN, columna_(sh, 'Profes necesarios')).setValue(necesarios_(r));
  const msg = mensajeProfe_('convocatoria', r);
  const profes = leerProfes_().filter(function (p) { return p.activo; });
  const estilo = 'display:block;margin:6px 0;padding:10px 12px;color:#fff;border-radius:8px;text-decoration:none;font-family:Arial;font-weight:bold';
  const individuales = profes.filter(function (p) { return p.whatsapp && !tieneNombre_(r.asignados, p.nombre); }).map(function (p) {
    return '<a target="_blank" style="' + estilo + ';background:#25D366" href="' + esc_(linkWhatsApp_(p.whatsapp, '¡Hola ' + p.nombre.split(' ')[0] + '!\n' + msg)) + '">💬 ' + esc_(p.nombre) + '</a>';
  }).join('');
  const html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:14px">' +
    '<p><b>Cumple de ' + esc_(r.cumpleanero) + '</b> · ' + esc_(fechaLarga_(r.fecha)) + ' ' + esc_(r.hora) + ' hs<br>' +
    'Equipo: <b>' + r.asignados.length + ' de ' + necesarios_(r) + '</b>' + (r.asignados.length ? ' (' + esc_(r.asignados.join(', ')) + ')' : '') +
    (r.postulados.length ? '<br>Se propusieron: ' + esc_(r.postulados.join(', ')) : '') + '</p>' +
    '<p style="color:#666">El equipo lo elegís desde el <a target="_blank" href="' + esc_(linkPortal_(r.id)) + '">portal de profes</a>.</p>' +
    '<b>Texto para el grupo de profes:</b>' +
    '<textarea id="txt" readonly style="width:100%;height:150px;margin:6px 0;font:13px Arial;border:1px solid #ddd;border-radius:8px;padding:8px">' + esc_(msg) + '</textarea>' +
    '<button onclick="var t=document.getElementById(\'txt\');t.select();document.execCommand(\'copy\');this.textContent=\'✓ Copiado: pegalo en el grupo\'" style="' + estilo + ';background:#1A1A1A;border:none;width:100%;cursor:pointer">📋 Copiar texto</button>' +
    '<a target="_blank" style="' + estilo + ';background:#128C7E" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">📣 Abrir WhatsApp y elegir el grupo</a>' +
    (profes.some(function (p) { return p.email; }) ? '<button onclick="this.disabled=true;this.textContent=\'Enviando…\';google.script.run.withSuccessHandler(function(n){document.getElementById(\'ok\').textContent=\'Mail enviado a \'+n+\' profes\';}).mailConvocatoriaFila(' + filaN + ')" style="' + estilo + ';background:#C8161A;border:none;width:100%;cursor:pointer">✉️ Mandar por mail a todos los activos</button><p id="ok" style="color:#1E8E5A"></p>' : '') +
    (individuales ? '<p style="margin:12px 0 4px;color:#666">O de a uno:</p>' + individuales : '<p style="color:#666">Cuando los profes creen su cuenta en el portal (o los cargues en la pestaña <b>Profes</b>) vas a tener un botón por cada uno.</p>') +
    '<p style="color:#666;font-size:12px;word-break:break-all">Link: ' + esc_(linkConvocatoria_(token)) + '</p></div>')
    .setWidth(400).setHeight(620);
  SpreadsheetApp.getUi().showModalDialog(html, 'Convocar profes');
}

function menuPortal() {
  const html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:14px">' +
    '<p>Este es el link del portal. Pasáselo a los profes para que creen su cuenta, y entrá vos con el mail <b>' +
    esc_(emailsAdmin_()[0] || '') + '</b> para manejar fechas, equipos y pagos.</p>' +
    '<p style="word-break:break-all;background:#f6f6f6;padding:10px;border-radius:8px">' + esc_(linkPortal_()) + '</p>' +
    '<a target="_blank" href="' + esc_(linkPortal_()) + '" style="display:block;text-align:center;padding:12px;background:#C8161A;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold">Abrir el portal</a></div>')
    .setWidth(380).setHeight(260);
  SpreadsheetApp.getUi().showModalDialog(html, 'Portal de profes');
}

function mailConvocatoriaFila(filaN) { return mailConvocatoriaProfes_(obtenerHoja_(), Number(filaN)); }

function mailConvocatoriaProfes_(sh, filaN) {
  asegurarToken_(sh, filaN);
  const r = leerFila_(sh, filaN);
  if (r.asignados.length >= necesarios_(r)) return 0;
  const destinatarios = leerProfes_().filter(function (p) {
    return p.activo && p.email && !tieneNombre_(r.asignados, p.nombre) && !tieneNombre_(r.postulados, p.nombre);
  });
  destinatarios.forEach(function (p) {
    MailApp.sendEmail({ to: p.email, name: CONFIG.marca,
      subject: '📣 Nueva fecha GLORIN · ' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs',
      body: '¡Hola ' + p.nombre.split(' ')[0] + '!\n' + mensajeProfe_('convocatoria', r),
      htmlBody: '<div style="font-family:Arial;font-size:15px">¡Hola ' + esc_(p.nombre.split(' ')[0]) + '! Hay una fecha nueva y necesitamos ' +
        necesarios_(r) + ' profe' + (necesarios_(r) > 1 ? 's' : '') + '.' + fichaEvento_(r, false) +
        boton_(linkPortal_(r.id), '🙋 Me propongo', '#C8161A') +
        '<p style="color:#777;font-size:13px">Armamos el equipo entre los que se proponen y te avisamos por mail.</p></div>' });
  });
  return destinatarios.length;
}

// Tabla con los datos del cumple para los mails de profes (dirección y familia solo si ya está en el equipo)
function fichaEvento_(r, completo, nombre) {
  const fila = function (a, b) { return b ? '<tr><td style="padding:4px 12px 4px 0;color:#777;vertical-align:top">' + a + '</td><td style="padding:4px 0"><b>' + esc_(b) + '</b></td></tr>' : ''; };
  return '<table style="border-collapse:collapse;margin:12px 0">' +
    fila('Cumple', r.cumpleanero + (r.edad ? ' (' + r.edad + ' años)' : '')) +
    fila('Fecha', fechaLarga_(r.fecha)) +
    fila('Horario', r.hora + ' a ' + r.horaFin + ' hs') +
    fila('Llegada', horaLlegada_(r.hora) + ' hs para armar') +
    fila(completo ? 'Dirección' : 'Zona', completo ? (r.direccion || '') + (r.zona ? ' (' + r.zona + ')' : '') : r.zona) +
    fila('Chicos', (r.cantChicos || '?') + (r.rangoEdades ? ' · ' + r.rangoEdades : '')) +
    fila('Paquete', r.paquete) + fila('Extras', r.extras) +
    (completo ? fila('Equipo', r.asignados.join(', ')) + fila('Familia', r.adulto ? r.adulto + ' · ' + r.whatsapp : '') : '') +
    (nombre ? fila('Tu pago', (function (x) { return (x.monto === '' ? 'a definir' : pesos_(x.monto)) + ' (' + x.detalle + ')'; })(pagoDe_(r, nombre)))
            : fila('Pago', r.pagoProfe ? pesos_(r.pagoProfe) + ' por profe' : tarifasTexto_())) +
    (completo && r.llevan && r.llevan.length ? fila('Lleva elementos', r.llevan.join(', ')) : '') +
    '</table>';
}

function mailProfe_(tipo, p, r, x) {
  if (!p || !p.email) return;
  x = x || {};
  const nombre = esc_(String(p.nombre || '').split(' ')[0]);
  let asunto = '', intro = '', completo = false, boton = r ? linkPortal_(r.id) : linkPortal_();
  if (tipo === 'confirmado') {
    asunto = '✅ Quedaste en el equipo · Cumple de ' + r.cumpleanero + ' · ' + fechaLarga_(r.fecha);
    intro = '¡Hola ' + nombre + '! Quedaste <b>confirmado/a</b> para este cumple. Ya te llega el evento al calendario. 🎉';
    completo = true;
  } else if (tipo === 'quitado') {
    asunto = 'Cambio de equipo · Cumple de ' + r.cumpleanero + ' · ' + fechaLarga_(r.fecha);
    intro = '¡Hola ' + nombre + '! Hubo un cambio y para este cumple <b>ya no estás en el equipo</b>. Cualquier duda, escribinos.';
  } else if (tipo === 'suplente') {
    asunto = 'Quedaste como suplente · Cumple de ' + r.cumpleanero;
    intro = '¡Hola ' + nombre + '! Gracias por proponerte. Esta vez el equipo ya quedó armado: quedaste como <b>suplente</b>. Si alguien se baja, te avisamos.';
  } else if (tipo === 'recordatorio') {
    asunto = (x.dias === 1 ? '⏰ Mañana' : '⏰ En ' + x.dias + ' días') + ' · Cumple de ' + r.cumpleanero + ' ' + r.hora + ' hs';
    intro = '¡Hola ' + nombre + '! Te recordamos que ' + (x.dias === 1 ? '<b>mañana</b>' : 'en <b>' + x.dias + ' días</b>') +
      ' tenemos cumple. Llegada ' + horaLlegada_(r.hora) + ' hs para armar. 💪';
    completo = true;
  } else if (tipo === 'cancelado') {
    asunto = '❌ Se canceló el cumple de ' + r.cumpleanero + ' · ' + fechaLarga_(r.fecha);
    intro = '¡Hola ' + nombre + '! Te avisamos que este cumple <b>se canceló</b>. Ese horario te queda libre.';
  } else if (tipo === 'pago') {
    asunto = '💵 Te pagamos ' + pesos_(x.monto) + ' · Cumple de ' + r.cumpleanero;
    intro = '¡Hola ' + nombre + '! Te registramos el pago de <b>' + pesos_(x.monto) + '</b> por el cumple de ' + esc_(r.cumpleanero) +
      ' (' + esc_(fechaLarga_(r.fecha)) + '). ¡Gracias por tu laburo!';
    r = null;
  } else if (tipo === 'aprobado') {
    asunto = '🎈 Ya podés entrar al portal de profes de ' + CONFIG.marca;
    intro = '¡Hola ' + nombre + '! Tu cuenta quedó aprobada. Ya podés ver las fechas y proponerte.';
  } else if (tipo === 'clave') {
    asunto = 'Cambiar tu contraseña · ' + CONFIG.marca;
    intro = '¡Hola ' + nombre + '! Pediste cambiar la contraseña del portal de profes. El link vale por 1 hora. Si no fuiste vos, ignorá este mail.';
    boton = x.link;
  }
  const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:560px">' +
    '<h2 style="color:#C8161A;margin:0 0 12px">' + esc_(CONFIG.marca) + ' · Profes</h2><p>' + intro + '</p>' +
    (r ? fichaEvento_(r, completo, completo ? p.nombre : '') : '') +
    boton_(boton, tipo === 'clave' ? 'Elegir contraseña nueva' : 'Abrir el portal de profes', '#C8161A') + '</div>';
  MailApp.sendEmail({ to: p.email, subject: asunto, htmlBody: html, name: CONFIG.marca, replyTo: CONFIG.emailAviso || undefined,
                      body: asunto + (r ? '\n\n' + mensajeProfe_('base', r) : '') + '\n\n' + boton });
}

function avisarAdmin_(asunto, texto, id) {
  try {
    MailApp.sendEmail({ to: CONFIG.emailAviso || Session.getEffectiveUser().getEmail(), subject: '👥 GLORIN · ' + asunto, name: CONFIG.marca,
      body: texto + '\n\n' + linkPortal_(id),
      htmlBody: '<div style="font-family:Arial;font-size:15px"><p>' + esc_(texto).replace(/\n/g, '<br>') + '</p>' + boton_(linkPortal_(id), 'Abrir el portal', '#C8161A') + '</div>' });
  } catch (e) { console.error(e); }
}

// Agrega a los profes como invitados del evento (les queda en su calendario) y anota el equipo en la descripción
function actualizarEquipoEnCalendario_(r, asignados) {
  if (!r.eventoId) return;
  const ev = obtenerCalendario_().getEventById(r.eventoId);
  if (!ev) return;
  const profes = leerProfes_();
  const invitados = ev.getGuestList().map(function (g) { return g.getEmail().toLowerCase(); });
  asignados.forEach(function (n) {
    const p = buscarProfe_(profes, n);
    if (p && p.email && invitados.indexOf(p.email) < 0) { try { ev.addGuest(p.email); } catch (e) {} }
  });
  r.asignados.filter(function (n) { return !tieneNombre_(asignados, n); }).forEach(function (n) {
    const p = buscarProfe_(profes, n);
    if (p && p.email) { try { ev.removeGuest(p.email); } catch (e) {} }
  });
  const desc = String(ev.getDescription() || '').replace(/\n?PROFES:.*$/m, '');
  ev.setDescription(desc + '\nPROFES: ' + (asignados.join(', ') || '-') + ' (' + asignados.length + '/' + necesarios_(r) + ')');
}

// ---- Pagos a profes (pestaña "Pagos") ----
function obtenerHojaPagos_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_PAGOS);
  if (!sh) {
    sh = ss.insertSheet(HOJA_PAGOS);
    sh.appendRow(COLUMNAS_PAGOS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS_PAGOS.length).setFontWeight('bold').setBackground('#C8161A').setFontColor('#FFFFFF');
    sh.getRange(2, COLUMNAS_PAGOS.indexOf('Estado') + 1, 1000, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Pendiente', 'Pagado', 'Anulado'], true).build());
  } else {
    const actuales = encabezados_(sh);
    const faltan = COLUMNAS_PAGOS.filter(function (c) { return actuales.indexOf(c) < 0; });
    if (faltan.length) sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  return sh;
}

function leerPagos_() {
  const sh = obtenerHojaPagos_();
  if (sh.getLastRow() < 2) return [];
  const h = encabezados_(sh);
  const tz = Session.getScriptTimeZone();
  const g = function (f, n) { const i = h.indexOf(n); return i < 0 ? '' : f[i]; };
  const txt = function (x) { return x instanceof Date ? Utilities.formatDate(x, tz, 'yyyy-MM-dd') : String(x || ''); };
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getValues().map(function (f, i) {
    return { fila: i + 2, id: String(g(f, 'ID pago')), reserva: String(g(f, 'Reserva')), fecha: txt(g(f, 'Fecha evento')),
             cumple: String(g(f, 'Cumple')), profe: String(g(f, 'Profe')), monto: Number(g(f, 'Monto')) || 0,
             estado: String(g(f, 'Estado') || 'Pendiente'), fechaPago: txt(g(f, 'Fecha de pago')), notas: String(g(f, 'Notas') || ''),
             detalle: String(g(f, 'Detalle') || '') };
  }).filter(function (p) { return p.id; });
}

// Deja en "Pagos" una fila por cada profe del equipo. Los que salen del equipo quedan "Anulado" (no se borra nada).
function sincronizarPagos_(r, asignados) {
  const sh = obtenerHojaPagos_();
  const profes = leerProfes_();
  const col = function (n) { return COLUMNAS_PAGOS.indexOf(n) + 1; };
  const deEste = leerPagos_().filter(function (p) { return p.reserva === String(r.id); });
  deEste.forEach(function (p) {
    const sigue = tieneNombre_(asignados, p.profe);
    if (!sigue && p.estado === 'Pendiente') sh.getRange(p.fila, col('Estado')).setValue('Anulado');
    if (sigue && p.estado !== 'Pagado') {
      const x = pagoDe_(r, p.profe, profes);
      sh.getRange(p.fila, col('Estado')).setValue('Pendiente');
      sh.getRange(p.fila, col('Monto')).setValue(x.monto);
      sh.getRange(p.fila, col('Detalle')).setValue(x.detalle);
      sh.getRange(p.fila, col('Fecha evento')).setValue("'" + r.fecha);
    }
  });
  asignados.forEach(function (n) {
    if (deEste.some(function (p) { return p.profe.toLowerCase() === n.toLowerCase(); })) return;
    const x = pagoDe_(r, n, profes);
    sh.appendRow(['PG-' + Utilities.getUuid().slice(0, 8).toUpperCase(), r.id, "'" + r.fecha, limpiarCelda_(r.cumpleanero),
                  n, x.monto, 'Pendiente', '', '', x.detalle]);
  });
}

// ---- Cuentas y sesiones ----
function emailsAdmin_() {
  const l = (CONFIG.adminEmails || []).map(function (m) { return String(m).trim().toLowerCase(); });
  const yo = Session.getEffectiveUser().getEmail();
  if (yo) l.unshift(yo.toLowerCase());
  if (CONFIG.emailAviso) l.push(CONFIG.emailAviso.toLowerCase());
  return l.filter(String);
}

function esAdmin_(email) { return emailsAdmin_().indexOf(String(email || '').toLowerCase()) >= 0; }

function hashClave_(clave, sal) {
  sal = sal || Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  let h = sal + '|' + clave;
  for (let i = 0; i < 200; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + '|' + sal, Utilities.Charset.UTF_8));
  }
  return sal + ':' + h;
}

function claveOk_(clave, guardada) {
  if (!guardada || guardada.indexOf(':') < 0) return false;
  return hashClave_(String(clave || ''), guardada.split(':')[0]) === guardada;
}

function crearSesion_(email) {
  const props = PropertiesService.getScriptProperties();
  const ahora = Date.now();
  // Limpieza de sesiones vencidas
  const todas = props.getProperties();
  Object.keys(todas).forEach(function (k) {
    if (k.indexOf('ses_') !== 0) return;
    try { if (JSON.parse(todas[k]).x < ahora) props.deleteProperty(k); } catch (e) { props.deleteProperty(k); }
  });
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 40);
  props.setProperty('ses_' + token, JSON.stringify({ e: email, x: ahora + (CONFIG.diasSesion || 60) * 86400000 }));
  return token;
}

// Devuelve el profe logueado. Si la sesión no sirve tira 'SESION' (la página vuelve a pedir el ingreso).
function usuario_(token) {
  token = String(token || '');
  if (!/^[a-f0-9]{40}$/.test(token)) throw new Error('SESION');
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty('ses_' + token);
  if (!raw) throw new Error('SESION');
  const s = JSON.parse(raw);
  if (s.x < Date.now()) { props.deleteProperty('ses_' + token); throw new Error('SESION'); }
  const p = buscarProfePorEmail_(leerProfes_(), s.e);
  if (!p) throw new Error('SESION');
  const admin = esAdmin_(p.email);
  if (!p.activo && !admin) { props.deleteProperty('ses_' + token); throw new Error('SESION'); }
  return { profe: p, admin: admin };
}

function soloAdmin_(token) {
  const u = usuario_(token);
  if (!u.admin) throw new Error('Esto es solo para administración.');
  return u;
}

function portalRegistrar(d) {
  d = d || {};
  const nombre = String(d.nombre || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const email = String(d.email || '').trim().toLowerCase();
  const whatsapp = String(d.whatsapp || '').trim().slice(0, 30);
  const clave = String(d.clave || '');
  if (nombre.length < 3 || nombre.indexOf(',') >= 0) throw new Error('Poné tu nombre y apellido (sin comas).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Revisá el mail.');
  if (whatsapp.replace(/\D/g, '').length < 10) throw new Error('Revisá el WhatsApp: código de área y número (ej: 351 6197928).');
  if (clave.length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Probá de nuevo en unos segundos.');
  let estado, nombreFinal;
  try {
    const profes = leerProfes_();
    const porEmail = buscarProfePorEmail_(profes, email);
    if (porEmail && porEmail.clave) throw new Error('Ya hay una cuenta con ese mail. Ingresá, o tocá "Me olvidé la contraseña".');
    const porNombre = buscarProfe_(profes, nombre);
    // Si vos ya lo habías cargado a mano (mismo mail, o mismo nombre sin mail), se queda con esa fila
    const existente = porEmail || (porNombre && !porNombre.email && !porNombre.clave ? porNombre : null);
    if (!existente && porNombre) throw new Error('Ya hay un profe con ese nombre. Agregá tu apellido o un apodo.');
    estado = (existente && existente.activo) || esAdmin_(email) || !CONFIG.aprobarCuentas ? 'Sí' : 'Pendiente';
    const ahora = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    nombreFinal = existente && existente.nombre ? existente.nombre : nombre;
    const campos = { 'Nombre': nombreFinal, 'WhatsApp': whatsapp, 'Email': email, 'Activo': estado,
                     'Clave': hashClave_(clave), 'Alta': ahora, 'Último ingreso': ahora };
    if (existente) escribirProfe_(existente.fila, campos);
    else {
      const sh = obtenerHojaProfes_();
      sh.appendRow(encabezados_(sh).map(function (h) { return campos[h] === undefined ? '' : limpiarCelda_(campos[h]); }));
    }
  } finally {
    lock.releaseLock();
  }
  if (estado === 'Pendiente') {
    avisarAdmin_('Nuevo profe pide cuenta', nombreFinal + ' (' + email + ' · ' + whatsapp + ') creó su cuenta en el portal. ' +
      'Aprobala desde el portal (pestaña Profes) o poniendo Activo = Sí en la planilla.');
    return { pendiente: true };
  }
  return { token: crearSesion_(email) };
}

function portalIngresar(email, clave) {
  email = String(email || '').trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const clave_intentos = 'int_' + email;
  const intentos = Number(cache.get(clave_intentos) || 0);
  if (intentos >= 6) throw new Error('Demasiados intentos. Esperá 10 minutos o tocá "Me olvidé la contraseña".');
  const p = buscarProfePorEmail_(leerProfes_(), email);
  if (!p || !claveOk_(clave, p.clave)) {
    cache.put(clave_intentos, String(intentos + 1), 600);
    if (p && !p.clave) throw new Error('Todavía no creaste tu contraseña con ese mail: tocá "Crear cuenta".');
    throw new Error('Mail o contraseña incorrectos.');
  }
  if (!p.activo && !esAdmin_(p.email)) {
    if (/pend/i.test(p.estado)) throw new Error('Tu cuenta todavía no fue aprobada. Te llega un mail cuando esté lista.');
    throw new Error('Tu cuenta está desactivada. Escribile a ' + CONFIG.marca + '.');
  }
  cache.remove(clave_intentos);
  escribirProfe_(p.fila, { 'Último ingreso': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm') });
  return { token: crearSesion_(p.email) };
}

function portalSalir(token) {
  if (/^[a-f0-9]{40}$/.test(String(token || ''))) PropertiesService.getScriptProperties().deleteProperty('ses_' + token);
  return true;
}

// Manda un link para elegir contraseña nueva. Siempre responde igual (no revela qué mails existen).
function portalOlvide(email) {
  const p = buscarProfePorEmail_(leerProfes_(), email);
  if (p) {
    const cache = CacheService.getScriptCache();
    if (!cache.get('rstm_' + p.email)) {          // un mail cada 2 minutos como mucho
      const codigo = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '').slice(0, 32);
      cache.put('rst_' + codigo, p.email, 3600);
      cache.put('rstm_' + p.email, '1', 120);
      mailProfe_('clave', p, null, { link: urlBase_() + '?profes=1&reset=' + codigo });
    }
  }
  return true;
}

function portalNuevaClave(codigo, clave) {
  codigo = String(codigo || '');
  if (String(clave || '').length < 6) throw new Error('La contraseña tiene que tener al menos 6 caracteres.');
  const cache = CacheService.getScriptCache();
  const email = /^[a-f0-9]{32}$/.test(codigo) ? cache.get('rst_' + codigo) : null;
  if (!email) throw new Error('El link venció o ya se usó. Pedí uno nuevo con "Me olvidé la contraseña".');
  const p = buscarProfePorEmail_(leerProfes_(), email);
  if (!p) throw new Error('No encuentro tu cuenta.');
  escribirProfe_(p.fila, { 'Clave': hashClave_(clave) });
  cache.remove('rst_' + codigo);
  if (!p.activo && !esAdmin_(p.email)) return { pendiente: true };
  return { token: crearSesion_(p.email) };
}

function portalCambiarDatos(token, d) {
  const u = usuario_(token);
  d = d || {};
  const campos = {};
  if (d.whatsapp !== undefined) {
    if (String(d.whatsapp).replace(/\D/g, '').length < 10) throw new Error('Revisá el WhatsApp.');
    campos['WhatsApp'] = String(d.whatsapp).trim().slice(0, 30);
  }
  if (d.claveNueva) {
    if (!claveOk_(d.claveActual, u.profe.clave)) throw new Error('La contraseña actual no es correcta.');
    if (String(d.claveNueva).length < 6) throw new Error('La contraseña nueva tiene que tener al menos 6 caracteres.');
    campos['Clave'] = hashClave_(d.claveNueva);
  }
  escribirProfe_(u.profe.fila, campos);
  return conMensaje_(portalDatos(token), 'Listo, guardamos los cambios.');
}

function portalResolverConvocatoria(codigo) {
  const x = buscarPorToken_(String(codigo || '').slice(0, 40));
  return x ? x.r.id : '';
}

function conMensaje_(datos, mensaje) { datos.mensaje = mensaje; return datos; }

// ---- Datos del portal ----
function portalDatos(token) {
  const u = usuario_(token);
  const yo = u.profe.nombre;
  const tz = Session.getScriptTimeZone();
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const desde = Utilities.formatDate(new Date(Date.now() - 90 * 86400000), tz, 'yyyy-MM-dd');
  const profesTodos = leerProfes_();
  const eventos = leerTodas_(obtenerHoja_()).filter(function (r) {
    if (!r.id || !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha) || r.fecha < desde) return false;
    const mio = tieneNombre_(r.asignados, yo) || tieneNombre_(r.postulados, yo);
    if (u.admin) return r.fecha >= hoy || r.estado !== 'Cancelado' || mio;
    if (mio) return true;
    return r.token && r.fecha >= hoy && r.estado !== 'Cancelado' && r.estado !== 'Realizado';
  }).map(function (r) { return eventoParaPortal_(r, yo, u.admin, hoy, profesTodos); })
    .sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });

  const pagos = leerPagos_().filter(function (p) {
    return p.estado !== 'Anulado' && (u.admin || p.profe.toLowerCase() === yo.toLowerCase());
  }).map(function (p) { return { id: p.id, reserva: p.reserva, fecha: p.fecha, cumple: p.cumple, profe: p.profe, monto: p.monto, estado: p.estado, fechaPago: p.fechaPago, detalle: p.detalle }; });

  const salida = {
    yo: { nombre: yo, email: u.profe.email, whatsapp: u.profe.whatsapp, admin: u.admin },
    hoy: hoy, eventos: eventos, pagos: pagos, marca: CONFIG.marca
  };
  if (u.admin) {
    salida.profes = leerProfes_().map(function (p) {
      return { nombre: p.nombre, email: p.email, whatsapp: p.whatsapp, estado: p.estado || 'No', activo: p.activo, cuenta: !!p.clave, nivel: p.nivel };
    });
    salida.paquetes = CONFIG.paquetes.map(function (p) { return { nombre: p.nombre, profes: p.profes }; });
    salida.tarifas = CONFIG.tarifasProfes;
    salida.extraElementos = CONFIG.extraElementos;
    salida.zonas = CONFIG.zonas.map(function (z) { return z.nombre; });
    salida.estados = ESTADOS;
    salida.duracionMin = CONFIG.duracionMin;
  }
  return salida;
}

function eventoParaPortal_(r, yo, admin, hoy, profes) {
  const asignado = tieneNombre_(r.asignados, yo);
  const postulado = tieneNombre_(r.postulados, yo);
  const necesarios = necesarios_(r);
  let mio = '';
  if (asignado) mio = 'asignado';
  else if (postulado) mio = r.asignados.length >= necesarios ? 'suplente' : 'postulado';
  const e = {
    id: r.id, fecha: r.fecha, fechaTxt: fechaLarga_(r.fecha), hora: r.hora, horaFin: r.horaFin, llegada: horaLlegada_(r.hora),
    zona: r.zona, paquete: r.paquete, chicos: r.cantChicos, edades: r.rangoEdades, extras: r.extras,
    cumpleanero: r.cumpleanero, edad: r.edad, necesarios: necesarios, asignados: r.asignados,
    pago: (function (x) { return x.monto === '' ? null : x.monto; })(pagoDe_(r, yo, profes)),
    llevoElementos: tieneNombre_(r.llevan, yo), estado: r.estado, cancelado: r.estado === 'Cancelado',
    pasado: r.fecha < hoy, publicada: !!r.token, mio: mio
  };
  if (admin || asignado) { e.direccion = r.direccion; e.familia = r.adulto ? r.adulto + ' · ' + r.whatsapp : ''; e.waFamilia = r.whatsapp ? 'https://wa.me/' + normalizarWhatsApp_(r.whatsapp) : ''; }
  if (admin) {
    e.postulados = r.postulados; e.adulto = r.adulto; e.whatsapp = r.whatsapp; e.notas = r.comentarios;
    e.necesariosGuardado = r.profesNecesarios || '';
    e.pagoFijo = r.pagoProfe === '' ? null : Number(r.pagoProfe);
    e.llevan = r.llevan;
  }
  return e;
}

// ---- Acciones del profe ----
function portalPostular(token, id, quiero) {
  const u = usuario_(token);
  const yo = u.profe.nombre;
  const hoy = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Mucha gente respondiendo a la vez. Probá de nuevo.');
  let aviso = '', asunto = '', mensaje = '', r;
  try {
    const x = buscarPorId_(id);
    if (!x) throw new Error('No encuentro esa fecha.');
    r = x.r;
    if (r.estado === 'Cancelado') throw new Error('Este cumple se canceló.');
    if (!r.token && !u.admin) throw new Error('Esta fecha todavía no está publicada.');
    if (r.fecha < hoy) throw new Error('Esa fecha ya pasó.');
    let postulados = sinNombre_(r.postulados, yo), asignados = r.asignados, suplentes = sinNombre_(r.suplentes, yo);
    const cuando = r.cumpleanero + ' (' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs)';
    if (quiero) {
      postulados.push(yo);
      mensaje = '¡Listo! Te propusiste ✋ Cuando armemos el equipo te llega un mail.';
      if (CONFIG.avisarPostulaciones) {
        asunto = yo + ' se propuso';
        aviso = yo + ' se propuso para el cumple de ' + cuando + '. Van ' + postulados.length + ' propuestos para ' + necesarios_(r) + ' lugares.';
      }
    } else if (tieneNombre_(asignados, yo)) {
      asignados = sinNombre_(asignados, yo);
      actualizarEquipoEnCalendario_(r, asignados);
      sincronizarPagos_(r, asignados);
      mensaje = 'Listo, te bajamos de este cumple y le avisamos a ' + CONFIG.marca + '.';
      asunto = '⚠️ ' + yo + ' se bajó';
      aviso = '⚠️ ' + yo + ' se bajó del cumple de ' + cuando + '. El equipo quedó en ' + asignados.length + ' de ' + necesarios_(r) + '.' +
        (suplentes.length ? '\nSuplentes que se habían propuesto: ' + suplentes.join(', ') + '.' : '') + '\nElegí el reemplazo desde el portal.';
    } else {
      mensaje = 'Listo, sacamos tu propuesta.';
    }
    x.sh.getRange(x.filaN, columna_(x.sh, 'Postulados')).setValue(postulados.join(', '));
    x.sh.getRange(x.filaN, columna_(x.sh, 'Profes asignados')).setValue(asignados.join(', '));
    x.sh.getRange(x.filaN, columna_(x.sh, 'Suplentes')).setValue(suplentes.join(', '));
  } finally {
    lock.releaseLock();
  }
  if (aviso) avisarAdmin_(asunto, aviso, r.id);
  return conMensaje_(portalDatos(token), mensaje);
}

// ---- Acciones de administración ----
// Elegir el equipo: a los nuevos les llega la confirmación, a los que salen el aviso,
// y a los que se propusieron y no quedaron, que son suplentes.
function portalConfirmarEquipo(token, id, nombres, pago, llevan) {
  soloAdmin_(token);
  const profes = leerProfes_();
  const elegidos = [];
  (nombres || []).forEach(function (n) {
    const p = buscarProfe_(profes, n);
    if (!p) throw new Error('No encuentro a ' + n + ' en la lista de profes.');
    if (!tieneNombre_(elegidos, p.nombre)) elegidos.push(p.nombre);
  });
  const monto = pago === '' || pago === null || pago === undefined ? '' : Math.max(0, Math.round(Number(pago) || 0));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Probá de nuevo en unos segundos.');
  let r, nuevos, quitados, suplentesNuevos;
  try {
    const x = buscarPorId_(id);
    if (!x) throw new Error('No encuentro esa fecha.');
    r = x.r;
    if (r.estado === 'Cancelado') throw new Error('Este cumple está cancelado.');
    const postulados = r.postulados.slice();
    elegidos.forEach(function (n) { if (!tieneNombre_(postulados, n)) postulados.push(n); });
    const suplentes = postulados.filter(function (n) { return !tieneNombre_(elegidos, n); });
    nuevos = elegidos.filter(function (n) { return !tieneNombre_(r.asignados, n); });
    quitados = r.asignados.filter(function (n) { return !tieneNombre_(elegidos, n); });
    suplentesNuevos = suplentes.filter(function (n) { return !tieneNombre_(r.suplentes, n) && !tieneNombre_(quitados, n); });
    const sh = x.sh, f = x.filaN;
    sh.getRange(f, columna_(sh, 'Profes asignados')).setValue(elegidos.join(', '));
    sh.getRange(f, columna_(sh, 'Postulados')).setValue(postulados.join(', '));
    sh.getRange(f, columna_(sh, 'Suplentes')).setValue(suplentes.join(', '));
    sh.getRange(f, columna_(sh, 'Pago por profe')).setValue(monto);
    sh.getRange(f, columna_(sh, 'Lleva elementos')).setValue((llevan || []).map(function (n) {
      const p = buscarProfe_(profes, n); return p ? p.nombre : '';
    }).filter(function (n) { return n && tieneNombre_(elegidos, n); }).join(', '));
    if (!r.profesNecesarios) sh.getRange(f, columna_(sh, 'Profes necesarios')).setValue(necesarios_(r));
    actualizarEquipoEnCalendario_(r, elegidos);
    r = leerFila_(sh, f);
    sincronizarPagos_(r, elegidos);
  } finally {
    lock.releaseLock();
  }
  let mails = 0;
  const enviar = function (lista, tipo) {
    lista.forEach(function (n) {
      const p = buscarProfe_(profes, n);
      if (p && p.email) { try { mailProfe_(tipo, p, r); mails++; } catch (e) { console.error(e); } }
    });
  };
  enviar(nuevos, 'confirmado');
  enviar(quitados, 'quitado');
  enviar(suplentesNuevos, 'suplente');
  return conMensaje_(portalDatos(token), 'Equipo guardado (' + elegidos.length + ' de ' + necesarios_(r) + ').' +
    (mails ? ' Les avisamos por mail a ' + mails + ' profe' + (mails > 1 ? 's' : '') + '.' : ''));
}

function portalPublicar(token, id) {
  soloAdmin_(token);
  const x = buscarPorId_(id);
  if (!x) throw new Error('No encuentro esa fecha.');
  if (x.r.estado === 'Cancelado') throw new Error('Este cumple está cancelado.');
  if (!x.r.profesNecesarios) x.sh.getRange(x.filaN, columna_(x.sh, 'Profes necesarios')).setValue(necesarios_(x.r));
  const n = mailConvocatoriaProfes_(x.sh, x.filaN);
  return conMensaje_(portalDatos(token), 'Fecha publicada en el portal.' + (n ? ' Les mandamos la convocatoria por mail a ' + n + ' profes.' : ''));
}

// Crear una fecha a mano (cumples que entran por WhatsApp) o editar una que ya existe
function portalGuardarFecha(token, d) {
  soloAdmin_(token);
  d = d || {};
  Object.keys(d).forEach(function (k) { if (typeof d[k] === 'string') d[k] = d[k].trim().slice(0, 500); });
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) throw new Error('Elegí la fecha.');
  if (!hhmm.test(d.hora || '') || !hhmm.test(d.horaFin || '') || d.horaFin <= d.hora) throw new Error('Revisá el horario (la hora de fin tiene que ser después del inicio).');
  if (!d.cumpleanero) throw new Error('Poné el nombre del cumpleañero/a (o un título).');
  const necesarios = Math.max(1, Math.min(10, Math.round(Number(d.necesarios) || 1)));
  const pago = d.pago === '' || d.pago === null || d.pago === undefined ? '' : Math.max(0, Math.round(Number(d.pago) || 0));
  const tz = Session.getScriptTimeZone();
  const aFecha = function (iso, h) {
    const p = h.split(':');
    return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), Number(p[0]), Number(p[1]));
  };
  const ini = aFecha(d.fecha, d.hora), fin = aFecha(d.fecha, d.horaFin);
  const durMin = Math.round((fin - ini) / 60000);
  const sh = obtenerHoja_();
  const campos = {
    'Fecha evento': "'" + d.fecha, 'Hora inicio': "'" + d.hora, 'Hora fin': "'" + d.horaFin, 'Duración': duracionTexto_(durMin),
    'Cumpleañero/a': d.cumpleanero, 'Edad que cumple': d.edad || '', 'Cant. chicos': d.chicos || '', 'Rango de edades': d.edades || '',
    'Zona': d.zona || '', 'Dirección': d.direccion || '', 'Adulto responsable': d.adulto || '', 'WhatsApp': d.whatsapp || '',
    'Paquete': d.paquete || '', 'Extras': d.extras || '', 'Comentarios': d.notas || '',
    'Profes necesarios': necesarios, 'Pago por profe': pago
  };
  const desc = function (id) {
    return ['ID: ' + id, 'Adulto: ' + (d.adulto || '-') + ' · WhatsApp: ' + (d.whatsapp || '-'),
            'Chicos: ' + (d.chicos || '?') + ' (' + (d.edades || '-') + ')', 'Lugar: ' + (d.zona || '-') + ' · ' + (d.direccion || '-'),
            'Paquete: ' + (d.paquete || '-') + ' · Extras: ' + (d.extras || '-'), 'Notas: ' + (d.notas || '-')].join('\n');
  };
  const titulo = function (estado) {
    return (PREFIJO_ESTADO[estado] || estado) + ' · Cumple ' + d.cumpleanero + (d.edad ? ' (' + d.edad + ')' : '') + (d.paquete ? ' · ' + d.paquete : '');
  };
  let id, filaN, mensaje;
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Probá de nuevo en unos segundos.');
  try {
    if (d.id) {
      const x = buscarPorId_(d.id);
      if (!x) throw new Error('No encuentro esa fecha.');
      id = x.r.id; filaN = x.filaN;
      Object.keys(campos).forEach(function (k) { sh.getRange(filaN, columna_(sh, k)).setValue(String(campos[k]).charAt(0) === "'" ? campos[k] : limpiarCelda_(campos[k])); });
      const ev = x.r.eventoId ? obtenerCalendario_().getEventById(x.r.eventoId) : null;
      if (ev) {
        ev.setTime(ini, fin);
        ev.setLocation(d.direccion || '');
        ev.setTitle(titulo(x.r.estado));
      }
      if (x.r.asignados.length) sincronizarPagos_(leerFila_(sh, filaN), x.r.asignados);
      mensaje = 'Cambios guardados.';
    } else {
      id = 'GL-' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
      const estado = ESTADOS.indexOf(d.estado) >= 0 ? d.estado : 'Señado';
      const ev = obtenerCalendario_().createEvent(titulo(estado), ini, fin, { description: desc(id), location: d.direccion || '' });
      try { if (COLOR_ESTADO[estado]) ev.setColor(COLOR_ESTADO[estado]); } catch (e) {}
      campos['ID'] = id; campos['Recibido'] = new Date(); campos['Estado'] = estado; campos['ID evento calendario'] = ev.getId();
      campos['Cómo nos conoció'] = 'Cargado a mano en el portal';
      sh.appendRow(encabezados_(sh).map(function (h) {
        const v = campos[h];
        if (v === undefined || v === null) return '';
        return String(v).charAt(0) === "'" ? v : limpiarCelda_(v);
      }));
      filaN = sh.getLastRow();
      mensaje = 'Fecha creada.';
    }
  } finally {
    lock.releaseLock();
  }
  if (d.publicar) {
    const n = mailConvocatoriaProfes_(sh, filaN);
    mensaje += ' Publicada para los profes' + (n ? ' y convocatoria enviada por mail a ' + n + '.' : '.');
  }
  const datos = conMensaje_(portalDatos(token), mensaje);
  datos.foco = id;
  return datos;
}

function portalEstadoProfe(token, email, estado) {
  soloAdmin_(token);
  if (['Sí', 'No'].indexOf(estado) < 0) throw new Error('Estado inválido.');
  const p = buscarProfePorEmail_(leerProfes_(), email);
  if (!p) throw new Error('No encuentro ese profe.');
  escribirProfe_(p.fila, { 'Activo': estado });
  if (estado === 'Sí' && !p.activo && p.clave) { try { mailProfe_('aprobado', p, null); } catch (e) { console.error(e); } }
  return conMensaje_(portalDatos(token), estado === 'Sí' ? p.nombre + ' quedó activo/a.' : p.nombre + ' quedó desactivado/a.');
}

function portalNivelProfe(token, email, nivel) {
  soloAdmin_(token);
  if (nivel && !CONFIG.tarifasProfes[nivel]) throw new Error('Nivel inválido.');
  const p = buscarProfePorEmail_(leerProfes_(), email);
  if (!p) throw new Error('No encuentro ese profe.');
  escribirProfe_(p.fila, { 'Nivel': nivel || '' });
  return conMensaje_(portalDatos(token), p.nombre + ': ' + (nivel ? nivel + ' (' + pesos_(CONFIG.tarifasProfes[nivel]) + ')' : 'sin nivel') +
    '. Se aplica a los pagos que armes desde ahora.');
}

function portalMarcarPago(token, idPago, pagado) {
  soloAdmin_(token);
  const p = leerPagos_().filter(function (x) { return x.id === String(idPago); })[0];
  if (!p) throw new Error('No encuentro ese pago.');
  const sh = obtenerHojaPagos_();
  const col = function (n) { return COLUMNAS_PAGOS.indexOf(n) + 1; };
  sh.getRange(p.fila, col('Estado')).setValue(pagado ? 'Pagado' : 'Pendiente');
  sh.getRange(p.fila, col('Fecha de pago')).setValue(pagado ? "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '');
  if (pagado && CONFIG.avisarPagoAlProfe) {
    const profe = buscarProfe_(leerProfes_(), p.profe);
    try { mailProfe_('pago', profe, { cumpleanero: p.cumple, fecha: p.fecha }, { monto: p.monto }); } catch (e) { console.error(e); }
  }
  return conMensaje_(portalDatos(token), pagado ? 'Pago a ' + p.profe + ' marcado como pagado.' : 'Pago vuelto a pendiente.');
}

// Funciones que se pueden llamar desde la página publicada afuera (doPost)
const API_PORTAL = {
  portalRegistrar: portalRegistrar, portalIngresar: portalIngresar, portalSalir: portalSalir, portalOlvide: portalOlvide,
  portalNuevaClave: portalNuevaClave, portalCambiarDatos: portalCambiarDatos, portalResolverConvocatoria: portalResolverConvocatoria,
  portalDatos: portalDatos, portalPostular: portalPostular, portalConfirmarEquipo: portalConfirmarEquipo,
  portalPublicar: portalPublicar, portalGuardarFecha: portalGuardarFecha, portalEstadoProfe: portalEstadoProfe,
  portalMarcarPago: portalMarcarPago, portalNivelProfe: portalNivelProfe
};

// ---- Recordatorios automáticos a los profes del equipo ----
function recordatoriosProfes_() {
  const dias = CONFIG.recordatoriosProfes || [];
  if (!dias.length) return 0;
  const sh = obtenerHoja_();
  const tz = Session.getScriptTimeZone();
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const utc = function (iso) { return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))); };
  const profes = leerProfes_();
  let enviados = 0;
  leerTodas_(sh).forEach(function (r) {
    if (r.estado !== 'Señado' || !r.asignados.length || !/^\d{4}-\d{2}-\d{2}$/.test(r.fecha)) return;
    const faltan = Math.round((utc(r.fecha) - utc(hoy)) / 86400000);
    if (dias.indexOf(faltan) < 0) return;
    const ya = lista_(r.recordatorios);
    if (ya.indexOf(String(faltan)) >= 0) return;
    r.asignados.forEach(function (n) {
      const p = buscarProfe_(profes, n);
      if (p && p.email) { try { mailProfe_('recordatorio', p, r, { dias: faltan }); enviados++; } catch (e) { console.error(e); } }
    });
    ya.push(String(faltan));
    sh.getRange(r.filaN, columna_(sh, 'Recordatorios profes')).setValue(ya.join(', '));
  });
  return enviados;
}

// Si se cancela un cumple, les avisamos a los profes del equipo y se anulan sus pagos pendientes
function avisarCancelacionProfes_(r) {
  if (!r.asignados.length) return;
  const profes = leerProfes_();
  r.asignados.forEach(function (n) { try { mailProfe_('cancelado', buscarProfe_(profes, n), r); } catch (e) { console.error(e); } });
  sincronizarPagos_(r, []);
}

// ======== DISPONIBILIDAD ========
function solapados_(dia, hora, dur) {
  if (!dia) return [];
  const p = hora.split(':');
  const ini = Number(p[0]) * 60 + Number(p[1]);
  const fin = ini + dur;
  return dia.eventos.filter(function (e) {
    return ini < e[1] + CONFIG.bufferMin && e[0] < fin + CONFIG.bufferMin;
  });
}

function horarioLibre_(dia, hora, dur) {
  if (!dia) return true;
  if (dia.bloqueado) return false;
  if (dia.eventos.length >= CONFIG.maxPorDia) return false;
  return solapados_(dia, hora, dur).length < CONFIG.maxSimultaneos;
}

function usoEnHorario_(dia, hora, dur, recurso) {
  return solapados_(dia, hora, dur).reduce(function (a, e) { return a + ((e[2] || {})[recurso] || 0); }, 0);
}

// ======== UTILIDADES ========
function pesos_(n) { return '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

function duracionTexto_(min) { return Math.floor(min / 60) + ' h' + (min % 60 ? ' ' + (min % 60) + ' min' : ''); }

function fechaLarga_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso || '');
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return dias[f.getDay()] + ' ' + f.getDate() + ' de ' + meses[f.getMonth()];
}

function linkGoogleCalendar_(titulo, ini, fin, lugar) {
  const f = function (t) { return Utilities.formatDate(t, 'UTC', "yyyyMMdd'T'HHmmss'Z'"); };
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titulo) +
    '&dates=' + f(ini) + '/' + f(fin) + '&location=' + encodeURIComponent(lugar || '');
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
