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
  'Profes necesarios', 'Profes asignados', 'Suplentes', 'Convocatoria'
];
const HOJA_PROFES = 'Profes';
const COLUMNAS_PROFES = ['Nombre', 'WhatsApp', 'Email', 'Activo', 'Notas'];

// ======== SERVIR LA PÁGINA ========
function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (prm.convocatoria) return paginaConvocatoria_(String(prm.convocatoria));
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
    .addItem('👥 Ver la pestaña de profes', 'menuVerProfes')
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
  if (sh.getName() !== HOJA || e.range.getRow() < 2) return;
  const colEstado = columna_(sh, 'Estado');
  if (e.range.getColumn() > colEstado || e.range.getLastColumn() < colEstado) return;
  for (let f = e.range.getRow(); f <= e.range.getLastRow(); f++) {
    aplicarEstado_(sh, f, String(sh.getRange(f, colEstado).getValue()));
  }
}

function aplicarEstado_(sh, filaN, estado) {
  const r = leerFila_(sh, filaN);
  if (!r.eventoId) return;
  const ev = obtenerCalendario_().getEventById(r.eventoId);
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
  sh.getRange(filaN, columna_(sh, 'Último aviso')).setValue(estado + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
}

function leerFila_(sh, filaN) {
  const h = encabezados_(sh);
  const v = sh.getRange(filaN, 1, 1, h.length).getValues()[0];
  const g = function (n) { const i = h.indexOf(n); return i < 0 ? '' : v[i]; };
  const tz = Session.getScriptTimeZone();
  const txt = function (x, fmt) { return x instanceof Date ? Utilities.formatDate(x, tz, fmt) : String(x || ''); };
  const total = Number(g('Total estimado')) || 0;
  return {
    id: g('ID'), estado: g('Estado'), fecha: txt(g('Fecha evento'), 'yyyy-MM-dd'), hora: txt(g('Hora inicio'), 'HH:mm'),
    horaFin: txt(g('Hora fin'), 'HH:mm'), adulto: g('Adulto responsable'), whatsapp: g('WhatsApp'), email: g('Email'),
    cumpleanero: g('Cumpleañero/a'), recibido: g('Recibido'), total: total,
    saldo: Number(g('Saldo')) || (total ? total - (Number(g('Seña')) || 0) : 0),
    eventoId: g('ID evento calendario'), json: g('Detalle completo (JSON)'),
    direccion: g('Dirección'), zona: g('Zona'), paquete: g('Paquete'), cantChicos: g('Cant. chicos'),
    rangoEdades: g('Rango de edades'), edad: g('Edad que cumple'), extras: g('Extras'),
    profesNecesarios: Number(g('Profes necesarios')) || 0,
    asignados: lista_(g('Profes asignados')), suplentes: lista_(g('Suplentes')), token: String(g('Convocatoria') || '')
  };
}

// ======== RESUMEN DIARIO (disparador a las 8 hs) ========
function resumenDiario() {
  const sh = obtenerHoja_();
  const tz = Session.getScriptTimeZone();
  const manana = Utilities.formatDate(new Date(Date.now() + 86400000), tz, 'yyyy-MM-dd');
  const limite = new Date(Date.now() - CONFIG.horasParaSenar * 3600000);
  const enUnaSemana = Utilities.formatDate(new Date(Date.now() + 7 * 86400000), tz, 'yyyy-MM-dd');
  const hoy = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const deManana = [], sinSena = [], faltanProfes = [];
  for (let f = 2; f <= sh.getLastRow(); f++) {
    const r = leerFila_(sh, f);
    if (!r.id) continue;
    if (r.estado === 'Señado' && r.fecha >= hoy && r.fecha <= enUnaSemana && r.asignados.length < necesarios_(r)) faltanProfes.push(r);
    if (r.fecha === manana && (r.estado === 'Señado' || r.estado === 'A confirmar')) deManana.push(r);
    if (r.estado === 'A confirmar' && r.recibido instanceof Date && r.recibido < limite) sinSena.push(r);
  }
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
        (r.token ? '<br><a href="' + esc_(linkConvocatoria_(r.token)) + '" style="color:#C8161A;font-weight:bold">📣 Link de la convocatoria</a>' : '<br>Convocá desde el menú 🎈 GLORIN → Convocar profes') + '</li>';
    }).join('') + '</ul>';
  html += '</div>';
  MailApp.sendEmail({ to: CONFIG.emailAviso || Session.getEffectiveUser().getEmail(),
                      subject: '📋 GLORIN · ' + deManana.length + ' cumple(s) mañana · ' + sinSena.length + ' sin seña' + (faltanProfes.length ? ' · ' + faltanProfes.length + ' sin equipo completo' : ''),
                      htmlBody: html, name: CONFIG.marca });
}

