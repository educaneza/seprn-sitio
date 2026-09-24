// ============================================================
// SEPRN · OTDE — Bitácora única de actividades + reporte mensual
// Fase 1 de docs/PLAN-OPERACION-INTERNA.md. Cada actividad de OTDE se
// captura UNA vez (bitacora.html, desde el celular o la oficina) y el
// reporte mensual de Planeación sale de esa captura en vez de armarse
// de memoria a fin de mes.
//
// FORMATO DEL REPORTE (verificado contra el Excel real, 24 sep 2026):
// el reporte es un Excel en SharePoint compartido con la Oficina de
// Planeación, un archivo nuevo por mes, con UNA PESTAÑA POR META. OTDE
// solo reporta en META 23 (mantenimiento) y META 25 (todo lo demás).
// Cada pestaña tiene filas de actividad de la 14 a la 30 (17 máx.) con
// 7 campos en columnas combinadas: A:B Tipo y nombre · C Fecha · D
// Responsable · E Lugar · F:I Descripción · J:K Propósito · L
// Beneficiarios. No existe rubro de "no planeadas": toda actividad cae
// en la 23 o la 25. Apps Script no puede escribir en SharePoint, así
// que el menú "Generar reporte del mes" arma una pestaña "Reporte
// AAAA-MM" con las MISMAS columnas y combinaciones, lista para copiar
// y pegar en la fila 14 de cada pestaña del Excel.
//
// IMPLEMENTACIÓN:
//   1. Crea un Google Sheet nuevo y vacío ("Bitácora OTDE 2026-2027").
//   2. Extensiones → Apps Script → pega este código completo.
//   3. Recarga el Sheet → menú "OTDE Bitácora":
//        · "Preparar hojas y cargar planeación 2026-2027" (una vez):
//          crea Planeacion (con las 9 acciones del Word), Actividades
//          y Config (catálogo de responsables, editable).
//        · "Configurar clave de captura": pide la clave que Jorge y
//          Nancy escribirán una vez en bitacora.html. Se pide con un
//          cuadro de diálogo, no como argumento de función, para no
//          caer en docs/QA-NOTES.md #14/#25.
//   4. Implementar → Nueva implementación → Aplicación web
//      · Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL y pégala en bitacora.html (BITACORA_APPS_SCRIPT_URL).
//
// SEGURIDAD: la URL de despliegue queda visible en el código de
// bitacora.html (sitio público), así que TODO endpoint exige la clave
// de captura (Script Property CLAVE_CAPTURA). Sin ella no se lee la
// planeación ni se escribe nada.
//
// COLUMNAS DE "Actividades" (ENCABEZADOS_ACTIVIDADES, se leen y
// escriben por nombre de encabezado, no por posición):
//   Registrado | ID | Mes | Meta | N.P. | Origen | Tipo y nombre |
//   Fecha inicio | Fecha fin | Fecha (texto) | Responsable | Modalidad |
//   Lugar | CCT | Descripción | Propósito | Beneficiarios | Capturó |
//   ID de envío
// "Fecha (texto)" es lo que va al reporte ("Los días 13 y 14 de enero
// de 2026"): se genera sola al capturar, pero se puede corregir a mano
// en la hoja y el reporte usa lo corregido. Lo mismo con cualquier otro
// texto: la hoja manda, el reporte solo la copia.
// ============================================================

const HOJA_BIT_PLANEACION = 'Planeacion';
const HOJA_BIT_ACTIVIDADES = 'Actividades';
const HOJA_BIT_CONFIG = 'Config';
const BIT_PREFIJO_REPORTE = 'Reporte ';

// Filas de actividad disponibles por pestaña en el Excel de Planeación (14 a 30).
const BIT_MAX_FILAS_POR_META = 17;

const ENCABEZADOS_PLANEACION = [
  'N.P.', 'Acción', 'Mes', 'Recursos', 'Resultados esperados',
  'Instrumento de evaluación', 'Beneficiarios', 'Responsables', 'Meta', 'Eje PDI'
];

