// ============================================================
// SEPRN · OTDE — Ticket de salida y seguimiento de la asesoría
// "Banco de Materiales y Chuka: Rompe el Silencio" (nov 2026)
//
// Qué hace:
//   1. ticket-asesoria.html (QR al cierre del taller) manda aquí el ticket de
//      salida: compromiso de aplicación + valoración + necesidades. Se guarda
//      en la hoja "Tickets" y el docente recibe al instante un correo con su
//      compromiso, todos los materiales del kit y los canales de OTDE/SEPRN.
//   2. Un activador diario (tktProcesarSeguimiento) manda, contando desde el
//      registro del ticket:
//        día 7  → recordatorio útil (su compromiso + cómo buscar en el BM +
//                 pregunta SAMR para mejorar la actividad)
//        día 21 → enlace a seguimiento-asesoria.html?t=TOKEN (formulario corto)
//        día 30 → devolución si respondió / cierre amable si no
//      Cada correo trae enlace de baja (?action=baja&t=TOKEN). Máximo un correo
//      por docente por corrida, para no amontonar si el activador se atrasa.
//   3. seguimiento-asesoria.html manda aquí el reporte de aplicación (hoja
//      "Seguimiento"). OTDE escribe Fortaleza/Mejora en esa hoja y con el menú
//      "OTDE Ticket → Enviar retroalimentación" se le manda al docente.
//   4. tktResumenSemanal (lunes) manda a OTDE el resumen: tickets, aplicación,
//      necesidades agrupadas y quién pidió visita.
//   La hoja "Tablero" tiene fórmulas para decidir asesorías por demanda,
//   mapa de infraestructura e indicadores del taller.
//
// Proyecto ligado a su propia hoja de cálculo (clasp create --type sheets).
// IMPLEMENTACIÓN (una sola vez):
//   1. En el editor de Apps Script ejecutar tktSetup() y autorizar.
//   2. Implementar → Nueva implementación → Aplicación web
//        Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
//   3. Pegar la URL /exec en TICKET_APPS_SCRIPT_URL de ticket-asesoria.html y
//      seguimiento-asesoria.html, y registrar el proyecto en proyectos-clasp.json.
//   Modo de prueba: tktActivarModoPrueba('correo@...') redirige TODOS los correos.
//   tktProbarSeguimiento('correo@...') manda los correos de día 7/21/30 de la
//   última fila a ese correo, sin esperar ni marcar nada.
// ============================================================

const TKT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwZGkr1EUJy2tMiJZy_ejAxO1xRUBrkHrYTWoH6edcz8695Nx88OIKtrkmpRqdh2jA/exec';
const TKT_SITIO = 'https://educaneza.github.io/seprn-sitio/';
const TKT_KIT = TKT_SITIO + 'kit-digital/';
const TKT_HOJA_TICKETS = 'Tickets';
const TKT_HOJA_SEGUIMIENTO = 'Seguimiento';
const TKT_HOJA_TABLERO = 'Tablero';
const TKT_DIAS = { d7: 7, d21: 21, d30: 30 };

const TKT_ENC_TICKETS = [
  'Fecha', 'Sesión', 'Nombre', 'Correo', 'Función', 'CCT', 'Escuela', 'Fase y grado',
  'Conectividad de la escuela', 'Modelo de equipamiento',
  'Recurso a usar', 'Grupo', 'Campo formativo', 'Aprendizaje que busca', 'Evidencia que recogerá',
  'Fecha tentativa de aplicación',
  'Utilidad (1-5)', 'Claridad (1-5)', 'Aplicabilidad (1-5)', 'Confianza antes (1-5)', 'Confianza después (1-5)',
  'Lo más útil', 'Qué faltó', 'Necesidades de seguimiento', 'Quiere visita en aula', 'Autoriza compartir su práctica',
  'Token', 'ID de envío', 'Correo de materiales', 'Correo día 7', 'Correo día 21', 'Correo día 30',
  'Respondió seguimiento', 'Baja', 'Notas OTDE',
  // nov 2026 (revisión del 25-nov): agregadas al final para no recorrer columnas
  'Conectividad del Aula de Medios', 'BM Off-Line instalado', 'Quiere avisos de asesorías', 'Lo que necesita para lograrlo'
];

const TKT_ENC_SEGUIMIENTO = [
  'Fecha', 'Token', 'Nombre', 'Correo', 'CCT', '¿Aplicó la actividad?', 'Qué funcionó', 'Barrera principal',
  'Modalidad que resultó viable', 'Nivel SAMR alcanzado', 'Evidencia (enlace)', 'Autoriza publicar en galería',
  'Quiere acompañamiento', 'Comentario', 'ID de envío',
  'Fortaleza (OTDE)', 'Mejora (OTDE)', 'Retroalimentación enviada'
];

