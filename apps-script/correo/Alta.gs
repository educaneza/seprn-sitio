// ============================================================
// SEPRN · OTDE — Alta de cuenta institucional (webform 2026-2027)
// ============================================================
// Reemplaza, para el tipo "Alta", el par "Alta dee" + "Alta
// aulamexiquense" del sistema viejo — el dominio ya no lo elige
// el solicitante, lo calcula el webform (altCalcularDominio() en
// correo.html, seprn-sitio) a partir del tipo de CCT y la Función:
// Director(a)/Subdirector(a) de una escuela siempre recibe cuenta
// de oficina @dee.edu.mx (ago 2026 — antes se preguntaba "Tipo de
// cuenta" y el solicitante elegía personal/oficina; esa pregunta
// se quitó del formulario). tipoCuenta sigue viajando en el
// payload, calculado en el cliente, solo para conservar el
// historial en la columna H.
//
// COLUMNAS DE LA HOJA "Alta":
//   A Fecha | B Folio | C CCT | D Sector | E Zona | F Escuela
//   G Dominio | H Tipo de Cuenta | I Nombre | J Apellido Paterno
//   K Apellido Materno | L RFC | M CURP | N Función
//   O Correo Personal | P Teléfono | Q Observaciones
//   R NP SIGEE | S Usuario asignado | T Contraseña asignada
//   U ¿Cuenta lista? | V Usuario enviado | W Fecha de entrega
//   X Estado general
//
// NP SIGEE (col R): Marcos la llena a mano con el folio que le
// muestra SIGEE al crear el ticket de Alta — mismo criterio que
// entregable #1 (apps-script/GenerarResumenSIGEE.gs en el
// proyecto Correos-institucionales viejo), necesario porque
// SIGEE no expone ninguna forma de correlacionar una cuenta ya
// creada con la solicitud que la originó.
// ============================================================

const HOJA_ALTA = 'Alta';

function manejarAlta(datos) {
  altaValidarCampos(datos);

  const hoja = altaObtenerHoja();
  const folio = altaGenerarFolio(hoja);
  const ahora = new Date();

  hoja.appendRow([
    ahora,
    folio,
    datos.cct.trim().toUpperCase(),
    (datos.sector || '').trim(),
    (datos.zona || '').toString().trim(),
    (datos.escuela || '').trim(),
    datos.dominio.trim(),
    datos.tipoCuenta.trim(),
    datos.nombre.trim(),
    datos.apellidoPaterno.trim(),
    datos.apellidoMaterno.trim(),
    datos.rfc.trim().toUpperCase(),
    datos.curp.trim().toUpperCase(),
    datos.funcion.trim(),
    datos.correoPersonal.trim(),
    datos.telefono.trim(),
    (datos.observaciones || '').trim(),
    '',   // NP SIGEE — Marcos la llena a mano
    '', '', '', '', '',
    'Solicitud recibida'
  ]);

  altaEnviarConfirmacion(folio, datos);

  // Sin Telegram a propósito: Jorge decidió (ago 2026) que Alta no es urgente
  // — a diferencia de Cambio de Contraseña/Reset 2FA/Incidencias, nadie se
  // queda sin poder trabajar mientras se procesa un alta nueva.

  return textResponse(JSON.stringify({ status: 'ok', folio: folio }));
}

// ── Obtener o crear la hoja "Alta" ──
function altaObtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ALTA);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ALTA);
    hoja.appendRow([
      'Fecha', 'Folio', 'CCT', 'Sector', 'Zona', 'Escuela', 'Dominio', 'Tipo de Cuenta',
      'Nombre', 'Apellido Paterno', 'Apellido Materno', 'RFC', 'CURP', 'Función',
      'Correo Personal', 'Teléfono', 'Observaciones', 'NP SIGEE',
      'Usuario asignado', 'Contraseña asignada', '¿Cuenta lista?', 'Usuario enviado',
      'Fecha de entrega', 'Estado general'
    ]);
    const header = hoja.getRange(1, 1, 1, 24);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(6, 200);  // Escuela
    hoja.setColumnWidth(9, 150);  // Nombre
    hoja.setColumnWidth(17, 220); // Observaciones
  }

  altaAplicarValidacionEstado(hoja);

  return hoja;
}

