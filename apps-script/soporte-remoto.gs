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
//   K Descripción | L Urgencia | M Tipo de ayuda | N Estatus
//   O Notas de revisión | P Notificación de cierre enviada
//
// CIERRE AUTOMÁTICO (ago 2026, mismo patrón que mantenimiento.gs/
// asesorias.gs): al marcar Estatus = "Resuelto", un trigger onEdit
// instalable (sopOnEditCierre) notifica por correo al solicitante.
// A diferencia de Mantenimiento/Asesorías, Soporte no tiene hoja de
// Contactos_Zona_Sector ni avisa a Zona/Sector — decisión deliberada,
// no un pendiente olvidado. Requiere correr UNA vez
// sopInstalarTriggerCierre() (o el menú "OTDE Soporte" que crea
// onOpen()) después de pegar esta versión.
//
// CONSULTA DE FOLIO (Oficina Virtual OTDE): doGet(?action=consulta&
// folio=...&correo=...) devuelve estatus/fecha/notas si el folio y
// el correo coinciden, o {status:'no_encontrado'} en cualquier otro
// caso.
// ============================================================

const HOJA_SOPORTE = 'Solicitudes_Soporte_2026';

const ENCABEZADOS_SOPORTE = [
  'Fecha', 'Folio', 'Nombre', 'CCT', 'Sector', 'Zona',
  'Escuela/Unidad', 'Función/Cargo', 'WhatsApp', 'Correo', 'Descripción', 'Urgencia', 'Tipo de ayuda',
  'Estatus', 'Notas de revisión', 'Notificación de cierre enviada'
];
const COL_SOP_ESTATUS = 14;
const COL_SOP_NOTIFICACION_CIERRE = 16;
const ESTADOS_SOP_VALIDOS = ['Pendiente de validar', 'Validado', 'En atención', 'Resuelto', 'Rechazado'];

// ── Modo de prueba: redirige el correo de cierre al solicitante a un solo
// correo, para probar el flujo completo sin avisarle a nadie real. Actívalo
// corriendo sopActivarModoPrueba('tu@correo.com') una vez desde el editor de
// Apps Script; desactívalo con sopDesactivarModoPrueba(). No requiere
// redeploy — es una Script Property, se lee en cada envío. ──
function sopActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function sopDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

