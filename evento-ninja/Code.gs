/**
 * ALDEA DEL VALLE × THE CLAN — Inscripción evento Guido "Ninja" Cannetti
 * ------------------------------------------------------------
 * Página pública de venta de entradas para el evento del sábado 14 de
 * noviembre (16hs) en Aldea de Valle. Mismo esquema que la reserva de
 * cancha: un solo proyecto de Apps Script sirve la página y guarda los
 * datos en el Sheet de siempre.
 *
 * Dos tipos de entrada:
 *   - Seminario (entrena): cupo CONFIG.cupoSeminario (120).
 *   - Espectador (solo mira): cupo aparte, CONFIG.cupoEspectadores.
 * Cualquiera de los dos puede sumar asado con bebida libre (hasta
 * CONFIG.asadoHasta, para comprar la carne con tiempo).
 *
 * Cada inscripción:
 *   1) se guarda en la pestaña "Ninja Cannetti" (se crea sola) con estado
 *      "⏳ Falta pago" y un código tipo NC-007 (también es su número para
 *      el sorteo).
 *   2) te llega un mail de aviso con botón para escribirle por WhatsApp.
 *   3) a la persona le aparecen el alias y un botón para mandar el
 *      comprobante por WhatsApp (le llega a Valeria).
 *
 * Estados: llegó el comprobante → "✅ Pagado". No pagó en 48hs → correr
 * liberarVencidas() (o dejarla con activador cada hora, ver LEEME.md):
 * pasa esas filas a "❌ Cancelado (sin pago 48hs)" y el lugar se libera.
 *
 * Día del evento: correr armarListaAcreditacion() → crea la pestaña
 * "Acreditación" con los pagados ordenados por apellido, lista para
 * imprimir (pulsera de inscripción y de asado).
 *
 * INSTALACIÓN: ver LEEME.md en esta misma carpeta.
 * ------------------------------------------------------------
 */

const CONFIG = {
  marca: 'Aldea del Valle',
  sheetId: '14ryo80HIfT2MIi1X4fugC6Me5FH-FaiyCt9kywbREIs', // mismo Sheet que usa la app interna
  pestana: 'Ninja Cannetti',
  whatsapp: '5493513855564',      // Valeria: recibe comprobantes y consultas
  emailAviso: '',                 // vacío = llega al mail de la cuenta dueña del script
  cupoSeminario: 120,
  objetivo: 100,
  cupoEspectadores: 80,
  horasParaPagar: 48,
  // Precio según fecha de inscripción (se usa el primero cuya fecha "hasta" no pasó)
  precios: [
    { nombre: 'Preventa',    precio: 42000, hasta: '2026-10-31' },
    { nombre: 'General',     precio: 49000, hasta: '2026-11-13' },
    { nombre: 'Última hora', precio: 55000, hasta: '2026-11-14' },
  ],
  precioEspectador: 15000,        // PROVISORIO: confirmar
  asado: { nombre: 'Asado + bebida libre', precio: 22000, hasta: '2026-11-11' },
  maxPersonasAsado: 6,            // contando al inscripto
  // TODO: completar con el alias de la cuenta del evento
  pago: { alias: 'COMPLETAR.ALIAS', banco: 'COMPLETAR', titular: 'COMPLETAR' },
};

const TZ = 'America/Argentina/Cordoba';
const ESTADO_PENDIENTE = '⏳ Falta pago';
const ESTADO_PAGADO = '✅ Pagado';
const ESTADO_VENCIDO = '❌ Cancelado (sin pago 48hs)';
const TIPOS = { seminario: 'Seminario', espectador: 'Espectador' };
const COLUMNAS = ['Alta', 'Código', 'Tipo', 'Nombre', 'DNI', 'WhatsApp', 'Email', 'Experiencia',
  'Tarifa', 'Precio entrada', 'Personas asado', 'Total asado', 'Total a pagar', 'Estado', 'Obs'];
const C = COLUMNAS.reduce((m, n, i) => (m[n] = i, m), {});

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

/** Lo llama la página (google.script.run) para mostrar cupos y precios vigentes. */
function estado() {
  const filas = filasActivas_();
  return {
    inscriptos: filas.filter(f => f[C['Tipo']] === TIPOS.seminario).length,
    espectadores: filas.filter(f => f[C['Tipo']] === TIPOS.espectador).length,
    cupoMaximo: CONFIG.cupoSeminario,
    cupoEspectadores: CONFIG.cupoEspectadores,
    objetivo: CONFIG.objetivo,
    tarifa: tarifaVigente_(),
    precios: CONFIG.precios,
    precioEspectador: CONFIG.precioEspectador,
    asado: Object.assign({ abierto: hoy_() <= CONFIG.asado.hasta }, CONFIG.asado),
    maxPersonasAsado: CONFIG.maxPersonasAsado,
    horasParaPagar: CONFIG.horasParaPagar,
  };
}

