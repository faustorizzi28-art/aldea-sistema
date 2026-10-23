/**
 * Escuela de Verano — Aldea de Valle + Colonia Dewey
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
  aprobarFotos: true,           // true = las fotos de los profes las aprueba el coordinador antes de que las vean las familias
  minutosTolerancia: 10,
  fotoParaCerrarTurno: ['profe', 'auxiliar'],   // estos roles tienen que subir al menos una foto o video del día para marcar la salida
  maxVideoMB: 300,        // pasados estos minutos del inicio del turno sin marcar, el coordinador lo ve como "no marcó"
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
      inicio: '2026-12-14', fin: '2027-02-19',        // 10 semanas, de lunes 14/12 a viernes 19/2
      feriados: ['2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09'],   // Navidad, Año Nuevo y Carnaval
      cupoPorGrupo: 30,   // si se pasa, la inscripción entra igual y se avisa para abrir otro grupo
      bajada: 'Naturaleza, deporte y pileta en el predio de Aldea, en Valle Escondido.',
      ficha: [  // misma lista de renglones en las dos sedes: así se arma la comparación
        ['Edades', 'De 3 a 13 años, en grupos por edad'],
        ['Horario', 'Mañana 9 a 13 h · Jornada completa 9 a 16 h · Pre hora desde las 8 h'],
        ['Pileta', 'Sí, con guardavidas y clases de natación'],
        ['Comida', 'Merienda incluida · almuerzo opcional ($10.000 por día)'],
        ['Actividades', 'Deportes, artes marciales, juegos en la naturaleza, talleres'],
        ['Traslado', 'Sin traslado (a confirmar)']
      ],
      pago: { alias: '', banco: '', titular: '', cbu: '' },   // alias de Aldea: a confirmar (vacío = se pasa por WhatsApp)
      precios: {
        // ⚠️ PRECIOS DE EJEMPLO: reemplazalos por los reales. 'semanas' = precio por cantidad de semanas (índice = semanas, hasta las 10 de la temporada).
        etapas: [
          { id: 'preventa', nombre: 'Preventa',       hasta: '2026-11-15', dia: 25000, semanas: [0, 100000, 190000, 276000, 360000, 440000, 516000, 595000, 672000, 747000, 820000] },
          { id: 'segunda',  nombre: 'Segunda etapa',  hasta: '2026-12-06', dia: 28000, semanas: [0, 110000, 209000, 304000, 396000, 484000, 568000, 654000, 739000, 822000, 902000] },
          { id: 'oficial',  nombre: 'Precio oficial',                      dia: 30000, semanas: [0, 120000, 228000, 331000, 432000, 528000, 619000, 714000, 806000, 896000, 984000] }
        ],
        turnos: [
          { id: 'manana',   nombre: 'Mañana (9 a 13 h)',            factor: 1 },
          { id: 'completa', nombre: 'Jornada completa (9 a 16 h)',  factor: 1.5 }
        ],
        extras: [
          { id: 'prehora',  nombre: 'Pre hora (desde las 8 h)', precioDia: 5000, detalle: 'Para dejarlo más temprano' },
          { id: 'almuerzo', nombre: 'Almuerzo', precioDia: 10000, detalle: 'Menú del día, avisá si hay alergias' }
        ],
        descuentoHermanos: 10,     // % a partir del segundo hijo
        descuentoRenovacion: 5,    // % si renueva antes de que termine
        senaPct: 30
      }
    },
    colonia: {
      id: 'colonia',
      nombre: 'Colonia Dewey',
      color: '#1C5D8C', acento: '#FFB627',
      direccion: 'Etruria 7755, Villa Rivera Indarte, Córdoba',
      whatsapp: '5493515308489',
      lat: null, lng: null, radio: 150,   // fijala desde Administración → Ajustes → "Usar mi ubicación"
      inicio: '2026-12-14', fin: '2027-02-19',        // 10 semanas, de lunes 14/12 a viernes 19/2
      feriados: ['2026-12-25', '2027-01-01', '2027-02-08', '2027-02-09'],   // Navidad, Año Nuevo y Carnaval
      cupoPorGrupo: 30,   // si se pasa, la inscripción entra igual y se avisa para abrir otro grupo
      bajada: 'La colonia de siempre: pileta, juegos y amigos todo el verano.',
      ficha: [
        ['Edades', 'De 3 a 13 años, en grupos por edad'],
        ['Horario', 'Mañana 9 a 13 h · Jornada completa 9 a 16 h · Pre hora desde las 8 h'],
        ['Pileta', 'Sí, con guardavidas (a confirmar)'],
        ['Comida', 'Merienda incluida · almuerzo opcional ($10.000 por día)'],
        ['Actividades', 'Juegos, deportes, campamento y talleres (a confirmar)'],
        ['Traslado', 'A confirmar']
      ],
      pago: { alias: '', banco: '', titular: '', cbu: '' },   // alias de Colonia Dewey: a confirmar
      precios: {
        // ⚠️ PRECIOS DE EJEMPLO: reemplazalos por los reales. 'semanas' = precio por cantidad de semanas (índice = semanas, hasta las 10 de la temporada).
        etapas: [
          { id: 'preventa', nombre: 'Preventa',       hasta: '2026-11-15', dia: 25000, semanas: [0, 100000, 190000, 276000, 360000, 440000, 516000, 595000, 672000, 747000, 820000] },
          { id: 'segunda',  nombre: 'Segunda etapa',  hasta: '2026-12-06', dia: 28000, semanas: [0, 110000, 209000, 304000, 396000, 484000, 568000, 654000, 739000, 822000, 902000] },
          { id: 'oficial',  nombre: 'Precio oficial',                      dia: 30000, semanas: [0, 120000, 228000, 331000, 432000, 528000, 619000, 714000, 806000, 896000, 984000] }
        ],
        turnos: [
          { id: 'manana',   nombre: 'Mañana (9 a 13 h)',            factor: 1 },
          { id: 'completa', nombre: 'Jornada completa (9 a 16 h)',  factor: 1.5 }
        ],
        extras: [
          { id: 'prehora',  nombre: 'Pre hora (desde las 8 h)', precioDia: 5000, detalle: 'Para dejarlo más temprano' },
          { id: 'almuerzo', nombre: 'Almuerzo', precioDia: 10000, detalle: 'Menú del día, avisá si hay alergias' }
        ],
        descuentoHermanos: 10,     // % a partir del segundo hijo
        descuentoRenovacion: 5,    // % si renueva antes de que termine
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
  Profes:        ['id', 'nombre', 'email', 'whatsapp', 'sede', 'grupos', 'formaPago', 'valor', 'activo', 'notas', 'creado', 'rol'],
  Turnos:        ['id', 'sede', 'personaId', 'nombre', 'dias', 'desde', 'hasta', 'tarea'],
  AvisosFamilia: ['id', 'creado', 'fecha', 'sede', 'grupo', 'chicoId', 'chico', 'familiaId', 'tipo', 'detalle', 'estado'],
  Marcajes:      ['id', 'profeId', 'nombre', 'sede', 'tipo', 'fechaHora', 'lat', 'lng', 'distancia', 'precision', 'origen'],
  Asistencia:    ['id', 'fecha', 'sede', 'grupo', 'chicoId', 'chico', 'estado', 'horaLlegada', 'retiradoPor', 'horaRetiro', 'nota', 'profe', 'actualizado'],
  Publicaciones: ['id', 'fecha', 'sede', 'grupo', 'profe', 'texto', 'fotos', 'visible', 'profeId', 'videos'],
  Tematicas:     ['id', 'sede', 'semana', 'titulo', 'descripcion', 'emoji'],
  Cronograma:    ['id', 'sede', 'semana', 'dia', 'hora', 'grupo', 'actividad', 'lugar', 'profe'],
  PagosProfes:   ['id', 'fecha', 'profeId', 'nombre', 'sede', 'monto', 'concepto', 'periodo'],
  Grupos:        ['id', 'sede', 'nombre', 'emoji', 'base', 'creado'],
  Interesados:   ['fecha', 'email', 'nombre', 'whatsapp', 'sede', 'origen'],
  Avisos:        ['fecha', 'tipo', 'sede', 'destino', 'referencia', 'detalle'],
  Config:        ['clave', 'valor', 'descripcion']
};
// Columnas que tienen que quedar como texto (si no, Sheets convierte fechas y teléfonos)
const COLS_TEXTO = {
  Familias: ['dni', 'whatsapp', 'emergenciaTel'], Chicos: ['nacimiento', 'dni'], Profes: ['whatsapp'],
  Inscripciones: ['dias', 'fechaInicio', 'fechaFin'], Asistencia: ['fecha', 'horaLlegada', 'horaRetiro'],
  Publicaciones: ['fecha'], Tematicas: ['semana'], Cronograma: ['semana', 'hora'], Config: ['valor'],
  Turnos: ['dias', 'desde', 'hasta'], AvisosFamilia: ['fecha']
};
const ESTADOS = ['Pendiente', 'Señada', 'Pagada', 'Cancelada'];
const FORMAS_PAGO = { quincena: 'Fijo por quincena', dia: 'Por día (se pagan los feriados)', hora: 'Por hora' };
const DIAS_SEM = ['lun', 'mar', 'mie', 'jue', 'vie'];
// Equipo: todos entran con su mail a ?p=profes. Lo que ve cada uno depende de su rol.
const ROLES = {
  profe:       { nombre: 'Profe',          emoji: '🧑‍🏫', permisos: ['asistencia', 'fotos'] },
  auxiliar:    { nombre: 'Auxiliar / ayudante', emoji: '🙋', permisos: ['asistencia', 'fotos'] },
  guardavidas: { nombre: 'Guardavidas',    emoji: '🛟', permisos: ['pileta'] },
  enfermeria:  { nombre: 'Enfermería / acompañante', emoji: '🩺', permisos: ['salud'] },
  coordinador: { nombre: 'Coordinador/a',  emoji: '📋', permisos: ['asistencia', 'asistenciaTodos', 'fotos', 'aprobarFotos', 'equipo', 'cronograma', 'grupos', 'salud', 'pileta'] },
  admin:       { nombre: 'Administración', emoji: '🗂️', permisos: ['asistencia', 'asistenciaTodos', 'fotos', 'aprobarFotos', 'equipo', 'cronograma', 'grupos', 'salud', 'pileta', 'plata'] }
};
const TIPOS_AVISO = ['No va', 'Llega tarde', 'Se va temprano', 'Lo retira otra persona'];

// ======== SERVIR LA PÁGINA ========
function doGet(e) {
  const p = String((e && e.parameter && e.parameter.p) || '');
  const titulos = { profes: 'Profes · Escuela de Verano', admin: 'Administración · Escuela de Verano' };
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(titulos[p] || 'Escuela de Verano · Aldea de Valle y Colonia Dewey')
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
  avisar:          ['familia', accAvisar_],
  anularAviso:     ['familia', accAnularAviso_],
  // profes
  profeInicio:     ['profe', accProfeInicio_],
  marcar:          ['profe', accMarcar_],
  lista:           ['profe', accLista_],
  guardarAsistencia: ['profe', accGuardarAsistencia_],
  publicar:        ['profe', accPublicar_],
  iniciarSubida:   ['profe', accIniciarSubida_],
  subirParte:      ['profe', accSubirParte_],
  coordCrearGrupo: ['profe', staffCon_('grupos', (d, p, ss) => accCrearGrupo_(d, ss))],
  fichas:          ['profe', accFichas_],
  equipoHoy:       ['profe', staffCon_('equipo', (d, p, ss) => equipoHoy_(ss.s, d.sede))],
  guardarTurno:    ['profe', staffCon_('equipo', (d, p, ss) => accGuardarTurno_(d, ss))],
  borrarTurno:     ['profe', staffCon_('equipo', (d, p, ss) => borrarFila_('Turnos', d.id, ss))],
  marcajeEquipo:   ['profe', staffCon_('equipo', (d, p, ss) => accMarcajeManual_(d, ss))],
  fotosPendientes: ['profe', staffCon_('aprobarFotos', (d, p, ss) => fotosPendientes_(ss.s))],
  aprobarFoto:     ['profe', staffCon_('aprobarFotos', (d, p, ss) => accOcultarPublicacion_(d, ss))],
  coordTematica:   ['profe', staffCon_('cronograma', (d, p, ss) => accGuardarTematica_(d, ss))],
  coordCrono:      ['profe', staffCon_('cronograma', (d, p, ss) => accGuardarCrono_(d, ss))],
  coordBorrarCrono: ['profe', staffCon_('cronograma', (d, p, ss) => borrarFila_('Cronograma', d.id, ss))],
  coordCopiarCrono: ['profe', staffCon_('cronograma', (d, p, ss) => accCopiarCrono_(d, ss))],
  coordContenido:  ['profe', staffCon_('cronograma', (d, p, ss) => contenidoSede_(ss.s))],
  coordGrupo:      ['profe', staffCon_('grupos', (d, p, ss) => accAsignarGrupo_(d, ss))],
  // administración
  tablero:         ['admin', accTablero_],
  registrarPago:   ['admin', accRegistrarPago_],
  cambiarEstado:   ['admin', accCambiarEstado_],
  asignarGrupo:    ['admin', accAsignarGrupo_],
  recordar:        ['admin', accRecordar_],
  guardarProfe:    ['admin', accGuardarProfe_],
  crearGrupo:      ['admin', accCrearGrupo_],
  equipoHoyAdmin:  ['admin', (d, s) => equipoHoy_(s.s, d.sede)],
  guardarTurnoAdmin: ['admin', accGuardarTurno_],
  borrarTurnoAdmin: ['admin', (d, s) => borrarFila_('Turnos', d.id, s)],
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
    grupos: todosGrupos_(), sedes, hoy: hoy_(), url: ScriptApp.getService().getUrl(), periodos: periodosTemporada_(), periodoActual: periodoActual_(),
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
  // Etapa de precio vigente (preventa → segunda etapa → oficial), según el día en que se inscribe
  var E = P.etapas[P.etapas.length - 1], iE = P.etapas.length - 1;
  for (var k = 0; k < P.etapas.length; k++) if (!P.etapas[k].hasta || hoy <= P.etapas[k].hasta) { E = P.etapas[k]; iE = k; break; }
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
    var n = semanasSel.length, t = E.semanas;
    base = n < t.length ? t[n] : t[t.length - 1] + (n - (t.length - 1)) * (t[t.length - 1] - t[t.length - 2]);
    detalleBase = n + (n === 1 ? ' semana' : ' semanas');
  } else {
    // días sueltos: nunca más caro que la semana completa
    var porSemana = {};
    dias.forEach(function (d) { porSemana[semanaDe[d]] = (porSemana[semanaDe[d]] || 0) + 1; });
    Object.keys(porSemana).forEach(function (k) { base += Math.min(porSemana[k] * E.dia, E.semanas[1]); });
    detalleBase = dias.length + (dias.length === 1 ? ' día' : ' días');
  }
  var turno = buscar(P.turnos, plan.turno) || P.turnos[0];
  base = r100(base * turno.factor);
  var extras = (plan.extras || []).map(function (id) { return buscar(P.extras, id); }).filter(Boolean)
    .map(function (e) { return { id: e.id, nombre: e.nombre, monto: e.precioDia * dias.length }; });
  var extrasTotal = extras.reduce(function (a, e) { return a + e.monto; }, 0);
  var porChico = [], subtotal = 0, descuento = 0;
  for (var i = 0; i < Math.max(1, cantChicos); i++) {
    var sub = base + extrasTotal, pct = 0, motivos = [];
    if (i > 0 && P.descuentoHermanos) { pct += P.descuentoHermanos; motivos.push('hermano ' + P.descuentoHermanos + '%'); }
    if (ctx.renovacion && P.descuentoRenovacion) { pct += P.descuentoRenovacion; motivos.push('renovación ' + P.descuentoRenovacion + '%'); }
    var desc = r100(sub * pct / 100);
    porChico.push({ subtotal: sub, descuento: desc, total: sub - desc, motivos: motivos });
    subtotal += sub; descuento += desc;
  }
  if (!dias.length) errores.push(plan.modalidad === 'semanas' ? 'Elegí al menos una semana.' : 'Elegí al menos un día.');
  var total = subtotal - descuento;
  return {
    dias: dias, cantDias: dias.length, semanas: semanasSel, turno: turno, extras: extras, base: base, detalleBase: detalleBase,
    porChico: porChico, subtotal: subtotal, descuento: descuento, total: total,
    sena: r100(total * P.senaPct / 100), senaPct: P.senaPct, errores: errores,
    etapa: { nombre: E.nombre, hasta: E.hasta || '' }, proxima: P.etapas[iE + 1] ? { nombre: P.etapas[iE + 1].nombre } : null
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
    asignarGrupos_(sede.id, chicos.map(c => {
      const ex = fam && filas_('Chicos').filter(x => x.familiaId === fam.id && normNombre_(x.nombre) === normNombre_(c.nombre))[0];
      validarChico_(c, sede);
      return { id: ex ? ex.id : '', nombre: c.nombre, nacimiento: c.nacimiento, grupo: ex ? ex.grupo : '' };
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
    avisarAdmin_(sede.id, (res.sobrecupo.length ? '⚠️ Sobrecupo · ' : '🆕 Nueva inscripción · ') + res.items.map(i => i.chico).join(', '), mailAdminInscripcion_(fam, res, sede));
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
  const asign = asignarGrupos_(sedeId, chicos.map(c => ({ id: c.id, nombre: c.nombre, nacimiento: iso_(c.nacimiento), grupo: c.grupo })), q.dias);
  const items = chicos.map((c, i) => {
    const p = q.porChico[i];
    if (asign[i].grupo !== c.grupo) { const fc = filas_('Chicos').filter(x => x.id === c.id)[0]; if (fc) actualizar_('Chicos', fc._fila, { grupo: asign[i].grupo }); c.grupo = asign[i].grupo; }
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
    items, total: q.total, sena: q.sena, detalle: q.detalleBase + ' · ' + q.turno.nombre + ' · ' + q.etapa.nombre, sobrecupo: asign.filter(a => a.sobrecupo), desde: q.dias[0], hasta: q.dias[q.dias.length - 1],
    pago: sede.pago, sede: sede.nombre, whatsapp: sede.whatsapp,
    waComprobante: linkWhatsApp_(sede.whatsapp, '¡Hola! Te mando el comprobante de la escuela de verano de ' + items.map(i => i.chico).join(' y ') + ' (' + items.map(i => i.id).join(', ') + ').')
  };
}

/**
 * Elige el grupo de cada chico: el de su edad o, si está lleno, un grupo extra de la misma edad con lugar.
 * Si todos están llenos, entra igual (sobrecupo) y la administración recibe el aviso para abrir otro grupo.
 * chicos: [{ id (vacío si es nuevo), nombre, nacimiento, grupo (actual, si ya tiene) }]
 */
