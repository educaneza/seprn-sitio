// ============================================================
// SEPRN · OTDE — Control de oficios + "Tomar número" compartido
// Fase 2A de docs/PLAN-OPERACION-INTERNA.md (8 oct 2026).
//
// DOS PIEZAS EN UN MISMO SHEET ("Control de oficios OTDE"):
//
// 1. TOMAR NÚMERO. Los números de oficio (228C0101110500T/4832/2026) no
//    son de OTDE: la lista es de toda la Subdirección. Cada año a OTDE le
//    asignan un LOTE (2026: 4501-5000) y, si se acaba, pide otro que puede
//    no ser contiguo (p. ej. 876-900). Jorge, Nancy, Alejandro y Marcos
//    toman números de ese lote para CUALQUIER documento (oficios,
//    justificantes, comisiones…), así que el sistema no numera por su
//    cuenta: reparte el siguiente libre de los lotes del año, en el orden
//    en que se capturaron, bajo LockService (dos personas al mismo tiempo
//    nunca reciben el mismo número). Un número nunca se reutiliza:
//    "Cancelar" solo cambia su Estatus. El año se toma de la fecha actual,
//    así que el 1 de enero el consecutivo empieza en el lote del año nuevo
//    (que Jorge captura con "Agregar lote"). Cuando quedan
//    OF_UMBRAL_AVISO números o menos, avisa a Jorge por correo (1 vez/día).
//    Tipos de documento, tandas y reasignar (feedback del equipo, 12 oct
//    2026): cada número lleva un "Tipo de documento" (Comisión, Difusión,
//    Oficio a Toluca/CoEEE, Otro) con sus propios campos. Un oficio de
//    comisión es UNO POR PERSONA Y POR DÍA, cada uno con su folio, aunque
//    sea el mismo destino: la página arma la tanda (personas × días, hasta
//    OF_MAX_TANDA) y se toman números seguidos en un solo envío (todo o
//    nada). El kilometraje de ida y vuelta lo calcula el servicio Maps de
//    Apps Script desde OF_ORIGEN_COMISION. Difusión y Toluca/CoEEE: un solo
//    folio por asunto, aunque vaya a los 13 sectores. Un número que no salió
//    se puede REASIGNAR a otro documento: conserva el número y deja en
//    "Historial" lo que decía antes.
//
// 2. CONTROL DE OFICIOS (entrada). Reemplaza al Excel "CONTROL DE OFICIOS
//    2026". Todo oficio que llega pasa primero por Oficialía de Partes, que
//    lo sella, le pone SU número de control y lo turna a OTDE: ese es el
//    "Folio de Oficialía de Partes" (en el Excel, "No. de folio recibido de
//    particular") y, junto con el año, impide registrar dos veces el mismo
//    oficio. "No. de oficio del remitente" es el número que trae el oficio
//    (p. ej. CoEEE 228C0101110001L/2016/2026). El oficio NO va al reporte
//    de la bitácora; la acción con que se atiende, sí (paso 2D, pendiente).
//    Si se atiende con un oficio de salida, el número tomado se anota solo
//    en "Oficio(s) de salida" (campo Vínculo = OF-NNNN).
//
// IMPLEMENTACIÓN:
//   1. Crea un Google Sheet nuevo y vacío ("Control de oficios OTDE").
//   2. Extensiones → Apps Script → pega este código completo.
//   3. Recarga el Sheet → menú "OTDE Oficios":
//        · "Preparar hojas" (una vez): crea Lotes (con el lote 2026
//          4501-5000, último usado 4831), Numeros, Oficios, Config e
//          Importar, con sus listas desplegables.
//        · "Configurar clave de captura": la que el equipo escribe una
//          vez en oficios.html (cuadro de diálogo, QA-NOTES #14/#25).
//        · "Importar histórico": pega la Hoja1 del Excel en la pestaña
//          Importar (con encabezados) y córrelo. Se puede repetir: lo ya
//          importado se salta por folio de Oficialía de Partes + año.
//   4. Implementar → Nueva implementación → Aplicación web
//      · Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL y pégala en oficios.html (OFICIOS_APPS_SCRIPT_URL).
//
// SEGURIDAD: igual que bitacora.gs, todo endpoint exige la clave de
// captura (Script Property CLAVE_CAPTURA). Los PDF se guardan en la
// carpeta de Drive "Oficios OTDE" (subcarpeta por mes), compartida una
// sola vez como "cualquiera con el link, solo ver" para que Nancy los abra
// desde el celular sin entrar a esta cuenta; el link solo aparece en el
// Sheet y en oficios.html detrás de la clave.
//
// Las hojas se leen y escriben por nombre de encabezado (ofIndices_), no
// por posición: reordenar o agregar columnas a mano no rompe nada.
// ============================================================

const HOJA_OF_LOTES = 'Lotes';
const HOJA_OF_NUMEROS = 'Numeros';
const HOJA_OF_OFICIOS = 'Oficios';
const HOJA_OF_CONFIG = 'Config';
const HOJA_OF_IMPORTAR = 'Importar';

const OF_ZONA = 'America/Mexico_City';
const OF_PREFIJO_NUMERO = '228C0101110500T';
const OF_UMBRAL_AVISO = 10;
const OF_TAMANO_MAX_BYTES = 8 * 1024 * 1024;
const OF_CARPETA_PDF = 'Oficios OTDE';
const OF_MAX_OFICIOS_PAGINA = 400;
const OF_MAX_NUMEROS_PAGINA = 40;

const ENCABEZADOS_OF_LOTES = ['Año', 'Desde', 'Hasta', 'Último usado antes del sistema', 'Fecha de asignación', 'Notas'];
// Lote 2026 de OTDE (Jorge, 8 oct 2026): del 4501 al 5000, último usado a mano el 4831.
const OF_LOTE_SEMILLA = [2026, 4501, 5000, 4831, '', 'Lote 2026. Del 4501 al 4831 se tomaron antes del sistema.'];

const ENCABEZADOS_OF_NUMEROS = ['Número', 'Consecutivo', 'Año', 'Tomado', 'Elabora', 'Asunto', 'Destino',
  'Fecha de elaboración', 'Estatus', 'Vínculo', 'Notas', 'ID de envío',
  // 12 oct 2026, al final para no mover las de arriba (en Comisión, "Asunto" es el motivo):
  'Tipo de documento', 'Persona comisionada', 'Lugar / destino', 'Fecha del evento', 'Horario',
  'Resumen del cuerpo', 'Fecha límite', 'Tanda', 'Historial',
  'CCT destino', 'Dirección destino', 'Modalidad', 'Km (ida y vuelta)',
  'RFC', 'Cargo', 'Destino completo', 'Oficio generado'];
const OF_ESTATUS_NUMERO = ['Asignado', 'Cancelado'];
const OF_TIPO_COMISION = 'Comisión';
const OF_TIPO_DIFUSION = 'Difusión de información';
const OF_TIPO_SUBE = 'Oficio a Toluca / CoEEE';
const OF_TIPO_OTRO = 'Otro documento';
const OF_TIPOS_DOCUMENTO = [OF_TIPO_COMISION, OF_TIPO_DIFUSION, OF_TIPO_SUBE, OF_TIPO_OTRO];
const OF_MAX_TANDA = 20;
// Origen de toda comisión (contacto.html) y modalidades de traslado (Config → "Modalidades").
const OF_ORIGEN_COMISION = 'Av. Texcoco 116, Col. Juárez Pantitlán, Nezahualcóyotl, Estado de México, C.P. 57460';
const OF_COL_MODALIDADES = 'Modalidades';
const OF_MODALIDADES_INICIALES = ['B3 Transporte particular sin gasolina'];
// Catálogo de personal (Config, columnas alineadas por renglón): lo que lleva el
// oficio de comisión de cada persona. El RFC solo vive en el Sheet: nunca se
// manda a la página ni se escribe en este código (el repo es público).
const OF_COL_PERSONAL = 'Personal';
const OF_COL_PERSONAL_RFC = 'RFC';
const OF_COL_PERSONAL_CARGO = 'Cargo';
const OF_COL_PERSONAL_INICIALES = 'Iniciales';
const OF_PERSONAL_INICIAL = [
  ['Mtro. Jorge Alberto Bonilla Torres', '', 'JEFE DE OFICINA', 'JABT'],
  ['Nancy', '', '', ''], ['Alejandro', '', '', ''], ['Marcos', '', '', '']
];
// Oficio de comisión en Word (12 oct 2026): plantilla .docx con {{CAMPOS}} en
// Drive (Script Property OF_PLANTILLA_COMISION_ID, menú "Configurar plantilla
// de comisión"); se genera un solo .docx por tanda, un oficio por página. El
// mapa (más de 20 km) es la impresión de Google Maps que hace el equipo.
const OF_CARPETA_COMISIONES = 'Oficios de comisión OTDE';
const OF_FIRMA_INICIALES = 'AGC/JABT';

const ENCABEZADOS_OF_OFICIOS = ['ID', 'N.P.', 'Ciclo', 'Folio de Oficialía de Partes', 'Fecha de recepción',
  'No. de oficio del remitente', 'Fecha de elaboración', 'Remitente', 'Asunto', 'Tipo de oficio',
  'Quién recibió', 'Observaciones', 'Dirección', 'Estatus', 'Forma de atención', 'Oficio(s) de salida',
  'Vínculo', 'PDF', 'Registrado', 'ID de envío', 'Fecha de atención', 'Origen'];
// Origen (paso 2B, 8 oct 2026): "Oficialía de Partes" (registrado a mano) u
// "Oficina Virtual" (llegó solo desde Mantenimiento/Asesorías, ver ofSincronizarOV_).
const OF_ORIGEN_OV = 'Oficina Virtual';
const OF_ORIGEN_OP = 'Oficialía de Partes';
// Interno (13 oct 2026): oficios y comunicados internos que no pasan por Oficialía.
// No llevan folio; casi siempre son informativos o invitaciones a capacitaciones,
// por eso por default quedan cerrados como "Solo conocimiento" desde el alta.
const OF_ORIGEN_INTERNO = 'Interno';
const OF_DIRECCIONES = ['Baja', 'Sube'];
const OF_ESTATUS_OFICIO = ['Recibido', 'En atención', 'Atendido', 'Solo conocimiento'];
const OF_COLORES_ESTATUS = {
  'Recibido': '#fde68a', 'En atención': '#bfdbfe', 'Atendido': '#bbf7d0', 'Solo conocimiento': '#e5e7eb'
};
const OF_FORMAS_ATENCION = ['Oficio de salida', 'Acción', 'Solo conocimiento'];

// Config: tres listas editables a mano (una por columna).
const OF_COL_ELABORA = 'Elabora';
const OF_COL_DESTINOS = 'Destinos';
const OF_COL_TIPOS = 'Tipos de oficio';
// Paso 2D (8 oct 2026): N.P. de la planeación con que suele atenderse cada tipo
// de oficio, para precargar la actividad en bitacora.html. Jorge lo revisa y
// corrige en Config; vacío = la bitácora lo deja como "No planeada".
const OF_COL_NP = 'N.P. planeación';
const OF_NP_POR_TIPO = {
  'ACCIONES FORMATIVAS A DISTANCIA': '10', 'APRENDE CURSOS': '10', 'SOLICITUD DE ASESORÍA': '8',
  'CONFERENCIAS UNETE': '13', 'CUANTRIX': '4', 'CURSOS - PDAE': '11', 'MIED': '1', 'SEMINARIOS': '13',
  'SOLICITUD DE MANTENIMIENTOS A EQUIPOS': '7', 'SOLICITUD CUENTAS DE CORREO ELECTRÓNICO': '12',
  'UNETE PFE': '3', 'INTERNET EN UNA CAJA': '6'
};
// Acciones que ya llegan solas a la bitácora (Mantenimiento, Asesorías, Correo):
// la página sugiere "ya llega sola" para no capturarlas dos veces.
const OF_NP_LLEGAN_SOLAS = ['7', '8', '12'];
const OF_MODOS_ATENCION = ['llegaSola', 'bitacora', 'conocimiento'];
const OF_ELABORA_INICIALES = ['Jorge', 'Nancy', 'Alejandro', 'Marcos'];
// Las 5 columnas de la lista de números que se lleva hoy; se marca una sola.
const OF_DESTINOS_INICIALES = ['Comisión', 'Sectores', 'CoEEE', 'Comisión sindical', 'Otro'];
// Catálogo de la Hoja2 del Excel "CONTROL DE OFICIOS 2026" (son programas).
const OF_TIPOS_INICIALES = ['ACCIONES FORMATIVAS A DISTANCIA', 'APRENDE CURSOS', 'SOLICITUD DE ASESORÍA',
  'CERTIFICACIONES MS', 'CONFERENCIAS UNETE', 'CUANTRIX', 'CURSOS - PDAE', 'MIED', 'RETO BEBRAS',
  'REUNIONES INFORMATIVAS', 'SEMINARIOS', 'SOLICITUD DE MANTENIMIENTOS A EQUIPOS',
  'SOLICITUD CUENTAS DE CORREO ELECTRÓNICO', 'INTERNET GRATUITO', 'CFE', 'UNETE EQUIPAMIENTO',
  'UNETE PFE', 'INTERNET EN UNA CAJA'];

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Oficios')
    .addItem('Agregar lote de números', 'ofAgregarLote')
    .addItem('Importar histórico (pestaña Importar)', 'ofImportarHistorico')
    .addItem('Traer de la Oficina Virtual ahora', 'ofSincronizarOV')
    .addSeparator()
    .addItem('Configurar conexión con la Oficina Virtual', 'ofConfigurarConexionOV')
    .addItem('Instalar sincronización automática (cada 30 min)', 'ofInstalarSincronizacionOV')
    .addItem('Preparar hojas', 'ofPrepararHojas')
    .addItem('Aplicar validación y semáforo', 'ofAplicarValidacion')
    .addItem('Configurar clave de captura', 'ofConfigurarClave')
    .addItem('Configurar plantilla de comisión', 'ofConfigurarPlantillaComision')
    .addToUi();
}