const ENCABEZADOS_ACTIVIDADES = [
  'Registrado', 'ID', 'Mes', 'Meta', 'N.P.', 'Origen', 'Tipo y nombre',
  'Fecha inicio', 'Fecha fin', 'Fecha (texto)', 'Responsable', 'Modalidad',
  'Lugar', 'CCT', 'Descripción', 'Propósito', 'Beneficiarios', 'Capturó',
  'ID de envío'
];

const BIT_METAS = {
  '23': {
    proyecto: '020501010102 Educación primaria',
    meta: '23. Atender a niñas y niños de 6 a 11 años con Educación Primaria universal y de excelencia dentro del Sistema Educativo Mexiquense, con el fin de contribuir en su formación integral.',
    indicador: 'Porcentaje de alumnos atendidos en escuelas de Educación Primaria general.'
  },
  '25': {
    proyecto: '020501010102 Educación primaria',
    meta: '25. Mejorar el logro de los aprendizajes de todas las alumnas y alumnos, para favorecer el desarrollo integral y de excelencia que permita alcanzar el perfil de egreso de la Educación Básica.',
    indicador: 'Tasa de variación del aprovechamiento escolar en Educación Primaria general.'
  }
};

const BIT_MODALIDADES = ['Presencial', 'Virtual', 'Híbrida'];
const BIT_CAPTURISTAS = ['Jorge', 'Nancy'];
const BIT_RESPONSABLES_INICIALES = ['OTDE', 'UNETE', 'CoEEE', 'CUANTRIX', 'Chicos.net', 'Suarsor'];