// ======== PROFES: equipo, convocatoria y confirmaciones ========
function obtenerHojaProfes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_PROFES);
  if (!sh) {
    sh = ss.insertSheet(HOJA_PROFES);
    sh.appendRow(COLUMNAS_PROFES);
    sh.appendRow(['Ejemplo Profe (borrame)', '351 1234567', '', 'No', 'Cargá un profe por fila. Activo = Sí para que lo convoquemos.']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS_PROFES.length).setFontWeight('bold').setBackground('#C8161A').setFontColor('#FFFFFF');
    sh.getRange(2, 4, 500, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).build());
    sh.setColumnWidth(1, 180); sh.setColumnWidth(5, 320);
  }
  return sh;
}

function menuVerProfes() { SpreadsheetApp.getActive().setActiveSheet(obtenerHojaProfes_()); }

function leerProfes_() {
  const sh = obtenerHojaProfes_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, COLUMNAS_PROFES.length).getValues()
    .filter(function (f) { return String(f[0]).trim(); })
    .map(function (f) {
      return { nombre: String(f[0]).trim(), whatsapp: String(f[1] || ''), email: String(f[2] || '').trim(),
               activo: /^s/i.test(String(f[3] || '')) };
    });
}

function buscarProfe_(profes, nombre) {
  return profes.filter(function (p) { return p.nombre.toLowerCase() === String(nombre).toLowerCase(); })[0];
}

function lista_(v) {
  return String(v || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

function necesarios_(r) {
  if (r.profesNecesarios) return r.profesNecesarios;
  const paq = CONFIG.paquetes.filter(function (p) { return p.nombre === r.paquete; })[0];
  return paq ? paq.profes : 1;
}

function linkConvocatoria_(token) {
  const base = CONFIG.urlWeb || ScriptApp.getService().getUrl();
  return base + '?convocatoria=' + encodeURIComponent(token);
}

// Crea (una sola vez) el código de convocatoria de la reserva
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
  const sh = obtenerHoja_();
  const col = columna_(sh, 'Convocatoria');
  if (!token || sh.getLastRow() < 2) return null;
  const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === token) return { sh: sh, filaN: i + 2, r: leerFila_(sh, i + 2) };
  }
  return null;
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
    '📍 ' + (tipo === 'convocatoria' ? (r.zona || '') : (r.direccion || '') + (r.zona ? ' (' + r.zona + ')' : '')) + '\n' +
    '👦 ' + (r.cantChicos || '?') + ' chicos' + (r.rangoEdades ? ' · ' + r.rangoEdades : '') + ' · ' + (r.paquete || '') +
    (r.extras ? '\n🎁 ' + r.extras : '');
  if (tipo === 'convocatoria') {
    return '📣 CONVOCATORIA GLORIN\n' + base + '\n👥 Necesitamos ' + necesarios_(r) + ' profe' + (necesarios_(r) > 1 ? 's' : '') +
      '\n\n¿Quién puede? Anotate acá (tocás tu nombre y "Voy") 👉 ' + linkConvocatoria_(r.token) +
      '\nLos primeros ' + necesarios_(r) + ' quedan en el equipo y les llega el evento al calendario 📅';
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
  const individuales = profes.filter(function (p) { return p.whatsapp && r.asignados.indexOf(p.nombre) < 0; }).map(function (p) {
    return '<a target="_blank" style="' + estilo + ';background:#25D366" href="' + esc_(linkWhatsApp_(p.whatsapp, '¡Hola ' + p.nombre.split(' ')[0] + '!\n' + msg)) + '">💬 ' + esc_(p.nombre) + '</a>';
  }).join('');
  const html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:14px">' +
    '<p><b>Cumple de ' + esc_(r.cumpleanero) + '</b> · ' + esc_(fechaLarga_(r.fecha)) + ' ' + esc_(r.hora) + ' hs<br>' +
    'Equipo: <b>' + r.asignados.length + ' de ' + necesarios_(r) + '</b>' + (r.asignados.length ? ' (' + esc_(r.asignados.join(', ')) + ')' : '') +
    (r.suplentes.length ? '<br>Suplentes: ' + esc_(r.suplentes.join(', ')) : '') + '</p>' +
    '<b>Texto para el grupo de profes:</b>' +
    '<textarea id="txt" readonly style="width:100%;height:150px;margin:6px 0;font:13px Arial;border:1px solid #ddd;border-radius:8px;padding:8px">' + esc_(msg) + '</textarea>' +
    '<button onclick="var t=document.getElementById(\'txt\');t.select();document.execCommand(\'copy\');this.textContent=\'✓ Copiado: pegalo en el grupo\'" style="' + estilo + ';background:#1A1A1A;border:none;width:100%;cursor:pointer">📋 Copiar texto</button>' +
    '<a target="_blank" style="' + estilo + ';background:#128C7E" href="https://wa.me/?text=' + encodeURIComponent(msg) + '">📣 Abrir WhatsApp y elegir el grupo</a>' +
    (profes.some(function (p) { return p.email; }) ? '<button onclick="this.disabled=true;this.textContent=\'Enviando…\';google.script.run.withSuccessHandler(function(n){document.getElementById(\'ok\').textContent=\'Mail enviado a \'+n+\' profes\';}).mailConvocatoriaFila(' + filaN + ')" style="' + estilo + ';background:#C8161A;border:none;width:100%;cursor:pointer">✉️ Mandar por mail a todos los activos</button><p id="ok" style="color:#1E8E5A"></p>' : '') +
    (individuales ? '<p style="margin:12px 0 4px;color:#666">O de a uno:</p>' + individuales : '<p style="color:#666">Cargá a tus profes en la pestaña <b>Profes</b> (Activo = Sí) para tener un botón por cada uno.</p>') +
    '<p style="color:#666;font-size:12px;word-break:break-all">Link: ' + esc_(linkConvocatoria_(token)) + '</p></div>')
    .setWidth(400).setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Convocar profes');
}

