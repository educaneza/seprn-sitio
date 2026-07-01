// ============================================================
// SEPRN · OTDE — Jornada de Capacitación Verano 2026
// Endpoint para reporte de inscripciones a cursos CoEEE
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   4. Copia la URL generada y pégala en jornada-verano-2026.html
//      en la constante APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA:
//   A Fecha | B Folio | C Nombre | D RFC | E Función
//   F CCT | G Sector | H Zona | I Escuela/Unidad | J Curso | K Correo
// ============================================================

const HOJA_NOMBRE = 'Cursos_OTDE_Verano_2026';

// ── doGet: verificación de estado ──
function doGet() {
  return jsonResponse({ status: 'ok', servicio: 'OTDE Cursos CoEEE Verano 2026' });
}

// ── doPost: recibe reporte de inscripción ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    validarCampos(datos);

    const hoja  = obtenerHoja();
    const folio = generarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.nombre.trim(),
      datos.rfc.trim().toUpperCase(),
      datos.funcion.trim(),
      datos.cct.trim().toUpperCase(),
      datos.sector.trim(),
      datos.zona  || '',
      datos.escuela.trim(),
      datos.curso.trim(),
      datos.correo.trim().toLowerCase()
    ]);

    return jsonResponse({ status: 'ok', folio });

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
      'Fecha', 'Folio', 'Nombre', 'RFC', 'Función',
      'CCT', 'Sector', 'Zona', 'Escuela/Unidad', 'Curso', 'Correo'
    ]);
    const header = hoja.getRange(1, 1, 1, 11);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(1, 155);  // Fecha
    hoja.setColumnWidth(2, 160);  // Folio
    hoja.setColumnWidth(3, 200);  // Nombre
    hoja.setColumnWidth(10, 260); // Curso
  }

  return hoja;
}

// ── Generar folio único ──
function generarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-V26-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function validarCampos(d) {
  const requeridos = ['nombre', 'rfc', 'funcion', 'cct', 'sector', 'escuela', 'correo', 'curso'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i.test(d.rfc.trim())) {
    throw new Error('RFC inválido: ' + d.rfc);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
}

// ── Respuesta JSON ──
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Hoja de estadísticas (ejecutar manualmente) ──
// Genera una hoja resumen con conteos por curso, sector y zona.
function generarEstadisticas() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = obtenerHoja();
  const datos = hoja.getDataRange().getValues().slice(1);

  if (!datos.length) {
    SpreadsheetApp.getUi().alert('No hay registros aún.');
    return;
  }

  let resumen = ss.getSheetByName('Estadísticas_CoEEE');
  if (resumen) ss.deleteSheet(resumen);
  resumen = ss.insertSheet('Estadísticas_CoEEE');

  // Conteo por curso
  const porCurso = {};
  const porSector = {};
  const porZona  = {};

  datos.forEach(row => {
    const curso  = String(row[9]);
    const sector = String(row[6]);
    const zona   = String(row[7]);
    porCurso[curso]   = (porCurso[curso]   || 0) + 1;
    porSector[sector] = (porSector[sector] || 0) + 1;
    if (zona) porZona['Zona ' + zona] = (porZona['Zona ' + zona] || 0) + 1;
  });

  const ahora = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  resumen.appendRow(['ESTADÍSTICAS — Jornada Capacitación Verano 2026']);
  resumen.appendRow(['Generado:', ahora]);
  resumen.appendRow(['Total de reportes:', datos.length]);
  resumen.appendRow([]);

  resumen.appendRow(['POR CURSO', 'Registros']);
  Object.entries(porCurso).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow([]);
  resumen.appendRow(['POR SECTOR', 'Registros']);
  Object.entries(porSector).sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, v]) => resumen.appendRow(['Sector ' + k, v]));

  resumen.appendRow([]);
  resumen.appendRow(['POR ZONA', 'Registros']);
  Object.entries(porZona).sort((a, b) => {
    const na = parseInt(a[0].replace('Zona ', ''));
    const nb = parseInt(b[0].replace('Zona ', ''));
    return na - nb;
  }).forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  resumen.getRange(5, 1, 1, 2).setFontWeight('bold').setBackground('#9F2241').setFontColor('#fff');
  resumen.setColumnWidth(1, 320);
  resumen.setColumnWidth(2, 100);

  SpreadsheetApp.getUi().alert('Estadísticas generadas en la hoja "Estadísticas_CoEEE".');
}
