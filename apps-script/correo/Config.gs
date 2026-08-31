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
