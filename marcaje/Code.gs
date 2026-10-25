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
  Empleados: ['id', 'nombre', 'pin', 'area', 'formaPago', 'valor', 'horasSemana', 'telefono', 'activo', 'notas', 'creado', 'valorEvento'],
  Marcajes:  ['id', 'empleadoId', 'nombre', 'tipo', 'fechaHora', 'lat', 'lng', 'distancia', 'precision', 'origen', 'nota'],
  Config:    ['clave', 'valor', 'descripcion'],
  Ajustes:   ['id', 'mes', 'empleadoId', 'nombre', 'monto', 'concepto', 'creado'],
  Pagos:     ['id', 'mes', 'fecha', 'empleadoId', 'nombre', 'tipo', 'monto', 'nota', 'creado'],
  Tareas:    ['id', 'fecha', 'empleadoId', 'nombre', 'hechas', 'pendientes', 'creado'],
  Desafios:  ['id', 'titulo', 'detalle', 'premio', 'para', 'vence', 'estado', 'empleadoId', 'nombre', 'tomado', 'hecho', 'foto', 'mes', 'creado'],
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

/** Ejecutar UNA vez desde el editor después de actualizar: pide permiso para guardar las fotos de los desafíos en Drive. */
function autorizarFotos() {
  DriveApp.getRootFolder();
  hojaOCrear_('Desafios');
  hojaOCrear_('Pagos');
  hojaOCrear_('Tareas');
  SpreadsheetApp.getActive().toast('Listo: permisos dados y hojas creadas.', 'Aldea — Marcaje', 6);
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
      tomarDesafio: accTomarDesafio_,
      soltarDesafio: accSoltarDesafio_,
      terminarDesafio: accTerminarDesafio_,
      guardarDesafio: conAdmin_(accGuardarDesafio_),
      borrarDesafio: conAdmin_(accBorrarDesafio_),
      revisarDesafio: conAdmin_(accRevisarDesafio_),
      guardarPago: conAdmin_(accGuardarPago_),
      borrarPago: conAdmin_(accBorrarPago_),
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
    empleado: { id: e.id, nombre: e.nombre, area: e.area, formaPago: e.formaPago, formaPagoTexto: FORMAS_PAGO[e.formaPago] || e.formaPago, valor: e.valor, horasSemana: e.horasSemana, tareas: e.tareas, marcaFuera: e.marcaFuera },
    adentro: !!abierto,
    desde: abierto ? abierto.fechaHora.toISOString() : null,
    ahora: new Date().toISOString(),
    mes,
    liquidacion: liq,
    desafios: desafiosDe_(e),
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
    // Trabajo fuera del predio (desde casa, traslados, compras): solo para quien lo tenga habilitado.
    const motivoFuera = e.marcaFuera && d.fuera ? String(d.motivo || '').trim() : '';
    if (e.marcaFuera && d.fuera && !motivoFuera) return { ok: false, error: 'Contá qué trabajo hiciste fuera de Aldea.' };
    const lat = Number(d.lat), lng = Number(d.lng);
    const hayGps = isFinite(lat) && isFinite(lng) && !(lat === 0 && lng === 0) && d.lat != null;
    if (!hayGps && !motivoFuera) {
      return { ok: false, error: 'No llegó tu ubicación. Activá el GPS y probá de nuevo.' };
    }
    const radio = Number(cfg.radio) || 100;
    const dist = hayGps ? Math.round(distanciaM_(lat, lng, Number(cfg.centroLat), Number(cfg.centroLng))) : '';
    if (!motivoFuera && dist > radio) {
      return { ok: false, fuera: true, distancia: dist, radio, puedeFuera: !!e.marcaFuera,
        error: `Estás a ${formatoDist_(dist)} de Aldea. Para marcar tenés que estar a menos de ${radio} m.` };
    }
    const abierto = turnoAbierto_(marcajes_(), e.id);
    const tipo = abierto ? 'SALIDA' : 'ENTRADA';
    if (d.esperado && d.esperado !== tipo) {
      // El celular mostraba un estado viejo (por ejemplo, marcó desde otro teléfono).
      return { ok: false, refrescar: true, error: tipo === 'SALIDA' ? 'Ya tenías la entrada marcada. Revisá y marcá la salida.' : 'Ya tenías la salida marcada. Revisá y marcá la entrada.' };
    }
    const ahora = new Date();
    hoja_('Marcajes').appendRow([uid_(), e.id, e.nombre, tipo, ahora, hayGps ? lat : '', hayGps ? lng : '', dist,
      hayGps ? Math.round(Number(d.precision) || 0) : '', motivoFuera ? 'fuera' : 'gps', motivoFuera]);
    // Lista de tareas del día: se registra al marcar la salida.
    if (tipo === 'SALIDA' && e.tareas.length && d.tareas) {
      const hechas = (d.tareas.hechas || []).map(String).filter(t => e.tareas.includes(t));
      const pendientes = e.tareas.filter(t => !hechas.includes(t));
      hojaOCrear_('Tareas').appendRow([uid_(), "'" + diaDe_(abierto.fechaHora), e.id, e.nombre, hechas.join(' | '), pendientes.join(' | '), ahora]);
    }
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
    config: { centroLat: cfg.centroLat, centroLng: cfg.centroLng, radio: Number(cfg.radio) || 100, direccion: cfg.direccion, nombreLugar: cfg.nombreLugar, diasEvento: Array.from(diasEvento_()), diasLibres: listaConfig_('diasLibres') },
    liquidacionGuardada: !!guardada,
    formasPago: FORMAS_PAGO,
    desafios: desafios_().filter(x => x.estado === 'abierto' || x.estado === 'tomado' || x.estado === 'hecho' || x.mes === mes)
      .map(x => Object.assign({}, x, { _fila: undefined })),
    topeDesafios: topeDesafios_(),
    usadoDesafios: desafios_().filter(x => x.estado === 'aprobado' && x.mes === mes).reduce((a, x) => a + x.premio, 0),
    premioPresentismo: premioPresentismo_(),
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
    const valorEvento = (x.formaPago === 'hora' || x.formaPago === 'mensual') && x.valorEvento !== '' && x.valorEvento != null ? Number(x.valorEvento) : '';
    if (valorEvento !== '' && !(valorEvento >= 0)) return { ok: false, error: 'El valor por hora en eventos tiene que ser un número.' };
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
    const colEv = columna_(sh, 'valorEvento');
    const filaN = idx >= 0 ? emps[idx]._fila : sh.getLastRow();
    sh.getRange(filaN, colEv).setValue(valorEvento);
    // Horario esperado, para avisar faltas y llegadas tarde.
    const dias = String(x.horarioDias || '').split(',').filter(dd => DIAS_LETRA.includes(dd)).join(',');
    const entrada = /^\d{2}:\d{2}$/.test(x.horarioEntrada || '') ? x.horarioEntrada : '';
    const salida = /^\d{2}:\d{2}$/.test(x.horarioSalida || '') ? x.horarioSalida : '';
    const antes = idx >= 0 ? emps[idx] : {};
    const cambio = dias !== (antes.horarioDias || '') || entrada !== (antes.horarioEntrada || '');
    const tareas = String(x.tareas || '').split('\n').map(t => t.trim()).filter(Boolean).slice(0, 15).join('\n');
    sh.getRange(filaN, columna_(sh, 'tareas')).setNumberFormat('@').setValue(tareas);
    sh.getRange(filaN, columna_(sh, 'marcaFuera')).setValue(x.marcaFuera === true);
    const valores = { horarioDias: dias, horarioEntrada: entrada, horarioSalida: salida,
      horarioDesde: !dias || !entrada ? '' : cambio ? diaDe_(new Date()) : (antes.horarioDesde || diaDe_(new Date())) };
    Object.keys(valores).forEach(k => sh.getRange(filaN, columna_(sh, k)).setNumberFormat('@').setValue(valores[k]));
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

function accGuardarPago_(d) {
  const e = empleados_().find(x => x.id === d.empleadoId);
  if (!e) return { ok: false, error: 'Empleado no encontrado.' };
  const monto = Number(d.monto);
  if (!(monto > 0)) return { ok: false, error: 'Poné el monto que se pagó.' };
  if (!/^\d{4}-\d{2}$/.test(d.mes || '')) return { ok: false, error: 'Mes inválido.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha || '')) return { ok: false, error: 'Fecha inválida.' };
  const tipo = d.tipo === 'Pago de sueldo' ? 'Pago de sueldo' : 'Adelanto';
  const sh = hojaOCrear_('Pagos');
  sh.appendRow([uid_(), "'" + d.mes, "'" + d.fecha, e.id, e.nombre, tipo, monto, String(d.nota || '').trim(), new Date()]);
  return { ok: true };
}

function accBorrarPago_(d) { return borrarPorId_('Pagos', d.id); }

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
  if ('topeDesafios' in c) cambios.topeDesafios = Math.max(0, Math.round(Number(c.topeDesafios) || 0));
  if ('premioPresentismo' in c) cambios.premioPresentismo = Math.max(0, Math.round(Number(c.premioPresentismo) || 0));
  ['diasEvento', 'diasLibres'].forEach(k => {
    if (!(k in c)) return;
    const lista = (Array.isArray(c[k]) ? c[k] : []).map(String).filter(f => /^\d{4}-\d{2}-\d{2}$/.test(f));
    cambios[k] = Array.from(new Set(lista)).sort().join(',');
  });
  if ('pinAdminNuevo' in c) {
    if (!/^\d{4,8}$/.test(String(c.pinAdminNuevo))) return { ok: false, error: 'El PIN de administrador tiene que ser de 4 a 8 números.' };
    cambios.pinAdmin = String(c.pinAdminNuevo);
  }
  const sh = hoja_('Config');
  const vals = sh.getDataRange().getValues();
  Object.keys(cambios).forEach(k => {
    const i = vals.findIndex(r => r[0] === k);
    if (i >= 1) sh.getRange(i + 1, 2).setValue(String(cambios[k]));
    else sh.appendRow([k, String(cambios[k]), k === 'diasEvento' ? 'Días de evento además de sábados y domingos (AAAA-MM-DD separados por coma).' : k === 'diasLibres' ? 'Feriados y días libres: no cuentan como falta.' : '']);
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
  const enc = ['Empleado', 'Área', 'Forma de pago', 'Valor', 'Horas', 'Días', 'Eventos', 'Calculado', 'Ajustes', 'Total a pagar', 'Turnos sin salida', 'Detalle ajustes', 'Horas de evento', 'Valor hora evento', 'Cálculo', 'Ya pagado', 'Saldo a pagar', 'Faltas', 'Llegadas tarde', 'Desafíos', 'Presentismo'];
  const filas = liq.map(l => [l.nombre, l.area, l.formaPagoTexto, l.valor, l.horas, l.dias, l.eventos, l.calculado, l.totalAjustes, l.total, l.sinSalida,
    l.ajustes.map(a => `${a.concepto}: ${a.monto}`).join(' · '), l.horasEvento || '', l.valorEvento || '', l.explicacion, l.pagado, l.saldo,
    l.asistencia ? l.asistencia.faltas.length : '', l.asistencia ? l.asistencia.tardes.length : '',
    l.totalDesafios || '', l.presentismo ? l.presentismo.monto : '']);
  const total = liq.reduce((a, l) => a + l.total, 0);
  sh.appendRow(enc);
  if (filas.length) sh.getRange(2, 1, filas.length, enc.length).setValues(filas);
  sh.appendRow(['TOTAL', '', '', '', '', '', '', '', '', total, '', '', '', '', '',
    liq.reduce((a, l) => a + l.pagado, 0), liq.reduce((a, l) => a + l.saldo, 0), '', '', '', '']);
  sh.appendRow(['Guardado el ' + Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm')]);
  sh.getRange(1, 1, 1, enc.length).setFontWeight('bold').setBackground('#E3EDE4');
  sh.getRange(filas.length + 2, 1, 1, enc.length).setFontWeight('bold');
  sh.getRange(2, 4, filas.length + 1, 1).setNumberFormat('$#,##0');
  sh.getRange(2, 8, filas.length + 1, 3).setNumberFormat('$#,##0');
  sh.getRange(2, 16, filas.length + 1, 2).setNumberFormat('$#,##0');
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
  let horas = 0, horasEvento = 0, eventos = 0, sinSalida = 0;
  const dias = {};
  // Por hora: las horas de evento se pagan a otro valor. Mensual: se pagan aparte, además del sueldo fijo.
  const tarifaEvento = (e.formaPago === 'hora' || e.formaPago === 'mensual') && Number(e.valorEvento) > 0;
  const detalle = turnos.map(t => {
    const h = t.entrada && t.salida ? (t.salida.fechaHora - t.entrada.fechaHora) / 3600000 : 0;
    // Turno de evento: empezó un sábado, domingo o un día marcado como evento. Va entero a la tarifa de evento.
    const esEvento = tarifaEvento && !!t.entrada && esDiaEvento_(t.entrada.fechaHora);
    // Viernes común: solo las horas desde las 23 h se pagan como evento.
    let hEv = esEvento ? h : 0;
    if (tarifaEvento && !esEvento && t.entrada && t.salida && Utilities.formatDate(t.entrada.fechaHora, TZ, 'u') === '5') {
      const corte = parseLocal_(diaDe_(t.entrada.fechaHora) + 'T' + String(HORA_VIERNES_NOCHE).padStart(2, '0') + ':00');
      if (t.salida.fechaHora > corte) hEv = (t.salida.fechaHora - Math.max(corte, t.entrada.fechaHora)) / 3600000;
    }
    horas += h;
    horasEvento += hEv;
    if (t.entrada && !t.enCurso) eventos++;
    if (t.entrada) dias[diaDe_(t.entrada.fechaHora)] = true;
    const problema = t.enCurso ? 'en curso' : !t.salida ? 'sin salida' : !t.entrada ? 'sin entrada' : '';
    if (problema === 'sin salida' || problema === 'sin entrada') sinSalida++;
    return {
      entrada: t.entrada ? t.entrada.fechaHora.toISOString() : null,
      salida: t.salida ? t.salida.fechaHora.toISOString() : null,
      horas: redondear_(h, 2),
      problema,
      evento: hEv > 0,
    };
  });
  horas = redondear_(horas, 2);
  horasEvento = redondear_(horasEvento, 2);
  const valor = Number(e.valor) || 0;
  let calculado = 0, explicacion = '';
  switch (e.formaPago) {
    case 'hora':
      if (tarifaEvento && horasEvento > 0) {
        const comunes = redondear_(horas - horasEvento, 2), ve = Number(e.valorEvento);
        calculado = comunes * valor + horasEvento * ve;
        explicacion = `${fmtHoras_(comunes)} comunes × ${fmtPesos_(valor)} + ${fmtHoras_(horasEvento)} de fin de semana/evento × ${fmtPesos_(ve)}`;
      } else {
        calculado = horas * valor;
        explicacion = `${fmtHoras_(horas)} × ${fmtPesos_(valor)} la hora`;
      }
      break;
    case 'mensual':
      if (e.creado && mes < mesDe_(e.creado) && !turnos.length) {
        explicacion = 'Todavía no estaba en el equipo';
      } else if (tarifaEvento && horasEvento > 0) {
        const ve = Number(e.valorEvento);
        calculado = valor + horasEvento * ve;
        explicacion = `Sueldo fijo ${fmtPesos_(valor)} + ${fmtHoras_(horasEvento)} de fin de semana/evento × ${fmtPesos_(ve)}`;
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
  const pagos = pagos_().filter(p => p.empleadoId === e.id && p.mes === mes)
    .sort((a, b) => a.fecha.localeCompare(b.fecha)).map(p => ({ id: p.id, fecha: p.fecha, tipo: p.tipo, monto: p.monto, nota: p.nota }));
  const pagado = pagos.reduce((a, p) => a + p.monto, 0);
  const desafiosGanados = desafios_().filter(x => x.estado === 'aprobado' && x.empleadoId === e.id && x.mes === mes)
    .map(x => ({ titulo: x.titulo, premio: x.premio, fecha: x.hecho }));
  const totalDesafios = desafiosGanados.reduce((a, x) => a + x.premio, 0);
  const presentismo = presentismo_(e, mes, marcajes);
  const total = calculado + totalAjustes + totalDesafios + (presentismo ? presentismo.monto : 0);
  return {
    empleadoId: e.id, nombre: e.nombre, area: e.area, activo: e.activo, telefono: e.telefono,
    formaPago: e.formaPago, formaPagoTexto: FORMAS_PAGO[e.formaPago] || e.formaPago, valor, horasSemana: e.horasSemana,
    valorEvento: tarifaEvento ? Number(e.valorEvento) : '', horasEvento,
    horas, dias: Object.keys(dias).length, eventos, sinSalida,
    calculado, explicacion, ajustes: ajs, totalAjustes, total,
    pagos, pagado, saldo: total - pagado,
    desafios: desafiosGanados, totalDesafios, presentismo,
    tareas: resumenTareas_(e, mes),
    asistencia: asistencia_(e, mes, marcajes),
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
    valorEvento: e.valorEvento === '' || e.valorEvento == null ? '' : Number(e.valorEvento),
    horarioDias: String(e.horarioDias || ''), horarioEntrada: hhmm_(e.horarioEntrada), horarioSalida: hhmm_(e.horarioSalida),
    horarioDesde: e.horarioDesde instanceof Date ? diaDe_(e.horarioDesde) : String(e.horarioDesde || ''),
    tareas: String(e.tareas || '').split('\n').map(t => t.trim()).filter(Boolean),
    marcaFuera: e.marcaFuera === true || String(e.marcaFuera).toUpperCase() === 'TRUE',
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

let _pagos = null;
function pagos_() {
  if (_pagos) return _pagos;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pagos');
  if (!sh) return (_pagos = []);
  _pagos = filas_('Pagos').map(p => ({
    id: String(p.id), mes: p.mes instanceof Date ? Utilities.formatDate(p.mes, TZ, 'yyyy-MM') : String(p.mes),
    fecha: p.fecha instanceof Date ? diaDe_(p.fecha) : String(p.fecha),
    empleadoId: String(p.empleadoId), tipo: String(p.tipo || 'Adelanto'), monto: Number(p.monto) || 0, nota: String(p.nota || ''),
  }));
  return _pagos;
}

function hojaOCrear_(nombre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(HOJAS[nombre]);
    sh.getRange(1, 1, 1, HOJAS[nombre].length).setFontWeight('bold').setBackground('#E3EDE4');
    sh.setFrozenRows(1);
  }
  return sh;
}

function listaConfig_(clave) {
  return String(config_()[clave] || '').split(',').map(x => x.trim()).filter(Boolean);
}

function hhmm_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'HH:mm');
  const s = String(v || '').trim();
  return /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, '0') : '';
}

/* ───────────────────────── Asistencia (faltas y llegadas tarde) ───────────────────────── */
const DIAS_LETRA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];   // lunes … domingo

/** Datos para comparar el horario esperado de un empleado con lo que marcó. */
function contextoAsistencia_(e, marcajes) {
  const [hE, mE] = e.horarioEntrada.split(':').map(Number);
  const primeras = {};
  marcajes.filter(m => m.empleadoId === e.id && m.tipo === 'ENTRADA').forEach(m => {
    const d = diaDe_(m.fechaHora);
    if (!primeras[d] || m.fechaHora < primeras[d]) primeras[d] = m.fechaHora;
  });
  return { dias: e.horarioDias.split(','), esperado: hE * 60 + mE, primeras,
    tolerancia: Number(config_().toleranciaMin) || 10, libres: listaConfig_('diasLibres'), desde: e.horarioDesde || '' };
}

/** null = ese día no le tocaba trabajar; si no { ok | falta | tarde, minutos, hora }. */
function evaluarDia_(ctx, f) {
  if (ctx.desde && f < ctx.desde) return null;
  if (ctx.libres.includes(f)) return null;
  const [y, m, d] = f.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 15)).getUTCDay();          // 0 = domingo
  if (!ctx.dias.includes(DIAS_LETRA[(dow + 6) % 7])) return null;
  const ent = ctx.primeras[f];
  if (!ent) return { estado: 'falta' };
  const real = Number(Utilities.formatDate(ent, TZ, 'H')) * 60 + Number(Utilities.formatDate(ent, TZ, 'm'));
  const minutos = real - ctx.esperado;
  return minutos > ctx.tolerancia ? { estado: 'tarde', minutos, hora: Utilities.formatDate(ent, TZ, 'HH:mm') } : { estado: 'ok' };
}

function sumarDias_(f, n) {
  const [y, m, d] = f.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n, 15)).toISOString().slice(0, 10);
}