// ── Dropdown en "Estado general" (protector, no cambia la lógica de arriba):
// en la práctica esta columna solo toma 2 valores — altaRevisarEdicion() es
// quien la escribe siempre, nunca una persona a mano — pero sin un dropdown
// nada impide un typo si alguien edita la celda directo. Se reaplica en cada
// doPost, mismo patrón que aseAplicarValidacionEstatus() en asesorias.gs, así
// que también cubre la hoja ya desplegada la próxima vez que llegue un alta. ──
function altaAplicarValidacionEstado(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Solicitud recibida', 'Cuenta entregada'], true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, 24, 1000, 1).setDataValidation(regla);
}

// ── Generar folio único ──
function altaGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-ALT-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function altaValidarCampos(d) {
  const requeridos = [
    'cct', 'escuela', 'dominio', 'tipoCuenta', 'nombre', 'apellidoPaterno',
    'apellidoMaterno', 'rfc', 'curp', 'funcion', 'correoPersonal', 'telefono'
  ];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^\d{10}$/.test(d.telefono.trim())) {
    throw new Error('Teléfono inválido: ' + d.telefono);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correoPersonal.trim())) {
    throw new Error('Correo personal inválido: ' + d.correoPersonal);
  }
  if (d.dominio !== 'dee.edu.mx' && d.dominio !== 'aulamexiquense.mx') {
    throw new Error('Dominio inválido: ' + d.dominio);
  }
}

// ── Correo de confirmación (inmediato, antes de que exista la cuenta) ──
function altaEnviarConfirmacion(folio, d) {
  const asunto = 'Solicitud recibida — Alta de cuenta institucional';
  const nombreCompleto = escapeHtml_(d.nombre.trim() + ' ' + d.apellidoPaterno.trim() + ' ' + d.apellidoMaterno.trim());

  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Hola, <strong>' + nombreCompleto + '</strong>,</p>' +
    '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.7;">Hemos recibido tu solicitud de alta de cuenta institucional. Resumen:</p>' +
    altaCajaHTML('Folio', folio) +
    altaCajaHTML('Escuela / CCT', escapeHtml_((d.escuela || '') + ' — ' + d.cct.trim().toUpperCase())) +
    altaCajaHTML('Tu cuenta será', '@' + d.dominio.trim()) +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#333333;line-height:1.7;">Tu caso está siendo atendido. En cuanto la cuenta esté lista, te enviaremos tus datos de acceso a este mismo correo.</p>' +
    '<p style="margin:0 0 6px 0;font-size:15px;color:#333333;line-height:1.7;">Si tienes dudas o necesitas dar seguimiento, escríbenos:</p>' +
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

// ── Revisión al editar la hoja "Alta" (llamada desde OnEdit.gs) ──
// Envía las credenciales cuando la edición llena "Contraseña asignada"
// (siempre que también haya "Usuario asignado" y no se haya enviado ya).
function altaRevisarEdicion(e) {
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
    if (f === 1) continue; // encabezado

    const usuario  = (hoja.getRange(f, idxUsuario + 1).getValue() || '').toString().trim();
    const password = (hoja.getRange(f, idxPassword + 1).getValue() || '').toString().trim();
    const yaEnviado = esAfirmativo(hoja.getRange(f, idxEnviado + 1).getValue());

    if (!usuario || !password || yaEnviado) continue;

    try {
      altaEnviarCredenciales(f);
      hoja.getRange(f, idxEnviado + 1).setValue('Sí');
      hoja.getRange(f, idxFecha + 1).setValue(new Date());
      hoja.getRange(f, idxEstado + 1).setValue('Cuenta entregada');
      SpreadsheetApp.flush();
    } catch (err) {
      Logger.log('❌ Error enviando credenciales fila ' + f + ': ' + err.message);
    }
  }
}