function asignarGrupos_(sedeId, chicos, dias) {
  const sede = sedeCfg_(sedeId), ocupados = ocupacion_(sedeId), suma = {};
  const gs = gruposSede_(sedeId);
  return chicos.map(c => {
    const repetidos = c.id ? dias.filter(dia => ocupados['chico|' + c.id + '|' + dia]) : [];
    if (repetidos.length) throw new Error(c.nombre + ' ya está inscripto el ' + repetidos.map(fechaCorta_).join(', ') + '.');
    const base = grupoPorEdad_(c.nacimiento, sede.inicio).id;
    const actual = gs.filter(g => g.id === c.grupo)[0];
    const familia = gs.filter(g => (g.base || g.id) === base);
    // Si la administración ya lo movió a un grupo, se respeta
    const candidatos = actual && (actual.base || actual.id) !== base ? [actual] : (actual ? [actual].concat(familia.filter(g => g.id !== actual.id)) : familia);
    const lleno = g => dias.some(dia => (ocupados[g.id + '|' + dia] || 0) + (suma[g.id + '|' + dia] || 0) >= sede.cupoPorGrupo);
    const elegido = candidatos.filter(g => !lleno(g))[0] || candidatos[0];
    const sobrecupo = lleno(elegido);
    dias.forEach(dia => { suma[elegido.id + '|' + dia] = (suma[elegido.id + '|' + dia] || 0) + 1; });
    return { grupo: elegido.id, sobrecupo, nombre: c.nombre };
  });
}