const BIT_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Las 9 acciones de PLANEACION-INSTITUCIONAL-OTDE-2627.docx (Comunicado 001,
// 1 sep 2026), copiadas tal cual. Solo se usan para sembrar la hoja
// Planeacion la primera vez; de ahí en adelante la hoja manda.
const BIT_PLANEACION_2627 = [
  ['1', 'Realizar visitas de seguimiento y acompañamiento a las escuelas beneficiadas por el Programa MIED, con la finalidad de valorar su implementación y desarrollo.', 'Ciclo Escolar 2026-2027', 'Cuestionarios de evaluación y seguimiento; participación de personal de ProFuturo, ATENEO, Suarsor, OTDE, docentes, alumnado y figuras directivas.', 'Analizar el impacto del Programa MIED mediante la aplicación de instrumentos de evaluación y la comparación de resultados entre escuelas de control y tratamiento.', 'Cuestionarios de evaluación aplicados al alumnado de 3.º grado y a figuras directivas de las escuelas beneficiadas.', 'Alumnado y figuras directivas de las escuelas beneficiadas.', 'Personal de Suarsor y OTDE.', '25', 'Inclusión'],
  ['2', 'Dar seguimiento al proceso de formación y certificación en herramientas digitales de Google, fortaleciendo el desarrollo de competencias digitales de los participantes.', 'Octubre y noviembre de 2026', 'Computadora, conexión a internet, guías y materiales de formación, acompañamiento del personal de UNETE y OTDE.', 'Concluir el proceso de formación y acreditar la certificación correspondiente en los programas de Google o Canva.', 'Examen en línea y registro de acreditación/certificación.', 'Docentes y personal de OTDE.', 'UNETE', '25', 'Pensamiento crítico'],
  ['3', 'Fortalecer la formación y el acompañamiento de figuras directivas mediante el programa Liderazgo UNETE, favoreciendo el desarrollo de competencias para la gestión y liderazgo escolar.', 'Septiembre y diciembre del 2026', 'Computadora, conexión a internet, materiales pedagógicos, recursos digitales y acompañamiento de personal de UNETE.', 'Desarrollar y fortalecer competencias de liderazgo directivo para favorecer la gestión escolar y el acompañamiento de las comunidades educativas.', 'Registro de participación, evidencias de trabajo y seguimiento de las actividades de formación.', 'Figuras directivas.', 'UNETE', '25', 'Inclusión'],
  ['4', 'Brindar acompañamiento y seguimiento al proceso de capacitación docente del Programa CUANTRIX, favoreciendo la incorporación de la Ciencia de la Computación en las prácticas educativas.', 'Septiembre y octubre del 2026', 'Computadora, conexión a internet, guías pedagógicas, lecciones para docentes, materiales del Programa CUANTRIX y acompañamiento del personal responsable.', 'Diseñar e implementar propuestas didácticas mediante la aplicación de las ocho lecciones dirigidas al trabajo con el alumnado.', 'Proyecto de trabajo que integre las ocho lecciones o temáticas abordadas y evidencias de su implementación con el alumnado.', 'Docentes y alumnado', 'Personal de CUANTRIX', '25', 'Pensamiento crítico'],
  ['5', 'Brindar acompañamiento al Taller de Formación Docente en Inteligencia Artificial, orientado al fortalecimiento de competencias digitales para la práctica educativa.', 'Octubre de 2026', 'Computadora, conexión a internet, recursos tecnológicos, materiales de apoyo y acompañamiento del personal de CoEEE y figuras educativas participantes.', 'Fortalecer el uso pedagógico de la Inteligencia Artificial para optimizar la planeación didáctica y la elaboración de materiales educativos de manera ágil y pertinente.', 'Registro de participación y seguimiento de tres sesiones de formación, con duración de dos horas cada una.', 'Docentes', 'CoEEE', '25', 'Pensamiento crítico'],
  ['6', 'Dar seguimiento y acompañamiento a docentes de las escuelas beneficiadas por el Programa Internet en una Caja, para favorecer la apropiación y aplicación de recursos digitales en el contexto educativo.', 'septiembre y octubre de 2026 con 2 encuentros virtuales', 'Computadora, conexión a internet, materiales y recursos tecnológicos, así como acompañamiento del personal de Chicos.net.', 'Diseñar e implementar actividades didácticas orientadas al desarrollo de los Procesos de Desarrollo de Aprendizaje (PDA), mediante el uso pertinente de recursos digitales y secuencias didácticas.', 'Implementación de secuencias didácticas diseñadas para el desarrollo de los PDA y entrega de materiales de apoyo durante dos encuentros virtuales.', 'Docentes y alumnado.', 'Chicos.net', '25', 'Pensamiento crítico'],
  ['7', 'Realizar acciones de mantenimiento preventivo y correctivo a equipos de cómputo de las escuelas, con la finalidad de favorecer su óptimo funcionamiento y disponibilidad para el desarrollo de actividades educativas.', 'Ciclo escolar 2026-2027', 'Discos duros, memorias USB, herramientas para mantenimiento (desarmadores, brochas y sopladores), así como personal de OTDE.', 'Optimizar el funcionamiento de los equipos de cómputo mediante acciones de mantenimiento preventivo y correctivo, favoreciendo su disponibilidad para el trabajo con el alumnado y el acceso a la paquetería básica y al Banco de Materiales Digitales de apoyo docente.', 'Formulario de entrega y recepción con los directivos de las escuelas, acompañado de evidencias fotográficas de las acciones realizadas.', 'Directivos, docentes y alumnado.', 'OTDE', '23', 'Inclusión'],
  ['8', 'Brindar asesorías sobre el Banco de Materiales y Chuka: Rompe el Silencio, así como Excel básico para personal administrativo, de acuerdo con las necesidades de las figuras educativas y administrativas.', 'Ciclo escolar 2026-2027', 'Computadora, presentación digital, listas de asistencia, organizador gráfico para docentes y personal de OTDE.', 'Fortalecer las prácticas pedagógicas y administrativas mediante el uso pertinente de recursos tecnológicos, vinculados con los Procesos de Desarrollo de Aprendizaje (PDA) de la Nueva Escuela Mexicana.', 'Secuencia didáctica elaborada mediante el uso del organizador gráfico y evidencias de aplicación; seguimiento y acompañamiento por parte de OTDE.', 'Directivos y docentes.', 'OTDE', '25', 'Inclusión'],
  ['9', 'Brindar asesoría sobre la incorporación de la Inteligencia Artificial en la práctica docente, orientada al aprovechamiento pedagógico y responsable de herramientas digitales.', 'Ciclo escolar 2026-2027', 'Computadora, presentación digital, listas de asistencia, organizador gráfico para docentes y personal de OTDE.', 'Diseñar y fortalecer estrategias didácticas mediante el uso pertinente de herramientas de Inteligencia Artificial, favoreciendo experiencias de aprendizaje inclusivas, significativas y contextualizadas que contribuyan a la mejora de la práctica docente.', 'Entrega de recursos digitales y evidencias de aplicación de herramientas de Inteligencia Artificial en actividades de planeación o práctica docente.', 'Distintas figuras educativas', 'OTDE', '25', 'Pensamiento crítico']
];

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Bitácora')
    .addItem('Generar reporte del mes', 'bitGenerarReporteMensual')
    .addSeparator()
    .addItem('Preparar hojas y cargar planeación 2026-2027', 'bitPrepararHojas')
    .addItem('Configurar clave de captura', 'bitConfigurarClave')
    .addToUi();
}

