/**
 * Aldea de Valle — Eventos: cotizá, reservá y agendá una cita
 * ------------------------------------------------------------
 * Página pública donde la gente:
 *   · elige qué festeja, cuántos son, la fecha, el sector y el horario
 *   · ve la cotización al instante (los mismos precios para todos)
 *   · reserva con seña del 30% al alias, sin tener que escribir antes
 *   · o pide una cita para conocer el lugar (15, casamientos, empresas,
 *     escuelas: van con cita, los atiende Aldea India o Milagros)
 *   · descarga el presupuesto en PDF
 *
 * Cada reserva:
 *   1) se guarda en la pestaña "Reservas"
 *   2) se agenda en el calendario "Aldea · Eventos" como "⏳ A CONFIRMAR"
 *      (con la línea SECTOR: para que dos eventos en sectores distintos
 *      puedan convivir el mismo día)
 *   3) te llega un mail con el botón para escribirle por WhatsApp
 *   4) la persona recibe un mail con el resumen, los datos de la seña y el PDF
 *
 * Desde la planilla (menú "🏡 Aldea Eventos" o cambiando la columna Estado):
 *   · "Señado"     → ✅ CONFIRMADO y se le avisa por mail
 *   · "Cancelado"  → ❌ CANCELADO y el sector vuelve a quedar libre
 *   · "Realizado"  → 🎉 REALIZADO
 *   · Reprogramar  → menú: mueve el evento a otra fecha libre
 *
 * PRECIOS: se editan en la pestaña "Precios" (no hace falta tocar código).
 * Para actualizar por inflación, cambiá "ajusteInflacion" (ej: 8 = todo sube 8%).
 * CÓDIGOS DE DESCUENTO para conocidos: pestaña "Códigos".
 *
 * Bloquear un día: evento de todo el día en el calendario con BLOQUEADO
 * en el título (bloquea todo) o "BLOQUEADO salon" (bloquea solo ese sector).
 * Evento cargado a mano: escribí en la descripción "SECTOR: quincho"
 * (quincho, patio, salon, deck o predio). Si no dice sector, se toma como
 * que ocupa todo el predio, para no vender dos veces lo mismo.
 * ------------------------------------------------------------
 */

// ======== CONFIGURACIÓN ========
const CONFIG = {
  marca: 'Aldea de Valle',
  nombreCalendario: 'Aldea · Eventos',
  nombreCalendarioCitas: 'Aldea · Citas',
  whatsapp: '5493515308489',            // Milagros: recibe consultas y comprobantes
  emailAviso: '',                       // vacío = al mail de la cuenta dueña del script
  emailIndia: '',                       // opcional: mail de Aldea India para avisarle sus citas
  direccion: 'Aldea de Valle · Valle Escondido, Córdoba',
  urlWeb: '',                           // link de esta página (para los mails). Pegalo después de implementar.
  urlGlorin: 'https://script.google.com/macros/s/AKfycbzOiwz0lWWgExbIeJ7nF7bwWm2GSPg7NRR3C3zZRh81RhQ6NHVqX9u8sN8eJKOlxd1N/exec',
  india: { nombre: 'Aldea India', whatsapp: '5493515119452', instagram: 'aldeaindia.eventos',
           detalle: 'Catering, DJ, ambientación y organización integral' },
  pago: {
    alias: 'aldea.de.valle',
    banco: '',                          // opcional, ej: 'Mercado Pago'
    cbu: '',                            // opcional
    titular: '',                        // poné el nombre EXACTO que ve la persona al transferir
    linkMercadoPago: ''                 // opcional: link de pago FIJO
  },
  porcentajeSena: 30,
  horasParaSenar: 48,
  diasAnticipacionMin: 3,               // no se reserva online con menos de X días
  diasHaciaAdelante: 365,
  horaResumenDiario: 8,
  bufferMin: 60,                        // limpieza/armado entre dos eventos del mismo sector
  finMaximo: '02:00',                   // ningún evento termina después de esta hora
  validezPresupuestoDias: 7,
  horarios: ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30',
             '15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30',
             '21:00','21:30','22:00'],
  sectores: [
    { id: 'quincho', nombre: 'Quincho + cancha sintética', cap: 40,
      detalle: 'Semicubierto con asador, pegado a la cancha de fútbol sintética. El clásico de los cumples.',
      foto: 'cantina-tarde.jpg' },
    { id: 'patio', nombre: 'Patio de piedra + parque + cancha de 11', cap: 80,
      detalle: 'Al aire libre, con parque y la cancha grande. Ideal de día y para el sunset.',
      foto: 'cancha-futbol.jpg' },
    { id: 'salon', nombre: 'Salón cerrado', cap: 100,
      detalle: 'Cerrado y techado, para fiestas de noche o días de lluvia.',
      foto: 'eventos-salon.jpg' },
    { id: 'deck', nombre: 'Deck', cap: 40,
      detalle: 'Íntimo y al aire libre, para reuniones chicas.',
      foto: 'hero-fogon.jpg' }
  ],
  predio: { id: 'predio', nombre: 'Predio completo (uso exclusivo)', cap: 400,
            detalle: 'Todo el predio solo para tu evento.', foto: 'escuela-verano.jpg' },
  // Horarios en que un sector está ocupado por actividades fijas (0=domingo … 6=sábado)
  bloqueosFijos: [
    { sector: 'salon', dias: [1, 2, 3, 4, 5], desde: '17:00', hasta: '23:00', motivo: 'Clases en el salón' }
  ],
  urlFotos: 'https://raw.githubusercontent.com/faustorizzi28-art/aldea-sistema/main/img/',
  // modo: 'reserva' (reserva online con seña) · 'india' (cita con Aldea India) · 'cita' (cita con Aldea)
  tipos: [
    { id: 'infantil', nombre: 'Cumple infantil', emoji: '🎈', modo: 'reserva', tarifa: 'infantil',
      duracion: 150, duraciones: [150, 180, 210], sectores: ['quincho', 'patio', 'salon'], pileta: true,
      unidad: 'chicos', decorar: 'Podés entrar a decorar 1 hora antes.' },
    { id: 'adultos', nombre: 'Cumple de adultos', emoji: '🥂', modo: 'reserva', tarifa: 'social',
      duracion: 240, duraciones: [180, 240, 300, 360], sectores: ['quincho', 'patio', 'salon', 'deck'], pileta: true,
      modalidades: ['barra', 'barralibre', 'alquiler'], decorar: 'Podés entrar a decorar 1 hora antes.' },
    { id: 'bautismo', nombre: 'Bautismo / comunión', emoji: '🕊️', modo: 'reserva', tarifa: 'social',
      duracion: 240, duraciones: [180, 240, 300], sectores: ['quincho', 'patio', 'salon', 'deck'], pileta: true,
      modalidades: ['barra', 'barralibre', 'alquiler'], decorar: 'Podés entrar a decorar 1 hora antes.' },
    { id: 'babyshower', nombre: 'Baby shower', emoji: '🍼', modo: 'reserva', tarifa: 'social',
      duracion: 180, duraciones: [180, 240, 300], sectores: ['quincho', 'patio', 'salon', 'deck'], pileta: false,
      modalidades: ['barra', 'barralibre', 'alquiler'], decorar: 'Podés entrar a decorar 1 hora antes.' },
    { id: 'recibida', nombre: 'Recibida / egresados', emoji: '🎓', modo: 'reserva', tarifa: 'social',
      duracion: 240, duraciones: [180, 240, 300, 360], sectores: ['quincho', 'patio', 'salon', 'deck'], pileta: true,
      modalidades: ['barra', 'barralibre', 'alquiler'], decorar: 'Podés entrar a decorar 1 hora antes.' },
    { id: 'asado', nombre: 'Asado entre semana', emoji: '🔥', modo: 'reserva', tarifa: 'asado',
      duracion: 240, duraciones: [180, 240, 300], sectores: ['quincho', 'patio', 'deck'], pileta: false,
      soloLunJue: true, decorar: '' },
    { id: 'quince', nombre: '15 años', emoji: '👑', modo: 'india', tarifa: 'formal',
      duracion: 300, duraciones: [300, 360, 420], sectores: ['salon', 'patio', 'predio'], pileta: false,
      modalidades: ['alquiler', 'barralibre'], decorar: 'Podés dejar las cosas el día anterior y decorar con tiempo.' },
    { id: 'boda', nombre: 'Casamiento', emoji: '💍', modo: 'india', tarifa: 'formal',
      duracion: 300, duraciones: [300, 360, 420], sectores: ['salon', 'patio', 'predio'], pileta: false,
      modalidades: ['alquiler', 'barralibre'], decorar: 'Podés dejar las cosas el día anterior y decorar con tiempo.' },
    { id: 'empresa', nombre: 'Evento empresarial', emoji: '💼', modo: 'cita', tarifa: 'social',
      duracion: 240, duraciones: [180, 240, 300, 360, 480], sectores: ['quincho', 'patio', 'salon', 'deck', 'predio'], pileta: true,
      modalidades: ['barralibre', 'alquiler'], decorar: '' },
    { id: 'escuela', nombre: 'Jornada escolar / convivencia', emoji: '🏫', modo: 'cita', tarifa: 'escuela',
      duracion: 480, duraciones: [480], sectores: ['predio'], pileta: true, unidad: 'alumnos',
      modalidades: ['almuerzo', 'completa'], decorar: '' }
  ],
  modalidades: {
    barra: { nombre: 'Espacio + crédito de barra', destacado: true,
             detalle: 'Pagás un espacio reducido y el resto queda como crédito para tragos y bebidas en la barra de Aldea. Barman incluido.' },
    barralibre: { nombre: 'Espacio + barra libre', detalle: 'Barra libre de tragos y bebidas por persona durante el evento. Barman incluido.' },
    alquiler: { nombre: 'Solo el espacio', detalle: 'Alquilás el espacio y las bebidas se compran en la cantina durante el evento.' },
    almuerzo: { nombre: 'Jornada con almuerzo', detalle: 'Uso del predio + almuerzo (2 hamburguesas y gaseosa) por alumno.' },
    completa: { nombre: 'Jornada completa', detalle: 'Uso del predio + almuerzo + merienda por alumno.' }
  },
  extras: [
    { id: 'seguridad', nombre: 'Seguridad', precio: 'seguridad', max: 4, detalle: 'Por persona de seguridad, todo el evento',
      tipos: ['adultos', 'bautismo', 'recibida', 'quince', 'boda', 'empresa'] },
    { id: 'limpieza', nombre: 'Limpieza durante el evento', precio: 'limpiezaDurante', max: 1, detalle: 'Además de la limpieza de antes y después',
      tipos: ['infantil', 'adultos', 'bautismo', 'babyshower', 'recibida', 'empresa'] },
    { id: 'barman', nombre: 'Barman', precio: 'barman', max: 2, detalle: 'Por barman, hasta 4 horas', incluidoEn: ['barra', 'barralibre'],
      tipos: ['adultos', 'bautismo', 'babyshower', 'recibida', 'quince', 'boda', 'empresa'] },
    { id: 'parrillero', nombre: 'Parrillero', precio: 'parrillero', max: 2, detalle: 'Vos traés la carne, él se encarga',
      tipos: ['infantil', 'adultos', 'bautismo', 'recibida', 'asado', 'empresa'] },
    { id: 'fogonero', nombre: 'Fogonero', precio: 'fogonero', max: 1, detalle: 'Fogón prendido y cuidado toda la noche',
      tipos: ['adultos', 'bautismo', 'recibida', 'asado', 'quince', 'boda', 'empresa'] },
    { id: 'cuidacoches', nombre: 'Cuidacoches', precio: 'cuidacoches', max: 2, detalle: 'Por persona',
      tipos: ['adultos', 'bautismo', 'recibida', 'quince', 'boda', 'empresa'] },
    { id: 'chulengo', nombre: 'Chulengo / estufa', precio: 'chulengo', max: 3, detalle: 'Para las noches frescas', meses: [4, 5, 6, 7, 8, 9],
      tipos: ['infantil', 'adultos', 'bautismo', 'babyshower', 'recibida', 'asado', 'quince', 'boda', 'empresa'] },
    { id: 'pancho', nombre: 'Panchos', precio: 'pancho', max: 150, paso: 10, detalle: 'Por unidad', tipos: ['infantil'] },
    { id: 'empanada', nombre: 'Empanadas', precio: 'empanada', max: 150, paso: 12, detalle: 'Por unidad', tipos: ['infantil'] },
    { id: 'pizza', nombre: 'Pizzas', precio: 'pizza', max: 30, paso: 1, detalle: 'Por pizza entera', tipos: ['infantil'] }
  ],
  citas: {
    dias: [1, 2, 3, 4, 5],              // lunes a viernes
    horarios: ['18:00', '18:30', '19:00', '19:30', '20:00'],
    duracionMin: 30,
    diasHaciaAdelante: 30,
    equipos: {
      aldea: { nombre: 'Aldea de Valle', quien: 'Milagros', whatsapp: '5493515308489' },
      india: { nombre: 'Aldea India', quien: 'Luli o Nati', whatsapp: '5493515119452' }
    }
  },
  testimonios: [                        // { texto: '...', autor: 'Nombre · Cumple de 40' }
  ]
};