// ── Materiales y canales: una sola lista para el correo y para la página ──
const TKT_MATERIALES = [
  ['Presentación de la asesoría (PDF)', TKT_KIT + 'Presentacion_BM_Chuka_2026.pdf'],
  ['Organizador gráfico 30:1 · 3:1 · 1:1 (Word editable)', TKT_KIT + 'Organizadores_Gr%C3%A1ficos_Editable.docx'],
  ['Guía para llenar el organizador y rúbrica (PDF)', TKT_KIT + 'Guia_Organizador_Grafico_y_Rubrica.pdf'],
  ['Ejemplos resueltos (PDF)', TKT_KIT + 'Ejemplos_Resueltos.pdf'],
  ['Tabla SAMR — niveles de integración (PDF)', TKT_KIT + 'Tabla_SAMR_Niveles_Integraci%C3%B3n.pdf'],
  ['Banco de Ideas NEM por campo formativo (PDF)', TKT_KIT + 'Banco_de_Ideas_NEM.pdf'],
  ['Instrucciones de acceso: BM On-Line, Off-Line y Chuka (PDF)', TKT_KIT + 'Instrucciones_Acceso_BM_y_Chuka.pdf'],
  ['Chuka — guía para docentes (PDF)', TKT_KIT + 'chuka-guia-docentes.pdf'],
  ['Chuka — guía para familias (PDF)', TKT_KIT + 'chuka-guia-familias.pdf']
];
const TKT_PLATAFORMAS = [
  ['Banco de Materiales On-Line', 'http://red.dee.edu.mx/'],
  ['Chuka: Rompe el Silencio', 'https://chukagame.com/'],
  ['Banco de Materiales Off-Line', 'En el equipo central de tu escuela: localhost/catalogo']
];
const TKT_CANALES = [
  ['Kit digital completo', TKT_KIT],
  ['Oficina Virtual OTDE (trámites y solicitudes)', TKT_SITIO + 'oficina-virtual.html'],
  ['OTDE en el sitio SEPRN', TKT_SITIO + 'otde.html'],
  ['Protocolos de actuación SEPRN', TKT_SITIO + 'protocolos.html'],
  ['Sitio web SEPRN', TKT_SITIO + 'index.html'],
  ['Canal de WhatsApp OTDE', 'https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11'],
  ['Facebook SubNeza', 'https://www.facebook.com/SubNeza'],
  ['YouTube SEPRN', 'https://www.youtube.com/@subneza']
];
const TKT_CONTACTO = 'otde.nezahualcoyotl@dee.edu.mx · 55 3300 2400 ext. 9065';

// ============================================================
// Configuración
// ============================================================
function tktSetup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  tktHoja_(ss, TKT_HOJA_TICKETS, TKT_ENC_TICKETS);
  tktHoja_(ss, TKT_HOJA_SEGUIMIENTO, TKT_ENC_SEGUIMIENTO);
  tktAsegurarTablero_(ss);
  const hoja1 = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hoja1 && ss.getSheets().length > 1 && hoja1.getLastRow() === 0) ss.deleteSheet(hoja1);

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['tktProcesarSeguimiento', 'tktResumenSemanal'].indexOf(t.getHandlerFunction()) !== -1) {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('tktProcesarSeguimiento').timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger('tktResumenSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('RESUMEN_CORREO')) {
    props.setProperty('RESUMEN_CORREO', Session.getEffectiveUser().getEmail());
  }
  return 'Listo: hojas, tablero y activadores creados. Resumen semanal a ' + props.getProperty('RESUMEN_CORREO');
}

function tktActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}
function tktDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}
// URL /exec del Web App (para el enlace de baja). Se configura una vez tras implementar.
function tktConfigurarUrlWebApp(url) {
  PropertiesService.getScriptProperties().setProperty('WEBAPP_URL', String(url || '').trim());
}
function tktUrlWebApp_() {
  return PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || TKT_WEBAPP_URL;
}
function tktConfigurarCorreoResumen(correo) {
  PropertiesService.getScriptProperties().setProperty('RESUMEN_CORREO', correo);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('OTDE Ticket')
    .addItem('Enviar retroalimentación (filas con Fortaleza y Mejora)', 'tktEnviarRetroalimentacion')
    .addItem('Procesar seguimiento ahora', 'tktProcesarSeguimiento')
    .addItem('Mandar resumen semanal ahora', 'tktResumenSemanal')
    .addToUi();
}

// ============================================================
// Hojas
// ============================================================
function tktHoja_(ss, nombre, encabezados) {
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(encabezados);
    hoja.getRange(1, 1, 1, encabezados.length)
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5').setWrap(true);
    hoja.setFrozenRows(1);
    return hoja;
  }
  const actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
  const faltan = encabezados.filter(function (h) { return actuales.indexOf(h) === -1; });
  if (faltan.length) {
    hoja.getRange(1, hoja.getLastColumn() + 1, 1, faltan.length).setValues([faltan])
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  }
  return hoja;
}

// Índices por nombre de encabezado (0-based) de la hoja real
function tktIdx_(hoja) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const m = {};
  enc.forEach(function (h, i) { m[String(h).trim()] = i; });
  return m;
}

function tktAgregarFila_(hoja, objeto) {
  const idx = tktIdx_(hoja);
  const fila = new Array(hoja.getLastColumn()).fill('');
  Object.keys(objeto).forEach(function (k) {
    if (k in idx) fila[idx[k]] = objeto[k];
  });
  hoja.appendRow(fila);
}

const TKT_TABLERO_VERSION = '2';

// Se rehace solo cuando cambia TKT_TABLERO_VERSION (se llama en cada registro).
function tktAsegurarTablero_(ss) {
  const props = PropertiesService.getScriptProperties();
  if (ss.getSheetByName(TKT_HOJA_TABLERO) && props.getProperty('TABLERO_V') === TKT_TABLERO_VERSION) return;
  const viejo = ss.getSheetByName(TKT_HOJA_TABLERO);
  if (viejo) ss.deleteSheet(viejo);
  tktCrearTablero_(ss);
  props.setProperty('TABLERO_V', TKT_TABLERO_VERSION);
}

