// ============================================================
// SEPRN — Estrategias Nacionales: selección de escuelas
// (Oficina de Programas Educativos, Subjefatura Académica)
//
// Contexto: la oficina coordina 4 estrategias nacionales (Lectura,
// Escuela libre de violencia, Jornada por la Paz y contra las adicciones,
// Vive saludable Vive feliz). Cada mes, varios responsables eligen
// escuelas para trabajar una estrategia. Regla confirmada por Jorge
// (29 sep 2026): UNA escuela trabaja UNA sola estrategia en todo el ciclo
// — en cuanto queda seleccionada se congela para todas las estrategias y
// todos los meses. Es un BLOQUEO DURO en el servidor, no un aviso como en
// Ceremonias Cívicas (visitas-jefes.gs), porque aquí no existe la
// "revisita legítima".
//
// Mismo patrón que visitas-jefes.gs, recortado (clonado igual que
// asesorias.gs de mantenimiento.gs): Sheet y proyecto Apps Script propios,
// LockService para que dos responsables no tomen la misma escuela a la
// vez, folio por fila, doPost ramificado por accion. Sin ficha, fotos,
// trigger ni notificaciones — "solo registrar" por ahora.
//
// El congelado "por ciclo" sale solo de tener una Sheet por ciclo
// ("Estrategias_Nacionales_26-27"): el ciclo siguiente arranca con una
// Sheet nueva y todas las escuelas vuelven a quedar libres.
//
// IMPLEMENTACIÓN:
//   1. Crea el Google Spreadsheet "Estrategias_Nacionales_26-27"
//   2. Extensiones → Apps Script → pega este código completo
//   3. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   4. Copia la URL generada y pégala en estrategias-nacionales.html,
//      en la constante ESTRATEGIAS_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA "Selecciones" (una fila por escuela):
//   A Fecha de registro | B Folio | C Responsable | D Estrategia
//   E Mes (yyyy-MM) | F CCT | G Escuela | H Sector | I Zona | J Municipio
//   K Estatus | L Historial de cambios
// ============================================================

const HOJA_EN_SELECCIONES = 'Selecciones';
const HOJA_EN_RESUMEN = 'Resumen';
const EN_MAX_LOTE = 60; // techo por envío — un mes típico son ~10 escuelas por estrategia

const ENCABEZADOS_EN_SELECCIONES = [
  'Fecha de registro', 'Folio', 'Responsable', 'Estrategia', 'Mes',
  'CCT', 'Escuela', 'Sector', 'Zona', 'Municipio', 'Estatus', 'Historial de cambios'
];
const COL_EN_FOLIO = 2;
const COL_EN_RESPONSABLE = 3;
const COL_EN_ESTRATEGIA = 4;
const COL_EN_MES = 5;
const COL_EN_CCT = 6;
const COL_EN_ESCUELA = 7;
const COL_EN_ESTATUS = 11;
const COL_EN_HISTORIAL = 12;

const ESTADOS_EN_VALIDOS = ['Seleccionada', 'Cancelada'];
const ESTRATEGIAS_EN_VALIDAS = [
  'Estrategia Nacional de Lectura',
  'Escuela libre de violencia',
  'Jornada por la Paz y contra las adicciones',
  'Vive saludable, Vive feliz'
];
// Ciclo 2026-2027: septiembre a julio
const MESES_EN_CICLO = [
  '2026-09', '2026-10', '2026-11', '2026-12', '2027-01', '2027-02',
  '2027-03', '2027-04', '2027-05', '2027-06', '2027-07'
];

// ── doGet: disponibilidad pública (sin datos de contacto) ──
function doGet(e) {
  const accion = e && e.parameter && e.parameter.action;
  if (accion === 'disponibilidad') {
    return enListarSelecciones_();
  }
  return enTextResponse(JSON.stringify({ status: 'ok', servicio: 'SEPRN Estrategias Nacionales' }));
}

function enListarSelecciones_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_EN_SELECCIONES);
  if (!hoja || hoja.getLastRow() < 2) return enTextResponse(JSON.stringify({ status: 'ok', items: [] }));

  const items = hoja.getDataRange().getValues().slice(1)
    .filter(function (r) { return r[COL_EN_FOLIO - 1]; })
    .map(function (r) {
      return {
        folio: String(r[1]),
        responsable: r[2],
        estrategia: r[3],
        mes: enMesTexto_(r[4]),
        cct: String(r[5] || '').trim().toUpperCase(),
        escuela: r[6],
        sector: r[7],
        zona: r[8],
        municipio: r[9],
        estatus: String(r[COL_EN_ESTATUS - 1] || 'Seleccionada').trim(),
        fechaRegistro: r[0] instanceof Date ? Utilities.formatDate(r[0], 'America/Mexico_City', 'yyyy-MM-dd') : ''
      };
    });
  return enTextResponse(JSON.stringify({ status: 'ok', items: items }));
}