/** Lo llama la página (google.script.run) al enviar el formulario. */
function inscribir(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    validar_(d);
    const tipo = d.tipo === 'espectador' ? TIPOS.espectador : TIPOS.seminario;
    const tarifaSem = tarifaVigente_();
    if (!tarifaSem) throw new Error('Las inscripciones online ya cerraron. Quedan entradas en puerta si hay lugar.');
    const entrada = tipo === TIPOS.espectador
      ? { nombre: 'Espectador', precio: CONFIG.precioEspectador }
      : tarifaSem;

    const activas = filasActivas_();
    const delTipo = activas.filter(f => f[C['Tipo']] === tipo);
    const cupo = tipo === TIPOS.espectador ? CONFIG.cupoEspectadores : CONFIG.cupoSeminario;
    if (delTipo.length >= cupo) throw new Error('¡Se agotaron las entradas de ' + tipo.toLowerCase() + '! Escribinos por WhatsApp para quedar en lista de espera.');
    const dni = soloDigitos_(d.dni);
    if (activas.some(f => soloDigitos_(f[C['DNI']]) === dni)) throw new Error('Ya hay una inscripción con ese DNI. Si no te llegaron los datos de pago, escribinos por WhatsApp.');

    const asado = calcularAsado_(d);
    const total = entrada.precio + asado.total;
    const nombre = String(d.nombre).trim();

    const sh = abrirPestana_();
    const codigo = 'NC-' + String(sh.getLastRow()).padStart(3, '0');
    const fila = [];
    fila[C['Alta']] = new Date();
    fila[C['Código']] = codigo;
    fila[C['Tipo']] = tipo;
    fila[C['Nombre']] = nombre;
    fila[C['DNI']] = dni;
    fila[C['WhatsApp']] = String(d.tel).trim();
    fila[C['Email']] = String(d.email || '').trim();
    fila[C['Experiencia']] = tipo === TIPOS.seminario ? (d.experiencia || '') : '';
    fila[C['Tarifa']] = entrada.nombre;
    fila[C['Precio entrada']] = entrada.precio;
    fila[C['Personas asado']] = asado.personas;
    fila[C['Total asado']] = asado.total;
    fila[C['Total a pagar']] = total;
    fila[C['Estado']] = ESTADO_PENDIENTE;
    fila[C['Obs']] = 'Inscripción web';
    sh.appendRow(fila);

    const waAviso = linkWhatsApp_(d.tel, '¡Hola ' + nombre.split(' ')[0] + '! Te escribimos de Aldea de Valle por tu inscripción al evento con el Ninja Cannetti (' + codigo + ').');
    avisarDueno_(fila, delTipo.length + 1, cupo, waAviso);

    return {
      ok: true,
      codigo: codigo,
      tipo: tipo,
      entrada: entrada,
      asado: asado,
      total: total,
      horasParaPagar: CONFIG.horasParaPagar,
      pago: CONFIG.pago,
      whatsappComprobante: linkWhatsApp_(CONFIG.whatsapp,
        'Hola Vale! Te mando el comprobante de mi inscripción al evento del Ninja Cannetti. Código ' + codigo + ' · ' + nombre + ' · DNI ' + dni +
        ' · ' + tipo + (asado.personas ? ' · Asado x' + asado.personas : '') + ' · Total $' + fmtMiles_(total)),
    };
  } finally {
    lock.releaseLock();
  }
}

/** El precio y la fecha límite del asado salen de CONFIG, no de la página. */
function calcularAsado_(d) {
  const personas = Math.max(0, Math.min(CONFIG.maxPersonasAsado, parseInt(d.personasAsado, 10) || 0));
  if (!personas) return { personas: 0, total: 0 };
  if (hoy_() > CONFIG.asado.hasta) throw new Error('El asado ya cerró (se anotaba hasta 3 días antes). Desmarcalo para seguir.');
  return { personas: personas, total: CONFIG.asado.precio * personas };
}

function filasActivas_() {
  return abrirPestana_().getDataRange().getValues().slice(1)
    .filter(f => f[C['Nombre']] && String(f[C['Estado']] || '').indexOf('Cancelado') === -1);
}

/**
 * Pasa a cancelado las inscripciones que siguen en "Falta pago" después de
 * CONFIG.horasParaPagar. Se puede correr a mano o con un activador cada hora.
 */
