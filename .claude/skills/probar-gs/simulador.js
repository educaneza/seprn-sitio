// ============================================================
// Simulador de Apps Script para Node — skill /probar-gs (27 nov 2026)
// ============================================================
// Carga uno o varios .gs en un contexto aislado (vm) con versiones falsas de los
// servicios de Google. NADA sale a la red: UrlFetchApp solo responde lo que le diga
// `fetch` (si no hay handler, truena), y los correos/Telegram se guardan en listas.
//
// Uso mínimo:
//   const { crearEntorno, hoja } = require('<repo>/.claude/skills/probar-gs/simulador.js');
//   const env = crearEntorno({
//     hojas: { Solicitudes: hoja('Solicitudes', filas, { fechas: ['Fecha'] }) },
//     props: { PANEL_TOKEN: 'tok' },
//     fetch: (url, opciones) => ({ status: 'ok', items: [] }),   // objeto → JSON
//     ui: { alert: 'YES', prompt: 'texto' }                      // respuestas de los diálogos
//   });
//   env.cargar('apps-script/mantenimiento.gs');
//   env.correr('manCerrarConReporte()');
//   env.escrituras / env.correos / env.fetches / env.alertas / env.telegram
//
// Lo que NO simula: formato de celdas, fórmulas, filtros/protecciones reales, Drive
// (DriveApp/DocumentApp devuelven stubs mínimos), cuotas ni tiempos de ejecución.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

// ── Fechas ──────────────────────────────────────────────────
// "26/11/2026" o "26/11/2026 13:24:35" → Date local (como las devuelve getValues()).
function aFecha(v) {
  if (v instanceof Date || v === '' || v == null) return v;
  const m = String(v).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return v; // texto que no es fecha: se queda texto (igual que en la hoja real)
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

// Utilities.formatDate con zona horaria real (Intl) y los tokens que usa el repo.
function formatDate(fecha, zona, patron) {
  const partes = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: zona || 'America/Mexico_City', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(fecha).forEach(p => { partes[p.type] = p.value; });
  const t = { yyyy: partes.year, yy: partes.year.slice(2), MM: partes.month, dd: partes.day,
    HH: partes.hour, mm: partes.minute, ss: partes.second,
    M: String(+partes.month), d: String(+partes.day), H: String(+partes.hour) };
  return String(patron).replace(/'([^']*)'|yyyy|yy|MM|dd|HH|mm|ss|M|d|H/g, (x, lit) => lit !== undefined ? lit : t[x]);
}

// ── Hoja falsa ──────────────────────────────────────────────
// `valores`: arreglo de filas con encabezado en la fila 0 (lo que da get_values del
// conector de Sheets). `opciones.fechas`: nombres de columna que en la hoja REAL son
// fechas (compruébalo con effectiveValue: numberValue = fecha, stringValue = texto).
function hoja(nombre, valores, opciones) {
  const filas = valores.map(r => r.slice());
  const ancho = Math.max(...filas.map(r => r.length));
  filas.forEach(r => { while (r.length < ancho) r.push(''); });
  ((opciones && opciones.fechas) || []).forEach(col => {
    const i = filas[0].indexOf(col);
    if (i === -1) throw new Error('hoja(' + nombre + '): no existe la columna de fecha "' + col + '"');
    filas.slice(1).forEach(r => { r[i] = aFecha(r[i]); });
  });
  return { nombre, filas };
}