/** Grupos de una sede: los fijos por edad más los que se abrieron por sobrecupo. */
function gruposSede_(sedeId) {
  return CONFIG.grupos.concat(filas_('Grupos').filter(g => g.sede === sedeId).map(grupoExtra_));
}
function todosGrupos_() { return CONFIG.grupos.concat(filas_('Grupos').map(grupoExtra_)); }
function grupoExtra_(g) {
  const b = CONFIG.grupos.filter(x => x.id === g.base)[0] || CONFIG.grupos[0];
  return { id: g.id, nombre: g.nombre, emoji: g.emoji || b.emoji, edadMin: b.edadMin, edadMax: b.edadMax, base: b.id, sede: g.sede };
}
function accCrearGrupo_(d, sesion) {
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  sedeCfg_(sede);
  const b = CONFIG.grupos.filter(x => x.id === d.base)[0];
  if (!b) throw new Error('Elegí de qué edad es el grupo nuevo.');
  const existentes = filas_('Grupos').filter(g => g.sede === sede && g.base === b.id).length;
  const letra = 'BCDEFGH'.charAt(existentes);
  const g = { id: b.id + '-' + sede + '-' + letra.toLowerCase(), sede, nombre: limpio_(d.nombre) || b.nombre + ' ' + letra, emoji: b.emoji, base: b.id, creado: new Date() };
  agregar_('Grupos', g);
  return grupoExtra_(g);
}

