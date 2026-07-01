// ============================================================
// SEPRN · OTDE — Soporte Técnico Remoto
// Endpoint para solicitudes de soporte remoto (TeamViewer)
// Registra en Sheets y notifica por Telegram al equipo OTDE
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token que te da @BotFather
//        TELEGRAM_CHAT_ID   = chat_id que te devuelve getUpdates
//      (ver instrucciones para obtenerlos al final de este archivo)
//   4. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL generada y pégala en otde.html
//      en la constante SOPORTE_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA:
//   A Fecha | B Folio | C Nombre | D CCT | E Sector | F Zona
//   G Escuela/Unidad | H Función/Cargo | I WhatsApp | J Correo
//   K Descripción | L Urgencia
// ============================================================

const HOJA_SOPORTE = 'Solicitudes_Soporte_2026';

// ── doGet: verificación de estado ──
function doGet() {
  return textResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Soporte Técnico Remoto' }));
}

// ── doPost: recibe solicitud de soporte ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    validarCampos(datos);

    const hoja  = obtenerHojaSoporte();
    const folio = generarFolioSoporte(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.nombre.trim(),
      datos.cct.trim().toUpperCase(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      (datos.escuela || '').trim(),
      datos.funcion.trim(),
      datos.whatsapp.trim(),
      (datos.correo || '').trim(),
      datos.descripcion.trim(),
      datos.urgencia.trim()
    ]);

    notificarTelegram(folio, datos);

    return textResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Obtener o crear la hoja ──
function obtenerHojaSoporte() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let hoja   = ss.getSheetByName(HOJA_SOPORTE);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_SOPORTE);
    hoja.appendRow([
      'Fecha', 'Folio', 'Nombre', 'CCT', 'Sector', 'Zona',
      'Escuela/Unidad', 'Función/Cargo', 'WhatsApp', 'Correo', 'Descripción', 'Urgencia'
    ]);
    const header = hoja.getRange(1, 1, 1, 12);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180); // Nombre
    hoja.setColumnWidth(7, 200); // Escuela/Unidad
    hoja.setColumnWidth(11, 320); // Descripción
  }

  return hoja;
}

// ── Generar folio único ──
function generarFolioSoporte(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-SOP-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function validarCampos(d) {
  const requeridos = ['nombre', 'cct', 'escuela', 'funcion', 'whatsapp', 'descripcion', 'urgencia'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (d.correo && String(d.correo).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
}

// ── Notificar por Telegram (no interrumpe el registro si falla) ──
function notificarTelegram(folio, d) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const urgenciaEmoji = { 'Alta': '🔴', 'Media': '🟡', 'Baja': '🟢' };
    const marca = urgenciaEmoji[d.urgencia] || '⚪';
    const whatsappDigits = d.whatsapp.trim().replace(/\D/g, '');
    const whatsappLink = 'https://wa.me/52' + whatsappDigits;

    const mensaje =
      marca + ' *Nueva solicitud de Soporte Remoto*\n' +
      'Folio: ' + folio + '\n' +
      'Urgencia: ' + d.urgencia + '\n' +
      'Nombre: ' + d.nombre.trim() + '\n' +
      'CCT: ' + d.cct.trim().toUpperCase() + (d.escuela ? ' — ' + d.escuela.trim() : '') + '\n' +
      (d.sector ? 'Sector ' + d.sector + (d.zona ? ' · Zona ' + d.zona : '') + '\n' : '') +
      'Función: ' + d.funcion.trim() + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + ' — [Abrir chat](' + whatsappLink + ')\n' +
      (d.correo && d.correo.trim() ? 'Correo: ' + d.correo.trim() + '\n' : '') +
      'Descripción: ' + d.descripcion.trim();

    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: {
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'Markdown'
      },
      muteHttpExceptions: true
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada en Sheets aunque falle la notificación
  }
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// CÓMO OBTENER EL TOKEN Y CHAT_ID DE TELEGRAM
// ============================================================
// 1. En Telegram, busca "@BotFather" e inicia conversación.
// 2. Envía /newbot, sigue las instrucciones (nombre y username
//    del bot, este último debe terminar en "bot").
// 3. BotFather te entrega un TOKEN como:
//    123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
// 4. Busca el username de tu nuevo bot en Telegram y envíale
//    cualquier mensaje (ej. "hola") para "activar" el chat.
// 5. Desde un navegador, visita (reemplaza <TOKEN>):
//    https://api.telegram.org/bot<TOKEN>/getUpdates
//    Busca "chat":{"id":XXXXXXXXX  — ese número es tu CHAT_ID.
// 6. En Apps Script: ícono de engrane (Configuración del
//    proyecto) → Propiedades del script → Agregar propiedad del
//    script:
//      TELEGRAM_BOT_TOKEN = <tu token>
//      TELEGRAM_CHAT_ID   = <tu chat id>
// ============================================================
