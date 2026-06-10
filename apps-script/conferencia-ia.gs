// ============================================================
// SEPRN · OTDE — Conferencia IA 2026
// Web App endpoint para el formulario de registro
//
// IMPLEMENTACIÓN:
//   1. Abre el Google Spreadsheet donde guardarás registros
//   2. Extensiones → Apps Script → pega este código
//   3. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   4. Copia la URL y pégala en conferencia-ia.html (constante APPS_SCRIPT_URL)
// ============================================================

const HOJA_NOMBRE  = 'Registros_IA_2026';
const CUPO_SECTOR  = 7;
const CORREO_ADMIN = 'adg0086n@dee.edu.mx'; // correo de notificaciones internas

// ── Sectores válidos ──
const SECTORES_VALIDOS = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','SEPRN'];

// ── doGet: verifica cupo de un sector ──
function doGet(e) {
  const action = e.parameter.action;
  if (action === 'cupo') {
    const sector = e.parameter.sector;
    const resultado = verificarCupo(sector);
    return jsonResponse(resultado);
  }
  return jsonResponse({ status: 'ok', mensaje: 'Web App activa' });
}

// ── doPost: recibe registro del formulario ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    validarCampos(datos); // lanza Error si falta algo

    const hoja     = obtenerHoja();
    const sector   = datos.sector.trim().toUpperCase();
    const conteo   = contarPorSector(hoja, sector);
    const esSeprn  = sector === 'SEPRN';
    const hayCupo  = esSeprn || conteo < CUPO_SECTOR;
    const status   = hayCupo ? 'ok' : 'lista_espera';
    const folio    = generarFolio(hoja, sector, hayCupo);
    const ahora    = new Date();

    // Guardar fila
    hoja.appendRow([
      ahora,
      folio,
      datos.nombre,
      datos.rfc,
      datos.telefono,
      datos.correo,
      datos.funcion,
      datos.cct,
      datos.sector,
      datos.zona || '',
      datos.escuela,
      status,
    ]);

    // Enviar correo al registrado
    enviarComprobante(datos, folio, status, ahora);

    return jsonResponse({ status, folio, mensaje: hayCupo
      ? 'Registro exitoso. Revisa tu correo.'
      : 'Lista de espera. Te avisaremos si hay lugar.' });

  } catch (err) {
    return jsonResponse({ status: 'error', mensaje: err.message });
  }
}

// ── Obtener o crear la hoja ──
function obtenerHoja() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let hoja   = ss.getSheetByName(HOJA_NOMBRE);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_NOMBRE);
    hoja.appendRow([
      'Fecha','Folio','Nombre','RFC','Teléfono','Correo',
      'Función','CCT','Sector','Zona','Escuela/Unidad','Estado'
    ]);
    hoja.getRange(1,1,1,12).setFontWeight('bold').setBackground('#0C1A2E').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// ── Contar registros confirmados por sector ──
function contarPorSector(hoja, sector) {
  const datos = hoja.getDataRange().getValues();
  return datos.slice(1).filter(row => {
    const s = String(row[8]).trim().toUpperCase();
    const e = String(row[11]).trim().toLowerCase();
    return s === sector.toUpperCase() && e === 'ok';
  }).length;
}

// ── Verificar cupo (para doGet) ──
function verificarCupo(sector) {
  if (!sector) return { disponible: false, registrados: 0, mensaje: 'Sector requerido' };
  if (sector === 'SEPRN') return { disponible: true, registrados: 0, mensaje: 'Sin límite' };
  const hoja       = obtenerHoja();
  const registrados = contarPorSector(hoja, sector);
  return {
    disponible:  registrados < CUPO_SECTOR,
    registrados,
    cupo:        CUPO_SECTOR,
  };
}

// ── Generar folio ── formato: CONF-{SECTOR}-{nn}
function generarFolio(hoja, sector, confirmado) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = `CONF-${sector}-`;
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix,''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  const num    = String(maxNum + 1).padStart(2, '0');
  const sufijo = confirmado ? '' : '-LE'; // LE = lista espera
  return `${prefix}${num}${sufijo}`;
}

// ── Validar campos obligatorios ──
function validarCampos(d) {
  const requeridos = ['nombre','rfc','telefono','correo','funcion','cct','sector','escuela'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error(`Campo requerido: ${campo}`);
    }
  }
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(d.rfc.trim())) {
    throw new Error('RFC inválido');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) {
    throw new Error('Correo inválido');
  }
}