function ofConfigurarClave() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Clave de captura',
    'Escribe la clave que el equipo usará en oficios.html (mínimo 8 caracteres). ' +
    'Reemplaza a la anterior, si había.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const clave = r.getResponseText().trim();
  if (clave.length < 8) {
    ui.alert('La clave debe tener al menos 8 caracteres. No se guardó nada.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('CLAVE_CAPTURA', clave);
  ui.alert('Clave guardada. En oficios.html se escribe una vez por dispositivo.');
}

// null si la clave es correcta; si no, la respuesta de error (mismo contrato que bitacora.gs).
function ofErrorDeClave_(clave) {
  const esperada = PropertiesService.getScriptProperties().getProperty('CLAVE_CAPTURA');
  if (!esperada) return ofRespuesta_({ status: 'sin_clave' });
  if (String(clave || '').trim() !== esperada) return ofRespuesta_({ status: 'no_autorizado' });
  return null;
}

// ── Preparación (idempotente: completa lo que falte sin tocar lo capturado) ──
function ofPrepararHojas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lotes = ofObtenerHoja_(HOJA_OF_LOTES, ENCABEZADOS_OF_LOTES);
  if (lotes.getLastRow() < 2) {
    const semilla = OF_LOTE_SEMILLA.slice();
    semilla[4] = new Date();
    lotes.appendRow(semilla);
  }
  ofObtenerHoja_(HOJA_OF_NUMEROS, ENCABEZADOS_OF_NUMEROS);
  ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);

  let config = ss.getSheetByName(HOJA_OF_CONFIG);
  if (!config) config = ss.insertSheet(HOJA_OF_CONFIG);
  if (config.getLastRow() === 0) {
    const listas = [OF_ELABORA_INICIALES, OF_DESTINOS_INICIALES, OF_TIPOS_INICIALES,
      OF_TIPOS_INICIALES.map(function (t) { return OF_NP_POR_TIPO[t] || ''; }), OF_MODALIDADES_INICIALES].concat(
      [0, 1, 2, 3].map(function (c) { return OF_PERSONAL_INICIAL.map(function (p) { return p[c]; }); }));
    const alto = Math.max.apply(null, listas.map(function (l) { return l.length; }));
    ofEncabezar_(config, [OF_COL_ELABORA, OF_COL_DESTINOS, OF_COL_TIPOS, OF_COL_NP, OF_COL_MODALIDADES,
      OF_COL_PERSONAL, OF_COL_PERSONAL_RFC, OF_COL_PERSONAL_CARGO, OF_COL_PERSONAL_INICIALES]);
    const filas = [];
    for (let i = 0; i < alto; i++) filas.push(listas.map(function (l) { return l[i] || ''; }));
    config.getRange(2, 1, alto, listas.length).setValues(filas);
    config.setColumnWidth(3, 320);
    config.getRange(1, listas.length + 2).setValue('Agrega valores nuevos al final de cada columna. Aparecen en oficios.html. ' +
      '"N.P. planeación" va en el mismo renglón que su tipo de oficio.')
      .setFontColor('#6b7280');
  }

  let importar = ss.getSheetByName(HOJA_OF_IMPORTAR);
  if (!importar) {
    importar = ss.insertSheet(HOJA_OF_IMPORTAR);
    importar.getRange(1, 12).setValue('Pega aquí la Hoja1 del Excel CONTROL DE OFICIOS (desde la fila de ' +
      'encabezados, en A1) y usa "OTDE Oficios → Importar histórico".').setFontColor('#6b7280');
  }

  ['Hoja 1', 'Sheet1'].forEach(function (nombre) {
    const h = ss.getSheetByName(nombre);
    if (h && h.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(h);
  });

  ofAplicarValidacion_();
  const r = ofResumenLotes_(ofAnioActual_());
  try {
    SpreadsheetApp.getUi().alert('Hojas listas. Lote ' + r.anio + ': quedan ' + r.quedan +
      ' números; el siguiente es el ' + (r.siguiente || '(sin lote)') + '.');
  } catch (err) {}
}

function ofEncabezar_(hoja, encabezados) {
  hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados])
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.setFrozenRows(1);
}

// Obtiene una hoja y agrega al final los encabezados que falten (auto-heal,
// mismo patrón que bitObtenerHojaActividades_).
function ofObtenerHoja_(nombre, encabezados) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    ofEncabezar_(hoja, encabezados);
    return hoja;
  }
  if (hoja.getLastRow() === 0) {
    ofEncabezar_(hoja, encabezados);
    return hoja;
  }
  const actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (v) { return String(v).trim(); });
  const faltantes = encabezados.filter(function (h) { return actuales.indexOf(h) === -1; });
  if (faltantes.length) {
    const desde = actuales.filter(String).length + 1;
    hoja.getRange(1, desde, 1, faltantes.length).setValues([faltantes])
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  }
  return hoja;
}

function ofIndices_(hoja) {
  const enc = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
  const idx = {};
  enc.forEach(function (h, i) { idx[String(h).trim()] = i; });
  return idx;
}

function ofFilas_(hoja) {
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues();
}

// Arma una fila completa a partir de {encabezado: valor}.
function ofArmarFila_(hoja, idx, valores) {
  const fila = new Array(hoja.getLastColumn()).fill('');
  Object.keys(valores).forEach(function (h) {
    if (idx[h] !== undefined) fila[idx[h]] = valores[h];
  });
  return fila;
}

// ── Validación y semáforo (patrón docs/ARCHITECTURE.md §24) ──
function ofAplicarValidacion() {
  ofAplicarValidacion_();
  try { SpreadsheetApp.getUi().alert('Listas desplegables y colores aplicados.'); } catch (err) {}
}

function ofAplicarValidacion_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lista = function (valores, estricta, ayuda) {
    const b = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(!estricta);
    if (ayuda) b.setHelpText(ayuda);
    return b.build();
  };
  const columna = function (hoja, idx, encabezado) {
    if (idx[encabezado] === undefined) return null;
    return hoja.getRange(2, idx[encabezado] + 1, Math.max(hoja.getMaxRows() - 1, 1), 1);
  };
  const config = ofLeerConfig_();

  const numeros = ss.getSheetByName(HOJA_OF_NUMEROS);
  if (numeros) {
    const i = ofIndices_(numeros);
    const est = columna(numeros, i, 'Estatus');
    if (est) est.setDataValidation(lista(OF_ESTATUS_NUMERO, true, 'Un número nunca se borra ni se reutiliza: si no se usó, márcalo "Cancelado".'));
    const dest = columna(numeros, i, 'Destino');
    if (dest) dest.setDataValidation(lista(config.destinos, false));
    const elab = columna(numeros, i, 'Elabora');
    if (elab) elab.setDataValidation(lista(config.elabora, false));
    const tipoDoc = columna(numeros, i, 'Tipo de documento');
    if (tipoDoc) tipoDoc.setDataValidation(lista(OF_TIPOS_DOCUMENTO, false));
    ofSemaforo_(numeros, est, { 'Cancelado': '#e5e7eb' });
  }

  const oficios = ss.getSheetByName(HOJA_OF_OFICIOS);
  if (oficios) {
    const i = ofIndices_(oficios);
    const est = columna(oficios, i, 'Estatus');
    if (est) est.setDataValidation(lista(OF_ESTATUS_OFICIO, true));
    const dir = columna(oficios, i, 'Dirección');
    if (dir) dir.setDataValidation(lista(OF_DIRECCIONES, true, 'Baja: viene de instancias superiores. Sube: viene de la estructura (escuelas, zonas, sectores).'));
    const forma = columna(oficios, i, 'Forma de atención');
    if (forma) forma.setDataValidation(lista(OF_FORMAS_ATENCION, false));
    const tipo = columna(oficios, i, 'Tipo de oficio');
    if (tipo) tipo.setDataValidation(lista(config.tipos, false));
    ofSemaforo_(oficios, est, OF_COLORES_ESTATUS);
  }
}

function ofSemaforo_(hoja, rango, colores) {
  if (!rango) return;
  const a1 = rango.getA1Notation();
  const otras = hoja.getConditionalFormatRules().filter(function (r) {
    return !r.getRanges().some(function (x) { return x.getA1Notation() === a1; });
  });
  const nuevas = Object.keys(colores).map(function (valor) {
    return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(valor)
      .setBackground(colores[valor]).setRanges([rango]).build();
  });
  hoja.setConditionalFormatRules(otras.concat(nuevas));
}

// Config creada antes del paso 2D: agrega "N.P. planeación" junto a los tipos
// (en la primera columna libre) con la propuesta de OF_NP_POR_TIPO. Una vez.
function ofAsegurarColumnaNp_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_CONFIG);
  if (!hoja || hoja.getLastRow() < 1) return;
  const enc = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (v) { return String(v).trim(); });
  if (enc.indexOf(OF_COL_NP) !== -1) return;
  const colTipos = enc.indexOf(OF_COL_TIPOS);
  if (colTipos === -1) return;
  let col = colTipos + 2; // 1-based, a la derecha de los tipos
  while (enc[col - 1]) col++;
  hoja.getRange(1, col).setValue(OF_COL_NP).setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  const n = hoja.getLastRow() - 1;
  if (n < 1) return;
  const tipos = hoja.getRange(2, colTipos + 1, n, 1).getValues();
  hoja.getRange(2, col, n, 1).setValues(tipos.map(function (r) {
    return [OF_NP_POR_TIPO[String(r[0]).replace(/\s+/g, ' ').trim().toUpperCase()] || ''];
  }));
}

// Config creada antes del 12 oct 2026: agrega la columna "Modalidades" en la
// primera columna libre, con la modalidad de siempre. Una vez; luego se edita a mano.
function ofAsegurarColumnaModalidades_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_CONFIG);
  if (!hoja || hoja.getLastRow() < 1) return;
  const enc = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (v) { return String(v).trim(); });
  if (enc.indexOf(OF_COL_MODALIDADES) !== -1) return;
  let col = 1;
  while (enc[col - 1]) col++;
  hoja.getRange(1, col).setValue(OF_COL_MODALIDADES).setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.getRange(2, col, OF_MODALIDADES_INICIALES.length, 1).setValues(OF_MODALIDADES_INICIALES.map(function (m) { return [m]; }));
}

// Config sin catálogo de personal (antes del 12 oct 2026): agrega las 4
// columnas juntas en las primeras libres, con el equipo. RFC y cargos se llenan a mano.
function ofAsegurarColumnasPersonal_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_CONFIG);
  if (!hoja || hoja.getLastRow() < 1) return;
  const enc = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (v) { return String(v).trim(); });
  if (enc.indexOf(OF_COL_PERSONAL) !== -1) return;
  let col = 1;
  while (enc[col - 1]) col++;
  hoja.getRange(1, col, 1, 4).setValues([[OF_COL_PERSONAL, OF_COL_PERSONAL_RFC, OF_COL_PERSONAL_CARGO, OF_COL_PERSONAL_INICIALES]])
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.getRange(2, col, OF_PERSONAL_INICIAL.length, 4).setValues(OF_PERSONAL_INICIAL);
  hoja.getRange(1, col).setNote('Como va en el oficio de comisión: grado y nombre completo (ej. "Mtra. Nancy …"). ' +
    'RFC, cargo e iniciales en el mismo renglón. Las iniciales de quien elabora van al pie (AGC/JABT/…).');
}

