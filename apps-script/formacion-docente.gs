// ============================================================
// SEPRN · OTDE — Centro de Formación Docente
// Endpoint para catálogo de cursos (webinars, seminarios,
// conferencias, cursos autogestivos, acciones formativas,
// diplomados, proyectos didácticos) y registro de docentes
//
// IMPLEMENTACIÓN:
//   1. Crea (o abre) el Google Spreadsheet "Formacion_Docente_2026_2027"
//      — uno nuevo por cada ciclo escolar (se duplica al cerrar el ciclo)
//   2. Extensiones → Apps Script → pega este código completo
//   3. Ajusta la constante CICLO_ESCOLAR más abajo si cambia el ciclo
//   4. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL generada y pégala en formacion-docente.html
//      en la constante APPS_SCRIPT_URL
//   6. Abre la hoja "Cursos" y da de alta tus cursos manualmente
//      (Categoria, Nombre, Responsable, Modalidad, fechas, Liga,
//      Activo=TRUE) — usa el menú "OTDE Formación → Generar ID de
//      cursos faltantes" para que el ID_Curso se autocomplete
//
// HOJAS (pestañas dentro del mismo Spreadsheet):
//
//   Docentes — una fila por persona (llave: RFC)
//     A RFC | B Nombre_completo | C Correo | D Telefono | E CCT
//     F Escuela | G Sector | H Zona | I Municipio | J Funcion
//     K Fecha_primer_registro | L Fecha_ultima_actualizacion
//
//   Cursos — catálogo, administrado a mano por OTDE
//     A ID_Curso | B Categoria | C Nombre | D Responsable
//     E Modalidad | F Fecha_inicio | G Fecha_fin | H Liga_convocatoria
//     I Requiere_codigo_asistencia | J Codigo_asistencia
//     K Activo | L Notas
//
//   Inscripciones — una fila por registro (transaccional)
//     A Folio | B Fecha_registro | C RFC_Docente | D ID_Curso
//     E Estado | F Codigo_asistencia_capturado
//     G Fecha_actualizacion_estado | H Notas
//
// NOTA: el campo Codigo_asistencia_capturado y el flujo de cierre
// de webinars (validar asistencia) se implementan en una fase
// posterior — este endpoint solo cubre catálogo + registro.
// ============================================================

const CICLO_ESCOLAR = '2627'; // 2026-2027 — actualizar cada ciclo

const HOJA_DOCENTES      = 'Docentes';
const HOJA_CURSOS        = 'Cursos';
const HOJA_INSCRIPCIONES = 'Inscripciones';

const PREFIJOS_CATEGORIA = {
  'Webinar':               'WEB',
  'Seminario':              'SEM',
  'Conferencia':            'CNF',
  'Curso autogestivo':      'AUT',
  'Acción formativa':       'ACF',
  'Diplomado':              'DIP',
  'Proyecto didáctico':     'PRY'
};

// ── doGet: catálogo de cursos activos ──
function doGet() {
  try {
    const hoja  = obtenerHojaCursos();
    const datos = hoja.getDataRange().getValues().slice(1);

    const cursos = datos
      .filter(row => String(row[10]).trim().toUpperCase() === 'TRUE' && String(row[0]).trim())
      .map(row => ({
        id:                row[0].toString().trim(),
        categoria:         row[1],
        nombre:            row[2],
        responsable:       row[3],
        modalidad:         row[4],
        fecha_inicio:      formatearFecha(row[5]),
        fecha_fin:         formatearFecha(row[6]),
        liga_convocatoria: row[7] || ''
      }));

    return textResponse(JSON.stringify({ status: 'ok', cursos }));
  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message, cursos: [] }));
  }
}

