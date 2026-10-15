// ============================================================
// SEPRN · OTDE — Cambio de Contraseña + Eliminar Método de
// Autenticación (webform 2026-2027)
// ============================================================
// Quinto tipo del webform, agregado sep 2026 para empatar con el tipo
// combinado que SIGEE ofrece hoy en su formulario de "Nueva solicitud"
// (sigee.dee.edu.mx) — "Cambio de contraseña + eliminar método de
// autenticación". Mismos campos requeridos que Cambio de Contraseña y
// Eliminar Método de Autenticación por separado (CambioContrasena.gs /
// Reset2FA.gs); este tipo solo fusiona ambos flujos de entrega en una
// sola solicitud, un solo folio y un solo correo final, para el caso
// real y frecuente de alguien que pide las dos cosas a la vez.
//
// COLUMNAS DE LA HOJA "Cambio y Eliminar Autenticación":
//   A Fecha | B Folio | C CCT | D Sector | E Zona | F Escuela
//   G Correo Institucional | H Dominio | I Nombre | J Correo Personal
//   K Teléfono | L Observaciones | M Contraseña asignada
//   N ¿Cuenta lista? | O Usuario enviado | P Fecha de entrega
//   Q Estado general
// ============================================================

const HOJA_CAMBIO_RESET = 'Cambio y Eliminar Autenticación';

function manejarCambioContrasenaYReset(datos) {
  cambioResetValidarCampos(datos);

  const dominio = datos.correoInstitucional.trim().toLowerCase().endsWith('@dee.edu.mx')
    ? 'dee.edu.mx'
    : 'aulamexiquense.mx';

  const hoja = cambioResetObtenerHoja();
  // Por nombre de columna (ver encabezadosCorreo_ en Config.gs). Fecha, Folio e ID de envío
  // los pone registrarSolicitudSinDuplicar_(); lo que llena Marcos queda en blanco.
  const valores = {
    'CCT': datos.cct.trim().toUpperCase(),
    'Sector': (datos.sector || '').trim(),
    'Zona': (datos.zona || '').toString().trim(),
    'Escuela': (datos.escuela || '').trim(),
    'Correo Institucional': datos.correoInstitucional.trim().toLowerCase(),
    'Dominio': dominio,
    'Nombre': datos.nombre.trim(),
    'Correo Personal': datos.correoPersonal.trim(),
    'Teléfono': datos.telefono.trim(),
    'Observaciones': (datos.observaciones || '').trim()
  };

  // Candado + "ID de envío": un reintento devuelve el mismo folio sin volver a notificar
  // (QA-NOTES #44). Sin ID, se compara todo lo que capturó el solicitante (`valores`).
  const registro = registrarSolicitudSinDuplicar_(hoja, valores, 'Solicitud recibida', cambioResetGenerarFolio, datos.idEnvio);
  if (registro.duplicado) return respuestaDuplicado_(registro.folio);
  const folio = registro.folio;
  segAnotarEnFolio_(hoja, folio, SEG_COL_MOTIVO_PERDIDA, datos.motivoPerdida);

  cambioResetEnviarConfirmacion(folio, datos);
  cambioResetNotificarEquipo(folio, datos, dominio);

  return textResponse(JSON.stringify({ status: 'ok', folio: folio }));
}

// ── Notificar a Marcos por Telegram y correo (silencioso si falla) — mismo
// criterio que cambioNotificarEquipo()/resetNotificarEquipo(): DM personal,
// no el chat compartido de OTDE. ──
function cambioResetNotificarEquipo(folio, d, dominio) {
  const resumenMarkdown =
    'Folio: ' + folio + '\n' +
    'Nombre: ' + escapeMarkdown_(d.nombre.trim()) + '\n' +
    'Correo institucional: ' + d.correoInstitucional.trim() + ' (' + dominio + ')\n' +
    'CCT: ' + escapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + escapeMarkdown_(d.escuela.trim()) : '');

  notificarTelegram('🔑🔐 *Nueva solicitud — Cambio de Contraseña + Eliminar Autenticación*\n' + resumenMarkdown);

  enviarCorreoConModoPrueba_({
    to: CONFIG.correoResponsable,
    subject: 'Nueva solicitud — Cambio de Contraseña + Eliminar Autenticación (Folio ' + folio + ')',
    htmlBody:
      '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + escapeHtml_(d.nombre.trim()) + '</p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Correo institucional: ' + escapeHtml_(d.correoInstitucional.trim()) + ' (' + dominio + ')</p>' +
      '<p style="margin:0;font-size:14px;">CCT: ' + escapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + escapeHtml_(d.escuela.trim()) : '') + '</p>',
    name: CONFIG.remitente
  });
}

function cambioResetObtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_CAMBIO_RESET);

  if (!hoja) {
    hoja = crearHojaCorreo_(ss, HOJA_CAMBIO_RESET, { 'Escuela': 200, 'Nombre': 150 });
  }

  cambioResetAplicarValidacionEstado(hoja);
  cambioResetAplicarSemaforoYProteccion_(hoja);

  return hoja;
}

// ── "Planchado", mismo patrón que cambioAplicarSemaforoYProteccion_() en
// CambioContrasena.gs: dropdown suave en ¿Cuenta lista?, semáforo de color
// en Estado general, protección de solo aviso en Fecha/Folio/Dominio/
// Usuario enviado/Fecha de entrega/Estado general. Contraseña asignada (la
// que Marcos llena a mano para disparar el correo) se deja libre a
// propósito. Utilidades compartidas en Config.gs. ──
const CAMBIORESET_COLORES_ESTADO = { 'Solicitud recibida': '#e5e7eb', 'Cuenta entregada': '#d1fae5', 'Rechazada': '#fee2e2' };

function cambioResetAplicarSemaforoYProteccion_(hoja) {
  const col = function (n) { return colCorreo_(hoja, n); };
  aplicarValidacionListaSuave_(hoja, col('¿Cuenta lista?'), ['Sí', 'No']);
  aplicarSemaforoPorValor_(hoja, col('Estado general'), CAMBIORESET_COLORES_ESTADO);
  ['Fecha', 'Folio', 'Dominio', 'Usuario enviado', 'Fecha de entrega', 'Estado general']
    .forEach(function (n) { protegerColumnaAutomatica_(hoja, col(n)); });
}

// ── Dropdown en "Estado general" (protector, mismo criterio que
// altaAplicarValidacionEstado() en Alta.gs — ver ese comentario). ──
function cambioResetAplicarValidacionEstado(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Solicitud recibida', 'Cuenta entregada', 'Rechazada'], true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, colCorreo_(hoja, 'Estado general'), 1000, 1).setDataValidation(regla);
}

function cambioResetGenerarFolio(hoja) {
  return siguienteFolioCorreo_(hoja, 'OTDE-CYR-');
}

function cambioResetValidarCampos(d) {
  const requeridos = ['cct', 'escuela', 'correoInstitucional', 'nombre', 'correoPersonal', 'telefono'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  const correoInst = d.correoInstitucional.trim().toLowerCase();
  if (!correoInst.endsWith('@dee.edu.mx') && !correoInst.endsWith('@aulamexiquense.mx')) {
    throw new Error('El correo institucional debe terminar en @dee.edu.mx o @aulamexiquense.mx: ' + d.correoInstitucional);
  }
  if (!/^\d{10}$/.test(d.telefono.trim())) {
    throw new Error('Teléfono inválido: ' + d.telefono);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correoPersonal.trim())) {
    throw new Error('Correo personal inválido: ' + d.correoPersonal);
  }
}

function cambioResetEnviarConfirmacion(folio, d) {
  const asunto = 'Solicitud recibida — Cambio de Contraseña + Eliminar Autenticación';
  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Hola, <strong>' + escapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
    '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.7;">Hemos recibido tu solicitud de cambio de contraseña y eliminación de tu método de autenticación. Resumen:</p>' +
    altaCajaHTML('Folio', folio) +
    altaCajaHTML('Cuenta institucional', escapeHtml_(d.correoInstitucional.trim())) +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#333333;line-height:1.7;">Tu caso está siendo atendido. En cuanto tengamos tu nueva contraseña temporal, te la enviaremos a este mismo correo junto con los pasos para reconfigurar tu autenticación.</p>' +
    altaBotonSeguimientoHTML() +
    altaAvisoPieHTML() +
    altaFirmaHTML();

  enviarCorreoConModoPrueba_({
    to: d.correoPersonal.trim(),
    subject: asunto,
    htmlBody: html,
    name: CONFIG.remitente,
    replyTo: CONFIG.correoOTDE
  });
}