function ofLeerConfig_() {
  const res = { elabora: OF_ELABORA_INICIALES.slice(), destinos: OF_DESTINOS_INICIALES.slice(), tipos: OF_TIPOS_INICIALES.slice(),
    npPorTipo: Object.assign({}, OF_NP_POR_TIPO), npLleganSolas: OF_NP_LLEGAN_SOLAS.slice(),
    modalidades: OF_MODALIDADES_INICIALES.slice(), personal: [] };
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_CONFIG);
  if (!hoja || hoja.getLastRow() < 2) return res;
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const leer = function (encabezado) {
    if (idx[encabezado] === undefined) return null;
    const vals = filas.map(function (r) { return String(r[idx[encabezado]]).trim(); }).filter(String);
    return vals.length ? vals : null;
  };
  res.elabora = leer(OF_COL_ELABORA) || res.elabora;
  res.destinos = leer(OF_COL_DESTINOS) || res.destinos;
  res.tipos = leer(OF_COL_TIPOS) || res.tipos;
  res.modalidades = leer(OF_COL_MODALIDADES) || res.modalidades;
  res.personal = [];
  if (idx[OF_COL_PERSONAL] !== undefined) {
    const col = function (r, h) { return idx[h] === undefined ? '' : String(r[idx[h]]).trim(); };
    filas.forEach(function (r) {
      const nombre = col(r, OF_COL_PERSONAL);
      if (nombre) {
        res.personal.push({ nombre: nombre, rfc: col(r, OF_COL_PERSONAL_RFC),
          cargo: col(r, OF_COL_PERSONAL_CARGO), iniciales: col(r, OF_COL_PERSONAL_INICIALES) });
      }
    });
  }
  // {tipo: N.P.} leído renglón por renglón (el N.P. va junto a su tipo).
  res.npPorTipo = {};
  if (idx[OF_COL_TIPOS] !== undefined && idx[OF_COL_NP] !== undefined) {
    filas.forEach(function (r) {
      const t = String(r[idx[OF_COL_TIPOS]]).trim();
      const np = String(r[idx[OF_COL_NP]]).replace(/^N\.?P\.?\s*/i, '').trim();
      if (t && np) res.npPorTipo[t] = np;
    });
  }
  res.npLleganSolas = OF_NP_LLEGAN_SOLAS.slice();
  return res;
}

// ── Lotes ──
function ofAnioActual_() {
  return Number(Utilities.formatDate(new Date(), OF_ZONA, 'yyyy'));
}

function ofLeerLotes_(anio) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_LOTES);
  if (!hoja) return [];
  const idx = ofIndices_(hoja);
  return ofFilas_(hoja).map(function (r) {
    return {
      anio: Number(r[idx['Año']]),
      desde: Number(r[idx['Desde']]),
      hasta: Number(r[idx['Hasta']]),
      ultimoAntes: Number(r[idx['Último usado antes del sistema']]) || 0
    };
  }).filter(function (l) {
    return l.anio === anio && l.desde > 0 && l.hasta >= l.desde;
  });
}

// Consecutivos ya tomados en el año (Asignado o Cancelado: ninguno se reutiliza).
function ofConsecutivosUsados_(filasNumeros, idx, anio) {
  const usados = {};
  filasNumeros.forEach(function (r) {
    if (Number(r[idx['Año']]) === anio) usados[Number(r[idx['Consecutivo']])] = true;
  });
  return usados;
}

// Siguiente libre de un lote: después del mayor usado dentro del lote (o del
// "último usado antes del sistema"). No rellena huecos a propósito: un hueco
// puede ser un número que alguien tomó por fuera.
function ofSiguienteEnLote_(lote, usados) {
  let mayor = Math.max(lote.desde - 1, Math.min(lote.ultimoAntes, lote.hasta));
  Object.keys(usados).forEach(function (k) {
    const n = Number(k);
    if (n >= lote.desde && n <= lote.hasta && n > mayor) mayor = n;
  });
  return mayor + 1 <= lote.hasta ? mayor + 1 : null;
}

// {anio, siguiente, quedan, lotes:[{desde,hasta,quedan}]} — lo que se reparte y cuánto falta.
function ofResumenLotes_(anio, filasNumeros, idxNumeros) {
  if (!filasNumeros) {
    const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_NUMEROS);
    filasNumeros = hoja ? ofFilas_(hoja) : [];
    idxNumeros = hoja ? ofIndices_(hoja) : {};
  }
  const usados = ofConsecutivosUsados_(filasNumeros, idxNumeros, anio);
  let siguiente = null;
  let quedan = 0;
  const lotes = ofLeerLotes_(anio).map(function (l) {
    const sig = ofSiguienteEnLote_(l, usados);
    const q = sig ? l.hasta - sig + 1 : 0;
    quedan += q;
    if (siguiente === null && sig !== null) siguiente = sig;
    return { desde: l.desde, hasta: l.hasta, quedan: q };
  });
  return { anio: anio, siguiente: siguiente, quedan: quedan, lotes: lotes };
}

function ofFormatearNumero_(consecutivo, anio) {
  return OF_PREFIJO_NUMERO + '/' + consecutivo + '/' + anio;
}

// Menú: Jorge captura el lote nuevo como "876-900" (o "876 900").
function ofAgregarLote() {
  const ui = SpreadsheetApp.getUi();
  const anio = ofAnioActual_();
  const r = ui.prompt('Agregar lote de números',
    'Escribe el rango que asignaron a OTDE para ' + anio + ', por ejemplo: 876-900', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const m = r.getResponseText().trim().match(/^(\d+)\s*(?:-|–|al|a|\s)\s*(\d+)$/i);
  if (!m) { ui.alert('No entendí el rango. Escríbelo como 876-900.'); return; }
  const desde = Number(m[1]);
  const hasta = Number(m[2]);
  if (!(desde > 0 && hasta >= desde)) { ui.alert('El rango no es válido: el final debe ser mayor o igual al inicio.'); return; }
  const choque = ofLeerLotes_(anio).find(function (l) { return desde <= l.hasta && hasta >= l.desde; });
  if (choque) { ui.alert('Ese rango se encima con el lote ' + choque.desde + '-' + choque.hasta + ' de ' + anio + '. No se guardó.'); return; }
  const hoja = ofObtenerHoja_(HOJA_OF_LOTES, ENCABEZADOS_OF_LOTES);
  const idx = ofIndices_(hoja);
  hoja.appendRow(ofArmarFila_(hoja, idx, {
    'Año': anio, 'Desde': desde, 'Hasta': hasta, 'Último usado antes del sistema': '',
    'Fecha de asignación': new Date(), 'Notas': ''
  }));
  PropertiesService.getScriptProperties().deleteProperty('OF_AVISO_POCOS');
  const res = ofResumenLotes_(anio);
  ui.alert('Lote ' + desde + '-' + hasta + ' agregado. Quedan ' + res.quedan + ' números en ' + anio + '.');
}

// Aviso a Jorge cuando quedan pocos números (máx. 1 por día).
function ofAvisarSiQuedanPocos_(resumen) {
  if (resumen.quedan > OF_UMBRAL_AVISO) return;
  const props = PropertiesService.getScriptProperties();
  const hoy = Utilities.formatDate(new Date(), OF_ZONA, 'yyyy-MM-dd');
  if (props.getProperty('OF_AVISO_POCOS') === hoy) return;
  props.setProperty('OF_AVISO_POCOS', hoy);
  try {
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: resumen.quedan
        ? 'OTDE: quedan ' + resumen.quedan + ' números de oficio en el lote ' + resumen.anio
        : 'OTDE: se acabaron los números de oficio de ' + resumen.anio,
      body: 'Quedan ' + resumen.quedan + ' números de oficio en los lotes de ' + resumen.anio + '.\n\n' +
        'Pide un lote nuevo a la Subdirección y captúralo en el Sheet "Control de oficios OTDE": ' +
        'menú OTDE Oficios → Agregar lote de números.\n\n' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    });
  } catch (err) {
    console.error('Aviso de lote: ' + err.message);
  }
}

// ── doGet: ?action=inicio&clave=... todo lo que la página necesita en una sola llamada ──
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'inicio') {
    const errorClave = ofErrorDeClave_(p.clave);
    if (errorClave) return errorClave;
    try {
      return ofRespuesta_(ofDatosInicio_());
    } catch (err) {
      return ofRespuesta_({ status: 'error', mensaje: err.message });
    }
  }
  return ofRespuesta_({ status: 'ok', servicio: 'OTDE Control de oficios' });
}

function ofDatosInicio_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ofAsegurarColumnaNp_();
  ofAsegurarColumnaModalidades_();
  ofAsegurarColumnasPersonal_();
  const anio = ofAnioActual_();
  const hojaNum = ss.getSheetByName(HOJA_OF_NUMEROS);
  const hojaOf = ss.getSheetByName(HOJA_OF_OFICIOS);
  if (!hojaNum || !hojaOf) throw new Error('Faltan las hojas: corre "OTDE Oficios → Preparar hojas".');
  const iN = ofIndices_(hojaNum);
  const filasN = ofFilas_(hojaNum);
  const iO = ofIndices_(hojaOf);
  const filasO = ofFilas_(hojaOf);

  const numeros = filasN.slice(-OF_MAX_NUMEROS_PAGINA).reverse().map(function (r) {
    return ofNumeroParaPagina_(r, iN);
  });
  const oficios = filasO.slice(-OF_MAX_OFICIOS_PAGINA).reverse().map(function (r) {
    return ofOficioParaPagina_(r, iO);
  });
  const config = ofLeerConfig_();
  config.personal = config.personal.map(function (p) { return { nombre: p.nombre, cargo: p.cargo }; }); // sin RFC
  return {
    status: 'ok',
    config: config,
    lote: ofResumenLotes_(anio, filasN, iN),
    ov: ofEstadoOV_(),
    numeros: numeros,
    oficios: oficios
  };
}

function ofNumeroParaPagina_(r, i) {
  // Las columnas del 12 oct 2026 pueden faltar en una hoja que aún no se ha tocado.
  const v = function (h, conHora) { return i[h] === undefined ? '' : ofFechaIso_(r[i[h]], conHora); };
  return {
    numero: v('Número'), consecutivo: Number(r[i['Consecutivo']]),
    tomado: v('Tomado', true), elabora: v('Elabora'), asunto: v('Asunto'), destino: v('Destino'),
    elaboracion: v('Fecha de elaboración'), estatus: v('Estatus'), vinculo: v('Vínculo'),
    tipo: v('Tipo de documento') || OF_TIPO_OTRO, persona: v('Persona comisionada'),
    lugar: v('Lugar / destino'), fechaEvento: v('Fecha del evento'), horario: v('Horario'),
    resumen: v('Resumen del cuerpo'), fechaLimite: v('Fecha límite'), tanda: v('Tanda'),
    reasignado: !!v('Historial').trim(),
    cct: v('CCT destino'), direccion: v('Dirección destino'), modalidad: v('Modalidad'), km: v('Km (ida y vuelta)'),
    cargo: v('Cargo'), destinoCompleto: v('Destino completo'), oficioGenerado: v('Oficio generado')
  };
}

function ofOficioParaPagina_(r, i) {
  return {
    id: String(r[i['ID']]), np: String(r[i['N.P.']]), ciclo: String(r[i['Ciclo']]),
    folioOP: String(r[i['Folio de Oficialía de Partes']]),
    recepcion: ofFechaIso_(r[i['Fecha de recepción']]),
    numRemitente: String(r[i['No. de oficio del remitente']]),
    remitente: String(r[i['Remitente']]), asunto: String(r[i['Asunto']]),
    tipo: String(r[i['Tipo de oficio']]), direccion: String(r[i['Dirección']]),
    estatus: String(r[i['Estatus']]), forma: String(r[i['Forma de atención']]),
    salida: String(r[i['Oficio(s) de salida']]), pdf: String(r[i['PDF']]),
    observaciones: String(r[i['Observaciones']]),
    elaboracion: ofFechaIso_(r[i['Fecha de elaboración']]),
    vinculo: String(r[i['Vínculo']] == null ? '' : r[i['Vínculo']]),
    fechaAtencion: i['Fecha de atención'] === undefined ? '' : ofFechaIso_(r[i['Fecha de atención']]),
    origen: i['Origen'] === undefined ? '' : String(r[i['Origen']])
  };
}

