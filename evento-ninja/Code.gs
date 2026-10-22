/**
 * ALDEA DEL VALLE × TECLAN — Inscripción evento Guido "Ninja" Cannetti
 * ------------------------------------------------------------
 * Página pública de venta de entradas / inscripción para el evento del
 * 14 de noviembre en Aldea de Valle. Mismo esquema que la reserva de
 * cancha: un solo proyecto de Apps Script sirve la página y guarda los
 * datos en el Sheet de siempre.
 *
 * Cada inscripción:
 *   1) se guarda en la pestaña "Ninja Cannetti" (se crea sola la primera
 *      vez) con estado "⏳ Falta pago" y un código tipo NC-007.
 *   2) te llega un mail de aviso con botón para escribirle por WhatsApp.
 *   3) a la persona le aparecen el alias y un botón para mandar el
 *      comprobante por WhatsApp.
 *
 * Cupo: cuentan todas las filas que NO estén en "❌ Cancelado". Cuando
 * llega a CONFIG.cupoMaximo la página muestra "Agotado" y no deja
 * inscribirse más. Para liberar un lugar (alguien que no pagó), cambiale
 * el estado a "❌ Cancelado". Cuando te llega el comprobante, cambialo a
 * "✅ Pagado".
 *
 * INSTALACIÓN: ver LEEME.md en esta misma carpeta.
 * ------------------------------------------------------------
 */

const CONFIG = {
  marca: 'Aldea del Valle',
  sheetId: '14ryo80HIfT2MIi1X4fugC6Me5FH-FaiyCt9kywbREIs', // mismo Sheet que usa la app interna
  pestana: 'Ninja Cannetti',
  whatsapp: '5493516197928',      // a dónde llegan los avisos y los comprobantes
  emailAviso: '',                 // vacío = llega al mail de la cuenta dueña del script
  cupoMaximo: 120,
  objetivo: 100,
  // Precio según fecha de inscripción (se usa el primero cuya fecha "hasta" no pasó)
  precios: [
    { nombre: 'Preventa', precio: 42000, hasta: '2026-10-31' },
    { nombre: 'General',  precio: 49000, hasta: '2026-11-13' },
    { nombre: 'Última hora', precio: 55000, hasta: '2026-11-14' },
  ],
  // TODO: completar con el alias que se cree junto con Teclan
  pago: { alias: 'COMPLETAR.ALIAS', banco: 'COMPLETAR', titular: 'COMPLETAR' },
};

const ESTADO_PENDIENTE = '⏳ Falta pago';
const ESTADO_CANCELADO = '❌ Cancelado';
const COLUMNAS = ['Alta', 'Código', 'Nombre', 'DNI', 'WhatsApp', 'Email', 'Experiencia', 'Tarifa', 'Precio', 'Estado', 'Obs'];