// ── Clave de captura: se pide con un cuadro de diálogo en vez de como
// argumento, así ▶️ Ejecutar no la deja vacía (QA-NOTES #14) ni queda
// escrita en el código (QA-NOTES #25). ──
function bitConfigurarClave() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Clave de captura',
    'Escribe la clave que Jorge y Nancy usarán en bitacora.html (mínimo 8 caracteres). ' +
    'Reemplaza a la anterior, si había.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const clave = r.getResponseText().trim();
  if (clave.length < 8) {
    ui.alert('La clave debe tener al menos 8 caracteres. No se guardó nada.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('CLAVE_CAPTURA', clave);
  ui.alert('Clave guardada. En bitacora.html se escribe una vez por dispositivo.');
}

function bitClaveValida_(clave) {
  const esperada = PropertiesService.getScriptProperties().getProperty('CLAVE_CAPTURA');
  return !!esperada && String(clave || '') === esperada;
}

// ── Preparación única: crea las 3 hojas y siembra la planeación ──
function bitPrepararHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let plan = ss.getSheetByName(HOJA_BIT_PLANEACION);
  if (!plan) plan = ss.insertSheet(HOJA_BIT_PLANEACION);
  if (plan.getLastRow() === 0) {
    bitEncabezar_(plan, ENCABEZADOS_PLANEACION);
    plan.getRange(2, 1, BIT_PLANEACION_2627.length, ENCABEZADOS_PLANEACION.length)
      .setValues(BIT_PLANEACION_2627).setWrap(true).setVerticalAlignment('top');
    plan.setColumnWidth(2, 360);
    plan.setColumnWidth(5, 320);
  }

  bitObtenerHojaActividades_();

  let config = ss.getSheetByName(HOJA_BIT_CONFIG);
  if (!config) config = ss.insertSheet(HOJA_BIT_CONFIG);
  if (config.getLastRow() === 0) {
    bitEncabezar_(config, ['Responsables']);
    config.getRange(2, 1, BIT_RESPONSABLES_INICIALES.length, 1)
      .setValues(BIT_RESPONSABLES_INICIALES.map(function (r) { return [r]; }));
    config.getRange(1, 3).setValue('Agrega aquí responsables nuevos (uno por fila). Aparecen en el formulario de captura.')
      .setFontColor('#6b7280');
  }

  // La hoja vacía que trae un Sheet nuevo ("Hoja 1"/"Sheet1") ya no hace falta.
  ['Hoja 1', 'Sheet1'].forEach(function (nombre) {
    const h = ss.getSheetByName(nombre);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  try { SpreadsheetApp.getUi().alert('Hojas listas: Planeacion (9 acciones), Actividades y Config.'); } catch (err) {}
}

function bitEncabezar_(hoja, encabezados) {
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.setFrozenRows(1);
}

// Obtiene "Actividades" y completa cualquier encabezado que falte al final
// (mismo auto-heal que obtenerHojaCursos() de formacion-docente.gs).
function bitObtenerHojaActividades_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_BIT_ACTIVIDADES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_BIT_ACTIVIDADES);
    bitEncabezar_(hoja, ENCABEZADOS_ACTIVIDADES);
    hoja.getRange('C:C').setNumberFormat('@'); // Mes "2026-09" como texto, no fecha
    return hoja;
  }
  const actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (v) { return String(v).trim(); });
  const faltantes = ENCABEZADOS_ACTIVIDADES.filter(function (h) { return actuales.indexOf(h) === -1; });
  if (faltantes.length) {
    const desde = actuales.filter(String).length + 1;
    hoja.getRange(1, desde, 1, faltantes.length).setValues([faltantes])
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  }
  return hoja;
}