function tktCrearTablero_(ss) {
  if (ss.getSheetByName(TKT_HOJA_TABLERO)) return;
  const t = ss.insertSheet(TKT_HOJA_TABLERO);
  // Columna por NOMBRE de encabezado: sigue funcionando si se agregan o mueven columnas
  const rango = function (hoja, nombre) {
    return "INDEX('" + hoja + "'!A2:ZZ,0,MATCH(\"" + nombre + "\",'" + hoja + "'!1:1,0))";
  };
  const cT = function (n) { return rango(TKT_HOJA_TICKETS, n); };
  const cS = function (n) { return rango(TKT_HOJA_SEGUIMIENTO, n); };
  const cuenta = function (c, v) { return '=IFERROR(COUNTIF(' + c + ',"' + v + '"),0)'; };

  const filas = [
    ['TABLERO — Cierre de la asesoría y seguimiento (se actualiza solo)', ''],
    ['', ''],
    ['INDICADORES DEL TALLER', ''],
    ['Respuestas de cierre', '=IFERROR(COUNTA(' + cT('Correo') + '),0)'],
    ['Utilidad promedio (1-5)', '=IFERROR(AVERAGE(' + cT('Utilidad (1-5)') + '),"")'],
    ['Aplicabilidad con su grupo, promedio (1-5)', '=IFERROR(AVERAGE(' + cT('Aplicabilidad (1-5)') + '),"")'],
    ['Confianza antes → después', '=IFERROR(TEXT(AVERAGE(' + cT('Confianza antes (1-5)') + '),"0.0")&" → "&TEXT(AVERAGE(' + cT('Confianza después (1-5)') + '),"0.0"),"")'],
    ['Reportes de seguimiento recibidos', '=IFERROR(COUNTA(' + cS('Correo') + '),0)'],
    ['Aplicaron la actividad (sí o parcial)', '=IFERROR(COUNTIF(' + cS('¿Aplicó la actividad?') + ',"Sí")+COUNTIF(' + cS('¿Aplicó la actividad?') + ',"Parcialmente"),0)'],
    ['% de aplicación', '=IFERROR(B9/B4,"")'],
    ['', ''],
    ['TEMAS DE INTERÉS (para planear asesorías)', ''],
    ['Banco de Materiales sin internet', cuenta(cT('Necesidades de seguimiento'), '*Off-Line*')],
    ['Encontrar recursos del BM', cuenta(cT('Necesidades de seguimiento'), '*Encontrar recursos*')],
    ['Chuka con su grupo', cuenta(cT('Necesidades de seguimiento'), '*Chuka*')],
    ['Integración tecnológica (SAMR)', cuenta(cT('Necesidades de seguimiento'), '*SAMR*')],
    ['Otros temas', cuenta(cT('Necesidades de seguimiento'), '*Otro:*')],
    ['Quieren avisos de asesorías y cursos', cuenta(cT('Quiere avisos de asesorías'), 'Sí')],
    ['', ''],
    ['INTERNET (escuela / Aula de Medios)', ''],
    ['Sí, estable', cuenta(cT('Conectividad de la escuela'), 'Sí, estable'), cuenta(cT('Conectividad del Aula de Medios'), 'Sí, estable')],
    ['Sí, pero falla seguido', cuenta(cT('Conectividad de la escuela'), 'Sí, pero falla seguido'), cuenta(cT('Conectividad del Aula de Medios'), 'Sí, pero falla seguido')],
    ['No hay', cuenta(cT('Conectividad de la escuela'), 'No hay'), cuenta(cT('Conectividad del Aula de Medios'), 'No hay')],
    ['No sé', cuenta(cT('Conectividad de la escuela'), 'No sé'), cuenta(cT('Conectividad del Aula de Medios'), 'No sé')],
    ['BM sin internet instalado en el Aula de Medios (Sí | No)', cuenta(cT('BM Off-Line instalado'), 'Sí'), cuenta(cT('BM Off-Line instalado'), 'No') ],
    ['', ''],
    ['SAMR ALCANZADO (seguimiento)', ''],
    ['Sustitución', cuenta(cS('Nivel SAMR alcanzado'), 'Sustitución')],
    ['Aumento', cuenta(cS('Nivel SAMR alcanzado'), 'Aumento')],
    ['Modificación', cuenta(cS('Nivel SAMR alcanzado'), 'Modificación')],
    ['Redefinición', cuenta(cS('Nivel SAMR alcanzado'), 'Redefinición')],
    ['Experiencias autorizadas para compartir', cuenta(cS('Autoriza publicar en galería'), 'Sí')]
  ].map(function (f) { while (f.length < 3) f.push(''); return f; });
  t.getRange(1, 1, filas.length, 3).setValues(filas);
  t.getRange('B20:C20').setValues([['Escuela', 'Aula de Medios']]);
  t.getRange('B10').setNumberFormat('0%');
  t.getRange('A1').setFontWeight('bold').setFontSize(13).setFontColor('#56212f');
  [3, 12, 20, 27].forEach(function (r) {
    t.getRange(r, 1, 1, 3).setFontWeight('bold').setBackground('#d6d1ca');
  });
  t.setColumnWidth(1, 420);
  t.setColumnWidth(2, 120);
  t.setColumnWidth(3, 140);
}

