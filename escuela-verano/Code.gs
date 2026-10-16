/**
 * Escuela de Verano — Aldea de Valle + Colonia de Güey
 * ------------------------------------------------------------
 * Una sola app web (Google Apps Script pegado en una planilla) con tres puertas:
 *
 *   · FAMILIAS   (link normal)          → eligen sede, ven temáticas, precios,
 *     arman el presupuesto, inscriben a sus hijos y después entran con su mail
 *     (les llega un código) para ver fotos del día, asistencia, cronograma,
 *     saldo y renovar.
 *   · PROFES     (link + ?p=profes)     → entran con su mail, marcan entrada y
 *     salida por GPS en la sede donde están, toman asistencia, registran quién
 *     retira a cada chico, suben fotos y ven el cronograma y sus horas.
 *   · ADMINISTRACIÓN (link + ?p=admin)  → PIN por sede (o general). Tablero,
 *     inscripciones, cobros y deudas, profes y sus pagos, temáticas, cronograma,
 *     mails a las familias y ubicación de cada sede.
 *
 * Todo queda en esta planilla, con una columna "sede" en cada hoja, así cada
 * administración trabaja con lo suyo (filtrá por sede) y la general ve todo.
 *
 * Automático (correr configurarInicial() una vez):
 *   · todos los días a las 8: a la familia que se le termina la inscripción le
 *     llega un mail para renovar (con descuento), a la que debe le llega un
 *     recordatorio, y a cada administración un resumen con botones de WhatsApp.
 *   · domingos a las 18: mail con la temática de la semana que viene a las
 *     familias que tienen días esa semana.
 * ------------------------------------------------------------
 */

const TZ = 'America/Argentina/Buenos_Aires';

// ======== CONFIGURACIÓN (editá acá precios, fechas y datos de cada sede) ========
// ⚠️ Los precios son de EJEMPLO: poné los tuyos antes de publicar.
const CONFIG = {
  marca: 'Escuela de Verano',
  temporada: '2026-2027',
  edadMin: 3,
  edadMax: 13,
  horaAvisoDiario: 8,
  diasAvisoRenovacion: 2,       // cuántos días antes de que termine se le ofrece renovar
  diasEntreRecordatoriosDeuda: 3,
  horasTurnoMax: 14,            // entrada sin salida más vieja que esto = olvidada
  avisarRetiroFamilia: false,   // true = mail a la familia cuando el profe registra quién retiró al chico
  grupos: [
    { id: 'pollitos',     nombre: 'Pollitos',     emoji: '🐣', edadMin: 3,  edadMax: 4 },
    { id: 'exploradores', nombre: 'Exploradores', emoji: '🧭', edadMin: 5,  edadMax: 6 },
    { id: 'aventureros',  nombre: 'Aventureros',  emoji: '🏕️', edadMin: 7,  edadMax: 9 },
    { id: 'leyendas',     nombre: 'Leyendas',     emoji: '⚡', edadMin: 10, edadMax: 13 }
  ],
  sedes: {
    aldea: {
      id: 'aldea',
      nombre: 'Aldea de Valle',
      color: '#2F4A38', acento: '#F2CA11',
      direccion: 'República de China 1890, Valle Escondido, Córdoba',
      whatsapp: '5493515308489',
      lat: -31.364971, lng: -64.278477, radio: 150,
      inicio: '2026-12-14', fin: '2027-02-26',
      feriados: ['2026-12-25', '2027-01-01', '2027-02-15', '2027-02-16'],
      cupoPorGrupo: 25,
      bajada: 'Naturaleza, deporte y pileta en el predio de Aldea, en Valle Escondido.',
      ficha: [  // misma lista de renglones en las dos sedes: así se arma la comparación
        ['Edades', 'De 3 a 13 años, en grupos por edad'],
        ['Horario', 'Mañana 9 a 13 h · Jornada completa 9 a 17 h'],
        ['Pileta', 'Sí, con guardavidas y clases de natación'],
        ['Comida', 'Merienda incluida · almuerzo opcional'],
        ['Actividades', 'Deportes, artes marciales, juegos en la naturaleza, talleres'],
        ['Traslado', 'Sin traslado (a confirmar)']
      ],
      pago: { alias: 'faustorizzi', banco: 'Brubank', titular: 'Fausto Rizzi', cbu: '' },
      precios: {
        dia: 28000,
        semanas: [0, 110000, 205000, 290000, 365000, 440000, 510000, 575000, 640000, 700000, 750000],
        semanaAdicional: 60000,
        turnos: [
          { id: 'manana',   nombre: 'Mañana (9 a 13 h)',            factor: 1 },
          { id: 'completa', nombre: 'Jornada completa (9 a 17 h)',  factor: 1.6 }
        ],
        extras: [
          { id: 'almuerzo', nombre: 'Almuerzo', precioDia: 9000, detalle: 'Menú del día, avisá si hay alergias' }
        ],
        descuentoHermanos: 10,     // % a partir del segundo hijo
        descuentoRenovacion: 5,    // % si renueva antes de que termine
        anticipado: { hasta: '2026-11-30', pct: 10 },  // % por inscribirse temprano (vacío = sin descuento)
        senaPct: 30
      }
    },
    colonia: {
      id: 'colonia',
      nombre: 'Colonia de Güey',
      color: '#1C5D8C', acento: '#FFB627',
      direccion: '(poner dirección)',
      whatsapp: '5493515308489',
      lat: null, lng: null, radio: 150,   // fijala desde Administración → Ajustes → "Usar mi ubicación"
      inicio: '2026-12-14', fin: '2027-02-26',
      feriados: ['2026-12-25', '2027-01-01', '2027-02-15', '2027-02-16'],
      cupoPorGrupo: 25,
      bajada: 'La colonia de siempre: pileta, juegos y amigos todo el verano.',
      ficha: [
        ['Edades', 'De 3 a 13 años, en grupos por edad'],
        ['Horario', 'Mañana 9 a 13 h · Jornada completa 9 a 17 h'],
        ['Pileta', 'Sí, con guardavidas (a confirmar)'],
        ['Comida', 'Merienda incluida · almuerzo opcional'],
        ['Actividades', 'Juegos, deportes, campamento y talleres (a confirmar)'],
        ['Traslado', 'A confirmar']
      ],
      pago: { alias: 'faustorizzi', banco: 'Brubank', titular: 'Fausto Rizzi', cbu: '' },
      precios: {
        dia: 25000,
        semanas: [0, 100000, 190000, 270000, 340000, 410000, 475000, 535000, 595000, 650000, 700000],
        semanaAdicional: 55000,
        turnos: [
          { id: 'manana',   nombre: 'Mañana (9 a 13 h)',            factor: 1 },
          { id: 'completa', nombre: 'Jornada completa (9 a 17 h)',  factor: 1.6 }
        ],
        extras: [
          { id: 'almuerzo', nombre: 'Almuerzo', precioDia: 9000, detalle: 'Menú del día, avisá si hay alergias' }
        ],
        descuentoHermanos: 10,
        descuentoRenovacion: 5,
        anticipado: { hasta: '2026-11-30', pct: 10 },
        senaPct: 30
      }
    }
  }
};

const HOJAS = {
  Familias:      ['id', 'creado', 'email', 'adulto', 'dni', 'whatsapp', 'direccion', 'emergenciaNombre', 'emergenciaTel', 'autorizadosRetiro', 'comoNosConocio', 'sede', 'notas'],
  Chicos:        ['id', 'familiaId', 'nombre', 'nacimiento', 'dni', 'sede', 'grupo', 'obraSocial', 'alergias', 'medicacion', 'condiciones', 'sabeNadar', 'autorizaFotos', 'notas', 'creado'],
  Inscripciones: ['id', 'creado', 'familiaId', 'chicoId', 'chico', 'sede', 'grupo', 'modalidad', 'turno', 'extras', 'dias', 'cantDias', 'fechaInicio', 'fechaFin',
                  'subtotal', 'descuento', 'total', 'pagado', 'saldo', 'estado', 'avisoRenovacion', 'avisoDeuda', 'origen', 'notas'],
  Pagos:         ['id', 'fecha', 'inscripcionId', 'familiaId', 'chico', 'sede', 'monto', 'medio', 'nota', 'cargadoPor'],
  Profes:        ['id', 'nombre', 'email', 'whatsapp', 'sede', 'grupos', 'formaPago', 'valor', 'activo', 'notas', 'creado'],
  Marcajes:      ['id', 'profeId', 'nombre', 'sede', 'tipo', 'fechaHora', 'lat', 'lng', 'distancia', 'precision', 'origen'],
  Asistencia:    ['id', 'fecha', 'sede', 'grupo', 'chicoId', 'chico', 'estado', 'horaLlegada', 'retiradoPor', 'horaRetiro', 'nota', 'profe', 'actualizado'],
  Publicaciones: ['id', 'fecha', 'sede', 'grupo', 'profe', 'texto', 'fotos', 'visible'],
  Tematicas:     ['id', 'sede', 'semana', 'titulo', 'descripcion', 'emoji'],
  Cronograma:    ['id', 'sede', 'semana', 'dia', 'hora', 'grupo', 'actividad', 'lugar', 'profe'],
  PagosProfes:   ['id', 'fecha', 'profeId', 'nombre', 'sede', 'monto', 'concepto'],
  Interesados:   ['fecha', 'email', 'nombre', 'whatsapp', 'sede', 'origen'],
  Avisos:        ['fecha', 'tipo', 'sede', 'destino', 'referencia', 'detalle'],
  Config:        ['clave', 'valor', 'descripcion']
};
// Columnas que tienen que quedar como texto (si no, Sheets convierte fechas y teléfonos)
const COLS_TEXTO = {
  Familias: ['dni', 'whatsapp', 'emergenciaTel'], Chicos: ['nacimiento', 'dni'], Profes: ['whatsapp'],
  Inscripciones: ['dias', 'fechaInicio', 'fechaFin'], Asistencia: ['fecha', 'horaLlegada', 'horaRetiro'],
  Publicaciones: ['fecha'], Tematicas: ['semana'], Cronograma: ['semana', 'hora'], Config: ['valor']
};
const ESTADOS = ['Pendiente', 'Señada', 'Pagada', 'Cancelada'];
const FORMAS_PAGO = { hora: 'Por hora', dia: 'Por día trabajado', semana: 'Por semana trabajada', mensual: 'Fijo por mes' };
const DIAS_SEM = ['lun', 'mar', 'mie', 'jue', 'vie'];

