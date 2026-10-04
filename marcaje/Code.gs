/**
 * Aldea de Valle — Sistema de marcaje de horarios
 * Backend en Google Apps Script, pegado dentro del Google Sheet "Aldea — Marcaje".
 *
 * Hojas: Empleados, Marcajes, Config, Ajustes y una "Liquidación AAAA-MM" por cada mes guardado.
 * La primera vez: ejecutar setup() desde el editor (ver INSTRUCCIONES.md).
 *
 * Todas las llamadas llegan por POST con un JSON en texto plano: { accion: '...', ... }.
 * La hora de cada marcaje la pone el servidor (no el celular) y la distancia al predio
 * se vuelve a calcular acá, así que no alcanza con cambiar la hora del teléfono.
 */

const TZ = 'America/Argentina/Buenos_Aires';
const HORAS_MAX_TURNO = 16;     // una entrada sin salida más vieja que esto se considera olvidada
const PIN_ADMIN_INICIAL = '2026';

const HOJAS = {
  Empleados: ['id', 'nombre', 'pin', 'area', 'formaPago', 'valor', 'horasSemana', 'telefono', 'activo', 'notas', 'creado'],
  Marcajes:  ['id', 'empleadoId', 'nombre', 'tipo', 'fechaHora', 'lat', 'lng', 'distancia', 'precision', 'origen', 'nota'],
  Config:    ['clave', 'valor', 'descripcion'],
  Ajustes:   ['id', 'mes', 'empleadoId', 'nombre', 'monto', 'concepto', 'creado'],
};

const FORMAS_PAGO = {
  hora:    'Por hora',
  mensual: 'Sueldo mensual fijo',
  semanal: 'Por semana',
  evento:  'Por evento',
};

/* ───────────────────────── Instalación ───────────────────────── */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(TZ);
  Object.keys(HOJAS).forEach(nombre => {
    let sh = ss.getSheetByName(nombre);
    if (!sh) sh = ss.insertSheet(nombre);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HOJAS[nombre]);
      sh.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold').setBackground('#E3EDE4');
      sh.setFrozenRows(1);
    }
  });
  // PIN y teléfono como texto, para que no se pierdan los ceros de adelante.
  ss.getSheetByName('Empleados').getRange('C:C').setNumberFormat('@');
  ss.getSheetByName('Empleados').getRange('H:H').setNumberFormat('@');

  const cfg = ss.getSheetByName('Config');
  if (cfg.getLastRow() === 1) {
    cfg.getRange(2, 1, 6, 3).setValues([
      ['pinAdmin', PIN_ADMIN_INICIAL, 'PIN del panel de administrador. Cambialo desde Ajustes.'],
      ['centroLat', '', 'Latitud del centro de Aldea. Fijala con "Usar mi ubicación" parado en el predio.'],
      ['centroLng', '', 'Longitud del centro de Aldea.'],
      ['radio', 100, 'Distancia máxima (metros) para poder marcar.'],
      ['direccion', 'República de China 1890, Valle Escondido', 'Solo informativo.'],
      ['nombreLugar', 'Aldea de Valle', 'Aparece en los recibos.'],
    ]);
    cfg.getRange('B:B').setNumberFormat('@');
  }

  const emp = ss.getSheetByName('Empleados');
  if (emp.getLastRow() === 1) {
    const usados = {};
    const nuevo = (nombre, area, formaPago, valor, horasSemana, notas) =>
      [uid_(), nombre, pinNuevo_(usados), area, formaPago, valor, horasSemana, '', true, notas, new Date()];
    const filas = [
      nuevo('Papá', 'Mantenimiento', 'mensual', 500000, '', 'Sueldo fijo. Marca horario igual, para que quede el registro.'),
      nuevo('Mantenimiento (poner nombre)', 'Mantenimiento', 'hora', 6000, '', ''),
      nuevo('Karina', 'Limpieza', 'semanal', 207200, 30, 'Trabaja 6 h por día. Días por semana sin confirmar: 30 h semanales es un supuesto.'),
      nuevo('Cantina 1 (poner nombre)', 'Cantina', 'hora', 5500, '', ''),
      nuevo('Cantina 2 (poner nombre)', 'Cantina', 'hora', 6500, '', ''),
      nuevo('Profe (poner nombre)', 'Profes', 'evento', 50000, '', '$50.000 por cumpleaños.'),
    ];
    emp.getRange(2, 1, filas.length, filas[0].length).setValues(filas);
  }
  ss.toast('Listo. Los PIN de cada empleado están en la hoja Empleados.', 'Aldea — Marcaje', 8);
}

