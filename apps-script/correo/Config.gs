// ============================================================
// SEPRN · OTDE — Webform de Correos Institucionales (ciclo 2026-2027)
// ============================================================
// Proyecto de Apps Script NUEVO y PARALELO al que ya existe
// (Code.gs/OnFormSubmit.gs/OnEditTrigger.gs/ResumenSemanal.gs,
// atado al Google Form actual). No lo sustituye todavía — se
// despliega en una Spreadsheet nueva y separada, y el sitio solo
// deja de usar el <iframe> del Form viejo cuando Jorge decida
// que este webform ya está listo. Mientras tanto ambos sistemas
// conviven sin tocarse.
//
// Arquitectura: 4 tipos de solicitud en vez de los 6 de antes
// (Alta dee + Alta aulamexiquense → un solo "Alta" con columna
// Dominio calculada; mismo criterio para Cambio de Contraseña).
// Reset 2FA e Incidencias se migran tal cual, sin rediseño.
//
// Los 4 tipos ya están implementados: alta, cambio de contraseña,
// reset de 2FA e incidencias — cada uno en su propio archivo,
// enrutados por WebApp.gs según datos.tipo.
//
// IMPLEMENTACIÓN:
//   1. Crear una Spreadsheet nueva (ej. "Solicitudes_Correo_2026_2027")
//   2. Extensiones → Apps Script → pegar todos los archivos .gs
//      de esta carpeta (Config.gs, WebApp.gs, Alta.gs, OnEditAlta.gs)
//   3. Ejecutar recrearTriggerAlta() una vez desde el editor para
//      instalar el activador onEdit (ver OnEditAlta.gs)
//   4. Implementar → Nueva implementación → Aplicación web →
//      Ejecutar como yo → Acceso: Cualquier usuario
//   5. Pegar la URL generada en otde.html en la constante
//      ALTA_CORREO_APPS_SCRIPT_URL
//   6. Configurar Propiedades del script si se quiere notificación
//      por Telegram (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID — por
//      proyecto, no se comparten con otros scripts)
// ============================================================

const CONFIG = {
  remitente: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
  correoResponsable: 'marcos.colin@dee.edu.mx',
  correoOTDE: 'otde.nezahualcoyotl@dee.edu.mx',
  sitioWeb: 'https://educaneza.github.io/seprn-sitio/index.html',
  // Alineado con Mantenimiento/Asesorías/Soporte (seprn-sitio): mismo botón,
  // mismo destino — el buscador de folio de Oficina Virtual ya resuelve los
  // 4 tipos de Correo vía manejarConsultaCorreo() en WebApp.gs.
  ctaSeguimiento: 'https://educaneza.github.io/seprn-sitio/oficina-virtual.html#buscar-folio',
  facebook: 'https://www.facebook.com/SubNeza',
  youtube: 'https://www.youtube.com/@subneza',
  whatsapp: 'https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11',
  videoTutorial2FA: 'https://youtu.be/afue5xqv-sQ',
  manualPDF2FA: 'https://educaneza.github.io/seprn-sitio/pdfs/Manual-Autenticacion-2FA.pdf'
};

// ============================================================
// HELPERS DE TEXTO — copiados tal cual del proyecto viejo
// (Code.gs) porque ya están probados; tolerantes a acentos,
// mayúsculas y espacios al resolver encabezados/valores.
// ============================================================
const MAPA_ACENTOS = { 'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n' };

function normalizarTexto(texto) {
  return (texto || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[áéíóúüñ]/g, c => MAPA_ACENTOS[c]);
}

function esAfirmativo(texto) {
  const n = normalizarTexto(texto);
  return n === 'si' || n === 'true' || n === 'x';
}

function indexOfHeader(headers, nombreBuscado) {
  const objetivo = normalizarTexto(nombreBuscado);
  return headers.findIndex(h => normalizarTexto(h) === objetivo);
}