// ======== SERVIR LA PÁGINA ========
function doGet(e) {
  const p = String((e && e.parameter && e.parameter.p) || '');
  const titulos = { profes: 'Profes · Escuela de Verano', admin: 'Administración · Escuela de Verano' };
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(titulos[p] || 'Escuela de Verano · Aldea de Valle y Colonia de Güey')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Única puerta de entrada desde la página (google.script.run.api). */
function api(accion, datos, token) {
  try {
    const def = ACCIONES[accion];
    if (!def) throw new Error('Acción desconocida.');
    let sesion = null;
    if (def[0] !== 'publico') {
      sesion = leerToken_(token);
      if (!sesion || sesion.r !== def[0]) return { ok: false, auth: true, error: 'Tu sesión venció. Volvé a entrar.' };
    }
    return { ok: true, data: def[1](datos || {}, sesion) };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

const ACCIONES = {
  publico:         ['publico', accPublico_],
  inscribir:       ['publico', accInscribir_],
  interesado:      ['publico', accInteresado_],
  pedirCodigo:     ['publico', accPedirCodigo_],
  verificarCodigo: ['publico', accVerificarCodigo_],
  adminLogin:      ['publico', accAdminLogin_],
  // familias
  miCuenta:        ['familia', accMiCuenta_],
  renovar:         ['familia', accRenovar_],
  guardarChico:    ['familia', accGuardarChicoFamilia_],
  // profes
  profeInicio:     ['profe', accProfeInicio_],
  marcar:          ['profe', accMarcar_],
  lista:           ['profe', accLista_],
  guardarAsistencia: ['profe', accGuardarAsistencia_],
  publicar:        ['profe', accPublicar_],
  // administración
  tablero:         ['admin', accTablero_],
  registrarPago:   ['admin', accRegistrarPago_],
  cambiarEstado:   ['admin', accCambiarEstado_],
  asignarGrupo:    ['admin', accAsignarGrupo_],
  recordar:        ['admin', accRecordar_],
  guardarProfe:    ['admin', accGuardarProfe_],
  pagarProfe:      ['admin', accPagarProfe_],
  marcajeManual:   ['admin', accMarcajeManual_],
  guardarTematica: ['admin', accGuardarTematica_],
  borrarTematica:  ['admin', (d, s) => borrarFila_('Tematicas', d.id, s)],
  guardarCrono:    ['admin', accGuardarCrono_],
  borrarCrono:     ['admin', (d, s) => borrarFila_('Cronograma', d.id, s)],
  copiarCrono:     ['admin', accCopiarCrono_],
  ocultarPublicacion: ['admin', accOcultarPublicacion_],
  mailMasivo:      ['admin', accMailMasivo_],
  fijarUbicacion:  ['admin', accFijarUbicacion_],
  guardarAjustes:  ['admin', accGuardarAjustes_]
};

// ======== INSTALACIÓN (correr UNA vez a mano) ========
function configurarInicial() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(HOJAS).forEach(hoja_);
  const cfg = hoja_('Config');
  if (cfg.getLastRow() === 1) {
    const filas = [
      ['pinGeneral', '2026', 'PIN de la administración general (ve las dos sedes).'],
      ['emailGeneral', Session.getEffectiveUser().getEmail(), 'Mail que recibe el resumen diario de las dos sedes.']
    ];
    Object.keys(CONFIG.sedes).forEach((id, i) => {
      filas.push(['pin_' + id, String(1111 * (i + 1) + 1000), 'PIN de la administración de ' + CONFIG.sedes[id].nombre + ' (solo ve su sede).']);
      filas.push(['email_' + id, '', 'Mail de la administración de ' + CONFIG.sedes[id].nombre + ' (resumen diario y avisos de inscripción).']);
    });
    cfg.getRange(2, 1, filas.length, 3).setValues(filas);
  }
  if (!filas_('Tematicas').length) cargarTematicasEjemplo_();

  ScriptApp.getProjectTriggers().forEach(t => {
    if (['tareaDiaria', 'tareaSemanal'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('tareaDiaria').timeBased().everyDays(1).atHour(CONFIG.horaAvisoDiario).create();
  ScriptApp.newTrigger('tareaSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(18).create();
  carpetaFotos_();
  ss.toast('Listo. Los PIN de administración están en la hoja Config.', 'Escuela de Verano', 8);
}

function cargarTematicasEjemplo_() {
  const ideas = [
    ['🏴‍☠️', 'Piratas y tesoros', 'Búsqueda del tesoro, mapas y barcos de cartón.'],
    ['🚀', 'Viaje al espacio', 'Planetas, cohetes y astronautas por un día.'],
    ['🦖', 'Dinosaurios', 'Excavaciones, huellas y el museo de la colonia.'],
    ['🌎', 'Vuelta al mundo', 'Cada día un país: comidas, juegos y bailes.'],
    ['🦸', 'Superhéroes', 'Circuitos, misiones y la capa propia.'],
    ['🎪', 'Circo', 'Malabares, equilibrio y la gran función.'],
    ['🌊', 'Fondo del mar', 'Juegos de agua y criaturas marinas.'],
    ['🏕️', 'Campamento', 'Fogón, carpas y noche de campamento (a confirmar).'],
    ['🎭', 'Carnaval', 'Disfraces, murga y espuma.'],
    ['🏆', 'Olimpíadas', 'Equipos, medallas y la gran final de despedida.']
  ];
  Object.keys(CONFIG.sedes).forEach(id => {
    semanas_(id).forEach((s, i) => {
      const t = ideas[i % ideas.length];
      agregar_('Tematicas', { id: uid_(), sede: id, semana: s.id, emoji: t[0], titulo: t[1], descripcion: t[2] });
    });
  });
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('☀️ Escuela de Verano')
    .addItem('🔗 Ver los links de la app', 'menuLinks')
    .addItem('📬 Correr el aviso diario ahora', 'tareaDiaria')
    .addItem('🧮 Recalcular saldos', 'recalcularTodo')
    .addToUi();
}

function menuLinks() {
  const u = ScriptApp.getService().getUrl();
  const html = '<div style="font:14px Arial">' + (u ? [['Familias', u], ['Profes', u + '?p=profes'], ['Administración', u + '?p=admin']].map(x =>
    '<p><b>' + x[0] + '</b><br><a href="' + x[1] + '" target="_blank">' + x[1] + '</a></p>').join('') :
    '<p>Todavía no está publicada. Implementar → Nueva implementación → Aplicación web.</p>') + '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(520).setHeight(260), 'Links de la Escuela de Verano');
}

// ======== DATOS PÚBLICOS ========
function accPublico_() {
  const tem = filas_('Tematicas');
  const sedes = Object.keys(CONFIG.sedes).map(id => {
    const s = CONFIG.sedes[id];
    const temSede = {};
    tem.filter(t => t.sede === id).forEach(t => { temSede[iso_(t.semana)] = { titulo: t.titulo, descripcion: t.descripcion, emoji: t.emoji }; });
    return {
      id, nombre: s.nombre, color: s.color, acento: s.acento, direccion: s.direccion, whatsapp: s.whatsapp,
      bajada: s.bajada, ficha: s.ficha, inicio: s.inicio, fin: s.fin, precios: s.precios, cupoPorGrupo: s.cupoPorGrupo,
      pago: s.pago,
      semanas: semanas_(id).map(w => Object.assign(w, { tematica: temSede[w.id] || null })),
      tieneUbicacion: !!geo_(id).lat
    };
  });
  return {
    marca: CONFIG.marca, temporada: CONFIG.temporada, edadMin: CONFIG.edadMin, edadMax: CONFIG.edadMax,
    grupos: CONFIG.grupos, sedes, hoy: hoy_(), url: ScriptApp.getService().getUrl(),
    cotizar: cotizarPuro_.toString(), formasPago: FORMAS_PAGO, estados: ESTADOS
  };
}

/** Semanas de la temporada (lunes a viernes, sin feriados). */
function semanas_(sedeId) {
  const s = sedeCfg_(sedeId);
  const out = [];
  let lunes = lunes_(s.inicio);
  while (lunes <= s.fin) {
    const dias = [];
    for (let i = 0; i < 5; i++) {
      const d = sumarDias_(lunes, i);
      if (d >= s.inicio && d <= s.fin && s.feriados.indexOf(d) < 0) dias.push(d);
    }
    if (dias.length) out.push({ id: lunes, desde: dias[0], hasta: dias[dias.length - 1], dias });
    lunes = sumarDias_(lunes, 7);
  }
  return out;
}

/**
 * Presupuesto. Es una función pura: el servidor la usa para cobrar y la página
 * la recibe como texto para mostrar el precio al instante (mismo cálculo en los dos lados).
 */
function cotizarPuro_(sede, plan, cantChicos, ctx) {
  var P = sede.precios, hoy = ctx.hoy, errores = [];
  var r100 = function (n) { return Math.round(n / 100) * 100; };
  var buscar = function (lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; };
  var semanaDe = {}, dias = [], semanasSel = [];
  sede.semanas.forEach(function (s) { s.dias.forEach(function (d) { semanaDe[d] = s.id; }); });
  if (plan.modalidad === 'semanas') {
    sede.semanas.forEach(function (s) {
      if ((plan.semanas || []).indexOf(s.id) < 0) return;
      if (s.dias[0] < hoy) { errores.push('La semana del ' + s.desde + ' ya empezó: elegí días sueltos.'); return; }
      semanasSel.push(s.id); dias = dias.concat(s.dias);
    });
  } else {
    (plan.dias || []).forEach(function (d) { if (semanaDe[d] && d >= hoy && dias.indexOf(d) < 0) dias.push(d); });
  }
  dias.sort();
  var base = 0, detalleBase = '';
  if (plan.modalidad === 'semanas') {
    var n = semanasSel.length, t = P.semanas;
    base = n < t.length ? t[n] : t[t.length - 1] + (n - (t.length - 1)) * P.semanaAdicional;
    detalleBase = n + (n === 1 ? ' semana' : ' semanas');
  } else {
    // días sueltos: nunca más caro que la semana completa
    var porSemana = {};
    dias.forEach(function (d) { porSemana[semanaDe[d]] = (porSemana[semanaDe[d]] || 0) + 1; });
    Object.keys(porSemana).forEach(function (k) { base += Math.min(porSemana[k] * P.dia, P.semanas[1]); });
    detalleBase = dias.length + (dias.length === 1 ? ' día' : ' días');
  }
  var turno = buscar(P.turnos, plan.turno) || P.turnos[0];
  base = r100(base * turno.factor);
  var extras = (plan.extras || []).map(function (id) { return buscar(P.extras, id); }).filter(Boolean)
    .map(function (e) { return { id: e.id, nombre: e.nombre, monto: e.precioDia * dias.length }; });
  var extrasTotal = extras.reduce(function (a, e) { return a + e.monto; }, 0);
  var anticipado = P.anticipado && P.anticipado.hasta && hoy <= P.anticipado.hasta ? P.anticipado.pct : 0;
  var porChico = [], subtotal = 0, descuento = 0;
  for (var i = 0; i < Math.max(1, cantChicos); i++) {
    var sub = base + extrasTotal, pct = 0, motivos = [];
    if (i > 0 && P.descuentoHermanos) { pct += P.descuentoHermanos; motivos.push('hermano ' + P.descuentoHermanos + '%'); }
    if (ctx.renovacion && P.descuentoRenovacion) { pct += P.descuentoRenovacion; motivos.push('renovación ' + P.descuentoRenovacion + '%'); }
    if (anticipado) { pct += anticipado; motivos.push('inscripción anticipada ' + anticipado + '%'); }
    var desc = r100(sub * pct / 100);
    porChico.push({ subtotal: sub, descuento: desc, total: sub - desc, motivos: motivos });
    subtotal += sub; descuento += desc;
  }
  if (!dias.length) errores.push(plan.modalidad === 'semanas' ? 'Elegí al menos una semana.' : 'Elegí al menos un día.');
  var total = subtotal - descuento;
  return {
    dias: dias, cantDias: dias.length, semanas: semanasSel, turno: turno, extras: extras, base: base, detalleBase: detalleBase,
    porChico: porChico, subtotal: subtotal, descuento: descuento, total: total,
    sena: r100(total * P.senaPct / 100), senaPct: P.senaPct, errores: errores
  };
}

function cotizarServidor_(sedeId, plan, cant, renovacion) {
  const pub = accPublico_().sedes.filter(s => s.id === sedeId)[0];
  if (!pub) throw new Error('Elegí una sede.');
  return cotizarPuro_(pub, plan || {}, cant, { hoy: hoy_(), renovacion: !!renovacion });
}

// ======== INSCRIPCIÓN ========
function accInscribir_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sede = sedeCfg_(d.sede);
    const a = d.adulto || {};
    const email = normEmail_(a.email);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Revisá el mail: ahí te llegan los avisos y el código para entrar.');
    if (!limpio_(a.nombre)) throw new Error('Falta el nombre del adulto responsable.');
    if (String(a.whatsapp || '').replace(/\D/g, '').length < 8) throw new Error('Falta un WhatsApp de contacto.');
    if (!limpio_(a.emergenciaNombre) || !limpio_(a.emergenciaTel)) throw new Error('Falta el contacto de emergencia.');
    if (!d.acepta) throw new Error('Tenés que aceptar el reglamento para inscribir.');
    const chicos = (d.chicos || []).filter(c => limpio_(c.nombre));
    if (!chicos.length) throw new Error('Cargá al menos un chico.');

    let fam = filas_('Familias').filter(f => normEmail_(f.email) === email)[0];
    // Validar fechas, edades y cupos ANTES de escribir nada en la planilla
    const q = cotizarServidor_(sede.id, d.plan, chicos.length, false);
    if (q.errores.length) throw new Error(q.errores[0]);
    verificarCupos_(sede.id, chicos.map(c => {
      const ex = fam && filas_('Chicos').filter(x => x.familiaId === fam.id && normNombre_(x.nombre) === normNombre_(c.nombre))[0];
      validarChico_(c, sede);
      return { id: ex ? ex.id : '', nombre: c.nombre, grupo: ex ? ex.grupo : grupoPorEdad_(c.nacimiento, sede.inicio).id };
    }), q.dias);
    const datosFam = {
      email, adulto: limpio_(a.nombre), dni: limpio_(a.dni), whatsapp: limpio_(a.whatsapp), direccion: limpio_(a.direccion),
      emergenciaNombre: limpio_(a.emergenciaNombre), emergenciaTel: limpio_(a.emergenciaTel),
      autorizadosRetiro: limpio_(a.autorizadosRetiro), comoNosConocio: limpio_(a.comoNosConocio)
    };
    if (fam) {
      actualizar_('Familias', fam._fila, datosFam);
      fam = Object.assign(fam, datosFam);
    } else {
      fam = Object.assign({ id: 'F' + uid_(), creado: new Date(), sede: sede.id }, datosFam);
      agregar_('Familias', fam);
    }
    const filasChicos = chicos.map(c => guardarChico_(fam, c, sede.id));
    const res = crearInscripciones_(fam, filasChicos, sede.id, d.plan, 'web', false);
    mailInscripcion_(fam, res, sede);
    avisarAdmin_(sede.id, '🆕 Nueva inscripción · ' + res.items.map(i => i.chico).join(', '), mailAdminInscripcion_(fam, res, sede));
    return res;
  } finally { lock.releaseLock(); }
}

function validarChico_(c, sede) {
  if (!limpio_(c.nacimiento) || !/^\d{4}-\d{2}-\d{2}$/.test(c.nacimiento)) throw new Error('Falta la fecha de nacimiento de ' + c.nombre + '.');
  const edad = edadEn_(c.nacimiento, sede.inicio);
  if (edad < CONFIG.edadMin) throw new Error(c.nombre + ' tiene que tener al menos ' + CONFIG.edadMin + ' años al empezar la temporada.');
  if (edad > CONFIG.edadMax + 1) throw new Error('La escuela es hasta los ' + CONFIG.edadMax + ' años. Escribinos por WhatsApp para ver si hay lugar para ' + c.nombre + '.');
}

function guardarChico_(fam, c, sedeId) {
  const sede = sedeCfg_(sedeId);
  validarChico_(c, sede);
  const datos = {
    nombre: limpio_(c.nombre), nacimiento: c.nacimiento, dni: limpio_(c.dni), obraSocial: limpio_(c.obraSocial),
    alergias: limpio_(c.alergias), medicacion: limpio_(c.medicacion), condiciones: limpio_(c.condiciones),
    sabeNadar: limpio_(c.sabeNadar), autorizaFotos: c.autorizaFotos === false || c.autorizaFotos === 'No' ? 'No' : 'Sí', notas: limpio_(c.notas)
  };
  const existente = filas_('Chicos').filter(x => x.familiaId === fam.id && normNombre_(x.nombre) === normNombre_(datos.nombre))[0];
  if (existente) {
    actualizar_('Chicos', existente._fila, datos);
    return Object.assign(existente, datos);
  }
  const nuevo = Object.assign({ id: 'C' + uid_(), familiaId: fam.id, sede: sedeId, grupo: grupoPorEdad_(c.nacimiento, sede.inicio).id, creado: new Date() }, datos);
  agregar_('Chicos', nuevo);
  return nuevo;
}

function crearInscripciones_(fam, chicos, sedeId, plan, origen, renovacion) {
  const q = cotizarServidor_(sedeId, plan, chicos.length, renovacion);
  if (q.errores.length) throw new Error(q.errores[0]);
  const sede = sedeCfg_(sedeId);
  verificarCupos_(sedeId, chicos, q.dias);
  const items = chicos.map((c, i) => {
    const p = q.porChico[i];
    const fila = {
      id: 'I' + uid_(), creado: new Date(), familiaId: fam.id, chicoId: c.id, chico: c.nombre, sede: sedeId,
      grupo: c.grupo, modalidad: plan.modalidad === 'semanas' ? 'Semanas' : 'Días sueltos', turno: q.turno.nombre,
      extras: q.extras.map(e => e.nombre).join(', '), dias: q.dias.join(','), cantDias: q.cantDias,
      fechaInicio: q.dias[0], fechaFin: q.dias[q.dias.length - 1], subtotal: p.subtotal, descuento: p.descuento, total: p.total,
      pagado: 0, saldo: p.total, estado: 'Pendiente', avisoRenovacion: '', avisoDeuda: '', origen,
      notas: p.motivos.length ? 'Descuentos: ' + p.motivos.join(', ') : ''
    };
    agregar_('Inscripciones', fila);
    return fila;
  });
  return {
    items, total: q.total, sena: q.sena, detalle: q.detalleBase + ' · ' + q.turno.nombre, desde: q.dias[0], hasta: q.dias[q.dias.length - 1],
    pago: sede.pago, sede: sede.nombre, whatsapp: sede.whatsapp,
    waComprobante: linkWhatsApp_(sede.whatsapp, '¡Hola! Te mando el comprobante de la escuela de verano de ' + items.map(i => i.chico).join(' y ') + ' (' + items.map(i => i.id).join(', ') + ').')
  };
}

/** chicos: [{ id (vacío si es nuevo), nombre, grupo }] */
function verificarCupos_(sedeId, chicos, dias) {
  const sede = sedeCfg_(sedeId), ocupados = ocupacion_(sedeId), suma = {};
  chicos.forEach(c => {
    const llenos = dias.filter(dia => (ocupados[c.grupo + '|' + dia] || 0) + (suma[c.grupo + '|' + dia] || 0) >= sede.cupoPorGrupo);
    if (llenos.length) throw new Error('No hay cupo en el grupo de ' + c.nombre + ' para: ' + llenos.map(fechaCorta_).join(', ') + '. Probá con otras fechas o escribinos por WhatsApp.');
    const repetidos = c.id ? dias.filter(dia => ocupados['chico|' + c.id + '|' + dia]) : [];
    if (repetidos.length) throw new Error(c.nombre + ' ya está inscripto el ' + repetidos.map(fechaCorta_).join(', ') + '.');
    dias.forEach(dia => { suma[c.grupo + '|' + dia] = (suma[c.grupo + '|' + dia] || 0) + 1; });
  });
}

function ocupacion_(sedeId) {
  const out = {};
  filas_('Inscripciones').forEach(i => {
    if (i.sede !== sedeId || i.estado === 'Cancelada') return;
    String(i.dias || '').split(',').filter(Boolean).forEach(dia => {
      out[i.grupo + '|' + dia] = (out[i.grupo + '|' + dia] || 0) + 1;
      out['chico|' + i.chicoId + '|' + dia] = 1;
    });
  });
  return out;
}

function accInteresado_(d) {
  const email = normEmail_(d.email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Revisá el mail.');
  const ya = filas_('Interesados').some(x => normEmail_(x.email) === email && x.sede === d.sede);
  if (!ya) agregar_('Interesados', { fecha: new Date(), email, nombre: limpio_(d.nombre), whatsapp: limpio_(d.whatsapp), sede: sedeCfg_(d.sede).id, origen: 'web' });
  return { ok: true };
}

// ======== INGRESO CON MAIL (código de 6 números) ========
function accPedirCodigo_(d) {
  const email = normEmail_(d.email), rol = d.rol === 'profe' ? 'profe' : 'familia';
  if (!email) throw new Error('Escribí tu mail.');
  const existe = rol === 'profe'
    ? filas_('Profes').some(p => normEmail_(p.email) === email && esSi_(p.activo))
    : filas_('Familias').some(f => normEmail_(f.email) === email);
  if (!existe) throw new Error(rol === 'profe'
    ? 'Ese mail no está cargado como profe. Pedile a la administración que te sume.'
    : 'No encontramos inscripciones con ese mail. Si es tu primera vez, inscribite primero.');
  const cache = CacheService.getScriptCache(), clave = 'otp:' + rol + ':' + email;
  const previo = JSON.parse(cache.get(clave) || 'null');
  if (previo && Date.now() - previo.t < 45000) return { enviado: true, repetido: true };
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  cache.put(clave, JSON.stringify({ c: codigo, t: Date.now(), n: 0 }), 600);
  MailApp.sendEmail({
    to: email, name: CONFIG.marca, subject: codigo + ' es tu código para entrar · ' + CONFIG.marca,
    htmlBody: marcoMail_('', '<p>Tu código para entrar es:</p><p style="font-size:34px;letter-spacing:8px;font-weight:bold;margin:8px 0">' + codigo +
      '</p><p style="color:#777">Vence en 10 minutos. Si no lo pediste, ignorá este mail.</p>'),
    body: 'Tu código para entrar es ' + codigo + ' (vence en 10 minutos).'
  });
  return { enviado: true };
}

function accVerificarCodigo_(d) {
  const email = normEmail_(d.email), rol = d.rol === 'profe' ? 'profe' : 'familia';
  const cache = CacheService.getScriptCache(), clave = 'otp:' + rol + ':' + email;
  const reg = JSON.parse(cache.get(clave) || 'null');
  if (!reg) throw new Error('El código venció. Pedí uno nuevo.');
  if (reg.n >= 5) { cache.remove(clave); throw new Error('Demasiados intentos. Pedí un código nuevo.'); }
  if (String(d.codigo || '').replace(/\D/g, '') !== reg.c) {
    reg.n++; cache.put(clave, JSON.stringify(reg), 600);
    throw new Error('Código incorrecto. Revisá el último mail que te llegó.');
  }
  cache.remove(clave);
  return { token: firmar_({ r: rol, e: email, x: Date.now() + 150 * 86400000 }), rol, email };
}

function accAdminLogin_(d) {
  const pin = String(d.pin || '').trim(), cfg = config_();
  let sede = null;
  if (pin && pin === String(cfg.pinGeneral)) sede = 'todas';
  Object.keys(CONFIG.sedes).forEach(id => { if (pin && pin === String(cfg['pin_' + id])) sede = id; });
  if (!sede) { Utilities.sleep(800); throw new Error('PIN incorrecto.'); }
  return { token: firmar_({ r: 'admin', s: sede, x: Date.now() + 14 * 3600000 }), sede };
}

function firmar_(obj) {
  const p = Utilities.base64EncodeWebSafe(JSON.stringify(obj));
  return p + '.' + Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p, secreto_()));
}
function leerToken_(t) {
  const partes = String(t || '').split('.');
  if (partes.length !== 2) return null;
  const firma = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(partes[0], secreto_()));
  if (firma !== partes[1]) return null;
  const obj = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(partes[0])).getDataAsString());
  return obj.x > Date.now() ? obj : null;
}
function secreto_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('SECRETO');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('SECRETO', s); }
  return s;
}