/* ───────────────────────── Entrada HTTP ───────────────────────── */

function doGet(e) {
  if (e && e.parameter && e.parameter.accion) return responder_(manejar_(e.parameter));
  return responder_({ ok: true, app: 'Aldea — Marcaje' });
}

function doPost(e) {
  let datos = {};
  try { datos = JSON.parse(e.postData.contents || '{}'); }
  catch (err) { return responder_({ ok: false, error: 'Pedido mal formado.' }); }
  return responder_(manejar_(datos));
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function manejar_(d) {
  try {
    const acciones = {
      // Empleados
      empleados: accEmpleadosPublico_,
      login: accLogin_,
      estado: accEstado_,
      marcar: accMarcar_,
      // Administrador
      adminLogin: conAdmin_(() => ({ ok: true })),
      adminDatos: conAdmin_(accAdminDatos_),
      guardarEmpleado: conAdmin_(accGuardarEmpleado_),
      marcajeManual: conAdmin_(accMarcajeManual_),
      borrarMarcaje: conAdmin_(accBorrarMarcaje_),
      guardarAjuste: conAdmin_(accGuardarAjuste_),
      borrarAjuste: conAdmin_(accBorrarAjuste_),
      guardarConfig: conAdmin_(accGuardarConfig_),
      guardarLiquidacion: conAdmin_(accGuardarLiquidacion_),
    };
    const fn = acciones[d.accion];
    if (!fn) return { ok: false, error: 'Acción desconocida.' };
    return fn(d);
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

function conAdmin_(fn) {
  return d => {
    if (String(d.pinAdmin || '') !== String(config_().pinAdmin || PIN_ADMIN_INICIAL)) {
      return { ok: false, error: 'PIN de administrador incorrecto.', authError: true };
    }
    return fn(d);
  };
}

/* ───────────────────────── Acciones de empleado ───────────────────────── */

function accEmpleadosPublico_() {
  const lista = empleados_().filter(e => e.activo).map(e => ({ id: e.id, nombre: e.nombre, area: e.area }));
  lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  return { ok: true, empleados: lista };
}

function validarEmpleado_(d) {
  const e = empleados_().find(x => x.id === d.empleadoId);
  if (!e || !e.activo) throw new Error('Empleado no encontrado. Pedile al administrador que revise tu alta.');
  if (String(e.pin) !== String(d.pin || '')) throw new Error('PIN incorrecto.');
  return e;
}

function accLogin_(d) {
  validarEmpleado_(d);
  return accEstado_(d);
}

function accEstado_(d) {
  const e = validarEmpleado_(d);
  const cfg = config_();
  const mes = d.mes || mesActual_();
  const marcajes = marcajes_();
  const abierto = turnoAbierto_(marcajes, e.id);
  const liq = liquidarEmpleado_(e, mes, marcajes, ajustes_());
  return {
    ok: true,
    empleado: { id: e.id, nombre: e.nombre, area: e.area, formaPago: e.formaPago, formaPagoTexto: FORMAS_PAGO[e.formaPago] || e.formaPago, valor: e.valor, horasSemana: e.horasSemana },
    adentro: !!abierto,
    desde: abierto ? abierto.fechaHora.toISOString() : null,
    ahora: new Date().toISOString(),
    mes,
    liquidacion: liq,
    ubicacionLista: cfg.centroLat !== '' && cfg.centroLng !== '',
    radio: Number(cfg.radio) || 100,
  };
}

function accMarcar_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const e = validarEmpleado_(d);
    const cfg = config_();
    if (cfg.centroLat === '' || cfg.centroLng === '') {
      return { ok: false, error: 'Todavía no se fijó la ubicación de Aldea. Avisale al administrador.' };
    }
    const lat = Number(d.lat), lng = Number(d.lng);
    if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) {
      return { ok: false, error: 'No llegó tu ubicación. Activá el GPS y probá de nuevo.' };
    }
    const radio = Number(cfg.radio) || 100;
    const dist = Math.round(distanciaM_(lat, lng, Number(cfg.centroLat), Number(cfg.centroLng)));
    if (dist > radio) {
      return { ok: false, fuera: true, distancia: dist, radio,
        error: `Estás a ${formatoDist_(dist)} de Aldea. Para marcar tenés que estar a menos de ${radio} m.` };
    }
    const abierto = turnoAbierto_(marcajes_(), e.id);
    const tipo = abierto ? 'SALIDA' : 'ENTRADA';
    if (d.esperado && d.esperado !== tipo) {
      // El celular mostraba un estado viejo (por ejemplo, marcó desde otro teléfono).
      return { ok: false, refrescar: true, error: tipo === 'SALIDA' ? 'Ya tenías la entrada marcada. Revisá y marcá la salida.' : 'Ya tenías la salida marcada. Revisá y marcá la entrada.' };
    }
    const ahora = new Date();
    hoja_('Marcajes').appendRow([uid_(), e.id, e.nombre, tipo, ahora, lat, lng, dist, Math.round(Number(d.precision) || 0), 'gps', '']);
    const resp = accEstado_(d);
    resp.marcado = tipo;
    resp.distancia = dist;
    if (tipo === 'SALIDA') resp.horasTurno = redondear_((ahora - abierto.fechaHora) / 3600000, 2);
    return resp;
  } finally {
    lock.releaseLock();
  }
}

