// ============================================================
// SEPRN · OTDE — Reset de Autenticación de 2 Pasos (webform 2026-2027)
// ============================================================
// Migrado del sistema viejo sin rediseño de UX (a diferencia de
// Alta/Cambio, este tipo no tenía dos variantes por dominio que
// consolidar).
//
// COLUMNAS DE LA HOJA "Reset 2FA":
//   A Fecha | B Folio | C CCT | D Sector | E Zona | F Escuela
//   G Correo Institucional | H Nombre | I Correo Personal
//   J Teléfono | K Observaciones | L ¿Reset listo?
//   M Usuario enviado | N Fecha de entrega | O Estado general
// ============================================================

const HOJA_RESET = 'Reset 2FA';

function manejarReset2FA(datos) {
  resetValidarCampos(datos);

  const hoja = resetObtenerHoja();
  const folio = resetGenerarFolio(hoja);
  const ahora = new Date();

  hoja.appendRow([
    ahora,
    folio,
    datos.cct.trim().toUpperCase(),
    (datos.sector || '').trim(),
    (datos.zona || '').toString().trim(),
    (datos.escuela || '').trim(),
    datos.correoInstitucional.trim().toLowerCase(),
    datos.nombre.trim(),
    datos.correoPersonal.trim(),
    datos.telefono.trim(),
    (datos.observaciones || '').trim(),
    '', '', '',
    'Solicitud recibida'
  ]);

  resetEnviarConfirmacion(folio, datos);
  resetNotificarEquipo(folio, datos);

  return textResponse(JSON.stringify({ status: 'ok', folio: folio }));
}

// ── Notificar a Marcos por Telegram y correo (silencioso si falla) — mismo
// criterio que cambioNotificarEquipo() en CambioContrasena.gs: DM personal,
// no el chat compartido que motivó acotar Telegram a solo Incidencias el
// 18 ago 2026 (ver docs/BITACORA.md). ──
function resetNotificarEquipo(folio, d) {
  const resumenMarkdown =
    'Folio: ' + folio + '\n' +
    'Nombre: ' + escapeMarkdown_(d.nombre.trim()) + '\n' +
    'Correo institucional: ' + d.correoInstitucional.trim() + '\n' +
    'CCT: ' + escapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + escapeMarkdown_(d.escuela.trim()) : '');

  notificarTelegram('🔐 *Nueva solicitud — Eliminar método de autenticación (2FA)*\n' + resumenMarkdown);

  enviarCorreoConModoPrueba_({
    to: CONFIG.correoResponsable,
    subject: 'Nueva solicitud — Eliminar método de autenticación (Folio ' + folio + ')',
    htmlBody:
      '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + escapeHtml_(d.nombre.trim()) + '</p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Correo institucional: ' + escapeHtml_(d.correoInstitucional.trim()) + '</p>' +
      '<p style="margin:0;font-size:14px;">CCT: ' + escapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + escapeHtml_(d.escuela.trim()) : '') + '</p>',
    name: CONFIG.remitente
  });
}

function resetObtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_RESET);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_RESET);
    hoja.appendRow([
      'Fecha', 'Folio', 'CCT', 'Sector', 'Zona', 'Escuela', 'Correo Institucional',
      'Nombre', 'Correo Personal', 'Teléfono', 'Observaciones',
      '¿Reset listo?', 'Usuario enviado', 'Fecha de entrega', 'Estado general'
    ]);
    const header = hoja.getRange(1, 1, 1, 15);
    header.setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(6, 200); // Escuela
    hoja.setColumnWidth(8, 150); // Nombre
  }

  resetAplicarValidacionEstado(hoja);
  resetAplicarSemaforoYProteccion_(hoja);

  return hoja;
}

// ── "Planchado" (sep 2026): dropdown suave en ¿Reset listo? (el disparador
// manual de este tipo — a diferencia de los demás, aquí sí se marca en
// amarillo en el manual visual, no verde, porque dispara la notificación),
// semáforo de color en Estado general, protección de solo aviso en Fecha/
// Folio/Usuario enviado/Fecha de entrega/Estado general. Utilidades
// compartidas en Config.gs. ──
const COL_RESET_LISTO = 12;
const COL_RESET_USUARIO_ENVIADO = 13;
const COL_RESET_FECHA_ENTREGA = 14;
const COL_RESET_ESTADO = 15;
const RESET_COLORES_ESTADO = { 'Solicitud recibida': '#e5e7eb', 'Reset notificado': '#d1fae5' };

function resetAplicarSemaforoYProteccion_(hoja) {
  aplicarValidacionListaSuave_(hoja, COL_RESET_LISTO, ['Sí', 'No']);
  aplicarSemaforoPorValor_(hoja, COL_RESET_ESTADO, RESET_COLORES_ESTADO);
  [1, 2, COL_RESET_USUARIO_ENVIADO, COL_RESET_FECHA_ENTREGA, COL_RESET_ESTADO]
    .forEach(function (col) { protegerColumnaAutomatica_(hoja, col); });
}