// Date → "yyyy-MM-dd" (o con hora). Texto se devuelve tal cual.
function ofFechaIso_(v, conHora) {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return Utilities.formatDate(v, OF_ZONA, conHora ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  return String(v == null ? '' : v);
}

// ── doPost: {accion: 'tomarNumero' | 'cancelarNumero' | 'reasignarNumero' | 'registrarOficio' | ..., clave, ...} ──
function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return ofRespuesta_({ status: 'error', mensaje: 'Solicitud no válida.' });
  }
  const errorClave = ofErrorDeClave_(datos.clave);
  if (errorClave) return errorClave;

  // El PDF se sube a Drive ANTES del candado: puede tardar y no hace falta
  // bloquear a quien está tomando un número mientras tanto. Si es un reintento
  // o el folio ya existe, no se sube (quedaría un PDF huérfano en Drive); la
  // respuesta definitiva la da ofRegistrarOficio_ con el candado tomado.
  let pdf = '';
  if (datos.accion === 'registrarOficio' && datos.pdfBase64 && !ofOficioYaExiste_(datos)) {
    try {
      pdf = ofSubirPdf_(datos);
    } catch (err) {
      return ofRespuesta_({ status: 'error', mensaje: err.message });
    }
  }

  // El Word de las comisiones solo lee filas y escribe en Drive: no necesita el candado.
  if (datos.accion === 'generarComision') {
    try {
      return ofRespuesta_(ofGenerarComision_(datos));
    } catch (err) {
      return ofRespuesta_({ status: 'error', mensaje: err.message });
    }
  }

  // Kilometraje de las comisiones, también antes del candado (Maps tarda ~1 s por destino).
  if (datos.accion === 'tomarNumero' || datos.accion === 'reasignarNumero') ofCalcularKm_(datos);

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ofRespuesta_({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' });
  }
  try {
    if (datos.accion === 'tomarNumero') return ofRespuesta_(ofTomarNumero_(datos));
    if (datos.accion === 'cancelarNumero') return ofRespuesta_(ofCancelarNumero_(datos));
    if (datos.accion === 'reasignarNumero') return ofRespuesta_(ofReasignarNumero_(datos));
    if (datos.accion === 'registrarOficio') return ofRespuesta_(ofRegistrarOficio_(datos, pdf));
    if (datos.accion === 'atenderOficio') return ofRespuesta_(ofAtenderOficio_(datos));
    if (datos.accion === 'anotarFolioOP') return ofRespuesta_(ofAnotarFolioOP_(datos));
    return ofRespuesta_({ status: 'error', mensaje: 'Acción no reconocida.' });
  } catch (err) {
    return ofRespuesta_({ status: 'error', mensaje: err.message });
  } finally {
    lock.releaseLock();
  }
}

function ofTxt_(v) { return String(v == null ? '' : v).trim(); }

// "YYYY-MM-DD" → Date a mediodía local (QA-NOTES #3: new Date('YYYY-MM-DD') se corre un día).
function ofParsearFecha_(valor) {
  const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const f = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return isNaN(f.getTime()) ? null : f;
}

// Datos propios de un documento según su tipo. Un payload sin "tipo" (la
// página anterior al 12 oct 2026) se trata como "Otro documento".
function ofNormalizarDocumento_(x) {
  const tipo = OF_TIPOS_DOCUMENTO.indexOf(ofTxt_(x.tipo)) !== -1 ? ofTxt_(x.tipo) : OF_TIPO_OTRO;
  const fechaOpcional = function (v) { return ofTxt_(v) ? ofParsearFecha_(v) : ''; };
  return {
    tipo: tipo, asunto: ofTxt_(x.asunto), destino: ofTxt_(x.destino),
    persona: tipo === OF_TIPO_COMISION ? ofTxt_(x.persona) : '',
    lugar: tipo === OF_TIPO_COMISION ? ofTxt_(x.lugar) : '',
    fechaEvento: tipo === OF_TIPO_COMISION ? fechaOpcional(x.fechaEvento) : '',
    horario: tipo === OF_TIPO_COMISION ? ofTxt_(x.horario) : '',
    cct: tipo === OF_TIPO_COMISION ? ofTxt_(x.cct).toUpperCase() : '',
    direccion: tipo === OF_TIPO_COMISION ? ofTxt_(x.direccion) : '',
    modalidad: tipo === OF_TIPO_COMISION ? ofTxt_(x.modalidad) : '',
    km: tipo === OF_TIPO_COMISION && typeof x.km === 'number' ? x.km : '',
    rfc: tipo === OF_TIPO_COMISION ? ofTxt_(x.rfc).toUpperCase() : '',
    cargo: tipo === OF_TIPO_COMISION ? ofTxt_(x.cargo) : '',
    destinoCompleto: tipo === OF_TIPO_COMISION ? ofTxt_(x.destinoCompleto) : '',
    resumen: tipo === OF_TIPO_DIFUSION || tipo === OF_TIPO_SUBE ? ofTxt_(x.resumen) : '',
    fechaLimite: tipo === OF_TIPO_DIFUSION ? fechaOpcional(x.fechaLimite) : ''
  };
}

// Kilometraje de ida y vuelta a cada destino distinto de la tanda, con el
// servicio Maps de Apps Script (sin clave ni cuenta de pago). Igual que se hace
// a mano en Google Maps (oficio de comisión real, 5 oct 2026: "SEPRN a SEPRN",
// 23.9 km): origen SEPRN → destino como parada → regreso a SEPRN, sumando los
// dos tramos (el regreso puede ir por otras calles). Se guarda en caché 6 h por
// dirección. Si Maps falla o no hay dirección, queda vacío: el
// número se toma igual y el km se anota a mano.
function ofCalcularKm_(datos) {
  const docs = Array.isArray(datos.documentos) && datos.documentos.length ? datos.documentos : [datos];
  const cache = CacheService.getScriptCache();
  const porDireccion = {};
  docs.forEach(function (d) {
    d.km = '';
    const dir = ofTxt_(d.direccion);
    if (ofTxt_(d.tipo) !== OF_TIPO_COMISION || !dir) return;
    if (!(dir in porDireccion)) porDireccion[dir] = ofKmIdaVuelta_(dir, cache);
    d.km = porDireccion[dir];
  });
}

function ofKmIdaVuelta_(direccion, cache) {
  const clave = 'km_' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, direccion));
  const guardado = cache.get(clave);
  if (guardado !== null) return guardado === '' ? '' : Number(guardado);
  let km = '';
  try {
    const ruta = Maps.newDirectionFinder().setOrigin(OF_ORIGEN_COMISION).addWaypoint(direccion)
      .setDestination(OF_ORIGEN_COMISION).setMode(Maps.DirectionFinder.Mode.DRIVING).setLanguage('es').getDirections();
    const tramos = (ruta && ruta.routes && ruta.routes[0] && ruta.routes[0].legs) || [];
    if (tramos.length === 2 && tramos.every(function (t) { return t.distance; })) {
      km = Math.round((tramos[0].distance.value + tramos[1].distance.value) / 100) / 10;
    }
  } catch (err) {
    console.error('Km a ' + direccion + ': ' + err.message);
  }
  cache.put(clave, String(km), 21600);
  return km;
}

// n > 0: número de renglón en una tanda, para decir cuál falta.
function ofValidarDocumento_(d, n) {
  const pre = n ? 'Renglón ' + n + ': ' : '';
  const comision = d.tipo === OF_TIPO_COMISION;
  if (comision && !d.persona) throw new Error(pre + 'escribe el nombre de la persona comisionada.');
  if (!d.asunto) throw new Error(pre + (comision ? 'escribe el motivo de la comisión.' : 'escribe el asunto.'));
  if (!d.destino) throw new Error(pre + 'elige a quién va dirigido.');
  if (comision && !d.lugar) throw new Error(pre + 'escribe el lugar o destino de la comisión.');
  if (comision && !d.modalidad) throw new Error(pre + 'elige la modalidad de traslado.');
  if (comision && !d.fechaEvento) throw new Error(pre + 'indica la fecha de la comisión.');
  if ((d.tipo === OF_TIPO_DIFUSION || d.tipo === OF_TIPO_SUBE) && !d.resumen) {
    throw new Error(pre + 'escribe el resumen del cuerpo del oficio.');
  }
  if (d.fechaEvento === null || d.fechaLimite === null) throw new Error(pre + 'hay una fecha no válida.');
}

function ofValoresDocumento_(d) {
  return {
    'Tipo de documento': d.tipo, 'Asunto': d.asunto, 'Destino': d.destino,
    'Persona comisionada': d.persona, 'Lugar / destino': d.lugar, 'Fecha del evento': d.fechaEvento,
    'Horario': d.horario, 'Resumen del cuerpo': d.resumen, 'Fecha límite': d.fechaLimite,
    'CCT destino': d.cct, 'Dirección destino': d.direccion, 'Modalidad': d.modalidad, 'Km (ida y vuelta)': d.km,
    'RFC': d.rfc, 'Cargo': d.cargo, 'Destino completo': d.destinoCompleto
  };
}

// Se llama con el candado tomado. Acepta una tanda ({documentos: [...]}, de 1
// a OF_MAX_TANDA) o un solo documento con sus campos sueltos (payload anterior).
// La tanda es todo o nada: se valida completa y, si no alcanzan los números
// del lote para todos, no se toma ninguno.
function ofTomarNumero_(x) {
  const comun = {
    elabora: ofTxt_(x.elabora),
    fecha: x.fechaElaboracion ? ofParsearFecha_(x.fechaElaboracion) : new Date(),
    vinculo: ofTxt_(x.vinculo).toUpperCase(), idEnvio: ofTxt_(x.idEnvio)
  };
  if (!comun.elabora) throw new Error('Indica quién elabora el documento.');
  if (!comun.fecha) throw new Error('Fecha de elaboración no válida.');
  const crudos = Array.isArray(x.documentos) && x.documentos.length ? x.documentos : [x];
  if (crudos.length > OF_MAX_TANDA) throw new Error('Una tanda puede tener hasta ' + OF_MAX_TANDA + ' documentos.');
  const docs = crudos.map(ofNormalizarDocumento_);
  ofCompletarPersonal_(docs);
  docs.forEach(function (d, k) { ofValidarDocumento_(d, docs.length > 1 ? k + 1 : 0); });
  if (comun.vinculo && docs.length > 1) throw new Error('Para responder un oficio se toma un solo número.');

  const hoja = ofObtenerHoja_(HOJA_OF_NUMEROS, ENCABEZADOS_OF_NUMEROS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const anio = ofAnioActual_();
  const salida = function (r) {
    return {
      numero: String(r[idx['Número']]), consecutivo: Number(r[idx['Consecutivo']]),
      persona: String(r[idx['Persona comisionada']] || ''),
      fechaEvento: idx['Fecha del evento'] === undefined ? '' : ofFechaIso_(r[idx['Fecha del evento']]),
      lugar: String(r[idx['Lugar / destino']] || ''),
      km: idx['Km (ida y vuelta)'] === undefined ? '' : r[idx['Km (ida y vuelta)']]
    };
  };

  // Reintento: un documento suelto guarda el idEnvio tal cual; una tanda, "<idEnvio>#1..N".
  if (comun.idEnvio) {
    const previas = filas.filter(function (r) {
      const id = String(r[idx['ID de envío']]);
      return id === comun.idEnvio || id.indexOf(comun.idEnvio + '#') === 0;
    }).map(salida).sort(function (a, b) { return a.consecutivo - b.consecutivo; });
    if (previas.length) {
      return {
        status: 'ok', duplicado: true, numeros: previas, numero: previas[0].numero,
        consecutivo: previas[0].consecutivo, lote: ofResumenLotes_(anio, filas, idx)
      };
    }
  }

  const antes = ofResumenLotes_(anio, filas, idx);
  if (antes.siguiente === null || antes.quedan < docs.length) {
    return { status: 'sin_lote', anio: anio, quedan: antes.quedan, pedidos: docs.length };
  }

  const nuevas = [];
  docs.forEach(function (d, k) {
    const consecutivo = ofResumenLotes_(anio, filas, idx).siguiente;
    const valores = ofValoresDocumento_(d);
    Object.assign(valores, {
      'Número': ofFormatearNumero_(consecutivo, anio), 'Consecutivo': consecutivo, 'Año': anio,
      'Tomado': new Date(), 'Elabora': comun.elabora, 'Fecha de elaboración': comun.fecha,
      'Estatus': 'Asignado', 'Vínculo': comun.vinculo, 'Notas': '', 'Historial': '',
      'ID de envío': comun.idEnvio && docs.length > 1 ? comun.idEnvio + '#' + (k + 1) : comun.idEnvio
    });
    const fila = ofArmarFila_(hoja, idx, valores);
    filas.push(fila);
    nuevas.push(fila);
  });
  if (docs.length > 1) {
    const tanda = nuevas[0][idx['Consecutivo']] + '-' + nuevas[nuevas.length - 1][idx['Consecutivo']];
    nuevas.forEach(function (f) { if (idx['Tanda'] !== undefined) f[idx['Tanda']] = tanda; });
  }
  // Todas las filas de la tanda en una sola escritura.
  hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, nuevas[0].length).setValues(nuevas);

  const resultado = nuevas.map(salida);
  if (/^OF-\d+$/.test(comun.vinculo)) ofAnotarSalidaEnOficio_(comun.vinculo, resultado[0].numero, comun.elabora);

  const despues = ofResumenLotes_(anio, filas, idx);
  ofAvisarSiQuedanPocos_(despues);
  return {
    status: 'ok', numeros: resultado, numero: resultado[0].numero,
    consecutivo: resultado[0].consecutivo, lote: despues
  };
}