/** Días próximos en que algún grupo pasa el cupo. */
function sobrecupos_(scope) {
  const hoy = hoy_(), out = {};
  Object.keys(CONFIG.sedes).filter(id => enSede_(scope, id)).forEach(id => {
    const oc = ocupacion_(id), cupo = CONFIG.sedes[id].cupoPorGrupo;
    Object.keys(oc).forEach(k => {
      if (k.indexOf('chico|') === 0) return;
      const partes = k.split('|'), g = partes[0], dia = partes[1];
      if (dia < hoy || oc[k] <= cupo) return;
      const key = id + '|' + g;
      out[key] = out[key] || { sede: id, grupo: g, dias: [], max: 0 };
      out[key].dias.push(dia);
      out[key].max = Math.max(out[key].max, oc[k]);
    });
  });
  return Object.keys(out).map(k => Object.assign(out[k], { dias: out[k].dias.sort() }));
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
  const out = { token: firmar_({ r: rol, e: email, x: Date.now() + 150 * 86400000 }), rol, email };
  if (rol === 'profe') {
    const p = filas_('Profes').filter(x => normEmail_(x.email) === email && esSi_(x.activo))[0];
    if (p && rolDe_(p) === 'admin') out.tokenAdmin = firmar_({ r: 'admin', s: p.sede === 'ambas' || !p.sede ? 'todas' : p.sede, x: Date.now() + 14 * 3600000 });
  }
  return out;
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
    inscripciones: insc, publicaciones: pubs, asistencia: asis, cronograma: crono, pagos, hoy, tiposAviso: TIPOS_AVISO,
    avisos: filas_('AvisosFamilia').filter(a => a.familiaId === fam.id && a.estado !== 'anulado' && iso_(a.fecha) >= hoy)
      .map(a => ({ id: a.id, fecha: iso_(a.fecha), chicoId: a.chicoId, chico: a.chico, tipo: a.tipo, detalle: a.detalle })).sort((a, b) => a.fecha < b.fecha ? -1 : 1)
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
    fotos: String(p.fotos || '').split(',').filter(Boolean), videos: String(p.videos || '').split(',').filter(Boolean), visible: esSi_(p.visible), pendiente: p.visible === 'Pendiente' };
}
function cronoPublico_(c) {
  return { id: c.id, sede: c.sede, semana: iso_(c.semana), dia: c.dia, hora: horaTxt_(c.hora), grupo: c.grupo, actividad: c.actividad, lugar: c.lugar, profe: c.profe };
}

// ======== PROFES ========
function profeDe_(sesion) {
  const p = filas_('Profes').filter(x => normEmail_(x.email) === sesion.e && esSi_(x.activo))[0];
  if (!p) throw new Error('Tu usuario no está activo. Hablá con la administración.');
  return p;
}
function sedesDeProfe_(p) { return p.sede === 'ambas' || !p.sede ? Object.keys(CONFIG.sedes) : [p.sede]; }
function rolDe_(p) { return ROLES[p.rol] ? p.rol : 'profe'; }
function puede_(p, permiso) { return ROLES[rolDe_(p)].permisos.indexOf(permiso) >= 0; }
function gruposDe_(p) { return String(p.grupos || '').split(',').map(x => x.trim()).filter(Boolean); }
/** Envuelve una acción del equipo: verifica el permiso y le pasa una "sesión" con la sede de esa persona. */
function staffCon_(permiso, fn) {
  return (d, sesion) => {
    const p = profeDe_(sesion);
    if (permiso && !puede_(p, permiso)) throw new Error('Tu rol no tiene acceso a esto.');
    return fn(d, p, { s: p.sede === 'ambas' || !p.sede ? 'todas' : p.sede, quien: p.nombre });
  };
}
function diaSemana_(iso) { const dow = fechaDe_(iso).getDay(); return dow >= 1 && dow <= 5 ? DIAS_SEM[dow - 1] : ''; }
function turnosDePersona_(personaId, iso) {
  const dia = diaSemana_(iso);
  return filas_('Turnos').filter(t => t.personaId === personaId && String(t.dias || '').split(',').indexOf(dia) >= 0)
    .map(t => ({ id: t.id, sede: t.sede, desde: horaTxt_(t.desde), hasta: horaTxt_(t.hasta), tarea: t.tarea }))
    .sort((a, b) => a.desde < b.desde ? -1 : 1);
}

function accProfeInicio_(d, sesion) {
  const p = profeDe_(sesion), hoy = hoy_(), lunes = lunes_(hoy);
  const sedes = sedesDeProfe_(p);
  const marc = marcajes_().filter(m => m.profeId === p.id);
  const abierto = turnoAbierto_(marc);
  const hoyMarc = marc.filter(m => diaDe_(m.fechaHora) === hoy).map(m => ({ tipo: m.tipo, hora: Utilities.formatDate(m.fechaHora, TZ, 'HH:mm'), sede: m.sede }));
  const liq = liquidarProfe_(p, d.periodo || periodoActual_(), marc);
  const crono = filas_('Cronograma').filter(c => sedes.indexOf(c.sede) >= 0 && [lunes, sumarDias_(lunes, 7)].indexOf(iso_(c.semana)) >= 0).map(cronoPublico_);
  const pubs = filas_('Publicaciones').filter(x => sedes.indexOf(x.sede) >= 0 && x.profe === p.nombre).map(pubPublica_).sort((a, b) => b.ts - a.ts).slice(0, 20);
  return {
    profe: { id: p.id, nombre: p.nombre, sede: p.sede, sedes, grupos: gruposDe_(p), rol: rolDe_(p), rolNombre: ROLES[rolDe_(p)].nombre,
      emoji: ROLES[rolDe_(p)].emoji, permisos: ROLES[rolDe_(p)].permisos },
    turnosHoy: turnosDePersona_(p.id, hoy),
    fotoObligatoria: CONFIG.fotoParaCerrarTurno.indexOf(rolDe_(p)) >= 0, subioHoy: subioHoy_(p), maxVideoMB: CONFIG.maxVideoMB,
    pendientesFotos: puede_(p, 'aprobarFotos') ? filas_('Publicaciones').filter(x => x.visible === 'Pendiente' && sedes.indexOf(x.sede) >= 0).length : 0,
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
    if (tipo === 'SALIDA' && CONFIG.fotoParaCerrarTurno.indexOf(rolDe_(p)) >= 0 && !subioHoy_(p)) {
      return { faltaFoto: true, mensaje: 'Para cerrar tu turno, primero subí al menos una foto o video de los chicos y las actividades de hoy.' };
    }
    const sedeMarca = tipo === 'SALIDA' ? abierto.sede : mejor.id;
    agregar_('Marcajes', { id: uid_(), profeId: p.id, nombre: p.nombre, sede: sedeMarca, tipo, fechaHora: new Date(), lat, lng, distancia: mejor.dist,
      precision: Math.round(Number(d.precision) || 0), origen: 'gps' });
    return { tipo, sede: CONFIG.sedes[sedeMarca].nombre, distancia: mejor.dist, hora: Utilities.formatDate(new Date(), TZ, 'HH:mm') };
  } finally { lock.releaseLock(); }
}

