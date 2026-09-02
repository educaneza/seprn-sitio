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

// ── "Planchado" de las 4 hojas (Alta/Cambio/Reset/Incidencias): dropdowns
// suaves + semáforo por color en "Estado general" + protección de solo
// aviso en columnas automáticas. Utilidades compartidas aquí (a diferencia
// de mantenimiento.gs/asesorias.gs en seprn-sitio, que son proyectos
// separados y duplican cada helper) — cada Xxx.gs las usa desde su propia
// función `xxxAplicarSemaforoYProteccion_()`. Ver configurarValidacionYSemaforo()
// más abajo para correrlas las 4 de una vez. ──
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const alta = ss.getSheetByName(HOJA_ALTA);
  if (alta) altaAplicarSemaforoYProteccion_(alta);
  const cambio = ss.getSheetByName(HOJA_CAMBIO);
  if (cambio) cambioAplicarSemaforoYProteccion_(cambio);
  const reset = ss.getSheetByName(HOJA_RESET);
  if (reset) resetAplicarSemaforoYProteccion_(reset);
  const incidencias = ss.getSheetByName(HOJA_INCIDENCIAS);
  if (incidencias) incidenciaAplicarSemaforoYProteccion_(incidencias);
  try {
    SpreadsheetApp.getUi().alert('Validación y semáforo aplicados en Alta/Cambio de Contraseña/Reset 2FA/Incidencias.');
  } catch (err) {}
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