function abrirPestana_() {
  const ss = SpreadsheetApp.openById(CONFIG.sheetId);
  let sh = ss.getSheetByName(CONFIG.pestana);
  if (!sh) {
    sh = ss.insertSheet(CONFIG.pestana);
    sh.appendRow(COLUMNAS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold');
  }
  return sh;
}

function doGet(e) {
  const prm = (e && e.parameter) || {};
  if (!prm.accion) {
    return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Ninja Cannetti en Aldea de Valle · 14 de noviembre')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  try {
    return responder_({ ok: true, estado: estado() });
  } catch (err) {
    return responder_({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    return responder_(inscribir(JSON.parse(e.postData.contents)));
  } catch (err) {
    return responder_({ ok: false, error: err.message });
  }
}

/** Lo llama la página (google.script.run) para mostrar cupo y precio vigente. */
function estado() {
  const filas = filasActivas_();
  const tarifa = tarifaVigente_();
  return {
    inscriptos: filas.length,
    cupoMaximo: CONFIG.cupoMaximo,
    objetivo: CONFIG.objetivo,
    tarifa: tarifa,
    precios: CONFIG.precios,
  };
}

/** Lo llama la página (google.script.run) al enviar el formulario. */
function inscribir(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    validar_(d);
    const tarifa = tarifaVigente_();
    if (!tarifa) throw new Error('Las inscripciones ya cerraron.');

    const activas = filasActivas_();
    if (activas.length >= CONFIG.cupoMaximo) throw new Error('¡Se agotó el cupo! Escribinos por WhatsApp para quedar en lista de espera.');
    const dni = soloDigitos_(d.dni);
    if (activas.some(f => soloDigitos_(f[3]) === dni)) throw new Error('Ya hay una inscripción con ese DNI. Si no te llegaron los datos de pago, escribinos por WhatsApp.');

    const sh = abrirPestana_();
    const codigo = 'NC-' + String(sh.getLastRow()).padStart(3, '0');
    sh.appendRow([
      new Date(), codigo, String(d.nombre).trim(), dni, String(d.tel).trim(),
      String(d.email || '').trim(), d.experiencia || '', tarifa.nombre, tarifa.precio,
      ESTADO_PENDIENTE, 'Inscripción web',
    ]);

    const waAviso = linkWhatsApp_(d.tel, '¡Hola ' + String(d.nombre).trim().split(' ')[0] + '! Te escribimos de Aldea de Valle por tu inscripción al evento con el Ninja Cannetti (' + codigo + ').');
    avisarDueno_(d, codigo, tarifa, activas.length + 1, waAviso);

    return {
      ok: true,
      codigo: codigo,
      precio: tarifa.precio,
      tarifa: tarifa.nombre,
      pago: CONFIG.pago,
      whatsappComprobante: linkWhatsApp_(CONFIG.whatsapp,
        'Hola! Te mando el comprobante de mi inscripción al evento del Ninja Cannetti. Código ' + codigo + ' · ' + String(d.nombre).trim() + ' · DNI ' + dni),
    };
  } finally {
    lock.releaseLock();
  }
}

function filasActivas_() {
  const valores = abrirPestana_().getDataRange().getValues().slice(1);
  return valores.filter(f => f[2] && String(f[9] || '').indexOf('Cancelado') === -1);
}

function tarifaVigente_() {
  const hoy = Utilities.formatDate(new Date(), 'America/Argentina/Cordoba', 'yyyy-MM-dd');
  return CONFIG.precios.find(p => hoy <= p.hasta) || null;
}

function validar_(d) {
  const faltan = [];
  if (!d.nombre || String(d.nombre).trim().length < 3) faltan.push('nombre y apellido');
  if (soloDigitos_(d.dni).length < 7) faltan.push('DNI');
  if (soloDigitos_(d.tel).length < 8) faltan.push('WhatsApp');
  if (!d.acepta) faltan.push('aceptar el deslinde');
  if (faltan.length) throw new Error('Completá: ' + faltan.join(', '));
}

function soloDigitos_(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
function fmtMiles_(n) { return Math.round(n).toLocaleString('es-AR'); }

function linkWhatsApp_(tel, texto) {
  let n = soloDigitos_(tel);
  if (n.length === 10) n = '549' + n; // número cordobés sin prefijo internacional
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto || '');
}

function avisarDueno_(d, codigo, tarifa, total, waAviso) {
  const destino = CONFIG.emailAviso || Session.getEffectiveUser().getEmail();
  const asunto = '🥊 Inscripción ' + codigo + ' — ' + d.nombre + ' (' + total + '/' + CONFIG.cupoMaximo + ')';
  const html =
    '<div style="font-family:sans-serif;max-width:480px;">' +
    '<h2>Nueva inscripción — Ninja Cannetti</h2>' +
    '<p><b>' + esc_(d.nombre) + '</b> · DNI ' + esc_(d.dni) + ' · ' + esc_(d.tel) + '</p>' +
    (d.email ? '<p>' + esc_(d.email) + '</p>' : '') +
    '<p>Experiencia: ' + esc_(d.experiencia || '—') + '</p>' +
    '<p>' + esc_(tarifa.nombre) + ': $' + fmtMiles_(tarifa.precio) + ' · Código ' + codigo + '</p>' +
    '<p>Van <b>' + total + '</b> de ' + CONFIG.cupoMaximo + ' (objetivo ' + CONFIG.objetivo + ')</p>' +
    '<p><a href="' + esc_(waAviso) + '" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">💬 Escribirle por WhatsApp</a></p>' +
    '</div>';
  try { MailApp.sendEmail({ to: destino, subject: asunto, htmlBody: html, name: CONFIG.marca }); } catch (e2) {}
}

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
