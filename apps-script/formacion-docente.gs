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
//      Activo=TRUE, Registro_previo_requerido=TRUE solo si el curso
//      tiene cupo real y limitado en una plataforma externa) — usa el
//      menú "OTDE Formación → Generar ID de cursos faltantes" para que
//      el ID_Curso se autocomplete
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
//     K Activo | L Notas | M Registro_previo_requerido
//
//   Registro_previo_requerido (TRUE/FALSE, tú lo decides por curso): si es
//   TRUE y hay Liga_convocatoria, el formulario OBLIGA a pasar por esa liga
//   externa antes de llenar los datos con OTDE (mismo patrón que
//   jornada-verano-2026.html) — úsalo solo en cursos con cupo real y
//   limitado en la plataforma externa (diplomados, cursos autogestivos).
//   Si es FALSE, la liga solo se muestra como referencia al final, sin
//   forzar el paso — para categorías sin cupo real (la mayoría de webinars).
//
//   Inscripciones — una fila por registro (transaccional)
//     A Folio | B Fecha_registro | C RFC_Docente | D ID_Curso
//     E Estado | F Codigo_asistencia_capturado
//     G Fecha_actualizacion_estado | H Notas
//     I-O: columnas de solo lectura con fórmula VLOOKUP (Nombre_Docente,
//     CCT, Escuela, Sector, Zona, Funcion, Nombre_Curso) — se recalculan
//     solas si cambian los datos del docente o del curso, no se escriben
//     como valores estáticos. Ver agregarInscripcion().
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
        id:                        row[0].toString().trim(),
        categoria:                 row[1],
        nombre:                    row[2],
        responsable:               row[3],
        modalidad:                 row[4],
        fecha_inicio:              formatearFecha(row[5]),
        fecha_fin:                 formatearFecha(row[6]),
        liga_convocatoria:         row[7] || '',
        registro_previo_requerido: String(row[12]).trim().toUpperCase() === 'TRUE'
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
    agregarInscripcion(hojaInscripciones, folio, ahora, rfc, idCurso, 'Registrado', '');

    return textResponse(JSON.stringify({ status: 'ok', folio: folio, duplicado: false }));

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// Si el valor nuevo viene vacío, conserva el que ya había en la hoja — evita
// que un registro incompleto (ej. la migración histórica, que no tiene
// Telefono) borre un dato bueno que el docente ya había dado en otro
// registro. Un valor nuevo no vacío siempre gana (última info conocida).
function valorOMantener(nuevo, actual) {
  const n = (nuevo === undefined || nuevo === null) ? '' : String(nuevo).trim();
  return n ? n : (actual === undefined || actual === null ? '' : String(actual).trim());
}

// ── Upsert: actualiza si el RFC ya existe, inserta si no ──
function upsertDocente(hoja, d, rfc, ahora) {
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === rfc) {
      const fila = i + 1;
      const actual = datos[i]; // [RFC, Nombre, Correo, Telefono, CCT, Escuela, Sector, Zona, Municipio, Funcion, ...]
      hoja.getRange(fila, 2, 1, 9).setValues([[
        valorOMantener(d.nombre, actual[1]),
        valorOMantener((d.correo || '').toLowerCase(), actual[2]),
        valorOMantener(d.telefono, actual[3]),
        valorOMantener((d.cct || '').toUpperCase(), actual[4]),
        valorOMantener(d.escuela, actual[5]),
        valorOMantener(d.sector, actual[6]),
        valorOMantener(d.zona, actual[7]),
        valorOMantener(d.municipio, actual[8]),
        valorOMantener(d.funcion, actual[9])
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
      'Requiere_codigo_asistencia', 'Codigo_asistencia', 'Activo', 'Notas',
      'Registro_previo_requerido'
    ]);
    estilizarEncabezado(hoja, 13);
    hoja.setColumnWidth(3, 280); // Nombre
    hoja.setColumnWidth(8, 220); // Liga_convocatoria
  } else if (!hoja.getRange(1, 13).getValue()) {
    // Hoja creada antes de agregar esta columna: se completa el encabezado
    // sin tocar las columnas A-L existentes.
    hoja.getRange(1, 13).setValue('Registro_previo_requerido')
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
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
      'Codigo_asistencia_capturado', 'Fecha_actualizacion_estado', 'Notas',
      'Nombre_Docente', 'CCT', 'Escuela', 'Sector', 'Zona', 'Funcion', 'Nombre_Curso'
    ]);
    estilizarEncabezado(hoja, 15);
    hoja.setColumnWidth(9, 200);  // Nombre_Docente
    hoja.setColumnWidth(11, 200); // Escuela
    hoja.setColumnWidth(15, 240); // Nombre_Curso
  }
  return hoja;
}