// ── doPost: seleccionar un lote de escuelas o cancelar una por folio ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (datos.accion === 'cancelar') return enDoPostCancelar_(datos);
    if (datos.accion === 'seleccionar') return enDoPostSeleccionar_(datos);
    throw new Error('Acción no reconocida.');
  } catch (err) {
    return enTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Seleccionar un lote: registra las escuelas libres y rechaza (con motivo)
// las que ya tienen estrategia este ciclo. Si dos responsables chocan, solo
// pierde lo que choca, no el lote completo. ──
function enDoPostSeleccionar_(datos) {
  const responsable = String(datos.responsable || '').trim();
  const estrategia = String(datos.estrategia || '').trim();
  const mes = String(datos.mes || '').trim();
  const escuelas = Array.isArray(datos.escuelas) ? datos.escuelas : [];

  if (!responsable) throw new Error('Indica el nombre del responsable.');
  if (ESTRATEGIAS_EN_VALIDAS.indexOf(estrategia) === -1) throw new Error('Estrategia inválida: ' + estrategia);
  if (MESES_EN_CICLO.indexOf(mes) === -1) throw new Error('Mes inválido: ' + mes);
  if (!escuelas.length) throw new Error('Selecciona al menos una escuela.');
  if (escuelas.length > EN_MAX_LOTE) throw new Error('Máximo ' + EN_MAX_LOTE + ' escuelas por envío.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = enObtenerHojaSelecciones_();
    const ocupadas = enMapaOcupadas_(hoja);
    let siguiente = enSiguienteNumeroFolio_(hoja);
    const ahora = new Date();
    const filasNuevas = [];
    const registradas = [];
    const rechazadas = [];

    escuelas.forEach(function (esc) {
      const cct = String(esc.cct || '').trim().toUpperCase();
      if (!cct) return;
      const previa = ocupadas[cct];
      if (previa) {
        rechazadas.push({
          cct: cct,
          escuela: esc.escuela || '',
          motivo: 'Ya trabaja "' + previa.estrategia + '" (' + previa.mes + '), seleccionada por ' + previa.responsable + '.'
        });
        return;
      }
      const folio = 'SEPRN-EN-' + String(siguiente++).padStart(4, '0');
      filasNuevas.push([
        ahora, folio, responsable, estrategia, mes, cct,
        String(esc.escuela || '').trim(), String(esc.sector || '').trim(),
        String(esc.zona || '').trim(), String(esc.municipio || '').trim(),
        'Seleccionada', ''
      ]);
      // Marca como ocupada dentro del mismo lote (evita un CCT repetido en el envío)
      ocupadas[cct] = { estrategia: estrategia, mes: mes, responsable: responsable };
      registradas.push({ cct: cct, escuela: esc.escuela || '', folio: folio });
    });

    if (filasNuevas.length) {
      // Mes como texto plano: si no, Sheets convierte "2026-10" en fecha
      hoja.getRange(hoja.getLastRow() + 1, 1, filasNuevas.length, ENCABEZADOS_EN_SELECCIONES.length)
        .setNumberFormats(filasNuevas.map(function () {
          return ENCABEZADOS_EN_SELECCIONES.map(function (_, i) { return i === 0 ? 'dd/MM/yyyy HH:mm' : '@'; });
        }))
        .setValues(filasNuevas);
    }

    return enTextResponse(JSON.stringify({ status: 'ok', registradas: registradas, rechazadas: rechazadas }));
  } finally {
    lock.releaseLock();
  }
}

// ── Cancelar por folio: libera la escuela para cualquier estrategia/mes ──
function enDoPostCancelar_(datos) {
  const folio = String(datos.folio || '').trim().toUpperCase();
  const motivo = String(datos.motivo || '').trim();
  if (!folio) throw new Error('Falta el folio.');
  if (!motivo) throw new Error('Indica el motivo de la cancelación.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = enObtenerHojaSelecciones_();
    const fila = enBuscarFilaPorFolio_(hoja, folio);
    if (!fila) throw new Error('No se encontró ninguna selección con folio "' + folio + '".');

    if (String(fila.datos[COL_EN_ESTATUS - 1] || '').trim() === 'Cancelada') {
      return enTextResponse(JSON.stringify({ status: 'ya_cancelada', mensaje: 'Esta selección ya estaba cancelada.', folio: folio }));
    }

    hoja.getRange(fila.rowIndex, COL_EN_ESTATUS).setValue('Cancelada');
    enRegistrarCambio_(hoja, fila.rowIndex, 'Cancelada — ' + motivo);
    return enTextResponse(JSON.stringify({
      status: 'ok', folio: folio, cct: fila.datos[COL_EN_CCT - 1], escuela: fila.datos[COL_EN_ESCUELA - 1]
    }));
  } finally {
    lock.releaseLock();
  }
}

// ── CCT → selección vigente (cualquier estrategia, cualquier mes del ciclo) ──
function enMapaOcupadas_(hoja) {
  const mapa = {};
  hoja.getDataRange().getValues().slice(1).forEach(function (r) {
    if (String(r[COL_EN_ESTATUS - 1] || '').trim() !== 'Seleccionada') return;
    const cct = String(r[COL_EN_CCT - 1] || '').trim().toUpperCase();
    if (!cct) return;
    mapa[cct] = { estrategia: r[COL_EN_ESTRATEGIA - 1], mes: enMesTexto_(r[COL_EN_MES - 1]), responsable: r[COL_EN_RESPONSABLE - 1] };
  });
  return mapa;
}

function enObtenerHojaSelecciones_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_EN_SELECCIONES);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_EN_SELECCIONES);
    hoja.appendRow(ENCABEZADOS_EN_SELECCIONES);
    hoja.getRange(1, 1, 1, ENCABEZADOS_EN_SELECCIONES.length)
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180); // Responsable
    hoja.setColumnWidth(4, 240); // Estrategia
    hoja.setColumnWidth(7, 220); // Escuela
    hoja.setColumnWidth(12, 260); // Historial
    const regla = SpreadsheetApp.newDataValidation()
      .requireValueInList(ESTADOS_EN_VALIDOS, true)
      .setAllowInvalid(false)
      .build();
    hoja.getRange(2, COL_EN_ESTATUS, 1000, 1).setDataValidation(regla);
  } else {
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_EN_SELECCIONES.length) {
      const faltantes = ENCABEZADOS_EN_SELECCIONES.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }
  return hoja;
}