// ======== FAMILIAS: MI CUENTA ========
function familiaDe_(sesion) {
  const fam = filas_('Familias').filter(f => normEmail_(f.email) === sesion.e)[0];
  if (!fam) throw new Error('No encontramos tu familia.');
  return fam;
}

function accMiCuenta_(d, sesion) {
  const fam = familiaDe_(sesion), hoy = hoy_();
  const chicos = filas_('Chicos').filter(c => c.familiaId === fam.id);
  const ids = chicos.map(c => c.id);
  const insc = filas_('Inscripciones').filter(i => i.familiaId === fam.id).map(inscPublica_);
  const sedes = {}, grupos = {};
  insc.forEach(i => { if (i.estado !== 'Cancelada') { sedes[i.sede] = 1; grupos[i.sede + '|' + i.grupo] = 1; } });
  const pubs = filas_('Publicaciones').filter(p => esSi_(p.visible) && sedes[p.sede] && (p.grupo === 'todos' || grupos[p.sede + '|' + p.grupo]))
    .map(pubPublica_).sort((a, b) => b.ts - a.ts).slice(0, 60);
  const asis = filas_('Asistencia').filter(a => ids.indexOf(a.chicoId) >= 0)
    .map(a => ({ fecha: iso_(a.fecha), chicoId: a.chicoId, chico: a.chico, estado: a.estado, llegada: a.horaLlegada, retiradoPor: a.retiradoPor, retiro: a.horaRetiro, nota: a.nota }))
    .sort((a, b) => a.fecha < b.fecha ? 1 : -1).slice(0, 120);
  const lunes = lunes_(hoy), proximo = sumarDias_(lunes, 7);
  const crono = filas_('Cronograma').filter(c => sedes[c.sede] && (iso_(c.semana) === lunes || iso_(c.semana) === proximo) && (c.grupo === 'todos' || grupos[c.sede + '|' + c.grupo]))
    .map(cronoPublico_);
  const pagos = filas_('Pagos').filter(p => p.familiaId === fam.id).map(p => ({ fecha: iso_(p.fecha), chico: p.chico, monto: Number(p.monto), medio: p.medio }));
  return {
    familia: { adulto: fam.adulto, email: fam.email, whatsapp: fam.whatsapp, autorizadosRetiro: fam.autorizadosRetiro, emergenciaNombre: fam.emergenciaNombre, emergenciaTel: fam.emergenciaTel },
    chicos: chicos.map(c => ({ id: c.id, nombre: c.nombre, nacimiento: iso_(c.nacimiento), sede: c.sede, grupo: c.grupo, obraSocial: c.obraSocial,
      alergias: c.alergias, medicacion: c.medicacion, condiciones: c.condiciones, sabeNadar: c.sabeNadar, autorizaFotos: c.autorizaFotos })),
    inscripciones: insc, publicaciones: pubs, asistencia: asis, cronograma: crono, pagos, hoy
  };
}