// ── Agrega una fila a Inscripciones + fórmulas de vista (I-O) ──
// Las columnas I-O son VLOOKUP en vivo contra Docentes/Cursos: si el
// docente actualiza sus datos (otra inscripción) o cambia el nombre del
// curso, se reflejan solas — no son una copia congelada al momento del
// registro.
function agregarInscripcion(hoja, folio, fecha, rfc, idCurso, estado, notas) {
  hoja.appendRow([folio, fecha, rfc, idCurso, estado, '', '', notas || '']);
  const fila = hoja.getLastRow();
  hoja.getRange(fila, 9, 1, 7).setFormulas([formulasVistaInscripcion(fila)]);
}

// ── Fórmulas de vista para una fila dada de Inscripciones ──
function formulasVistaInscripcion(fila) {
  return [
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,2,FALSE),"")',  // Nombre_Docente
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,5,FALSE),"")',  // CCT
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,6,FALSE),"")',  // Escuela
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,7,FALSE),"")',  // Sector
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,8,FALSE),"")',  // Zona
    '=IFERROR(VLOOKUP(C' + fila + ',Docentes!A:J,10,FALSE),"")', // Funcion
    '=IFERROR(VLOOKUP(D' + fila + ',Cursos!A:C,3,FALSE),"")'     // Nombre_Curso
  ];
}

// ── Repara/rellena las columnas I-O para filas que no las tengan aún ──
// (filas creadas antes de este cambio, o migradas manualmente). Segura
// de correr varias veces — solo sobrescribe encabezados y fórmulas, no
// los datos de las columnas A-H.
function actualizarVistaInscripciones() {
  const hoja = obtenerHojaInscripciones();

  // Por si la hoja ya existía de antes (creada con solo 8 columnas):
  // aseguramos los encabezados I-O sin tocar los de A-H.
  hoja.getRange(1, 9, 1, 7).setValues([[
    'Nombre_Docente', 'CCT', 'Escuela', 'Sector', 'Zona', 'Funcion', 'Nombre_Curso'
  ]]);
  hoja.getRange(1, 9, 1, 7).setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');

  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) {
    SpreadsheetApp.getUi().alert('Encabezados actualizados. Aún no hay inscripciones para rellenar.');
    return;
  }
  for (let fila = 2; fila <= ultimaFila; fila++) {
    hoja.getRange(fila, 9, 1, 7).setFormulas([formulasVistaInscripcion(fila)]);
  }
  SpreadsheetApp.getUi().alert('Vista actualizada en ' + (ultimaFila - 1) + ' inscripción(es).');
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
    .addItem('Actualizar vista de Inscripciones', 'actualizarVistaInscripciones')
    .addSeparator()
    .addItem('Migrar Jornada Verano 2026', 'migrarJornadaVerano')
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


// ============================================================
// MIGRACIÓN — Jornada de Capacitación Verano 2026
// (ciclo 25-26, cursos CoEEE vía auladigital.dee.edu.mx)
//
// Trae al modelo relacional nuevo (Docentes/Cursos/Inscripciones)
// los registros que ya existen en el Spreadsheet viejo de la
// Jornada de Verano (apps-script/cursos-coeee-2026.gs), para que
// jornada-verano-2026.html pueda apuntar aquí en vez de a su
// Apps Script propio. Es un import histórico + alta de catálogo,
// se corre UNA vez desde el menú "OTDE Formación → Migrar Jornada
// Verano 2026" (usa tu acceso, no el de un tercero).
// ============================================================

const ID_SPREADSHEET_VERANO_2026 = '1k492VGkXhXAUFmIyYXCQzH0nilgZDzRMmo0NCEwDnK4';
const HOJA_VERANO_2026 = 'Cursos_OTDE_Verano_2026';

// Catálogo fijo de los 5 cursos de la Jornada de Verano 2026
// (hardcodeados hoy en jornada-verano-2026.html). El nombre debe
// coincidir EXACTO con el data-curso de cada tarjeta del wizard.
//
// ⚠️ MIENTRAS jornada-verano-2026.html SIGA EN LÍNEA, en la hoja Cursos:
//   1. NO edites el texto de Nombre de estos 5 cursos (ni un acento) —
//      el wizard busca el ID_Curso por coincidencia EXACTA de nombre;
//      si no coincide, el registro falla con "no se encontró en el
//      catálogo" sin que el HTML dé ninguna pista de por qué.
//   2. NO pongas Activo=FALSE en estos 5 — aunque el backend (doPost)
//      no lo exige, el wizard sí depende de que doGet los liste para
//      resolver su ID_Curso antes de enviar. Espera a retirar la página
//      del sitio (o su banner en otde.html) antes de desactivarlos.
const CURSOS_VERANO_2026 = [
  { nombre: 'Excel esencial para la gestión administrativa', fecha_inicio: '2026-08-10', fecha_fin: '2026-08-14' },
  { nombre: 'Introducción a la inteligencia artificial en educación', fecha_inicio: '2026-08-10', fecha_fin: '2026-08-14' },
  { nombre: 'NotebookLM: tu Co-piloto digital en apoyo a la labor educativa', fecha_inicio: '2026-08-10', fecha_fin: '2026-08-14' },
  { nombre: 'Aventuras en bloques: crea, juega y enseña con Scratch JR.', fecha_inicio: '2026-08-17', fecha_fin: '2026-08-20' },
  { nombre: 'Canva: potencializando el aprendizaje con creatividad', fecha_inicio: '2026-08-17', fecha_fin: '2026-08-21' }
];