/** Compara el horario esperado de un empleado con sus entradas del mes. */
function asistencia_(e, mes, marcajes) {
  if (!e.horarioDias || !e.horarioEntrada) return null;
  const ctx = contextoAsistencia_(e, marcajes);
  const hoy = diaDe_(new Date());
  const ahoraMin = Number(Utilities.formatDate(new Date(), TZ, 'H')) * 60 + Number(Utilities.formatDate(new Date(), TZ, 'm'));
  const faltas = [], tardes = [];
  let hoyNoLlego = false;
  for (let f = mes + '-01'; f.slice(0, 7) === mes && f <= hoy; f = sumarDias_(f, 1)) {
    const r = evaluarDia_(ctx, f);
    if (!r) continue;
    if (r.estado === 'falta') {
      if (f < hoy) faltas.push(f);
      else if (ahoraMin > ctx.esperado + ctx.tolerancia) hoyNoLlego = true;
    } else if (r.estado === 'tarde') tardes.push({ fecha: f, minutos: r.minutos, hora: r.hora });
  }
  const nombres = { L: 'lun', M: 'mar', X: 'mié', J: 'jue', V: 'vie', S: 'sáb', D: 'dom' };
  const txtDias = e.horarioDias === 'L,M,X,J,V' ? 'lunes a viernes' : ctx.dias.map(dd => nombres[dd]).join(', ');
  return { faltas, tardes, hoyNoLlego, horario: `entra ${txtDias} a las ${e.horarioEntrada}` };
}