// Precios base. Al correr configurarInicial se copian a la pestaña "Precios":
// desde ahí los cambiás sin tocar el código. [clave, valor, qué es, ¿es plata?]
const PRECIOS_BASE = [
  ['ajusteInflacion', 0, 'Ajuste general por inflación en %. Ej: 8 = todos los precios en $ suben 8%.', false],
  ['infantilBase', 380000, 'Cumple infantil: precio base (sector + 6 gaseosas + encargado + limpieza)', true],
  ['infantilChicosIncluidos', 30, 'Cumple infantil: chicos incluidos en el precio base', false],
  ['infantilChicoExtra', 9000, 'Cumple infantil: cada chico extra', true],
  ['horaExtra', 45000, 'Hora extra (se cobra proporcional, de a media hora)', true],
  ['tramo30', 380000, 'Alquiler del espacio hasta 30 personas', true],
  ['tramo50', 480000, 'Alquiler del espacio de 31 a 50 personas', true],
  ['tramo80', 650000, 'Alquiler del espacio de 51 a 80 personas', true],
  ['tramo100', 800000, 'Alquiler del espacio de 81 a 100 personas', true],
  ['tramo150', 1000000, 'Alquiler del espacio de 101 a 150 personas', true],
  ['personaExtra', 8000, 'Cada persona por encima de 150', true],
  ['barraAlquiler', 200000, 'Pack barra / barra libre: lo que se cobra por el espacio', true],
  ['barraCreditoPorPersona', 10000, 'Pack barra: crédito de barra por persona', true],
  ['barraCreditoMinimo', 300000, 'Pack barra: crédito mínimo', true],
  ['barraLibrePorPersona', 12000, 'Barra libre por persona (4 h aprox.)', true],
  ['recargoExclusivo', 500000, 'Recargo por usar el predio completo en exclusiva', true],
  ['descuentoLunJue', 15, 'Descuento % en el espacio de lunes a jueves (cumples y celebraciones)', false],
  ['pileta', 120000, 'Pileta + guardavidas (temporada de verano)', true],
  ['formalPersonasPorGuardia', 60, '15 y casamientos: 1 seguridad cada X personas', false],
  ['seguridad', 90000, 'Seguridad, por persona', true],
  ['limpiezaDurante', 50000, 'Limpieza durante el evento', true],
  ['barman', 90000, 'Barman, por persona (hasta 4 h)', true],
  ['parrillero', 90000, 'Parrillero', true],
  ['fogonero', 70000, 'Fogonero', true],
  ['cuidacoches', 70000, 'Cuidacoches, por persona', true],
  ['chulengo', 60000, 'Chulengo / estufa, por unidad', true],
  ['pancho', 3000, 'Pancho, por unidad', true],
  ['empanada', 3000, 'Empanada, por unidad', true],
  ['pizza', 17000, 'Pizza entera', true],
  ['escuelaAlmuerzo', 16000, 'Jornada escolar con almuerzo, por alumno', true],
  ['escuelaCompleta', 20000, 'Jornada escolar con almuerzo y merienda, por alumno', true],
  ['escuelaMinimo', 40, 'Jornada escolar: mínimo de alumnos que se cobra', false]
];
const MESES_PILETA = [12, 1, 2, 3];

const HOJA = 'Reservas';
const HOJA_CITAS = 'Citas';
const HOJA_CONSULTAS = 'Consultas';
const HOJA_PRECIOS = 'Precios';
const HOJA_CODIGOS = 'Códigos';
const ESTADOS = ['A confirmar', 'Señado', 'Realizado', 'Cancelado'];
const ESTADOS_CITA = ['Agendada', 'Realizada', 'Contratado', 'No vino', 'Cancelada'];
const PREFIJO_ESTADO = {
  'A confirmar': '⏳ A CONFIRMAR', 'Señado': '✅ CONFIRMADO', 'Realizado': '🎉 REALIZADO', 'Cancelado': '❌ CANCELADO',
  'Agendada': '📅 CITA', 'Realizada': '📅 CITA HECHA', 'Contratado': '🤝 CITA · CONTRATÓ', 'No vino': '🚫 CITA · NO VINO', 'Cancelada': '❌ CITA CANCELADA'
};
const COLOR_ESTADO = {
  'A confirmar': CalendarApp.EventColor.YELLOW, 'Señado': CalendarApp.EventColor.GREEN,
  'Realizado': CalendarApp.EventColor.BLUE, 'Cancelado': CalendarApp.EventColor.GRAY
};
const COLUMNAS = [
  'ID', 'Recibido', 'Estado', 'Tipo', 'Fecha evento', 'Hora inicio', 'Hora fin', 'Duración', 'Sector',
  'Personas', 'Adultos aprox.', 'Nombre', 'WhatsApp', 'Email', 'Agasajado/a', 'Edad / motivo',
  'Modalidad', 'Detalle del presupuesto', 'Código', 'Total', 'Seña', 'Saldo',
  'Decoración', 'Comida', 'Animación GLORIN', 'Cómo nos conoció', 'Comentarios',
  'PDF', 'WhatsApp link', 'ID evento calendario', 'Último aviso', 'Detalle completo (JSON)'
];
const COLUMNAS_CITAS = [
  'ID', 'Recibido', 'Estado', 'Equipo', 'Fecha cita', 'Hora cita', 'Nombre', 'WhatsApp', 'Email',
  'Tipo de evento', 'Fecha tentativa', 'Personas', 'Sector', 'Estimación Aldea', 'Qué busca',
  'PDF', 'WhatsApp link', 'ID evento calendario', 'Detalle completo (JSON)'
];
const COLUMNAS_CONSULTAS = [
  'Recibido', 'Nombre', 'WhatsApp', 'Email', 'Tipo', 'Fecha', 'Personas', 'Sector', 'Total', 'PDF', 'WhatsApp link', 'Estado', 'Notas'
];

// ======== SERVIR LA PÁGINA ========
function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (prm.api === 'datos') return json_(getDatosIniciales);
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Aldea de Valle · Eventos')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// API para la página publicada afuera (GitHub Pages / Instagram)
function doPost(e) {
  return json_(function () {
    const pedido = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const acciones = { enviarReserva: enviarReserva, agendarCita: agendarCita,
                       generarPresupuesto: generarPresupuesto, validarCodigo: validarCodigo };
    if (!acciones[pedido.accion]) throw new Error('Acción desconocida.');
    return acciones[pedido.accion](pedido.datos);
  });
}

function json_(fn) {
  let salida;
  try { salida = { ok: true, data: fn() }; } catch (err) { salida = { ok: false, error: err.message }; }
  return ContentService.createTextOutput(JSON.stringify(salida)).setMimeType(ContentService.MimeType.JSON);
}

// ======== CONFIGURACIÓN INICIAL (correr UNA vez a mano) ========
function configurarInicial() {
  const sh = obtenerHoja_(HOJA, COLUMNAS);
  sh.getRange(2, columna_(sh, 'Estado'), 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build());
  colorearEstados_(sh, { 'A confirmar': '#FFF4C2', 'Señado': '#D6F5DD', 'Realizado': '#DCE8FB', 'Cancelado': '#EEEEEE' });
  const shc = obtenerHoja_(HOJA_CITAS, COLUMNAS_CITAS);
  shc.getRange(2, columna_(shc, 'Estado'), 1000, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS_CITA, true).build());
  colorearEstados_(shc, { 'Agendada': '#FFF4C2', 'Contratado': '#D6F5DD', 'Realizada': '#DCE8FB', 'No vino': '#FDE2E2', 'Cancelada': '#EEEEEE' });
  obtenerHoja_(HOJA_CONSULTAS, COLUMNAS_CONSULTAS);
  hojaPrecios_();
  hojaCodigos_();
  calendario_(CONFIG.nombreCalendario);
  calendario_(CONFIG.nombreCalendarioCitas);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['alEditarPlanilla', 'resumenDiario'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alEditarPlanilla').forSpreadsheet(ss).onEdit().create();
  ScriptApp.newTrigger('resumenDiario').timeBased().everyDays(1).atHour(CONFIG.horaResumenDiario).create();
  Logger.log('Listo. Ahora: Implementar > Nueva implementación > Aplicación web (Ejecutar como: Yo · Acceso: Cualquier persona).');
}