function subioHoy_(p) {
  const hoy = hoy_();
  return filas_('Publicaciones').some(x => (x.profeId === p.id || (!x.profeId && x.profe === p.nombre)) && x.fecha instanceof Date && diaDe_(x.fecha) === hoy &&
    (String(x.fotos || '') !== '' || String(x.videos || '') !== ''));
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
// ---- Quincenas: clave 'AAAA-MM-1' (del 1 al 15) o 'AAAA-MM-2' (del 16 a fin de mes) ----
function periodo_(clave) {
  const m = /^(\d{4})-(\d{2})-([12])$/.exec(String(clave || ''));
  if (!m) return periodo_(periodoActual_());
  const ultimo = new Date(Number(m[1]), Number(m[2]), 0).getDate();
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return { clave, desde: m[1] + '-' + m[2] + (m[3] === '1' ? '-01' : '-16'), hasta: m[1] + '-' + m[2] + '-' + (m[3] === '1' ? '15' : String(ultimo)),
    nombre: (m[3] === '1' ? '1ª' : '2ª') + ' quincena de ' + meses[Number(m[2]) - 1] };
}
function claveQuincena_(iso) { return iso.slice(0, 7) + (Number(iso.slice(8, 10)) <= 15 ? '-1' : '-2'); }
function periodoActual_() {
  const ini = Object.keys(CONFIG.sedes).map(k => CONFIG.sedes[k].inicio).sort()[0];
  const hoy = hoy_();
  return claveQuincena_(hoy < ini ? ini : hoy);
}
function periodosTemporada_() {
  const ids = Object.keys(CONFIG.sedes);
  const ini = ids.map(k => CONFIG.sedes[k].inicio).sort()[0], fin = ids.map(k => CONFIG.sedes[k].fin).sort().pop();
  const out = [];
  let d = ini;
  while (d <= fin) { const c = claveQuincena_(d); if (out.indexOf(c) < 0) out.push(c); d = sumarDias_(d, 1); }
  return out.map(c => ({ id: c, nombre: periodo_(c).nombre }));
}
/** Días hábiles (lun a vie) de un rango que caen dentro de la temporada de alguna de las sedes. */
function diasHabiles_(desde, hasta, sedes) {
  const out = [];
  for (let d = desde; d <= hasta; d = sumarDias_(d, 1)) {
    if (!diaSemana_(d)) continue;
    if (sedes.some(id => d >= CONFIG.sedes[id].inicio && d <= CONFIG.sedes[id].fin)) out.push(d);
  }
  return out;
}

function liquidarProfe_(p, clave, marcProfe) {
  const per = periodo_(clave), hoy = hoy_();
  const ts = turnos_(marcProfe || marcajes_().filter(m => m.profeId === p.id)).filter(t => t.dia >= per.desde && t.dia <= per.hasta);
  const horas = ts.reduce((a, t) => a + t.horas, 0);
  const dias = {}; ts.forEach(t => { dias[t.dia] = 1; });
  const sedes = sedesDeProfe_(p);
  // Días que le tocaba trabajar: los de sus turnos (si no tiene turnos cargados, lunes a viernes)
  const susDias = {};
  filas_('Turnos').filter(t => t.personaId === p.id).forEach(t => String(t.dias || '').split(',').forEach(x => { susDias[x] = 1; }));
  const leToca = d => !Object.keys(susDias).length || susDias[diaSemana_(d)];
  const feriadosSede = {}; sedes.forEach(id => CONFIG.sedes[id].feriados.forEach(f => { feriadosSede[f] = 1; }));
  const habiles = diasHabiles_(per.desde, per.hasta, sedes);
  const feriados = habiles.filter(d => feriadosSede[d] && leToca(d) && !dias[d]);
  const faltas = habiles.filter(d => d < hoy && !feriadosSede[d] && leToca(d) && !dias[d]);
  // Quincena con temporada parcial (primera y última): se paga la parte proporcional de días hábiles
  let habilesQuincena = 0;
  for (let d = per.desde; d <= per.hasta; d = sumarDias_(d, 1)) if (diaSemana_(d)) habilesQuincena++;
  const proporcion = habilesQuincena ? habiles.length / habilesQuincena : 0;
  const valor = Number(p.valor) || 0;
  const forma = FORMAS_PAGO[p.formaPago] ? p.formaPago : 'quincena';
  const devengado = Math.round({
    hora: horas * valor,
    dia: (Object.keys(dias).length + feriados.length) * valor,
    quincena: valor * proporcion
  }[forma] || 0);
  const pagado = filas_('PagosProfes').filter(x => x.profeId === p.id && (x.periodo ? x.periodo === per.clave : iso_(x.fecha) >= per.desde && iso_(x.fecha) <= per.hasta))
    .reduce((a, x) => a + (Number(x.monto) || 0), 0);
  return { periodo: per.clave, nombrePeriodo: per.nombre, horas: Math.round(horas * 100) / 100, dias: Object.keys(dias).length, feriados: feriados.length,
    faltas: faltas.length, diasFaltas: faltas, proporcion: Math.round(proporcion * 100), turnos: ts, devengado, pagado, saldo: devengado - pagado,
    formaPago: FORMAS_PAGO[forma], forma, valor };
}

function accLista_(d, sesion) {
  const p = profeDe_(sesion);
  if (!puede_(p, 'asistencia') && !puede_(p, 'fotos')) throw new Error('Tu rol no toma asistencia.');
  const sede = d.sede || sedesDeProfe_(p)[0];
  if (sedesDeProfe_(p).indexOf(sede) < 0) throw new Error('No tenés acceso a esa sede.');
  let grupo = d.grupo || 'todos';
  const mios = gruposDe_(p);
  if (!puede_(p, 'asistenciaTodos') && mios.length) {
    if (grupo === 'todos') grupo = mios;
    else if (mios.indexOf(grupo) < 0) throw new Error('Ese grupo no está a tu cargo. El coordinador ve todos.');
  }
  const r = listaDelDia_(sede, d.fecha || hoy_(), grupo);
  if (!puede_(p, 'plata')) r.chicos.forEach(c => { delete c.saldo; });
  r.gruposPermitidos = puede_(p, 'asistenciaTodos') || !mios.length ? gruposSede_(sede).map(g => g.id) : mios;
  return r;
}

function avisosDelDia_(sede, fecha) {
  const out = {};
  filas_('AvisosFamilia').forEach(a => {
    if (a.estado === 'anulado' || iso_(a.fecha) !== fecha || (sede && a.sede !== sede)) return;
    (out[a.chicoId] = out[a.chicoId] || []).push({ id: a.id, tipo: a.tipo, detalle: a.detalle });
  });
  return out;
}

function listaDelDia_(sede, fecha, grupo) {
  const avisos = avisosDelDia_(sede, fecha);
  const chicos = {}; filas_('Chicos').forEach(c => { chicos[c.id] = c; });
  const fams = {}; filas_('Familias').forEach(f => { fams[f.id] = f; });
  const asis = {}; filas_('Asistencia').forEach(a => { if (iso_(a.fecha) === fecha && a.sede === sede) asis[a.chicoId] = a; });
  const vistos = {}, out = [];
  filas_('Inscripciones').forEach(i => {
    if (i.sede !== sede || i.estado === 'Cancelada' || vistos[i.chicoId]) return;
    if (String(i.dias || '').split(',').indexOf(fecha) < 0) return;
    if (grupo !== 'todos' && (Array.isArray(grupo) ? grupo.indexOf(i.grupo) < 0 : i.grupo !== grupo)) return;
    vistos[i.chicoId] = 1;
    const c = chicos[i.chicoId] || {}, f = fams[i.familiaId] || {}, a = asis[i.chicoId] || {};
    out.push({
      chicoId: i.chicoId, nombre: i.chico, grupo: i.grupo, turno: i.turno, extras: i.extras, edad: c.nacimiento ? edadEn_(iso_(c.nacimiento), fecha) : '',
      alergias: c.alergias || '', medicacion: c.medicacion || '', condiciones: c.condiciones || '', sabeNadar: c.sabeNadar || '', autorizaFotos: c.autorizaFotos || 'Sí',
      obraSocial: c.obraSocial || '', adulto: f.adulto || '', whatsapp: f.whatsapp || '', autorizados: f.autorizadosRetiro || '',
      emergencia: (f.emergenciaNombre || '') + ' ' + (f.emergenciaTel || ''), saldo: (Number(i.total) || 0) - (Number(i.pagado) || 0),
      estado: a.estado || '', llegada: horaTxt_(a.horaLlegada), retiradoPor: a.retiradoPor || '', retiro: horaTxt_(a.horaRetiro), nota: a.nota || '',
      avisos: avisos[i.chicoId] || []
    });
  });
  out.sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { sede, fecha, grupo: Array.isArray(grupo) ? 'todos' : grupo, chicos: out };
}

function accGuardarAsistencia_(d, sesion) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const p = profeDe_(sesion);
    if (!puede_(p, 'asistencia')) throw new Error('Tu rol no toma asistencia.');
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
  if (!puede_(p, 'fotos')) throw new Error('Tu rol no sube fotos.');
  if (sedesDeProfe_(p).indexOf(d.sede) < 0) throw new Error('No tenés acceso a esa sede.');
  const fotos = (d.fotos || []).slice(0, 10);
  const videos = (d.videos || []).filter(v => /^[\w-]{10,}$/.test(v)).slice(0, 5);
  if (!fotos.length && !videos.length && !limpio_(d.texto)) throw new Error('Escribí algo o sumá una foto.');
  const carpeta = carpetaFotos_(d.sede, hoy_());
  const ids = fotos.map((f, i) => {
    const blob = Utilities.newBlob(Utilities.base64Decode(f.b64), f.tipo || 'image/jpeg', Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd_HHmm') + '_' + (i + 1) + '.jpg');
    const file = carpeta.createFile(blob);
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* cuentas de dominio pueden no permitirlo */ }
    return file.getId();
  });
  agregar_('Publicaciones', { id: 'P' + uid_(), fecha: new Date(), sede: d.sede, grupo: d.grupo || 'todos', profe: p.nombre, texto: limpio_(d.texto), fotos: ids.join(','),
    visible: CONFIG.aprobarFotos && !puede_(p, 'aprobarFotos') ? 'Pendiente' : 'Sí', profeId: p.id, videos: videos.join(',') });
  return { fotos: ids.length, videos: videos.length, pendiente: CONFIG.aprobarFotos && !puede_(p, 'aprobarFotos') };
}

