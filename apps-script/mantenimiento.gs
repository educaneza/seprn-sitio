// ============================================================
// SEPRN · OTDE — Solicitudes de Mantenimiento (captura en línea)
// Complementa el oficio (que sigue siendo el respaldo oficial):
// digitaliza los datos y adjunta el oficio escaneado, en vez de
// que OTDE los transcriba a mano a la hoja de seguimiento del
// sistema de Reportes de Visitas.
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Llena manualmente la hoja "Contactos_Zona_Sector" (se crea
//      sola con encabezados la primera vez que corra doPost) con
//      el correo de cada Zona/Sector — sin esto no hay a quién
//      notificar, pero la solicitud se sigue registrando igual.
//   4. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token del bot (ver soporte-remoto.gs
//          para instrucciones completas de cómo obtenerlo — puede
//          ser el mismo bot que ya usan, pero las Propiedades del
//          script son por proyecto, hay que configurarlo de nuevo
//          aquí aunque sea el mismo valor)
//        TELEGRAM_CHAT_ID   = chat_id del mismo bot
//   5. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   6. Copia la URL generada y pégala en otde.html en la
//      constante MANTENIMIENTO_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA "Solicitudes":
//   A Fecha | B Folio | C Nombre | D Función | E CCT | F Sector
//   G Zona | H Escuela | I Turno | J WhatsApp | K Correo
//   L Equipos con falla | M Oficio (link Drive) | N Estatus | O Notas de revisión
//
// COLUMNAS DE LA HOJA "Contactos_Zona_Sector" (Jorge la llena a mano):
//   A Sector | B Zona | C Correo | D Teléfono
// ============================================================

const HOJA_MAN_SOLICITUDES = 'Solicitudes';
const HOJA_MAN_CONTACTOS = 'Contactos_Zona_Sector';
const CARPETA_MAN_OFICIOS = 'Oficios de Mantenimiento';
const MAN_TAMANO_MAX_BYTES = 8 * 1024 * 1024; // 8MB, margen sobre el límite de 5MB validado en el cliente

// ── doGet: verificación de estado ──
function doGet() {
  return manTextResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Solicitudes de Mantenimiento' }));
}

// ── doPost: recibe solicitud de mantenimiento ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    manValidarCampos(datos);

    const oficioUrl = manSubirOficio(datos);

    const hoja = manObtenerHojaSolicitudes();
    const folio = manGenerarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.nombre.trim(),
      datos.funcion.trim(),
      datos.cct.trim().toUpperCase(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      (datos.escuela || '').trim(),
      datos.turno.trim(),
      datos.whatsapp.trim(),
      (datos.correo || '').trim(),
      datos.equipos.trim(),
      oficioUrl,
      'Pendiente de validar',
      ''
    ]);

    manNotificarTelegram(folio, datos, oficioUrl);

    const contacto = manBuscarContactoZonaSector(datos.sector, datos.zona);
    if (contacto) {
      manNotificarZonaSector(folio, datos, contacto);
    }

    return manTextResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return manTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Obtener o crear la hoja de solicitudes ──
function manObtenerHojaSolicitudes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_MAN_SOLICITUDES);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_MAN_SOLICITUDES);
    hoja.appendRow([
      'Fecha', 'Folio', 'Nombre', 'Función', 'CCT', 'Sector', 'Zona',
      'Escuela', 'Turno', 'WhatsApp', 'Correo', 'Equipos con falla',
      'Oficio (link Drive)', 'Estatus', 'Notas de revisión'
    ]);
    const header = hoja.getRange(1, 1, 1, 15);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180);  // Nombre
    hoja.setColumnWidth(8, 200);  // Escuela
    hoja.setColumnWidth(12, 260); // Equipos con falla
    hoja.setColumnWidth(13, 220); // Oficio
  }

  manAsegurarHojaContactos(ss);

  return hoja;
}

// ── Crear la hoja de contactos vacía si no existe (Jorge la llena a mano) ──
function manAsegurarHojaContactos(ss) {
  let hoja = ss.getSheetByName(HOJA_MAN_CONTACTOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_MAN_CONTACTOS);
    hoja.appendRow(['Sector', 'Zona', 'Correo', 'Teléfono']);
    const header = hoja.getRange(1, 1, 1, 4);
    header.setFontWeight('bold')
          .setBackground('#977e5b')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 240);
  }
}