function obtenerHoja_(nombre, columnas) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) sh = ss.insertSheet(nombre);
  if (sh.getLastRow() === 0) {
    sh.appendRow(columnas);
    sh.setFrozenRows(1);
  } else {
    const actuales = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const faltan = columnas.filter(function (c) { return actuales.indexOf(c) < 0; });
    if (faltan.length) sh.getRange(1, actuales.length + 1, 1, faltan.length).setValues([faltan]);
  }
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#2F4A38').setFontColor('#F4EFE3');
  return sh;
}

function hojaPrecios_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_PRECIOS);
  if (!sh) sh = ss.insertSheet(HOJA_PRECIOS);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Clave', 'Valor', 'Qué es (cambiá solo la columna Valor)']);
    sh.setFrozenRows(1);
  }
  const existentes = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return String(r[0]); });
  PRECIOS_BASE.forEach(function (p) {
    if (existentes.indexOf(p[0]) < 0) sh.appendRow([p[0], p[1], p[2]]);
  });
  sh.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#2F4A38').setFontColor('#F4EFE3');
  sh.getRange(2, 2, sh.getLastRow() - 1, 1).setBackground('#FFF4C2');
  sh.autoResizeColumns(1, 3);
  return sh;
}

function hojaCodigos_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(HOJA_CODIGOS);
  if (!sh) sh = ss.insertSheet(HOJA_CODIGOS);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['Código', 'Descuento %', 'Precio mínimo del espacio', 'Activo', 'Para quién / notas']);
    sh.appendRow(['AMIGOSDEALDEA', 20, 300000, 'Sí', 'Conocidos y amigos: nunca baja de $300.000']);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#2F4A38').setFontColor('#F4EFE3');
  }
  return sh;
}

function encabezados_(sh) { return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]; }

function columna_(sh, nombre) {
  const i = encabezados_(sh).indexOf(nombre);
  if (i < 0) throw new Error('No encuentro la columna "' + nombre + '". Corré configurarInicial().');
  return i + 1;
}

function colorearEstados_(sh, colores) {
  const rango = sh.getRange(2, columna_(sh, 'Estado'), 1000, 1);
  const reglas = sh.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (x) { return x.getColumn() === rango.getColumn(); });
  });
  Object.keys(colores).forEach(function (estado) {
    reglas.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(estado)
      .setBackground(colores[estado]).setRanges([rango]).build());
  });
  sh.setConditionalFormatRules(reglas);
}

function calendario_(nombre) {
  const cals = CalendarApp.getCalendarsByName(nombre);
  if (cals.length) return cals[0];
  return CalendarApp.createCalendar(nombre, { color: CalendarApp.Color.GREEN });
}

// ======== PRECIOS Y CÓDIGOS (desde la planilla) ========
function precios_() {
  const P = {};
  const plata = {};
  PRECIOS_BASE.forEach(function (p) { P[p[0]] = p[1]; plata[p[0]] = p[3]; });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PRECIOS);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach(function (r) {
      const k = String(r[0]).trim();
      const v = Number(String(r[1]).replace(/[$.\s]/g, '').replace(',', '.'));
      if (k in P && r[1] !== '' && !isNaN(v)) P[k] = v;
    });
  }
  const aj = Number(P.ajusteInflacion) || 0;
  if (aj) Object.keys(P).forEach(function (k) {
    if (plata[k]) P[k] = Math.round(P[k] * (1 + aj / 100) / 1000) * 1000;
  });
  P.mesesPileta = MESES_PILETA;
  return P;
}

function buscarCodigo_(codigo) {
  const c = String(codigo || '').trim().toUpperCase();
  if (!c) return null;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CODIGOS);
  if (!sh || sh.getLastRow() < 2) return null;
  const filas = sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues();
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (String(f[0]).trim().toUpperCase() === c && /^s/i.test(String(f[3]))) {
      return { codigo: c, descuento: Number(f[1]) || 0, piso: Number(f[2]) || 0 };
    }
  }
  return null;
}

function validarCodigo(codigo) {
  const c = buscarCodigo_(codigo);
  if (!c) throw new Error('Ese código no existe o ya no está activo.');
  return c;
}

// ======== DATOS PARA LA PÁGINA ========
function getDatosIniciales() {
  const tz = Session.getScriptTimeZone();
  return {
    config: configPublica_(),
    precios: precios_(),
    hoy: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
    ocupados: leerOcupados_(),
    citas: leerCitasOcupadas_()
  };
}

function configPublica_() {
  const c = JSON.parse(JSON.stringify(CONFIG));
  delete c.emailAviso;
  delete c.emailIndia;
  delete c.nombreCalendario;
  delete c.nombreCalendarioCitas;
  return c;
}

// ======== DISPONIBILIDAD POR SECTOR ========
function idsSectores_() { return CONFIG.sectores.map(function (s) { return s.id; }); }

// Lee de qué sector es un evento: línea "SECTOR: quincho" o palabras en el título.
// Si no encuentra nada, ocupa todo (mejor no vender dos veces lo mismo).
function sectoresDe_(texto) {
  const t = String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const m = /sector:\s*([a-z ,]+)/.exec(t);
  const fuente = m ? m[1] : t;
  if (/predio|exclusiv|todo/.test(fuente)) return idsSectores_();
  const encontrados = idsSectores_().filter(function (id) { return fuente.indexOf(id) >= 0; });
  return encontrados.length ? encontrados : idsSectores_();
}

function leerOcupados_() {
  const cal = calendario_(CONFIG.nombreCalendario);
  const tz = Session.getScriptTimeZone();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hasta = new Date(hoy.getTime() + (CONFIG.diasHaciaAdelante + 1) * 86400000);
  const ocupados = {};   // { 'yyyy-MM-dd': { bloq: [sectores], ev: [[iniMin, finMin, [sectores]]] } }
  const dia = function (k) { return (ocupados[k] = ocupados[k] || { bloq: [], ev: [] }); };

  cal.getEvents(hoy, hasta).forEach(function (ev) {
    const titulo = ev.getTitle() || '';
    if (/CANCELAD/i.test(titulo)) return;
    if (ev.isAllDayEvent()) {
      if (!/BLOQUEAD/i.test(titulo)) return;
      const secs = /BLOQUEAD[OA]\s*$/i.test(titulo.trim()) ? idsSectores_() : sectoresDe_(titulo.replace(/BLOQUEAD[OA]/i, ''));
      let d = new Date(ev.getAllDayStartDate());
      const fin = ev.getAllDayEndDate();
      while (d < fin) {
        const o = dia(Utilities.formatDate(d, tz, 'yyyy-MM-dd'));
        secs.forEach(function (s) { if (o.bloq.indexOf(s) < 0) o.bloq.push(s); });
        d = new Date(d.getTime() + 86400000);
      }
      return;
    }
    const ini = ev.getStartTime();
    const k = Utilities.formatDate(ini, tz, 'yyyy-MM-dd');
    const iniMin = Number(Utilities.formatDate(ini, tz, 'H')) * 60 + Number(Utilities.formatDate(ini, tz, 'm'));
    const finMin = iniMin + Math.round((ev.getEndTime() - ini) / 60000);
    dia(k).ev.push([iniMin, finMin, sectoresDe_(titulo + '\n' + ev.getDescription())]);
  });
  return ocupados;
}

function aMin_(h) { const p = String(h).split(':'); return Number(p[0]) * 60 + Number(p[1]); }

// Misma regla que usa la página: ¿está libre el sector en ese horario?
function sectorLibre_(fecha, dia, sector, hora, dur) {
  const secs = sector === 'predio' ? idsSectores_() : [sector];
  const ini = aMin_(hora), fin = ini + dur;
  const dow = new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10))).getDay();
  for (let i = 0; i < CONFIG.bloqueosFijos.length; i++) {
    const b = CONFIG.bloqueosFijos[i];
    if (secs.indexOf(b.sector) >= 0 && b.dias.indexOf(dow) >= 0 && ini < aMin_(b.hasta) && aMin_(b.desde) < fin) return false;
  }
  if (!dia) return true;
  if (secs.some(function (s) { return dia.bloq.indexOf(s) >= 0; })) return false;
  return !dia.ev.some(function (e) {
    const choca = ini < e[1] + CONFIG.bufferMin && e[0] < fin + CONFIG.bufferMin;
    return choca && e[2].some(function (s) { return secs.indexOf(s) >= 0; });
  });
}

function leerCitasOcupadas_() {
  const cal = calendario_(CONFIG.nombreCalendarioCitas);
  const tz = Session.getScriptTimeZone();
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hasta = new Date(hoy.getTime() + (CONFIG.citas.diasHaciaAdelante + 1) * 86400000);
  const r = {};   // { 'yyyy-MM-dd': { aldea: ['18:00'], india: [] } }
  cal.getEvents(hoy, hasta).forEach(function (ev) {
    const t = ev.getTitle() || '';
    if (/CANCELAD/i.test(t)) return;
    const k = Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd');
    const h = Utilities.formatDate(ev.getStartTime(), tz, 'HH:mm');
    r[k] = r[k] || { aldea: [], india: [] };
    if (ev.isAllDayEvent()) { if (/BLOQUEAD/i.test(t)) { r[k].aldea = CONFIG.citas.horarios.slice(); r[k].india = CONFIG.citas.horarios.slice(); } return; }
    const eq = /india/i.test(t) ? 'india' : 'aldea';
    r[k][eq].push(h);
  });
  return r;
}