function accRenovar_(d, sesion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const fam = familiaDe_(sesion);
    const sede = sedeCfg_(d.sede);
    const chicos = filas_('Chicos').filter(c => c.familiaId === fam.id && (d.chicoIds || []).indexOf(c.id) >= 0);
    if (!chicos.length) throw new Error('Elegí a quién inscribís.');
    chicos.forEach(c => { if (c.sede !== sede.id) { actualizar_('Chicos', c._fila, { sede: sede.id }); c.sede = sede.id; } });
    // Es renovación si el chico ya tiene una inscripción vigente o recién terminada
    const hoy = hoy_();
    const renov = filas_('Inscripciones').some(i => chicos.some(c => c.id === i.chicoId) && i.estado !== 'Cancelada' && iso_(i.fechaFin) >= sumarDias_(hoy, -7));
    const res = crearInscripciones_(fam, chicos, sede.id, d.plan, 'renovación', renov);
    mailInscripcion_(fam, res, sede);
    avisarAdmin_(sede.id, '🔁 ' + (renov ? 'Renovación' : 'Nueva inscripción') + ' · ' + res.items.map(i => i.chico).join(', '), mailAdminInscripcion_(fam, res, sede));
    return res;
  } finally { lock.releaseLock(); }
}

function accGuardarChicoFamilia_(d, sesion) {
  const fam = familiaDe_(sesion);
  const c = filas_('Chicos').filter(x => x.id === d.id && x.familiaId === fam.id)[0];
  if (!c) throw new Error('No encontramos a ese chico.');
  const patch = {};
  ['obraSocial', 'alergias', 'medicacion', 'condiciones', 'sabeNadar', 'notas'].forEach(k => { if (d[k] !== undefined) patch[k] = limpio_(d[k]); });
  if (d.autorizaFotos !== undefined) patch.autorizaFotos = d.autorizaFotos === 'No' ? 'No' : 'Sí';
  actualizar_('Chicos', c._fila, patch);
  if (d.autorizadosRetiro !== undefined) actualizar_('Familias', fam._fila, { autorizadosRetiro: limpio_(d.autorizadosRetiro) });
  return { ok: true };
}

function inscPublica_(i) {
  const total = Number(i.total) || 0, pagado = Number(i.pagado) || 0;
  const dias = String(i.dias || '').split(',').filter(Boolean), hoy = hoy_();
  return {
    id: i.id, familiaId: i.familiaId, chicoId: i.chicoId, chico: i.chico, sede: i.sede, grupo: i.grupo, modalidad: i.modalidad, turno: i.turno, extras: i.extras,
    dias, desde: iso_(i.fechaInicio), hasta: iso_(i.fechaFin), total, pagado, saldo: total - pagado, estado: i.estado,
    restantes: dias.filter(x => x >= hoy).length, notas: i.notas, creado: i.creado instanceof Date ? i.creado.getTime() : 0
  };
}
function pubPublica_(p) {
  const f = p.fecha instanceof Date ? p.fecha : new Date(p.fecha);
  return { id: p.id, ts: f.getTime(), fecha: Utilities.formatDate(f, TZ, 'yyyy-MM-dd HH:mm'), sede: p.sede, grupo: p.grupo, profe: p.profe, texto: p.texto,
    fotos: String(p.fotos || '').split(',').filter(Boolean), visible: esSi_(p.visible) };
}
function cronoPublico_(c) {
  return { id: c.id, sede: c.sede, semana: iso_(c.semana), dia: c.dia, hora: horaTxt_(c.hora), grupo: c.grupo, actividad: c.actividad, lugar: c.lugar, profe: c.profe };
}

// ======== PROFES ========
function profeDe_(sesion) {
  const p = filas_('Profes').filter(x => normEmail_(x.email) === sesion.e && esSi_(x.activo))[0];
  if (!p) throw new Error('Tu usuario de profe no está activo. Hablá con la administración.');
  return p;
}
function sedesDeProfe_(p) { return p.sede === 'ambas' || !p.sede ? Object.keys(CONFIG.sedes) : [p.sede]; }

function accProfeInicio_(d, sesion) {
  const p = profeDe_(sesion), hoy = hoy_(), lunes = lunes_(hoy);
  const sedes = sedesDeProfe_(p);
  const marc = marcajes_().filter(m => m.profeId === p.id);
  const abierto = turnoAbierto_(marc);
  const hoyMarc = marc.filter(m => diaDe_(m.fechaHora) === hoy).map(m => ({ tipo: m.tipo, hora: Utilities.formatDate(m.fechaHora, TZ, 'HH:mm'), sede: m.sede }));
  const mes = d.mes || hoy.slice(0, 7);
  const liq = liquidarProfe_(p, mes, marc);
  const crono = filas_('Cronograma').filter(c => sedes.indexOf(c.sede) >= 0 && [lunes, sumarDias_(lunes, 7)].indexOf(iso_(c.semana)) >= 0).map(cronoPublico_);
  const pubs = filas_('Publicaciones').filter(x => sedes.indexOf(x.sede) >= 0 && x.profe === p.nombre).map(pubPublica_).sort((a, b) => b.ts - a.ts).slice(0, 20);
  return {
    profe: { id: p.id, nombre: p.nombre, sede: p.sede, sedes, grupos: String(p.grupos || '').split(',').map(s => s.trim()).filter(Boolean) },
    abierto: abierto ? { sede: abierto.sede, desde: Utilities.formatDate(abierto.fechaHora, TZ, 'HH:mm') } : null,
    hoyMarc, liq, cronograma: crono, publicaciones: pubs,
    ubicaciones: sedes.map(id => Object.assign({ id, nombre: CONFIG.sedes[id].nombre }, geo_(id))), hoy
  };
}

function accMarcar_(d, sesion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const p = profeDe_(sesion);
    const lat = Number(d.lat), lng = Number(d.lng);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) throw new Error('No llegó tu ubicación. Activá el GPS y probá de nuevo.');
    let mejor = null;
    sedesDeProfe_(p).forEach(id => {
      const g = geo_(id);
      if (!g.lat) return;
      const dist = Math.round(distanciaM_(lat, lng, g.lat, g.lng));
      if (!mejor || dist < mejor.dist) mejor = { id, dist, radio: g.radio };
    });
    if (!mejor) throw new Error('Todavía no se cargó la ubicación de tu sede. Avisale a la administración.');
    const marc = marcajes_().filter(m => m.profeId === p.id);
    const abierto = turnoAbierto_(marc);
    const tipo = abierto ? 'SALIDA' : 'ENTRADA';
    if (d.esperado && d.esperado !== tipo) return { refrescar: true, mensaje: 'Tu estado cambió (¿marcaste desde otro celular?). Revisá y volvé a tocar.' };
    if (mejor.dist > mejor.radio) {
      throw new Error('Estás a ' + formatoDist_(mejor.dist) + ' de ' + CONFIG.sedes[mejor.id].nombre + '. Para marcar tenés que estar a menos de ' + mejor.radio + ' m.');
    }
    const sedeMarca = tipo === 'SALIDA' ? abierto.sede : mejor.id;
    agregar_('Marcajes', { id: uid_(), profeId: p.id, nombre: p.nombre, sede: sedeMarca, tipo, fechaHora: new Date(), lat, lng, distancia: mejor.dist,
      precision: Math.round(Number(d.precision) || 0), origen: 'gps' });
    return { tipo, sede: CONFIG.sedes[sedeMarca].nombre, distancia: mejor.dist, hora: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
  } finally { lock.releaseLock(); }
}

function marcajes_() {
  return filas_('Marcajes').map(m => Object.assign(m, { fechaHora: m.fechaHora instanceof Date ? m.fechaHora : new Date(m.fechaHora) }))
    .sort((a, b) => a.fechaHora - b.fechaHora);
}
function turnoAbierto_(marcProfe) {
  const ult = marcProfe[marcProfe.length - 1];
  if (!ult || ult.tipo !== 'ENTRADA') return null;
  return (Date.now() - ult.fechaHora) / 3600000 > CONFIG.horasTurnoMax ? null : ult;
}
function turnos_(marcProfe) {
  const out = [];
  let abierta = null;
  marcProfe.forEach(m => {
    if (m.tipo === 'ENTRADA') abierta = m;
    else if (m.tipo === 'SALIDA' && abierta) {
      const h = (m.fechaHora - abierta.fechaHora) / 3600000;
      if (h > 0 && h <= CONFIG.horasTurnoMax) out.push({ dia: diaDe_(abierta.fechaHora), sede: abierta.sede, horas: h,
        entrada: Utilities.formatDate(abierta.fechaHora, TZ, 'HH:mm'), salida: Utilities.formatDate(m.fechaHora, TZ, 'HH:mm') });
      abierta = null;
    }
  });
  return out;
}
function liquidarProfe_(p, mes, marcProfe) {
  const ts = turnos_(marcProfe || marcajes_().filter(m => m.profeId === p.id)).filter(t => t.dia.slice(0, 7) === mes);
  const horas = ts.reduce((a, t) => a + t.horas, 0);
  const dias = {}; ts.forEach(t => { dias[t.dia] = 1; });
  const semanas = {}; ts.forEach(t => { semanas[lunes_(t.dia)] = 1; });
  const valor = Number(p.valor) || 0;
  const devengado = Math.round({ hora: horas * valor, dia: Object.keys(dias).length * valor, semana: Object.keys(semanas).length * valor, mensual: ts.length ? valor : 0 }[p.formaPago] || 0);
  const pagado = filas_('PagosProfes').filter(x => x.profeId === p.id && iso_(x.fecha).slice(0, 7) === mes).reduce((a, x) => a + (Number(x.monto) || 0), 0);
  return { mes, horas: Math.round(horas * 100) / 100, dias: Object.keys(dias).length, turnos: ts, devengado, pagado, saldo: devengado - pagado,
    formaPago: FORMAS_PAGO[p.formaPago] || p.formaPago, valor };
}

function accLista_(d, sesion) {
  const p = profeDe_(sesion);
  const sede = d.sede || sedesDeProfe_(p)[0];
  if (sedesDeProfe_(p).indexOf(sede) < 0) throw new Error('No tenés acceso a esa sede.');
  return listaDelDia_(sede, d.fecha || hoy_(), d.grupo || 'todos');
}