// ── Generar folio único ──
function manGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-MAN-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function manValidarCampos(d) {
  const requeridos = ['nombre', 'cct', 'escuela', 'turno', 'funcion', 'whatsapp', 'equipos'];
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
  if (!d.oficioBase64 || !d.oficioNombre) {
    throw new Error('Falta adjuntar el oficio.');
  }
}

// ── Subir el oficio adjunto a Drive, devuelve el URL para verlo ──
function manSubirOficio(d) {
  const bytes = Utilities.base64Decode(d.oficioBase64);
  if (bytes.length > MAN_TAMANO_MAX_BYTES) {
    throw new Error('El oficio adjunto es demasiado grande (máximo 8MB).');
  }

  const mimeType = d.oficioTipo || 'application/octet-stream';
  const nombreLimpio = (d.cct || 'SIN-CCT').trim().toUpperCase() + ' — ' + d.oficioNombre;
  const blob = Utilities.newBlob(bytes, mimeType, nombreLimpio);

  const carpeta = manObtenerCarpetaOficios();
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return archivo.getUrl();
}

// ── Obtener o crear la carpeta de Drive para los oficios ──
function manObtenerCarpetaOficios() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_MAN_OFICIOS);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_MAN_OFICIOS);
}

// ── Buscar el contacto de la Zona/Sector en la hoja de contactos ──
function manBuscarContactoZonaSector(sector, zona) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAN_CONTACTOS);
  if (!hoja) return null;

  const datos = hoja.getDataRange().getValues();
  const sectorNorm = String(sector || '').trim().toUpperCase();
  const zonaNorm = String(zona || '').trim();

  for (let i = 1; i < datos.length; i++) {
    const filaSector = String(datos[i][0] || '').trim().toUpperCase();
    const filaZona = String(datos[i][1] || '').trim();
    const correo = String(datos[i][2] || '').trim();
    if (!correo) continue;

    // Coincidencia por Zona exacta si la fila trae zona, si no por Sector.
    const coincideZona = filaZona && zonaNorm && filaZona === zonaNorm;
    const coincideSector = filaSector && sectorNorm && filaSector === sectorNorm;

    if (coincideZona || (!filaZona && coincideSector)) {
      return { correo: correo, telefono: String(datos[i][3] || '').trim() };
    }
  }
  return null;
}

// ── Notificar por Telegram a OTDE (no interrumpe el registro si falla) ──
function manNotificarTelegram(folio, d, oficioUrl) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const mensaje =
      '🛠 *Nueva solicitud de Mantenimiento*\n' +
      'Folio: ' + folio + '\n' +
      'Nombre: ' + d.nombre.trim() + ' (' + d.funcion.trim() + ')\n' +
      'CCT: ' + d.cct.trim().toUpperCase() + (d.escuela ? ' — ' + d.escuela.trim() : '') + '\n' +
      (d.sector ? 'Sector ' + d.sector + (d.zona ? ' · Zona ' + d.zona : '') + '\n' : '') +
      'Turno: ' + d.turno.trim() + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + '\n' +
      'Equipos con falla: ' + d.equipos.trim() + '\n' +
      'Oficio: ' + oficioUrl;

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

// ── Notificar por correo a la Zona/Sector correspondiente ──
function manNotificarZonaSector(folio, d, contacto) {
  try {
    const asunto = 'Nueva solicitud de mantenimiento — ' + (d.escuela || d.cct);
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Nueva solicitud de mantenimiento</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Se registró una solicitud de mantenimiento de un centro de trabajo de tu Zona/Sector. Solo es informativo — OTDE la está atendiendo directamente.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + (d.escuela || '') + ' — ' + d.cct.trim().toUpperCase() + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicita:</strong> ' + d.nombre.trim() + ' (' + d.funcion.trim() + ')</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Equipos con falla:</strong> ' + d.equipos.trim() + '</p>' +
      '</div></div>';

    MailApp.sendEmail({
      to: contacto.correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada aunque falle este aviso
  }
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function manTextResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