/* ───────────────────────── Lista de tareas diarias ───────────────────────── */
let _tareas = null;
function registrosTareas_() {
  if (_tareas) return _tareas;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Tareas');
  if (!sh) return (_tareas = []);
  const lista = v => String(v || '').split(' | ').map(t => t.trim()).filter(Boolean);
  _tareas = filas_('Tareas').map(t => ({ fecha: t.fecha instanceof Date ? diaDe_(t.fecha) : String(t.fecha),
    empleadoId: String(t.empleadoId), hechas: lista(t.hechas), pendientes: lista(t.pendientes) }));
  return _tareas;
}

function resumenTareas_(e, mes) {
  if (!e.tareas || !e.tareas.length) return null;
  const regs = registrosTareas_().filter(t => t.empleadoId === e.id && t.fecha.slice(0, 7) === mes)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return {
    lista: e.tareas, dias: regs.length, completos: regs.filter(t => !t.pendientes.length).length,
    incompletos: regs.filter(t => t.pendientes.length).slice(0, 10).map(t => ({ fecha: t.fecha, pendientes: t.pendientes })),
  };
}

/* ───────────────────────── Premio presentismo (semanal) ───────────────────────── */
function premioPresentismo_() {
  const v = config_().premioPresentismo;
  return v === '' || v == null ? 6000 : Number(v) || 0;
}

