/**
 * ALDEA DEL VALLE — Reserva de cancha online
 * ------------------------------------------------------------
 * Página pública donde cualquiera elige cancha, día y horario libre,
 * deja sus datos y reserva. Escribe directo en la pestaña "Cancha"
 * del mismo Sheet que usa la app interna (Centro de Gestión), así que
 * el personal ve estas reservas mezcladas con las que cargan a mano,
 * sin duplicar nada.
 *
 * Cada reserva:
 *   1) se guarda en la pestaña "Cancha" con estado "🔵 Reservado",
 *      la seña en la columna "transferencia", y el resto del precio
 *      pendiente (queda anotado en observaciones).
 *   2) te llega un mail de aviso con un botón para escribirle por
 *      WhatsApp a la persona.
 *   3) en pantalla le aparece a la persona un botón para mandarte el
 *      comprobante de la seña por WhatsApp.
 *
 * Para liberar el horario de vuelta (si cancelan y no pagan la seña a
 * tiempo, por ejemplo): borrá esa fila de la pestaña "Cancha", o
 * cambiale el estado a "❌ Cancelado" (ese estado no cuenta como
 * ocupado para la página).
 *
 * INSTALACIÓN: ver LEEME.md en esta misma carpeta.
 * ------------------------------------------------------------
 */

const CONFIG = {
  marca: 'Aldea del Valle',
  sheetId: '14ryo80HIfT2MIi1X4fugC6Me5FH-FaiyCt9kywbREIs', // mismo Sheet que usa la app interna
  whatsapp: '5493516197928',      // a dónde llegan los avisos y el comprobante
  emailAviso: '',                 // vacío = llega al mail de la cuenta dueña del script
  precioHora: 75000,
  sena: 10000,
  canchas: ['Media Cancha 11', 'Sintético 7', 'Fútbol 11'],
  horaInicio: 9,                  // 9hs
  horaFin: 23,                    // último turno empieza a las 22hs (22 a 23)
  diasHaciaAdelante: 14,
  diasAnticipacionHoras: 2,       // no se puede reservar el turno que empieza en menos de 2hs
};

function abrirSheet_() { return SpreadsheetApp.openById(CONFIG.sheetId); }

function doGet(e) {
  const accion = (e.parameter && e.parameter.accion) || 'disponibilidad';
  try {
    if (accion === 'disponibilidad') {
      const fecha = e.parameter.fecha;
      if (!fecha) throw new Error('Falta la fecha');
      return responder_({ ok: true, ocupados: ocupadosDelDia_(fecha) });
    }
    return responder_({ ok: true, config: configPublica_() });
  } catch (err) {
    return responder_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    validarReserva_(d);

    const ocupados = ocupadosDelDia_(d.fecha);
    const key = d.cancha + '|' + d.hora;
    if (ocupados[key]) throw new Error('Ese turno se acaba de ocupar. Elegí otro horario.');

    const ss = abrirSheet_();
    const sheet = ss.getSheetByName('Cancha');
    const horario = horaATexto_(d.hora) + ' a ' + horaATexto_(d.hora + 1);
    const resto = CONFIG.precioHora - CONFIG.sena;
    const obsPartes = [
      'Reserva online — seña $' + fmtMiles_(CONFIG.sena) + ', resta $' + fmtMiles_(resto) + ' en el lugar',
      d.mesa ? 'Va a necesitar mesa/consumo en Cantina' : null,
      d.tel ? ('Tel: ' + d.tel) : null,
    ].filter(Boolean).join(' | ');

    sheet.appendRow([
      new Date(),                         // timestamp
      new Date(d.fecha + 'T12:00:00'),    // fecha
      horario,                            // horario
      d.nombre,                           // nombre
      d.cancha,                           // extra
      0,                                  // efectivo
      CONFIG.sena,                        // transferencia (seña)
      '🔵 Reservado',                      // estado
      'Reserva Online',                   // responsable
      obsPartes,                          // obs
      new Date().toISOString(),           // creado
    ]);

    const waAviso = linkWhatsApp_(CONFIG.whatsapp,
      '¡Hola! Reserva nueva por la web: ' + d.cancha + ', ' + fechaLarga_(d.fecha) + ' ' + horario +
      '. ' + d.nombre + (d.tel ? ' · ' + d.tel : '') + (d.mesa ? ' · Pidió mesa en Cantina' : ''));
    avisarDueno_(d, horario, waAviso);

    const waComprobante = linkWhatsApp_(CONFIG.whatsapp,
      'Hola! Te mando el comprobante de la seña de mi reserva: ' + d.cancha + ' el ' + fechaLarga_(d.fecha) + ' ' + horario + '.');

    return responder_({
      ok: true,
      horario: horario,
      sena: CONFIG.sena,
      resto: resto,
      pago: { alias: 'faustorizzi', banco: 'Brubank', titular: 'Fausto Rizzi' },
      whatsappComprobante: waComprobante,
    });
  } catch (err) {
    return responder_({ ok: false, error: err.message });
  } finally {
    lock.releaseLock();
  }
}

function configPublica_() {
  return {
    marca: CONFIG.marca, canchas: CONFIG.canchas, precioHora: CONFIG.precioHora, sena: CONFIG.sena,
    horaInicio: CONFIG.horaInicio, horaFin: CONFIG.horaFin, diasHaciaAdelante: CONFIG.diasHaciaAdelante,
  };
}