function indexOfHeaderAlias(headers, alias) {
  for (const nombre of alias) {
    const idx = indexOfHeader(headers, nombre);
    if (idx !== -1) return idx;
  }
  return -1;
}

// ============================================================
// COLUMNAS POR NOMBRE Y ORDEN POR BLOQUES (oct 2026)
// Las 5 hojas siguen el orden en que se llena correo.html: registro → quién la pide →
// centro de trabajo → la solicitud → atención (Marcos, flujo SIGEE) → automáticas. El
// código lee por encabezado (indexOfHeader) y escribe con colCorreo_() /
// filaRealDesdeObjeto_(), nunca por posición, así que mover o insertar columnas no rompe
// nada. Menú "OTDE Correos → Reordenar columnas de las 5 hojas". Se arma dentro de una
// función (no const de nivel superior) porque usa HOJA_* de otros archivos (ver WebApp.gs).
// ============================================================
function encabezadosCorreo_(nombreHoja) {
  const seguimiento = ['NP SIGEE', 'Fecha subida a SIGEE'];
  const cierre = ['Usuario enviado', 'Fecha de entrega', 'Estado general', 'Rechazo notificado', 'ID de envío'];
  const solicitante = ['Nombre', 'Correo Personal', 'Teléfono'];
  const centro = ['CCT', 'Escuela', 'Sector', 'Zona'];
  switch (nombreHoja) {
    case HOJA_ALTA:
      return ['Fecha', 'Folio',
        'Nombre', 'Apellido Paterno', 'Apellido Materno', 'RFC', 'CURP', 'Función', 'Correo Personal', 'Teléfono']
        .concat(centro, ['Dominio', 'Tipo de Cuenta', 'Observaciones'], seguimiento,
          ['Usuario asignado', 'Contraseña asignada', 'Fecha respuesta SIGEE', '¿Cuenta lista?', 'Motivo de rechazo'], cierre);
    case HOJA_CAMBIO:
      return ['Fecha', 'Folio'].concat(solicitante, centro, ['Correo Institucional', 'Dominio', 'Observaciones'], seguimiento,
        ['Contraseña asignada', 'Fecha respuesta SIGEE', '¿Cuenta lista?', 'Motivo de rechazo'], cierre);
    case HOJA_CAMBIO_RESET:
      return ['Fecha', 'Folio'].concat(solicitante, centro,
        ['Correo Institucional', 'Dominio', 'Motivo de pérdida de acceso', 'Observaciones'], seguimiento,
        ['Contraseña asignada', 'Fecha respuesta SIGEE', '¿Cuenta lista?', 'Motivo de rechazo'], cierre);
    case HOJA_RESET:
      return ['Fecha', 'Folio'].concat(solicitante, centro,
        ['Correo Institucional', 'Motivo de pérdida de acceso', 'Observaciones'], seguimiento,
        ['¿Reset listo?', 'Fecha respuesta SIGEE', 'Motivo de rechazo'], cierre);
    case HOJA_INCIDENCIAS:
      return ['Fecha', 'Folio'].concat(solicitante, centro, ['Correo Institucional Afectado', 'Qué problema presentas'],
        seguimiento, ['Usuario asignado', 'Contraseña asignada', 'Fecha respuesta SIGEE', '¿Cuenta lista?', 'Motivo de rechazo'], cierre);
  }
  return null;
}

// Índice 0-based de un encabezado: primero exacto (así "Observaciones" del sistema no
// se confunde con la columna "OBSERVACIONES" que agregó Marcos), si no, sin acentos ni
// mayúsculas (indexOfHeader).
function idxEncabezado_(encabezados, nombre) {
  const limpios = encabezados.map(function (h) { return String(h == null ? '' : h).trim(); });
  const exacto = limpios.indexOf(nombre);
  return exacto !== -1 ? exacto : indexOfHeader(limpios, nombre);
}

function encabezadosHoja_(hoja) {
  return hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0];
}