/**
 * Por cada semana (lunes a domingo) que terminó dentro del mes: si le tocaba trabajar algún día,
 * no faltó, no llegó tarde, no dejó turnos sin salida ni necesitó correcciones a mano → gana el premio.
 */
function presentismo_(e, mes, marcajes) {
  const premio = premioPresentismo_();
  if (!premio || !e.horarioDias || !e.horarioEntrada) return null;
  const ctx = contextoAsistencia_(e, marcajes);
  const hoy = diaDe_(new Date());
  const propios = marcajes.filter(m => m.empleadoId === e.id);
  const turnos = turnos_(marcajes, e.id);
  const semanas = [];
  for (let f = mes + '-01'; f.slice(0, 7) === mes; f = sumarDias_(f, 1)) {
    const [y, m, d] = f.split('-').map(Number);
    if (new Date(Date.UTC(y, m - 1, d, 15)).getUTCDay() !== 0) continue;   // domingos que cierran la semana
    if (f >= hoy) break;
    const lunes = sumarDias_(f, -6);
    let tocaba = 0, ok = true, motivo = '';
    for (let x = lunes; x <= f; x = sumarDias_(x, 1)) {
      const r = evaluarDia_(ctx, x);
      if (!r) continue;
      tocaba++;
      if (r.estado !== 'ok') { ok = false; motivo = r.estado === 'falta' ? 'faltó' : 'llegó tarde'; }
    }
    if (!tocaba) continue;
    const enSemana = fh => { const dd = diaDe_(fh); return dd >= lunes && dd <= f; };
    if (ok && propios.some(mm => mm.origen === 'manual' && enSemana(mm.fechaHora))) { ok = false; motivo = 'se olvidó de marcar'; }
    if (ok && turnos.some(t => (!t.salida || !t.entrada) && !t.enCurso && enSemana((t.entrada || t.salida).fechaHora))) { ok = false; motivo = 'turno sin salida'; }
    semanas.push({ desde: lunes, hasta: f, gana: ok, motivo });
  }
  if (!semanas.length) return null;
  const ganadas = semanas.filter(x => x.gana).length;
  return { semanas, ganadas, premio, monto: ganadas * premio };
}