// El número de salida queda anotado en el oficio que atiende, y el oficio queda
// Atendido (Forma "Oficio de salida"): tomar número para responder YA es atenderlo,
// sin un paso extra de "marcar como atendido" (página única, 8 oct 2026).
function ofAnotarSalidaEnOficio_(idOficio, numero, quien) {
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_OFICIOS)) return;
  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['ID']]) === idOficio; });
  if (i === -1) return;
  const filaHoja = i + 2;
  const set = function (encabezado, valor) { hoja.getRange(filaHoja, idx[encabezado] + 1).setValue(valor); };
  const actual = String(filas[i][idx['Oficio(s) de salida']] || '').trim();
  set('Oficio(s) de salida', actual ? actual + '; ' + numero : numero);
  if (!String(filas[i][idx['Forma de atención']]).trim()) set('Forma de atención', 'Oficio de salida');
  const estatus = String(filas[i][idx['Estatus']]).trim();
  if (estatus !== 'Atendido' && estatus !== 'Solo conocimiento') {
    set('Estatus', 'Atendido');
    set('Fecha de atención', new Date());
    const obs = String(filas[i][idx['Observaciones']] || '').trim();
    set('Observaciones', (obs ? obs + '\n' : '') + 'Atendido ' + Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy') +
      (quien ? ' por ' + quien : '') + ': respondido con el oficio ' + numero + '.');
  }
}

function ofCancelarNumero_(x) {
  const numero = ofTxt_(x.numero);
  const motivo = ofTxt_(x.motivo);
  const quien = ofTxt_(x.elabora);
  if (!motivo) throw new Error('Escribe por qué se cancela el número.');
  const hoja = ofObtenerHoja_(HOJA_OF_NUMEROS, ENCABEZADOS_OF_NUMEROS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['Número']]) === numero; });
  if (i === -1) throw new Error('No encontré el número ' + numero + '.');
  if (String(filas[i][idx['Estatus']]) === 'Cancelado') return { status: 'ok', numero: numero, duplicado: true };
  const nota = String(filas[i][idx['Notas']] || '').trim();
  const sello = Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy HH:mm');
  hoja.getRange(i + 2, idx['Estatus'] + 1).setValue('Cancelado');
  hoja.getRange(i + 2, idx['Notas'] + 1).setValue((nota ? nota + '\n' : '') +
    'Cancelado ' + sello + (quien ? ' por ' + quien : '') + ': ' + motivo);
  return { status: 'ok', numero: numero };
}

// Reasignar: un número que no salió (la comisión no se hizo, el oficio no se
// envió) se usa para otro documento. Conserva número y consecutivo; lo que
// decía antes queda en "Historial" con quién, cuándo y por qué.
function ofReasignarNumero_(x) {
  const numero = ofTxt_(x.numero);
  const motivo = ofTxt_(x.motivo);
  const quien = ofTxt_(x.quien);
  if (!motivo) throw new Error('Escribe por qué se reasigna el número.');
  const d = ofNormalizarDocumento_(x);
  ofCompletarPersonal_([d]);
  ofValidarDocumento_(d, 0);
  const elabora = ofTxt_(x.elabora);
  const fecha = x.fechaElaboracion ? ofParsearFecha_(x.fechaElaboracion) : null;
  if (x.fechaElaboracion && !fecha) throw new Error('Fecha de elaboración no válida.');

  const hoja = ofObtenerHoja_(HOJA_OF_NUMEROS, ENCABEZADOS_OF_NUMEROS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['Número']]) === numero; });
  if (i === -1) throw new Error('No encontré el número ' + numero + '.');
  const r = filas[i];
  if (String(r[idx['Estatus']]) === 'Cancelado') {
    throw new Error('El número ' + numero + ' está cancelado: ya no se puede reasignar.');
  }

  const fmt = function (v) { return v instanceof Date ? Utilities.formatDate(v, OF_ZONA, 'dd/MM/yyyy') : ofTxt_(v); };
  // Reintento tras un tiempo de espera: si ya dice exactamente eso, no se anota otra vez.
  const nuevos = ofValoresDocumento_(d);
  // Misma persona sin RFC nuevo (la página no recibe el RFC): se conserva el registrado.
  if (!d.rfc && idx['RFC'] !== undefined && d.persona === ofTxt_(r[idx['Persona comisionada']])) nuevos['RFC'] = ofTxt_(r[idx['RFC']]);
  if (elabora) nuevos['Elabora'] = elabora;
  if (fecha) nuevos['Fecha de elaboración'] = fecha;
  const igual = Object.keys(nuevos).every(function (h) { return idx[h] === undefined || fmt(r[idx[h]]) === fmt(nuevos[h]); });
  if (igual && ofTxt_(r[idx['Historial']]) && !ofTxt_(r[idx['Vínculo']])) {
    return { status: 'ok', duplicado: true, numero: numero, oficioReabierto: '', registro: ofNumeroParaPagina_(r, idx) };
  }
  const antes = [['Tipo', 'Tipo de documento'], ['Asunto', 'Asunto'], ['Dirigido a', 'Destino'],
    ['Persona', 'Persona comisionada'], ['Lugar', 'Lugar / destino'], ['Fecha', 'Fecha del evento'],
    ['Resumen', 'Resumen del cuerpo'], ['Elabora', 'Elabora'], ['Responde', 'Vínculo']]
    .filter(function (p) { return idx[p[1]] !== undefined && fmt(r[idx[p[1]]]); })
    .map(function (p) { return p[0] + ': ' + fmt(r[idx[p[1]]]); }).join('; ');
  const linea = Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy HH:mm') + (quien ? ' · ' + quien : '') +
    ' · ' + motivo + '. Antes: ' + (antes || '(sin datos)');
  const historial = ofTxt_(r[idx['Historial']]);
  const vinculoAnterior = ofTxt_(r[idx['Vínculo']]).toUpperCase();

  const valores = nuevos;
  valores['Historial'] = (historial ? historial + '\n' : '') + linea;
  valores['Vínculo'] = '';
  Object.keys(valores).forEach(function (h) { if (idx[h] !== undefined) r[idx[h]] = valores[h]; });
  hoja.getRange(i + 2, 1, 1, r.length).setValues([r]);

  let oficioReabierto = '';
  if (/^OF-\d+$/.test(vinculoAnterior)) {
    oficioReabierto = ofDesanotarSalidaEnOficio_(vinculoAnterior, numero, quien) ? vinculoAnterior : '';
  }
  return { status: 'ok', numero: numero, oficioReabierto: oficioReabierto, registro: ofNumeroParaPagina_(r, idx) };
}

// Inverso de ofAnotarSalidaEnOficio_: el número ya no responde ese oficio. Si
// era su única salida y quedó atendido por ella, el oficio vuelve a Recibido
// para que aparezca otra vez como pendiente. Devuelve true si lo reabrió.
function ofDesanotarSalidaEnOficio_(idOficio, numero, quien) {
  if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_OFICIOS)) return false;
  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['ID']]) === idOficio; });
  if (i === -1) return false;
  const filaHoja = i + 2;
  const set = function (encabezado, valor) { hoja.getRange(filaHoja, idx[encabezado] + 1).setValue(valor); };
  const salidas = String(filas[i][idx['Oficio(s) de salida']] || '').split(';')
    .map(function (s) { return s.trim(); }).filter(String)
    .map(function (s) { return s === numero ? numero + ' (reasignado)' : s; });
  set('Oficio(s) de salida', salidas.join('; '));
  const vigentes = salidas.filter(function (s) { return s.indexOf('(reasignado)') === -1; });
  const reabrir = !vigentes.length && String(filas[i][idx['Estatus']]).trim() === 'Atendido' &&
    String(filas[i][idx['Forma de atención']]).trim() === 'Oficio de salida';
  const obs = String(filas[i][idx['Observaciones']] || '').trim();
  set('Observaciones', (obs ? obs + '\n' : '') + Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy') +
    (quien ? ' ' + quien : '') + ': el oficio ' + numero + ' se reasignó a otro documento' +
    (reabrir ? '; este oficio vuelve a quedar pendiente.' : '.'));
  if (reabrir) {
    set('Estatus', 'Recibido');
    set('Forma de atención', '');
    if (idx['Fecha de atención'] !== undefined) set('Fecha de atención', '');
  }
  return reabrir;
}

function ofCicloDe_(fecha) {
  const y = fecha.getFullYear();
  return fecha.getMonth() >= 7 ? y + '-' + (y + 1) : (y - 1) + '-' + y; // agosto abre ciclo
}

// Clave de duplicado: folio de Oficialía de Partes + año de recepción.
// Vacío si no hay folio (oficio de la Oficina Virtual aún sin llevar a Oficialía):
// esos no chocan entre sí.
function ofClaveFolio_(folio, fecha) {
  const f = String(folio == null ? '' : folio).trim().toUpperCase();
  if (!f) return '';
  const anio = fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha.getFullYear() : '';
  return f + '|' + anio;
}

function ofSiguienteIdOficio_(filas, col) {
  let max = 0;
  filas.forEach(function (r) {
    const m = String(r[col] || '').match(/^OF-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  });
  return 'OF-' + ('000' + (max + 1)).slice(-4);
}

function ofSiguienteNp_(filas, idx, ciclo) {
  let max = 0;
  filas.forEach(function (r) {
    if (String(r[idx['Ciclo']]) === ciclo) max = Math.max(max, Number(r[idx['N.P.']]) || 0);
  });
  return max + 1;
}

// ── Paso 2D: marcar un oficio como atendido ──
// modo 'llegaSola'    → la acción ya llega sola a la bitácora (Mantenimiento,
//                       Asesorías, Formación Docente, Correo): Atendido sin fila nueva.
// modo 'bitacora'     → la acción se capturó en bitacora.html, que llama aquí al
//                       guardar con vinculo = BIT-NNNN.
// modo 'conocimiento' → no requiere acción: Estatus "Solo conocimiento".
// Se llama con el candado tomado. Repetirlo con el mismo vínculo no cambia nada.
function ofAtenderOficio_(x) {
  const id = ofTxt_(x.id).toUpperCase();
  const modo = ofTxt_(x.modo);
  const vinculo = ofTxt_(x.vinculo).toUpperCase();
  const quien = ofTxt_(x.elabora);
  if (OF_MODOS_ATENCION.indexOf(modo) === -1) throw new Error('Indica cómo se atendió el oficio.');
  if (modo === 'bitacora' && !/^BIT-\d+$/.test(vinculo)) throw new Error('Falta el ID de la actividad de la bitácora.');
  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['ID']]).toUpperCase() === id; });
  if (i === -1) throw new Error('No encontré el oficio ' + id + '.');
  const fila = i + 2;
  const r = filas[i];
  const set = function (encabezado, valor) { hoja.getRange(fila, idx[encabezado] + 1).setValue(valor); r[idx[encabezado]] = valor; };

  const actualVinculo = String(r[idx['Vínculo']] || '').trim();
  if (vinculo && actualVinculo.split(/;\s*/).indexOf(vinculo) === -1) {
    set('Vínculo', actualVinculo ? actualVinculo + '; ' + vinculo : vinculo);
  }
  const estatus = modo === 'conocimiento' ? 'Solo conocimiento' : 'Atendido';
  if (String(r[idx['Estatus']]) !== estatus) {
    set('Estatus', estatus);
    set('Fecha de atención', new Date());
    const forma = String(r[idx['Forma de atención']] || '').trim();
    if (modo === 'conocimiento') set('Forma de atención', 'Solo conocimiento');
    else if (!forma) set('Forma de atención', 'Acción');
    const textos = { llegaSola: 'la acción llega sola a la bitácora', bitacora: 'actividad ' + vinculo + ' en la bitácora', conocimiento: 'solo conocimiento' };
    const nota = ofTxt_(x.nota);
    const obs = String(r[idx['Observaciones']] || '').trim();
    set('Observaciones', (obs ? obs + '\n' : '') + 'Atendido ' + Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy') +
      (quien ? ' por ' + quien : '') + ': ' + textos[modo] + (nota ? ' (' + nota + ')' : '') + '.');
  }
  return { status: 'ok', oficio: ofOficioParaPagina_(r, idx) };
}

// Lectura sin candado, solo para decidir si vale la pena subir el PDF.
function ofOficioYaExiste_(x) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_OF_OFICIOS);
  if (!hoja) return false;
  const idx = ofIndices_(hoja);
  const idEnvio = ofTxt_(x.idEnvio);
  const clave = ofClaveFolio_(ofTxt_(x.folioOP), ofParsearFecha_(x.fechaRecepcion));
  return ofFilas_(hoja).some(function (r) {
    return (idEnvio && String(r[idx['ID de envío']]) === idEnvio) ||
      (clave && ofClaveFolio_(r[idx['Folio de Oficialía de Partes']], r[idx['Fecha de recepción']]) === clave);
  });
}

