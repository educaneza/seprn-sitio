// ============================================================
// SEPRN · OTDE — Resumen semanal de solicitudes pendientes
// ============================================================
// Puerto de apps-script/ResumenSemanal.gs (sistema viejo, 6 hojas del
// Google Form) a las 4 hojas del webform 2026-2027. Mismo propósito:
// cada lunes 9am, un correo a Marcos + OTDE con el conteo de
// solicitudes pendientes por tipo, para no depender de que alguien
// abra el Sheet a revisar.
//
// "Pendiente" aquí es más simple que en el sistema viejo: cada tipo
// solo tiene 2 estados en "Estado general" — 'Solicitud recibida'
// (inicial) y un estado final propio por tipo ('Cuenta entregada',
// 'Reset notificado', 'Incidencia resuelta' — ver altaRevisarEdicion/
// cambioRevisarEdicion/resetRevisarEdicion/incidenciaRevisarEdicion).
// Pendiente = todavía en 'Solicitud recibida', sin importar cuál sea
// el estado final de ese tipo.
// ============================================================

function resumenSemanal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojasValidas = [HOJA_ALTA, HOJA_CAMBIO, HOJA_RESET, HOJA_INCIDENCIAS];

  const conteos = {};
  let totalPendientes = 0;

  for (const nombreHoja of hojasValidas) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) continue;

    const datos = hoja.getDataRange().getValues();
    const headers = datos[0].map(h => (h || '').toString().trim());
    const idxEstado = indexOfHeader(headers, 'Estado general');
    if (idxEstado === -1) continue;

    let conteo = 0;
    for (let i = 1; i < datos.length; i++) {
      const estado = normalizarTexto(datos[i][idxEstado]);
      if (estado === normalizarTexto('Solicitud recibida')) {
        conteo++;
        totalPendientes++;
      }
    }
    if (conteo > 0) conteos[nombreHoja] = conteo;
  }

  if (totalPendientes === 0) return;

  const urlSheet = ss.getUrl();
  const hoy = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy');

  let filasHTML = '';
  for (const [hoja, conteo] of Object.entries(conteos)) {
    filasHTML += `
<tr>
  <td style="padding:10px 14px; font-size:13px; color:#333333; border-bottom:1px solid #e8e0d8;">${hoja}</td>
  <td style="padding:10px 14px; font-size:13px; color:#9F2241; font-weight:bold; text-align:center; border-bottom:1px solid #e8e0d8;">${conteo}</td>
</tr>`;
  }

  const asunto = `📋 Resumen semanal Webform Correo — ${totalPendientes} solicitud(es) pendiente(s) · ${hoy}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background-color:#f4f1ee; font-family: Arial, Helvetica, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ee; padding: 30px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:6px; overflow:hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#9F2241; padding: 28px 36px;">
            <p style="margin:0; font-size:11px; color:#d6a87e; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">Subdirección de Educación Primaria | Nezahualcóyotl</p>
            <p style="margin:6px 0 0 0; font-size:18px; color:#ffffff; font-weight:bold;">OTDE — Webform de Correos Institucionales</p>
            <div style="margin-top:14px; height:3px; background-color:#977e5b; border-radius:2px; width:60px;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 36px 24px 36px;">
            <p style="margin:0 0 8px 0; font-size:15px; color:#1a1a1a;">Hola <strong>Marcos</strong>,</p>
            <p style="margin:0 0 24px 0; font-size:15px; color:#333333; line-height:1.6;">
              Este es tu resumen semanal del webform de correos institucionales. Tienes solicitudes pendientes por atender o canalizar a CoEEE:
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:4px; overflow:hidden; margin-bottom:24px; border:1px solid #e8e0d8;">
              <tr style="background-color:#9F2241;">
                <td style="padding:10px 14px; font-size:12px; color:#ffffff; font-weight:bold; text-transform:uppercase; letter-spacing:1px;">Tipo de solicitud</td>
                <td style="padding:10px 14px; font-size:12px; color:#ffffff; font-weight:bold; text-transform:uppercase; letter-spacing:1px; text-align:center;">Pendientes</td>
              </tr>
              ${filasHTML}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3; border-left:4px solid #977e5b; border-radius:4px; margin-bottom:24px;">
              <tr>
                <td style="padding:14px 20px;">
                  <p style="margin:0; font-size:14px; color:#333333;">Total de solicitudes pendientes: <strong style="color:#9F2241;">${totalPendientes}</strong></p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 16px 0; font-size:14px; color:#333333; line-height:1.6;">
              Revisa y actualiza el estatus de cada caso directamente en la hoja de control:
            </p>
            <p style="margin:0 0 24px 0; text-align:center;">
              <a href="${urlSheet}" style="background-color:#9F2241; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:4px; font-size:14px; font-weight:bold; display:inline-block;">
                📊 Abrir hoja de control
              </a>
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff8f0; border:1px solid #e8ddd4; border-radius:4px;">
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0; font-size:12px; color:#7a6a5a; line-height:1.5;">
                    ⚠️ Este es un correo automático generado cada lunes. Por favor no respondas a este mensaje.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 36px 36px 36px;">
            <div style="border-top: 1px solid #e0d8d0; padding-top: 20px;">
              <p style="margin:0 0 2px 0; font-size:13px; font-weight:bold; color:#9F2241;">Oficina de Tecnología para el Desarrollo Educativo | OTDE</p>
              <p style="margin:0; font-size:12px; color:#666666;">Subdirección de Educación Primaria en la Región de Nezahualcóyotl | SEPRN</p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background-color:#9F2241; padding: 12px 36px;">
            <p style="margin:0; font-size:11px; color:#d6a87e; text-align:center; letter-spacing:1px;">SEPRN © 2026 — Gobierno del Estado de México</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  enviarCorreoConModoPrueba_({
    to: CONFIG.correoResponsable + ', ' + CONFIG.correoOTDE,
    subject: asunto,
    htmlBody: html,
    name: CONFIG.remitente,
    replyTo: CONFIG.correoOTDE
  });
}

function crearTriggerResumenSemanal() {
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'resumenSemanal') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('resumenSemanal')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9)
    .create();
}