/* ───────────────────────── Desafíos ───────────────────────── */
let _desafios = null;
function desafios_() {
  if (_desafios) return _desafios;
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Desafios');
  if (!sh) return (_desafios = []);
  const fecha = v => v instanceof Date ? diaDe_(v) : String(v || '');
  _desafios = filas_('Desafios').map(x => ({
    _fila: x._fila, id: String(x.id), titulo: String(x.titulo || ''), detalle: String(x.detalle || ''), premio: Number(x.premio) || 0,
    para: String(x.para || 'todos'), vence: fecha(x.vence), estado: String(x.estado || 'abierto'),
    empleadoId: String(x.empleadoId || ''), nombre: String(x.nombre || ''),
    tomado: x.tomado instanceof Date ? x.tomado.toISOString() : String(x.tomado || ''),
    hecho: x.hecho instanceof Date ? x.hecho.toISOString() : String(x.hecho || ''),
    foto: String(x.foto || ''), mes: x.mes instanceof Date ? Utilities.formatDate(x.mes, TZ, 'yyyy-MM') : String(x.mes || ''),
  }));
  return _desafios;
}

function topeDesafios_() {
  const v = config_().topeDesafios;
  return v === '' || v == null ? 100000 : Number(v) || 0;
}

function paraEmpleado_(x, e) {
  return x.para === 'todos' || x.para === 'area:' + e.area || x.para === 'emp:' + e.id;
}