// Número de columna (1-based) real de un encabezado, para escribir en la hoja.
function colCorreo_(hoja, nombre) {
  const i = idxEncabezado_(encabezadosHoja_(hoja), nombre);
  if (i === -1) throw new Error('La hoja ' + hoja.getName() + ' no tiene la columna "' + nombre + '".');
  return i + 1;
}

// Fila real a partir de {encabezado: valor}, en el orden de la fila 1 de la hoja. Lo que
// no se nombra (columnas de Marcos, columnas a mano) queda en blanco.
function filaRealDesdeObjeto_(hoja, valores) {
  const enc = encabezadosHoja_(hoja);
  const fila = enc.map(function () { return ''; });
  Object.keys(valores).forEach(function (nombre) {
    const i = idxEncabezado_(enc, nombre);
    if (i !== -1) fila[i] = valores[nombre];
  });
  return fila;
}

// Hoja ya existente: agrega AL FINAL, por nombre, cualquier encabezado del orden por
// bloques que le falte, sin mover nada.
function completarEncabezadosCorreo_(hoja) {
  const canon = encabezadosCorreo_(hoja.getName());
  if (!canon) return;
  const enc = encabezadosHoja_(hoja);
  const faltantes = canon.filter(function (h) { return idxEncabezado_(enc, h) === -1; });
  if (!faltantes.length) return;
  hoja.getRange(1, hoja.getLastColumn() + 1, 1, faltantes.length).setValues([faltantes])
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
}

// Hoja nueva: encabezados en el orden por bloques.
function crearHojaCorreo_(ss, nombreHoja, anchos) {
  const hoja = ss.insertSheet(nombreHoja);
  const canon = encabezadosCorreo_(nombreHoja);
  hoja.appendRow(canon);
  hoja.getRange(1, 1, 1, canon.length).setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.setFrozenRows(1);
  Object.keys(anchos || {}).forEach(function (n) { hoja.setColumnWidth(canon.indexOf(n) + 1, anchos[n]); });
  return hoja;
}

// Mayor número de folio con ese prefijo (columna "Folio" por nombre) + 1.
function siguienteFolioCorreo_(hoja, prefix) {
  const datos = hoja.getDataRange().getValues();
  const iFolio = idxEncabezado_(datos[0], 'Folio');
  const maxNum = datos.slice(1)
    .map(function (row) { return String(row[iFolio]); })
    .filter(function (f) { return f.indexOf(prefix) === 0; })
    .map(function (f) { return parseInt(f.replace(prefix, ''), 10) || 0; })
    .reduce(function (a, b) { return Math.max(a, b); }, 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Menú "Reordenar columnas de las 5 hojas". Por hoja: completa encabezados, pone
// título "NOTAS" a una columna sin título que tenga datos (la de Marcos en Cambio y
// Eliminar Autenticación), deja una copia completa "<hoja>_respaldo_AAAAMMDD", mueve
// con moveColumns() (conserva dropdowns, semáforo y protecciones) y verifica COLUMNA POR
// COLUMNA POR POSICIÓN — no por nombre, porque hay encabezados repetidos (NOTAS ×3 en
// Incidencias, Observaciones/OBSERVACIONES en Alta). Las columnas que no son del sistema
// quedan al final, en el mismo orden entre ellas. Mismo candado que los envíos. ──
function reordenarColumnasCorreo() {
  SpreadsheetApp.getUi().alert(reordenarColumnasCorreo_().mensaje);
}

function reordenarColumnasCorreo_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, mensaje: 'Hay una solicitud registrándose en este momento. Intenta de nuevo en unos segundos.' };
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mensajes = [];
    const hojas = [HOJA_ALTA, HOJA_CAMBIO, HOJA_RESET, HOJA_CAMBIO_RESET, HOJA_INCIDENCIAS];
    for (let n = 0; n < hojas.length; n++) {
      const hoja = ss.getSheetByName(hojas[n]);
      if (!hoja) continue;
      const r = reordenarHojaCorreo_(ss, hoja);
      if (!r.ok) return r;
      mensajes.push(r.mensaje);
    }
    configurarValidacionYSemaforo_();
    hojas.forEach(function (nombre) { const h = ss.getSheetByName(nombre); if (h) segPrepararColumnas_(h); });
    return { ok: true, mensaje: 'Listo. ' + mensajes.join(' ') };
  } finally {
    lock.releaseLock();
  }
}