function tktLetra_(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ============================================================
// Web App
// ============================================================
function tktJson_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'baja') return tktBaja_(p.t);
  if (p.action === 'seguimiento') {
    const r = tktBuscarToken_(p.t);
    if (!r) return tktJson_({ status: 'error', mensaje: 'Enlace no válido.' });
    return tktJson_({ status: 'ok', nombre: r.obj['Nombre'], recurso: r.obj['Recurso a usar'], cct: r.obj['CCT'] });
  }
  return tktJson_({ status: 'ok', servicio: 'ticket-asesoria' });
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (datos.tipo === 'seguimiento') return tktRegistrarSeguimiento_(datos);
    return tktRegistrarTicket_(datos);
  } catch (err) {
    return tktJson_({ status: 'error', mensaje: err.message });
  }
}

function tktTexto_(v, max) {
  return String(v == null ? '' : v).trim().slice(0, max || 500);
}

function tktValidarCorreo_(c) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
}

function tktRegistrarTicket_(d) {
  const correo = tktTexto_(d.correo, 120).toLowerCase();
  const nombre = tktTexto_(d.nombre, 120);
  if (!tktValidarCorreo_(correo)) throw new Error('El correo no es válido.');
  if (!tktTexto_(d.recurso, 300)) throw new Error('Falta el recurso que usarás.');

  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) {
    return tktJson_({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' });
  }
  let token, duplicado = false;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = tktHoja_(ss, TKT_HOJA_TICKETS, TKT_ENC_TICKETS);
    tktAsegurarTablero_(ss);
    const idEnvio = tktTexto_(d.idEnvio, 60);
    if (idEnvio && hoja.getLastRow() > 1) {
      const idx = tktIdx_(hoja);
      const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
      const previa = vals.find(function (r) { return String(r[idx['ID de envío']]) === idEnvio; });
      if (previa) { token = String(previa[idx['Token']]); duplicado = true; }
    }
    if (!duplicado) {
      token = Utilities.getUuid().replace(/-/g, '').slice(0, 20);
      tktAgregarFila_(hoja, {
        'Fecha': new Date(),
        'Sesión': tktTexto_(d.sesion, 40),
        'Nombre': nombre,
        'Correo': correo,
        'Función': tktTexto_(d.funcion, 80),
        'CCT': tktTexto_(d.cct, 12).toUpperCase(),
        'Escuela': tktTexto_(d.escuela, 120),
        'Fase y grado': tktTexto_(d.grado, 60),
        'Conectividad de la escuela': tktTexto_(d.conectividad, 60),
        'Modelo de equipamiento': tktTexto_(d.modelo, 60),
        'Recurso a usar': tktTexto_(d.recurso, 300),
        'Grupo': tktTexto_(d.grupo, 60),
        'Campo formativo': tktTexto_(d.campo, 80),
        'Aprendizaje que busca': tktTexto_(d.aprendizaje, 600),
        'Evidencia que recogerá': tktTexto_(d.evidencia, 400),
        'Fecha tentativa de aplicación': tktTexto_(d.fechaAplicacion, 20),
        'Utilidad (1-5)': Number(d.utilidad) || '',
        'Claridad (1-5)': Number(d.claridad) || '',
        'Aplicabilidad (1-5)': Number(d.aplicabilidad) || '',
        'Confianza antes (1-5)': Number(d.confianzaAntes) || '',
        'Confianza después (1-5)': Number(d.confianzaDespues) || '',
        'Lo más útil': tktTexto_(d.masUtil, 600),
        'Qué faltó': tktTexto_(d.falto, 600),
        'Necesidades de seguimiento': tktTexto_(d.necesidades, 400),
        'Conectividad del Aula de Medios': tktTexto_(d.conectividadAula, 60),
        'BM Off-Line instalado': tktTexto_(d.offline, 20),
        'Quiere avisos de asesorías': d.avisos ? 'Sí' : 'No',
        'Lo que necesita para lograrlo': tktTexto_(d.necesito, 300),
        'Autoriza compartir su práctica': d.compartir ? 'Sí' : 'No',
        'Token': token,
        'ID de envío': idEnvio
      });
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }

  if (!duplicado) {
    try {
      tktEnviarCorreo_({
        to: correo,
        subject: 'Tus materiales de la asesoría Banco de Materiales y Chuka — OTDE',
        htmlBody: tktCorreoMateriales_(d, nombre, token)
      });
      tktMarcar_(token, 'Correo de materiales', new Date());
    } catch (errCorreo) {
      tktMarcar_(token, 'Correo de materiales', 'ERROR: ' + errCorreo.message);
    }
  }
  return tktJson_({ status: 'ok', duplicado: duplicado });
}

function tktRegistrarSeguimiento_(d) {
  const r = tktBuscarToken_(d.token);
  if (!r) throw new Error('El enlace de seguimiento no es válido. Escríbenos a otde.nezahualcoyotl@dee.edu.mx');
  if (!tktTexto_(d.aplico, 20)) throw new Error('Indica si aplicaste la actividad.');
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (x) {
    return tktJson_({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' });
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = tktHoja_(ss, TKT_HOJA_SEGUIMIENTO, TKT_ENC_SEGUIMIENTO);
    const idEnvio = tktTexto_(d.idEnvio, 60);
    if (idEnvio && hoja.getLastRow() > 1) {
      const idx = tktIdx_(hoja);
      const ya = hoja.getRange(2, idx['ID de envío'] + 1, hoja.getLastRow() - 1, 1).getValues()
        .some(function (x) { return String(x[0]) === idEnvio; });
      if (ya) return tktJson_({ status: 'ok', duplicado: true });
    }
    const evidencia = tktTexto_(d.evidencia, 400);
    tktAgregarFila_(hoja, {
      'Fecha': new Date(),
      'Token': r.obj['Token'],
      'Nombre': r.obj['Nombre'],
      'Correo': r.obj['Correo'],
      'CCT': r.obj['CCT'],
      '¿Aplicó la actividad?': tktTexto_(d.aplico, 20),
      'Qué funcionó': tktTexto_(d.funciono, 800),
      'Barrera principal': tktTexto_(d.barrera, 800),
      'Modalidad que resultó viable': tktTexto_(d.modalidad, 80),
      'Nivel SAMR alcanzado': tktTexto_(d.samr, 20),
      'Evidencia (enlace)': /^https?:\/\//i.test(evidencia) ? evidencia : (evidencia ? 'Texto: ' + evidencia : ''),
      'Autoriza publicar en galería': d.publicar ? 'Sí' : 'No',
      'Quiere acompañamiento': tktTexto_(d.acompanamiento, 200),
      'Comentario': tktTexto_(d.comentario, 800),
      'ID de envío': idEnvio
    });
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  tktMarcar_(r.obj['Token'], 'Respondió seguimiento', new Date());
  return tktJson_({ status: 'ok' });
}

function tktBuscarToken_(token) {
  token = tktTexto_(token, 40);
  if (!token) return null;
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TKT_HOJA_TICKETS);
  if (!hoja || hoja.getLastRow() < 2) return null;
  const idx = tktIdx_(hoja);
  const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
  for (let i = 0; i < vals.length; i++) {
    if (String(vals[i][idx['Token']]) === token) {
      const obj = {};
      Object.keys(idx).forEach(function (k) { obj[k] = vals[i][idx[k]]; });
      return { fila: i + 2, obj: obj };
    }
  }
  return null;
}

function tktMarcar_(token, columna, valor) {
  const r = tktBuscarToken_(token);
  if (!r) return;
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TKT_HOJA_TICKETS);
  hoja.getRange(r.fila, tktIdx_(hoja)[columna] + 1).setValue(valor);
}

function tktBaja_(token) {
  const r = tktBuscarToken_(token);
  if (r) tktMarcar_(token, 'Baja', new Date());
  const msg = r ? 'Listo. Ya no recibirás correos de seguimiento de esta asesoría.'
    : 'No encontramos ese enlace. Si quieres darte de baja, escríbenos a otde.nezahualcoyotl@dee.edu.mx';
  return HtmlService.createHtmlOutput('<div style="font-family:Arial,sans-serif;max-width:520px;margin:60px auto;' +
    'padding:24px;border:1px solid #d6d1ca;border-radius:10px;color:#333"><h2 style="color:#56212f">OTDE · SEPRN</h2><p>' +
    msg + '</p></div>').setTitle('Baja de seguimiento');
}

// ============================================================
// Correos
// ============================================================
function tktEsc_(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function tktEnviarCorreo_(o) {
  const prueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (prueba) {
    o = Object.assign({}, o, {
      to: prueba,
      subject: '[PRUEBA] ' + o.subject,
      htmlBody: '<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;padding:8px 14px;' +
        'margin-bottom:14px;font-family:Arial,sans-serif;font-size:12px">Modo de prueba — destino real: ' +
        tktEsc_(o.to) + '</div>' + o.htmlBody
    });
  }
  o.name = 'OTDE · SEPRN Nezahualcóyotl';
  o.replyTo = 'otde.nezahualcoyotl@dee.edu.mx';
  MailApp.sendEmail(o);
}

function tktMarco_(titulo, cuerpo, token) {
  const baja = token ? '<p style="font-size:11px;color:#888;margin-top:18px">¿No quieres recibir más correos de seguimiento? ' +
    '<a href="' + tktUrlWebApp_() + '?action=baja&t=' + encodeURIComponent(token) +
    '" style="color:#888">Darme de baja</a>.</p>' : '';
  return '<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#333;line-height:1.55">' +
    '<div style="background:#56212f;color:#F9F8F5;padding:18px 24px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#ddc8a4">OTDE · Subdirección de Educación Primaria · Región Nezahualcóyotl</div>' +
    '<div style="font-size:19px;font-weight:bold;margin-top:4px">' + titulo + '</div></div>' +
    '<div style="border:1px solid #d6d1ca;border-top:none;padding:20px 24px;border-radius:0 0 10px 10px">' + cuerpo +
    '<p style="font-size:12px;color:#6b5a44;border-top:1px solid #eee;padding-top:12px;margin-top:20px">' +
    'Oficina de Tecnología para el Desarrollo Educativo (OTDE)<br>' + TKT_CONTACTO + '</p>' + baja + '</div></div>';
}

function tktLista_(items) {
  return '<ul style="padding-left:18px;margin:6px 0 14px">' + items.map(function (it) {
    const esUrl = /^https?:/.test(it[1]);
    return '<li style="margin:4px 0">' + (esUrl
      ? '<a href="' + it[1] + '" style="color:#9F2241;font-weight:bold">' + tktEsc_(it[0]) + '</a>'
      : '<strong>' + tktEsc_(it[0]) + ':</strong> ' + tktEsc_(it[1])) + '</li>';
  }).join('') + '</ul>';
}

function tktHola_(nombre) {
  const n = String(nombre || '').trim().split(' ')[0];
  return '<p>Hola' + (n ? ', ' + tktEsc_(n) : '') + ':</p>';
}

function tktH_(t) {
  return '<h3 style="color:#56212f;font-size:15px;margin:18px 0 4px">' + t + '</h3>';
}

function tktCompromiso_(obj) {
  const f = function (k) { return tktEsc_(obj[k] || '—'); };
  return '<div style="background:#F9F8F5;border-left:4px solid #9F2241;padding:12px 16px;margin:10px 0">' +
    '<strong>Recurso:</strong> ' + f('recurso') + '<br><strong>Grupo:</strong> ' + f('grupo') +
    '<br><strong>Campo formativo:</strong> ' + f('campo') + '<br><strong>Aprendizaje:</strong> ' + f('aprendizaje') +
    '<br><strong>Evidencia:</strong> ' + f('evidencia') +
    (obj.fechaAplicacion ? '<br><strong>Cuándo:</strong> ' + f('fechaAplicacion') : '') +
    (obj.necesito ? '<br><strong>Lo que necesitas:</strong> ' + f('necesito') : '') + '</div>';
}

// d = datos tal como vienen del formulario (recurso, grupo, campo...)
function tktCorreoMateriales_(d, nombre, token) {
  const cuerpo = tktHola_(nombre) +
    '<p>Gracias por participar en la asesoría <strong>Banco de Materiales Educativos y Chuka: Rompe el Silencio</strong>. ' +
    'Esta es la actividad que elegiste al cerrar la asesoría:</p>' + tktCompromiso_(d) +
    tktH_('Materiales de la asesoría') + tktLista_(TKT_MATERIALES) +
    tktH_('Plataformas') + tktLista_(TKT_PLATAFORMAS) +
    tktH_('OTDE y SEPRN') + tktLista_(TKT_CANALES) +
    '<p style="background:#F9F8F5;padding:10px 14px;border-radius:6px;font-size:13px"><strong>¿Qué sigue?</strong> ' +
    'En una semana te escribiremos para ver cómo va tu actividad, y en tres semanas te pediremos un reporte breve ' +
    '(2 minutos). Con lo que nos cuentes planeamos las siguientes asesorías de la región.</p>' +
    '<p style="font-size:12px;color:#6b5a44">Si en tu grupo surge una situación de violencia, sigue la ruta y los protocolos ' +
    'institucionales de actuación de tu escuela. Chuka apoya la prevención y detección; no sustituye esos protocolos.</p>';
  return tktMarco_('Tus materiales de la asesoría', cuerpo, token);
}

function tktObjCompromiso_(o) {
  return {
    recurso: o['Recurso a usar'], grupo: o['Grupo'], campo: o['Campo formativo'],
    aprendizaje: o['Aprendizaje que busca'], evidencia: o['Evidencia que recogerá'],
    fechaAplicacion: o['Fecha tentativa de aplicación'], necesito: o['Lo que necesita para lograrlo']
  };
}

function tktCorreoDia7_(o) {
  const cuerpo = tktHola_(o['Nombre']) +
    '<p>Hace una semana, al cerrar la asesoría, elegiste esta actividad:</p>' + tktCompromiso_(tktObjCompromiso_(o)) +
    tktH_('Tres ideas para afinarla') +
    '<ol style="padding-left:18px"><li><strong>Busca el recurso por grado y campo.</strong> En <a href="http://red.dee.edu.mx/" style="color:#9F2241">red.dee.edu.mx</a> ' +
    '(o en <em>localhost/catalogo</em> si tu escuela no tiene internet) filtra por Primaria → tu grado → tipo de material.</li>' +
    '<li><strong>Pregunta SAMR:</strong> ¿qué podrán hacer tus alumnos con el recurso que no podrían hacer con el libro o el pizarrón? ' +
    'Si la respuesta es "nada", agrega una decisión, una producción o un diálogo.</li>' +
    '<li><strong>Ten un plan B:</strong> si falla el internet o hay pocos equipos, organiza tríos con roles (explorador, registrador, vocero).</li></ol>' +
    '<p>Ideas por campo formativo en el <a href="' + TKT_KIT + 'Banco_de_Ideas_NEM.pdf" style="color:#9F2241">Banco de Ideas NEM</a> ' +
    'y ejemplos en <a href="' + TKT_KIT + 'Ejemplos_Resueltos.pdf" style="color:#9F2241">Ejemplos resueltos</a>.</p>' +
    '<p>¿Dudas? Responde este correo o escríbenos por el <a href="https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11" style="color:#9F2241">canal de WhatsApp OTDE</a>.</p>';
  return tktMarco_('¿Cómo va tu actividad?', cuerpo, o['Token']);
}

function tktCorreoDia21_(o) {
  const url = TKT_SITIO + 'seguimiento-asesoria.html?t=' + encodeURIComponent(o['Token']);
  const cuerpo = tktHola_(o['Nombre']) +
    '<p>Queremos saber cómo te fue con <strong>' + tktEsc_(o['Recurso a usar']) + '</strong>. ' +
    'Son 5 preguntas (2 minutos), y no importa si todavía no la aplicas: también nos sirve saber qué lo impidió.</p>' +
    '<p style="text-align:center;margin:22px 0"><a href="' + url + '" style="background:#9F2241;color:#fff;padding:12px 22px;' +
    'border-radius:8px;text-decoration:none;font-weight:bold">Contar cómo me fue</a></p>' +
    '<p><strong>¿Para qué lo usamos?</strong></p><ul style="padding-left:18px">' +
    '<li>Si nos cuentas cómo la aplicaste, el equipo de OTDE te envía un comentario breve.</li>' +
    '<li>Si nos autorizas, tu actividad se suma a la galería de prácticas de la región para que otros docentes la reutilicen.</li>' +
    '<li>Planeamos las siguientes asesorías de la región según lo que más se necesite.</li></ul>';
  return tktMarco_('¿Cómo te fue? (2 minutos)', cuerpo, o['Token']);
}

function tktCorreoDia30_(o) {
  const respondio = !!o['Respondió seguimiento'];
  const cuerpo = respondio
    ? tktHola_(o['Nombre']) + '<p>Gracias por contarnos cómo te fue. Tu reporte ya está con el equipo de OTDE: ' +
      'si nos contaste cómo la aplicaste, te enviaremos un comentario breve. Si quieres una asesoría en tu escuela, puedes solicitarla en la Oficina Virtual.</p>' +
      '<p>Si quieres seguir explorando, aquí tienes el <a href="' + TKT_KIT + '" style="color:#9F2241">kit digital</a> y la ' +
      '<a href="' + TKT_SITIO + 'oficina-virtual.html" style="color:#9F2241">Oficina Virtual OTDE</a> para solicitar asesorías, mantenimiento o soporte.</p>'
      : tktHola_(o['Nombre']) + '<p>Este es nuestro último correo de seguimiento de la asesoría. Si todavía quieres contarnos ' +
      'cómo te fue, el enlace sigue abierto:</p><p><a href="' + TKT_SITIO + 'seguimiento-asesoria.html?t=' + encodeURIComponent(o['Token']) +
      '" style="color:#9F2241;font-weight:bold">Contar cómo me fue</a></p>' +
      '<p>Y si necesitas apoyo para aplicarla, la <a href="' + TKT_SITIO + 'oficina-virtual.html" style="color:#9F2241">Oficina Virtual OTDE</a> ' +
      'está para eso. Tus materiales siguen en el <a href="' + TKT_KIT + '" style="color:#9F2241">kit digital</a>.</p>';
  return tktMarco_(respondio ? 'Gracias por compartir tu práctica' : 'Seguimos a la mano', cuerpo, o['Token']);
}

// ============================================================
// Seguimiento diario
// ============================================================
function tktProcesarSeguimiento() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TKT_HOJA_TICKETS);
  if (!hoja || hoja.getLastRow() < 2) return;
  const idx = tktIdx_(hoja);
  const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
  const hoy = new Date();
  vals.forEach(function (r, i) {
    if (r[idx['Baja']] || !(r[idx['Fecha']] instanceof Date)) return;
    const dias = Math.floor((hoy - r[idx['Fecha']]) / 86400000);
    const obj = {};
    Object.keys(idx).forEach(function (k) { obj[k] = r[idx[k]]; });
    let col = null, html = null, asunto = null;
    if (!r[idx['Correo día 7']] && dias >= TKT_DIAS.d7 && dias < TKT_DIAS.d21) {
      col = 'Correo día 7'; html = tktCorreoDia7_(obj); asunto = '¿Cómo va tu actividad con el Banco de Materiales? — OTDE';
    } else if (!r[idx['Correo día 21']] && dias >= TKT_DIAS.d21 && !r[idx['Respondió seguimiento']]) {
      col = 'Correo día 21'; html = tktCorreoDia21_(obj); asunto = '¿Cómo te fue? 2 minutos para tu seguimiento — OTDE';
    } else if (!r[idx['Correo día 30']] && dias >= TKT_DIAS.d30) {
      col = 'Correo día 30'; html = tktCorreoDia30_(obj);
      asunto = obj['Respondió seguimiento'] ? 'Gracias por compartir tu práctica — OTDE' : 'Seguimos a la mano — OTDE';
    }
    if (!col) return;
    try {
      tktEnviarCorreo_({ to: obj['Correo'], subject: asunto, htmlBody: html });
      hoja.getRange(i + 2, idx[col] + 1).setValue(new Date());
    } catch (err) {
      hoja.getRange(i + 2, idx[col] + 1).setValue('ERROR: ' + err.message);
    }
  });
}

// Manda a `correo` los tres correos de seguimiento de la última fila, sin marcar nada.
function tktProbarSeguimiento(correo) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TKT_HOJA_TICKETS);
  if (!hoja || hoja.getLastRow() < 2) throw new Error('No hay tickets para probar.');
  const idx = tktIdx_(hoja);
  const r = hoja.getRange(hoja.getLastRow(), 1, 1, hoja.getLastColumn()).getValues()[0];
  const obj = {};
  Object.keys(idx).forEach(function (k) { obj[k] = r[idx[k]]; });
  [['Día 7', tktCorreoDia7_(obj)], ['Día 21', tktCorreoDia21_(obj)], ['Día 30', tktCorreoDia30_(obj)]]
    .forEach(function (p) {
      MailApp.sendEmail({ to: correo, subject: '[PRUEBA ' + p[0] + '] Seguimiento asesoría — OTDE', htmlBody: p[1], name: 'OTDE · SEPRN Nezahualcóyotl' });
    });
}