function mailConvocatoriaFila(filaN) { return mailConvocatoriaProfes_(obtenerHoja_(), Number(filaN)); }

function mailConvocatoriaProfes_(sh, filaN) {
  asegurarToken_(sh, filaN);
  const r = leerFila_(sh, filaN);
  if (r.asignados.length >= necesarios_(r)) return 0;
  const destinatarios = leerProfes_().filter(function (p) { return p.activo && p.email && r.asignados.indexOf(p.nombre) < 0; });
  destinatarios.forEach(function (p) {
    MailApp.sendEmail({ to: p.email, name: CONFIG.marca,
      subject: '📣 Convocatoria GLORIN · ' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs',
      body: '¡Hola ' + p.nombre.split(' ')[0] + '!\n' + mensajeProfe_('convocatoria', r),
      htmlBody: '<div style="font-family:Arial;font-size:15px">¡Hola ' + esc_(p.nombre.split(' ')[0]) + '!<pre style="font-family:inherit;white-space:pre-wrap">' +
        esc_(mensajeProfe_('base', r)) + '\n👥 Necesitamos ' + necesarios_(r) + ' profes</pre>' + boton_(linkConvocatoria_(r.token), '🙋 Me anoto / No puedo', '#C8161A') + '</div>' });
  });
  return destinatarios.length;
}

// Datos que ve el profe en la página de convocatoria (sin datos de la familia hasta que queda asignado)
function datosConvocatoria(token, nombre) {
  const x = buscarPorToken_(String(token || ''));
  if (!x) throw new Error('Este link de convocatoria no existe o ya no está activo.');
  const r = x.r;
  const asignado = nombre && r.asignados.indexOf(nombre) >= 0;
  return {
    cancelado: r.estado === 'Cancelado', fecha: fechaLarga_(r.fecha), hora: r.hora, horaFin: r.horaFin, llegada: horaLlegada_(r.hora),
    zona: r.zona, paquete: r.paquete, chicos: r.cantChicos, edades: r.rangoEdades, extras: r.extras,
    cumpleanero: r.cumpleanero, necesarios: necesarios_(r), asignados: r.asignados, suplentes: r.suplentes,
    profes: leerProfes_().filter(function (p) { return p.activo; }).map(function (p) { return p.nombre; }),
    direccion: asignado ? r.direccion : '', familia: asignado ? r.adulto + ' · ' + r.whatsapp : ''
  };
}