/* ───────────────────────── Acciones de administrador ───────────────────────── */

function accAdminDatos_(d) {
  const mes = d.mes || mesActual_();
  const cfg = config_();
  const emps = empleados_();
  const marcajes = marcajes_();
  const ajs = ajustes_();
  const liquidacion = emps
    .map(e => liquidarEmpleado_(e, mes, marcajes, ajs))
    .filter(l => l.activo || l.horas > 0 || l.turnos.length || l.ajustes.length);
  const adentro = emps.map(e => {
    const ab = turnoAbierto_(marcajes, e.id);
    return ab ? { empleadoId: e.id, nombre: e.nombre, area: e.area, desde: ab.fechaHora.toISOString() } : null;
  }).filter(Boolean);
  const delMes = marcajes.filter(m => mesDe_(m.fechaHora) === mes)
    .map(m => ({ id: m.id, empleadoId: m.empleadoId, nombre: m.nombre, tipo: m.tipo, fechaHora: m.fechaHora.toISOString(), distancia: m.distancia, precision: m.precision, origen: m.origen, nota: m.nota }))
    .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora));
  const guardada = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Liquidación ' + mes);
  return {
    ok: true, mes, ahora: new Date().toISOString(),
    empleados: emps.map(e => Object.assign({}, e, { creado: undefined, _fila: undefined })),
    marcajes: delMes,
    liquidacion,
    adentro,
    config: { centroLat: cfg.centroLat, centroLng: cfg.centroLng, radio: Number(cfg.radio) || 100, direccion: cfg.direccion, nombreLugar: cfg.nombreLugar },
    liquidacionGuardada: !!guardada,
    formasPago: FORMAS_PAGO,
  };
}