// ── Correo final con credenciales (disparado desde altaRevisarEdicion) ──
function altaEnviarCredenciales(fila) {
  const hoja = altaObtenerHoja();
  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(h => (h || '').toString().trim());
  const valores = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];

  const leer = (nombre) => (valores[indexOfHeader(headers, nombre)] || '').toString().trim();

  const nombreCompleto = escapeHtml_(leer('Nombre') + ' ' + leer('Apellido Paterno') + ' ' + leer('Apellido Materno'));
  const correoPersonal = leer('Correo Personal');
  const usuario = leer('Usuario asignado');
  const password = leer('Contraseña asignada');
  const dominio = leer('Dominio');
  const tipoCuentaTexto = dominio === 'dee.edu.mx' ? 'cuenta institucional' : 'cuenta Aula Mexiquense';

  const asunto = '[SGCI] Entrega de cuenta institucional @' + dominio;
  const linksAcceso =
    '<p style="margin:0 0 10px 0;font-size:14px;color:#333333;line-height:1.7;">Ingresa desde cualquiera de estos enlaces:</p>' +
    '<a href="https://outlook.office.com/" style="display:block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">📨 Outlook — Acceso al correo</a>' +
    '<a href="https://m365.cloud.microsoft/" style="display:block;background-color:#7a1a2e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;text-align:center;padding:14px 20px;border-radius:6px;margin:0 0 12px 0;">🌐 Microsoft 365 — Portal completo</a>';

  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Estimado/a <strong>' + nombreCompleto + '</strong>,</p>' +
    '<p style="margin:0 0 18px 0;font-size:15px;color:#333333;line-height:1.7;">Tu ' + tipoCuentaTexto + ' ha sido creada con éxito. Aquí tus datos de acceso:</p>' +
    altaCajaHTML('Usuario', '📧 ' + usuario) +
    altaCajaHTML('Contraseña temporal', '🔐 ' + password) +
    '<p style="margin:0 0 10px 0;font-size:15px;color:#1a1a1a;font-weight:bold;">¿Cómo ingresar por primera vez?</p>' +
    linksAcceso +
    '<p style="margin:0 0 8px 0;font-size:14px;color:#333333;line-height:1.7;">1. Al ingresar con la contraseña temporal, Microsoft te pedirá cambiarla. Elige una contraseña segura.</p>' +
    '<p style="margin:0 0 20px 0;font-size:14px;color:#333333;line-height:1.7;">2. Después se te solicitará configurar la <strong>autenticación de 2 pasos</strong> con la app <strong>Microsoft Authenticator</strong>. Descárgala en tu celular, escanea el código QR y sigue las instrucciones.</p>' +
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

// ============================================================
// HTML helpers — mismo estilo visual que el proyecto viejo
// (Code.gs), reescritos como concatenación de strings (no
// template literals) por la misma razón ya documentada ahí:
// los backticks han producido correos vacíos en Apps Script.
// ============================================================

function altaEncabezadoHTML(titulo) {
  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body style="margin:0;padding:0;background-color:#f4f1ee;font-family:Arial,Helvetica,sans-serif;">' +
    '<div style="width:100%;background-color:#f4f1ee;padding:20px 0;">' +
    '<div style="max-width:580px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.10);">' +
    '<div style="background-color:#9F2241;padding:24px 24px 20px 24px;">' +
    '<p style="font-size:10px;color:#d6a87e;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin:0 0 6px 0;">Subdirección de Educación Primaria | Nezahualcóyotl</p>' +
    '<p style="font-size:17px;color:#ffffff;font-weight:bold;margin:0;">' + titulo + '</p>' +
    '<div style="margin-top:14px;height:3px;background-color:#977e5b;border-radius:2px;width:50px;"></div>' +
    '</div><div style="padding:28px 24px 20px 24px;">';
}

