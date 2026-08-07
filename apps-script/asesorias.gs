// ============================================================
// SEPRN · OTDE — Solicitudes de Asesoría (captura en línea)
// Complementa el oficio (que sigue siendo el respaldo oficial),
// mismo patrón que apps-script/mantenimiento.gs.
//
// Contexto del trámite: tras una visita de mantenimiento (Banco
// de Materiales, Chuka ya instalados), el técnico le ofrece al
// director una asesoría/taller sobre su uso pedagógico. Si el
// director acepta, elabora su oficio y lo manda a OTDE. Hoy ese
// control se lleva en un Excel simple sin nada automatizado
// (columnas: N.P., Número de Oficio, Sector, Zona, Escuela, CCT,
// Turno, Fecha de recepción, Número de Docentes, Estatus, Fecha
// de visita, Observaciones) — este script solo digitaliza la
// captura inicial, no sustituye ese control ni el oficio.
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Llena manualmente la hoja "Contactos_Zona_Sector" (se crea
//      sola con encabezados la primera vez que corra doPost) con
//      el correo de cada Zona/Sector
//   4. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token del bot (Propiedades del
//          script son por proyecto — hay que configurarlo aquí
//          aunque sea el mismo bot que en soporte-remoto.gs)
//        TELEGRAM_CHAT_ID   = chat_id del mismo bot
//   5. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   6. Copia la URL generada y pégala en otde.html en la
//      constante ASESORIAS_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA "Solicitudes":
//   A Fecha | B Folio | C Tipo de Asesoría | D Nombre | E Función | F CCT
//   G Sector | H Zona | I Escuela | J Turno | K Número de Docentes
//   L WhatsApp | M Correo | N Observaciones | O Oficio (link Drive)
//   P Estatus | Q Notas de revisión | R Confirmó Mantenimiento Previo
//   S Notificación de cierre enviada
//
// COLUMNAS DE LA HOJA "Contactos_Zona_Sector" (Jorge la llena a mano):
//   A Sector | B Zona | C Correo | D Teléfono
//
// CIERRE AUTOMÁTICO: al marcar Estatus = "Resuelto" en la hoja "Solicitudes",
// un trigger onEdit instalable (aseOnEditCierre) notifica por correo al
// solicitante y a la Zona/Sector. Requiere correr UNA vez
// aseInstalarTriggerCierre() (o el menú "OTDE Asesorías" que crea onOpen())
// después de pegar esta versión — los triggers no se reinstalan solos al
// redesplegar.
// ============================================================

const HOJA_ASE_SOLICITUDES = 'Solicitudes';
const HOJA_ASE_CONTACTOS = 'Contactos_Zona_Sector';
const CARPETA_ASE_OFICIOS = 'Oficios de Asesorías';
const ASE_TAMANO_MAX_BYTES = 8 * 1024 * 1024; // 8MB, margen sobre el límite de 5MB validado en el cliente

const ENCABEZADOS_ASE_SOLICITUDES = [
  'Fecha', 'Folio', 'Tipo de Asesoría', 'Nombre', 'Función', 'CCT', 'Sector', 'Zona',
  'Escuela', 'Turno', 'Número de Docentes', 'WhatsApp', 'Correo',
  'Observaciones', 'Oficio (link Drive)', 'Estatus', 'Notas de revisión',
  'Confirmó Mantenimiento Previo', 'Notificación de cierre enviada'
];
const COL_ASE_ESTATUS = 16;
const COL_ASE_NOTIFICACION_CIERRE = 19;
const ESTADOS_ASE_VALIDOS = ['Pendiente de validar', 'Validado', 'En atención', 'Resuelto', 'Rechazado'];

// ── doGet: verificación de estado ──
function doGet() {
  return aseTextResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Solicitudes de Asesoría' }));
}

// ── doPost: recibe solicitud de asesoría ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    aseValidarCampos(datos);

    const oficioUrl = aseSubirOficio(datos);

    const hoja = aseObtenerHojaSolicitudes();
    const folio = aseGenerarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.tipoAsesoria.trim(),
      datos.nombre.trim(),
      datos.funcion.trim(),
      datos.cct.trim().toUpperCase(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      (datos.escuela || '').trim(),
      datos.turno.trim(),
      datos.numDocentes.toString().trim(),
      datos.whatsapp.trim(),
      (datos.correo || '').trim(),
      (datos.observaciones || '').trim(),
      oficioUrl,
      'Pendiente de validar',
      '',
      datos.confirmaMantenimiento ? 'Sí' : 'No',
      ''
    ]);

    aseNotificarTelegram(folio, datos, oficioUrl);

    const contacto = aseBuscarContactoZonaSector(datos.sector, datos.zona);
    if (contacto) {
      aseNotificarZonaSector(folio, datos, contacto);
    }

    return aseTextResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return aseTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Obtener o crear la hoja de solicitudes ──