// Se llama con el candado tomado; `pdf` ya viene subido.
function ofRegistrarOficio_(x, pdf) {
  const d = {
    folioOP: ofTxt_(x.folioOP), recepcion: ofParsearFecha_(x.fechaRecepcion),
    numRemitente: ofTxt_(x.numRemitente),
    elaboracion: x.fechaElaboracion ? ofParsearFecha_(x.fechaElaboracion) : null,
    remitente: ofTxt_(x.remitente), asunto: ofTxt_(x.asunto), tipo: ofTxt_(x.tipo),
    recibio: ofTxt_(x.recibio), observaciones: ofTxt_(x.observaciones),
    direccion: ofTxt_(x.direccion), forma: ofTxt_(x.forma), idEnvio: ofTxt_(x.idEnvio),
    // Sin origen = página vieja en caché: se trata como Oficialía, igual que antes.
    origen: ofTxt_(x.origen) === OF_ORIGEN_INTERNO ? OF_ORIGEN_INTERNO : OF_ORIGEN_OP
  };
  const interno = d.origen === OF_ORIGEN_INTERNO;
  if (!interno && !d.folioOP) throw new Error('Escribe el folio de Oficialía de Partes (el del sello).');
  if (!d.recepcion) throw new Error('Fecha de recepción no válida.');
  if (x.fechaElaboracion && !d.elaboracion) throw new Error('Fecha de elaboración no válida.');
  if (!d.remitente) throw new Error('Escribe el remitente.');
  if (!d.asunto) throw new Error('Escribe el asunto.');
  if (!interno && !d.tipo) throw new Error('Elige el tipo de oficio.');
  if (d.forma && OF_FORMAS_ATENCION.indexOf(d.forma) === -1) throw new Error('Forma de atención no válida.');
  if (interno) {
    d.direccion = '';
    if (!d.forma) d.forma = 'Solo conocimiento';
  } else if (OF_DIRECCIONES.indexOf(d.direccion) === -1) {
    // "¿Baja o sube?" ya no se pregunta: se deduce (la página puede corregirla).
    d.direccion = ofDeducirDireccion_(d.tipo, d.remitente);
  }

  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);

  if (d.idEnvio) {
    const previa = filas.find(function (r) { return String(r[idx['ID de envío']]) === d.idEnvio; });
    if (previa) return { status: 'ok', duplicado: true, oficio: ofOficioParaPagina_(previa, idx) };
  }
  const clave = ofClaveFolio_(d.folioOP, d.recepcion);
  const repetido = clave && filas.find(function (r) {
    return ofClaveFolio_(r[idx['Folio de Oficialía de Partes']], r[idx['Fecha de recepción']]) === clave;
  });
  if (repetido) {
    return {
      status: 'repetido', id: String(repetido[idx['ID']]),
      mensaje: 'El folio ' + d.folioOP + ' de Oficialía de Partes ya está registrado como ' + repetido[idx['ID']] + '.'
    };
  }

  const ciclo = ofCicloDe_(d.recepcion);
  const estatus = d.forma === 'Solo conocimiento' ? 'Solo conocimiento' : 'Recibido';
  const fila = ofArmarFila_(hoja, idx, {
    'ID': ofSiguienteIdOficio_(filas, idx['ID']), 'N.P.': ofSiguienteNp_(filas, idx, ciclo), 'Ciclo': ciclo,
    'Folio de Oficialía de Partes': d.folioOP, 'Fecha de recepción': d.recepcion,
    'No. de oficio del remitente': d.numRemitente, 'Fecha de elaboración': d.elaboracion || '',
    'Remitente': d.remitente, 'Asunto': d.asunto, 'Tipo de oficio': d.tipo, 'Quién recibió': d.recibio,
    'Observaciones': d.observaciones, 'Dirección': d.direccion, 'Estatus': estatus,
    'Forma de atención': d.forma, 'Oficio(s) de salida': '', 'Vínculo': '', 'PDF': pdf,
    'Registrado': new Date(), 'ID de envío': d.idEnvio, 'Origen': d.origen
  });
  hoja.appendRow(fila);
  return { status: 'ok', oficio: ofOficioParaPagina_(fila, idx) };
}

// ── PDF a Drive: carpeta "Oficios OTDE" (compartida una vez) / AAAA-MM ──
function ofSubirPdf_(x) {
  const bytes = Utilities.base64Decode(x.pdfBase64);
  if (bytes.length > OF_TAMANO_MAX_BYTES) throw new Error('El PDF es demasiado grande (máximo 8 MB).');
  if (x.pdfTipo && x.pdfTipo !== 'application/pdf') throw new Error('Solo se aceptan archivos PDF.');
  const nombre = ofTxt_(x.folioOP || 'SIN-FOLIO') + ' — ' + ofTxt_(x.remitente).slice(0, 60) + ' — ' + ofTxt_(x.pdfNombre || 'oficio.pdf');
  const blob = Utilities.newBlob(bytes, 'application/pdf', nombre);
  const mes = String(x.fechaRecepcion || '').slice(0, 7) || Utilities.formatDate(new Date(), OF_ZONA, 'yyyy-MM');
  return ofCarpetaMes_(mes).createFile(blob).getUrl();
}

function ofCarpetaMes_(mes) {
  const raiz = DriveApp.getFoldersByName(OF_CARPETA_PDF);
  let carpeta;
  if (raiz.hasNext()) {
    carpeta = raiz.next();
  } else {
    carpeta = DriveApp.createFolder(OF_CARPETA_PDF);
    // Una sola vez: los archivos nuevos heredan el permiso (QA-NOTES #23).
    carpeta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  const sub = carpeta.getFoldersByName(mes);
  return sub.hasNext() ? sub.next() : carpeta.createFolder(mes);
}

// ── Importar el histórico del Excel "CONTROL DE OFICIOS 2026" ──
// La pestaña Importar trae la Hoja1 pegada tal cual: encabezados del Excel,
// N.P. que reinicia por ciclo y una fila separadora "CICLO ESCOLAR 2026-2027".
// Las filas anteriores a ese separador son del ciclo 2025-2026. Se salta lo
// ya importado (folio de Oficialía de Partes + año), así que se puede repetir.
function ofImportarHistorico() {
  const ui = SpreadsheetApp.getUi();
  const r = ofImportarHistorico_();
  ui.alert(r.mensaje);
}

function ofImportarHistorico_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const origen = ss.getSheetByName(HOJA_OF_IMPORTAR);
  if (!origen || origen.getLastRow() < 2) {
    return { importados: 0, mensaje: 'La pestaña Importar está vacía. Pega ahí la Hoja1 del Excel (con encabezados) y vuelve a intentar.' };
  }
  const datos = origen.getDataRange().getValues();
  const norm = function (v) {
    return String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  };
  const filaEnc = datos.findIndex(function (r) { return r.some(function (c) { return norm(c) === 'N.P.'; }); });
  if (filaEnc === -1) return { importados: 0, mensaje: 'No encontré la fila de encabezados (con "N.P.") en Importar.' };
  const enc = datos[filaEnc].map(norm);
  const col = function (texto) { return enc.findIndex(function (h) { return h.indexOf(texto) === 0; }); };
  const c = {
    np: col('N.P.'), folio: col('NO. DE FOLIO RECIBIDO'), recepcion: col('FECHA DE RECEPCION'),
    numRem: col('NO. DE OFICIO'), elaboracion: col('FECHA DE ELABORACION'), remitente: col('REMITENTE'),
    asunto: col('ASUNTO'), tipo: col('TIPO DE OFICIO'), recibio: col('QUIEN RECIBIO'), obs: col('OBSERVACIONES')
  };
  const faltan = Object.keys(c).filter(function (k) { return c[k] === -1; });
  if (faltan.length) return { importados: 0, mensaje: 'Faltan columnas en Importar: ' + faltan.join(', ') + '.' };

  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const existentes = ofFilas_(hoja);
  const vistos = {};
  existentes.forEach(function (r) {
    vistos[ofClaveFolio_(r[idx['Folio de Oficialía de Partes']], r[idx['Fecha de recepción']])] = true;
    // Una fila con fecha de recepción inválida se importó con la clave de su
    // fecha de elaboración: esa clave quedó en el ID de envío "IMPORT:…".
    const envio = String(r[idx['ID de envío']] || '');
    if (envio.indexOf('IMPORT:') === 0) vistos[envio.slice(7)] = true;
  });

  // Ciclo del primer bloque: el anterior al del primer separador, o el de su primera fecha.
  const separador = datos.slice(filaEnc + 1).find(function (r) { return /CICLO ESCOLAR\s+\d{4}-\d{4}/.test(norm(r.join(' '))); });
  let ciclo = null;
  if (separador) {
    const m = norm(separador.join(' ')).match(/(\d{4})-(\d{4})/);
    ciclo = (Number(m[1]) - 1) + '-' + Number(m[1]);
  }

  const nuevas = [];
  const avisos = [];
  let saltados = 0;
  let siguienteId = Number(ofSiguienteIdOficio_(existentes, idx['ID']).slice(3));
  datos.slice(filaEnc + 1).forEach(function (r, k) {
    const filaExcel = filaEnc + k + 2;
    const texto = norm(r.join(' '));
    const sep = texto.match(/CICLO ESCOLAR\s+(\d{4})-(\d{4})/);
    if (sep && !String(r[c.asunto]).trim()) { ciclo = sep[1] + '-' + sep[2]; return; }
    if (!String(r[c.folio]).trim()) {
      // Sin folio de Oficialía de Partes no es un oficio (en el Excel real, la
      // fila 55 solo trae "satua" en Asunto). Vacía: se ignora sin avisar.
      if (texto) avisos.push('Fila ' + filaExcel + ': sin folio de Oficialía de Partes, no se importó (' + texto.slice(0, 40) + ').');
      return;
    }

    let recepcion = ofFechaDeCelda_(r[c.recepcion]);
    let elaboracion = ofFechaDeCelda_(r[c.elaboracion]);
    let obs = String(r[c.obs] || '').trim();
    if (elaboracion && elaboracion.getFullYear() < 2020) {
      obs = (obs ? obs + ' ' : '') + '[Importación: fecha de elaboración no válida en el Excel (' +
        Utilities.formatDate(elaboracion, OF_ZONA, 'dd/MM/yyyy') + ').]';
      avisos.push('Fila ' + filaExcel + ' (folio ' + r[c.folio] + '): fecha de elaboración no válida, revisar.');
      elaboracion = null;
    }
    if (!recepcion || recepcion.getFullYear() < 2020) {
      const original = r[c.recepcion] instanceof Date ? Utilities.formatDate(r[c.recepcion], OF_ZONA, 'dd/MM/yyyy') : String(r[c.recepcion]);
      obs = (obs ? obs + ' ' : '') + '[Importación: fecha de recepción no válida en el Excel (' + original + ').]';
      avisos.push('Fila ' + filaExcel + ' (folio ' + r[c.folio] + '): fecha de recepción no válida (' + original + '), revisar.');
      recepcion = recepcion && recepcion.getFullYear() >= 2020 ? recepcion : null;
    }
    const fechaRef = recepcion || elaboracion;
    const cicloFila = ciclo || (fechaRef ? ofCicloDe_(fechaRef) : '');
    const claveDup = ofClaveFolio_(r[c.folio], fechaRef);
    if (vistos[claveDup]) { saltados++; return; }
    vistos[claveDup] = true;

    const remitente = String(r[c.remitente]).trim();
    const tipo = String(r[c.tipo]).replace(/\s+/g, ' ').trim();
    nuevas.push(ofArmarFila_(hoja, idx, {
      'ID': 'OF-' + ('000' + siguienteId++).slice(-4), 'N.P.': r[c.np], 'Ciclo': cicloFila,
      'Folio de Oficialía de Partes': String(r[c.folio]).trim(),
      'Fecha de recepción': recepcion || r[c.recepcion], 'No. de oficio del remitente': String(r[c.numRem]).trim(),
      'Fecha de elaboración': elaboracion || r[c.elaboracion], 'Remitente': remitente,
      'Asunto': String(r[c.asunto]).trim(), 'Tipo de oficio': tipo,
      'Quién recibió': ofTitulo_(String(r[c.recibio]).trim()), 'Observaciones': obs,
      'Dirección': ofDireccionProbable_(remitente),
      // El ciclo cerrado se da por atendido; el actual queda "Recibido" para que Jorge lo revise.
      'Estatus': cicloFila && cicloFila < ofCicloDe_(new Date()) ? 'Atendido' : 'Recibido',
      'Forma de atención': '', 'Oficio(s) de salida': '', 'Vínculo': '', 'PDF': '',
      'Registrado': new Date(), 'ID de envío': 'IMPORT:' + claveDup
    }));
  });
  if (nuevas.length) hoja.getRange(hoja.getLastRow() + 1, 1, nuevas.length, nuevas[0].length).setValues(nuevas);
  return {
    importados: nuevas.length, saltados: saltados, avisos: avisos,
    mensaje: 'Importados: ' + nuevas.length + '. Ya estaban: ' + saltados + '.' +
      (avisos.length ? '\n\nRevisar:\n' + avisos.join('\n') : '') +
      '\n\nLa columna Dirección se llenó por el remitente (escuelas y sectores = Sube); corrígela donde no aplique.'
  };
}