// ── Escapa HTML/Markdown de campos capturados por el solicitante antes de
// insertarlos en el cuerpo de un correo o mensaje de Telegram — el endpoint
// es público, así que sin esto cualquiera podría inyectar <a>/<img> en un
// correo con membrete institucional real, o un link falso en Telegram. ──
function sopEscapeHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sopEscapeMarkdown_(valor) {
  return String(valor == null ? '' : valor).replace(/([_*[\]`])/g, '\\$1');
}

function sopEnviarCorreo_(opciones) {
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

// ── doGet: verificación de estado, o consulta de folio (?action=consulta) ──
function doGet(e) {
  const accion = e && e.parameter && e.parameter.action;
  if (accion === 'consulta') {
    return sopConsultarFolio(e.parameter.folio, e.parameter.correo);
  }
  return textResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Soporte Técnico Remoto' }));
}

// ── Consulta de estatus por folio + correo (Oficina Virtual OTDE) ──
// Mismo diseño que manConsultarFolio()/aseConsultarFolio(): lectura directa
// por getSheetByName(), sin pasar por obtenerHojaSoporte() (esa función
// escribe — auto-heal, validación), y mismo mensaje genérico si el folio no
// existe o el correo no coincide.
function sopConsultarFolio(folioBuscado, correoBuscado) {
  const noEncontrado = function () {
    return textResponse(JSON.stringify({ status: 'no_encontrado' }));
  };
  if (!folioBuscado || !correoBuscado) return noEncontrado();

  const folio = String(folioBuscado).trim().toUpperCase();
  const correo = String(correoBuscado).trim().toLowerCase();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (!hoja) return noEncontrado();

  const filas = hoja.getDataRange().getValues().slice(1);
  const fila = filas.find(r => String(r[1]).trim().toUpperCase() === folio);
  if (!fila || String(fila[9]).trim().toLowerCase() !== correo) return noEncontrado();

  return textResponse(JSON.stringify({
    status: 'ok',
    folio: fila[1],
    fecha: fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0]),
    estatus: fila[COL_SOP_ESTATUS - 1] || 'Pendiente de validar',
    notas: fila[14] || ''
  }));
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
      datos.urgencia.trim(),
      (datos.tipoAyuda || '').trim(),
      'Pendiente de validar',
      '',
      ''
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
    hoja.appendRow(ENCABEZADOS_SOPORTE);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_SOPORTE.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180); // Nombre
    hoja.setColumnWidth(7, 200); // Escuela/Unidad
    hoja.setColumnWidth(11, 320); // Descripción
  } else {
    // Hoja creada antes de agregar Estatus/Notas de revisión/Notificación de
    // cierre: se completa el encabezado faltante sin tocar columnas ni datos
    // ya existentes — mismo patrón que manObtenerHojaSolicitudes().
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_SOPORTE.length) {
      const faltantes = ENCABEZADOS_SOPORTE.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  sopAplicarValidacionEstatus(hoja);

  return hoja;
}

// ── Dropdown de valores válidos en la columna Estatus (idempotente) ──
function sopAplicarValidacionEstatus(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_SOP_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_SOP_ESTATUS, 1000, 1).setDataValidation(regla);
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
  const requeridos = ['nombre', 'cct', 'escuela', 'funcion', 'whatsapp', 'correo', 'descripcion', 'urgencia', 'tipoAyuda'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.correo).trim())) {
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
      'Nombre: ' + sopEscapeMarkdown_(d.nombre.trim()) + '\n' +
      'CCT: ' + sopEscapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + sopEscapeMarkdown_(d.escuela.trim()) : '') + '\n' +
      (d.sector ? 'Sector ' + sopEscapeMarkdown_(d.sector) + (d.zona ? ' · Zona ' + sopEscapeMarkdown_(d.zona) : '') + '\n' : '') +
      'Función: ' + sopEscapeMarkdown_(d.funcion.trim()) + '\n' +
      'Tipo de ayuda: ' + sopEscapeMarkdown_((d.tipoAyuda || '').trim()) + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + ' — [Abrir chat](' + whatsappLink + ')\n' +
      (d.correo && d.correo.trim() ? 'Correo: ' + d.correo.trim() + '\n' : '') +
      'Descripción: ' + sopEscapeMarkdown_(d.descripcion.trim());

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

// ── onEdit instalable: dispara al marcar Estatus = "Resuelto" ──
// No se llama "onEdit" a propósito: así solo corre vía el trigger instalable
// (sopInstalarTriggerCierre), nunca como trigger simple sin autorización
// para MailApp. Mismo patrón que manOnEditCierre()/aseOnEditCierre(), pero
// solo notifica al solicitante — Soporte no tiene Contactos_Zona_Sector.
function sopOnEditCierre(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_SOPORTE) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_SOP_ESTATUS < colInicio || COL_SOP_ESTATUS > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const estatus = String(hoja.getRange(fila, COL_SOP_ESTATUS).getValue()).trim();
      if (estatus !== 'Resuelto') continue;

      const yaNotificado = String(hoja.getRange(fila, COL_SOP_NOTIFICACION_CIERRE).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_SOPORTE.length).getValues()[0];
      const folio = datosFila[1];
      const cct = datosFila[3];
      const escuela = datosFila[6];
      const correo = datosFila[9];
      const notas = datosFila[14];

      if (correo) {
        sopNotificarCierreSolicitante(folio, escuela, cct, notas, correo);
      }
      hoja.getRange(fila, COL_SOP_NOTIFICACION_CIERRE).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Avisa al solicitante que su ticket fue resuelto ──
function sopNotificarCierreSolicitante(folio, escuela, cct, notas, correo) {
  try {
    const asunto = 'Tu solicitud de soporte técnico fue resuelta — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#56212f;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de soporte técnico resuelta</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Tu solicitud de soporte técnico remoto fue marcada como resuelta por OTDE.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + sopEscapeHtml_(escuela || '') + ' — ' + sopEscapeHtml_(cct) + '</p>' +
      (notas ? '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Notas:</strong> ' + sopEscapeHtml_(notas) + '</p>' : '') +
      '</div></div>';

    sopEnviarCorreo_({
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ── Instala el trigger de cierre automático (seguro correrlo de nuevo:
// borra cualquier instalación previa antes de crear una nueva) ──
function sopInstalarTriggerCierre() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sopOnEditCierre') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sopOnEditCierre')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de cierre automático instalado.'); } catch (err) {}
}

// ── Quita el trigger de cierre automático ──
function sopDesinstalarTriggerCierre() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sopOnEditCierre') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de cierre eliminado(s).'); } catch (err) {}
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Soporte')
    .addItem('Instalar trigger de cierre automático', 'sopInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'sopDesinstalarTriggerCierre')
    .addToUi();
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