/** Lo que ve el empleado: los abiertos que le corresponden y los que tomó él. */
function desafiosDe_(e) {
  const hoy = diaDe_(new Date());
  const mes = mesActual_();
  return desafios_().filter(x =>
    (x.estado === 'abierto' && paraEmpleado_(x, e) && (!x.vence || x.vence >= hoy)) ||
    (x.empleadoId === e.id && (x.estado === 'tomado' || x.estado === 'hecho' || (x.mes === mes && (x.estado === 'aprobado' || x.estado === 'rechazado')))))
    .map(x => ({ id: x.id, titulo: x.titulo, detalle: x.detalle, premio: x.premio, vence: x.vence, estado: x.estado, mio: x.empleadoId === e.id }));
}

function escribirDesafio_(x, cambios) {
  const sh = hoja_('Desafios');
  const enc = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  Object.keys(cambios).forEach(k => {
    const col = enc.indexOf(k) + 1;
    const v = cambios[k];
    const celda = sh.getRange(x._fila, col);
    if (k === 'mes') celda.setNumberFormat('@');
    celda.setValue(v);
  });
}

function conDesafio_(d, fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    _desafios = null;
    const x = desafios_().find(y => y.id === String(d.id));
    if (!x) return { ok: false, error: 'Ese desafío ya no existe.' };
    return fn(x);
  } finally {
    lock.releaseLock();
  }
}

