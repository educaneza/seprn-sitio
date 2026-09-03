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
//
// PANEL OTDE (panel-otde.gs, Sheet aparte): doGet(?action=pendientes&
// token=...) devuelve todas las solicitudes abiertas. Configura el
// token una vez con sopConfigurarTokenPanel('un-secreto-largo') antes
// de usarlo.
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
// Notificación de "nueva solicitud" por correo, además del Telegram de abajo
// (sep 2026) — Alejandro atiende Soporte y Mantenimiento, decisión de Jorge.
const SOP_CORREO_EQUIPO = 'alejandro.morales@dee.edu.mx';

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

// ── Token del Panel OTDE: a diferencia de ?action=consulta (que exige ya
// conocer un folio + correo específicos), ?action=pendientes regresa TODAS
// las solicitudes abiertas con nombre/escuela/contacto — sin este token
// cualquiera que viera la URL en el código fuente del sitio podría listar
// esos datos. Configúralo una vez con sopConfigurarTokenPanel('un-secreto-
// largo') desde el editor — el mismo valor debe pegarse en panel-otde.gs. ──
function sopConfigurarTokenPanel(token) {
  PropertiesService.getScriptProperties().setProperty('PANEL_TOKEN', token);
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
  if (accion === 'pendientes') {
    return sopListarPendientes(e.parameter.token);
  }
  return textResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Soporte Técnico Remoto' }));
}