// ============================================================
// Retroalimentación OTDE (menú)
// ============================================================
function tktEnviarRetroalimentacion() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TKT_HOJA_SEGUIMIENTO);
  if (!hoja || hoja.getLastRow() < 2) return;
  const idx = tktIdx_(hoja);
  const vals = hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
  let enviados = 0;
  vals.forEach(function (r, i) {
    const fort = String(r[idx['Fortaleza (OTDE)']] || '').trim();
    const mej = String(r[idx['Mejora (OTDE)']] || '').trim();
    if (!fort || !mej || r[idx['Retroalimentación enviada']]) return;
    const cuerpo = tktHola_(r[idx['Nombre']]) +
      '<p>Revisamos el reporte de tu actividad. Esta es nuestra retroalimentación, con la rúbrica de la asesoría:</p>' +
      '<div style="background:#F9F8F5;border-left:4px solid #2e7d32;padding:12px 16px;margin:10px 0"><strong>Una fortaleza:</strong><br>' + tktEsc_(fort) + '</div>' +
      '<div style="background:#F9F8F5;border-left:4px solid #bc955b;padding:12px 16px;margin:10px 0"><strong>Una mejora para la próxima:</strong><br>' + tktEsc_(mej) + '</div>' +
      '<p>Gracias por llevar el Banco de Materiales y Chuka a tu grupo.</p>';
    tktEnviarCorreo_({ to: r[idx['Correo']], subject: 'Retroalimentación de tu actividad — OTDE', htmlBody: tktMarco_('Retroalimentación de tu práctica', cuerpo, r[idx['Token']]) });
    hoja.getRange(i + 2, idx['Retroalimentación enviada'] + 1).setValue(new Date());
    enviados++;
  });
  try { SpreadsheetApp.getUi().alert('Retroalimentaciones enviadas: ' + enviados); } catch (x) { /* sin UI */ }
}