// Mapa encabezado → índice (0-based) de la fila 1.
function bitIndices_(hoja) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const idx = {};
  enc.forEach(function (h, i) { idx[String(h).trim()] = i; });
  return idx;
}

// ── doGet: ?action=planeacion&clave=... devuelve lo que el formulario
// necesita para precargar (acciones, responsables, metas). ──
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'planeacion') {
    if (!bitClaveValida_(p.clave)) return bitRespuesta_({ status: 'no_autorizado' });
    return bitRespuesta_({
      status: 'ok',
      acciones: bitLeerPlaneacion_(),
      responsables: bitLeerResponsables_(),
      metas: Object.keys(BIT_METAS)
    });
  }
  return bitRespuesta_({ status: 'ok', servicio: 'OTDE Bitácora de actividades' });
}

function bitLeerPlaneacion_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_BIT_PLANEACION);
  if (!hoja || hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, ENCABEZADOS_PLANEACION.length).getValues()
    .filter(function (r) { return String(r[0]).trim(); })
    .map(function (r) {
      return {
        np: String(r[0]).trim(),
        accion: String(r[1]).trim(),
        mes: String(r[2]).trim(),
        resultados: String(r[4]).trim(),
        beneficiarios: String(r[6]).trim(),
        responsables: String(r[7]).trim(),
        meta: String(r[8]).trim()
      };
    });
}

function bitLeerResponsables_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_BIT_CONFIG);
  if (!hoja || hoja.getLastRow() < 2) return BIT_RESPONSABLES_INICIALES.slice();
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, 1).getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(String);
}

