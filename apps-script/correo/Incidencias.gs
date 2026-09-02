// ============================================================
// SEPRN · OTDE — Incidencias de acceso (webform 2026-2027)
// ============================================================
// "No puedo acceder a mi cuenta institucional" — migrado del
// sistema viejo sin rediseño de UX (ver plan: la causa raíz típica
// es que CoEEE entrega credenciales ya vencidas, fuera del control
// de OTDE; convertir esto en un "reportar sobre mi folio" queda
// para cuando exista una página de consulta de folio).
//
// COLUMNAS DE LA HOJA "Incidencias":
//   A Fecha | B Folio | C CCT | D Sector | E Zona | F Escuela
//   G Correo Institucional Afectado | H Nombre | I Correo Personal
//   J Teléfono | K Qué problema presentas | L Usuario asignado
//   M Contraseña asignada | N ¿Cuenta lista? | O Usuario enviado
//   P Fecha de entrega | Q Estado general
// ============================================================

const HOJA_INCIDENCIAS = 'Incidencias';

function manejarIncidencia(datos) {
  incidenciaValidarCampos(datos);

  const hoja = incidenciaObtenerHoja();
  const folio = incidenciaGenerarFolio(hoja);
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
    datos.queProblema.trim(),
    '', '', '', '', '',
    'Solicitud recibida'
  ]);

  incidenciaEnviarConfirmacion(folio, datos);

  notificarTelegram(
    '🚨 *Nueva Incidencia — no puede acceder a su cuenta*\n' +
    'Folio: ' + folio + '\n' +
    'Nombre: ' + escapeMarkdown_(datos.nombre.trim()) + '\n' +
    'Correo institucional: ' + datos.correoInstitucional.trim() + '\n' +
    'CCT: ' + escapeMarkdown_(datos.cct.trim().toUpperCase()) + (datos.escuela ? ' — ' + escapeMarkdown_(datos.escuela.trim()) : '') + '\n' +
    'Problema: ' + escapeMarkdown_(datos.queProblema.trim())
  );

  incidenciaNotificarEquipoPorCorreo(folio, datos);

  return textResponse(JSON.stringify({ status: 'ok', folio: folio }));
}

// ── Correo a Marcos, además del Telegram de arriba — sep 2026, mismo canal
// personal que cambioNotificarEquipo()/resetNotificarEquipo() en los otros
// 2 archivos de Correo. ──
function incidenciaNotificarEquipoPorCorreo(folio, d) {
  enviarCorreoConModoPrueba_({
    to: CONFIG.correoResponsable,
    subject: 'Nueva incidencia — no puede acceder a su cuenta (Folio ' + folio + ')',
    htmlBody:
      '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + escapeHtml_(d.nombre.trim()) + '</p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">Correo institucional: ' + escapeHtml_(d.correoInstitucional.trim()) + '</p>' +
      '<p style="margin:0 0 8px 0;font-size:14px;">CCT: ' + escapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + escapeHtml_(d.escuela.trim()) : '') + '</p>' +
      '<p style="margin:0;font-size:14px;">Problema: ' + escapeHtml_(d.queProblema.trim()) + '</p>',
    name: CONFIG.remitente
  });
}

function incidenciaObtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_INCIDENCIAS);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_INCIDENCIAS);
    hoja.appendRow([
      'Fecha', 'Folio', 'CCT', 'Sector', 'Zona', 'Escuela', 'Correo Institucional Afectado',
      'Nombre', 'Correo Personal', 'Teléfono', 'Qué problema presentas',
      'Usuario asignado', 'Contraseña asignada', '¿Cuenta lista?', 'Usuario enviado',
      'Fecha de entrega', 'Estado general'
    ]);
    const header = hoja.getRange(1, 1, 1, 17);
    header.setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(6, 200);  // Escuela
    hoja.setColumnWidth(8, 150);  // Nombre
    hoja.setColumnWidth(11, 260); // Qué problema presentas
  }

  incidenciaAplicarValidacionEstado(hoja);
  incidenciaAplicarSemaforoYProteccion_(hoja);

  return hoja;
}

// ── "Planchado" (sep 2026): dropdown suave en ¿Cuenta lista?, semáforo de
// color en Estado general, protección de solo aviso en Fecha/Folio/Usuario
// enviado/Fecha de entrega/Estado general. Usuario asignado/Contraseña
// asignada (las que Marcos llena a mano para disparar el correo) se dejan
// libres a propósito. Utilidades compartidas en Config.gs. ──
const COL_INCIDENCIA_CUENTA_LISTA = 14;
const COL_INCIDENCIA_USUARIO_ENVIADO = 15;
const COL_INCIDENCIA_FECHA_ENTREGA = 16;
const COL_INCIDENCIA_ESTADO = 17;
const INCIDENCIA_COLORES_ESTADO = { 'Solicitud recibida': '#e5e7eb', 'Incidencia resuelta': '#d1fae5' };

function incidenciaAplicarSemaforoYProteccion_(hoja) {
  aplicarValidacionListaSuave_(hoja, COL_INCIDENCIA_CUENTA_LISTA, ['Sí', 'No']);
  aplicarSemaforoPorValor_(hoja, COL_INCIDENCIA_ESTADO, INCIDENCIA_COLORES_ESTADO);
  [1, 2, COL_INCIDENCIA_USUARIO_ENVIADO, COL_INCIDENCIA_FECHA_ENTREGA, COL_INCIDENCIA_ESTADO]
    .forEach(function (col) { protegerColumnaAutomatica_(hoja, col); });
}