// ---- Videos: subida en partes directo a Drive (subida reanudable), así no hay límite de tamaño del celular ----
const PARTE_VIDEO = 4 * 1024 * 1024;   // múltiplo de 256 KB, como pide Drive
function accIniciarSubida_(d, sesion) {
  const p = profeDe_(sesion);
  if (!puede_(p, 'fotos')) throw new Error('Tu rol no sube fotos ni videos.');
  if (sedesDeProfe_(p).indexOf(d.sede) < 0) throw new Error('No tenés acceso a esa sede.');
  const total = Number(d.tamano) || 0, tipo = String(d.tipo || '');
  if (!/^video\//.test(tipo)) throw new Error('Ese archivo no es un video.');
  if (!total || total > CONFIG.maxVideoMB * 1024 * 1024) throw new Error('El video pesa más de ' + CONFIG.maxVideoMB + ' MB. Cortalo o mandalo en partes.');
  const carpeta = carpetaFotos_(d.sede, hoy_());
  const ext = (String(d.nombre || '').match(/\.\w{2,4}$/) || ['.mp4'])[0];
  const nombre = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd_HHmm') + '_' + p.nombre.split(' ')[0] + ext;
  const r = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
    method: 'post', contentType: 'application/json; charset=UTF-8', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken(), 'X-Upload-Content-Type': tipo, 'X-Upload-Content-Length': String(total) },
    payload: JSON.stringify({ name: nombre, parents: [carpeta.getId()], mimeType: tipo })
  });
  const url = r.getHeaders().Location || r.getHeaders().location;
  if (r.getResponseCode() !== 200 || !url) throw new Error('Drive no aceptó el video (' + r.getResponseCode() + '). Probá de nuevo.');
  const id = uid_();
  CacheService.getScriptCache().put('subida:' + id, JSON.stringify({ url, total, tipo, profeId: p.id }), 21600);
  return { id, parte: PARTE_VIDEO };
}
function accSubirParte_(d, sesion) {
  const p = profeDe_(sesion);
  const reg = JSON.parse(CacheService.getScriptCache().get('subida:' + d.id) || 'null');
  if (!reg || reg.profeId !== p.id) throw new Error('La subida venció. Volvé a elegir el video.');
  const bytes = Utilities.base64Decode(d.b64), desde = Number(d.desde) || 0, hasta = desde + bytes.length - 1;
  const r = UrlFetchApp.fetch(reg.url, { method: 'put', contentType: reg.tipo, payload: bytes, muteHttpExceptions: true,
    headers: { 'Content-Range': 'bytes ' + desde + '-' + hasta + '/' + reg.total } });
  const code = r.getResponseCode();
  if (code === 308) return { listo: false, recibido: hasta + 1 };
  if (code !== 200 && code !== 201) throw new Error('Se cortó la subida del video (' + code + '). Probá de nuevo.');
  const fileId = JSON.parse(r.getContentText()).id;
  try { DriveApp.getFileById(fileId).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* dominio */ }
  CacheService.getScriptCache().remove('subida:' + d.id);
  return { listo: true, id: fileId };
}

function carpetaFotos_(sede, dia) {
  const props = PropertiesService.getScriptProperties();
  let raizId = props.getProperty('CARPETA_FOTOS'), raiz;
  try { raiz = raizId && DriveApp.getFolderById(raizId); } catch (e) { raiz = null; }
  if (!raiz) { raiz = DriveApp.createFolder('Escuela de Verano — Fotos'); props.setProperty('CARPETA_FOTOS', raiz.getId()); }
  if (!sede) return raiz;
  const nombre = CONFIG.sedes[sede].nombre;
  const it = raiz.getFoldersByName(nombre);
  const carpetaSede = it.hasNext() ? it.next() : raiz.createFolder(nombre);
  if (!dia) return carpetaSede;
  const itD = carpetaSede.getFoldersByName(dia);   // una carpeta por día: material ordenado para redes
  return itD.hasNext() ? itD.next() : carpetaSede.createFolder(dia);
}