function accGuardarEmpleado_(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const x = d.empleado || {};
    const nombre = String(x.nombre || '').trim();
    if (!nombre) return { ok: false, error: 'Falta el nombre.' };
    const pin = String(x.pin || '').trim();
    if (!/^\d{4}$/.test(pin)) return { ok: false, error: 'El PIN tiene que ser de 4 números.' };
    if (!FORMAS_PAGO[x.formaPago]) return { ok: false, error: 'Forma de pago inválida.' };
    const valor = Number(x.valor);
    if (!(valor >= 0)) return { ok: false, error: 'El valor tiene que ser un número.' };
    const emps = empleados_();
    if (emps.some(e => e.id !== x.id && e.activo && e.nombre.toLowerCase() === nombre.toLowerCase())) {
      return { ok: false, error: 'Ya hay otra persona activa con ese nombre. Agregale el apellido.' };
    }
    if (emps.some(e => e.id !== x.id && e.activo && String(e.pin) === pin)) {
      return { ok: false, error: 'Ese PIN ya lo usa otra persona. Elegí otro.' };
    }
    const fila = [x.id || uid_(), nombre, pin, String(x.area || '').trim(), x.formaPago, valor,
      x.formaPago === 'semanal' ? (Number(x.horasSemana) || '') : '', String(x.telefono || '').replace(/[^\d+]/g, ''),
      x.activo !== false, String(x.notas || '')];
    const sh = hoja_('Empleados');
    const idx = emps.findIndex(e => e.id === x.id);
    if (idx >= 0) {
      sh.getRange(emps[idx]._fila, 1, 1, fila.length).setValues([fila]);
      // Si cambió el nombre, se actualiza también en los marcajes para que el Sheet se lea fácil.
      if (emps[idx].nombre !== nombre) {
        const shm = hoja_('Marcajes');
        const vals = shm.getDataRange().getValues();
        for (let i = 1; i < vals.length; i++) if (vals[i][1] === x.id) shm.getRange(i + 1, 3).setValue(nombre);
      }
    } else {
      fila.push(new Date());
      sh.appendRow(fila);
    }
    return { ok: true, id: fila[0] };
  } finally {
    lock.releaseLock();
  }
}

function accMarcajeManual_(d) {
  const e = empleados_().find(x => x.id === d.empleadoId);
  if (!e) return { ok: false, error: 'Empleado no encontrado.' };
  if (d.tipo !== 'ENTRADA' && d.tipo !== 'SALIDA') return { ok: false, error: 'Tipo inválido.' };
  const fecha = parseLocal_(d.fechaHora);
  if (!fecha) return { ok: false, error: 'Fecha u hora inválida.' };
  if (fecha > new Date(Date.now() + 5 * 60000)) return { ok: false, error: 'No se puede cargar un marcaje en el futuro.' };
  hoja_('Marcajes').appendRow([uid_(), e.id, e.nombre, d.tipo, fecha, '', '', '', '', 'manual', String(d.nota || 'Cargado por administrador')]);
  return { ok: true };
}

function accBorrarMarcaje_(d) { return borrarPorId_('Marcajes', d.id); }

function accGuardarAjuste_(d) {
  const e = empleados_().find(x => x.id === d.empleadoId);
  if (!e) return { ok: false, error: 'Empleado no encontrado.' };
  const monto = Number(d.monto);
  if (!monto) return { ok: false, error: 'Poné un monto distinto de cero (negativo para descontar).' };
  if (!/^\d{4}-\d{2}$/.test(d.mes || '')) return { ok: false, error: 'Mes inválido.' };
  hoja_('Ajustes').appendRow([uid_(), d.mes, e.id, e.nombre, monto, String(d.concepto || '').trim() || (monto > 0 ? 'Extra' : 'Descuento'), new Date()]);
  return { ok: true };
}

function accBorrarAjuste_(d) { return borrarPorId_('Ajustes', d.id); }