function responderConvocatoria(token, nombre, voy) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('Mucha gente respondiendo a la vez. Probá de nuevo.');
  let aviso = '', mensaje = '';
  try {
    const x = buscarPorToken_(String(token || ''));
    if (!x) throw new Error('Este link de convocatoria no existe.');
    const r = x.r, sh = x.sh;
    if (r.estado === 'Cancelado') throw new Error('Este cumple se canceló.');
    const profe = buscarProfe_(leerProfes_().filter(function (p) { return p.activo; }), nombre);
    if (!profe) throw new Error('No te encuentro en la lista de profes activos. Avisale a Fausto.');
    nombre = profe.nombre;
    const eraAsignado = r.asignados.indexOf(nombre) >= 0;
    let asignados = r.asignados.filter(function (n) { return n !== nombre; });
    let suplentes = r.suplentes.filter(function (n) { return n !== nombre; });
    const necesarios = necesarios_(r);

    if (voy) {
      if (asignados.length < necesarios) { asignados.push(nombre); mensaje = '¡Listo! Quedaste en el equipo ✅'; }
      else { suplentes.push(nombre); mensaje = 'El equipo ya está completo. Quedaste como suplente: si alguien se baja, entrás vos y te avisamos.'; }
    } else {
      mensaje = 'Gracias por avisar 👍';
      if (eraAsignado) {
        aviso = nombre + ' se bajó del cumple de ' + r.cumpleanero + ' (' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs).';
        if (suplentes.length) { const sube = suplentes.shift(); asignados.push(sube); aviso += ' Entró ' + sube + ' (era suplente): avisale.'; }
      }
    }
    sh.getRange(x.filaN, columna_(sh, 'Profes asignados')).setValue(asignados.join(', '));
    sh.getRange(x.filaN, columna_(sh, 'Suplentes')).setValue(suplentes.join(', '));
    actualizarEquipoEnCalendario_(r, asignados);

    const completo = asignados.length >= necesarios && !(r.asignados.length >= necesarios);
    if (completo) aviso = (aviso ? aviso + '\n' : '') + '✅ Equipo completo para el cumple de ' + r.cumpleanero + ' (' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs): ' + asignados.join(', ') + '.';
  } finally {
    lock.releaseLock();
  }
  if (aviso) {
    try { MailApp.sendEmail({ to: CONFIG.emailAviso || Session.getEffectiveUser().getEmail(), subject: '👥 GLORIN · Profes', body: aviso, name: CONFIG.marca }); } catch (e) { console.error(e); }
  }
  const datos = datosConvocatoria(token, nombre);
  datos.mensaje = mensaje;
  return datos;
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
    if (p && p.email && invitados.indexOf(p.email.toLowerCase()) < 0) { try { ev.addGuest(p.email); } catch (e) {} }
  });
  r.asignados.filter(function (n) { return asignados.indexOf(n) < 0; }).forEach(function (n) {
    const p = buscarProfe_(profes, n);
    if (p && p.email) { try { ev.removeGuest(p.email); } catch (e) {} }
  });
  const desc = String(ev.getDescription() || '').replace(/\n?PROFES:.*$/m, '');
  ev.setDescription(desc + '\nPROFES: ' + (asignados.join(', ') || '-') + ' (' + asignados.length + '/' + necesarios_(r) + ')');
}