function accTomarDesafio_(d) {
  const e = validarEmpleado_(d);
  return conDesafio_(d, x => {
    if (x.estado !== 'abierto') return { ok: false, error: 'Uy, otro ya lo tomó.', refrescar: true };
    if (!paraEmpleado_(x, e)) return { ok: false, error: 'Este desafío no es para vos.' };
    if (x.vence && x.vence < diaDe_(new Date())) return { ok: false, error: 'Este desafío ya venció.' };
    escribirDesafio_(x, { estado: 'tomado', empleadoId: e.id, nombre: e.nombre, tomado: new Date() });
    return { ok: true };
  });
}

function accSoltarDesafio_(d) {
  const e = validarEmpleado_(d);
  return conDesafio_(d, x => {
    if (x.empleadoId !== e.id || x.estado !== 'tomado') return { ok: false, error: 'No podés soltar este desafío.' };
    escribirDesafio_(x, { estado: 'abierto', empleadoId: '', nombre: '', tomado: '' });
    return { ok: true };
  });
}

function accTerminarDesafio_(d) {
  const e = validarEmpleado_(d);
  return conDesafio_(d, x => {
    if (x.empleadoId !== e.id || x.estado !== 'tomado') return { ok: false, error: 'Primero tomá el desafío.' };
    let foto = '';
    if (d.foto) {
      try { foto = guardarFoto_(d.foto, `${diaDe_(new Date())} ${e.nombre} - ${x.titulo}.jpg`); }
      catch (err) { foto = ''; }
    }
    escribirDesafio_(x, { estado: 'hecho', hecho: new Date(), foto });
    return { ok: true, conFoto: !!foto };
  });
}