// ======== EQUIPO: coordinación, turnos, salud y pileta ========
function accFichas_(d, sesion) {
  const p = profeDe_(sesion);
  const salud = puede_(p, 'salud'), pileta = puede_(p, 'pileta');
  if (!salud && !pileta) throw new Error('Tu rol no ve las fichas.');
  const sede = d.sede || sedesDeProfe_(p)[0];
  if (sedesDeProfe_(p).indexOf(sede) < 0) throw new Error('No tenés acceso a esa sede.');
  const l = listaDelDia_(sede, d.fecha || hoy_(), 'todos');
  return { sede, fecha: l.fecha, completa: salud, chicos: l.chicos.map(c => salud
    ? { chicoId: c.chicoId, nombre: c.nombre, grupo: c.grupo, edad: c.edad, turno: c.turno, alergias: c.alergias, medicacion: c.medicacion, condiciones: c.condiciones,
        obraSocial: c.obraSocial, sabeNadar: c.sabeNadar, adulto: c.adulto, whatsapp: c.whatsapp, emergencia: c.emergencia, estado: c.estado, avisos: c.avisos }
    : { chicoId: c.chicoId, nombre: c.nombre, grupo: c.grupo, edad: c.edad, turno: c.turno, sabeNadar: c.sabeNadar, condiciones: c.condiciones, estado: c.estado, avisos: c.avisos }) };
}

/** Quién del equipo tenía que venir hoy, quién marcó y quién no. scope = sede de quien pregunta o 'todas'. */
function equipoHoy_(scope, filtro) {
  const hoy = hoy_(), ahora = Utilities.formatDate(new Date(), TZ, 'HH:mm');
  const sedes = scope === 'todas' ? (filtro && CONFIG.sedes[filtro] ? [filtro] : Object.keys(CONFIG.sedes)) : [scope];
  const tol = CONFIG.minutosTolerancia;
  const masMin = (h, m) => { const x = String(h || '00:00').split(':').map(Number); const t = x[0] * 60 + x[1] + m; return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };
  const marc = marcajes_();
  const turnosTodos = filas_('Turnos').filter(t => sedes.indexOf(t.sede) >= 0);
  const personas = filas_('Profes').filter(p => esSi_(p.activo) && (p.sede === 'ambas' || !p.sede || sedes.indexOf(p.sede) >= 0)).map(p => {
    const mp = marc.filter(m => m.profeId === p.id);
    const ab = turnoAbierto_(mp);
    const hoyM = mp.filter(m => diaDe_(m.fechaHora) === hoy).map(m => ({ tipo: m.tipo, hora: Utilities.formatDate(m.fechaHora, TZ, 'HH:mm'), sede: m.sede, origen: m.origen }));
    const turnos = turnosDePersona_(p.id, hoy).filter(t => sedes.indexOf(t.sede) >= 0);
    const entrada = hoyM.filter(m => m.tipo === 'ENTRADA')[0];
    let estado = 'libre';
    if (ab) estado = 'adentro';
    else if (hoyM.length) estado = 'salio';
    else if (turnos.length) estado = masMin(turnos[0].desde, tol) < ahora ? 'falta' : 'mas tarde';
    const tarde = !!(entrada && turnos.length && entrada.hora > masMin(turnos[0].desde, tol));
    return { id: p.id, nombre: p.nombre, rol: rolDe_(p), rolNombre: ROLES[rolDe_(p)].nombre, emoji: ROLES[rolDe_(p)].emoji, whatsapp: p.whatsapp, sede: p.sede,
      grupos: gruposDe_(p), estado, tarde, desde: ab ? Utilities.formatDate(ab.fechaHora, TZ, 'HH:mm') : '', marcajes: hoyM, turnos,
      turnosSemana: turnosTodos.filter(t => t.personaId === p.id).map(t => ({ id: t.id, sede: t.sede, dias: String(t.dias || '').split(',').filter(Boolean), desde: horaTxt_(t.desde), hasta: horaTxt_(t.hasta), tarea: t.tarea })) };
  });
  const orden = { falta: 0, adentro: 1, 'mas tarde': 2, salio: 3, libre: 4 };
  personas.sort((a, b) => (orden[a.estado] - orden[b.estado]) || a.nombre.localeCompare(b.nombre));
  return { hoy, ahora, sedes, personas, roles: Object.keys(ROLES).map(k => ({ id: k, nombre: ROLES[k].nombre, emoji: ROLES[k].emoji })) };
}

function accGuardarTurno_(d, sesion) {
  const p = filas_('Profes').filter(x => x.id === d.personaId)[0];
  if (!p) throw new Error('No encuentro a esa persona.');
  const sede = sesion.s === 'todas' ? d.sede : sesion.s;
  sedeCfg_(sede);
  if (p.sede !== 'ambas' && p.sede && p.sede !== sede) throw new Error(p.nombre + ' es de la otra sede.');
  const dias = (d.dias || []).filter(x => DIAS_SEM.indexOf(x) >= 0);
  if (!dias.length) throw new Error('Elegí al menos un día.');
  if (!/^\d{2}:\d{2}$/.test(d.desde || '') || !/^\d{2}:\d{2}$/.test(d.hasta || '') || d.hasta <= d.desde) throw new Error('Revisá el horario.');
  const datos = { sede, personaId: p.id, nombre: p.nombre, dias: dias.join(','), desde: d.desde, hasta: d.hasta, tarea: limpio_(d.tarea) };
  const ex = d.id && filas_('Turnos').filter(t => t.id === d.id)[0];
  if (ex) actualizar_('Turnos', ex._fila, datos); else agregar_('Turnos', Object.assign({ id: uid_() }, datos));
  return { ok: true };
}

function fotosPendientes_(scope) {
  return filas_('Publicaciones').filter(x => x.visible === 'Pendiente' && enSede_(scope, x.sede)).map(pubPublica_).sort((a, b) => b.ts - a.ts);
}

function contenidoSede_(scope) {
  return {
    tematicas: filas_('Tematicas').filter(t => enSede_(scope, t.sede)).map(t => ({ id: t.id, sede: t.sede, semana: iso_(t.semana), titulo: t.titulo, descripcion: t.descripcion, emoji: t.emoji })),
    cronograma: filas_('Cronograma').filter(c => enSede_(scope, c.sede)).map(cronoPublico_)
  };
}

// ======== FAMILIAS: avisos ("hoy no va", "llega tarde"…) ========
function accAvisar_(d, sesion) {
  const fam = familiaDe_(sesion), hoy = hoy_();
  const c = filas_('Chicos').filter(x => x.id === d.chicoId && x.familiaId === fam.id)[0];
  if (!c) throw new Error('No encontramos a ese chico.');
  if (TIPOS_AVISO.indexOf(d.tipo) < 0) throw new Error('Elegí qué querés avisar.');
  const fecha = iso_(d.fecha);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < hoy) throw new Error('Elegí un día de hoy en adelante.');
  const insc = filas_('Inscripciones').filter(i => i.chicoId === c.id && i.estado !== 'Cancelada' && String(i.dias || '').split(',').indexOf(fecha) >= 0)[0];
  if (!insc) throw new Error(c.nombre + ' no tiene escuela ese día.');
  if (d.tipo !== 'No va' && !limpio_(d.detalle)) throw new Error(d.tipo === 'Lo retira otra persona' ? 'Escribí nombre y DNI de quien lo retira.' : 'Escribí la hora.');
  const datos = { creado: new Date(), fecha, sede: insc.sede, grupo: insc.grupo, chicoId: c.id, chico: c.nombre, familiaId: fam.id, tipo: d.tipo, detalle: limpio_(d.detalle), estado: 'activo' };
  const ex = filas_('AvisosFamilia').filter(a => a.chicoId === c.id && iso_(a.fecha) === fecha && a.tipo === d.tipo && a.estado !== 'anulado')[0];
  if (ex) actualizar_('AvisosFamilia', ex._fila, datos); else agregar_('AvisosFamilia', Object.assign({ id: uid_() }, datos));
  return { ok: true };
}