function enBuscarFilaPorFolio_(hoja, folio) {
  const datos = hoja.getDataRange().getValues();
  const folioNorm = String(folio).trim().toUpperCase();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][COL_EN_FOLIO - 1]).trim().toUpperCase() === folioNorm) {
      return { rowIndex: i + 1, datos: datos[i] };
    }
  }
  return null;
}

function enSiguienteNumeroFolio_(hoja) {
  const prefix = 'SEPRN-EN-';
  const maxNum = hoja.getDataRange().getValues().slice(1)
    .map(row => String(row[COL_EN_FOLIO - 1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return maxNum + 1;
}

function enRegistrarCambio_(hoja, rowIndex, entrada) {
  const actual = String(hoja.getRange(rowIndex, COL_EN_HISTORIAL).getValue() || '').trim();
  const fechaStr = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  const nuevaLinea = '[' + fechaStr + '] ' + entrada;
  hoja.getRange(rowIndex, COL_EN_HISTORIAL).setValue(actual ? actual + '\n' + nuevaLinea : nuevaLinea);
}

// ── El mes se guarda como texto "yyyy-MM"; por si alguien lo edita a mano y
// Sheets lo convierte en fecha, se normaliza de vuelta. ──
function enMesTexto_(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, 'America/Mexico_City', 'yyyy-MM');
  return String(valor || '').trim();
}

// ── Hoja "Resumen": escuelas por estrategia × mes (menú del Sheet, no
// requiere redeploy) ──
function enActualizarResumen() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaSel = enObtenerHojaSelecciones_();
  let hoja = ss.getSheetByName(HOJA_EN_RESUMEN);
  if (!hoja) hoja = ss.insertSheet(HOJA_EN_RESUMEN);
  hoja.clear();

  const conteo = {};
  hojaSel.getDataRange().getValues().slice(1).forEach(function (r) {
    if (String(r[COL_EN_ESTATUS - 1] || '').trim() !== 'Seleccionada') return;
    const clave = r[COL_EN_ESTRATEGIA - 1] + '|' + enMesTexto_(r[COL_EN_MES - 1]);
    conteo[clave] = (conteo[clave] || 0) + 1;
  });

  const encabezado = ['Estrategia'].concat(MESES_EN_CICLO, ['Total']);
  const filas = ESTRATEGIAS_EN_VALIDAS.map(function (est) {
    const valores = MESES_EN_CICLO.map(function (m) { return conteo[est + '|' + m] || 0; });
    return [est].concat(valores, [valores.reduce(function (a, b) { return a + b; }, 0)]);
  });

  hoja.getRange(1, 1, 1, encabezado.length).setNumberFormat('@').setValues([encabezado])
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  hoja.getRange(2, 1, filas.length, encabezado.length).setValues(filas);
  hoja.setColumnWidth(1, 280);
  hoja.getRange(filas.length + 3, 1).setValue('Actualizado: ' +
    Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm'));
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SEPRN Estrategias')
    .addItem('Actualizar resumen por estrategia y mes', 'enActualizarResumen')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function enTextResponse(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