// ── Dropdown en "Estado general" (protector, mismo criterio que
// altaAplicarValidacionEstado() en Alta.gs — ver ese comentario). ──
function resetAplicarValidacionEstado(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Solicitud recibida', 'Reset notificado'], true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, 15, 1000, 1).setDataValidation(regla);
}

function resetGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-2FA-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

function resetValidarCampos(d) {
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

function resetEnviarConfirmacion(folio, d) {
  const asunto = 'Solicitud recibida — Reset de Autenticación de 2 Pasos';
  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Hola, <strong>' + escapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
    '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.7;">Hemos recibido tu solicitud de restablecimiento de autenticación de 2 pasos. Resumen:</p>' +
    altaCajaHTML('Folio', folio) +
    altaCajaHTML('Cuenta institucional', escapeHtml_(d.correoInstitucional.trim())) +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#333333;line-height:1.7;">Tu caso está siendo atendido. En cuanto esté listo, te avisaremos a este mismo correo con los pasos a seguir.</p>' +
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

// ── Revisión al editar la hoja "Reset 2FA" (llamada desde OnEdit.gs) ──
// Dispara con "¿Reset listo?" = Sí (no con una contraseña, como los demás tipos).
function resetRevisarEdicion(e) {
  const hoja = e.range.getSheet();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0].map(h => (h || '').toString().trim());

  const idxListo    = indexOfHeader(headers, '¿Reset listo?');
  const idxEnviado  = indexOfHeader(headers, 'Usuario enviado');
  const idxFecha    = indexOfHeader(headers, 'Fecha de entrega');
  const idxEstado   = indexOfHeader(headers, 'Estado general');

  if ([idxListo, idxEnviado, idxFecha, idxEstado].includes(-1)) return;

  const colDisparoAbs = idxListo + 1;
  const colInicio = e.range.getColumn();
  const colFin = colInicio + e.range.getNumColumns() - 1;
  if (colDisparoAbs < colInicio || colDisparoAbs > colFin) return;

  const filaInicio = e.range.getRow();
  const numFilas = e.range.getNumRows();

  for (let f = filaInicio; f < filaInicio + numFilas; f++) {
    if (f === 1) continue;

    const listo = esAfirmativo(hoja.getRange(f, idxListo + 1).getValue());
    const yaEnviado = esAfirmativo(hoja.getRange(f, idxEnviado + 1).getValue());
    if (!listo || yaEnviado) continue;

    try {
      resetEnviarNotificacion(f);
      hoja.getRange(f, idxEnviado + 1).setValue('Sí');
      hoja.getRange(f, idxFecha + 1).setValue(new Date());
      hoja.getRange(f, idxEstado + 1).setValue('Reset notificado');
      SpreadsheetApp.flush();
    } catch (err) {
      Logger.log('❌ Error notificando reset fila ' + f + ': ' + err.message);
    }
  }
}

function resetEnviarNotificacion(fila) {
  const hoja = resetObtenerHoja();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(h => (h || '').toString().trim());
  const valores = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];
  const leer = (nombre) => (valores[indexOfHeader(headers, nombre)] || '').toString().trim();

  const nombreCompleto = escapeHtml_(leer('Nombre'));
  const correoPersonal = leer('Correo Personal');

  const asunto = 'Autenticación de 2 pasos restablecida — Cuenta Institucional';
  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Estimado/a <strong>' + nombreCompleto + '</strong>,</p>' +
    '<p style="margin:0 0 18px 0;font-size:15px;color:#333333;line-height:1.7;">La autenticación de 2 pasos de tu cuenta institucional ha sido restablecida. Sigue estos pasos para configurarla:</p>' +
    '<div style="border-left:4px solid #9F2241;border-radius:4px;background-color:#f9f6f3;padding:14px 16px;margin-bottom:16px;">' +
    '<p style="margin:0 0 10px 0;font-size:14px;color:#333333;line-height:1.7;font-weight:bold;">1. Ingresa a tu cuenta:</p>' +
    '<a href="https://outlook.office.com/" style="display:block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">📨 Outlook</a>' +
    '<a href="https://m365.cloud.microsoft/" style="display:block;background-color:#7a1a2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">🌐 Microsoft 365</a>' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">2. Después de ingresar tu contraseña, Microsoft te pedirá configurar el 2 pasos.</p>' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">3. Descarga <strong>Microsoft Authenticator</strong> en tu celular si aún no la tienes.</p>' +
    '<p style="margin:0;font-size:14px;color:#333333;line-height:1.7;">4. Escanea el código QR con la app y sigue las instrucciones.</p>' +
    '</div>' +
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