function accAnularAviso_(d, sesion) {
  const fam = familiaDe_(sesion);
  const a = filas_('AvisosFamilia').filter(x => x.id === d.id && x.familiaId === fam.id)[0];
  if (!a) throw new Error('No encontramos ese aviso.');
  actualizar_('AvisosFamilia', a._fila, { estado: 'anulado' });
  return { ok: true };
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
  const mes = d.periodo || periodoActual_();
  const marc = marcajes_();
  const profes = filas_('Profes').filter(p => enSede_(sede, p.sede) || sede === 'todas').map(p => {
    const mp = marc.filter(m => m.profeId === p.id);
    const ab = turnoAbierto_(mp);
    return { id: p.id, nombre: p.nombre, email: p.email, whatsapp: p.whatsapp, sede: p.sede, grupos: p.grupos, rol: rolDe_(p), formaPago: p.formaPago, valor: Number(p.valor) || 0,
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
    porGrupo, vencen, deudas, pagos: pagos.slice(0, 300), profes, sobrecupos: sobrecupos_(sede), carpetaFotos: carpetaFotos_().getUrl(),
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
    roles: Object.keys(ROLES).map(k => ({ id: k, nombre: ROLES[k].nombre, emoji: ROLES[k].emoji })),
    avisosHoy: filas_('AvisosFamilia').filter(a => a.estado !== 'anulado' && iso_(a.fecha) === hoy && enSede_(sede, a.sede)).length,
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
  if (!todosGrupos_().some(g => g.id === d.grupo)) throw new Error('Grupo inválido.');
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
  const datos = { nombre: limpio_(d.nombre), email, whatsapp: limpio_(d.whatsapp), sede, grupos: Array.isArray(d.grupos) ? d.grupos.join(',') : limpio_(d.grupos),
    formaPago: FORMAS_PAGO[d.formaPago] ? d.formaPago : (d.rol === 'guardavidas' ? 'hora' : 'quincena'), valor: Math.round(Number(d.valor)) || 0, activo: d.activo === false ? 'No' : 'Sí', notas: limpio_(d.notas),
    rol: ROLES[d.rol] ? d.rol : 'profe' };
  if (datos.rol === 'admin' && sesion.s !== 'todas') throw new Error('Solo la administración general puede dar rol de administración.');
  const todos = filas_('Profes');
  if (todos.some(p => normEmail_(p.email) === email && p.id !== d.id)) throw new Error('Ya hay alguien del equipo con ese mail.');
  const ex = d.id && todos.filter(p => p.id === d.id)[0];
  if (ex) {
    if (sesion.s !== 'todas' && ex.sede !== sesion.s) throw new Error('Ese profe es de la otra sede.');
    actualizar_('Profes', ex._fila, datos);
    return { id: ex.id };
  }
  const id = 'T' + uid_();
  agregar_('Profes', Object.assign({ id, creado: new Date() }, datos));
  if (d.invitar !== false) {
    const queHace = {
      profe: 'marcás entrada y salida, tomás asistencia de tus grupos, subís fotos y ves el cronograma',
      guardavidas: 'marcás entrada y salida y ves la lista de la pileta (quién sabe nadar)',
      enfermeria: 'marcás entrada y salida y ves las fichas de salud de los chicos del día',
      coordinador: 'marcás entrada y salida, controlás la asistencia de todos los grupos, al equipo y sus turnos, aprobás las fotos y armás el cronograma',
      admin: 'tenés todo lo del coordinador y además el panel de administración'
    }[datos.rol];
    MailApp.sendEmail({ to: email, name: CONFIG.marca, subject: '☀️ Tu acceso al equipo · ' + CONFIG.marca,
      htmlBody: marcoMail_(sede === 'ambas' ? '' : sede, '<p>¡Hola ' + esc_(primerNombre_(datos.nombre)) + '! Ya tenés tu acceso como <b>' + esc_(ROLES[datos.rol].nombre) + '</b> en la app de la escuela de verano.</p>' +
        '<p>Entrás con este mail (te llega un código). Desde ahí ' + queHace + '.</p>' +
        boton_(ScriptApp.getService().getUrl() + '?p=profes', 'Abrir la app del equipo', '#2F4A38') +
        '<p style="color:#777">Tip: abrilo en el celular y agregalo a la pantalla de inicio.</p>') });
  }
  return { id };
}

function accPagarProfe_(d, sesion) {
  const p = filas_('Profes').filter(x => x.id === d.profeId)[0];
  if (!p) throw new Error('No encuentro al profe.');
  const monto = Math.round(Number(d.monto));
  if (!monto) throw new Error('Poné el monto.');
  agregar_('PagosProfes', { id: uid_(), fecha: d.fecha || hoy_(), profeId: p.id, nombre: p.nombre, sede: sesion.s === 'todas' ? p.sede : sesion.s, monto, concepto: limpio_(d.concepto),
    periodo: periodo_(d.periodo).clave });
  return { ok: true };
}

function accMarcajeManual_(d, sesion) {
  const p = filas_('Profes').filter(x => x.id === d.profeId)[0];
  if (!p) throw new Error('No encuentro a esa persona.');
  if (sesion.s !== 'todas' && p.sede && p.sede !== 'ambas' && p.sede !== sesion.s) throw new Error(p.nombre + ' es de la otra sede.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') || !/^\d{2}:\d{2}$/.test(d.hora || '')) throw new Error('Revisá día y hora.');
  const f = parseLocal_(d.fecha, d.hora);
  const sedeM = sesion.s !== 'todas' ? sesion.s : (CONFIG.sedes[d.sede] ? d.sede : (p.sede === 'ambas' || !p.sede ? Object.keys(CONFIG.sedes)[0] : p.sede));
  agregar_('Marcajes', { id: uid_(), profeId: p.id, nombre: p.nombre, sede: sedeM, tipo: d.tipo === 'SALIDA' ? 'SALIDA' : 'ENTRADA',
    fechaHora: f, lat: '', lng: '', distancia: '', precision: '', origen: 'manual (' + (sesion.quien || sesion.s) + ')' });
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
  return (res.sobrecupo && res.sobrecupo.length ? '<p style="background:#FFF0CC;padding:10px;border-radius:8px">⚠️ <b>' + res.sobrecupo.map(a => esc_(a.nombre) + ' (' + esc_(nombreGrupo_(a.grupo)) + ')').join(', ') +
    '</b> entró con el grupo lleno (más de ' + sede.cupoPorGrupo + ' chicos). Abrí otro grupo desde Administración → Inicio.</p>' : '') + '<p><b>' + esc_(fam.adulto) + '</b> · ' + esc_(fam.whatsapp) + ' · ' + esc_(fam.email) + '</p>' +
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
  if (!p.alias && !p.cbu) return 'Te pasamos los datos para transferir por WhatsApp.';
  return ['Alias: ' + p.alias, p.cbu ? 'CBU/CVU: ' + p.cbu : '', 'Banco: ' + p.banco, 'Titular: ' + p.titular].filter(Boolean).join('\n');
}
function urlCuenta_() { return ScriptApp.getService().getUrl() + '?p=cuenta'; }
function colorSede_(s) { return CONFIG.sedes[s] ? CONFIG.sedes[s].color : '#2F4A38'; }
function nombreGrupo_(id) { const g = todosGrupos_().filter(x => x.id === id)[0]; return g ? g.emoji + ' ' + g.nombre : id; }

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