function aseObtenerHojaSolicitudes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ASE_SOLICITUDES);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ASE_SOLICITUDES);
    hoja.appendRow(ENCABEZADOS_ASE_SOLICITUDES);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_ASE_SOLICITUDES.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(4, 180);  // Nombre
    hoja.setColumnWidth(9, 200);  // Escuela
    hoja.setColumnWidth(14, 260); // Observaciones
    hoja.setColumnWidth(15, 220); // Oficio
  } else {
    // Hoja creada antes de agregar esta columna: se completa el encabezado
    // faltante sin tocar las columnas ni los datos ya existentes.
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_ASE_SOLICITUDES.length) {
      const faltantes = ENCABEZADOS_ASE_SOLICITUDES.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  aseAplicarValidacionEstatus(hoja);
  aseAsegurarHojaContactos(ss);

  return hoja;
}

// ── Dropdown de valores válidos en la columna Estatus (idempotente) ──
function aseAplicarValidacionEstatus(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_ASE_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_ASE_ESTATUS, 1000, 1).setDataValidation(regla);
}

// ── Crear la hoja de contactos vacía si no existe (Jorge la llena a mano) ──
function aseAsegurarHojaContactos(ss) {
  let hoja = ss.getSheetByName(HOJA_ASE_CONTACTOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ASE_CONTACTOS);
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
function aseGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-ASE-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function aseValidarCampos(d) {
  const requeridos = ['tipoAsesoria', 'nombre', 'cct', 'escuela', 'turno', 'funcion', 'numDocentes', 'whatsapp', 'correo'];
  for (const campo of requeridos) {
    if (d[campo] === undefined || d[campo] === null || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!d.confirmaMantenimiento) {
    throw new Error('Debes confirmar que el Aula de Medios ya recibió mantenimiento con Banco de Materiales y Chuka instalados.');
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (!/^\d+$/.test(String(d.numDocentes).trim()) || parseInt(d.numDocentes, 10) < 1) {
    throw new Error('Número de docentes inválido: ' + d.numDocentes);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.correo).trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
  if (!d.oficioBase64 || !d.oficioNombre) {
    throw new Error('Falta adjuntar el oficio.');
  }
}

// ── Subir el oficio adjunto a Drive, devuelve el URL para verlo ──
function aseSubirOficio(d) {
  const bytes = Utilities.base64Decode(d.oficioBase64);
  if (bytes.length > ASE_TAMANO_MAX_BYTES) {
    throw new Error('El oficio adjunto es demasiado grande (máximo 8MB).');
  }

  const mimeType = d.oficioTipo || 'application/octet-stream';
  const nombreLimpio = (d.cct || 'SIN-CCT').trim().toUpperCase() + ' — ' + d.oficioNombre;
  const blob = Utilities.newBlob(bytes, mimeType, nombreLimpio);

  const carpeta = aseObtenerCarpetaOficios();
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return archivo.getUrl();
}

// ── Obtener o crear la carpeta de Drive para los oficios ──
function aseObtenerCarpetaOficios() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_ASE_OFICIOS);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_ASE_OFICIOS);
}

// ── Buscar el contacto de la Zona/Sector en la hoja de contactos ──
function aseBuscarContactoZonaSector(sector, zona) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_ASE_CONTACTOS);
  if (!hoja) return null;

  const datos = hoja.getDataRange().getValues();
  const sectorNorm = String(sector || '').trim().toUpperCase();
  const zonaNorm = String(zona || '').trim();

  for (let i = 1; i < datos.length; i++) {
    const filaSector = String(datos[i][0] || '').trim().toUpperCase();
    const filaZona = String(datos[i][1] || '').trim();
    const correo = String(datos[i][2] || '').trim();
    if (!correo) continue;

    const coincideZona = filaZona && zonaNorm && filaZona === zonaNorm;
    const coincideSector = filaSector && sectorNorm && filaSector === sectorNorm;

    if (coincideZona || (!filaZona && coincideSector)) {
      return { correo: correo, telefono: String(datos[i][3] || '').trim() };
    }
  }
  return null;
}