function listaDelDia_(sede, fecha, grupo) {
  const chicos = {}; filas_('Chicos').forEach(c => { chicos[c.id] = c; });
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  const asis = {}; filas_('Asistencia').forEach(a => { if (iso_(a.fecha) === fecha && a.sede === sede) asis[a.chicoId] = a; });
  const vistos = {}, out = [];
  filas_('Inscripciones').forEach(i => {
    if (i.sede !== sede || i.estado === 'Cancelada' || vistos[i.chicoId]) return;
    if (String(i.dias || '').split(',').indexOf(fecha) < 0) return;
    if (grupo !== 'todos' && i.grupo !== grupo) return;
    vistos[i.chicoId] = 1;
    const c = chicos[i.chicoId] || {}, f = fams[i.familiaId] || {}, a = asis[i.chicoId] || {};
    out.push({
      chicoId: i.chicoId, nombre: i.chico, grupo: i.grupo, turno: i.turno, extras: i.extras, edad: c.nacimiento ? edadEn_(iso_(c.nacimiento), fecha) : '',
      alergias: c.alergias || '', medicacion: c.medicacion || '', condiciones: c.condiciones || '', sabeNadar: c.sabeNadar || '', autorizaFotos: c.autorizaFotos || 'Sí',
      obraSocial: c.obraSocial || '', adulto: f.adulto || '', whatsapp: f.whatsapp || '', autorizados: f.autorizadosRetiro || '',
      emergencia: (f.emergenciaNombre || '') + ' ' + (f.emergenciaTel || ''), saldo: (Number(i.total) || 0) - (Number(i.pagado) || 0),
      estado: a.estado || '', llegada: horaTxt_(a.horaLlegada), retiradoPor: a.retiradoPor || '', retiro: horaTxt_(a.horaRetiro), nota: a.nota || ''
    });
  });
  out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { sede, fecha, grupo, chicos: out };
}

function accGuardarAsistencia_(d, sesion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = profeDe_(sesion);
    if (sedesDeProfe_(p).indexOf(d.sede) < 0) throw new Error('No tenés acceso a esa sede.');
    const fecha = d.fecha || hoy_();
    const previos = {}; filas_('Asistencia').forEach(a => { if (iso_(a.fecha) === fecha && a.sede === d.sede) previos[a.chicoId] = a; });
    const permitidos = {}; listaDelDia_(d.sede, fecha, 'todos').chicos.forEach(c => { permitidos[c.chicoId] = c; });
    let n = 0;
    (d.items || []).forEach(it => {
      const c = permitidos[it.chicoId];
      if (!c) return;
      const datos = { fecha, sede: d.sede, grupo: c.grupo, chicoId: it.chicoId, chico: c.nombre, estado: limpio_(it.estado), horaLlegada: limpio_(it.llegada),
        retiradoPor: limpio_(it.retiradoPor), horaRetiro: limpio_(it.retiro), nota: limpio_(it.nota), profe: p.nombre, actualizado: new Date() };
      const prev = previos[it.chicoId];
      if (prev) actualizar_('Asistencia', prev._fila, datos); else agregar_('Asistencia', Object.assign({ id: uid_() }, datos));
      n++;
      if (CONFIG.avisarRetiroFamilia && datos.retiradoPor && (!prev || !prev.retiradoPor)) avisarRetiro_(it.chicoId, datos);
    });
    return { guardados: n };
  } finally { lock.releaseLock(); }
}

function avisarRetiro_(chicoId, a) {
  const c = filas_('Chicos').filter(x => x.id === chicoId)[0];
  const f = c && filas_('Familias').filter(x => x.id === c.familiaId)[0];
  if (!f || !f.email) return;
  MailApp.sendEmail({ to: f.email, name: CONFIG.marca, subject: '👋 ' + a.chico + ' ya salió de la escuela',
    htmlBody: marcoMail_(a.sede, '<p>' + esc_(a.chico) + ' fue retirado/a por <b>' + esc_(a.retiradoPor) + '</b> a las ' + esc_(a.horaRetiro) + ' h.</p>') });
}

function accPublicar_(d, sesion) {
  const p = profeDe_(sesion);
  if (sedesDeProfe_(p).indexOf(d.sede) < 0) throw new Error('No tenés acceso a esa sede.');
  const fotos = (d.fotos || []).slice(0, 10);
  if (!fotos.length && !limpio_(d.texto)) throw new Error('Escribí algo o sumá una foto.');
  const carpeta = carpetaFotos_(d.sede);
  const ids = fotos.map((f, i) => {
    const blob = Utilities.newBlob(Utilities.base64Decode(f.b64), f.tipo || 'image/jpeg', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd_HHmm') + '_' + (i + 1) + '.jpg');
    const file = carpeta.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* cuentas de dominio pueden no permitirlo */ }
    return file.getId();
  });
  agregar_('Publicaciones', { id: 'P' + uid_(), fecha: new Date(), sede: d.sede, grupo: d.grupo || 'todos', profe: p.nombre, texto: limpio_(d.texto), fotos: ids.join(','), visible: 'Sí' });
  return { fotos: ids.length };
}

function carpetaFotos_(sede) {
  const props = PropertiesService.getScriptProperties();
  let raizId = props.getProperty('CARPETA_FOTOS'), raiz;
  try { raiz = raizId && DriveApp.getFolderById(raizId); } catch (e) { raiz = null; }
  if (!raiz) { raiz = DriveApp.createFolder('Escuela de Verano — Fotos'); props.setProperty('CARPETA_FOTOS', raiz.getId()); }
  if (!sede) return raiz;
  const nombre = CONFIG.sedes[sede].nombre;
  const it = raiz.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : raiz.createFolder(nombre);
}

// ======== ADMINISTRACIÓN ========
function sedeAdmin_(d, sesion) {
  if (sesion.s !== 'todas') return sesion.s;
  return d.sede && CONFIG.sedes[d.sede] ? d.sede : 'todas';
}
function enSede_(sede, x) { return sede === 'todas' || x === sede || x === 'ambas'; }

function accTablero_(d, sesion) {
  const sede = sedeAdmin_(d, sesion), hoy = hoy_();
  const insc = filas_('Inscripciones').filter(i => enSede_(sede, i.sede)).map(inscPublica_);
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  const chicos = {}; filas_('Chicos').forEach(c => { chicos[c.id] = c; });
  insc.forEach(i => {
    const f = fams[i.familiaId] || {};
    i.adulto = f.adulto || ''; i.email = f.email || ''; i.whatsapp = f.whatsapp || '';
  });
  const activas = insc.filter(i => i.estado !== 'Cancelada');
  // Próximo día de inscripción por chico, para saber si ya renovó
  const ultimoDia = {};
  activas.forEach(i => { if (!ultimoDia[i.chicoId] || i.hasta > ultimoDia[i.chicoId]) ultimoDia[i.chicoId] = i.hasta; });
  const limite = sumarDias_(hoy, CONFIG.diasAvisoRenovacion + 2);
  const vencen = activas.filter(i => i.hasta >= hoy && i.hasta <= limite && ultimoDia[i.chicoId] === i.hasta)
    .map(i => Object.assign({}, i, { wa: linkWhatsApp_(i.whatsapp, mensajeRenovacion_(i)) }));
  const deudas = activas.filter(i => i.saldo > 0).sort((a, b) => a.desde < b.desde ? -1 : 1)
    .map(i => Object.assign({}, i, { vencida: i.desde <= hoy, wa: linkWhatsApp_(i.whatsapp, mensajeDeuda_(i)) }));
  const hoyEsperados = {}, hoyPresentes = {};
  activas.forEach(i => { if (i.dias.indexOf(hoy) >= 0) hoyEsperados[i.sede] = (hoyEsperados[i.sede] || 0) + 1; });
  filas_('Asistencia').forEach(a => { if (iso_(a.fecha) === hoy && enSede_(sede, a.sede) && (a.estado === 'presente' || a.estado === 'tarde')) hoyPresentes[a.sede] = (hoyPresentes[a.sede] || 0) + 1; });
  const pagos = filas_('Pagos').filter(p => enSede_(sede, p.sede)).map(p => ({ id: p.id, fecha: iso_(p.fecha), chico: p.chico, sede: p.sede, monto: Number(p.monto) || 0, medio: p.medio, nota: p.nota, inscripcionId: p.inscripcionId }))
    .sort((a, b) => a.fecha < b.fecha ? 1 : -1);
  const mes = d.mes || hoy.slice(0, 7);
  const marc = marcajes_();
  const profes = filas_('Profes').filter(p => enSede_(sede, p.sede) || sede === 'todas').map(p => {
    const mp = marc.filter(m => m.profeId === p.id);
    const ab = turnoAbierto_(mp);
    return { id: p.id, nombre: p.nombre, email: p.email, whatsapp: p.whatsapp, sede: p.sede, grupos: p.grupos, formaPago: p.formaPago, valor: Number(p.valor) || 0,
      activo: esSi_(p.activo), notas: p.notas, adentro: ab ? CONFIG.sedes[ab.sede] ? CONFIG.sedes[ab.sede].nombre + ' desde ' + Utilities.formatDate(ab.fechaHora, TZ, 'HH:mm') : 'sí' : '',
      liq: liquidarProfe_(p, mes, mp) };
  });
  const porGrupo = {};
  const semana = semanaActual_(sede === 'todas' ? 'aldea' : sede, hoy);
  activas.forEach(i => {
    if (!semana || !i.dias.some(x => semana.dias.indexOf(x) >= 0)) return;
    const k = i.sede + '|' + i.grupo; porGrupo[k] = (porGrupo[k] || 0) + 1;
  });
  const sum = (arr, k) => arr.reduce((a, x) => a + (Number(x[k]) || 0), 0);
  return {
    sede, sesionSede: sesion.s, hoy, mes,
    kpis: {
      chicos: Object.keys(activas.reduce((a, i) => (a[i.chicoId] = 1, a), {})).length,
      inscripciones: activas.length, facturado: sum(activas, 'total'), cobrado: sum(activas, 'pagado'), pendiente: sum(activas, 'saldo'),
      hoyEsperados, hoyPresentes, interesados: filas_('Interesados').filter(x => enSede_(sede, x.sede)).length,
      cuotaMail: MailApp.getRemainingDailyQuota()
    },
    porGrupo, vencen, deudas, pagos: pagos.slice(0, 300), profes,
    inscripciones: insc.sort((a, b) => b.creado - a.creado),
    familias: Object.keys(fams).map(k => fams[k]).filter(f => insc.some(i => i.familiaId === f.id)).map(f => ({ id: f.id, adulto: f.adulto, email: f.email, whatsapp: f.whatsapp,
      emergencia: (f.emergenciaNombre || '') + ' ' + (f.emergenciaTel || ''), autorizados: f.autorizadosRetiro, comoNosConocio: f.comoNosConocio })),
    chicos: Object.keys(chicos).map(k => chicos[k]).filter(c => enSede_(sede, c.sede)).map(c => ({ id: c.id, familiaId: c.familiaId, nombre: c.nombre, nacimiento: iso_(c.nacimiento),
      sede: c.sede, grupo: c.grupo, alergias: c.alergias, medicacion: c.medicacion, condiciones: c.condiciones, obraSocial: c.obraSocial, sabeNadar: c.sabeNadar, autorizaFotos: c.autorizaFotos })),
    tematicas: filas_('Tematicas').filter(t => enSede_(sede, t.sede)).map(t => ({ id: t.id, sede: t.sede, semana: iso_(t.semana), titulo: t.titulo, descripcion: t.descripcion, emoji: t.emoji })),
    cronograma: filas_('Cronograma').filter(c => enSede_(sede, c.sede)).map(cronoPublico_),
    publicaciones: filas_('Publicaciones').filter(p => enSede_(sede, p.sede)).map(pubPublica_).sort((a, b) => b.ts - a.ts).slice(0, 40),
    ubicaciones: Object.keys(CONFIG.sedes).filter(id => enSede_(sede, id)).map(id => Object.assign({ id, nombre: CONFIG.sedes[id].nombre }, geo_(id))),
    ajustes: ajustesPublicos_(sesion.s),
    url: ScriptApp.getService().getUrl(), planilla: SpreadsheetApp.getActiveSpreadsheet().getUrl()
  };
}