// ==== COTIZAR (inicio) — este bloque es IDÉNTICO en Code.gs e Index.html. Si cambiás uno, copialo en el otro.
function cotizar(d, P, C, cod) {
  var buscar = function (lista, id) { for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i]; return null; };
  var redondo = function (x) { return Math.round(x / 1000) * 1000; };
  var plata = function (x) { return '$' + Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  var hs = function (min) { var h = Math.floor(min / 60), m = min % 60; return (h ? h + ' h' : '') + (h && m ? ' ' : '') + (m ? m + ' min' : ''); };
  var T = buscar(C.tipos, d.tipo);
  if (!T) return { error: 'Elegí qué querés festejar.' };
  var n = Math.max(0, Math.floor(Number(d.personas) || 0));
  var fecha = /^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') ? new Date(+d.fecha.slice(0, 4), +d.fecha.slice(5, 7) - 1, +d.fecha.slice(8, 10)) : null;
  var dow = fecha ? fecha.getDay() : -1, mes = fecha ? fecha.getMonth() + 1 : 0;
  var lunJue = dow >= 1 && dow <= 4;
  var dur = T.duraciones.indexOf(Number(d.duracion)) >= 0 ? Number(d.duracion) : T.duracion;
  var extraMin = Math.max(0, dur - T.duracion);
  var mod = T.modalidades ? (T.modalidades.indexOf(d.modalidad) >= 0 ? d.modalidad : T.modalidades[0]) : '';
  var sector = d.sector === 'predio' ? C.predio : buscar(C.sectores, d.sector);
  var lineas = [], avisos = [], incluye = [];
  var add = function (t, m, det) { lineas.push({ t: t, m: Math.round(m), d: det || '' }); };
  var tramo = function (x) {
    if (x <= 30) return P.tramo30; if (x <= 50) return P.tramo50; if (x <= 80) return P.tramo80;
    if (x <= 100) return P.tramo100; if (x <= 150) return P.tramo150; return P.tramo150 + (x - 150) * P.personaExtra;
  };

  // 1) Espacio
  var espacio = 0, txtEsp = '';
  if (T.tarifa === 'infantil') {
    espacio = P.infantilBase;
    txtEsp = 'Cumple infantil · hasta ' + P.infantilChicosIncluidos + ' chicos · ' + hs(T.duracion);
    incluye.push('6 gaseosas', 'Encargado durante el cumple', 'Limpieza antes y después', 'Uso de la cancha');
  } else if (T.tarifa === 'social' || T.tarifa === 'formal') {
    if (mod === 'alquiler' || T.tarifa === 'formal') { espacio = tramo(n); txtEsp = 'Alquiler del espacio · ' + n + ' personas · ' + hs(T.duracion); }
    else { espacio = P.barraAlquiler; txtEsp = 'Espacio · ' + hs(T.duracion); }
    incluye.push('Encargado durante el evento', 'Limpieza antes y después', 'Vajilla');
    if (mod === 'barra' || mod === 'barralibre') incluye.push('Barman');
  } else if (T.tarifa === 'asado') {
    txtEsp = 'Espacio sin cargo de lunes a jueves · consumo en la cantina';
    incluye.push('Uso del asador', 'Consumo en la cantina de Aldea');
    if (fecha && !lunJue) avisos.push('El asado sin cargo es de lunes a jueves. Para viernes a domingo elegí "Cumple de adultos".');
  }
  if (T.tarifa !== 'escuela') add(txtEsp, espacio);

  // 2) Descuentos sobre el espacio
  var esp = espacio;
  if (esp > 0 && lunJue && (T.tarifa === 'infantil' || (T.tarifa === 'social' && T.modo === 'reserva')) && P.descuentoLunJue > 0) {
    var dto = redondo(esp * P.descuentoLunJue / 100);
    add('Descuento de lunes a jueves (' + P.descuentoLunJue + '%)', -dto);
    esp -= dto;
  }
  if (cod && esp > 0 && cod.descuento > 0 && esp > (cod.piso || 0)) {
    var nuevo = Math.max(cod.piso || 0, redondo(esp * (1 - cod.descuento / 100)));
    add('Código ' + cod.codigo, nuevo - esp);
    esp = nuevo;
  }

  // 3) Lo que depende de la cantidad de personas
  if (T.tarifa === 'infantil' && n > P.infantilChicosIncluidos) {
    var ext = n - P.infantilChicosIncluidos;
    add(ext + ' chico' + (ext > 1 ? 's' : '') + ' extra', ext * P.infantilChicoExtra, plata(P.infantilChicoExtra) + ' c/u');
  }
  if (mod === 'barra') {
    var cred = Math.max(P.barraCreditoMinimo, n * P.barraCreditoPorPersona);
    add('Crédito de barra (tragos y bebidas)', cred, 'Se consume durante el evento');
  }
  if (mod === 'barralibre') add('Barra libre · ' + n + ' personas', n * P.barraLibrePorPersona, plata(P.barraLibrePorPersona) + ' por persona');
  if (T.tarifa === 'escuela') {
    var alumnos = Math.max(n, P.escuelaMinimo);
    var pp = mod === 'completa' ? P.escuelaCompleta : P.escuelaAlmuerzo;
    add(C.modalidades[mod].nombre + ' · ' + alumnos + ' alumnos', alumnos * pp, plata(pp) + ' por alumno');
    if (n < P.escuelaMinimo) avisos.push('Se cobra un mínimo de ' + P.escuelaMinimo + ' alumnos.');
  }
  if (T.tarifa === 'formal') {
    var guardias = Math.max(1, Math.ceil(n / P.formalPersonasPorGuardia));
    add('Seguridad · ' + guardias + ' persona' + (guardias > 1 ? 's' : ''), guardias * P.seguridad);
    add('Limpieza durante el evento', P.limpiezaDurante);
  }

  // 4) Sector, horario y temporada
  if (d.sector === 'predio' && T.tarifa !== 'escuela') add('Predio completo en exclusiva', P.recargoExclusivo);
  if (extraMin > 0) add('Tiempo extra · ' + hs(extraMin), redondo(P.horaExtra * extraMin / 60));
  if (d.pileta && T.pileta) {
    if (mes && P.mesesPileta.indexOf(mes) < 0) avisos.push('La pileta se habilita en temporada de verano (diciembre a marzo).');
    else add('Pileta + guardavidas', P.pileta);
  }

  // 5) Extras
  var elegidos = d.extras || {};
  C.extras.forEach(function (e) {
    var cant = Math.floor(Number(elegidos[e.id]) || 0);
    if (cant <= 0 || e.tipos.indexOf(T.id) < 0) return;
    if (e.incluidoEn && e.incluidoEn.indexOf(mod) >= 0) return;
    if (e.meses && mes && e.meses.indexOf(mes) < 0) return;
    if (T.tarifa === 'formal' && (e.id === 'seguridad' || e.id === 'limpieza')) return;
    cant = Math.min(cant, e.max);
    add(e.nombre + (cant > 1 ? ' x' + cant : ''), cant * P[e.precio]);
  });

  // 6) Capacidad y totales
  if (sector && n > sector.cap) avisos.push(sector.nombre + ' tiene lugar para ' + sector.cap + ' personas. Elegí otro sector o el predio completo.');
  var total = 0;
  lineas.forEach(function (l) { total += l.m; });
  var sena = T.modo === 'reserva' ? redondo(total * C.porcentajeSena / 100) : 0;
  return {
    tipo: T.id, modo: T.modo, lineas: lineas, total: total, sena: sena, saldo: total - sena,
    avisos: avisos, incluye: incluye, duracion: dur, modalidad: mod,
    excede: !!(sector && n > sector.cap), desde: T.modo !== 'reserva'
  };
}
// ==== COTIZAR (fin)

// ======== VALIDACIÓN ========
function limpiar_(d) {
  if (!d) throw new Error('No llegaron los datos. Recargá la página.');
  Object.keys(d).forEach(function (k) { if (typeof d[k] === 'string') d[k] = d[k].trim().slice(0, 1000); });
  return d;
}

function validarContacto_(d) {
  const faltan = [];
  if (!d.nombre) faltan.push('tu nombre');
  if (!d.whatsapp) faltan.push('WhatsApp');
  if (faltan.length) throw new Error('Falta completar: ' + faltan.join(', ') + '.');
  if (String(d.whatsapp).replace(/\D/g, '').length < 10) throw new Error('Revisá el WhatsApp: poné código de área y número (ej: 351 5308489).');
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('Revisá el email.');
}

function tipo_(id) {
  const T = CONFIG.tipos.filter(function (t) { return t.id === id; })[0];
  if (!T) throw new Error('Elegí qué querés festejar.');
  return T;
}

function nombreSector_(id) {
  if (id === 'predio') return CONFIG.predio.nombre;
  const s = CONFIG.sectores.filter(function (x) { return x.id === id; })[0];
  return s ? s.nombre : '';
}

// ======== RESERVA ONLINE ========
function enviarReserva(d) {
  limpiar_(d);
  validarContacto_(d);
  const T = tipo_(d.tipo);
  if (T.modo !== 'reserva') throw new Error('Este tipo de evento se arma con una cita. Elegí "Agendar cita".');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '') || CONFIG.horarios.indexOf(d.hora) < 0) throw new Error('Elegí fecha y horario.');
  if (T.sectores.indexOf(d.sector) < 0) throw new Error('Elegí dónde lo querés hacer.');
  if (!(Number(d.personas) > 0)) throw new Error('Decinos cuántas personas van a ser.');
  const tz = Session.getScriptTimeZone();
  const minimo = Utilities.formatDate(new Date(Date.now() + CONFIG.diasAnticipacionMin * 86400000), tz, 'yyyy-MM-dd');
  const maximo = Utilities.formatDate(new Date(Date.now() + CONFIG.diasHaciaAdelante * 86400000), tz, 'yyyy-MM-dd');
  if (d.fecha < minimo) throw new Error('Para esa fecha escribinos por WhatsApp así vemos si llegamos.');
  if (d.fecha > maximo) throw new Error('Esa fecha todavía no está abierta. Escribinos por WhatsApp.');
  const dow = new Date(Number(d.fecha.slice(0, 4)), Number(d.fecha.slice(5, 7)) - 1, Number(d.fecha.slice(8, 10))).getDay();
  if (T.soloLunJue && (dow < 1 || dow > 4)) throw new Error('El asado sin cargo es de lunes a jueves.');

  const cod = d.codigo ? buscarCodigo_(d.codigo) : null;
  const p = cotizar(d, precios_(), CONFIG, cod);
  if (p.error) throw new Error(p.error);
  if (p.excede) throw new Error(p.avisos[p.avisos.length - 1]);
  if (aMin_(d.hora) + p.duracion > 24 * 60 + aMin_(CONFIG.finMaximo)) throw new Error('El evento tiene que terminar antes de las ' + CONFIG.finMaximo + '. Elegí un horario más temprano.');

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hay mucha gente reservando en este momento. Probá de nuevo en unos segundos.');
  let id, ev, iniReal, finReal;
  try {
    if (!sectorLibre_(d.fecha, leerOcupados_()[d.fecha], d.sector, d.hora, p.duracion)) {
      throw new Error('Ese horario se acaba de ocupar. Elegí otro, por favor.');
    }
    id = 'AV-' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    iniReal = fechaHora_(d.fecha, d.hora);
    finReal = new Date(iniReal.getTime() + p.duracion * 60000);
    const opciones = { description: descripcionEvento_(id, d, p), location: CONFIG.direccion };
    if (d.email) { opciones.guests = d.email; opciones.sendInvites = true; }
    ev = calendario_(CONFIG.nombreCalendario).createEvent(tituloEvento_('A confirmar', d), iniReal, finReal, opciones);
    try { ev.setColor(COLOR_ESTADO['A confirmar']); } catch (e) {}
  } finally {
    lock.releaseLock();
  }

  const hhmm = function (t) { return Utilities.formatDate(t, tz, 'HH:mm'); };
  const r = { id: id, nombre: d.nombre, agasajado: d.agasajado, tipo: T.nombre, fecha: d.fecha, hora: d.hora, fin: hhmm(finReal),
              total: p.total, sena: p.sena, saldo: p.saldo, sector: nombreSector_(d.sector) };
  const waCliente = linkWhatsApp_(d.whatsapp, mensajeCliente_('recibida', r));
  let pdf = '';
  try { pdf = crearPdf_(id, d, p, 'reserva'); } catch (e) { console.error(e); }

  escribirFila_(obtenerHoja_(HOJA, COLUMNAS), {
    'ID': id, 'Recibido': new Date(), 'Estado': 'A confirmar', 'Tipo': T.nombre, 'Fecha evento': d.fecha,
    'Hora inicio': d.hora, 'Hora fin': r.fin, 'Duración': duracionTexto_(p.duracion), 'Sector': r.sector,
    'Personas': d.personas, 'Adultos aprox.': d.adultos, 'Nombre': d.nombre, 'WhatsApp': d.whatsapp, 'Email': d.email,
    'Agasajado/a': d.agasajado, 'Edad / motivo': d.motivo, 'Modalidad': p.modalidad ? CONFIG.modalidades[p.modalidad].nombre : '',
    'Detalle del presupuesto': lineasTexto_(p), 'Código': cod ? cod.codigo : (d.codigo ? d.codigo + ' (no válido)' : ''),
    'Total': p.total, 'Seña': p.sena, 'Saldo': p.saldo, 'Decoración': d.decoracion, 'Comida': d.comida,
    'Animación GLORIN': d.glorin ? 'Sí, quiere' : '', 'Cómo nos conoció': d.comoNosConocio, 'Comentarios': d.comentarios,
    'PDF': pdf, 'WhatsApp link': waCliente, 'ID evento calendario': ev.getId(), 'Último aviso': '',
    'Detalle completo (JSON)': JSON.stringify(d)
  });

  try { avisarDueno_('🎉 Nueva reserva', id, d, p, waCliente, pdf); } catch (e) { console.error(e); }
  try { if (d.email) mailCliente_('recibida', d.email, r, d, p, pdf); } catch (e) { console.error(e); }

  return {
    id: id, total: p.total, sena: p.sena, saldo: p.saldo, fin: r.fin, pdf: pdf, avisos: p.avisos,
    linkCalendario: linkGoogleCalendar_(T.nombre + (d.agasajado ? ' de ' + d.agasajado : '') + ' · Aldea de Valle', iniReal, finReal, CONFIG.direccion),
    whatsappComprobante: linkWhatsApp_(CONFIG.whatsapp,
      '¡Hola Aldea! 🌿 Soy ' + d.nombre + '. Acabo de reservar ' + T.nombre.toLowerCase() + ' para el ' + fechaLarga_(d.fecha) +
      ' a las ' + d.hora + ' hs (reserva ' + id + '). Te mando el comprobante de la seña de ' + pesos_(p.sena) + ' 👇'),
    glorin: d.glorin ? linkGlorin_(d) : ''
  };
}