function altaFirmaHTML() {
  return '</div><div style="padding:20px 24px 28px 24px;border-top:1px solid #e0d8d0;">' +
    '<p style="margin:0 0 2px 0;font-size:14px;font-weight:bold;color:#9F2241;">Mtro. Jorge Alberto Bonilla Torres</p>' +
    '<p style="margin:0 0 2px 0;font-size:12px;color:#555555;">Jefe de la Oficina de Tecnología para el Desarrollo Educativo | <strong>OTDE</strong></p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#666666;">Subdirección de Educación Primaria en la Región de Nezahualcóyotl | SEPRN</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📞 55 3300 2400 Ext. 9065</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📍 Av. Texcoco 116, Col. Juárez Pantitlán, Nezahualcóyotl C.P. 57460</p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#555555;">✉️ <a href="mailto:' + CONFIG.correoOTDE + '" style="color:#9F2241;text-decoration:none;">' + CONFIG.correoOTDE + '</a></p>' +
    '<p style="margin:0;font-size:12px;line-height:2.2;">' +
    '<a href="' + CONFIG.sitioWeb + '" style="color:#977e5b;text-decoration:none;font-weight:bold;">🌐 Sitio Web</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="' + CONFIG.facebook + '" style="color:#977e5b;text-decoration:none;font-weight:bold;">📘 Facebook</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="' + CONFIG.youtube + '" style="color:#977e5b;text-decoration:none;font-weight:bold;">▶️ YouTube</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="' + CONFIG.whatsapp + '" style="color:#977e5b;text-decoration:none;font-weight:bold;">💬 WhatsApp</a></p>' +
    '</div><div style="background-color:#9F2241;padding:10px 24px;text-align:center;">' +
    '<p style="margin:0;font-size:10px;color:#d6a87e;letter-spacing:1px;">SEPRN © 2026 — Gobierno del Estado de México</p>' +
    '</div></div></div></body></html>';
}

function altaAvisoPieHTML() {
  return '<div style="background-color:#fff8f0;border:1px solid #e8ddd4;border-radius:4px;padding:12px 14px;margin-bottom:16px;">' +
    '<p style="margin:0 0 6px 0;font-size:12px;color:#7a6a5a;line-height:1.6;">⚠️ <strong>Importante:</strong> No respondas a este correo, no es monitoreado. Para dudas o seguimiento escríbenos a <a href="mailto:' + CONFIG.correoOTDE + '" style="color:#9F2241;">' + CONFIG.correoOTDE + '</a></p>' +
    '<p style="margin:0;font-size:12px;color:#7a6a5a;line-height:1.6;">📌 Si este correo llegó a spam, márcalo como "No es spam".</p>' +
    '</div>';
}

// ── Tabla real (no <div>) para que la caja sobreviva en Outlook de
// escritorio — mismo ajuste ya aplicado a mantenimiento.gs/asesorias.gs/
// soporte-remoto.gs en seprn-sitio. ──
function altaCajaHTML(etiqueta, valor) {
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:4px solid #9F2241;border-radius:4px;background-color:#f9f6f3;margin-bottom:16px;">' +
    '<tr><td style="padding:14px 16px;">' +
    '<p style="font-size:10px;color:#977e5b;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;margin:0 0 4px 0;">' + etiqueta + '</p>' +
    '<p style="font-size:16px;color:#1a1a1a;font-weight:bold;margin:0;word-break:break-all;">' + valor + '</p>' +
    '</td></tr></table>';
}

// ── Botón de seguimiento hacia Oficina Virtual — mismo destino y mismo
// propósito que el botón "Consultar estatus de tu solicitud" ya agregado a
// Mantenimiento/Asesorías/Soporte. ──
function altaBotonSeguimientoHTML() {
  return '<a href="' + CONFIG.ctaSeguimiento + '" style="display:inline-block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;text-align:center;padding:12px 22px;border-radius:6px;margin:6px 0 16px 0;">Consultar estatus de tu solicitud &rarr;</a>';
}