function ofFechaDeCelda_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const f = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), 12, 0, 0);
  return isNaN(f.getTime()) ? null : f;
}

function ofTitulo_(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

// Sube: lo manda la estructura (escuela, zona, supervisión, sector). Se decide
// solo por el remitente: un tipo "SOLICITUD…" puede ser la respuesta de CoEEE.
// Registro desde la página (13 oct 2026): las solicitudes (mantenimiento,
// asesoría, correo…) siempre suben; si no, se decide por el remitente. La misma
// regla vive en direccionDeducida() de oficios.html.
function ofDeducirDireccion_(tipo, remitente) {
  if (/^SOLICITUD/.test(String(tipo).trim().toUpperCase())) return 'Sube';
  return ofDireccionProbable_(remitente);
}

function ofDireccionProbable_(remitente) {
  const t = String(remitente).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
  return /\bESC\b|ESC\.|ESCUELA|PRIM\.|SECTOR|SUPERVISI|ZONA|\bCCT\b/.test(t) ? 'Sube' : 'Baja';
}

// ── Paso 2B (8 oct 2026): oficios que llegan por la Oficina Virtual ──
// Mantenimiento y Asesorías piden adjuntar el oficio en PDF. OTDE está obligada a
// imprimir todo oficio digital y llevarlo a Oficialía de Partes, que le pone su
// folio. Por eso cada solicitud nueva entra sola aquí (sin folio de Oficialía,
// con su PDF y el folio de la Oficina Virtual en Vínculo): la lista muestra cuáles
// faltan por imprimir y entregar, y "Anotar folio de Oficialía" la completa en el
// mismo registro (sin registrarla dos veces). Cuando la solicitud queda Resuelto o
// Rechazado en su sistema, el oficio pasa a Atendido solo; su acción ya llega sola
// a la bitácora (§26). Se jala con ?action=oficiosOV&token=PANEL_TOKEN&desde=, solo
// las solicitudes a partir de OF_OV_DESDE (el día en que se configuró la conexión,
// decisión de Jorge: no duplicar lo que ya está en el Excel histórico).
const OF_FUENTES_OV = [
  { nombre: 'Mantenimiento', prop: 'OV_MAN_URL', tipo: 'SOLICITUD DE MANTENIMIENTOS A EQUIPOS',
    asunto: function (it) { return 'Solicitud de mantenimiento a equipos de cómputo' + (it.detalle ? ': ' + it.detalle : '') + '.'; } },
  { nombre: 'Asesorías', prop: 'OV_ASE_URL', tipo: 'SOLICITUD DE ASESORÍA',
    asunto: function (it) { return 'Solicitud de asesoría' + (it.detalle ? ': ' + it.detalle : '') + '.'; } }
];
const OF_OV_CERRADOS = ['Resuelto', 'Rechazado'];

function ofConfigurarConexionOV() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const pedir = function (titulo, texto, actual) {
    const r = ui.prompt(titulo, texto + (actual ? '\n\nActual: ' + actual : ''), ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK) return null;
    return r.getResponseText().trim() || actual || '';
  };
  const man = pedir('Conexión con Mantenimiento', 'Pega la URL de la aplicación web de Mantenimiento (termina en /exec). Vacío = dejar la actual.', props.getProperty('OV_MAN_URL'));
  if (man === null) return;
  const ase = pedir('Conexión con Asesorías', 'Pega la URL de la aplicación web de Asesorías (termina en /exec). Vacío = dejar la actual.', props.getProperty('OV_ASE_URL'));
  if (ase === null) return;
  const token = pedir('Token del panel', 'Escribe el PANEL_TOKEN (el mismo del Panel OTDE y de la bitácora). Vacío = dejar el actual.', props.getProperty('PANEL_TOKEN') ? '(configurado)' : '');
  if (token === null) return;
  if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(man) || !/^https:\/\/script\.google\.com\/.+\/exec$/.test(ase)) {
    ui.alert('Alguna URL no parece de Apps Script (https://script.google.com/…/exec). No se guardó nada.');
    return;
  }
  props.setProperty('OV_MAN_URL', man);
  props.setProperty('OV_ASE_URL', ase);
  if (token && token !== '(configurado)') props.setProperty('PANEL_TOKEN', token);
  if (!props.getProperty('OF_OV_DESDE')) props.setProperty('OF_OV_DESDE', Utilities.formatDate(new Date(), OF_ZONA, 'yyyy-MM-dd'));
  ui.alert('Conexión guardada. Se traerán las solicitudes desde el ' + props.getProperty('OF_OV_DESDE') +
    '. Usa "Traer de la Oficina Virtual ahora" para probarla y después "Instalar sincronización automática".');
}

function ofInstalarSincronizacionOV() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'ofSincronizarOVAutomatico') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('ofSincronizarOVAutomatico').timeBased().everyMinutes(30).create();
  try { SpreadsheetApp.getUi().alert('Listo: las solicitudes de la Oficina Virtual se traerán solas cada 30 minutos. Confírmalo en Activadores.'); } catch (err) {}
}

function ofSincronizarOV() {
  const r = ofSincronizarOV_();
  SpreadsheetApp.getUi().alert(r.mensaje);
}

function ofSincronizarOVAutomatico() {
  const r = ofSincronizarOV_();
  if (r.errores.length) console.error(r.mensaje);
}

// Estado para la página: si hay conexión y cuándo fue la última sincronización.
function ofEstadoOV_() {
  const props = PropertiesService.getScriptProperties();
  return { conectada: !!(props.getProperty('OV_MAN_URL') && props.getProperty('PANEL_TOKEN')),
    ultima: props.getProperty('OF_OV_ULTIMA') || '' };
}

function ofSincronizarOV_() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('PANEL_TOKEN');
  const desde = props.getProperty('OF_OV_DESDE');
  if (!token || !desde) {
    return { nuevos: 0, cerrados: 0, errores: ['sin conexión'], mensaje: 'Falta configurar la conexión: menú OTDE Oficios → Configurar conexión con la Oficina Virtual.' };
  }
  // Primero se consulta todo (red, puede tardar) y luego se escribe bajo el candado.
  const errores = [];
  const lotes = OF_FUENTES_OV.map(function (fuente) {
    const url = props.getProperty(fuente.prop);
    if (!url) { errores.push(fuente.nombre + ': sin URL'); return { fuente: fuente, items: [] }; }
    try {
      const resp = UrlFetchApp.fetch(url + '?action=oficiosOV&token=' + encodeURIComponent(token) + '&desde=' + desde, { muteHttpExceptions: true });
      const d = JSON.parse(resp.getContentText());
      if (d.status !== 'ok') throw new Error(d.status === 'no_autorizado' ? 'token no autorizado' : (d.mensaje || d.status));
      return { fuente: fuente, items: d.items || [] };
    } catch (err) {
      errores.push(fuente.nombre + ': ' + (/Unexpected token|JSON/.test(err.message) ? 'la versión desplegada aún no tiene ?action=oficiosOV' : err.message));
      return { fuente: fuente, items: [] };
    }
  });

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let nuevos = 0, cerrados = 0;
  try {
    const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
    const idx = ofIndices_(hoja);
    const filas = ofFilas_(hoja);
    const porEnvio = {};
    filas.forEach(function (r, i) { porEnvio[String(r[idx['ID de envío']])] = i; });
    let siguienteId = Number(ofSiguienteIdOficio_(filas, idx['ID']).slice(3));
    const agregar = [];
    const hoyTxt = Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy');

    lotes.forEach(function (lote) {
      lote.items.forEach(function (it) {
        const clave = 'OV:' + it.folio;
        const cerrado = OF_OV_CERRADOS.indexOf(it.estatus) !== -1;
        const nota = cerrado ? 'Atendido ' + hoyTxt + ': ' + it.folio + ' quedó ' + it.estatus +
          ' en ' + lote.fuente.nombre + (it.estatus === 'Rechazado' && it.notas ? ' (' + it.notas + ')' : '') + '.' : '';
        if (porEnvio[clave] === undefined) {
          const recepcion = ofParsearFecha_(it.fecha) || new Date();
          const ciclo = ofCicloDe_(recepcion);
          const fila = ofArmarFila_(hoja, idx, {
            'ID': 'OF-' + ('000' + siguienteId++).slice(-4),
            'N.P.': ofSiguienteNp_(filas.concat(agregar), idx, ciclo), 'Ciclo': ciclo,
            'Folio de Oficialía de Partes': '', 'Fecha de recepción': recepcion,
            'No. de oficio del remitente': '', 'Fecha de elaboración': '',
            'Remitente': ofRemitenteOV_(it), 'Asunto': lote.fuente.asunto(it), 'Tipo de oficio': lote.fuente.tipo,
            'Quién recibió': OF_ORIGEN_OV, 'Observaciones': nota, 'Dirección': 'Sube',
            'Estatus': cerrado ? 'Atendido' : 'Recibido', 'Forma de atención': 'Acción',
            'Oficio(s) de salida': '', 'Vínculo': it.folio, 'PDF': /^https:\/\//.test(it.oficio) ? it.oficio : '',
            'Registrado': new Date(), 'ID de envío': clave, 'Fecha de atención': cerrado ? new Date() : '',
            'Origen': OF_ORIGEN_OV
          });
          agregar.push(fila);
          nuevos++;
          return;
        }
        const i = porEnvio[clave];
        const r = filas[i];
        const estatus = String(r[idx['Estatus']]).trim();
        if (cerrado && estatus !== 'Atendido' && estatus !== 'Solo conocimiento') {
          const filaHoja = i + 2;
          const obs = String(r[idx['Observaciones']] || '').trim();
          hoja.getRange(filaHoja, idx['Estatus'] + 1).setValue('Atendido');
          hoja.getRange(filaHoja, idx['Fecha de atención'] + 1).setValue(new Date());
          hoja.getRange(filaHoja, idx['Observaciones'] + 1).setValue((obs ? obs + '\n' : '') + nota);
          cerrados++;
        }
      });
    });
    if (agregar.length) hoja.getRange(hoja.getLastRow() + 1, 1, agregar.length, agregar[0].length).setValues(agregar);
    props.setProperty('OF_OV_ULTIMA', Utilities.formatDate(new Date(), OF_ZONA, 'yyyy-MM-dd HH:mm'));
  } finally {
    lock.releaseLock();
  }
  return {
    nuevos: nuevos, cerrados: cerrados, errores: errores,
    mensaje: 'Oficina Virtual: ' + nuevos + ' oficio(s) nuevo(s), ' + cerrados + ' atendido(s) solos.' +
      (errores.length ? '\n\nProblemas: ' + errores.join(' · ') : '')
  };
}

// "Esc. Prim. Benito Juárez, CCT 15DPR0000X, Sector V / Zona 12" (como en el Excel).
function ofRemitenteOV_(it) {
  const partes = [it.escuela || it.nombre, it.cct ? 'CCT ' + it.cct : ''];
  const sz = [it.sector ? 'Sector ' + it.sector : '', it.zona ? 'Zona ' + it.zona : ''].filter(String).join(' / ');
  return partes.concat(sz ? [sz] : []).filter(String).join(', ');
}