/** Guarda la foto (base64 JPEG) en la carpeta "Aldea — Fotos de desafíos" del Drive y devuelve el link. */
function guardarFoto_(base64, nombre) {
  const datos = String(base64).replace(/^data:image\/\w+;base64,/, '');
  const blob = Utilities.newBlob(Utilities.base64Decode(datos), 'image/jpeg', nombre);
  const carpetas = DriveApp.getFoldersByName('Aldea — Fotos de desafíos');
  const carpeta = carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder('Aldea — Fotos de desafíos');
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?sz=w800&id=' + archivo.getId();
}

function accGuardarDesafio_(d) {
  const x = d.desafio || {};
  const titulo = String(x.titulo || '').trim();
  if (!titulo) return { ok: false, error: 'Poné qué hay que hacer.' };
  const premio = Math.round(Number(x.premio));
  if (!(premio > 0)) return { ok: false, error: 'Poné el premio.' };
  const para = /^(todos|area:.+|emp:.+)$/.test(String(x.para || '')) ? String(x.para) : 'todos';
  const vence = /^\d{4}-\d{2}-\d{2}$/.test(x.vence || '') ? x.vence : '';
  const sh = hojaOCrear_('Desafios');
  const veces = Math.min(Math.max(Number(x.veces) || 1, 1), 10);   // el mismo desafío para varias personas
  for (let i = 0; i < veces; i++) {
    sh.appendRow([uid_(), titulo, String(x.detalle || '').trim(), premio, para, vence ? "'" + vence : '', 'abierto', '', '', '', '', '', '', new Date()]);
  }
  return { ok: true };
}

function accBorrarDesafio_(d) { return borrarPorId_('Desafios', d.id); }

function accRevisarDesafio_(d) {
  return conDesafio_(d, x => {
    if (x.estado !== 'hecho') return { ok: false, error: 'Ese desafío no está esperando aprobación.' };
    if (!d.aprobar) { escribirDesafio_(x, { estado: 'rechazado', mes: mesActual_() }); return { ok: true }; }
    const mes = mesActual_();
    const usado = desafios_().filter(y => y.estado === 'aprobado' && y.mes === mes).reduce((a, y) => a + y.premio, 0);
    const tope = topeDesafios_();
    if (tope && usado + x.premio > tope && !d.forzar) {
      return { ok: false, superaTope: true, error: `Con este premio te pasás del tope del mes (${fmtPesos_(usado)} de ${fmtPesos_(tope)} usados).` };
    }
    escribirDesafio_(x, { estado: 'aprobado', mes });
    return { ok: true };
  });
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

/* Días de evento: sábados y domingos siempre, más los días que marca el administrador (Config → diasEvento),
   en los que solo cuentan los turnos que empiezan a la noche. */
let _diasEvento = null;
function diasEvento_() {
  if (!_diasEvento) _diasEvento = new Set(String(config_().diasEvento || '').split(',').map(x => x.trim()).filter(Boolean));
  return _diasEvento;
}
const HORA_EVENTO_NOCHE = 16;
const HORA_VIERNES_NOCHE = 23;   // los viernes comunes, las horas desde esta hora se pagan como evento   // en los días marcados (viernes), solo cuentan los turnos que empiezan desde esta hora
function esDiaEvento_(fecha) {
  const dow = Number(Utilities.formatDate(fecha, TZ, 'u'));   // 1 = lunes … 7 = domingo
  if (dow >= 6) return true;
  return diasEvento_().has(diaDe_(fecha)) && Number(Utilities.formatDate(fecha, TZ, 'H')) >= HORA_EVENTO_NOCHE;
}

/* Número de columna de un encabezado; si no existe, lo agrega al final. */
function columna_(sh, nombre) {
  const enc = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  let i = enc.indexOf(nombre);
  if (i < 0) { i = enc.length; sh.getRange(1, i + 1).setValue(nombre).setFontWeight('bold').setBackground('#E3EDE4'); }
  return i + 1;
}

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