function linkGlorin_(d) {
  if (!CONFIG.urlGlorin) return '';
  return CONFIG.urlGlorin + '?zona=aldea&lugar=aldea&fecha=' + encodeURIComponent(d.fecha) + '&hora=' + encodeURIComponent(d.hora) +
    '&chicos=' + encodeURIComponent(d.personas || '') + '&cumpleanero=' + encodeURIComponent(d.agasajado || '');
}

function fechaHora_(fecha, hora) {
  const p = hora.split(':');
  return new Date(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)), Number(p[0]), Number(p[1]));
}

function escribirFila_(sh, fila) {
  const textoFijo = { 'Fecha evento': 1, 'Hora inicio': 1, 'Hora fin': 1, 'Fecha cita': 1, 'Hora cita': 1, 'Fecha tentativa': 1, 'Fecha': 1 };
  sh.appendRow(encabezados_(sh).map(function (h) {
    const v = fila[h];
    if (v === undefined || v === null) return '';
    if (textoFijo[h] && v) return "'" + v;
    return limpiarCelda_(v);
  }));
}

function limpiarCelda_(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function lineasTexto_(p) {
  return p.lineas.map(function (l) { return l.t + ': ' + pesos_(l.m); }).join('\n');
}

function tituloEvento_(estado, d) {
  const T = tipo_(d.tipo);
  return (PREFIJO_ESTADO[estado] || estado) + ' · ' + T.nombre + (d.agasajado ? ' ' + d.agasajado : '') + ' · ' +
    d.personas + ' p. · ' + nombreSector_(d.sector);
}

function descripcionEvento_(id, d, p) {
  return [
    'ID: ' + id,
    'SECTOR: ' + d.sector,
    'Contacto: ' + d.nombre + ' · WhatsApp: ' + d.whatsapp + (d.email ? ' · ' + d.email : ''),
    'Personas: ' + d.personas + (d.adultos ? ' (+ ' + d.adultos + ' adultos aprox.)' : ''),
    'Modalidad: ' + (p.modalidad ? CONFIG.modalidades[p.modalidad].nombre : '-'),
    lineasTexto_(p),
    'Total: ' + pesos_(p.total) + ' · Seña: ' + pesos_(p.sena) + ' · Saldo: ' + pesos_(p.saldo),
    'Decoración: ' + (d.decoracion || '-') + ' · Comida: ' + (d.comida || '-'),
    d.glorin ? 'Quiere animación de GLORIN' : '',
    'Comentarios: ' + (d.comentarios || '-')
  ].filter(String).join('\n');
}

// ======== CITA PARA CONOCER EL LUGAR ========
function agendarCita(d) {
  limpiar_(d);
  validarContacto_(d);
  const eq = CONFIG.citas.equipos[d.equipo] ? d.equipo : 'aldea';
  const E = CONFIG.citas.equipos[eq];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.citaFecha || '') || CONFIG.citas.horarios.indexOf(d.citaHora) < 0) throw new Error('Elegí el día y la hora de la cita.');
  const dow = new Date(Number(d.citaFecha.slice(0, 4)), Number(d.citaFecha.slice(5, 7)) - 1, Number(d.citaFecha.slice(8, 10))).getDay();
  if (CONFIG.citas.dias.indexOf(dow) < 0) throw new Error('Las citas son de lunes a viernes.');
  const tz = Session.getScriptTimeZone();
  if (d.citaFecha <= Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd')) throw new Error('Elegí un día a partir de mañana.');

  let p = null;
  if (d.tipo && !d.soloCita && Number(d.personas) > 0) { const cod = d.codigo ? buscarCodigo_(d.codigo) : null; p = cotizar(d, precios_(), CONFIG, cod); if (p.error) p = null; }
  const T = d.tipo ? tipo_(d.tipo) : null;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Hay mucha gente agendando en este momento. Probá de nuevo en unos segundos.');
  let id, ev, ini, fin;
  try {
    const ocup = (leerCitasOcupadas_()[d.citaFecha] || { aldea: [], india: [] })[eq];
    if (ocup.indexOf(d.citaHora) >= 0) throw new Error('Ese horario se acaba de ocupar. Elegí otro, por favor.');
    id = 'CI-' + Utilities.formatDate(new Date(), tz, 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    ini = fechaHora_(d.citaFecha, d.citaHora);
    fin = new Date(ini.getTime() + CONFIG.citas.duracionMin * 60000);
    const desc = [
      'ID: ' + id, 'Con: ' + E.nombre + ' (' + E.quien + ')',
      'Contacto: ' + d.nombre + ' · WhatsApp: ' + d.whatsapp + (d.email ? ' · ' + d.email : ''),
      T ? 'Evento: ' + T.nombre + ' · ' + (d.personas || '?') + ' personas · fecha tentativa ' + (d.fecha ? fechaLarga_(d.fecha) : 'a definir') : '',
      d.sector ? 'Sector: ' + nombreSector_(d.sector) : '',
      p ? 'Estimación Aldea: ' + pesos_(p.total) + '\n' + lineasTexto_(p) : '',
      'Qué busca: ' + (d.comentarios || '-')
    ].filter(String).join('\n');
    const opciones = { description: desc, location: CONFIG.direccion };
    const invitados = [d.email, eq === 'india' ? CONFIG.emailIndia : ''].filter(String).join(',');
    if (invitados) { opciones.guests = invitados; opciones.sendInvites = true; }
    ev = calendario_(CONFIG.nombreCalendarioCitas).createEvent(
      '📅 CITA · ' + E.nombre + ' · ' + d.nombre + (T ? ' · ' + T.nombre : ''), ini, fin, opciones);
  } finally {
    lock.releaseLock();
  }

  let pdf = '';
  if (p) { try { pdf = crearPdf_(id, d, p, 'cita'); } catch (e) { console.error(e); } }
  const r = { nombre: d.nombre, fecha: d.citaFecha, hora: d.citaHora, equipo: E };
  const waCliente = linkWhatsApp_(d.whatsapp, mensajeCita_(r));
  escribirFila_(obtenerHoja_(HOJA_CITAS, COLUMNAS_CITAS), {
    'ID': id, 'Recibido': new Date(), 'Estado': 'Agendada', 'Equipo': E.nombre, 'Fecha cita': d.citaFecha, 'Hora cita': d.citaHora,
    'Nombre': d.nombre, 'WhatsApp': d.whatsapp, 'Email': d.email, 'Tipo de evento': T ? T.nombre : '',
    'Fecha tentativa': d.fecha, 'Personas': d.personas, 'Sector': nombreSector_(d.sector),
    'Estimación Aldea': p ? p.total : '', 'Qué busca': d.comentarios, 'PDF': pdf, 'WhatsApp link': waCliente,
    'ID evento calendario': ev.getId(), 'Detalle completo (JSON)': JSON.stringify(d)
  });

  try { avisarCita_(id, d, E, T, p, waCliente, pdf, eq); } catch (e) { console.error(e); }
  try { if (d.email) mailCitaCliente_(d.email, r, id, pdf); } catch (e) { console.error(e); }

  return {
    id: id, equipo: E.nombre, quien: E.quien, pdf: pdf,
    linkCalendario: linkGoogleCalendar_('Cita en Aldea de Valle · ' + E.nombre, ini, fin, CONFIG.direccion),
    whatsapp: linkWhatsApp_(E.whatsapp, '¡Hola ' + E.nombre + '! 🌿 Soy ' + d.nombre + '. Agendé una cita para conocer el lugar el ' +
      fechaLarga_(d.citaFecha) + ' a las ' + d.citaHora + ' hs (cita ' + id + ')' +
      (T ? ', por ' + T.nombre.toLowerCase() + (d.personas ? ' de ' + d.personas + ' personas' : '') : '') + '. ¡Nos vemos!')
  };
}

// ======== PRESUPUESTO EN PDF (sin reservar) ========
function generarPresupuesto(d) {
  limpiar_(d);
  validarContacto_(d);
  const T = tipo_(d.tipo);
  const cod = d.codigo ? buscarCodigo_(d.codigo) : null;
  const p = cotizar(d, precios_(), CONFIG, cod);
  if (p.error) throw new Error(p.error);
  const id = 'PR-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const pdf = crearPdf_(id, d, p, 'presupuesto');
  const wa = linkWhatsApp_(d.whatsapp, '¡Hola ' + String(d.nombre).split(' ')[0] + '! 🌿 Te escribimos de Aldea de Valle por el presupuesto de ' +
    T.nombre.toLowerCase() + '. ¿Te quedó alguna duda? ¿Querés que te guardemos la fecha?');
  escribirFila_(obtenerHoja_(HOJA_CONSULTAS, COLUMNAS_CONSULTAS), {
    'Recibido': new Date(), 'Nombre': d.nombre, 'WhatsApp': d.whatsapp, 'Email': d.email, 'Tipo': T.nombre,
    'Fecha': d.fecha, 'Personas': d.personas, 'Sector': nombreSector_(d.sector), 'Total': p.total, 'PDF': pdf,
    'WhatsApp link': wa, 'Estado': 'Presupuesto descargado'
  });
  try {
    if (d.email) MailApp.sendEmail({ to: d.email, subject: '🌿 Tu presupuesto · ' + T.nombre + ' en Aldea de Valle', name: CONFIG.marca,
      htmlBody: marco_('<p>¡Hola ' + esc_(String(d.nombre).split(' ')[0]) + '! Te dejamos el presupuesto que armaste.</p>' +
        boton_(pdf, '📄 Ver el presupuesto', '#2F4A38') +
        (CONFIG.urlWeb ? boton_(CONFIG.urlWeb, 'Reservar la fecha', '#B4552F') : ''), id),
      body: 'Tu presupuesto: ' + pdf });
  } catch (e) { console.error(e); }
  return { id: id, pdf: pdf, total: p.total };
}

function carpetaPresupuestos_() {
  const it = DriveApp.getFoldersByName('Aldea · Presupuestos');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Aldea · Presupuestos');
}

function crearPdf_(id, d, p, clase) {
  const T = tipo_(d.tipo);
  const tz = Session.getScriptTimeZone();
  const pg = CONFIG.pago;
  const fila = function (a, b, neg) {
    return '<tr><td style="padding:7px 0;border-bottom:1px solid #E4DCCB">' + esc_(a) + '</td>' +
      '<td style="padding:7px 0;border-bottom:1px solid #E4DCCB;text-align:right;white-space:nowrap' + (neg ? ';color:#2E7D4F' : '') + '">' + esc_(b) + '</td></tr>';
  };
  const dato = function (a, b) { return b ? '<div style="margin:2px 0"><span style="color:#5C6E5C">' + a + ':</span> <b>' + esc_(b) + '</b></div>' : ''; };
  const titulo = clase === 'reserva' ? 'Reserva ' + id : 'Presupuesto ' + id;
  const html = '<html><body style="font-family:Arial,sans-serif;color:#2F4A38;font-size:13px;margin:0">' +
    '<div style="background:#2F4A38;color:#F4EFE3;padding:22px 28px">' +
    '<div style="font-size:26px;font-family:Georgia,serif">Aldea de Valle</div>' +
    '<div style="color:#F2CA11;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-top:4px">Eventos · Valle Escondido, Córdoba</div></div>' +
    '<div style="padding:22px 28px">' +
    '<div style="font-size:18px;font-weight:bold;margin-bottom:4px">' + esc_(titulo) + '</div>' +
    '<div style="color:#5C6E5C;margin-bottom:14px">Emitido el ' + Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy') +
    (clase !== 'reserva' ? ' · válido por ' + CONFIG.validezPresupuestoDias + ' días' : '') + '</div>' +
    dato('Para', d.nombre) + dato('Evento', T.nombre + (d.agasajado ? ' · ' + d.agasajado : '')) +
    dato('Fecha', d.fecha ? fechaLarga_(d.fecha) + (d.hora ? ' · ' + d.hora + ' hs · ' + duracionTexto_(p.duracion) : '') : 'A definir') +
    dato('Lugar', nombreSector_(d.sector)) + dato(T.unidad === 'chicos' ? 'Chicos' : (T.unidad === 'alumnos' ? 'Alumnos' : 'Personas'), String(d.personas || '')) +
    dato('Modalidad', p.modalidad ? CONFIG.modalidades[p.modalidad].nombre : '') +
    '<table style="width:100%;border-collapse:collapse;margin-top:16px">' +
    p.lineas.map(function (l) { return fila(l.t + (l.d ? ' (' + l.d + ')' : ''), pesos_(l.m), l.m < 0); }).join('') +
    '<tr><td style="padding:12px 0;font-size:17px;font-weight:bold">' + (p.desde ? 'Total estimado (desde)' : 'Total') + '</td>' +
    '<td style="padding:12px 0;font-size:17px;font-weight:bold;text-align:right">' + pesos_(p.total) + '</td></tr></table>' +
    (p.incluye.length ? '<div style="margin-top:6px"><b>Incluye:</b> ' + esc_(p.incluye.join(' · ')) + '</div>' : '') +
    (p.sena ? '<div style="background:#F4EFE3;border-left:4px solid #F2CA11;padding:12px 14px;margin-top:16px">' +
      '<b>Seña para reservar (' + CONFIG.porcentajeSena + '%): ' + pesos_(p.sena) + '</b> · Saldo: ' + pesos_(p.saldo) + '<br>' +
      'Alias: <b>' + esc_(pg.alias) + '</b>' + (pg.titular ? ' · Titular: ' + esc_(pg.titular) : '') + (pg.banco ? ' · ' + esc_(pg.banco) : '') + '</div>' : '') +
    (p.desde ? '<div style="background:#F4EFE3;border-left:4px solid #B4552F;padding:12px 14px;margin-top:16px">' +
      'Esta es la parte de Aldea (espacio, seguridad, limpieza y bebida). ' +
      (T.modo === 'india' ? 'Catering, DJ y ambientación los cotiza ' + esc_(CONFIG.india.nombre) + ' (WhatsApp ' + telVisible_(CONFIG.india.whatsapp) + ').' : 'Lo terminamos de armar juntos en la cita.') +
      '</div>' : '') +
    '<div style="margin-top:18px;color:#5C6E5C;font-size:11px;line-height:1.5">' + condiciones_(T).map(esc_).join('<br>') + '</div>' +
    '<div style="margin-top:18px;font-size:12px">Consultas: WhatsApp ' + telVisible_(CONFIG.whatsapp) + ' · ' + esc_(CONFIG.direccion) + '</div>' +
    '</div></body></html>';
  const blob = Utilities.newBlob(html, 'text/html', id + '.html').getAs('application/pdf').setName(id + ' · ' + T.nombre + ' · ' + d.nombre + '.pdf');
  const file = carpetaPresupuestos_().createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { console.error(e); }
  return file.getUrl();
}

function condiciones_(T) {
  const c = [
    '· La fecha queda reservada al recibir la seña del ' + CONFIG.porcentajeSena + '%. Sin seña, la reserva se libera a las ' + CONFIG.horasParaSenar + ' hs.',
    '· El saldo se abona el día del evento.',
    '· Podés reprogramar el evento sin cargo, siempre que la nueva fecha esté disponible.',
    '· Los eventos terminan como máximo a las ' + CONFIG.finMaximo + ' hs. Si se extiende el horario, se cobra el tiempo extra proporcional.',
    '· Las bebidas son de la barra y la cantina de Aldea.'
  ];
  if (T && T.decorar) c.push('· ' + T.decorar);
  return c;
}

// ======== WHATSAPP ========
function normalizarWhatsApp_(tel) {
  let n = String(tel || '').replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.indexOf('54') === 0) n = n.slice(2);
  if (n.indexOf('9') === 0 && n.length === 11) n = n.slice(1);
  if (n.indexOf('0') === 0) n = n.slice(1);
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

function telVisible_(n) {
  const s = String(n).replace(/^549/, '');
  return s.slice(0, 3) + ' ' + s.slice(3, 6) + '-' + s.slice(6);
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

function mensajeCliente_(tipo, r) {
  const nombre = String(r.nombre || '').split(' ')[0];
  const cuando = fechaLarga_(r.fecha) + ' a las ' + r.hora + ' hs';
  const que = String(r.tipo || 'tu evento').toLowerCase() + (r.agasajado ? ' de ' + r.agasajado : '');
  const pago = datosPagoTexto_();
  if (tipo === 'recibida') {
    return '¡Hola ' + nombre + '! 🌿 Te escribimos de Aldea de Valle. Recibimos la reserva del ' + que + ' para el ' + cuando +
      ' (reserva ' + r.id + ').\n\nPara confirmar la fecha necesitamos la seña de ' + pesos_(r.sena) + '.' + (pago ? '\n' + pago : '') +
      '\n\nCualquier duda, ¡escribinos!';
  }
  if (tipo === 'sena') {
    return '¡Hola ' + nombre + '! 😊 Te recordamos que la reserva del ' + que + ' (' + cuando + ') sigue pendiente de seña (' +
      pesos_(r.sena) + '). ¿La querés mantener?' + (pago ? '\n' + pago : '');
  }
  if (tipo === 'confirmada') {
    return '¡Hola ' + nombre + '! ✅ Recibimos la seña: el ' + que + ' quedó CONFIRMADO para el ' + cuando + '. ¡Los esperamos en la Aldea! 🌿';
  }
  if (tipo === 'recordatorio') {
    return '¡Hola ' + nombre + '! 🌿 Mañana es el ' + que + ' (' + cuando + ') en ' + (r.sector || 'Aldea') + '. ' +
      (r.saldo ? 'Recordá que el saldo es de ' + pesos_(r.saldo) + '. ' : '') + '¡Los esperamos!';
  }
  if (tipo === 'gracias') {
    return '¡Hola ' + nombre + '! 💛 Gracias por elegir Aldea de Valle para el ' + que + '. Si les gustó, nos ayuda muchísimo una reseña o que nos recomienden. ¡Hasta la próxima!';
  }
  return '';
}

function mensajeCita_(r) {
  return '¡Hola ' + String(r.nombre || '').split(' ')[0] + '! 🌿 Te escribimos de ' + r.equipo.nombre + '. Te confirmamos la cita para conocer Aldea de Valle el ' +
    fechaLarga_(r.fecha) + ' a las ' + r.hora + ' hs. Te recibe ' + r.equipo.quien + '. ¡Te esperamos!';
}

// ======== MAILS ========
function marco_(cuerpo, pie) {
  return '<div style="font-family:Arial,sans-serif;font-size:15px;color:#2F4A38;max-width:560px">' +
    '<div style="background:#2F4A38;color:#F4EFE3;padding:16px 20px;border-radius:12px 12px 0 0;font-family:Georgia,serif;font-size:22px">Aldea de Valle</div>' +
    '<div style="background:#F4EFE3;padding:18px 20px;border-radius:0 0 12px 12px">' + cuerpo +
    (pie ? '<p style="color:#5C6E5C;font-size:12px;margin-top:20px">' + esc_(pie) + '</p>' : '') + '</div></div>';
}

function boton_(url, texto, color) {
  return '<p><a href="' + esc_(url) + '" style="display:inline-block;background:' + color + ';color:#fff;text-decoration:none;' +
    'padding:12px 18px;border-radius:10px;font-weight:bold">' + esc_(texto) + '</a></p>';
}

function tablaLineas_(p) {
  return '<table style="border-collapse:collapse;width:100%;margin:10px 0">' + p.lineas.map(function (l) {
    return '<tr><td style="padding:5px 0;border-bottom:1px dashed #DCD5C3">' + esc_(l.t) + '</td><td style="padding:5px 0;text-align:right;border-bottom:1px dashed #DCD5C3"><b>' + pesos_(l.m) + '</b></td></tr>';
  }).join('') + '<tr><td style="padding:8px 0;font-size:17px"><b>Total</b></td><td style="padding:8px 0;text-align:right;font-size:17px"><b>' + pesos_(p.total) + '</b></td></tr></table>';
}

function avisarDueno_(asunto, id, d, p, waCliente, pdf) {
  const mail = CONFIG.emailAviso || Session.getEffectiveUser().getEmail();
  if (!mail) return;
  const T = tipo_(d.tipo);
  const html = marco_(
    '<h2 style="margin:0 0 8px">' + esc_(asunto) + ' · ' + esc_(id) + '</h2>' +
    '<p><b>' + esc_(fechaLarga_(d.fecha)) + ' · ' + esc_(d.hora) + ' hs</b> (' + duracionTexto_(p.duracion) + ')<br>' +
    esc_(T.nombre) + (d.agasajado ? ' de <b>' + esc_(d.agasajado) + '</b>' : '') + ' · ' + esc_(d.personas) + ' personas · ' + esc_(nombreSector_(d.sector)) + '</p>' +
    tablaLineas_(p) + '<p>Seña: <b>' + pesos_(p.sena) + '</b></p>' +
    boton_(waCliente, '💬 Escribirle a ' + String(d.nombre).split(' ')[0] + ' por WhatsApp', '#25D366') +
    (pdf ? boton_(pdf, '📄 Ver el PDF', '#2F4A38') : '') +
    (d.glorin ? '<p>🎈 Quiere animación de GLORIN.</p>' : '') +
    '<pre style="font-family:inherit;white-space:pre-wrap;background:#fff;padding:12px;border-radius:8px">' + esc_(descripcionEvento_(id, d, p)) + '</pre>' +
    '<p style="color:#5C6E5C">Cuando llegue la seña, cambiá el Estado a <b>Señado</b> en la planilla: se confirma solo y le avisamos.</p>');
  MailApp.sendEmail({ to: mail, subject: asunto + ' · ' + d.fecha + ' ' + d.hora + ' · ' + T.nombre + ' · ' + d.nombre,
                      body: descripcionEvento_(id, d, p) + '\n\nWhatsApp: ' + waCliente, htmlBody: html, name: CONFIG.marca });
}

function mailCliente_(tipo, email, r, d, p, pdf) {
  const nombre = String(r.nombre || '').split(' ')[0];
  const pago = datosPagoTexto_();
  const que = r.tipo + (r.agasajado ? ' de ' + r.agasajado : '');
  let asunto, cuerpo;
  const resumen = '<p><b>' + esc_(fechaLarga_(r.fecha)) + '</b> · ' + esc_(r.hora) + ' a ' + esc_(r.fin) + ' hs<br>' + esc_(r.sector) + '</p>';
  if (tipo === 'recibida') {
    asunto = '🌿 Recibimos tu reserva · ' + que;
    cuerpo = '<p>¡Hola ' + esc_(nombre) + '! Recibimos la reserva del <b>' + esc_(que) + '</b>. ' +
      'Te guardamos la fecha por ' + CONFIG.horasParaSenar + ' hs: para confirmarla necesitamos la seña.</p>' + resumen + tablaLineas_(p) +
      '<h3>Seña: ' + pesos_(r.sena) + '</h3>' +
      (pago ? '<pre style="font-family:inherit;background:#fff;padding:12px;border-radius:8px">' + esc_(pago) + '</pre>' : '') +
      boton_(linkWhatsApp_(CONFIG.whatsapp, '¡Hola Aldea! 🌿 Te mando el comprobante de la seña de la reserva ' + r.id + '.'), '💬 Mandar el comprobante por WhatsApp', '#25D366') +
      (pdf ? boton_(pdf, '📄 Ver el presupuesto en PDF', '#2F4A38') : '');
  } else {
    asunto = '✅ ¡Confirmado! · ' + que + ' en Aldea de Valle';
    cuerpo = '<p>¡Hola ' + esc_(nombre) + '! Recibimos la seña y el <b>' + esc_(que) + '</b> quedó <b>confirmado</b>. 🎉</p>' + resumen +
      '<p>Saldo para el día del evento: <b>' + pesos_(r.saldo) + '</b></p>' +
      boton_(linkWhatsApp_(CONFIG.whatsapp, '¡Hola Aldea! Te escribo por la reserva ' + r.id + '.'), '💬 Escribinos por WhatsApp', '#25D366');
  }
  MailApp.sendEmail({ to: email, subject: asunto, htmlBody: marco_(cuerpo, 'Reserva ' + r.id + ' · ' + CONFIG.direccion), name: CONFIG.marca,
                      replyTo: CONFIG.emailAviso || undefined, body: asunto + '\n\nReserva ' + r.id + '\n' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs\n' + (pago || '') });
}

function avisarCita_(id, d, E, T, p, waCliente, pdf, eq) {
  const para = [CONFIG.emailAviso || Session.getEffectiveUser().getEmail(), eq === 'india' ? CONFIG.emailIndia : ''].filter(String).join(',');
  if (!para) return;
  const html = marco_(
    '<h2 style="margin:0 0 8px">📅 Nueva cita · ' + esc_(E.nombre) + '</h2>' +
    '<p><b>' + esc_(fechaLarga_(d.citaFecha)) + ' · ' + esc_(d.citaHora) + ' hs</b> · la atiende ' + esc_(E.quien) + '</p>' +
    '<p>' + esc_(d.nombre) + ' · ' + esc_(d.whatsapp) + (d.email ? ' · ' + esc_(d.email) : '') + '<br>' +
    (T ? esc_(T.nombre) + ' · ' + esc_(d.personas || '?') + ' personas · fecha tentativa ' + esc_(d.fecha ? fechaLarga_(d.fecha) : 'a definir') : '') + '</p>' +
    (d.comentarios ? '<p><i>' + esc_(d.comentarios) + '</i></p>' : '') +
    (p ? '<p>Estimación de la parte de Aldea:</p>' + tablaLineas_(p) : '') +
    boton_(waCliente, '💬 Confirmarle la cita por WhatsApp', '#25D366') + (pdf ? boton_(pdf, '📄 Ver el PDF', '#2F4A38') : ''), id);
  MailApp.sendEmail({ to: para, subject: '📅 Cita ' + d.citaFecha + ' ' + d.citaHora + ' · ' + E.nombre + ' · ' + d.nombre,
                      htmlBody: html, name: CONFIG.marca, body: 'Cita ' + id + ' · ' + d.nombre + ' · ' + d.whatsapp });
}

function mailCitaCliente_(email, r, id, pdf) {
  const html = marco_('<p>¡Hola ' + esc_(String(r.nombre).split(' ')[0]) + '! Te esperamos para conocer Aldea de Valle.</p>' +
    '<p><b>' + esc_(fechaLarga_(r.fecha)) + ' · ' + esc_(r.hora) + ' hs</b><br>Te recibe ' + esc_(r.equipo.quien) + ' (' + esc_(r.equipo.nombre) + ')<br>' +
    esc_(CONFIG.direccion) + '</p>' +
    boton_(linkWhatsApp_(r.equipo.whatsapp, '¡Hola! Te escribo por la cita ' + id + '.'), '💬 Escribinos por WhatsApp', '#25D366') +
    (pdf ? boton_(pdf, '📄 Ver la estimación', '#2F4A38') : ''), 'Cita ' + id);
  MailApp.sendEmail({ to: email, subject: '📅 Tu cita en Aldea de Valle · ' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs',
                      htmlBody: html, name: CONFIG.marca, body: 'Cita ' + id + ': ' + fechaLarga_(r.fecha) + ' ' + r.hora + ' hs' });
}

// ======== PLANILLA: menú y cambios de estado ========
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🏡 Aldea Eventos')
    .addItem('💬 WhatsApp al cliente (fila seleccionada)', 'menuWhatsApp')
    .addItem('✅ Marcar como Señado', 'menuSenado')
    .addItem('📆 Reprogramar (fila seleccionada)', 'menuReprogramar')
    .addItem('❌ Cancelar reserva', 'menuCancelar')
    .addSeparator()
    .addItem('📋 Mandarme el resumen ahora', 'resumenDiario')
    .addItem('⚙️ Configuración inicial', 'configurarInicial')
    .addToUi();
}

function menuSenado() { cambiarEstadoFilaActiva_('Señado'); }
function menuCancelar() { cambiarEstadoFilaActiva_('Cancelado'); }

function filaActiva_() {
  const sh = SpreadsheetApp.getActiveSheet();
  const filaN = sh.getActiveRange().getRow();
  if (sh.getName() !== HOJA || filaN < 2) throw new Error('Seleccioná una reserva en la pestaña ' + HOJA + '.');
  return { sh: sh, filaN: filaN };
}

function cambiarEstadoFilaActiva_(estado) {
  const a = filaActiva_();
  a.sh.getRange(a.filaN, columna_(a.sh, 'Estado')).setValue(estado);
  aplicarEstado_(a.sh, a.filaN, estado);
  SpreadsheetApp.getActive().toast('Reserva marcada como ' + estado, 'Aldea');
}

function menuWhatsApp() {
  const a = filaActiva_();
  const r = leerFila_(a.sh, a.filaN);
  const botones = ['recibida', 'sena', 'confirmada', 'recordatorio', 'gracias'].map(function (t) {
    const etiqueta = { recibida: 'Reserva recibida + datos de pago', sena: 'Reclamar seña', confirmada: 'Confirmar fecha',
                       recordatorio: 'Recordatorio (día antes)', gracias: 'Gracias + pedir reseña' }[t];
    return '<a target="_blank" href="' + esc_(linkWhatsApp_(r.whatsapp, mensajeCliente_(t, r))) + '" ' +
      'style="display:block;margin:6px 0;padding:10px 12px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-family:Arial">' +
      '💬 ' + etiqueta + '</a>';
  }).join('');
  const html = HtmlService.createHtmlOutput('<div style="font-family:Arial;font-size:14px">' +
    '<p><b>' + esc_(r.nombre) + '</b> · ' + esc_(r.whatsapp) + '<br>' + esc_(r.tipo) + ' · ' + esc_(fechaLarga_(r.fecha)) + '</p>' +
    botones + '</div>').setWidth(360).setHeight(380);
  SpreadsheetApp.getUi().showModalDialog(html, 'WhatsApp');
}

function menuReprogramar() {
  const a = filaActiva_();
  const r = leerFila_(a.sh, a.filaN);
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Reprogramar ' + r.id, 'Nueva fecha y hora (AAAA-MM-DD HH:MM), por ejemplo 2026-12-05 16:30', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/.exec(resp.getResponseText().trim());
  if (!m) throw new Error('Escribilo así: 2026-12-05 16:30');
  const fecha = m[1], hora = ('0' + m[2]).slice(-5);
  const d = r.json ? JSON.parse(r.json) : null;
  if (!d) throw new Error('Esta reserva no tiene el detalle guardado. Movela a mano en el calendario.');
  const ev = r.eventoId ? calendario_(CONFIG.nombreCalendario).getEventById(r.eventoId) : null;
  const durMin = ev ? Math.round((ev.getEndTime() - ev.getStartTime()) / 60000) : 240;
  const dia = leerOcupados_()[fecha];
  // Sacamos el propio evento antes de chequear
  if (dia && ev) {
    const tz = Session.getScriptTimeZone();
    const iniPropio = Number(Utilities.formatDate(ev.getStartTime(), tz, 'H')) * 60 + Number(Utilities.formatDate(ev.getStartTime(), tz, 'm'));
    if (Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd') === fecha) dia.ev = dia.ev.filter(function (e) { return e[0] !== iniPropio; });
  }
  if (!sectorLibre_(fecha, dia, d.sector, hora, durMin)) throw new Error('Ese sector no está libre en ese horario.');
  const ini = fechaHora_(fecha, hora);
  if (ev) ev.setTime(ini, new Date(ini.getTime() + durMin * 60000));
  d.fecha = fecha; d.hora = hora;
  a.sh.getRange(a.filaN, columna_(a.sh, 'Fecha evento')).setValue("'" + fecha);
  a.sh.getRange(a.filaN, columna_(a.sh, 'Hora inicio')).setValue("'" + hora);
  a.sh.getRange(a.filaN, columna_(a.sh, 'Hora fin')).setValue("'" + Utilities.formatDate(new Date(ini.getTime() + durMin * 60000), Session.getScriptTimeZone(), 'HH:mm'));
  a.sh.getRange(a.filaN, columna_(a.sh, 'Detalle completo (JSON)')).setValue(JSON.stringify(d));
  a.sh.getRange(a.filaN, columna_(a.sh, 'Último aviso')).setValue('Reprogramado · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
  SpreadsheetApp.getActive().toast('Reprogramado para el ' + fechaLarga_(fecha) + ' ' + hora + ' hs', 'Aldea');
}

function alEditarPlanilla(e) {
  if (!e || !e.range) return;
  const sh = e.range.getSheet();
  if (sh.getName() === HOJA_CITAS && e.range.getRow() >= 2) return cambioCita_(sh, e.range);
  if (sh.getName() !== HOJA || e.range.getRow() < 2) return;
  const colEstado = columna_(sh, 'Estado');
  if (e.range.getColumn() > colEstado || e.range.getLastColumn() < colEstado) return;
  for (let f = e.range.getRow(); f <= e.range.getLastRow(); f++) {
    aplicarEstado_(sh, f, String(sh.getRange(f, colEstado).getValue()));
  }
}

function cambioCita_(sh, rango) {
  const colEstado = columna_(sh, 'Estado');
  if (rango.getColumn() > colEstado || rango.getLastColumn() < colEstado) return;
  const colId = columna_(sh, 'ID evento calendario');
  for (let f = rango.getRow(); f <= rango.getLastRow(); f++) {
    const estado = String(sh.getRange(f, colEstado).getValue());
    const ev = calendario_(CONFIG.nombreCalendarioCitas).getEventById(String(sh.getRange(f, colId).getValue()));
    if (ev) ev.setTitle((PREFIJO_ESTADO[estado] || estado) + ' · ' + ev.getTitle().replace(/^[^·]*·\s*/, ''));
  }
}

function aplicarEstado_(sh, filaN, estado) {
  const r = leerFila_(sh, filaN);
  if (!r.eventoId) return;
  const ev = calendario_(CONFIG.nombreCalendario).getEventById(r.eventoId);
  if (ev) {
    ev.setTitle((PREFIJO_ESTADO[estado] || estado) + ' · ' + ev.getTitle().replace(/^[^·]*·\s*/, ''));
    if (COLOR_ESTADO[estado]) { try { ev.setColor(COLOR_ESTADO[estado]); } catch (err) {} }
  }
  if (estado === 'Señado' && r.email) {
    try { mailCliente_('confirmada', r.email, r, null, null, ''); } catch (err) { console.error(err); }
  }
  sh.getRange(filaN, columna_(sh, 'Último aviso')).setValue(estado + ' · ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM HH:mm'));
}

function leerFila_(sh, filaN) {
  const h = encabezados_(sh);
  const v = sh.getRange(filaN, 1, 1, h.length).getValues()[0];
  const g = function (n) { const i = h.indexOf(n); return i < 0 ? '' : v[i]; };
  const tz = Session.getScriptTimeZone();
  const txt = function (x, fmt) { return x instanceof Date ? Utilities.formatDate(x, tz, fmt) : String(x || ''); };
  return {
    id: g('ID'), estado: g('Estado'), tipo: g('Tipo'), fecha: txt(g('Fecha evento'), 'yyyy-MM-dd'), hora: txt(g('Hora inicio'), 'HH:mm'),
    fin: txt(g('Hora fin'), 'HH:mm'), nombre: g('Nombre'), whatsapp: g('WhatsApp'), email: g('Email'), agasajado: g('Agasajado/a'),
    sector: g('Sector'), recibido: g('Recibido'), total: Number(g('Total')) || 0, sena: Number(g('Seña')) || 0,
    saldo: Number(g('Saldo')) || 0, eventoId: g('ID evento calendario'), json: g('Detalle completo (JSON)')
  };
}

// ======== RESUMEN DIARIO ========
function resumenDiario() {
  const tz = Session.getScriptTimeZone();
  const manana = Utilities.formatDate(new Date(Date.now() + 86400000), tz, 'yyyy-MM-dd');
  const limite = new Date(Date.now() - CONFIG.horasParaSenar * 3600000);
  const sh = obtenerHoja_(HOJA, COLUMNAS);
  const deManana = [], sinSena = [];
  for (let f = 2; f <= sh.getLastRow(); f++) {
    const r = leerFila_(sh, f);
    if (!r.id) continue;
    if (r.fecha === manana && (r.estado === 'Señado' || r.estado === 'A confirmar')) deManana.push(r);
    if (r.estado === 'A confirmar' && r.sena > 0 && r.recibido instanceof Date && r.recibido < limite) sinSena.push(r);
  }
  const citas = [];
  const shc = obtenerHoja_(HOJA_CITAS, COLUMNAS_CITAS);
  if (shc.getLastRow() > 1) {
    const h = encabezados_(shc);
    shc.getRange(2, 1, shc.getLastRow() - 1, h.length).getValues().forEach(function (v) {
      const g = function (n) { return v[h.indexOf(n)]; };
      const f = g('Fecha cita') instanceof Date ? Utilities.formatDate(g('Fecha cita'), tz, 'yyyy-MM-dd') : String(g('Fecha cita'));
      if (f === manana && g('Estado') === 'Agendada') citas.push({ nombre: g('Nombre'), hora: String(g('Hora cita')), equipo: g('Equipo'), wa: g('WhatsApp link'), tipo: g('Tipo de evento') });
    });
  }
  if (!deManana.length && !sinSena.length && !citas.length) return;
  const item = function (r, tipo, nota) {
    return '<li style="margin:8px 0"><b>' + esc_(r.tipo) + (r.agasajado ? ' · ' + esc_(r.agasajado) : '') + '</b> · ' + esc_(fechaLarga_(r.fecha)) + ' ' +
      esc_(r.hora) + ' hs · ' + esc_(r.sector) + ' · ' + esc_(r.nombre) + (nota ? ' · ' + nota : '') +
      '<br><a href="' + esc_(linkWhatsApp_(r.whatsapp, mensajeCliente_(tipo, r))) + '" style="color:#128C7E;font-weight:bold">💬 Mandar WhatsApp</a></li>';
  };
  let html = '';
  if (deManana.length) html += '<h3>🌿 Eventos de mañana (' + deManana.length + ')</h3><ul>' +
    deManana.map(function (r) { return item(r, 'recordatorio', r.estado === 'A confirmar' ? '<b style="color:#B4552F">¡SIN SEÑA!</b>' : ''); }).join('') + '</ul>';
  if (citas.length) html += '<h3>📅 Citas de mañana (' + citas.length + ')</h3><ul>' + citas.map(function (c) {
    return '<li style="margin:8px 0"><b>' + esc_(c.hora) + ' hs</b> · ' + esc_(c.nombre) + ' · ' + esc_(c.tipo) + ' · ' + esc_(c.equipo) +
      (c.wa ? '<br><a href="' + esc_(c.wa) + '" style="color:#128C7E;font-weight:bold">💬 Recordarle la cita</a>' : '') + '</li>';
  }).join('') + '</ul>';
  if (sinSena.length) html += '<h3>⏳ Sin seña hace más de ' + CONFIG.horasParaSenar + ' hs (' + sinSena.length + ')</h3>' +
    '<p style="color:#5C6E5C">Si no responden, cambiá el Estado a Cancelado para liberar el sector.</p><ul>' +
    sinSena.map(function (r) { return item(r, 'sena', ''); }).join('') + '</ul>';
  MailApp.sendEmail({ to: CONFIG.emailAviso || Session.getEffectiveUser().getEmail(),
    subject: '📋 Aldea · ' + deManana.length + ' evento(s) mañana · ' + citas.length + ' cita(s) · ' + sinSena.length + ' sin seña',
    htmlBody: marco_(html), name: CONFIG.marca });
}

// ======== UTILIDADES ========
function pesos_(n) { const x = Math.round(Number(n) || 0); return (x < 0 ? '-$' : '$') + Math.abs(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }

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