// ── doPost: recibe un registro (docente + un curso) ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    validarCampos(datos);

    const rfc      = datos.rfc.trim().toUpperCase();
    const idCurso  = datos.id_curso.trim().toUpperCase();
    const ahora    = new Date();

    const hojaCursos = obtenerHojaCursos();
    if (!existeCurso(hojaCursos, idCurso)) {
      throw new Error('Curso no encontrado: ' + idCurso);
    }

    const hojaDocentes = obtenerHojaDocentes();
    upsertDocente(hojaDocentes, datos, rfc, ahora);

    const hojaInscripciones = obtenerHojaInscripciones();
    const folioExistente = buscarInscripcionExistente(hojaInscripciones, rfc, idCurso);
    if (folioExistente) {
      return textResponse(JSON.stringify({ status: 'ok', folio: folioExistente, duplicado: true }));
    }

    const folio = generarFolio(hojaInscripciones);
    hojaInscripciones.appendRow([folio, ahora, rfc, idCurso, 'Registrado', '', '', '']);

    return textResponse(JSON.stringify({ status: 'ok', folio: folio, duplicado: false }));

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Upsert: actualiza si el RFC ya existe, inserta si no ──
function upsertDocente(hoja, d, rfc, ahora) {
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === rfc) {
      const fila = i + 1;
      hoja.getRange(fila, 2, 1, 9).setValues([[
        d.nombre.trim(),
        d.correo.trim().toLowerCase(),
        d.telefono.trim(),
        d.cct.trim().toUpperCase(),
        d.escuela.trim(),
        (d.sector || '').toString().trim(),
        (d.zona || '').toString().trim(),
        (d.municipio || '').trim(),
        d.funcion.trim()
      ]]);
      hoja.getRange(fila, 12).setValue(ahora); // Fecha_ultima_actualizacion
      return;
    }
  }

  // No existía: se agrega
  hoja.appendRow([
    rfc,
    d.nombre.trim(),
    d.correo.trim().toLowerCase(),
    d.telefono.trim(),
    d.cct.trim().toUpperCase(),
    d.escuela.trim(),
    (d.sector || '').toString().trim(),
    (d.zona || '').toString().trim(),
    (d.municipio || '').trim(),
    d.funcion.trim(),
    ahora, // Fecha_primer_registro
    ahora  // Fecha_ultima_actualizacion
  ]);
}

// ── ¿Ya existe una inscripción de este RFC a este curso? ──
function buscarInscripcionExistente(hoja, rfc, idCurso) {
  const datos = hoja.getDataRange().getValues();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][2]).trim().toUpperCase() === rfc &&
        String(datos[i][3]).trim().toUpperCase() === idCurso) {
      return datos[i][0];
    }
  }
  return null;
}

// ── ¿Existe este ID_Curso en el catálogo? ──
function existeCurso(hoja, idCurso) {
  const datos = hoja.getDataRange().getValues();
  return datos.slice(1).some(row => String(row[0]).trim().toUpperCase() === idCurso);
}

// ── Obtener o crear hoja Docentes ──
function obtenerHojaDocentes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_DOCENTES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_DOCENTES);
    hoja.appendRow([
      'RFC', 'Nombre_completo', 'Correo', 'Telefono', 'CCT', 'Escuela',
      'Sector', 'Zona', 'Municipio', 'Funcion',
      'Fecha_primer_registro', 'Fecha_ultima_actualizacion'
    ]);
    estilizarEncabezado(hoja, 12);
    hoja.setColumnWidth(2, 200); // Nombre_completo
    hoja.setColumnWidth(6, 220); // Escuela
  }
  return hoja;
}

// ── Obtener o crear hoja Cursos ──
function obtenerHojaCursos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_CURSOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_CURSOS);
    hoja.appendRow([
      'ID_Curso', 'Categoria', 'Nombre', 'Responsable', 'Modalidad',
      'Fecha_inicio', 'Fecha_fin', 'Liga_convocatoria',
      'Requiere_codigo_asistencia', 'Codigo_asistencia', 'Activo', 'Notas'
    ]);
    estilizarEncabezado(hoja, 12);
    hoja.setColumnWidth(3, 280); // Nombre
    hoja.setColumnWidth(8, 220); // Liga_convocatoria
  }
  return hoja;
}

// ── Obtener o crear hoja Inscripciones ──
function obtenerHojaInscripciones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_INSCRIPCIONES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_INSCRIPCIONES);
    hoja.appendRow([
      'Folio', 'Fecha_registro', 'RFC_Docente', 'ID_Curso', 'Estado',
      'Codigo_asistencia_capturado', 'Fecha_actualizacion_estado', 'Notas'
    ]);
    estilizarEncabezado(hoja, 8);
  }
  return hoja;
}

// ── Estilo estándar de encabezado (igual al resto del sitio) ──
function estilizarEncabezado(hoja, numCols) {
  hoja.getRange(1, 1, 1, numCols)
    .setFontWeight('bold')
    .setBackground('#56212f')
    .setFontColor('#F9F8F5');
  hoja.setFrozenRows(1);
}