function accGuardarConfig_(d) {
  const c = d.config || {};
  const cambios = {};
  if ('centroLat' in c || 'centroLng' in c) {
    const lat = Number(c.centroLat), lng = Number(c.centroLng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || (lat === 0 && lng === 0)) {
      return { ok: false, error: 'Coordenadas inválidas.' };
    }
    cambios.centroLat = lat.toFixed(6);
    cambios.centroLng = lng.toFixed(6);
  }
  if ('radio' in c) {
    const r = Number(c.radio);
    if (!(r >= 20 && r <= 2000)) return { ok: false, error: 'El radio tiene que estar entre 20 y 2000 metros.' };
    cambios.radio = Math.round(r);
  }
  if ('nombreLugar' in c) cambios.nombreLugar = String(c.nombreLugar).trim() || 'Aldea de Valle';
  if ('pinAdminNuevo' in c) {
    if (!/^\d{4,8}$/.test(String(c.pinAdminNuevo))) return { ok: false, error: 'El PIN de administrador tiene que ser de 4 a 8 números.' };
    cambios.pinAdmin = String(c.pinAdminNuevo);
  }
  const sh = hoja_('Config');
  const vals = sh.getDataRange().getValues();
  Object.keys(cambios).forEach(k => {
    const i = vals.findIndex(r => r[0] === k);
    if (i >= 1) sh.getRange(i + 1, 2).setValue(String(cambios[k]));
    else sh.appendRow([k, String(cambios[k]), '']);
  });
  return { ok: true };
}

function accGuardarLiquidacion_(d) {
  const mes = d.mes || mesActual_();
  const marcajes = marcajes_(), ajs = ajustes_();
  const liq = empleados_().map(e => liquidarEmpleado_(e, mes, marcajes, ajs))
    .filter(l => l.activo || l.horas > 0 || l.ajustes.length);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombre = 'Liquidación ' + mes;
  let sh = ss.getSheetByName(nombre);
  if (sh) sh.clear(); else sh = ss.insertSheet(nombre);
  const enc = ['Empleado', 'Área', 'Forma de pago', 'Valor', 'Horas', 'Días', 'Eventos', 'Calculado', 'Ajustes', 'Total a pagar', 'Turnos sin salida', 'Detalle ajustes'];
  const filas = liq.map(l => [l.nombre, l.area, l.formaPagoTexto, l.valor, l.horas, l.dias, l.eventos, l.calculado, l.totalAjustes, l.total, l.sinSalida,
    l.ajustes.map(a => `${a.concepto}: ${a.monto}`).join(' · ')]);
  const total = liq.reduce((a, l) => a + l.total, 0);
  sh.appendRow(enc);
  if (filas.length) sh.getRange(2, 1, filas.length, enc.length).setValues(filas);
  sh.appendRow(['TOTAL', '', '', '', '', '', '', '', '', total, '', '']);
  sh.appendRow(['Guardado el ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm')]);
  sh.getRange(1, 1, 1, enc.length).setFontWeight('bold').setBackground('#E3EDE4');
  sh.getRange(filas.length + 2, 1, 1, enc.length).setFontWeight('bold');
  sh.getRange(2, 4, filas.length + 1, 1).setNumberFormat('$#,##0');
  sh.getRange(2, 8, filas.length + 1, 3).setNumberFormat('$#,##0');
  sh.setFrozenRows(1);
  return { ok: true, hoja: nombre, total };
}

/* ───────────────────────── Cálculo de horas y pagos ───────────────────────── */

/** Arma los turnos (entrada→salida) de un empleado en orden cronológico. */
function turnos_(marcajes, empleadoId) {
  const ms = marcajes.filter(m => m.empleadoId === empleadoId).sort((a, b) => a.fechaHora - b.fechaHora);
  const turnos = [];
  let abierta = null;
  ms.forEach(m => {
    if (m.tipo === 'ENTRADA') {
      if (abierta) turnos.push({ entrada: abierta, salida: null });   // entrada sin salida
      abierta = m;
    } else if (m.tipo === 'SALIDA') {
      if (abierta) {
        const h = (m.fechaHora - abierta.fechaHora) / 3600000;
        if (h > HORAS_MAX_TURNO) { turnos.push({ entrada: abierta, salida: null }); turnos.push({ entrada: null, salida: m }); }
        else turnos.push({ entrada: abierta, salida: m });
        abierta = null;
      } else {
        turnos.push({ entrada: null, salida: m });                    // salida sin entrada
      }
    }
  });
  if (abierta) turnos.push({ entrada: abierta, salida: null, enCurso: (Date.now() - abierta.fechaHora) / 3600000 <= HORAS_MAX_TURNO });
  return turnos;
}