function liberarVencidas() {
  const sh = abrirPestana_();
  const valores = sh.getDataRange().getValues();
  const limite = Date.now() - CONFIG.horasParaPagar * 3600 * 1000;
  let liberadas = 0;
  for (let i = 1; i < valores.length; i++) {
    const f = valores[i];
    if (f[C['Estado']] !== ESTADO_PENDIENTE || !(f[C['Alta']] instanceof Date)) continue;
    if (f[C['Alta']].getTime() > limite) continue;
    sh.getRange(i + 1, C['Estado'] + 1).setValue(ESTADO_VENCIDO);
    liberadas++;
  }
  return liberadas;
}

/** Crea/actualiza la pestaña "Acreditación" con los pagados, ordenados por nombre, para imprimir. */
function armarListaAcreditacion() {
  const ss = SpreadsheetApp.openById(CONFIG.sheetId);
  const pagados = abrirPestana_().getDataRange().getValues().slice(1)
    .filter(f => f[C['Estado']] === ESTADO_PAGADO)
    .sort((a, b) => String(a[C['Nombre']]).localeCompare(String(b[C['Nombre']]), 'es'));
  let sh = ss.getSheetByName('Acreditación');
  if (sh) sh.clear(); else sh = ss.insertSheet('Acreditación');
  const filas = [['✔', 'Nombre', 'DNI', 'Tipo', 'Código', 'Pulseras asado', 'Firma deslinde']]
    .concat(pagados.map(f => ['☐', f[C['Nombre']], f[C['DNI']], f[C['Tipo']], f[C['Código']], f[C['Personas asado']] || '', '']));
  sh.getRange(1, 1, filas.length, filas[0].length).setValues(filas);
  sh.getRange(1, 1, 1, filas[0].length).setFontWeight('bold');
  sh.setFrozenRows(1);
  const asados = pagados.reduce((s, f) => s + (Number(f[C['Personas asado']]) || 0), 0);
  sh.getRange(filas.length + 2, 2).setValue('Total: ' + pagados.length + ' personas · ' + asados + ' pulseras de asado');
}

function tarifaVigente_() {
  const hoy = hoy_();
  return CONFIG.precios.find(p => hoy <= p.hasta) || null;
}

function validar_(d) {
  const faltan = [];
  if (!d.nombre || String(d.nombre).trim().length < 3) faltan.push('nombre y apellido');
  if (soloDigitos_(d.dni).length < 7) faltan.push('DNI');
  if (soloDigitos_(d.tel).length < 8) faltan.push('WhatsApp');
  if (!d.acepta) faltan.push('aceptar las condiciones');
  if (faltan.length) throw new Error('Completá: ' + faltan.join(', '));
}

function hoy_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function soloDigitos_(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
function fmtMiles_(n) { return Math.round(n).toLocaleString('es-AR'); }

function linkWhatsApp_(tel, texto) {
  let n = soloDigitos_(tel);
  if (n.length === 10) n = '549' + n; // número cordobés sin prefijo internacional
  return 'https://wa.me/' + n + '?text=' + encodeURIComponent(texto || '');
}

function avisarDueno_(f, n, cupo, waAviso) {
  const destino = CONFIG.emailAviso || Session.getEffectiveUser().getEmail();
  const asunto = '🥊 ' + f[C['Código']] + ' — ' + f[C['Nombre']] + ' · ' + f[C['Tipo']] + ' (' + n + '/' + cupo + ')';
  const html =
    '<div style="font-family:sans-serif;max-width:480px;">' +
    '<h2>Nueva inscripción — Ninja Cannetti</h2>' +
    '<p><b>' + esc_(f[C['Nombre']]) + '</b> · DNI ' + esc_(f[C['DNI']]) + ' · ' + esc_(f[C['WhatsApp']]) + '</p>' +
    (f[C['Email']] ? '<p>' + esc_(f[C['Email']]) + '</p>' : '') +
    '<p>' + esc_(f[C['Tipo']]) + ' · ' + esc_(f[C['Tarifa']]) + ': $' + fmtMiles_(f[C['Precio entrada']]) +
    (f[C['Experiencia']] ? ' · Entrena: ' + esc_(f[C['Experiencia']]) : '') + '</p>' +
    (f[C['Personas asado']] ? '<p>🍖 Asado × ' + f[C['Personas asado']] + ': $' + fmtMiles_(f[C['Total asado']]) + '</p>' : '') +
    '<p><b>Total a pagar: $' + fmtMiles_(f[C['Total a pagar']]) + '</b></p>' +
    '<p>Van <b>' + n + '</b> de ' + cupo + (f[C['Tipo']] === TIPOS.seminario ? ' (objetivo ' + CONFIG.objetivo + ')' : '') + '</p>' +
    '<p><a href="' + esc_(waAviso) + '" style="background:#25D366;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold;">💬 Escribirle por WhatsApp</a></p>' +
    '</div>';
  try { MailApp.sendEmail({ to: destino, subject: asunto, htmlBody: html, name: CONFIG.marca }); } catch (e2) {}
}

function esc_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