// CCT → Municipio, generado desde js/cct-db.js (506 registros, jul 2026)
const CCT_MUNICIPIO_MAP = JSON.parse(`{"15DPR0432N":"Ayapango","15DPR0433M":"Amecameca","15DPR0434L":"Amecameca","15DPR0439G":"Ayapango","15DPR0441V":"Amecameca","15DPR2933V":"Amecameca","15DPR3028Z":"Ayapango","15DPR0866Z":"Tlalmanalco","15DPR0867Z":"Tlalmanalco","15DPR0868Y":"Tlalmanalco","15DPR0873J":"Tlalmanalco","15DPR2237Y":"Tlalmanalco","15DPR0865A":"Tenango del Aire","15DPR0869X":"Tenango del Aire","15DPR0871L":"Tenango del Aire","15DPR0872K":"Tenango del Aire","15DPR0877F":"Temamatla","15DPR2766O":"Temamatla","15DPR2978R":"Temamatla","15DPR3005O":"Tenango del Aire","15DPR0429Z":"Atlautla","15DPR0430P":"Atlautla","15DPR0435K":"Ozumba","15DPR0440W":"Ozumba","15DPR1300C":"Atlautla","15DPR3077H":"Ozumba","15DPR0876G":"Tlalmanalco","15DPR0878E":"Tlalmanalco","15DPR1525J":"Tlalmanalco","15DPR2946Z":"Tlalmanalco","15DPR0436J":"Amecameca","15DPR0438H":"Amecameca","15DPR1256F":"Atlautla","15DPR1760N":"Amecameca","15DPR2444F":"Ayapango","15DPR0431O":"Tepetlixpa","15DPR0437I":"Tepetlixpa","15DPR0442U":"Atlautla","15DPR0864B":"Juchitepec","15DPR0870M":"Juchitepec","15DPR1243B":"Juchitepec","15DPR1436Q":"Tepetlixpa","15DPR2236Z":"Juchitepec","15DPR2979Q":"Tepetlixpa","15DPR0456X":"Ixtapaluca","15DPR0462H":"Ixtapaluca","15DPR0465E":"Ixtapaluca","15DPR1666I":"Ixtapaluca","15DPR2613K":"Ixtapaluca","15DPR2704B":"Ixtapaluca","15DPR2937R":"Ixtapaluca","15DPR0457W":"Ixtapaluca","15DPR0458V":"Ixtapaluca","15DPR1670V":"Ixtapaluca","15DPR2612L":"Ixtapaluca","15DPR2860T":"Ixtapaluca","15DPR1623K":"Valle de Chalco Solidaridad","15DPR1972Q":"Valle de Chalco Solidaridad","15DPR2222W":"Valle de Chalco Solidaridad","15DPR2345F":"Valle de Chalco Solidaridad","15DPR2615I":"Valle de Chalco Solidaridad","15DPR2762S":"Valle de Chalco Solidaridad","15DPR1624J":"Valle de Chalco Solidaridad","15DPR1632S":"Valle de Chalco Solidaridad","15DPR2340K":"Valle de Chalco Solidaridad","15DPR2394O":"Valle de Chalco Solidaridad","15DPR2610N":"Valle de Chalco Solidaridad","15DPR2614J":"Valle de Chalco Solidaridad","15DPR3027Z":"Chalco","15DPR0461I":"Ixtapaluca","15DPR1676P":"Ixtapaluca","15DPR1957Y":"Valle de Chalco Solidaridad","15DPR2611M":"Valle de Chalco Solidaridad","15DPR2749Y":"Valle de Chalco Solidaridad","15DPR0893X":"Texcoco","15DPR0895V":"Texcoco","15DPR0898S":"Texcoco","15DPR1672T":"Texcoco","15DPR1807R":"Texcoco","15DPR2370E":"Texcoco","15DPR0896U":"Texcoco","15DPR0897T":"Texcoco","15DPR0899R":"Texcoco","15DPR0900Q":"Texcoco","15DPR0903N":"Texcoco","15DPR1776O":"Texcoco","15DPR3134I":"Texcoco","15DPR0534K":"Texcoco","15DPR0535J":"Texcoco","15DPR0536I":"Texcoco","15DPR0538G":"Texcoco","15DPR0541U":"Texcoco","15DPR0543S":"Texcoco","15DPR0545Q":"Texcoco","15DPR1413F":"Texcoco","15DPR1857Z":"Texcoco","15DPR2770A":"Texcoco","15DPR0528Z":"Texcoco","15DPR0537H":"Texcoco","15DPR0539F":"Texcoco","15DPR0540V":"Texcoco","15DPR0542T":"Texcoco","15DPR0544R":"Texcoco","15DPR2238X":"Texcoco","15DPR2245G":"Texcoco","15DPR2819C":"Texcoco","15DPR0530O":"Texcoco","15DPR0532M":"Texcoco","15DPR0533L":"Texcoco","15DPR0901P":"Texcoco","15DPR1076V":"Texcoco","15DPR1855A":"Texcoco","15DPR1923H":"Texcoco","15DPR0527A":"Texcoco","15DPR0529Z":"Texcoco","15DPR0531N":"Texcoco","15DPR0546P":"Texcoco","15DPR0550B":"Texcoco","15DPR0551A":"Texcoco","15DPR0560I":"Texcoco","15DPR0561H":"Texcoco","15DPR0793Y":"La Paz","15DPR0794X":"La Paz","15DPR1022R":"La Paz","15DPR1301B":"La Paz","15DPR1532T":"La Paz","15DPR2188F":"La Paz","15DPR2673Z":"La Paz","15DPR0336K":"La Paz","15DPR0795W":"La Paz","15DPR0797U":"La Paz","15DPR1785W":"La Paz","15DPR1885V":"La Paz","15DPR1898Z":"La Paz","15DPR0894W":"Chicoloapan","15DPR1254H":"Chicoloapan","15DPR1673S":"Chicoloapan","15DPR2247E":"Chicoloapan","15DPR3119Q":"Chicoloapan","15DPR0023J":"Chimalhuacán","15DPR0819P":"Chimalhuacán","15DPR1420P":"Chimalhuacán","15DPR1445Y":"Chimalhuacán","15DPR1781Z":"Chimalhuacán","15DPR1966F":"Chimalhuacán","15DPR2810L":"Chimalhuacán","15DPR2905Z":"Chimalhuacán","15DPR0821D":"La Paz","15DPR1583Z":"La Paz","15DPR3000T":"La Paz","15DPR3234H":"La Paz","15DPR0902O":"Chicoloapan","15DPR1667H":"Chicoloapan","15DPR1829C":"Chicoloapan","15DPR1899Y":"Chicoloapan","15DPR2601F":"Chicoloapan","15DPR0471P":"Nezahualcóyotl","15DPR0473N":"Nezahualcóyotl","15DPR0477J":"Nezahualcóyotl","15DPR1612E":"Nezahualcóyotl","15DPR2419G":"Nezahualcóyotl","15DPR0469A":"Nezahualcóyotl","15DPR0474M":"Nezahualcóyotl","15DPR1258D":"Nezahualcóyotl","15DPR1482B":"Nezahualcóyotl","15DPR1487X":"Nezahualcóyotl","15DPR1613D":"Nezahualcóyotl","15DPR0468B":"Nezahualcóyotl","15DPR0476K":"Nezahualcóyotl","15DPR1636O":"Nezahualcóyotl","15DPR2429N":"Nezahualcóyotl","15DPR0467C":"Nezahualcóyotl","15DPR0472O":"Nezahualcóyotl","15DPR1565K":"Nezahualcóyotl","15DPR2519F":"Nezahualcóyotl","15DPR0292D":"Nezahualcóyotl","15DPR0481W":"Nezahualcóyotl","15DPR0483U":"Nezahualcóyotl","15DPR1260S":"Nezahualcóyotl","15DPR0479H":"Nezahualcóyotl","15DPR0482V":"Nezahualcóyotl","15DPR1375T":"Nezahualcóyotl","15DPR2578V":"Nezahualcóyotl","15DPR0485S":"Nezahualcóyotl","15DPR0486R":"Nezahualcóyotl","15DPR2746A":"Nezahualcóyotl","15DPR0484T":"Nezahualcóyotl","15DPR0487Q":"Nezahualcóyotl","15DPR0488P":"Nezahualcóyotl","15DPR1262Q":"Nezahualcóyotl","15DPR1439N":"Nezahualcóyotl","15DPR0522F":"Nezahualcóyotl","15DPR0526B":"Nezahualcóyotl","15DPR1263P":"Nezahualcóyotl","15DPR1264O":"Nezahualcóyotl","15DPR1368J":"Nezahualcóyotl","15DPR1369I":"Nezahualcóyotl","15DPR0504Q":"Nezahualcóyotl","15DPR0507N":"Nezahualcóyotl","15DPR0860F":"Nezahualcóyotl","15DPR0861E":"Nezahualcóyotl","15DPR1253I":"Nezahualcóyotl","15DPR1533S":"Nezahualcóyotl","15DPR0506O":"Nezahualcóyotl","15DPR0859Q":"Nezahualcóyotl","15DPR1531U":"Nezahualcóyotl","15DPR0492B":"Nezahualcóyotl","15DPR0493A":"Nezahualcóyotl","15DPR0495Z":"Nezahualcóyotl","15DPR0497X":"Nezahualcóyotl","15DPR0498W":"Nezahualcóyotl","15DPR0494Z":"Nezahualcóyotl","15DPR0496Y":"Nezahualcóyotl","15DPR0500U":"Nezahualcóyotl","15DPR0503R":"Nezahualcóyotl","15DPR0505P":"Nezahualcóyotl","15DPR0512Z":"Nezahualcóyotl","15DPR0513Y":"Nezahualcóyotl","15DPR0514X":"Nezahualcóyotl","15DPR1650H":"Nezahualcóyotl","15DPR1734P":"Nezahualcóyotl","15DPR0854V":"Nezahualcóyotl","15DPR1117E":"Nezahualcóyotl","15DPR1416C":"Nezahualcóyotl","15DPR1524K":"Nezahualcóyotl","15DPR2298L":"Nezahualcóyotl","15DPR0519S":"Nezahualcóyotl","15DPR0523E":"Nezahualcóyotl","15DPR1827E":"Nezahualcóyotl","15DPR2466R":"Nezahualcóyotl","15DPR0509L":"Nezahualcóyotl","15DPR0510A":"Nezahualcóyotl","15DPR0511Z":"Nezahualcóyotl","15DPR0518T":"Nezahualcóyotl","15DPR0520H":"Nezahualcóyotl","15DPR0524D":"Nezahualcóyotl","15DPR0852X":"Nezahualcóyotl","15DPR0853W":"Nezahualcóyotl","15DPR0857S":"Nezahualcóyotl","15DPR1419Z":"Nezahualcóyotl","15DPR0182Y":"Valle de Chalco Solidaridad","15DPR0222I":"Valle de Chalco Solidaridad","15DPR0444S":"Valle de Chalco Solidaridad","15DPR1435R":"Valle de Chalco Solidaridad","15DPR0445R":"Chalco","15DPR1647U":"Chalco","15DPR1864I":"Chalco","15DPR2598I":"Chalco","15DPR0180Z":"Chalco","15DPR0447P":"Chalco","15DPR0451B":"Chalco","15DPR0455Y":"Chalco","15DPR0874I":"Temamatla","15DPR2240L":"Chalco","15DPR2405D":"Chalco","15DPR0454Z":"Chalco","15DPR0875H":"Chalco","15DPR1242C":"Chalco","15DPR1866G":"Chalco","15DPR3298S":"Chalco","15DPR0449N":"Chalco","15DPR1838K":"Valle de Chalco Solidaridad","15DPR1856Z":"Valle de Chalco Solidaridad","15DPR3256T":"Chalco","15DPR0231Q":"Chalco","15DPR0446Q":"Chalco","15DPR0452A":"Valle de Chalco Solidaridad","15DPR0453Z":"Chalco","15DPR2855H":"Chalco","15DPR2893K":"Valle de Chalco Solidaridad","15DPR2915F":"Chalco","15DPR2943B":"Chalco","15DPR3162E":"Chalco","15DPR3270M":"Chalco","15DPR3289K":"Chalco","15DPR3290Z":"Chalco","15DPR3299R":"Chalco","15DPR3308I":"Chalco","15DPR3317Q":"Chalco","15DPR3318P":"Chalco","15DPR3320D":"Chalco","15DPR0311B":"Nezahualcóyotl","15DPR0842Q":"Nezahualcóyotl","15DPR1070A":"Nezahualcóyotl","15DPR0489O":"Nezahualcóyotl","15DPR1261R":"Nezahualcóyotl","15DPR2748Z":"Nezahualcóyotl","15DPR0846M":"Nezahualcóyotl","15DPR0848K":"Nezahualcóyotl","15DPR1305Y":"Nezahualcóyotl","15DPR0844O":"Nezahualcóyotl","15DPR0847L":"Nezahualcóyotl","15DPR0851Y":"Nezahualcóyotl","15DPR1639L":"Nezahualcóyotl","15DPR0508M":"Nezahualcóyotl","15DPR0845N":"Nezahualcóyotl","15DPR0849J":"Nezahualcóyotl","15DPR1479O":"Nezahualcóyotl","15DPR1534R":"Nezahualcóyotl","15DPR1627G":"Nezahualcóyotl","15DPR1665J":"Nezahualcóyotl","15DPR2542G":"Nezahualcóyotl","15DPR2917D":"Nezahualcóyotl","15DPR0521G":"Nezahualcóyotl","15DPR0525C":"Nezahualcóyotl","15DPR1265N":"Nezahualcóyotl","15DPR1542Z":"Nezahualcóyotl","15DPR0757T":"Nezahualcóyotl","15DPR0760G":"Nezahualcóyotl","15DPR0773K":"Nezahualcóyotl","15DPR1834O":"Nezahualcóyotl","15DPR2299K":"Nezahualcóyotl","15DPR0369B":"Nezahualcóyotl","15DPR1250L":"Nezahualcóyotl","15DPR1463N":"Nezahualcóyotl","15DPR1744W":"Nezahualcóyotl","15DPR0758S":"Nezahualcóyotl","15DPR0761F":"Nezahualcóyotl","15DPR1307W":"Nezahualcóyotl","15DPR1433T":"Nezahualcóyotl","15DPR1740Z":"Nezahualcóyotl","15DPR2451P":"Nezahualcóyotl","15DPR0798T":"Chimalhuacán","15DPR1969C":"Chimalhuacán","15DPR2703C":"Chimalhuacán","15DPR2866N":"Chimalhuacán","15DPR2977S":"Chimalhuacán","15DPR3160G":"Chicoloapan","15DPR3235G":"Chicoloapan","15DPR0170T":"Chimalhuacán","15DPR1867F":"Chimalhuacán","15DPR2865O":"Chimalhuacán","15DPR2878S":"Chimalhuacán","15DPR0822C":"Chimalhuacán","15DPR0823B":"Chimalhuacán","15DPR1535Q":"Chimalhuacán","15DPR2447C":"Chimalhuacán","15DPR3023D":"Chimalhuacán","15DPR0820E":"Chimalhuacán","15DPR1347X":"Chimalhuacán","15DPR1442A":"Chimalhuacán","15DPR1959W":"Chimalhuacán","15DPR1964H":"Chimalhuacán","15DPR2225T":"Chimalhuacán","15DPR1443Z":"Chimalhuacán","15DPR1444Z":"Chimalhuacán","15DPR2420W":"Chimalhuacán","15DPR2932W":"Chimalhuacán","15DPR0022K":"Chimalhuacán","15DPR0818Q":"Chimalhuacán","15DPR2272D":"Chimalhuacán","15DPR2343H":"Chimalhuacán","15DPR2360Y":"Chimalhuacán","15DPR0470Q":"Nezahualcóyotl","15DPR0475L":"Nezahualcóyotl","15DPR1081G":"Nezahualcóyotl","15DPR1560P":"Nezahualcóyotl","15DPR1610G":"Nezahualcóyotl","15DPR1611F":"Nezahualcóyotl","15DPR1696C":"Nezahualcóyotl","15DPR0028E":"Nezahualcóyotl","15DPR0315Y":"Nezahualcóyotl","15DPR0316X":"Nezahualcóyotl","15DPR1259C":"Nezahualcóyotl","15DPR1371X":"Nezahualcóyotl","15DPR1372W":"Nezahualcóyotl","15DPR0480X":"Nezahualcóyotl","15DPR1446X":"Nezahualcóyotl","15DPR1449U":"Nezahualcóyotl","15DPR0843P":"Nezahualcóyotl","15DPR1733Q":"Nezahualcóyotl","15DPR1944U":"Nezahualcóyotl","15DPR2581I":"Nezahualcóyotl","15DPR0077N":"Chalco","15DPR0080A":"Chalco","15DPR0443T":"Chalco","15DPR0448O":"Chalco","15DPR1725H":"Chalco","15DPR3286N":"Chalco","15DPR3287M":"Chalco","15DPR0464F":"Ixtapaluca","15DPR2864P":"Ixtapaluca","15DPR3030N":"Ixtapaluca","15DPR3044Q":"Ixtapaluca","15DPR3045P":"Ixtapaluca","15DPR3063E":"Ixtapaluca","15DPR3076I":"Ixtapaluca","15DPR3166A":"Ixtapaluca","15DPR0450C":"Chalco","15DPR2235Z":"Chalco","15DPR3189L":"Chalco","15DPR3190A":"Ixtapaluca","15DPR3253W":"Chalco","15DPR3274I":"Chalco","15DPR3321C":"Chalco","15DPR0063K":"Ixtapaluca","15DPR0463G":"Ixtapaluca","15DPR0466D":"Ixtapaluca","15DPR1471W":"Ixtapaluca","15DPR2935T":"Ixtapaluca","15DPR3276G":"Chalco","15DPR3288L":"Chalco","15DPR0006T":"Ixtapaluca","15DPR0459U":"Ixtapaluca","15DPR0460J":"Ixtapaluca","15DPR1584Z":"Ixtapaluca","15DPR1675Q":"Ixtapaluca","15DPR2709X":"Ixtapaluca","15DPR3157T":"Ixtapaluca","15DPR3213V":"Ixtapaluca","15DPR3080V":"Ixtapaluca","15DPR3081U":"Ixtapaluca","15DPR3082T":"Ixtapaluca","15DPR3083S":"Ixtapaluca","15DPR3091A":"Ixtapaluca","15DPR3092Z":"Ixtapaluca","15DPR3114V":"Ixtapaluca","15FIZ0042V":"Amecameca","15FIZ0043U":"Tlalmanalco","15FIZ0044T":"Tenango del Aire","15FIZ0045S":"Valle de Chalco Solidaridad","15FIZ0046R":"Chalco","15FIZ0047Q":"Ixtapaluca","15FIZ0048P":"Ixtapaluca","15FIZ0049O":"La Paz","15FIZ0050D":"La Paz","15FIZ0051C":"Chicoloapan","15FIZ0052B":"Chimalhuacán","15FIZ0053A":"Texcoco","15FIZ0054Z":"Texcoco","15FIZ0055Z":"Texcoco","15FIZ0056Y":"Texcoco","15FIZ0057X":"Nezahualcóyotl","15FIZ0058W":"Nezahualcóyotl","15FIZ0059V":"Nezahualcóyotl","15FIZ0060K":"Nezahualcóyotl","15FIZ0061J":"Nezahualcóyotl","15FIZ0062I":"Nezahualcóyotl","15FIZ0063H":"Nezahualcóyotl","15FIZ0064G":"Nezahualcóyotl","15FIZ0065F":"Nezahualcóyotl","15FIZ0066E":"Nezahualcóyotl","15FIZ0067D":"Nezahualcóyotl","15FIZ0068C":"Nezahualcóyotl","15FIZ0069B":"Nezahualcóyotl","15FIZ0070R":"Chalco","15FIZ0071Q":"Nezahualcóyotl","15FIZ0072P":"Nezahualcóyotl","15FIZ0073O":"Nezahualcóyotl","15FIZ0074N":"Nezahualcóyotl","15FIZ0075M":"Nezahualcóyotl","15FIZ0076L":"Nezahualcóyotl","15FIZ0077K":"Nezahualcóyotl","15FIZ0078J":"Nezahualcóyotl","15FIZ0079I":"Nezahualcóyotl","15FIZ0080Y":"Nezahualcóyotl","15FIZ0081X":"Nezahualcóyotl","15FIZ0082W":"Nezahualcóyotl","15FIZ0083V":"Chalco","15FIZ0258U":"Ozumba","15FIZ0219S":"Tlalmanalco","15FIZ0220H":"Chalco","15FIZ0221G":"Chalco","15FIZ0222F":"Ixtapaluca","15FIZ0249M":"Valle de Chalco Solidaridad","15FIZ0250B":"Valle de Chalco Solidaridad","15FIZ0223E":"Ixtapaluca","15FIZ0224D":"Chimalhuacán","15FIZ0225C":"Chimalhuacán","15FIZ0226B":"Chimalhuacán","15FIZ0251A":"Texcoco","15FIZ0252Z":"Texcoco","15FIZ0253Z":"Atlautla","15FIZ0227A":"Nezahualcóyotl","15FIZ0254Y":"Nezahualcóyotl","15FIZ0228Z":"Nezahualcóyotl","15FIZ0229Z":"La Paz","15FIZ0255X":"Nezahualcóyotl","15FIZ0256W":"Chalco","15FIZ0257V":"Nezahualcóyotl","15FIZ0351Z":"Nezahualcóyotl","15FIZ0367A":"Ixtapaluca","15FIZ0368Z":"Chicoloapan","15FIZ0369Z":"Chimalhuacán","15FIZ0370O":"Nezahualcóyotl","15FIZ0371N":"Chalco","15FIZ0372M":"Tepetlixpa","15FIZ0373L":"Chimalhuacán","15FIZ0374K":"Chimalhuacán","15FIZ0412X":"Chalco","15FIZ0413W":"Ixtapaluca","15FIZ0414V":"Ixtapaluca","15FJS0015D":"Amecameca","15FJS0017B":"Ixtapaluca","15FJS0016C":"Texcoco","15FJS0014E":"La Paz","15FJS0018A":"Nezahualcóyotl","15FJS0019Z":"Nezahualcóyotl","15FJS0020P":"Nezahualcóyotl","15FJS0047W":"Chalco","15FJS0037P":"Nezahualcóyotl","15FJS0038O":"Nezahualcóyotl","15FJS0039N":"Chimalhuacán","15FJS0050J":"Nezahualcóyotl","15FJS0051I":"Ixtapaluca","15ADG0086N":"Nezahualcóyotl"}`);