function paginaConvocatoria_(token) {
  const html = '<!DOCTYPE html><html><head><base target="_top"><meta charset="utf-8">' +
  '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@500;700;800&display=swap" rel="stylesheet">' +
  '<style>body{margin:0;background:#FFF3ED;font-family:Montserrat,Arial,sans-serif;color:#1A1A1A}' +
  '.top{background:#C8161A;color:#fff;padding:22px 18px}.top h1{font-family:"Bebas Neue",Impact,sans-serif;font-weight:400;font-size:40px;margin:0;line-height:1}' +
  '.w{max-width:520px;margin:0 auto;padding:16px}.c{background:#fff;border:1px solid #EADFD9;border-radius:16px;padding:16px;margin:12px 0}' +
  '.r{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed #EADFD9}.r:last-child{border:none}.r span{color:#6B5F5A}' +
  '.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{border:1.5px solid #EADFD9;background:#fff;border-radius:999px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer}' +
  '.chip.sel{background:#C8161A;border-color:#C8161A;color:#fff}.b{display:block;width:100%;border:none;border-radius:999px;padding:15px;font:inherit;font-weight:800;font-size:16px;margin-top:10px;cursor:pointer}' +
  '.si{background:#1E8E5A;color:#fff}.no{background:#EEE;color:#333}.b:disabled{opacity:.5}.msg{background:#E9F7EF;border-radius:12px;padding:12px;margin-top:12px;display:none}' +
  '.err{background:#FDECEC}.cupo{font-family:"Bebas Neue",Impact,sans-serif;font-size:34px;color:#C8161A}</style></head><body>' +
  '<div class="top"><div style="font-weight:800;letter-spacing:.2em;font-size:12px">GLORIN · CONVOCATORIA</div><h1 id="t">Cargando…</h1></div>' +
  '<div class="w"><div id="app"></div></div>' +
  '<script>var TOKEN=' + JSON.stringify(token) + ',YO="",D=null;' +
  'try{YO=localStorage.getItem("glorin-profe")||""}catch(e){}' +
  'function e(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]})}' +
  'function fila(a,b){return b?"<div class=r><span>"+a+"</span><b>"+e(b)+"</b></div>":""}' +
  'function pintar(d,msg,err){D=d;document.getElementById("t").textContent=d.cancelado?"Cumple cancelado":"Cumple de "+d.cumpleanero;' +
  'var h="<div class=c>"+fila("Fecha",d.fecha)+fila("Horario",d.hora+" a "+d.horaFin+" hs")+fila("Llegada",d.llegada+" hs")+fila("Zona",d.zona)+fila("Chicos",(d.chicos||"?")+(d.edades?" · "+d.edades:""))+fila("Paquete",d.paquete)+fila("Extras",d.extras)+(d.direccion?fila("Dirección",d.direccion)+fila("Familia",d.familia):"")+"</div>";' +
  'h+="<div class=c><div class=cupo>"+d.asignados.length+" de "+d.necesarios+" profes</div><div style=\\"color:#6B5F5A\\">"+(d.asignados.length?"Van: "+e(d.asignados.join(", ")):"Todavía no se anotó nadie")+(d.suplentes.length?"<br>Suplentes: "+e(d.suplentes.join(", ")):"")+"</div></div>";' +
  'if(!d.cancelado){h+="<div class=c><b>¿Quién sos?</b><div class=chips style=\\"margin-top:10px\\">"+d.profes.map(function(n){return "<button type=button class=\\"chip"+(n===YO?" sel":"")+"\\" data-n=\\""+e(n)+"\\">"+e(n)+"</button>"}).join("")+"</div>"+' +
  '"<button class=\\"b si\\" id=si>🙋 Voy</button><button class=\\"b no\\" id=no>No puedo</button><div class=\\"msg"+(err?" err":"")+"\\" id=m></div></div>";}' +
  'document.getElementById("app").innerHTML=h;' +
  'document.querySelectorAll(".chip").forEach(function(c){c.onclick=function(){YO=c.dataset.n;try{localStorage.setItem("glorin-profe",YO)}catch(x){}document.querySelectorAll(".chip").forEach(function(o){o.classList.toggle("sel",o===c)});cargar()}});' +
  'var m=document.getElementById("m");if(m&&msg){m.textContent=msg;m.style.display="block"}' +
  'var si=document.getElementById("si"),no=document.getElementById("no");if(si){si.onclick=function(){responder(true)};no.onclick=function(){responder(false)}}}' +
  'function responder(v){if(!YO){pintar(D,"Primero tocá tu nombre.",true);return}document.getElementById("si").disabled=document.getElementById("no").disabled=true;' +
  'google.script.run.withSuccessHandler(function(d){pintar(d,d.mensaje)}).withFailureHandler(function(x){pintar(D,x.message,true)}).responderConvocatoria(TOKEN,YO,v)}' +
  'function cargar(){google.script.run.withSuccessHandler(function(d){pintar(d)}).withFailureHandler(function(x){document.getElementById("t").textContent="Link no válido";document.getElementById("app").innerHTML="<div class=c>"+e(x.message)+"</div>"}).datosConvocatoria(TOKEN,YO)}' +
  'cargar();</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('GLORIN · Convocatoria')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
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