function crearEntorno(config) {
  config = config || {};
  const escrituras = [], correos = [], fetches = [], alertas = [], telegram = [], triggers = [], logs = [];
  const props = Object.assign({}, config.props || {});
  const hojas = {};
  Object.keys(config.hojas || {}).forEach(n => { hojas[n] = config.hojas[n]; });
  const ui = Object.assign({ alert: 'YES', prompt: '' }, config.ui || {});

  const encadenable = (resultado) => new Proxy({}, {
    get: (_, prop) => prop === 'build' || prop === 'create' ? () => resultado || {} : () => encadenable(resultado)
  });

  function hojaObj(h) {
    const ancho = () => Math.max(1, ...h.filas.map(r => r.length));
    const asegurar = (f, c) => {
      while (h.filas.length < f) h.filas.push(new Array(ancho()).fill(''));
      h.filas.forEach(r => { while (r.length < c) r.push(''); });
    };
    const anotar = (f, c, v) => escrituras.push({ hoja: h.nombre, fila: f, col: c, encabezado: h.filas[0] ? h.filas[0][c - 1] : '', valor: v });
    const rango = (f, c, nf, nc) => {
      nf = nf || 1; nc = nc || 1;
      return {
        getValues: () => Array.from({ length: nf }, (_, i) => Array.from({ length: nc }, (_, j) =>
          (h.filas[f - 1 + i] || [])[c - 1 + j] === undefined ? '' : h.filas[f - 1 + i][c - 1 + j])),
        getValue: () => ((h.filas[f - 1] || [])[c - 1] === undefined ? '' : h.filas[f - 1][c - 1]),
        getDisplayValue: () => String((h.filas[f - 1] || [])[c - 1] || ''),
        setValue: v => { asegurar(f, c); h.filas[f - 1][c - 1] = v; anotar(f, c, v); return rango(f, c, nf, nc); },
        setValues: m => { asegurar(f + m.length - 1, c + m[0].length - 1);
          m.forEach((r, i) => r.forEach((v, j) => { h.filas[f - 1 + i][c - 1 + j] = v; anotar(f + i, c + j, v); }));
          return rango(f, c, nf, nc); },
        getRow: () => f, getColumn: () => c, getNumRows: () => nf, getNumColumns: () => nc,
        getLastColumn: () => c + nc - 1, getSheet: () => obj,
        // Formato y validaciones: se aceptan y no hacen nada.
        setDataValidation: () => rango(f, c, nf, nc), setBackground: () => rango(f, c, nf, nc),
        setFontWeight: () => rango(f, c, nf, nc), setFontColor: () => rango(f, c, nf, nc),
        setNumberFormat: () => rango(f, c, nf, nc), setWrap: () => rango(f, c, nf, nc),
        setNote: () => rango(f, c, nf, nc), clearContent: () => rango(f, c, nf, nc),
        protect: () => encadenable(), createFilter: () => encadenable()
      };
    };
    const obj = {
      getName: () => h.nombre,
      getLastRow: () => { let n = h.filas.length; while (n > 0 && h.filas[n - 1].every(v => v === '' || v == null)) n--; return n; },
      getLastColumn: ancho, getMaxRows: () => 1000, getMaxColumns: ancho,
      getDataRange: () => rango(1, 1, obj.getLastRow(), ancho()),
      getRange: (f, c, nf, nc) => {
        if (typeof f === 'string') throw new Error('simulador: getRange("A1") no soportado, usa números');
        return rango(f, c, nf, nc);
      },
      appendRow: fila => {
        if (!fila || !fila.length) throw new Error('appendRow([]) truena en Apps Script (CLAUDE.md): usa appendRow([\'\'])');
        h.filas.push(fila.slice()); escrituras.push({ hoja: h.nombre, fila: h.filas.length, appendRow: fila.slice() });
        return obj; },
      deleteRow: f => { h.filas.splice(f - 1, 1); escrituras.push({ hoja: h.nombre, deleteRow: f }); },
      insertColumnAfter: () => obj, setFrozenRows: () => obj, setColumnWidth: () => obj, autoResizeColumns: () => obj,
      getConditionalFormatRules: () => [], setConditionalFormatRules: () => obj,
      getFilter: () => null, getProtections: () => [], hideSheet: () => obj, showSheet: () => obj
    };
    return obj;
  }

  const libro = {
    getSheetByName: n => hojas[n] ? hojaObj(hojas[n]) : null,
    getSheets: () => Object.keys(hojas).map(n => hojaObj(hojas[n])),
    insertSheet: n => { hojas[n] = { nombre: n, filas: [] }; escrituras.push({ insertSheet: n }); return hojaObj(hojas[n]); },
    deleteSheet: s => { delete hojas[s.getName()]; },
    getId: () => 'ID_SIMULADO', getUrl: () => 'https://docs.google.com/spreadsheets/d/ID_SIMULADO/edit',
    getName: () => 'Libro simulado', toast: () => {}
  };

  const respuestaFetch = (url, opciones) => {
    fetches.push({ url, opciones });
    if (/api\.telegram\.org/.test(url)) {
      telegram.push(opciones && opciones.payload);
      return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' };
    }
    if (!config.fetch) throw new Error('simulador: UrlFetchApp.fetch(' + url + ') sin handler `fetch` en crearEntorno()');
    const r = config.fetch(url, opciones);
    const texto = typeof r === 'string' ? r : JSON.stringify(r);
    return { getResponseCode: () => 200, getContentText: () => texto };
  };

  const ctx = {
    // El MISMO Date que usa hoja(): si el contexto vm tuviera el suyo, `valor instanceof Date`
    // daría false para las fechas de la hoja y el .gs las trataría como texto (justo la
    // distinción que importa: docs/QA-NOTES.md #64).
    Date,
    console: { log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push('ERROR ' + a.join(' ')), warn: (...a) => logs.push('WARN ' + a.join(' ')) },
    Logger: { log: (...a) => logs.push(a.join(' ')) },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => libro, getActive: () => libro, openById: () => libro, flush: () => {},
      getUi: () => ({
        alert: (...a) => { alertas.push(a.filter(x => typeof x === 'string').join(' | ')); return ui.alert; },
        prompt: (...a) => { alertas.push('PROMPT ' + a.filter(x => typeof x === 'string').join(' | '));
          return { getSelectedButton: () => 'OK', getResponseText: () => ui.prompt }; },
        createMenu: () => encadenable(), ButtonSet: { OK: 'OK', YES_NO: 'YES_NO', OK_CANCEL: 'OK_CANCEL' },
        Button: { OK: 'OK', YES: 'YES', NO: 'NO', CANCEL: 'CANCEL' }
      }),
      newDataValidation: () => encadenable(), newConditionalFormatRule: () => encadenable(),
      ProtectionType: {}, BorderStyle: {}
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); },
        deleteProperty: k => { delete props[k]; }, getProperties: () => Object.assign({}, props)
      })
    },
    Utilities: {
      formatDate, getUuid: () => 'uuid-' + Math.random().toString(16).slice(2),
      sleep: () => {}, base64Encode: s => Buffer.from(String(s)).toString('base64'),
      newBlob: (d, t, n) => ({ getBytes: () => d, getName: () => n, setName: () => {} }),
      computeHmacSha256Signature: () => [], Charset: { UTF_8: 'UTF-8' }
    },
    UrlFetchApp: { fetch: respuestaFetch, fetchAll: lista => lista.map(p => respuestaFetch(p.url, p)) },
    MailApp: { sendEmail: o => correos.push(o), getRemainingDailyQuota: () => 100 },
    GmailApp: { sendEmail: (to, subject, body, o) => correos.push(Object.assign({ to, subject, body }, o || {})) },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t, getContent: () => t }), MimeType: { JSON: 'JSON', TEXT: 'TEXT' } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {}, hasLock: () => true }) },
    CacheService: { getScriptCache: () => { const c = {}; return { get: k => c[k] || null, put: (k, v) => { c[k] = v; }, remove: k => { delete c[k]; } }; } },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(), deleteTrigger: t => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: fn => encadenable({ getHandlerFunction: () => fn }), getService: () => ({ getUrl: () => 'https://script.google.com/simulado/exec' })
    },
    DriveApp: { getFolderById: () => encadenable(), getFileById: () => encadenable(), createFile: () => encadenable() },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'otde@simulado' }), getScriptTimeZone: () => 'America/Mexico_City' }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  return {
    ctx, hojas, props, escrituras, correos, fetches, alertas, telegram, logs,
    // Carga .gs en orden (los de un mismo proyecto comparten globales, como en Apps Script).
    cargar: (...archivos) => archivos.forEach(a => vm.runInContext(fs.readFileSync(path.resolve(a), 'utf8'), ctx, { filename: a })),
    correr: codigo => vm.runInContext(codigo, ctx),
    // doGet/doPost como los llama Apps Script; regresan el objeto ya parseado.
    doGet: parametros => JSON.parse(ctx.doGet({ parameter: parametros || {} })),
    doPost: cuerpo => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(cuerpo) } })),
    // Valores actuales de una hoja como objetos {encabezado: valor}.
    filas: n => { const f = hojas[n].filas; return f.slice(1).map(r => Object.fromEntries(f[0].map((h, i) => [h, r[i]]))); },
    // Resumen legible de lo que se escribió (para imprimir al final de una prueba).
    resumen: () => escrituras.map(e => e.appendRow ? e.hoja + ' + fila ' + e.fila
      : e.insertSheet ? 'hoja nueva ' + e.insertSheet
      : e.hoja + ' F' + e.fila + ' [' + (e.encabezado || 'C' + e.col) + '] = ' + (e.valor instanceof Date ? formatDate(e.valor, 'America/Mexico_City', 'yyyy-MM-dd') : e.valor))
  };
}

// Comprobación mínima sin framework: falla con mensaje claro y cuenta los aciertos.
let aciertos = 0;
function esperar(condicion, mensaje) {
  if (!condicion) { console.error('✗ ' + mensaje); process.exitCode = 1; return false; }
  aciertos++; console.log('✓ ' + mensaje); return true;
}
process.on('exit', () => { if (aciertos) console.log('\n' + aciertos + ' comprobaciones correctas' + (process.exitCode ? ', con fallas arriba' : '')); });

module.exports = { crearEntorno, hoja, aFecha, formatDate, esperar };