function semanaActual_(sedeId, hoy) {
  const ss = semanas_(sedeId);
  return ss.filter(s => s.id === lunes_(hoy))[0] || ss.filter(s => s.desde >= hoy)[0] || null;
}

function filaInsc_(id, sesion) {
  const i = filas_('Inscripciones').filter(x => x.id === id)[0];
  if (!i) throw new Error('No encuentro la inscripción ' + id + '.');
  if (sesion.s !== 'todas' && i.sede !== sesion.s) throw new Error('Esa inscripción es de la otra sede.');
  return i;
}

function accRegistrarPago_(d, sesion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const i = filaInsc_(d.inscripcionId, sesion);
    const monto = Math.round(Number(String(d.monto).replace(/[^\d,-]/g, '').replace(',', '.')));
    if (!monto) throw new Error('Poné el monto.');
    agregar_('Pagos', { id: uid_(), fecha: d.fecha || hoy_(), inscripcionId: i.id, familiaId: i.familiaId, chico: i.chico, sede: i.sede, monto,
      medio: limpio_(d.medio) || 'Transferencia', nota: limpio_(d.nota), cargadoPor: sesion.s });
    const r = recalcularInsc_(i.id);
    if (d.avisar) {
      const f = filas_('Familias').filter(x => x.id === i.familiaId)[0];
      if (f && f.email) MailApp.sendEmail({ to: f.email, name: CONFIG.marca, subject: '✅ Recibimos tu pago · ' + i.chico,
        htmlBody: marcoMail_(i.sede, '<p>¡Hola ' + esc_(primerNombre_(f.adulto)) + '! Registramos tu pago de <b>' + pesos_(monto) + '</b> para ' + esc_(i.chico) + '.</p>' +
          '<p>' + (r.saldo > 0 ? 'Te queda un saldo de <b>' + pesos_(r.saldo) + '</b>.' : '¡Está todo pago! 🎉') + '</p>' + boton_(urlCuenta_(), 'Ver mi cuenta', colorSede_(i.sede))) });
    }
    return r;
  } finally { lock.releaseLock(); }
}

function recalcularInsc_(id) {
  const i = filas_('Inscripciones').filter(x => x.id === id)[0];
  const pagado = filas_('Pagos').filter(p => p.inscripcionId === id).reduce((a, p) => a + (Number(p.monto) || 0), 0);
  const total = Number(i.total) || 0;
  const estado = i.estado === 'Cancelada' ? 'Cancelada' : pagado >= total && total > 0 ? 'Pagada' : pagado > 0 ? 'Señada' : 'Pendiente';
  actualizar_('Inscripciones', i._fila, { pagado, saldo: total - pagado, estado });
  return { pagado, saldo: total - pagado, estado };
}

function recalcularTodo() { filas_('Inscripciones').forEach(i => recalcularInsc_(i.id)); }

function accCambiarEstado_(d, sesion) {
  const i = filaInsc_(d.inscripcionId, sesion);
  if (d.estado === 'Cancelada') { actualizar_('Inscripciones', i._fila, { estado: 'Cancelada' }); return { estado: 'Cancelada' }; }
  actualizar_('Inscripciones', i._fila, { estado: 'Pendiente' });
  if (d.total !== undefined && d.total !== '') actualizar_('Inscripciones', i._fila, { total: Math.round(Number(d.total)) || 0 });
  if (d.notas !== undefined) actualizar_('Inscripciones', i._fila, { notas: limpio_(d.notas) });
  return recalcularInsc_(i.id);
}

function accAsignarGrupo_(d, sesion) {
  if (!CONFIG.grupos.some(g => g.id === d.grupo)) throw new Error('Grupo inválido.');
  const c = filas_('Chicos').filter(x => x.id === d.chicoId)[0];
  if (!c) throw new Error('No encuentro al chico.');
  actualizar_('Chicos', c._fila, { grupo: d.grupo });
  const hoy = hoy_();
  filas_('Inscripciones').forEach(i => {
    if (i.chicoId === c.id && iso_(i.fechaFin) >= hoy && (sesion.s === 'todas' || i.sede === sesion.s)) actualizar_('Inscripciones', i._fila, { grupo: d.grupo });
  });
  return { ok: true };
}

function accRecordar_(d, sesion) {
  const i = filaInsc_(d.inscripcionId, sesion);
  const f = filas_('Familias').filter(x => x.id === i.familiaId)[0];
  if (!f || !f.email) throw new Error('Esa familia no tiene mail.');
  const pub = inscPublica_(i);
  if (d.tipo === 'renovacion') { mailRenovacion_(f, pub); actualizar_('Inscripciones', i._fila, { avisoRenovacion: new Date() }); }
  else { mailDeuda_(f, pub); actualizar_('Inscripciones', i._fila, { avisoDeuda: new Date() }); }
  return { ok: true };
}

function accGuardarProfe_(d, sesion) {
  const sede = sesion.s === 'todas' ? (d.sede || 'ambas') : sesion.s;
  const email = normEmail_(d.email);
  if (!limpio_(d.nombre)) throw new Error('Falta el nombre.');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Falta un mail válido: con ese mail entra a la app.');
  const datos = { nombre: limpio_(d.nombre), email, whatsapp: limpio_(d.whatsapp), sede, grupos: (d.grupos || []).join ? d.grupos.join(',') : limpio_(d.grupos),
    formaPago: FORMAS_PAGO[d.formaPago] ? d.formaPago : 'hora', valor: Math.round(Number(d.valor)) || 0, activo: d.activo === false ? 'No' : 'Sí', notas: limpio_(d.notas) };
  const todos = filas_('Profes');
  if (todos.some(p => normEmail_(p.email) === email && p.id !== d.id)) throw new Error('Ya hay un profe con ese mail.');
  const ex = d.id && todos.filter(p => p.id === d.id)[0];
  if (ex) {
    if (sesion.s !== 'todas' && ex.sede !== sesion.s) throw new Error('Ese profe es de la otra sede.');
    actualizar_('Profes', ex._fila, datos);
    return { id: ex.id };
  }
  const id = 'T' + uid_();
  agregar_('Profes', Object.assign({ id, creado: new Date() }, datos));
  if (d.invitar !== false) {
    MailApp.sendEmail({ to: email, name: CONFIG.marca, subject: '☀️ Tu acceso de profe · ' + CONFIG.marca,
      htmlBody: marcoMail_(sede === 'ambas' ? '' : sede, '<p>¡Hola ' + esc_(primerNombre_(datos.nombre)) + '! Ya tenés tu acceso a la app de profes de la escuela de verano.</p>' +
        '<p>Entrás con este mail (te llega un código). Desde ahí marcás entrada y salida, tomás asistencia, subís fotos y ves el cronograma.</p>' +
        boton_(ScriptApp.getService().getUrl() + '?p=profes', 'Abrir la app de profes', '#2F4A38') +
        '<p style="color:#777">Tip: abrilo en el celular y agregalo a la pantalla de inicio.</p>') });
  }
  return { id };
}

function accPagarProfe_(d, sesion) {
  const p = filas_('Profes').filter(x => x.id === d.profeId)[0];
  if (!p) throw new Error('No encuentro al profe.');
  const monto = Math.round(Number(d.monto));
  if (!monto) throw new Error('Poné el monto.');
  agregar_('PagosProfes', { id: uid_(), fecha: d.fecha || hoy_(), profeId: p.id, nombre: p.nombre, sede: sesion.s === 'todas' ? p.sede : sesion.s, monto, concepto: limpio_(d.concepto) });
  return { ok: true };
}

function accMarcajeManual_(d, sesion) {
  const p = filas_('Profes').filter(x => x.id === d.profeId)[0];
  if (!p) throw new Error('No encuentro al profe.');
  const f = parseLocal_(d.fecha, d.hora);
  agregar_('Marcajes', { id: uid_(), profeId: p.id, nombre: p.nombre, sede: d.sede || (p.sede === 'ambas' ? 'aldea' : p.sede), tipo: d.tipo === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
    fechaHora: f, lat: '', lng: '', distancia: '', precision: '', origen: 'manual (' + sesion.s + ')' });
  return { ok: true };
}

function accGuardarTematica_(d, sesion) {
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  sedeCfg_(sede);
  const datos = { sede, semana: lunes_(d.semana), titulo: limpio_(d.titulo), descripcion: limpio_(d.descripcion), emoji: limpio_(d.emoji) };
  const ex = filas_('Tematicas').filter(t => t.id === d.id || (t.sede === sede && iso_(t.semana) === datos.semana))[0];
  if (ex) actualizar_('Tematicas', ex._fila, datos); else agregar_('Tematicas', Object.assign({ id: uid_() }, datos));
  return { ok: true };
}

function accGuardarCrono_(d, sesion) {
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  sedeCfg_(sede);
  if (!limpio_(d.actividad)) throw new Error('Escribí la actividad.');
  const datos = { sede, semana: lunes_(d.semana), dia: DIAS_SEM.concat(['todos']).indexOf(d.dia) >= 0 ? d.dia : 'todos', hora: limpio_(d.hora),
    grupo: d.grupo || 'todos', actividad: limpio_(d.actividad), lugar: limpio_(d.lugar), profe: limpio_(d.profe) };
  const ex = d.id && filas_('Cronograma').filter(c => c.id === d.id)[0];
  if (ex) actualizar_('Cronograma', ex._fila, datos); else agregar_('Cronograma', Object.assign({ id: uid_() }, datos));
  return { ok: true };
}

function accCopiarCrono_(d, sesion) {
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  const desde = lunes_(d.desde), hasta = lunes_(d.hasta);
  if (desde === hasta) throw new Error('Elegí otra semana de destino.');
  const filas = filas_('Cronograma').filter(c => c.sede === sede && iso_(c.semana) === desde);
  filas.forEach(c => agregar_('Cronograma', { id: uid_(), sede, semana: hasta, dia: c.dia, hora: horaTxt_(c.hora), grupo: c.grupo, actividad: c.actividad, lugar: c.lugar, profe: c.profe }));
  return { copiados: filas.length };
}

function accOcultarPublicacion_(d, sesion) {
  const p = filas_('Publicaciones').filter(x => x.id === d.id)[0];
  if (!p || (sesion.s !== 'todas' && p.sede !== sesion.s)) throw new Error('No encuentro la publicación.');
  actualizar_('Publicaciones', p._fila, { visible: d.visible ? 'Sí' : 'No' });
  return { ok: true };
}

function borrarFila_(hoja, id, sesion) {
  const f = filas_(hoja).filter(x => x.id === id)[0];
  if (!f) throw new Error('Ya no existe.');
  if (sesion.s !== 'todas' && f.sede !== sesion.s) throw new Error('Es de la otra sede.');
  hoja_(hoja).deleteRow(f._fila);
  delete MEMO_[hoja];
  return { ok: true };
}

function accMailMasivo_(d, sesion) {
  const sede = sesion.s === 'todas' ? (d.sede || 'todas') : sesion.s;
  const asunto = limpio_(d.asunto), texto = String(d.mensaje || '').trim();
  if (!asunto || !texto) throw new Error('Completá asunto y mensaje.');
  const hoy = hoy_();
  const destinos = {};
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  if (d.a === 'interesados' || d.a === 'todos') filas_('Interesados').forEach(x => { if (enSede_(sede, x.sede)) destinos[normEmail_(x.email)] = x.nombre || ''; });
  if (d.a !== 'interesados') {
    filas_('Inscripciones').forEach(i => {
      if (!enSede_(sede, i.sede) || i.estado === 'Cancelada') return;
      if (d.a === 'activas' && iso_(i.fechaFin) < hoy) return;
      if (d.a === 'deudores' && (Number(i.total) - Number(i.pagado)) <= 0) return;
      if (d.grupo && d.grupo !== 'todos' && i.grupo !== d.grupo) return;
      const f = fams[i.familiaId];
      if (f && f.email) destinos[normEmail_(f.email)] = f.adulto || '';
    });
  }
  const lista = Object.keys(destinos).filter(Boolean);
  if (!lista.length) throw new Error('No hay destinatarios con ese filtro.');
  if (d.prueba) lista.splice(0, lista.length, Session.getEffectiveUser().getEmail());
  const cuota = MailApp.getRemainingDailyQuota();
  if (lista.length > cuota) throw new Error('Hoy solo se pueden mandar ' + cuota + ' mails más (límite de Google). Son ' + lista.length + '.');
  const cuerpo = esc_(texto).replace(/\n/g, '<br>');
  lista.forEach(email => {
    const nombre = primerNombre_(destinos[email]);
    MailApp.sendEmail({ to: email, name: CONFIG.marca, subject: asunto,
      htmlBody: marcoMail_(sede === 'todas' ? '' : sede, (nombre ? '<p>¡Hola ' + esc_(nombre) + '!</p>' : '') + '<p>' + cuerpo + '</p>' + boton_(urlCuenta_(), 'Entrar a la escuela de verano', colorSede_(sede))) });
  });
  agregar_('Avisos', { fecha: new Date(), tipo: 'masivo' + (d.prueba ? ' (prueba)' : ''), sede, destino: lista.length + ' familias', referencia: d.a, detalle: asunto });
  return { enviados: lista.length };
}