// Folio que puso Oficialía de Partes a un oficio que llegó por la Oficina Virtual
// (OTDE lo imprimió y lo entregó, o la escuela también mandó el impreso).
// Se llama con el candado tomado.
function ofAnotarFolioOP_(x) {
  const id = ofTxt_(x.id).toUpperCase();
  const folio = ofTxt_(x.folioOP);
  const quien = ofTxt_(x.elabora);
  if (!folio) throw new Error('Escribe el folio del sello de Oficialía de Partes.');
  const hoja = ofObtenerHoja_(HOJA_OF_OFICIOS, ENCABEZADOS_OF_OFICIOS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const i = filas.findIndex(function (r) { return String(r[idx['ID']]).toUpperCase() === id; });
  if (i === -1) throw new Error('No encontré el oficio ' + id + '.');
  const actual = String(filas[i][idx['Folio de Oficialía de Partes']] || '').trim();
  if (actual === folio) return { status: 'ok', oficio: ofOficioParaPagina_(filas[i], idx) };
  if (actual) throw new Error('Ese oficio ya tiene el folio ' + actual + '.');
  const clave = ofClaveFolio_(folio, filas[i][idx['Fecha de recepción']]);
  const otro = filas.find(function (r, j) {
    return j !== i && ofClaveFolio_(r[idx['Folio de Oficialía de Partes']], r[idx['Fecha de recepción']]) === clave;
  });
  if (otro) {
    return { status: 'repetido', id: String(otro[idx['ID']]),
      mensaje: 'El folio ' + folio + ' ya está en el oficio ' + otro[idx['ID']] + '. Revisa el número del sello.' };
  }
  const r = filas[i];
  hoja.getRange(i + 2, idx['Folio de Oficialía de Partes'] + 1).setValue(folio);
  r[idx['Folio de Oficialía de Partes']] = folio;
  const obs = String(r[idx['Observaciones']] || '').trim();
  const nota = 'Entregado a Oficialía de Partes (folio ' + folio + ') ' +
    Utilities.formatDate(new Date(), OF_ZONA, 'dd/MM/yyyy') + (quien ? ' por ' + quien : '') + '.';
  hoja.getRange(i + 2, idx['Observaciones'] + 1).setValue((obs ? obs + '\n' : '') + nota);
  r[idx['Observaciones']] = (obs ? obs + '\n' : '') + nota;
  return { status: 'ok', oficio: ofOficioParaPagina_(r, idx) };
}

// ── Oficio de comisión en Word ──
// RFC y cargo de quien está en el catálogo de personal (Config), si la página
// no los mandó (la página nunca recibe el RFC).
function ofCompletarPersonal_(docs) {
  const personal = ofLeerConfig_().personal;
  docs.forEach(function (d) {
    if (d.tipo !== OF_TIPO_COMISION) return;
    const p = personal.find(function (x) { return x.nombre === d.persona; });
    if (!p) return;
    if (!d.rfc) d.rfc = p.rfc.toUpperCase();
    if (!d.cargo) d.cargo = p.cargo;
  });
}

function ofConfigurarPlantillaComision() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const actual = props.getProperty('OF_PLANTILLA_COMISION_ID');
  const r = ui.prompt('Plantilla del oficio de comisión',
    'Sube PLANTILLA-COMISION.docx a tu Drive (como Word, sin convertir a Documentos de Google) y pega aquí su enlace.' +
    (actual ? '\n\nActual: ' + actual : ''), ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const m = r.getResponseText().match(/[-\w]{25,}/);
  if (!m) { ui.alert('No encontré el ID del archivo en ese enlace. No se guardó nada.'); return; }
  let archivo;
  try { archivo = DriveApp.getFileById(m[0]); } catch (err) { ui.alert('No pude abrir ese archivo: ' + err.message); return; }
  const faltan = ofCamposFaltantesPlantilla_(archivo.getBlob());
  if (faltan === null) { ui.alert('Ese archivo no es un Word (.docx). Súbelo sin convertir a Documentos de Google.'); return; }
  if (faltan.length) { ui.alert('A la plantilla le faltan estos campos: ' + faltan.join(', ') + '. No se guardó.'); return; }
  props.setProperty('OF_PLANTILLA_COMISION_ID', m[0]);
  ui.alert('Plantilla guardada: ' + archivo.getName() + '.');
}

const OF_CAMPOS_PLANTILLA = ['FECHA_OFICIO', 'NOMBRE', 'RFC', 'NUMERO', 'ANIO', 'MES', 'DESTINO', 'FECHA_COMISION',
  'MOTIVO', 'KM', 'MODALIDAD', 'NOMBRE_FIRMA', 'CARGO', 'INICIALES'];

function ofCamposFaltantesPlantilla_(blob) {
  let doc;
  try {
    doc = Utilities.unzip(blob.setContentType('application/zip')).find(function (b) { return b.getName() === 'word/document.xml'; });
  } catch (err) { return null; }
  if (!doc) return null;
  const xml = doc.getDataAsString('UTF-8');
  return OF_CAMPOS_PLANTILLA.filter(function (c) { return xml.indexOf('{{' + c + '}}') === -1; });
}

const OF_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
  'octubre', 'noviembre', 'diciembre'];
// Date → "05 de octubre de 2026"
function ofFechaLarga_(f) {
  return Utilities.formatDate(f, OF_ZONA, 'dd') + ' de ' + OF_MESES[Number(Utilities.formatDate(f, OF_ZONA, 'M')) - 1] +
    ' de ' + Utilities.formatDate(f, OF_ZONA, 'yyyy');
}

function ofXml_(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Iniciales del pie: firma + jefe de oficina + quien elabora ("AGC/JABT/nygd").
function ofIniciales_(elabora, personal) {
  const norm = function (t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  const p = personal.find(function (x) { return elabora && norm(x.nombre).indexOf(norm(elabora)) !== -1; });
  const ini = p ? p.iniciales : '';
  return ini && OF_FIRMA_INICIALES.split('/').indexOf(ini.toUpperCase()) === -1 ? OF_FIRMA_INICIALES + '/' + ini : OF_FIRMA_INICIALES;
}

// Un .docx por tanda: un oficio por página, en el orden en que se tomaron. La
// hoja del mapa NO se genera: Viáticos pide la impresión de Google Maps tal
// cual, así que la página da el botón "Abrir la ruta en Google Maps" (SEPRN →
// destino → SEPRN) y el equipo la imprime como siempre (12 oct 2026).
// x.km = {numero: km} corrige el kilometraje antes de generar, para que el
// oficio diga lo mismo que la impresión (Google Maps puede variar unos décimos).
function ofGenerarComision_(x) {
  const pedidos = (x.numeros || []).map(ofTxt_).filter(String);
  if (!pedidos.length) throw new Error('No llegó ningún número.');
  if (pedidos.length > OF_MAX_TANDA) throw new Error('Máximo ' + OF_MAX_TANDA + ' oficios por documento.');
  const idPlantilla = PropertiesService.getScriptProperties().getProperty('OF_PLANTILLA_COMISION_ID');
  if (!idPlantilla) throw new Error('Falta la plantilla del oficio de comisión. Jorge la configura en el Sheet: OTDE Oficios → Configurar plantilla de comisión.');
  const correcciones = x.km && typeof x.km === 'object' ? x.km : {};
  Object.keys(correcciones).forEach(function (n) {
    const v = Number(String(correcciones[n]).replace(',', '.'));
    if (!(v > 0 && v < 2000)) throw new Error('El kilometraje de ' + n + ' no es válido.');
    correcciones[n] = Math.round(v * 10) / 10;
  });

  const hoja = ofObtenerHoja_(HOJA_OF_NUMEROS, ENCABEZADOS_OF_NUMEROS);
  const idx = ofIndices_(hoja);
  const filas = ofFilas_(hoja);
  const personal = ofLeerConfig_().personal;
  const elegidas = pedidos.map(function (n) {
    const i = filas.findIndex(function (r) { return String(r[idx['Número']]) === n; });
    if (i === -1) throw new Error('No encontré el número ' + n + '.');
    const r = filas[i];
    if (String(r[idx['Tipo de documento']]) !== OF_TIPO_COMISION) throw new Error('El número ' + n + ' no es un oficio de comisión.');
    if (String(r[idx['Estatus']]) === 'Cancelado') throw new Error('El número ' + n + ' está cancelado.');
    return { i: i, r: r };
  }).sort(function (a, b) { return Number(a.r[idx['Consecutivo']]) - Number(b.r[idx['Consecutivo']]); });

  // Kilometraje corregido: queda en el Sheet y en el oficio.
  elegidas.forEach(function (e) {
    const n = String(e.r[idx['Número']]);
    if (!(n in correcciones) || idx['Km (ida y vuelta)'] === undefined) return;
    e.r[idx['Km (ida y vuelta)']] = correcciones[n];
    hoja.getRange(e.i + 2, idx['Km (ida y vuelta)'] + 1).setValue(correcciones[n]);
  });

  const archivos = Utilities.unzip(DriveApp.getFileById(idPlantilla).getBlob().setContentType('application/zip'));
  const porNombre = {};
  archivos.forEach(function (b) { porNombre[b.getName()] = b; });
  const docXml = porNombre['word/document.xml'].getDataAsString('UTF-8');
  const iBody = docXml.indexOf('<w:body>') + '<w:body>'.length;
  const iSect = docXml.lastIndexOf('<w:sectPr');
  const cuerpo = docXml.slice(iBody, iSect);

  const salto = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
  let docPr = 1000;
  const paginas = elegidas.map(function (e) {
    const r = e.r;
    const v = function (h) { return idx[h] === undefined ? '' : r[idx[h]]; };
    const fechaCom = v('Fecha del evento') instanceof Date ? v('Fecha del evento') : null;
    const fechaOf = v('Fecha de elaboración') instanceof Date ? v('Fecha de elaboración') : new Date();
    const nombre = ofTxt_(v('Persona comisionada'));
    const km = v('Km (ida y vuelta)');
    const campos = {
      FECHA_OFICIO: ofFechaLarga_(fechaOf), NOMBRE: nombre, RFC: ofTxt_(v('RFC')),
      NUMERO: String(v('Consecutivo')), ANIO: String(v('Año')),
      MES: fechaCom ? OF_MESES[Number(Utilities.formatDate(fechaCom, OF_ZONA, 'M')) - 1].replace(/^./, function (c) { return c.toUpperCase(); }) : '',
      DESTINO: ofTxt_(v('Destino completo')) || ofTxt_(v('Lugar / destino')),
      FECHA_COMISION: fechaCom ? ofFechaLarga_(fechaCom) : '', MOTIVO: ofTxt_(v('Asunto')),
      KM: km === '' ? '____' : String(km), MODALIDAD: ofTxt_(v('Modalidad')),
      NOMBRE_FIRMA: nombre.toUpperCase(), CARGO: ofTxt_(v('Cargo')).toUpperCase(),
      INICIALES: ofIniciales_(ofTxt_(v('Elabora')), personal)
    };
    const pag = cuerpo.replace(/\{\{([A-Z_]+)\}\}/g, function (m0, c) { return c in campos ? ofXml_(campos[c]) : m0; });
    // Varias copias del mismo cuerpo: ids de dibujo únicos y sin ids de párrafo repetidos.
    return pag.replace(/(<wp:docPr\b[^>]*\bid=")(\d+)"/g, function (m0, a) { return a + (++docPr) + '"'; })
      .replace(/ w14:paraId="[0-9A-F]+"/g, '').replace(/ w14:textId="[0-9A-F]+"/g, '')
      .replace(/ wp14:anchorId="[0-9A-F]+"/g, '');
  });

  const nuevoDoc = docXml.slice(0, iBody) + paginas.join(salto) + docXml.slice(iSect);
  porNombre['word/document.xml'] = Utilities.newBlob(nuevoDoc, 'application/xml', 'word/document.xml');

  const primero = elegidas[0].r;
  const ultimo = elegidas[elegidas.length - 1].r;
  const nombreArchivo = 'Comisión ' + primero[idx['Consecutivo']] +
    (elegidas.length > 1 ? '-' + ultimo[idx['Consecutivo']] : '') + ' — ' + ofTxt_(primero[idx['Asunto']]).slice(0, 50) + '.docx';
  const zip = Utilities.zip(Object.keys(porNombre).map(function (n) { return porNombre[n].setName(n); }), nombreArchivo)
    .setContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  const mes = Utilities.formatDate(primero[idx['Fecha de elaboración']] instanceof Date ? primero[idx['Fecha de elaboración']] : new Date(), OF_ZONA, 'yyyy-MM');
  const archivo = ofCarpetaComisiones_(mes).createFile(zip);
  const url = archivo.getUrl();
  if (idx['Oficio generado'] !== undefined) {
    elegidas.forEach(function (e) { hoja.getRange(e.i + 2, idx['Oficio generado'] + 1).setValue(url); });
  }
  return { status: 'ok', url: url, nombre: nombreArchivo, descarga: 'https://drive.google.com/uc?export=download&id=' + archivo.getId(),
    oficios: elegidas.length, km: correcciones };
}

function ofCarpetaComisiones_(mes) {
  const raiz = DriveApp.getFoldersByName(OF_CARPETA_COMISIONES);
  let carpeta;
  if (raiz.hasNext()) {
    carpeta = raiz.next();
  } else {
    carpeta = DriveApp.createFolder(OF_CARPETA_COMISIONES);
    // Mismo criterio que "Oficios OTDE": el equipo abre los archivos desde el
    // celular sin entrar a esta cuenta; la liga solo aparece detrás de la clave.
    carpeta.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  const sub = carpeta.getFoldersByName(mes);
  return sub.hasNext() ? sub.next() : carpeta.createFolder(mes);
}

function ofRespuesta_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.TEXT);
}