// ── doPost: registra una actividad ──
// LockService + "ID de envío" generado en el navegador: si un reintento
// tras timeout llega dos veces, la segunda devuelve el mismo ID en vez de
// duplicar la fila (QA-NOTES #26 y #31).
function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return bitRespuesta_({ status: 'error', mensaje: 'Solicitud no válida.' });
  }
  if (!bitClaveValida_(datos.clave)) return bitRespuesta_({ status: 'no_autorizado' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return bitRespuesta_({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' });
  }
  try {
    const d = bitValidarActividad_(datos);
    const hoja = bitObtenerHojaActividades_();
    const idx = bitIndices_(hoja);
    const filas = hoja.getLastRow() > 1
      ? hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues()
      : [];

    if (d.idEnvio) {
      const previa = filas.find(function (r) { return String(r[idx['ID de envío']]) === d.idEnvio; });
      if (previa) return bitRespuesta_({ status: 'ok', id: previa[idx['ID']], duplicado: true });
    }

    const id = bitSiguienteId_(filas, idx['ID']);
    const valores = {
      'Registrado': new Date(),
      'ID': id,
      'Mes': d.mes,
      'Meta': d.meta,
      'N.P.': d.np,
      'Origen': d.origen,
      'Tipo y nombre': d.tipoNombre,
      'Fecha inicio': d.fechaInicio,
      'Fecha fin': d.fechaFin || '',
      'Fecha (texto)': bitFechaTexto_(d.fechaInicio, d.fechaFin),
      'Responsable': d.responsable,
      'Modalidad': d.modalidad,
      'Lugar': d.lugar,
      'CCT': d.cct,
      'Descripción': d.descripcion,
      'Propósito': d.proposito,
      'Beneficiarios': d.beneficiarios,
      'Capturó': d.capturo,
      'ID de envío': d.idEnvio
    };
    const fila = new Array(hoja.getLastColumn()).fill('');
    Object.keys(valores).forEach(function (h) {
      if (idx[h] !== undefined) fila[idx[h]] = valores[h];
    });
    hoja.appendRow(fila);

    return bitRespuesta_({ status: 'ok', id: id, mes: d.mes, meta: d.meta, fechaTexto: valores['Fecha (texto)'] });
  } catch (err) {
    return bitRespuesta_({ status: 'error', mensaje: err.message });
  } finally {
    lock.releaseLock();
  }
}

function bitValidarActividad_(x) {
  const txt = function (v) { return String(v == null ? '' : v).trim(); };
  const d = {
    meta: txt(x.meta),
    np: txt(x.np),
    origen: txt(x.origen),
    tipoNombre: txt(x.tipoNombre),
    fechaInicio: bitParsearFecha_(x.fechaInicio),
    fechaFin: x.fechaFin ? bitParsearFecha_(x.fechaFin) : null,
    responsable: txt(x.responsable),
    modalidad: txt(x.modalidad),
    lugar: txt(x.lugar),
    cct: txt(x.cct).toUpperCase(),
    descripcion: txt(x.descripcion),
    proposito: txt(x.proposito),
    beneficiarios: txt(x.beneficiarios),
    capturo: txt(x.capturo),
    idEnvio: txt(x.idEnvio)
  };
  // Una actividad planeada toma la meta de la hoja Planeacion, no la que mande
  // el navegador: si Jorge corrige la meta de una acción, manda la hoja.
  if (d.np) {
    const accion = bitLeerPlaneacion_().find(function (a) { return a.np === d.np; });
    if (!accion) throw new Error('La acción N.P. ' + d.np + ' no existe en la planeación.');
    d.meta = accion.meta;
    d.origen = '';
  } else if (!d.origen) {
    throw new Error('Elige la acción de la planeación o escribe el origen de la actividad no planeada.');
  }
  if (!BIT_METAS[d.meta]) throw new Error('Meta no válida (solo 23 o 25).');
  if (!d.fechaInicio) throw new Error('Fecha de inicio no válida.');
  if (d.fechaFin && d.fechaFin < d.fechaInicio) throw new Error('La fecha de fin es anterior a la de inicio.');
  if (BIT_MODALIDADES.indexOf(d.modalidad) === -1) throw new Error('Modalidad no válida.');
  if (BIT_CAPTURISTAS.indexOf(d.capturo) === -1) throw new Error('Indica quién captura.');
  const obligatorios = {
    tipoNombre: 'Tipo y nombre de la actividad', responsable: 'Responsable', lugar: 'Lugar',
    descripcion: 'Descripción', proposito: 'Propósito', beneficiarios: 'Beneficiarios'
  };
  Object.keys(obligatorios).forEach(function (k) {
    if (!d[k]) throw new Error('Falta un campo obligatorio: ' + obligatorios[k] + '.');
  });
  d.mes = Utilities.formatDate(d.fechaInicio, 'America/Mexico_City', 'yyyy-MM');
  return d;
}

// "YYYY-MM-DD" → Date a mediodía local. new Date('YYYY-MM-DD') se
// interpreta en UTC y se corre un día (QA-NOTES #3).
function bitParsearFecha_(valor) {
  const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return isNaN(f.getTime()) ? null : f;
}

function bitSiguienteId_(filas, col) {
  let max = 0;
  filas.forEach(function (r) {
    const m = String(r[col] || '').match(/^BIT-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'BIT-' + ('000' + (max + 1)).slice(-4);
}

// Texto de fecha al estilo del reporte real:
//   un día        → "7 de septiembre de 2026"
//   días seguidos → "Los días 13 y 14 de enero de 2026"
//   rango, mismo mes → "Del 13 al 17 de enero de 2026"
//   rango, otro mes  → "Del 28 de septiembre al 2 de octubre de 2026"
function bitFechaTexto_(inicio, fin) {
  const dia = function (f) { return f.getDate(); };
  const mes = function (f) { return BIT_MESES[f.getMonth()]; };
  const anio = function (f) { return f.getFullYear(); };
  if (!fin || fin.getTime() === inicio.getTime()) {
    return dia(inicio) + ' de ' + mes(inicio) + ' de ' + anio(inicio);
  }
  const mismoMes = inicio.getMonth() === fin.getMonth() && anio(inicio) === anio(fin);
  if (mismoMes && dia(fin) - dia(inicio) === 1) {
    return 'Los días ' + dia(inicio) + ' y ' + dia(fin) + ' de ' + mes(fin) + ' de ' + anio(fin);
  }
  if (mismoMes) {
    return 'Del ' + dia(inicio) + ' al ' + dia(fin) + ' de ' + mes(fin) + ' de ' + anio(fin);
  }
  const anioInicio = anio(inicio) === anio(fin) ? '' : ' de ' + anio(inicio);
  return 'Del ' + dia(inicio) + ' de ' + mes(inicio) + anioInicio + ' al ' +
    dia(fin) + ' de ' + mes(fin) + ' de ' + anio(fin);
}

// ── Reporte mensual ──
// Arma la pestaña "Reporte AAAA-MM" con un bloque por meta. Cada bloque
// replica las columnas A:L del Excel de Planeación con las mismas celdas
// combinadas (A:B, F:I, J:K), así se copia el bloque de filas aquí y se
// pega en la fila 14 de la pestaña META correspondiente sin que Excel
// choque con las combinaciones. Se regenera completa cada vez: si algo
// está mal, se corrige en "Actividades" y se vuelve a generar.
function bitGenerarReporteMensual() {
  const ui = SpreadsheetApp.getUi();
  const hoy = new Date();
  const sugerido = Utilities.formatDate(hoy, 'America/Mexico_City', 'yyyy-MM');
  const r = ui.prompt('Reporte del mes',
    '¿Qué mes? Escríbelo como AAAA-MM (ejemplo: ' + sugerido + ').', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const mes = r.getResponseText().trim() || sugerido;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    ui.alert('Formato no válido. Usa AAAA-MM, por ejemplo ' + sugerido + '.');
    return;
  }

  const hojaAct = bitObtenerHojaActividades_();
  const idx = bitIndices_(hojaAct);
  const filas = hojaAct.getLastRow() > 1
    ? hojaAct.getRange(2, 1, hojaAct.getLastRow() - 1, hojaAct.getLastColumn()).getValues()
    : [];
  // Si alguien retecleó "2026-09" a mano, Sheets pudo convertirlo en fecha.
  const mesDeFila = function (f) {
    const v = f[idx['Mes']];
    return v instanceof Date ? Utilities.formatDate(v, 'America/Mexico_City', 'yyyy-MM') : String(v).trim();
  };
  const delMes = filas.filter(function (f) { return mesDeFila(f) === mes; });
  delMes.sort(function (a, b) {
    return new Date(a[idx['Fecha inicio']]).getTime() - new Date(b[idx['Fecha inicio']]).getTime();
  });

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nombre = BIT_PREFIJO_REPORTE + mes;
  const previa = ss.getSheetByName(nombre);
  if (previa) ss.deleteSheet(previa);
  const hoja = ss.insertSheet(nombre);

  // Anchos parecidos a los del Excel real para que el texto se lea igual.
  [140, 48, 128, 132, 165, 72, 80, 88, 5, 100, 23, 147].forEach(function (w, i) {
    hoja.setColumnWidth(i + 1, w);
  });

  const [anio, mesNum] = mes.split('-');
  const nombreMes = BIT_MESES[Number(mesNum) - 1].toUpperCase();
  let fila = 1;
  hoja.getRange(fila, 1).setValue('Reporte de actividades OTDE · ' + nombreMes + ' ' + anio)
    .setFontWeight('bold').setFontSize(13).setFontColor('#56212f');
  fila++;
  hoja.getRange(fila, 1).setValue('Encabezado de cada pestaña del Excel (llenar a mano): Periodo del informe = ' +
    nombreMes + ' · ' + anio + '. Evidencias: un solo PDF del mes.').setFontColor('#6b7280');
  fila += 2;

  const avisos = [];
  const resumenMetas = [];
  Object.keys(BIT_METAS).forEach(function (meta) {
    const acts = delMes.filter(function (f) { return String(f[idx['Meta']]).trim() === meta; });
    resumenMetas.push('META ' + meta + ': ' + acts.length);
    if (acts.length > BIT_MAX_FILAS_POR_META) {
      avisos.push('META ' + meta + ' tiene ' + acts.length + ' actividades; el formato solo tiene ' +
        BIT_MAX_FILAS_POR_META + ' filas (14 a 30). Hay que combinar o pedir filas a Planeación.');
    }

    hoja.getRange(fila, 1, 1, 12).merge()
      .setValue('META ' + meta + ' — pegar en la fila 14 de la pestaña "META ' + meta + '" (' + acts.length + ' actividad' + (acts.length === 1 ? '' : 'es') + ')')
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    fila++;
    hoja.getRange(fila, 1, 1, 12).merge().setValue(BIT_METAS[meta].meta).setFontColor('#6b7280').setWrap(true);
    fila++;

    const encabezado = ['Tipo y nombre de la actividad', '', 'Fecha y/o periodo de realización',
      'Responsable (s) de la actividad', 'Lugar de realización', 'Descripción', '', '', '',
      'Propósito / Objetivo', '', 'No. y tipo de Beneficiarios'];
    hoja.getRange(fila, 1, 1, 12).setValues([encabezado]).setFontWeight('bold').setBackground('#d6d1ca').setWrap(true);
    bitCombinarFila_(hoja, fila);
    fila++;

    if (!acts.length) {
      hoja.getRange(fila, 1, 1, 12).merge().setValue('Sin actividades registradas este mes.').setFontStyle('italic').setFontColor('#6b7280');
      fila += 2;
      return;
    }

    const valores = acts.map(function (f) {
      return [
        f[idx['Tipo y nombre']], '', f[idx['Fecha (texto)']], f[idx['Responsable']], f[idx['Lugar']],
        f[idx['Descripción']], '', '', '', f[idx['Propósito']], '', f[idx['Beneficiarios']]
      ];
    });
    const rango = hoja.getRange(fila, 1, valores.length, 12);
    rango.setValues(valores).setWrap(true).setVerticalAlignment('top')
      .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
    for (let i = 0; i < valores.length; i++) bitCombinarFila_(hoja, fila + i);
    fila += valores.length + 2;
  });

  // Avance de la planeación: solo para OTDE, no va al Excel.
  const plan = bitLeerPlaneacion_();
  hoja.getRange(fila, 1, 1, 12).merge().setValue('Avance de la planeación en el mes (uso interno, no va al Excel)')
    .setFontWeight('bold').setBackground('#977e5b').setFontColor('#ffffff');
  fila++;
  const avance = plan.map(function (a) {
    const n = delMes.filter(function (f) { return String(f[idx['N.P.']]).trim() === a.np; }).length;
    return ['N.P. ' + a.np, '', n ? n + ' actividad' + (n === 1 ? '' : 'es') : 'Sin actividad', a.accion];
  });
  const noPlaneadas = delMes.filter(function (f) { return !String(f[idx['N.P.']]).trim(); }).length;
  avance.push(['No planeadas', '', noPlaneadas + ' actividad' + (noPlaneadas === 1 ? '' : 'es'), 'Actividades por oficio, convocatoria o solicitud de la estructura.']);
  hoja.getRange(fila, 1, avance.length, 4).setValues(avance).setWrap(false);
  avance.forEach(function (row, i) {
    if (row[2] === 'Sin actividad') hoja.getRange(fila + i, 3).setFontColor('#8a2020');
  });

  ss.setActiveSheet(hoja);
  ui.alert('Reporte ' + nombreMes + ' ' + anio + ' listo en la pestaña "' + nombre + '".\n\n' +
    resumenMetas.join(' · ') + (avisos.length ? '\n\nAviso:\n' + avisos.join('\n') : '') +
    '\n\nPara pasarlo al Excel: selecciona las filas de actividades de cada bloque (de la columna A a la L), ' +
    'cópialas y pégalas en la fila 14 de la pestaña META correspondiente.');
}

function bitCombinarFila_(hoja, fila) {
  hoja.getRange(fila, 1, 1, 2).merge();   // A:B Tipo y nombre
  hoja.getRange(fila, 6, 1, 4).merge();   // F:I Descripción
  hoja.getRange(fila, 10, 1, 2).merge();  // J:K Propósito
}

// ── Respuesta de texto plano (evita preflight CORS, mismo patrón del sitio) ──
function bitRespuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.TEXT);
}