function reordenarHojaCorreo_(ss, hoja) {
  const nombre = hoja.getName();
  const canon = encabezadosCorreo_(nombre);
  completarEncabezadosCorreo_(hoja);
  SpreadsheetApp.flush();

  // Título a columnas sin encabezado que sí tienen datos (si no, quedarían "invisibles").
  const datos0 = hoja.getDataRange().getValues();
  datos0[0].forEach(function (h, i) {
    if (String(h).trim()) return;
    const conDatos = datos0.slice(1).some(function (r) { return String(r[i] == null ? '' : r[i]).trim() !== ''; });
    if (conDatos) hoja.getRange(1, i + 1).setValue('NOTAS').setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  });
  SpreadsheetApp.flush();

  const antes = hoja.getDataRange().getValues();
  const enc = antes[0].map(function (h) { return String(h).trim(); });
  // orig[k] = columna original (0-based) que hoy está en la posición k.
  const orig = enc.map(function (_, i) { return i; });
  const enOrden = canon.every(function (h, k) { return idxEncabezado_(enc, h) === k; });
  if (enOrden) return { ok: true, mensaje: nombre + ' ya estaba en el orden nuevo.' };

  const tz = 'America/Mexico_City';
  let nombreRespaldo = nombre + '_respaldo_' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  if (ss.getSheetByName(nombreRespaldo)) nombreRespaldo += '_' + Utilities.formatDate(new Date(), tz, 'HHmm');
  const respaldo = hoja.copyTo(ss).setName(nombreRespaldo);
  respaldo.setTabColor('#948A8E');
  ss.setActiveSheet(respaldo);
  ss.moveActiveSheet(ss.getNumSheets());

  canon.forEach(function (h, k) {
    const i = idxEncabezado_(enc, h);
    if (i === -1 || i === k) return;
    hoja.moveColumns(hoja.getRange(1, i + 1), k + 1);
    enc.splice(k, 0, enc.splice(i, 1)[0]);
    orig.splice(k, 0, orig.splice(i, 1)[0]);
  });
  SpreadsheetApp.flush();

  const despues = hoja.getDataRange().getValues();
  const valor = function (v) { return v instanceof Date ? v.getTime() : String(v == null ? '' : v); };
  const diferencias = [];
  if (despues.length !== antes.length) diferencias.push('filas ' + antes.length + ' → ' + despues.length);
  if (despues[0].length !== antes[0].length) diferencias.push('columnas ' + antes[0].length + ' → ' + despues[0].length);
  for (let k = 0; k < orig.length && diferencias.length < 5; k++) {
    for (let r = 0; r < antes.length; r++) {
      if (valor(antes[r][orig[k]]) !== valor((despues[r] || [])[k])) {
        diferencias.push(String(antes[0][orig[k]] || '(sin título)') + ' fila ' + (r + 1));
        break;
      }
    }
  }
  if (diferencias.length) {
    return { ok: false, mensaje: 'ATENCIÓN: en ' + nombre + ' la verificación encontró diferencias (' + diferencias.join('; ') +
      '). Los datos originales están completos en la hoja "' + nombreRespaldo + '". No captures nada y avisa antes de continuar.' };
  }
  const extras = enc.slice(canon.length).filter(Boolean);
  return { ok: true, mensaje: nombre + ': ' + (antes.length - 1) + ' fila(s) verificadas columna por columna, respaldo "' +
    nombreRespaldo + '".' + (extras.length ? ' Columnas de Marcos al final: ' + extras.join(', ') + '.' : '') };
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── Modo de prueba: redirige TODOS los correos salientes (confirmación +
// credenciales/notificación) a un solo correo, para probar el flujo completo
// sin que le lleguen credenciales/avisos reales a nadie. Actívalo corriendo
// activarModoPruebaCorreo('tu@correo.com') una vez desde el editor de Apps
// Script; desactívalo con desactivarModoPruebaCorreo(). No requiere redeploy
// en ningún sentido — es una Script Property, se lee en cada envío. ──
function activarModoPruebaCorreo(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function desactivarModoPruebaCorreo() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

function enviarCorreoConModoPrueba_(opciones) {
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (correoPrueba) {
    const destinoOriginal = [
      opciones.to ? 'Para: ' + opciones.to : '',
      opciones.cc ? 'CC: ' + opciones.cc : '',
      opciones.bcc ? 'CCO: ' + opciones.bcc : ''
    ].filter(Boolean).join(' · ');
    opciones = Object.assign({}, opciones, {
      to: correoPrueba,
      cc: null,
      bcc: null,
      subject: '[PRUEBA] ' + opciones.subject,
      htmlBody: '<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;' +
        'padding:10px 16px;margin-bottom:16px;font-family:Arial,Helvetica,sans-serif;' +
        'font-size:13px;color:#555;"><strong>Modo de prueba activo</strong> — destino real: ' +
        destinoOriginal + '</div>' + (opciones.htmlBody || '')
    });
  }
  MailApp.sendEmail(opciones);
}

// ── Escapa HTML/Markdown de campos capturados por el solicitante antes de
// insertarlos en el cuerpo de un correo o mensaje de Telegram — los 4
// endpoints son públicos, así que sin esto cualquiera podría inyectar
// <a>/<img> en un correo con membrete institucional real, o un link falso
// en Telegram. ──
function escapeHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeMarkdown_(valor) {
  return String(valor == null ? '' : valor).replace(/([_*[\]`])/g, '\\$1');
}

// ── "Planchado" de las 5 hojas (Alta/Cambio/Reset/Cambio y Eliminar
// Autenticación/Incidencias): dropdowns suaves + semáforo por color en
// "Estado general" + protección de solo aviso en columnas automáticas.
// Utilidades compartidas aquí (a diferencia de mantenimiento.gs/
// asesorias.gs en seprn-sitio, que son proyectos separados y duplican
// cada helper) — cada Xxx.gs las usa desde su propia función
// `xxxAplicarSemaforoYProteccion_()`. Ver configurarValidacionYSemaforo()
// más abajo para correrlas las 5 de una vez. ──
function aplicarValidacionListaSuave_(hoja, columna, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
  hoja.getRange(2, columna, 1000, 1).setDataValidation(regla);
}

// Colorea el fondo de una celda según su valor exacto — quita cualquier
// regla previa de ESTA columna antes de reescribirla, para poder correr la
// función varias veces sin acumular reglas duplicadas.
function aplicarSemaforoPorValor_(hoja, columna, colores) {
  const rango = hoja.getRange(2, columna, 1000, 1);
  const reglasSinEstaColumna = hoja.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (rg) { return rg.getColumn() !== columna; });
  });
  const reglasNuevas = Object.keys(colores).map(function (valor) {
    return SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(valor)
      .setBackground(colores[valor])
      .setRanges([rango])
      .build();
  });
  hoja.setConditionalFormatRules(reglasSinEstaColumna.concat(reglasNuevas));
}

// Protección "solo aviso": no bloquea a nadie (todos los editores del Sheet
// pueden seguir guardando), solo muestra una advertencia antes de
// sobreescribir una celda que el sistema llena solo.
function protegerColumnaAutomatica_(hoja, columna) {
  const yaProtegida = hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    const r = p.getRange();
    return r.getColumn() === columna && r.getRow() === 2;
  });
  if (yaProtegida) return;
  hoja.getRange(2, columna, 1000, 1).protect()
    .setWarningOnly(true)
    .setDescription('Columna automática — se llena sola, evita editarla a mano.');
}

// ── Corre las 4 funciones de planchado (una por hoja) de una sola vez.
// Idempotente — se puede repetir sin riesgo. No toca los dropdowns de
// "Estado general" que ya existían (altaAplicarValidacionEstado() y
// equivalentes en los otros 3 archivos) ni ningún trigger onEdit; cada
// obtenerHoja() (altaObtenerHoja(), etc.) ya llama a su función de planchado
// también, así que una hoja recién creada queda al día sola en su primer
// doPost — esta función es solo para ponerse al día de inmediato sin
// esperar una solicitud nueva. ──
function configurarValidacionYSemaforo() {
  configurarValidacionYSemaforo_();
  try {
    SpreadsheetApp.getUi().alert('Validación y semáforo aplicados en Alta/Cambio de Contraseña/Reset 2FA/Cambio y Eliminar Autenticación/Incidencias.');
  } catch (err) {}
}

function configurarValidacionYSemaforo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const alta = ss.getSheetByName(HOJA_ALTA);
  if (alta) { altaAplicarValidacionEstado(alta); altaAplicarSemaforoYProteccion_(alta); }
  const cambio = ss.getSheetByName(HOJA_CAMBIO);
  if (cambio) { cambioAplicarValidacionEstado(cambio); cambioAplicarSemaforoYProteccion_(cambio); }
  const reset = ss.getSheetByName(HOJA_RESET);
  if (reset) { resetAplicarValidacionEstado(reset); resetAplicarSemaforoYProteccion_(reset); }
  const cambioReset = ss.getSheetByName(HOJA_CAMBIO_RESET);
  if (cambioReset) { cambioResetAplicarValidacionEstado(cambioReset); cambioResetAplicarSemaforoYProteccion_(cambioReset); }
  const incidencias = ss.getSheetByName(HOJA_INCIDENCIAS);
  if (incidencias) { incidenciaAplicarValidacionEstado(incidencias); incidenciaAplicarSemaforoYProteccion_(incidencias); }
}

// ── Recuadro "Vincula 2 celulares" (oct 2026) para los correos que piden configurar
// Microsoft Authenticator (Alta, Eliminar autenticación, Cambio + Eliminar). Corto y
// con el paso concreto: el tutorial ya se enviaba, pero casi nadie agregaba un
// segundo dispositivo y la escuela se quedaba sin acceso al perder el celular. ──
function recuadroDosDispositivosHTML_() {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f0;border:2px solid #9F2241;border-radius:6px;margin-bottom:18px;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<p style="margin:0 0 6px 0;font-size:15px;color:#9F2241;font-weight:bold;">📱📱 Vincula 2 celulares: si pierdes uno, no pierdes tu correo</p>' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.6;">Celular perdido, robado, cambiado o app desinstalada son la causa número uno de cuentas bloqueadas. Al terminar de configurar la app, agrega un segundo dispositivo (el de otra persona de la escuela o uno tuyo de respaldo):</p>' +
    '<p style="margin:0 0 4px 0;font-size:14px;color:#333333;line-height:1.6;">1. Entra a <a href="https://mysignins.microsoft.com/security-info" style="color:#9F2241;font-weight:bold;">mysignins.microsoft.com/security-info</a></p>' +
    '<p style="margin:0 0 4px 0;font-size:14px;color:#333333;line-height:1.6;">2. Elige <strong>"Agregar método de inicio de sesión"</strong> → <strong>Microsoft Authenticator</strong>.</p>' +
    '<p style="margin:0;font-size:14px;color:#333333;line-height:1.6;">3. Escanea el código QR con el segundo celular.</p>' +
    '</td></tr></table>';
}

// ── Notificar por Telegram a OTDE (silencioso si falla o no está configurado) ──
function notificarTelegram(mensaje) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: { chat_id: chatId, text: mensaje, parse_mode: 'Markdown' },
      muteHttpExceptions: true
    });
  } catch (err) {
    // Silencioso: el registro ya quedó en Sheets aunque falle la notificación
  }
}