// ── Generar folio único ──
function generarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-CAP-';
  const maxNum = datos.slice(1)
    .map(row => String(row[0]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function validarCampos(d) {
  const requeridos = ['rfc', 'nombre', 'correo', 'telefono', 'cct', 'escuela', 'funcion', 'id_curso'];
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
  if (!/^\d{10}$/.test(d.telefono.trim())) {
    throw new Error('Teléfono inválido: ' + d.telefono);
  }
}

// ── Formatear fecha para el catálogo (dd/MM/yyyy) ──
function formatearFecha(valor) {
  if (!valor) return '';
  try {
    return Utilities.formatDate(new Date(valor), 'America/Mexico_City', 'dd/MM/yyyy');
  } catch (e) {
    return String(valor);
  }
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// MENÚ Y HERRAMIENTAS ADMINISTRATIVAS (uso manual desde Sheets)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Formación')
    .addItem('Generar ID de cursos faltantes', 'generarIdsCursosFaltantes')
    .addItem('Generar estadísticas', 'generarEstadisticas')
    .addToUi();
}

// Autocompleta ID_Curso en filas nuevas de la hoja Cursos que
// tengan Categoria pero no ID_Curso todavía.
function generarIdsCursosFaltantes() {
  const hoja  = obtenerHojaCursos();
  const datos = hoja.getDataRange().getValues();
  let generados = 0;

  for (let i = 1; i < datos.length; i++) {
    const idActual   = String(datos[i][0]).trim();
    const categoria  = String(datos[i][1]).trim();
    if (idActual || !categoria) continue;

    const prefijo = PREFIJOS_CATEGORIA[categoria] || 'GEN';
    const maxNum = datos
      .map(r => String(r[0]))
      .filter(id => id.startsWith(prefijo + '-' + CICLO_ESCOLAR + '-'))
      .map(id => parseInt(id.split('-').pop(), 10) || 0)
      .reduce((a, b) => Math.max(a, b), 0);

    const nuevoId = prefijo + '-' + CICLO_ESCOLAR + '-' + String(maxNum + 1).padStart(3, '0');
    hoja.getRange(i + 1, 1).setValue(nuevoId);
    datos[i][0] = nuevoId; // para que el siguiente cálculo de maxNum ya lo considere
    generados++;
  }

  SpreadsheetApp.getUi().alert(generados + ' ID(s) de curso generado(s).');
}

// Genera una hoja resumen con conteos por curso, sector, municipio y estado.
function generarEstadisticas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaInsc = obtenerHojaInscripciones();
  const inscripciones = hojaInsc.getDataRange().getValues().slice(1);

  if (!inscripciones.length) {
    SpreadsheetApp.getUi().alert('No hay inscripciones aún.');
    return;
  }

  const docentesPorRfc = {};
  obtenerHojaDocentes().getDataRange().getValues().slice(1).forEach(r => {
    docentesPorRfc[String(r[0]).trim().toUpperCase()] = r;
  });
  const cursosPorId = {};
  obtenerHojaCursos().getDataRange().getValues().slice(1).forEach(r => {
    cursosPorId[String(r[0]).trim().toUpperCase()] = r;
  });

  const porCurso = {}, porSector = {}, porMunicipio = {}, porEstado = {};

  inscripciones.forEach(row => {
    const rfc     = String(row[2]).trim().toUpperCase();
    const idCurso = String(row[3]).trim().toUpperCase();
    const estado  = String(row[4]).trim() || 'Registrado';
    const doc     = docentesPorRfc[rfc];
    const cur     = cursosPorId[idCurso];

    const nombreCurso = cur ? String(cur[2]) : idCurso;
    const sector       = doc ? String(doc[6]) : '';
    const municipio    = doc ? String(doc[8]) : '';

    porCurso[nombreCurso] = (porCurso[nombreCurso] || 0) + 1;
    if (sector)    porSector['Sector ' + sector] = (porSector['Sector ' + sector] || 0) + 1;
    if (municipio) porMunicipio[municipio] = (porMunicipio[municipio] || 0) + 1;
    porEstado[estado] = (porEstado[estado] || 0) + 1;
  });

  let resumen = ss.getSheetByName('Estadisticas_Formacion');
  if (resumen) ss.deleteSheet(resumen);
  resumen = ss.insertSheet('Estadisticas_Formacion');

  const ahora = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  resumen.appendRow(['ESTADÍSTICAS — Centro de Formación Docente OTDE']);
  resumen.appendRow(['Generado:', ahora]);
  resumen.appendRow(['Total de inscripciones:', inscripciones.length]);
  resumen.appendRow([]);

  resumen.appendRow(['POR CURSO', 'Inscripciones']);
  Object.entries(porCurso).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow([]);
  resumen.appendRow(['POR SECTOR', 'Inscripciones']);
  Object.entries(porSector).sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow([]);
  resumen.appendRow(['POR MUNICIPIO', 'Inscripciones']);
  Object.entries(porMunicipio).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow([]);
  resumen.appendRow(['POR ESTADO', 'Inscripciones']);
  Object.entries(porEstado).forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  resumen.getRange(5, 1, 1, 2).setFontWeight('bold').setBackground('#9F2241').setFontColor('#fff');
  resumen.setColumnWidth(1, 320);
  resumen.setColumnWidth(2, 120);

  SpreadsheetApp.getUi().alert('Estadísticas generadas en la hoja "Estadisticas_Formacion".');
}