// ── Lista de solicitudes abiertas para el Panel OTDE (?action=pendientes) ──
// "Abierta" = Estatus distinto de Resuelto/Rechazado (o vacío, que
// sopConsultarFolio ya trata como Pendiente de validar). Requiere el mismo
// token configurado con sopConfigurarTokenPanel() — ver esa función arriba.
function sopListarPendientes(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return textResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (!hoja) return textResponse(JSON.stringify({ status: 'ok', tramite: 'Soporte Técnico Remoto', items: [] }));

  const filas = hoja.getDataRange().getValues().slice(1);
  const items = filas
    .filter(function (r) { return r[1]; }) // folio no vacío
    .filter(function (r) {
      const estatus = String(r[COL_SOP_ESTATUS - 1] || '').trim();
      return estatus !== 'Resuelto' && estatus !== 'Rechazado';
    })
    .map(function (r) {
      return {
        folio: r[1],
        fecha: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        nombre: r[2],
        escuela: r[6],
        sector: r[4],
        zona: r[5],
        estatus: String(r[COL_SOP_ESTATUS - 1] || 'Pendiente de validar').trim(),
        notas: r[14] || ''
      };
    });

  return textResponse(JSON.stringify({ status: 'ok', tramite: 'Soporte Técnico Remoto', items: items }));
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
    sopNotificarEquipoPorCorreo(folio, datos);
    sopNotificarSolicitudRecibida(folio, datos);

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

// ── Correo a Alejandro, además del Telegram de arriba (sep 2026) ──
function sopNotificarEquipoPorCorreo(folio, d) {
  try {
    sopEnviarCorreo_({
      to: SOP_CORREO_EQUIPO,
      subject: 'Nueva solicitud de Soporte Remoto (Folio ' + folio + ')',
      htmlBody:
        '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Urgencia: ' + sopEscapeHtml_(d.urgencia) + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + sopEscapeHtml_(d.nombre.trim()) + ' (' + sopEscapeHtml_(d.funcion.trim()) + ')</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">CCT: ' + sopEscapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + sopEscapeHtml_(d.escuela.trim()) : '') + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Tipo de ayuda: ' + sopEscapeHtml_((d.tipoAyuda || '').trim()) + '</p>' +
        '<p style="margin:0;font-size:14px;">Descripción: ' + sopEscapeHtml_(d.descripcion.trim()) + '</p>',
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
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

// ── Plantilla institucional compartida por los correos de este archivo —
// mismo lenguaje visual (header, caja de resumen, firma, redes sociales)
// que ya usa en producción Correos-institucionales (repo aparte), adoptado
// aquí letra por letra. Ver mantenimiento.gs para el mismo patrón — cada
// .gs mantiene su propia copia, no hay import entre proyectos. ──
const SOP_CORREO_CSS =
  'body{margin:0;padding:0;background-color:#f4f1ee;font-family:Arial,Helvetica,sans-serif;}' +
  '.wrapper{width:100%;background-color:#f4f1ee;padding:20px 0;}' +
  '.card{max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.10);}' +
  '.header{background-color:#9F2241;padding:24px 24px 20px 24px;}' +
  '.header-sub{font-size:10px;color:#d6a87e;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin:0 0 6px 0;}' +
  '.header-title{font-size:17px;color:#ffffff;font-weight:bold;margin:0;}' +
  '.header-line{margin-top:14px;height:3px;background-color:#977e5b;border-radius:2px;width:50px;}' +
  '.body{padding:26px 24px 18px 24px;}' +
  '.btn{display:inline-block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;text-align:center;padding:12px 22px;border-radius:6px;margin:8px 0 6px 0;}' +
  '.aviso{background-color:#fff8f0;border:1px solid #e8ddd4;border-radius:4px;padding:12px 14px;margin-top:8px;}' +
  '.footer-firma{padding:0 24px 26px 24px;border-top:1px solid #e0d8d0;margin-top:16px;padding-top:18px;}' +
  '.pie{background-color:#9F2241;padding:10px 24px;text-align:center;}' +
  '.pie p{margin:0;font-size:10px;color:#d6a87e;letter-spacing:1px;}' +
  '@media only screen and (max-width:480px){' +
  '.header{padding:20px 18px 16px 18px;}.header-title{font-size:15px;}' +
  '.body{padding:22px 18px 16px 18px;}.footer-firma{padding:0 18px 22px 18px;}}';

function sopCorreoFirma_() {
  return '<div class="footer-firma">' +
    '<p style="margin:0 0 2px 0;font-size:14px;font-weight:bold;color:#9F2241;">Mtro. Jorge Alberto Bonilla Torres</p>' +
    '<p style="margin:0 0 2px 0;font-size:12px;color:#555555;">Jefe de la Oficina de Tecnología para el Desarrollo Educativo | <strong>OTDE</strong></p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#666666;">Subdirección de Educación Primaria en la Región de Nezahualcóyotl | SEPRN</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📞 55 3300 2400 Ext. 9065</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📍 Av. Texcoco 116, Col. Juárez Pantitlán, Nezahualcóyotl C.P. 57460</p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#555555;">✉️ <a href="mailto:otde.nezahualcoyotl@dee.edu.mx" style="color:#9F2241;text-decoration:none;">otde.nezahualcoyotl@dee.edu.mx</a></p>' +
    '<p style="margin:0;font-size:12px;line-height:2.1;">' +
    '<a href="https://educaneza.github.io/seprn-sitio/index.html" style="color:#977e5b;text-decoration:none;font-weight:bold;">🌐 Sitio Web</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://www.facebook.com/SubNeza" style="color:#977e5b;text-decoration:none;font-weight:bold;">📘 Facebook</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://www.youtube.com/@subneza" style="color:#977e5b;text-decoration:none;font-weight:bold;">▶️ YouTube</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11" style="color:#977e5b;text-decoration:none;font-weight:bold;">💬 WhatsApp</a>' +
    '</p></div>';
}

function sopCorreoHtml_(opts) {
  const filasHtml = (opts.filas || []).map(f =>
    '<p style="margin:0 0 8px 0;font-size:13.5px;color:#333333;line-height:1.6;">' +
    f.icono + ' <strong>' + f.etiqueta + ':</strong> ' + f.valor + '</p>'
  ).join('');

  const caja = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3;border-left:4px solid ' +
    (opts.colorCaja || '#9F2241') + ';border-radius:4px;margin-bottom:14px;">' +
    '<tr><td style="padding:15px 17px;">' + filasHtml + '</td></tr></table>';

  const cta = opts.ctaHref
    ? '<a href="' + opts.ctaHref + '" class="btn">' + (opts.ctaTexto || 'Consultar estatus de tu solicitud') + ' &rarr;</a>'
    : '';

  const aviso = '<div class="aviso"><p style="margin:0;font-size:12px;color:#7a6a5a;line-height:1.6;">⚠️ ' +
    (opts.avisoTexto || 'Este correo no se monitorea — para dudas o seguimiento escríbenos a <a href="mailto:otde.nezahualcoyotl@dee.edu.mx" style="color:#9F2241;">otde.nezahualcoyotl@dee.edu.mx</a>.') +
    '</p></div>';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + SOP_CORREO_CSS + '</style></head>' +
    '<body><div class="wrapper"><div class="card">' +
    '<div class="header">' +
    '<p class="header-sub">Oficina de Tecnología para el Desarrollo Educativo | OTDE</p>' +
    '<p class="header-title">' + opts.titulo + '</p>' +
    '<div class="header-line"></div></div>' +
    '<div class="body">' + (opts.introHtml || '') + caja + cta + aviso + '</div>' +
    sopCorreoFirma_() +
    '<div class="pie"><p>SEPRN © 2026 — Gobierno del Estado de México</p></div>' +
    '</div></div></body></html>';
}

const SOP_CTA_SEGUIMIENTO = 'https://educaneza.github.io/seprn-sitio/oficina-virtual.html#buscar-folio';

// ── Confirma al solicitante que su solicitud de soporte quedó registrada.
// Sin CC a Zona/Sector: Soporte no tiene Contactos_Zona_Sector (decisión
// deliberada, ver CLAUDE.md), a diferencia de Mantenimiento/Asesorías. ──
function sopNotificarSolicitudRecibida(folio, d) {
  try {
    const asunto = 'Solicitud de soporte técnico recibida — Folio ' + folio;
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: sopEscapeHtml_(d.escuela || '') + ' — ' + sopEscapeHtml_(d.cct.trim().toUpperCase()) },
      { icono: '👤', etiqueta: 'Solicita', valor: sopEscapeHtml_(d.nombre.trim()) + ' (' + sopEscapeHtml_(d.funcion.trim()) + ')' }
    ];
    if (d.tipoAyuda) filas.push({ icono: '💻', etiqueta: 'Tipo de ayuda', valor: sopEscapeHtml_(d.tipoAyuda) });
    filas.push({ icono: '📝', etiqueta: 'Descripción', valor: sopEscapeHtml_(d.descripcion.trim()) });

    const html = sopCorreoHtml_({
      titulo: 'Solicitud de soporte técnico recibida',
      introHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Hola, <strong>' + sopEscapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Se registró tu solicitud de soporte técnico remoto. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>',
      filas: filas,
      ctaHref: SOP_CTA_SEGUIMIENTO,
      ctaTexto: 'Consultar estatus de tu solicitud'
    });

    sopEnviarCorreo_({
      to: (d.correo || '').trim(),
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada aunque falle este aviso
  }
}

// ── Avisa al solicitante que su ticket fue resuelto ──
function sopNotificarCierreSolicitante(folio, escuela, cct, notas, correo) {
  try {
    const asunto = 'Tu solicitud de soporte técnico fue resuelta — ' + folio;
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: sopEscapeHtml_(escuela || '') + ' — ' + sopEscapeHtml_(cct) }
    ];
    if (notas) filas.push({ icono: '📝', etiqueta: 'Notas', valor: sopEscapeHtml_(notas) });

    const html = sopCorreoHtml_({
      titulo: 'Solicitud de soporte técnico resuelta',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Tu solicitud de soporte técnico remoto fue marcada como resuelta por OTDE.</p>',
      filas: filas,
      ctaHref: SOP_CTA_SEGUIMIENTO,
      ctaTexto: 'Ver el detalle de tu solicitud'
    });

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

// ── "Planchado": listas suaves + semáforo + protección de solo aviso ──
const SOP_URGENCIAS_VALIDAS = ['Alta', 'Media', 'Baja'];
const SOP_TIPOS_AYUDA_VALIDOS = ['Correo institucional', 'Office/Licencias', 'Impresora',
  'Antivirus/Seguridad', 'Internet/Red', 'Equipo de cómputo (hardware)', 'Otro'];
const SOP_COLORES_ESTATUS = {
  'Pendiente de validar': '#e5e7eb',
  'Validado': '#dbeafe',
  'En atención': '#fef3c7',
  'Resuelto': '#d1fae5',
  'Rechazado': '#fee2e2'
};

function sopAplicarValidacionListaSuave_(hoja, columna, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
  hoja.getRange(2, columna, 1000, 1).setDataValidation(regla);
}

function sopAplicarSemaforoPorValor_(hoja, columna, valores, colores) {
  const rango = hoja.getRange(2, columna, 1000, 1);
  const reglasSinEstaColumna = hoja.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (rg) { return rg.getColumn() !== columna; });
  });
  const reglasNuevas = valores
    .filter(function (valor) { return colores[valor]; })
    .map(function (valor) {
      return SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(valor)
        .setBackground(colores[valor])
        .setRanges([rango])
        .build();
    });
  hoja.setConditionalFormatRules(reglasSinEstaColumna.concat(reglasNuevas));
}

function sopProtegerColumnaAutomatica_(hoja, columna) {
  const yaProtegida = hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    const r = p.getRange();
    return r.getColumn() === columna && r.getRow() === 2;
  });
  if (yaProtegida) return;
  hoja.getRange(2, columna, 1000, 1).protect()
    .setWarningOnly(true)
    .setDescription('Columna automática — se llena sola, evita editarla a mano.');
}

function sopConfigurarValidacionYSemaforo() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (hoja) {
    sopAplicarValidacionListaSuave_(hoja, 12, SOP_URGENCIAS_VALIDAS);
    sopAplicarValidacionListaSuave_(hoja, 13, SOP_TIPOS_AYUDA_VALIDOS);
    sopAplicarSemaforoPorValor_(hoja, COL_SOP_ESTATUS, ESTADOS_SOP_VALIDOS, SOP_COLORES_ESTATUS);
    [1, 2, COL_SOP_NOTIFICACION_CIERRE].forEach(function (col) { sopProtegerColumnaAutomatica_(hoja, col); });
  }
  try { SpreadsheetApp.getUi().alert('Validación y semáforo aplicados en Solicitudes.'); } catch (err) {}
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Soporte')
    .addItem('Instalar trigger de cierre automático', 'sopInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'sopDesinstalarTriggerCierre')
    .addItem('Aplicar validación y semáforo', 'sopConfigurarValidacionYSemaforo')
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