function turnoAbierto_(marcajes, empleadoId) {
  const ts = turnos_(marcajes, empleadoId);
  const ult = ts[ts.length - 1];
  return ult && ult.enCurso ? ult.entrada : null;
}

function liquidarEmpleado_(e, mes, marcajes, ajustes) {
  const turnos = turnos_(marcajes, e.id).filter(t => mesDe_((t.entrada || t.salida).fechaHora) === mes);
  let horas = 0, eventos = 0, sinSalida = 0;
  const dias = {};
  const detalle = turnos.map(t => {
    const h = t.entrada && t.salida ? (t.salida.fechaHora - t.entrada.fechaHora) / 3600000 : 0;
    horas += h;
    if (t.entrada && !t.enCurso) eventos++;
    if (t.entrada) dias[diaDe_(t.entrada.fechaHora)] = true;
    const problema = t.enCurso ? 'en curso' : !t.salida ? 'sin salida' : !t.entrada ? 'sin entrada' : '';
    if (problema === 'sin salida' || problema === 'sin entrada') sinSalida++;
    return {
      entrada: t.entrada ? t.entrada.fechaHora.toISOString() : null,
      salida: t.salida ? t.salida.fechaHora.toISOString() : null,
      horas: redondear_(h, 2),
      problema,
    };
  });
  horas = redondear_(horas, 2);
  const valor = Number(e.valor) || 0;
  let calculado = 0, explicacion = '';
  switch (e.formaPago) {
    case 'hora':
      calculado = horas * valor;
      explicacion = `${fmtHoras_(horas)} × ${fmtPesos_(valor)} la hora`;
      break;
    case 'mensual':
      if (e.creado && mes < mesDe_(e.creado) && !turnos.length) {
        explicacion = 'Todavía no estaba en el equipo';
      } else {
        calculado = valor;
        explicacion = `Sueldo fijo mensual (${fmtHoras_(horas)} registradas)`;
      }
      break;
    case 'semanal': {
      const hs = Number(e.horasSemana) || 0;
      if (hs > 0) {
        calculado = horas * valor / hs;
        explicacion = `${fmtHoras_(horas)} × ${fmtPesos_(valor / hs)} la hora (${fmtPesos_(valor)} por semana de ${hs} h)`;
      } else {
        calculado = 0;
        explicacion = 'Falta cargar las horas semanales para calcular';
      }
      break;
    }
    case 'evento':
      calculado = eventos * valor;
      explicacion = `${eventos} evento${eventos === 1 ? '' : 's'} × ${fmtPesos_(valor)}`;
      break;
  }
  calculado = Math.round(calculado);
  const ajs = ajustes.filter(a => a.empleadoId === e.id && a.mes === mes)
    .map(a => ({ id: a.id, monto: a.monto, concepto: a.concepto }));
  const totalAjustes = ajs.reduce((a, x) => a + x.monto, 0);
  return {
    empleadoId: e.id, nombre: e.nombre, area: e.area, activo: e.activo, telefono: e.telefono,
    formaPago: e.formaPago, formaPagoTexto: FORMAS_PAGO[e.formaPago] || e.formaPago, valor, horasSemana: e.horasSemana,
    horas, dias: Object.keys(dias).length, eventos, sinSalida,
    calculado, explicacion, ajustes: ajs, totalAjustes, total: calculado + totalAjustes,
    turnos: detalle.reverse(),
  };
}

/* ───────────────────────── Lectura de hojas ───────────────────────── */