// ============================================================
// Resumen semanal para OTDE
// ============================================================
function tktResumenSemanal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ht = ss.getSheetByName(TKT_HOJA_TICKETS);
  const hs = ss.getSheetByName(TKT_HOJA_SEGUIMIENTO);
  if (!ht || ht.getLastRow() < 2) return;
  const hace7 = new Date(Date.now() - 7 * 86400000);
  const it = tktIdx_(ht);
  const tickets = ht.getRange(2, 1, ht.getLastRow() - 1, ht.getLastColumn()).getValues();
  const nuevos = tickets.filter(function (r) { return r[it['Fecha']] >= hace7; });
  const avisos = tickets.filter(function (r) { return r[it['Quiere avisos de asesorías']] === 'Sí'; }).length;
  const necesidades = {};
  tickets.forEach(function (r) {
    String(r[it['Necesidades de seguimiento']] || '').split(';').map(function (s) { return s.trim(); })
      .filter(String).forEach(function (n) { necesidades[n] = (necesidades[n] || 0) + 1; });
  });
  let seg = [], segNuevos = [];
  if (hs && hs.getLastRow() > 1) {
    const is = tktIdx_(hs);
    seg = hs.getRange(2, 1, hs.getLastRow() - 1, hs.getLastColumn()).getValues();
    segNuevos = seg.filter(function (r) { return r[is['Fecha']] >= hace7; });
    var pendRetro = seg.filter(function (r) { return !r[is['Retroalimentación enviada']]; }).length;
  }
  if (!nuevos.length && !segNuevos.length) return;
  const lista = function (obj) {
    return '<ul>' + Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a]; })
      .map(function (k) { return '<li>' + tktEsc_(k) + ': <strong>' + obj[k] + '</strong></li>'; }).join('') + '</ul>';
  };
  const cuerpo = '<p><strong>Esta semana:</strong> ' + nuevos.length + ' respuestas de cierre nuevas · ' + segNuevos.length + ' reportes de seguimiento.</p>' +
    '<p><strong>Acumulado:</strong> ' + tickets.length + ' respuestas de cierre · ' + seg.length + ' reportes · ' +
    (pendRetro || 0) + ' reportes sin retroalimentación.</p>' +
    tktH_('Temas de interés (para planear asesorías)') + lista(necesidades) +
    '<p>Quieren avisos de asesorías y cursos: <strong>' + avisos + '</strong></p>' +
    '<p><a href="' + ss.getUrl() + '" style="color:#9F2241;font-weight:bold">Abrir la hoja y el tablero</a></p>';
  MailApp.sendEmail({
    to: PropertiesService.getScriptProperties().getProperty('RESUMEN_CORREO') || Session.getEffectiveUser().getEmail(),
    subject: 'Resumen semanal — Cierre y seguimiento de asesorías',
    htmlBody: tktMarco_('Resumen semanal de seguimiento', cuerpo, null),
    name: 'OTDE · Sistema de seguimiento'
  });
}