function validarReserva_(d) {
  const faltan = [];
  if (!d.nombre || !String(d.nombre).trim()) faltan.push('nombre');
  if (!d.tel || String(d.tel).replace(/\D/g, '').length < 8) faltan.push('WhatsApp');
  if (!d.fecha) faltan.push('fecha');
  if (!d.cancha || CONFIG.canchas.indexOf(d.cancha) === -1) faltan.push('cancha');
  if (d.hora === undefined || d.hora === null || isNaN(d.hora)) faltan.push('horario');
  if (faltan.length) throw new Error('Completá: ' + faltan.join(', '));

  const inicioTurno = new Date(d.fecha + 'T00:00:00');
  inicioTurno.setHours(Number(d.hora), 0, 0, 0);
  const limite = new Date(Date.now() + CONFIG.diasAnticipacionHoras * 60 * 60 * 1000);
  if (inicioTurno < limite) throw new Error('Para ese horario ya es muy justo de tiempo — escribinos por WhatsApp.');
  const maximo = new Date(Date.now() + CONFIG.diasHaciaAdelante * 24 * 60 * 60 * 1000);
  if (inicioTurno > maximo) throw new Error('Esa fecha todavía no está abierta para reservar.');
}

/**
 * Devuelve un mapa { "Cancha|hora": true } con los turnos ya ocupados
 * ese día, mirando la pestaña "Cancha" (reservas, sean de la web o
 * cargadas a mano) y "TurnoFijo" (turnos fijos semanales).
 */
function ocupadosDelDia_(fechaStr) {
  const ss = abrirSheet_();
  const ocupados = {};
  const fechaObjetivo = fechaStr; // 'yyyy-MM-dd'

  const cancha = ss.getSheetByName('Cancha');
  if (cancha) {
    const valores = cancha.getDataRange().getValues();
    const tz = Session.getScriptTimeZone();
    for (let i = 1; i < valores.length; i++) {
      const fila = valores[i];
      const fecha = fila[1], horarioTxt = fila[2], extra = fila[4], estado = fila[7];
      if (!(fecha instanceof Date)) continue;
      if (Utilities.formatDate(fecha, tz, 'yyyy-MM-dd') !== fechaObjetivo) continue;
      if (String(estado || '').indexOf('Cancelado') !== -1) continue;
      const horas = horasDesdeTexto_(horarioTxt);
      horas.forEach(h => { ocupados[extra + '|' + h] = true; });
    }
  }

  const turnoFijo = ss.getSheetByName('TurnoFijo');
  if (turnoFijo) {
    const diaIdx = new Date(fechaObjetivo + 'T12:00:00').getDay(); // 0=domingo
    const valores = turnoFijo.getDataRange().getValues();
    for (let i = 1; i < valores.length; i++) {
      const fila = valores[i];
      if (Number(fila[1]) !== diaIdx) continue;
      const horas = horasDesdeTexto_(String(fila[2]));
      const canchaFija = fila[5];
      horas.forEach(h => { ocupados[canchaFija + '|' + h] = true; });
    }
  }

  return ocupados;
}

/** Extrae horas enteras ocupadas de textos como "20hs a 21hs", "19:00 a 20:00", "9:00". */
function horasDesdeTexto_(txt) {
  txt = String(txt || '');
  const match = txt.match(/(\d{1,2})(?::\d{2})?\s*h?s?\s*a\s*(\d{1,2})(?::\d{2})?\s*h?s?/i);
  if (match) {
    const ini = parseInt(match[1], 10), fin = parseInt(match[2], 10);
    const horas = [];
    for (let h = ini; h < fin; h++) horas.push(h);
    return horas.length ? horas : [ini];
  }
  const suelta = txt.match(/^(\d{1,2})(?::\d{2})?/);
  return suelta ? [parseInt(suelta[1], 10)] : [];
}

function horaATexto_(h) { return String(h).padStart(2, '0') + ':00'; }
function fmtMiles_(n) { return Math.round(n).toLocaleString('es-AR'); }
function fechaLarga_(fechaStr) {
  const d = new Date(fechaStr + 'T12:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function linkWhatsApp_(tel, texto) {
  return 'https://wa.me/' + String(tel).replace(/\D/g, '') + '?text=' + encodeURIComponent(texto || '');
}

function avisarDueno_(d, horario, waAviso) {
  const destino = CONFIG.emailAviso || Session.getEffectiveUser().getEmail();
  const asunto = '🎾 Reserva de cancha — ' + d.cancha + ' ' + fechaLarga_(d.fecha);
  const html =
    '<div style="font-family:sans-serif;max-width:480px;">' +
    '<h2>Nueva reserva de cancha</h2>' +
    '<p><b>' + esc_(d.nombre) + '</b> · ' + esc_(d.tel) + '</p>' +
    '<p>' + esc_(d.cancha) + ' · ' + fechaLarga_(d.fecha) + ' · ' + horario + '</p>' +
    '<p>Seña: $' + fmtMiles_(CONFIG.sena) + ' (queda registrada en la pestaña Cancha)</p>' +
    (d.mesa ? '<p>🍔 Va a necesitar mesa/consumo en Cantina</p>' : '') +
    '<p><a href="' + esc_(waAviso) + '" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">💬 Escribirle por WhatsApp</a></p>' +
    '</div>';
  try { MailApp.sendEmail({ to: destino, subject: asunto, htmlBody: html, name: CONFIG.marca }); } catch (e2) {}
}

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