function hoja_(nombre) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sh) throw new Error(`Falta la hoja "${nombre}". Ejecutá setup() desde el editor de Apps Script.`);
  return sh;
}

function filas_(nombre) {
  const vals = hoja_(nombre).getDataRange().getValues();
  const enc = vals[0];
  return vals.slice(1).map((r, i) => {
    const o = { _fila: i + 2 };
    enc.forEach((k, j) => o[k] = r[j]);
    return o;
  }).filter(o => o.id !== '' && o.id != null);
}

function empleados_() {
  return filas_('Empleados').map(e => ({
    _fila: e._fila, id: String(e.id), nombre: String(e.nombre).trim(), pin: String(e.pin).trim().padStart(4, '0'),
    area: String(e.area || ''), formaPago: String(e.formaPago || 'hora'), valor: Number(e.valor) || 0,
    horasSemana: e.horasSemana === '' ? '' : Number(e.horasSemana), telefono: String(e.telefono || ''),
    activo: e.activo === true || String(e.activo).toUpperCase() === 'TRUE' || String(e.activo).toUpperCase() === 'SI',
    notas: String(e.notas || ''), creado: e.creado instanceof Date ? e.creado : null,
  }));
}

function marcajes_() {
  return filas_('Marcajes').map(m => ({
    id: String(m.id), empleadoId: String(m.empleadoId), nombre: String(m.nombre), tipo: String(m.tipo).toUpperCase(),
    fechaHora: m.fechaHora instanceof Date ? m.fechaHora : new Date(m.fechaHora),
    distancia: m.distancia, precision: m.precision, origen: String(m.origen || ''), nota: String(m.nota || ''),
  })).filter(m => !isNaN(m.fechaHora));
}

function ajustes_() {
  return filas_('Ajustes').map(a => ({
    id: String(a.id), mes: a.mes instanceof Date ? Utilities.formatDate(a.mes, TZ, 'yyyy-MM') : String(a.mes),
    empleadoId: String(a.empleadoId), monto: Number(a.monto) || 0, concepto: String(a.concepto || ''),
  }));
}

function config_() {
  const c = {};
  hoja_('Config').getDataRange().getValues().slice(1).forEach(r => { if (r[0]) c[r[0]] = r[1]; });
  ['centroLat', 'centroLng'].forEach(k => { if (c[k] == null) c[k] = ''; c[k] = String(c[k]).trim(); });
  return c;
}

function borrarPorId_(nombreHoja, id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = hoja_(nombreHoja);
    const vals = sh.getDataRange().getValues();
    for (let i = 1; i < vals.length; i++) {
      if (String(vals[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok: true }; }
    }
    return { ok: false, error: 'No se encontró el registro.' };
  } finally {
    lock.releaseLock();
  }
}

/* ───────────────────────── Utilidades ───────────────────────── */

function uid_() { return Utilities.getUuid().slice(0, 8); }

function pinNuevo_(usados) {
  let p;
  do { p = String(Math.floor(1000 + Math.random() * 9000)); } while (usados[p]);
  usados[p] = true;
  return p;
}

function mesActual_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM'); }
function mesDe_(fecha) { return Utilities.formatDate(fecha, TZ, 'yyyy-MM'); }
function diaDe_(fecha) { return Utilities.formatDate(fecha, TZ, 'yyyy-MM-dd'); }

/** "2026-10-04T14:30" en hora de Argentina → Date. */
function parseLocal_(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  // Argentina no tiene horario de verano: UTC-3 fijo.
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 3, +m[5]));
  return isNaN(d) ? null : d;
}

function distanciaM_(lat1, lng1, lat2, lng2) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad, dLng = (lng2 - lng1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function redondear_(n, d) { const f = Math.pow(10, d); return Math.round(n * f) / f; }
function formatoDist_(m) { return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : m + ' m'; }
function fmtPesos_(n) { return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function fmtHoras_(h) {
  const tot = Math.round(h * 60);
  return `${Math.floor(tot / 60)} h ${String(tot % 60).padStart(2, '0')} min`;
}