function accFijarUbicacion_(d, sesion) {
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  sedeCfg_(sede);
  const lat = Number(d.lat), lng = Number(d.lng), radio = Math.max(30, Math.min(2000, Number(d.radio) || 150));
  if (!isFinite(lat) || !isFinite(lng)) throw new Error('Ubicación inválida.');
  guardarConfig_('lat_' + sede, lat, 'Centro de ' + CONFIG.sedes[sede].nombre);
  guardarConfig_('lng_' + sede, lng, '');
  guardarConfig_('radio_' + sede, radio, 'Metros para poder marcar');
  return geo_(sede);
}

function accGuardarAjustes_(d, sesion) {
  const permitidas = sesion.s === 'todas' ? null : ['pin_' + sesion.s, 'email_' + sesion.s];
  Object.keys(d.valores || {}).forEach(k => {
    if (!/^(pin|email)_|^(pinGeneral|emailGeneral)$/.test(k)) return;
    if (permitidas && permitidas.indexOf(k) < 0) return;
    const v = limpio_(d.valores[k]);
    if (/^pin/.test(k) && !/^\d{4,8}$/.test(v)) throw new Error('Los PIN tienen que ser de 4 a 8 números.');
    guardarConfig_(k, v);
  });
  return ajustesPublicos_(sesion.s);
}
function ajustesPublicos_(s) {
  const cfg = config_(), out = {};
  Object.keys(cfg).forEach(k => { if (/^(pin|email)/.test(k) && (s === 'todas' || k.slice(-s.length - 1) === '_' + s)) out[k] = cfg[k]; });
  return out;
}

// ======== AVISOS AUTOMÁTICOS ========
function tareaDiaria() {
  const hoy = hoy_();
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  const todas = filas_('Inscripciones').filter(i => i.estado !== 'Cancelada');
  const ultimoDia = {};
  todas.forEach(i => { const h = iso_(i.fechaFin); if (!ultimoDia[i.chicoId] || h > ultimoDia[i.chicoId]) ultimoDia[i.chicoId] = h; });
  const porSede = {};
  Object.keys(CONFIG.sedes).forEach(id => { porSede[id] = { vencen: [], deudas: [], sinPagar: [] }; });
  const limite = sumarDias_(hoy, CONFIG.diasAvisoRenovacion);

  todas.forEach(fila => {
    const i = inscPublica_(fila), f = fams[fila.familiaId] || {};
    i.adulto = f.adulto; i.whatsapp = f.whatsapp;
    const S = porSede[i.sede];
    if (!S) return;
    // 1) Se termina y no renovó → mail a la familia ofreciendo renovar
    if (i.hasta >= hoy && i.hasta <= limite && ultimoDia[i.chicoId] === i.hasta) {
      S.vencen.push(i);
      if (!fila.avisoRenovacion && f.email) {
        try { mailRenovacion_(f, i); actualizar_('Inscripciones', fila._fila, { avisoRenovacion: new Date() }); } catch (e) { Logger.log(e); }
      }
    }
    // 2) Debe plata y ya empezó (o empieza en 3 días) → recordatorio cada X días
    if (i.saldo > 0 && i.desde <= sumarDias_(hoy, 3)) {
      S.deudas.push(i);
      const ult = fila.avisoDeuda instanceof Date ? diaDe_(fila.avisoDeuda) : '';
      if (f.email && (!ult || ult <= sumarDias_(hoy, -CONFIG.diasEntreRecordatoriosDeuda))) {
        try { mailDeuda_(f, i); actualizar_('Inscripciones', fila._fila, { avisoDeuda: new Date() }); } catch (e) { Logger.log(e); }
      }
    }
    // 3) Inscripto hace más de 48 h sin ningún pago
    if (i.pagado === 0 && i.creado && Date.now() - i.creado > 48 * 3600000) S.sinPagar.push(i);
  });

  const cfg = config_();
  const partes = Object.keys(porSede).map(id => resumenSedeHtml_(id, porSede[id], hoy));
  Object.keys(porSede).forEach((id, n) => {
    const S = porSede[id];
    if (!S.vencen.length && !S.deudas.length && !S.sinPagar.length) return;
    if (cfg['email_' + id]) enviarMail_(cfg['email_' + id], '☀️ ' + CONFIG.sedes[id].nombre + ' · resumen del ' + fechaCorta_(hoy), partes[n], id);
  });
  if (cfg.emailGeneral && Object.keys(porSede).some(id => porSede[id].vencen.length || porSede[id].deudas.length || porSede[id].sinPagar.length)) {
    enviarMail_(cfg.emailGeneral, '☀️ Escuela de verano · resumen del ' + fechaCorta_(hoy), partes.join('<hr>'), '');
  }
}

function resumenSedeHtml_(id, S, hoy) {
  const fila = (i, wa, extra) => '<tr><td style="padding:6px 8px 6px 0"><b>' + esc_(i.chico) + '</b><br><span style="color:#777">' + esc_(i.adulto || '') + '</span></td>' +
    '<td style="padding:6px 8px">' + extra + '</td><td><a href="' + esc_(wa) + '" style="background:#25D366;color:#fff;padding:6px 10px;border-radius:8px;text-decoration:none">WhatsApp</a></td></tr>';
  const tabla = (titulo, lista, f) => lista.length ? '<h3 style="margin:18px 0 6px">' + titulo + ' (' + lista.length + ')</h3><table style="border-collapse:collapse;font-size:14px">' + lista.map(f).join('') + '</table>' : '';
  return '<h2 style="color:' + CONFIG.sedes[id].color + ';margin:0">' + esc_(CONFIG.sedes[id].nombre) + '</h2>' +
    tabla('🔁 Se les termina y no renovaron', S.vencen, i => fila(i, linkWhatsApp_(i.whatsapp, mensajeRenovacion_(i)), 'último día ' + fechaCorta_(i.hasta))) +
    tabla('💸 Deben', S.deudas, i => fila(i, linkWhatsApp_(i.whatsapp, mensajeDeuda_(i)), pesos_(i.saldo) + (i.desde <= hoy ? ' · ya empezó' : ' · empieza ' + fechaCorta_(i.desde)))) +
    tabla('⏳ Inscriptos hace +48 h sin seña', S.sinPagar, i => fila(i, linkWhatsApp_(i.whatsapp, mensajeDeuda_(i)), pesos_(i.total)));
}

function tareaSemanal() {
  const proximo = sumarDias_(lunes_(hoy_()), 7);
  const tem = {}; filas_('Tematicas').forEach(t => { if (iso_(t.semana) === proximo) tem[t.sede] = t; });
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  const envios = {};
  filas_('Inscripciones').forEach(i => {
    if (i.estado === 'Cancelada' || !tem[i.sede]) return;
    const dias = String(i.dias || '').split(',');
    if (!dias.some(d => d >= proximo && d <= sumarDias_(proximo, 4))) return;
    const f = fams[i.familiaId];
    if (!f || !f.email) return;
    const k = f.email + '|' + i.sede;
    envios[k] = envios[k] || { f, sede: i.sede, chicos: [] };
    envios[k].chicos.push(i.chico);
  });
  Object.keys(envios).forEach(k => {
    const e = envios[k], t = tem[e.sede];
    const crono = filas_('Cronograma').filter(c => c.sede === e.sede && iso_(c.semana) === proximo).map(cronoPublico_);
    try {
      enviarMail_(e.f.email, (t.emoji || '☀️') + ' La semana que viene: ' + t.titulo,
        '<p>¡Hola ' + esc_(primerNombre_(e.f.adulto)) + '! La semana que viene ' + esc_(e.chicos.join(' y ')) + ' ' + (e.chicos.length > 1 ? 'viven' : 'vive') + ' la temática:</p>' +
        '<h2 style="margin:6px 0">' + esc_((t.emoji || '') + ' ' + t.titulo) + '</h2><p>' + esc_(t.descripcion) + '</p>' +
        (crono.length ? '<p><b>Lo que viene:</b></p><ul>' + crono.slice(0, 12).map(c => '<li>' + esc_((c.dia === 'todos' ? 'Todos los días' : c.dia) + ' ' + (c.hora || '') + ' · ' + c.actividad) + '</li>').join('') + '</ul>' : '') +
        boton_(urlCuenta_(), 'Ver cronograma y fotos', colorSede_(e.sede)), e.sede);
    } catch (err) { Logger.log(err); }
  });
}

// ======== MAILS ========
function mensajeRenovacion_(i) {
  const s = CONFIG.sedes[i.sede];
  const pct = s.precios.descuentoRenovacion;
  return '¡Hola ' + primerNombre_(i.adulto) + '! ☀️ Te escribimos de la escuela de verano de ' + s.nombre + '. A ' + i.chico +
    ' le ' + (i.restantes === 1 ? 'queda 1 día' : 'quedan ' + i.restantes + ' días') + ' (hasta el ' + fechaCorta_(i.hasta) + '). ¿Querés que siga? ' +
    (pct ? 'Renovando antes de que termine tenés ' + pct + '% de descuento. ' : '') + 'Lo podés hacer desde ' + urlCuenta_();
}
function mensajeDeuda_(i) {
  return '¡Hola ' + primerNombre_(i.adulto) + '! Te escribimos de la escuela de verano de ' + CONFIG.sedes[i.sede].nombre + '. Te recordamos que queda un saldo de ' +
    pesos_(i.saldo) + ' de ' + i.chico + '. ' + datosPagoTexto_(i.sede).replace(/\n/g, ' · ') + '. ¡Gracias!';
}