// ── Revisión al editar la hoja "Cambio y Eliminar Autenticación" (llamada
// desde OnEdit.gs) — mismo disparador que cambioRevisarEdicion(): la
// columna "Contraseña asignada", porque en SIGEE ambas acciones (cambio de
// contraseña y eliminación de MFA) se resuelven en un solo trámite. ──
function cambioResetRevisarEdicion(e) {
  const hoja = e.range.getSheet();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0].map(h => (h || '').toString().trim());

  const idxPassword = indexOfHeader(headers, 'Contraseña asignada');
  const idxEnviado  = indexOfHeader(headers, 'Usuario enviado');
  const idxFecha    = indexOfHeader(headers, 'Fecha de entrega');
  const idxEstado   = indexOfHeader(headers, 'Estado general');

  if ([idxPassword, idxEnviado, idxFecha, idxEstado].includes(-1)) return;

  const colDisparoAbs = idxPassword + 1;
  const colInicio = e.range.getColumn();
  const colFin = colInicio + e.range.getNumColumns() - 1;
  if (colDisparoAbs < colInicio || colDisparoAbs > colFin) return;

  const filaInicio = e.range.getRow();
  const numFilas = e.range.getNumRows();

  for (let f = filaInicio; f < filaInicio + numFilas; f++) {
    if (f === 1) continue;

    const password = (hoja.getRange(f, idxPassword + 1).getValue() || '').toString().trim();
    const yaEnviado = esAfirmativo(hoja.getRange(f, idxEnviado + 1).getValue());
    if (!password || yaEnviado) continue;

    try {
      cambioResetEnviarCredenciales(f);
      hoja.getRange(f, idxEnviado + 1).setValue('Sí');
      hoja.getRange(f, idxFecha + 1).setValue(new Date());
      hoja.getRange(f, idxEstado + 1).setValue('Cuenta entregada');
      SpreadsheetApp.flush();
    } catch (err) {
      Logger.log('❌ Error enviando credenciales fila ' + f + ': ' + err.message);
    }
  }
}

// ── Correo final combinado: nueva contraseña (cambioEnviarCredenciales) +
// pasos para reconfigurar Authenticator (resetEnviarNotificacion), en un
// solo mensaje — la persona no recibe dos avisos separados para una sola
// solicitud. ──
function cambioResetEnviarCredenciales(fila) {
  const hoja = cambioResetObtenerHoja();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(h => (h || '').toString().trim());
  const valores = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];
  const leer = (nombre) => (valores[indexOfHeader(headers, nombre)] || '').toString().trim();

  const nombreCompleto = escapeHtml_(leer('Nombre'));
  const correoPersonal = leer('Correo Personal');
  const correoInstitucional = escapeHtml_(leer('Correo Institucional'));
  const password = leer('Contraseña asignada');

  const asunto = 'Contraseña y autenticación restablecidas — Cuenta institucional';
  const linksAcceso =
    '<a href="https://outlook.office.com/" style="display:block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">📨 Outlook — Acceso al correo</a>' +
    '<a href="https://m365.cloud.microsoft/" style="display:block;background-color:#7a1a2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">🌐 Microsoft 365 — Portal completo</a>';

  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Estimado/a <strong>' + nombreCompleto + '</strong>,</p>' +
    '<p style="margin:0 0 18px 0;font-size:15px;color:#333333;line-height:1.7;">La contraseña de tu cuenta institucional ha sido restablecida y tu método de autenticación fue eliminado. Aquí tus datos de acceso:</p>' +
    altaCajaHTML('Usuario', '📧 ' + correoInstitucional) +
    altaCajaHTML('Contraseña temporal', '🔐 ' + password) +
    linksAcceso +
    '<div style="border-left:4px solid #9F2241;border-radius:4px;background-color:#f9f6f3;padding:14px 16px;margin-bottom:16px;">' +
    '<p style="margin:0 0 10px 0;font-size:14px;color:#333333;line-height:1.7;font-weight:bold;">Después de ingresar con la contraseña temporal:</p>' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">1. Microsoft te pedirá cambiarla de inmediato. Elige una contraseña segura.</p>' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">2. Después se te pedirá configurar de nuevo la <strong>autenticación de 2 pasos</strong>. Descarga <strong>Microsoft Authenticator</strong> en tu celular si aún no la tienes.</p>' +
    '<p style="margin:0;font-size:14px;color:#333333;line-height:1.7;">3. Escanea el código QR con la app y sigue las instrucciones.</p>' +
    '</div>' +
    recuadroDosDispositivosHTML_() +
    '<div style="background-color:#f9f6f3;border-left:4px solid #977e5b;border-radius:4px;padding:14px 16px;margin-bottom:20px;">' +
    '<p style="margin:0 0 6px 0;font-size:10px;color:#977e5b;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">Recursos de apoyo</p>' +
    '<p style="margin:0;font-size:13px;"><a href="' + CONFIG.videoTutorial2FA + '" style="color:#9F2241;font-weight:bold;text-decoration:none;">▶️ Video tutorial</a>&nbsp;&nbsp;|&nbsp;&nbsp;<a href="' + CONFIG.manualPDF2FA + '" style="color:#9F2241;font-weight:bold;text-decoration:none;">📄 Manual en PDF</a></p>' +
    '</div>' +
    altaBotonSeguimientoHTML() +
    altaAvisoPieHTML() +
    altaFirmaHTML();

  enviarCorreoConModoPrueba_({
    to: correoPersonal,
    subject: asunto,
    htmlBody: html,
    name: CONFIG.remitente,
    replyTo: CONFIG.correoOTDE
  });
}