// ── Notificar por Telegram a OTDE (no interrumpe el registro si falla) ──
function aseNotificarTelegram(folio, d, oficioUrl) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const mensaje =
      '🎓 *Nueva solicitud de Asesoría*\n' +
      'Folio: ' + folio + '\n' +
      'Tipo: ' + d.tipoAsesoria.trim() + '\n' +
      'Nombre: ' + d.nombre.trim() + ' (' + d.funcion.trim() + ')\n' +
      'CCT: ' + d.cct.trim().toUpperCase() + (d.escuela ? ' — ' + d.escuela.trim() : '') + '\n' +
      (d.sector ? 'Sector ' + d.sector + (d.zona ? ' · Zona ' + d.zona : '') + '\n' : '') +
      'Turno: ' + d.turno.trim() + '\n' +
      'Número de docentes: ' + d.numDocentes + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + '\n' +
      (d.observaciones ? 'Observaciones: ' + d.observaciones.trim() + '\n' : '') +
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
function aseNotificarZonaSector(folio, d, contacto) {
  try {
    const asunto = 'Nueva solicitud de asesoría — ' + (d.escuela || d.cct);
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Nueva solicitud de asesoría</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Se registró una solicitud de asesoría de un centro de trabajo de tu Zona/Sector. Solo es informativo — OTDE la está atendiendo directamente.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + d.tipoAsesoria.trim() + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + (d.escuela || '') + ' — ' + d.cct.trim().toUpperCase() + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicita:</strong> ' + d.nombre.trim() + ' (' + d.funcion.trim() + ')</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Número de docentes:</strong> ' + d.numDocentes + '</p>' +
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

// ── onEdit instalable: dispara al marcar Estatus = "Resuelto" ──
// No se llama "onEdit" a propósito: así solo corre vía el trigger instalable
// (aseInstalarTriggerCierre), nunca como trigger simple sin autorización
// para MailApp.
function aseOnEditCierre(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_ASE_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_ASE_ESTATUS < colInicio || COL_ASE_ESTATUS > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const estatus = String(hoja.getRange(fila, COL_ASE_ESTATUS).getValue()).trim();
      if (estatus !== 'Resuelto') continue;

      const yaNotificado = String(hoja.getRange(fila, COL_ASE_NOTIFICACION_CIERRE).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_ASE_SOLICITUDES.length).getValues()[0];
      aseNotificarCierre(datosFila);
      hoja.getRange(fila, COL_ASE_NOTIFICACION_CIERRE).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Arma y despacha los 2 avisos de cierre a partir de la fila ──
function aseNotificarCierre(fila) {
  const folio = fila[1];
  const tipo = fila[2];
  const nombre = fila[3];
  const cct = fila[5];
  const sector = fila[6];
  const zona = fila[7];
  const escuela = fila[8];
  const correo = fila[12];
  const notas = fila[16];

  if (correo) {
    aseNotificarCierreSolicitante(folio, tipo, escuela, cct, notas, correo);
  }

  const contacto = aseBuscarContactoZonaSector(sector, zona);
  if (contacto) {
    aseNotificarCierreZonaSector(folio, tipo, nombre, escuela, cct, contacto);
  }
}

// ── Avisa al solicitante que su ticket fue resuelto ──
function aseNotificarCierreSolicitante(folio, tipo, escuela, cct, notas, correo) {
  try {
    const asunto = 'Tu solicitud de asesoría fue resuelta — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#56212f;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de asesoría resuelta</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Tu solicitud de asesoría fue marcada como resuelta por OTDE.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + tipo + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + (escuela || '') + ' — ' + cct + '</p>' +
      (notas ? '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Notas:</strong> ' + notas + '</p>' : '') +
      '</div></div>';

    MailApp.sendEmail({
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

// ── Avisa a la Zona/Sector que el ticket de su centro de trabajo se cerró ──
function aseNotificarCierreZonaSector(folio, tipo, nombre, escuela, cct, contacto) {
  try {
    const asunto = 'Solicitud de asesoría resuelta — ' + (escuela || cct);
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de asesoría resuelta</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">La solicitud de asesoría de un centro de trabajo de tu Zona/Sector fue atendida y marcada como resuelta. Solo es informativo.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + tipo + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + (escuela || '') + ' — ' + cct + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicitó:</strong> ' + nombre + '</p>' +
      '</div></div>';

    MailApp.sendEmail({
      to: contacto.correo,
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
function aseInstalarTriggerCierre() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditCierre') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aseOnEditCierre')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de cierre automático instalado.'); } catch (err) {}
}

// ── Quita el trigger de cierre automático ──
function aseDesinstalarTriggerCierre() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditCierre') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de cierre eliminado(s).'); } catch (err) {}
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Asesorías')
    .addItem('Instalar trigger de cierre automático', 'aseInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'aseDesinstalarTriggerCierre')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function aseTextResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