// ── Enviar correo de confirmación ──
function enviarComprobante(datos, folio, status, fecha) {
  const esConfirmado = status === 'ok';
  const fechaStr     = Utilities.formatDate(fecha, 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  const estadoLabel  = esConfirmado ? 'CONFIRMADO' : 'LISTA DE ESPERA';
  const estadoColor  = esConfirmado ? '#1D9E75'    : '#d97706';

  const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.1);">

        <!-- Header -->
        <tr>
          <td style="background:#0C1A2E;padding:28px 32px;">
            <p style="color:#1D9E75;font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin:0 0 6px;">SEPRN · OTDE</p>
            <h1 style="color:#F9F8F5;font-size:20px;margin:0;line-height:1.3;">
              Inteligencia Artificial:<br>Una charla para docentes, padres y comunidad educativa
            </h1>
          </td>
        </tr>

        <!-- Estado -->
        <tr>
          <td style="background:${estadoColor};padding:12px 32px;text-align:center;">
            <p style="color:#fff;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0;">
              Registro ${estadoLabel}
            </p>
          </td>
        </tr>

        <!-- Folio -->
        <tr>
          <td style="padding:28px 32px 16px;text-align:center;">
            <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Tu folio de asistencia</p>
            <p style="font-family:'Courier New',monospace;font-size:28px;font-weight:700;color:#0C1A2E;letter-spacing:.08em;margin:0;background:#f0fdf4;display:inline-block;padding:10px 28px;border-radius:8px;border:2px solid #1D9E75;">${folio}</p>
            <p style="color:#6b7280;font-size:12px;margin:8px 0 0;">Guarda este folio como comprobante de asistencia</p>
          </td>
        </tr>

        <!-- Datos del evento -->
        <tr>
          <td style="padding:8px 32px 16px;">
            <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;" cellpadding="0" cellspacing="0">
              <tr><td style="padding:4px 0;">
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">📅 Fecha</span><br>
                <strong style="font-size:15px;color:#111827;">Miércoles 17 de junio de 2026</strong>
              </td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid #e5e7eb;">
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">📍 Lugar</span><br>
                <strong style="font-size:15px;color:#111827;">Auditorio de la Regional 1 Neza</strong>
              </td></tr>
              <tr><td style="padding:4px 0;border-top:1px solid #e5e7eb;">
                <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;">🕙 Horario</span><br>
                <strong style="font-size:15px;color:#111827;">Recepción: 9:30 h · Conferencia: 10:00 h</strong>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Datos del registrado -->
        <tr>
          <td style="padding:4px 32px 24px;">
            <p style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;">Datos de tu registro</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              ${fila('Nombre', datos.nombre)}
              ${fila('Función', datos.funcion)}
              ${fila('Escuela / Unidad', datos.escuela)}
              ${fila('Sector', datos.sector)}
              ${datos.zona ? fila('Zona', datos.zona) : ''}
              ${fila('Registrado el', fechaStr)}
            </table>
          </td>
        </tr>

        ${!esConfirmado ? `
        <!-- Aviso lista de espera -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:14px 16px;" cellpadding="0" cellspacing="0">
              <tr><td>
                <p style="color:#92400e;font-size:13px;margin:0;"><strong>⚠️ Lista de espera</strong></p>
                <p style="color:#92400e;font-size:13px;margin:6px 0 0;">El cupo de tu sector está completo. Quedas en lista de espera. Te notificaremos si se libera un lugar antes del evento.</p>
              </td></tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#0C1A2E;padding:18px 32px;text-align:center;">
            <p style="color:#6b7280;font-size:12px;margin:0;">
              Subdirección de Educación Primaria en la Región de Nezahualcóyotl · OTDE<br>
              Este es un correo automático, no responder a esta dirección.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const asunto = esConfirmado
    ? `✅ Registro confirmado — Conferencia IA 2026 · Folio ${folio}`
    : `⏳ Lista de espera — Conferencia IA 2026 · Folio ${folio}`;

  GmailApp.sendEmail(datos.correo, asunto, '', { htmlBody });
}

// helper para filas de la tabla en el correo
function fila(label, valor) {
  if (!valor) return '';
  return `<tr>
    <td style="padding:5px 0;border-top:1px solid #f3f4f6;font-size:12px;color:#6b7280;width:40%;">${label}</td>
    <td style="padding:5px 0;border-top:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:500;">${valor}</td>
  </tr>`;
}

// ── Respuesta JSON con CORS ──
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
