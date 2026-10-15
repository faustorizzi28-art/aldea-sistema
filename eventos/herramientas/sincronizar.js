// Mantiene Index.html en sintonía con Code.gs y genera las copias para pegar en Apps Script.
// Uso (desde la raíz del repo):  node eventos/herramientas/sincronizar.js
//   · copia la función cotizar() de Code.gs a Index.html (así la página y el servidor cobran igual)
//   · copia CONFIG y los precios base al modo demo de Index.html
//   · escribe Code-para-copiar.txt e Index-para-copiar.txt
//   · corre unas cotizaciones de prueba y avisa si algo no da lo esperado
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dir = path.join(__dirname, '..');
const codePath = path.join(dir, 'Code.gs');
const indexPath = path.join(dir, 'Index.html');
const code = fs.readFileSync(codePath, 'utf8');
let index = fs.readFileSync(indexPath, 'utf8');

// 1) Evaluar Code.gs con lo mínimo de Apps Script para leer CONFIG, PRECIOS_BASE y cotizar
const ctx = { CalendarApp: { EventColor: {}, Color: {} }, console };
vm.createContext(ctx);
vm.runInContext(code + '\nthis.__C = CONFIG; this.__PB = PRECIOS_BASE; this.__MP = MESES_PILETA; this.__cot = cotizar;', ctx);
const P = {};
ctx.__PB.forEach(function (p) { P[p[0]] = p[1]; });
P.mesesPileta = ctx.__MP;

// 2) Bloque de cotizar, tal cual
const ini = code.indexOf('// ==== COTIZAR (inicio)');
const fin = code.indexOf('// ==== COTIZAR (fin)');
if (ini < 0 || fin < 0) throw new Error('No encuentro los marcadores de COTIZAR en Code.gs');
const bloque = code.slice(code.indexOf('\n', ini) + 1, fin).trimEnd();

function reemplazar(texto, desde, hasta, contenido) {
  const a = texto.indexOf(desde), b = texto.indexOf(hasta);
  if (a < 0 || b < 0) throw new Error('No encuentro el marcador: ' + desde);
  return texto.slice(0, texto.indexOf('\n', a) + 1) + contenido + '\n' + texto.slice(b);
}
const configPublica = JSON.parse(JSON.stringify(ctx.__C));
['emailAviso', 'emailIndia', 'nombreCalendario', 'nombreCalendarioCitas', 'planillaConfirmados'].forEach(function (k) { delete configPublica[k]; });
index = reemplazar(index, '/* ==== DEMO', '/* ==== FIN DEMO',
  'var CFG_DEMO = ' + JSON.stringify(configPublica) + ';\nvar P_DEMO = ' + JSON.stringify(P) + ';');
index = reemplazar(index, '/* ==== COTIZAR', '/* ==== FIN COTIZAR', bloque);
fs.writeFileSync(indexPath, index);
fs.writeFileSync(path.join(dir, 'Index-para-copiar.txt'), index);
fs.writeFileSync(path.join(dir, 'Code-para-copiar.txt'), code);

// 3) Pruebas: lo que tiene que dar con los precios base
const casos = [
  ['Cumple infantil sábado, 30 chicos', { tipo: 'infantil', personas: 30, fecha: '2026-11-14', sector: 'quincho' }, null, 380000, 114000],
  ['Cumple infantil jueves con código amigos (piso $300.000)', { tipo: 'infantil', personas: 30, fecha: '2026-11-12', sector: 'quincho' },
    { codigo: 'AMIGOS', descuento: 20, piso: 300000 }, 300000, 90000],
  ['Cumple infantil 35 chicos, 3 h', { tipo: 'infantil', personas: 35, fecha: '2026-11-14', sector: 'quincho', duracion: 180 }, null, 448000, 134000],
  ['Cumple de adultos, pack barra, 30 personas', { tipo: 'adultos', personas: 30, fecha: '2026-11-14', sector: 'patio', modalidad: 'barra' }, null, 500000, 150000],
  ['Cumple de adultos, solo espacio, 60 personas', { tipo: 'adultos', personas: 60, fecha: '2026-11-14', sector: 'patio', modalidad: 'alquiler' }, null, 650000, 195000],
  ['Asado de martes', { tipo: 'asado', personas: 20, fecha: '2026-11-10', sector: 'quincho' }, null, 0, 0],
  ['15 años 120 personas, solo espacio, predio completo', { tipo: 'quince', personas: 120, fecha: '2027-03-27', sector: 'predio', modalidad: 'alquiler' }, null, 1730000, 0],
  ['Jornada escolar 250 alumnos', { tipo: 'escuela', personas: 250, fecha: '2026-12-10', sector: 'predio', modalidad: 'almuerzo' }, null, 4000000, 0]
];
let fallas = 0;
casos.forEach(function (c) {
  const r = ctx.__cot(c[1], P, ctx.__C, c[2]);
  const ok = r.total === c[3] && r.sena === c[4];
  if (!ok) fallas++;
  console.log((ok ? '✓ ' : '✗ ') + c[0] + ': ' + r.total + ' (seña ' + r.sena + ')' + (ok ? '' : ' — esperaba ' + c[3] + ' / ' + c[4]));
});
console.log(fallas ? fallas + ' prueba(s) fallaron' : 'Index.html y copias actualizadas.');
process.exit(fallas ? 1 : 0);