// ── Convierte 'YYYY-MM-DD' a una Date en hora LOCAL (no UTC) ──
// new Date('YYYY-MM-DD') se interpreta como medianoche UTC; al formatear
// después con Utilities.formatDate(..., 'America/Mexico_City', ...) el
// huso (UTC-6) recorre la fecha un día hacia atrás. Construir la Date con
// año/mes/día explícitos evita el corrimiento.
function fechaLocal(isoYYYYMMDD) {
  const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Asegura que los 5 cursos de Verano existan en la hoja Cursos ──
// Devuelve un mapa { nombreCurso: ID_Curso } para usar en la migración
// y en el payload nuevo de jornada-verano-2026.html.
function asegurarCursosVerano() {
  const hoja  = obtenerHojaCursos();
  const datos = hoja.getDataRange().getValues();
  const mapa  = {};

  CURSOS_VERANO_2026.forEach(curso => {
    const filaExistente = datos.slice(1).find(row => String(row[2]).trim() === curso.nombre);
    if (filaExistente) {
      mapa[curso.nombre] = String(filaExistente[0]).trim();
      // datos[0] es el encabezado (fila 1), así que fila de hoja = índice + 1.
      const filaSheet = datos.indexOf(filaExistente) + 1;

      // Backfill: si esta fila se creó antes de agregar Registro_previo_requerido,
      // la marcamos TRUE (CoEEE sí gestiona cupo real en auladigital.dee.edu.mx).
      if (String(filaExistente[12] || '').trim().toUpperCase() !== 'TRUE') {
        hoja.getRange(filaSheet, 13).setValue('TRUE');
      }
      // Backfill: corrige el corrimiento de -1 día si la fila se creó con el
      // bug de new Date('YYYY-MM-DD') (ver fechaLocal arriba). Reescribir es
      // seguro — estas fechas son catálogo fijo, no dato capturado por nadie.
      hoja.getRange(filaSheet, 6, 1, 2).setValues([[
        fechaLocal(curso.fecha_inicio), fechaLocal(curso.fecha_fin)
      ]]);
      return;
    }

    const prefijo = PREFIJOS_CATEGORIA['Curso autogestivo'];
    const maxNum = datos.slice(1)
      .map(row => String(row[0]))
      .filter(id => id.startsWith(prefijo + '-' + CICLO_ESCOLAR + '-'))
      .map(id => parseInt(id.split('-').pop(), 10) || 0)
      .reduce((a, b) => Math.max(a, b), 0);
    const idCurso = prefijo + '-' + CICLO_ESCOLAR + '-' + String(maxNum + 1).padStart(3, '0');

    hoja.appendRow([
      idCurso, 'Curso autogestivo', curso.nombre, 'CoEEE', 'En línea',
      fechaLocal(curso.fecha_inicio), fechaLocal(curso.fecha_fin),
      'https://auladigital.dee.edu.mx', 'FALSE', '', 'TRUE',
      'Jornada de Capacitación Verano 2026', 'TRUE'
    ]);

    datos.push([idCurso, 'Curso autogestivo', curso.nombre]); // para que maxNum considere el nuevo ID si hay más de uno por generar
    mapa[curso.nombre] = idCurso;
  });

  return mapa;
}

// ── Migración histórica: Cursos_OTDE_Verano_2026 → Docentes/Inscripciones ──
function migrarJornadaVerano() {
  const ui = SpreadsheetApp.getUi();
  const mapaCursos = asegurarCursosVerano();

  const ssVerano = SpreadsheetApp.openById(ID_SPREADSHEET_VERANO_2026);
  const hojaVerano = ssVerano.getSheetByName(HOJA_VERANO_2026);
  if (!hojaVerano) {
    ui.alert('No se encontró la hoja "' + HOJA_VERANO_2026 + '" en el spreadsheet viejo.');
    return;
  }

  const filas = hojaVerano.getDataRange().getValues().slice(1);
  if (!filas.length) {
    ui.alert('La hoja de Jornada Verano no tiene registros todavía.');
    return;
  }

  const hojaDocentes = obtenerHojaDocentes();
  const hojaInscripciones = obtenerHojaInscripciones();
  const inscripcionesExistentes = hojaInscripciones.getDataRange().getValues().slice(1);

  let migrados = 0, saltados = 0, sinCurso = 0;

  filas.forEach(fila => {
    // A Fecha | B Folio | C Nombre | D RFC | E Función | F CCT | G Sector | H Zona | I Escuela/Unidad | J Curso | K Correo
    const [fecha, folio, nombre, rfcRaw, funcion, cctRaw, sector, zona, escuela, cursoNombre, correo] = fila;
    const rfc = String(rfcRaw).trim().toUpperCase();
    const cct = String(cctRaw).trim().toUpperCase();
    const idCurso = mapaCursos[String(cursoNombre).trim()];

    if (!rfc || !idCurso) { sinCurso++; return; }

    const yaExiste = inscripcionesExistentes.some(r => String(r[0]).trim() === String(folio).trim());
    if (yaExiste) { saltados++; return; }

    upsertDocente(hojaDocentes, {
      nombre: nombre, correo: correo || '', telefono: '', cct: cct, escuela: escuela,
      sector: sector, zona: zona, municipio: CCT_MUNICIPIO_MAP[cct] || '', funcion: funcion
    }, rfc, fecha || new Date());

    agregarInscripcion(hojaInscripciones, folio, fecha, rfc, idCurso, 'Registrado', 'Migrado de Jornada Verano 2026');
    inscripcionesExistentes.push([folio]);
    migrados++;
  });

  ui.alert('Migración completa: ' + migrados + ' registro(s) migrado(s), ' +
           saltados + ' ya existían, ' + sinCurso + ' sin RFC/curso válido.');
}