// ── Dropdown en "Estado general" (protector, mismo criterio que
// altaAplicarValidacionEstado() en Alta.gs — ver ese comentario). ──
function incidenciaAplicarValidacionEstado(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Solicitud recibida', 'Incidencia resuelta'], true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, 17, 1000, 1).setDataValidation(regla);
}

function incidenciaGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-INC-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

function incidenciaValidarCampos(d) {
  const requeridos = ['cct', 'escuela', 'correoInstitucional', 'nombre', 'correoPersonal', 'telefono', 'queProblema'];
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

function incidenciaEnviarConfirmacion(folio, d) {
  const asunto = 'Solicitud recibida — Reporte de problema de acceso';
  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Hola, <strong>' + escapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff3f3;border:1px solid #f5c6c6;border-radius:6px;margin-bottom:20px;">' +
    '<tr><td style="padding:16px;">' +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#7a1a2e;font-weight:bold;">🚨 Hemos recibido tu reporte</p>' +
    '<p style="margin:0;font-size:14px;color:#5a3a3a;line-height:1.7;">Tu caso será atendido a la brevedad. En cuanto tengamos una solución te notificaremos a este mismo correo con tus nuevos datos de acceso.</p>' +
    '</td></tr></table>' +
    altaCajaHTML('Folio', folio) +
    altaCajaHTML('Cuenta afectada', escapeHtml_(d.correoInstitucional.trim())) +
    '<p style="margin:0 0 6px 0;font-size:15px;color:#333333;line-height:1.7;">Si es urgente, escríbenos:</p>' +
    '<p style="margin:0 0 20px 0;"><a href="mailto:' + CONFIG.correoOTDE + '" style="color:#9F2241;font-weight:bold;font-size:15px;text-decoration:none;">' + CONFIG.correoOTDE + '</a></p>' +
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

// ── Revisión al editar la hoja "Incidencias" (llamada desde OnEdit.gs) ──
function incidenciaRevisarEdicion(e) {
  const hoja = e.range.getSheet();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn())
    .getValues()[0].map(h => (h || '').toString().trim());

  const idxPassword = indexOfHeader(headers, 'Contraseña asignada');
  const idxUsuario  = indexOfHeader(headers, 'Usuario asignado');
  const idxEnviado  = indexOfHeader(headers, 'Usuario enviado');
  const idxFecha    = indexOfHeader(headers, 'Fecha de entrega');
  const idxEstado   = indexOfHeader(headers, 'Estado general');

  if ([idxPassword, idxUsuario, idxEnviado, idxFecha, idxEstado].includes(-1)) return;

  const colDisparoAbs = idxPassword + 1;
  const colInicio = e.range.getColumn();
  const colFin = colInicio + e.range.getNumColumns() - 1;
  if (colDisparoAbs < colInicio || colDisparoAbs > colFin) return;

  const filaInicio = e.range.getRow();
  const numFilas = e.range.getNumRows();

  for (let f = filaInicio; f < filaInicio + numFilas; f++) {
    if (f === 1) continue;

    const usuario  = (hoja.getRange(f, idxUsuario + 1).getValue() || '').toString().trim();
    const password = (hoja.getRange(f, idxPassword + 1).getValue() || '').toString().trim();
    const yaEnviado = esAfirmativo(hoja.getRange(f, idxEnviado + 1).getValue());
    if (!usuario || !password || yaEnviado) continue;

    try {
      incidenciaEnviarCredenciales(f);
      hoja.getRange(f, idxEnviado + 1).setValue('Sí');
      hoja.getRange(f, idxFecha + 1).setValue(new Date());
      hoja.getRange(f, idxEstado + 1).setValue('Incidencia resuelta');
      SpreadsheetApp.flush();
    } catch (err) {
      Logger.log('❌ Error enviando credenciales fila ' + f + ': ' + err.message);
    }
  }
}

function incidenciaEnviarCredenciales(fila) {
  const hoja = incidenciaObtenerHoja();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(h => (h || '').toString().trim());
  const valores = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];
  const leer = (nombre) => (valores[indexOfHeader(headers, nombre)] || '').toString().trim();

  const nombreCompleto = escapeHtml_(leer('Nombre'));
  const correoPersonal = leer('Correo Personal');
  const usuario = leer('Usuario asignado');
  const password = leer('Contraseña asignada');

  const asunto = 'Actualización de acceso — Cuenta Institucional';
  const linksAcceso =
    '<a href="https://outlook.office.com/" style="display:block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">📨 Outlook — Acceso al correo</a>' +
    '<a href="https://m365.cloud.microsoft/" style="display:block;background-color:#7a1a2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">🌐 Microsoft 365 — Portal completo</a>';

  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Estimado/a <strong>' + nombreCompleto + '</strong>,</p>' +
    '<p style="margin:0 0 18px 0;font-size:15px;color:#333333;line-height:1.7;">Hemos atendido tu reporte. Tu cuenta ha sido restablecida con nuevas credenciales:</p>' +
    altaCajaHTML('Usuario', '📧 ' + usuario) +
    altaCajaHTML('Contraseña temporal', '🔐 ' + password) +
    '<p style="margin:0 0 10px 0;font-size:15px;color:#1a1a1a;font-weight:bold;">¿Cómo ingresar?</p>' +
    linksAcceso +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">Al ingresar con la contraseña temporal, Microsoft te pedirá cambiarla inmediatamente. Elige una contraseña segura que puedas recordar.</p>' +
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