function mailInscripcion_(fam, res, sede) {
  const filas = res.items.map(i => '<tr><td style="padding:4px 12px 4px 0">' + esc_(i.chico) + ' <span style="color:#777">(' + esc_(nombreGrupo_(i.grupo)) + ')</span></td><td><b>' + pesos_(i.total) + '</b></td></tr>').join('');
  enviarMail_(fam.email, '☀️ Recibimos la inscripción · ' + res.items.map(i => i.chico).join(' y '),
    '<p>¡Hola ' + esc_(primerNombre_(fam.adulto)) + '! Recibimos la inscripción a la escuela de verano de <b>' + esc_(sede.nombre) + '</b>.</p>' +
    '<p>' + esc_(res.detalle) + '<br>Del ' + fechaLarga_(res.desde) + ' al ' + fechaLarga_(res.hasta) + '</p>' +
    '<table style="border-collapse:collapse;margin:10px 0">' + filas + '<tr><td style="padding-top:8px">Total</td><td style="padding-top:8px"><b>' + pesos_(res.total) + '</b></td></tr></table>' +
    '<p>Para reservar el lugar necesitamos la seña de <b>' + pesos_(res.sena) + '</b> (' + sede.precios.senaPct + '%).</p>' +
    '<pre style="font-family:inherit;background:#F4EFE3;padding:12px;border-radius:8px">' + esc_(datosPagoTexto_(sede.id)) + '</pre>' +
    boton_(res.waComprobante, '💬 Mandar el comprobante por WhatsApp', '#25D366') +
    '<p>Desde <b>Mi cuenta</b> vas a ver las fotos del día, la asistencia, el cronograma y el saldo. Entrás con este mail.</p>' +
    boton_(urlCuenta_(), 'Entrar a mi cuenta', sede.color), sede.id);
}
function mailAdminInscripcion_(fam, res, sede) {
  return '<p><b>' + esc_(fam.adulto) + '</b> · ' + esc_(fam.whatsapp) + ' · ' + esc_(fam.email) + '</p>' +
    '<p>' + res.items.map(i => esc_(i.chico) + ' (' + esc_(nombreGrupo_(i.grupo)) + ') · ' + pesos_(i.total)).join('<br>') + '</p>' +
    '<p>' + esc_(res.detalle) + ' · ' + fechaCorta_(res.desde) + ' al ' + fechaCorta_(res.hasta) + '<br>Total ' + pesos_(res.total) + ' · Seña ' + pesos_(res.sena) + '</p>' +
    boton_(linkWhatsApp_(fam.whatsapp, '¡Hola ' + primerNombre_(fam.adulto) + '! Recibimos la inscripción de ' + res.items.map(i => i.chico).join(' y ') +
      ' a la escuela de verano de ' + sede.nombre + ' ☀️. Para reservar el lugar, la seña es de ' + pesos_(res.sena) + '. ' + datosPagoTexto_(sede.id).replace(/\n/g, ' · ')), '💬 Escribirle por WhatsApp', '#25D366');
}
function mailRenovacion_(f, i) {
  const s = CONFIG.sedes[i.sede];
  const prox = semanas_(i.sede).filter(w => w.desde > i.hasta)[0];
  const tem = prox && filas_('Tematicas').filter(t => t.sede === i.sede && iso_(t.semana) === prox.id)[0];
  enviarMail_(f.email, '⏳ A ' + i.chico + ' se le termina la escuela de verano',
    '<p>¡Hola ' + esc_(primerNombre_(f.adulto)) + '! A <b>' + esc_(i.chico) + '</b> le ' + (i.restantes === 1 ? 'queda <b>1 día</b>' : 'quedan <b>' + i.restantes + ' días</b>') +
    ' en ' + esc_(s.nombre) + ' (hasta el ' + fechaLarga_(i.hasta) + ').</p>' +
    (tem ? '<p>La semana que viene la temática es <b>' + esc_((tem.emoji || '') + ' ' + tem.titulo) + '</b>: ' + esc_(tem.descripcion) + '</p>' : '') +
    (s.precios.descuentoRenovacion ? '<p style="background:' + s.acento + ';padding:10px 12px;border-radius:8px"><b>Renovando antes de que termine tenés ' + s.precios.descuentoRenovacion + '% de descuento.</b></p>' : '') +
    boton_(urlCuenta_() + '#renovar', '🔁 Renovar en 1 minuto', s.color) +
    boton_(linkWhatsApp_(s.whatsapp, '¡Hola! Quiero renovar la escuela de verano de ' + i.chico + '.'), '💬 Consultar por WhatsApp', '#25D366'), i.sede);
}
function mailDeuda_(f, i) {
  enviarMail_(f.email, '💳 Saldo pendiente · escuela de verano de ' + i.chico,
    '<p>¡Hola ' + esc_(primerNombre_(f.adulto)) + '! Te recordamos que queda un saldo de <b>' + pesos_(i.saldo) + '</b> de la escuela de verano de ' + esc_(i.chico) + '.</p>' +
    '<pre style="font-family:inherit;background:#F4EFE3;padding:12px;border-radius:8px">' + esc_(datosPagoTexto_(i.sede)) + '</pre>' +
    boton_(linkWhatsApp_(CONFIG.sedes[i.sede].whatsapp, '¡Hola! Te mando el comprobante de ' + i.chico + ' (' + i.id + ').'), '💬 Mandar comprobante', '#25D366') +
    '<p style="color:#777">Si ya pagaste, ignorá este mail: puede tardar un día en impactar.</p>', i.sede);
}
function avisarAdmin_(sede, asunto, html) {
  const cfg = config_();
  const destinos = [cfg['email_' + sede], cfg.emailGeneral].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
  destinos.forEach(e => { try { enviarMail_(e, asunto, html, sede); } catch (err) { Logger.log(err); } });
}
function enviarMail_(to, asunto, html, sede) {
  MailApp.sendEmail({ to, subject: asunto, name: CONFIG.marca + (sede && CONFIG.sedes[sede] ? ' · ' + CONFIG.sedes[sede].nombre : ''), htmlBody: marcoMail_(sede, html) });
  agregar_('Avisos', { fecha: new Date(), tipo: 'mail', sede: sede || '', destino: to, referencia: '', detalle: asunto });
}
function marcoMail_(sede, cuerpo) {
  const s = CONFIG.sedes[sede];
  return '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:580px">' +
    '<div style="background:' + (s ? s.color : '#2F4A38') + ';color:#fff;padding:14px 18px;border-radius:12px 12px 0 0;font-size:18px"><b>☀️ ' + esc_(CONFIG.marca) + '</b>' +
    (s ? ' · ' + esc_(s.nombre) : '') + '</div><div style="padding:16px 18px;border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px">' + cuerpo + '</div></div>';
}
function boton_(url, texto, color) {
  return '<p><a href="' + esc_(url) + '" style="display:inline-block;background:' + color + ';color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:bold">' + esc_(texto) + '</a></p>';
}
function datosPagoTexto_(sedeId) {
  const p = CONFIG.sedes[sedeId].pago;
  return ['Alias: ' + p.alias, p.cbu ? 'CBU/CVU: ' + p.cbu : '', 'Banco: ' + p.banco, 'Titular: ' + p.titular].filter(Boolean).join('\n');
}
function urlCuenta_() { return ScriptApp.getService().getUrl() + '?p=cuenta'; }
function colorSede_(s) { return CONFIG.sedes[s] ? CONFIG.sedes[s].color : '#2F4A38'; }
function nombreGrupo_(id) { const g = CONFIG.grupos.filter(x => x.id === id)[0]; return g ? g.emoji + ' ' + g.nombre : id; }

// ======== PLANILLA ========
const MEMO_ = {};
function hoja_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HOJAS[nombre]);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold').setBackground('#2F4A38').setFontColor('#F4EFE3');
    (COLS_TEXTO[nombre] || []).forEach(c => sh.getRange(2, HOJAS[nombre].indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'));
  } else if (!MEMO_['_ok_' + nombre]) {
    const actuales = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const faltan = HOJAS[nombre].filter(c => actuales.indexOf(c) < 0);
    if (faltan.length) sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  MEMO_['_ok_' + nombre] = true;
  return sh;
}
function encab_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]; }
function filas_(nombre) {
  if (MEMO_[nombre]) return MEMO_[nombre];
  const sh = hoja_(nombre), last = sh.getLastRow();
  if (last < 2) return (MEMO_[nombre] = []);
  const vals = sh.getRange(1, 1, last, sh.getLastColumn()).getValues(), h = vals[0];
  MEMO_[nombre] = vals.slice(1).map((r, i) => {
    const o = { _fila: i + 2 };
    h.forEach((k, j) => { o[k] = r[j]; });
    return o;
  }).filter(o => o[h[0]] !== '');
  return MEMO_[nombre];
}
function agregar_(nombre, obj) {
  const sh = hoja_(nombre);
  sh.appendRow(encab_(sh).map(k => celda_(obj[k])));
  delete MEMO_[nombre];
}
function actualizar_(nombre, fila, patch) {
  const sh = hoja_(nombre), h = encab_(sh);
  Object.keys(patch).forEach(k => { const j = h.indexOf(k); if (j >= 0) sh.getRange(fila, j + 1).setValue(celda_(patch[k])); });
  delete MEMO_[nombre];
}
function celda_(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^(=|[+\-@](?![\d.\s]))/.test(v)) return "'" + v;   // evita fórmulas inyectadas (deja pasar números como -31.36)
  return v;
}
function config_() {
  const out = {};
  filas_('Config').forEach(r => { out[r.clave] = r.valor; });
  return out;
}
function guardarConfig_(clave, valor, desc) {
  const f = filas_('Config').filter(r => r.clave === clave)[0];
  if (f) actualizar_('Config', f._fila, { valor: String(valor) });
  else agregar_('Config', { clave, valor: String(valor), descripcion: desc || '' });
}
function geo_(id) {
  const cfg = config_(), s = CONFIG.sedes[id];
  const num = v => Number(String(v).replace(/^'/, '').replace(',', '.'));
  const lat = cfg['lat_' + id] !== undefined && cfg['lat_' + id] !== '' ? num(cfg['lat_' + id]) : s.lat;
  const lng = cfg['lng_' + id] !== undefined && cfg['lng_' + id] !== '' ? num(cfg['lng_' + id]) : s.lng;
  return { lat: lat || null, lng: lng || null, radio: Number(cfg['radio_' + id]) || s.radio || 150 };
}

// ======== UTILIDADES ========
function sedeCfg_(id) { const s = CONFIG.sedes[id]; if (!s) throw new Error('Elegí una sede.'); return s; }
function grupoPorEdad_(nac, ref) {
  const e = edadEn_(nac, ref);
  return CONFIG.grupos.filter(g => e >= g.edadMin && e <= g.edadMax)[0] || (e < CONFIG.grupos[0].edadMin ? CONFIG.grupos[0] : CONFIG.grupos[CONFIG.grupos.length - 1]);
}
function edadEn_(nac, ref) {
  const n = String(nac).slice(0, 10), r = String(ref).slice(0, 10);
  let e = Number(r.slice(0, 4)) - Number(n.slice(0, 4));
  if (r.slice(5) < n.slice(5)) e--;
  return e;
}
function hoy_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function diaDe_(f) { return Utilities.formatDate(f, TZ, 'yyyy-MM-dd'); }
function iso_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  return String(v || '').slice(0, 10);
}
function horaTxt_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  return String(v || '');
}
function fechaDe_(iso) { return new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), 12); }
function sumarDias_(iso, n) { const f = fechaDe_(iso); f.setDate(f.getDate() + n); return Utilities.formatDate(f, TZ, 'yyyy-MM-dd'); }
function lunes_(iso) { const f = fechaDe_(iso_(iso)); const dow = (f.getDay() + 6) % 7; return sumarDias_(iso_(iso), -dow); }
function parseLocal_(fecha, hora) {
  const h = String(hora || '09:00').split(':');
  const f = fechaDe_(fecha); f.setHours(Number(h[0]) || 0, Number(h[1]) || 0, 0, 0);
  return f;
}
function fechaCorta_(iso) { return String(iso).slice(8, 10) + '/' + String(iso).slice(5, 7); }
function fechaLarga_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso || '');
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const f = fechaDe_(iso);
  return dias[f.getDay()] + ' ' + f.getDate() + ' de ' + meses[f.getMonth()];
}
function distanciaM_(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function formatoDist_(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m'; }
function pesos_(n) { return '$' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function uid_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 8).toUpperCase(); }
function limpio_(v) { return String(v === undefined || v === null ? '' : v).trim().slice(0, 1000); }
function normEmail_(v) { return String(v || '').trim().toLowerCase(); }
function normNombre_(v) { return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' '); }
function primerNombre_(v) { return String(v || '').trim().split(' ')[0]; }
function esSi_(v) { return v === true || /^(s[ií]|si|true|1|x)$/i.test(String(v).trim()); }
function normalizarWhatsApp_(tel) {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.indexOf('54') === 0) n = n.slice(2);
  if (n.indexOf('9') === 0 && n.length === 11) n = n.slice(1);
  if (n.indexOf('0') === 0) n = n.slice(1);
  if (n.length === 12) [2, 3, 4].some(a => { if (n.substr(a, 2) === '15') { n = n.slice(0, a) + n.slice(a + 2); return true; } return false; });
  return n.length === 10 ? '549' + n : String(tel || '').replace(/\D/g, '');
}
function linkWhatsApp_(tel, texto) { return 'https://wa.me/' + normalizarWhatsApp_(tel) + '?text=' + encodeURIComponent(texto || ''); }
function esc_(s) {
  return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
