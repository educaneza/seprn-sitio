// ============================================================
// SEPRN · OTDE — Concentrado mensual de correo institucional (oct 2026)
// ============================================================
// Evidencia del N.P. 12 del reporte mensual de Planeación. Su medio de
// verificación es "Registro y seguimiento de solicitudes en la Oficina
// Virtual OTDE, en coordinación con la plataforma SIGEE", así que la
// evidencia es el propio registro: una pestaña "Concentrado AAAA-MM" con
// las cifras del mes, dos gráficas (por tipo y por sector) y la lista de
// folios atendidos con su NP SIGEE. El PDF se guarda solo en Drive (carpeta
// CONC_CARPETA, junto al Sheet) para meterlo en el PDF de evidencias del mes.
//
// "Atendida" = "Fecha de entrega" dentro del mes, el MISMO criterio que
// listarAtendidasMesCorreo_ (WebApp.gs), para que la cifra coincida con la
// fila CORREO:<mes> de la Bitácora OTDE.
//
// Va a Planeación: NUNCA lleva nombre, RFC, CURP, correos, teléfono,
// usuario ni contraseña. Solo folio, tipo, fechas, sector, zona, función y
// NP SIGEE.
//
// Menú "OTDE Correos → Generar concentrado del mes". Si la pestaña del mes
// ya existe, se reemplaza.
// ============================================================

const CONC_PREFIJO = 'Concentrado ';
const CONC_GUINDA = '#56212f';
const CONC_ARENA = '#d6d1ca';
const CONC_GRIS = '#6b7280';
const CONC_SECTORES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'SEPRN'];
const CONC_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CONC_COLUMNAS = 9;
const CONC_CARPETA = 'Evidencias Correo institucional';

// [hoja, nombre en el concentrado]. Se arma dentro de una función porque usa
// HOJA_* de otros archivos (ver manejarConsultaCorreo en WebApp.gs).
function concTipos_() {
  return [
    [HOJA_ALTA, 'Alta de cuenta'],
    [HOJA_CAMBIO, 'Cambio de contraseña'],
    [HOJA_RESET, 'Eliminación del método de autenticación'],
    [HOJA_CAMBIO_RESET, 'Cambio de contraseña y eliminación del método de autenticación'],
    [HOJA_INCIDENCIAS, 'Incidencia de acceso']
  ];
}

function generarConcentradoMesCorreo() {
  const ui = SpreadsheetApp.getUi();
  const tz = 'America/Mexico_City';
  const sugerido = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  const r = ui.prompt('Concentrado del mes',
    '¿Qué mes? Escríbelo como AAAA-MM (ejemplo: ' + sugerido + ').', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const mes = r.getResponseText().trim() || sugerido;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
    ui.alert('Formato no válido. Usa AAAA-MM, por ejemplo ' + sugerido + '.');
    return;
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const datos = concLeerMes_(ss, mes);
  const hoja = concArmarHoja_(ss, mes, datos);
  ss.setActiveSheet(hoja);

  const sinNp = datos.atendidas.filter(function (a) { return !a.np; }).length;
  let pdf = null, errorPdf = '';
  try {
    pdf = concGuardarPdf_(ss, hoja, mes);
  } catch (err) {
    errorPdf = err.message;
  }
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    '<p><b>' + datos.atendidas.length + '</b> solicitud' + (datos.atendidas.length === 1 ? '' : 'es') +
    ' atendida' + (datos.atendidas.length === 1 ? '' : 's') + ' en el mes.</p>' +
    (sinNp ? '<p style="color:#8a2020"><b>' + sinNp + '</b> sin NP SIGEE (marcadas en rojo). ' +
      'Conviene anotarlo y volver a generar: es lo que liga cada folio con SIGEE.</p>' : '<p>Todas tienen NP SIGEE.</p>') +
    (pdf
      ? '<p>PDF guardado en Drive, carpeta <b>' + CONC_CARPETA + '</b>: <a href="' + pdf.getUrl() + '" target="_blank">' +
        escapeHtml_(pdf.getName()) + '</a></p>'
      : '<p style="color:#8a2020">No se pudo guardar el PDF (' + escapeHtml_(errorPdf) + '). La pestaña sí quedó: ' +
        'Archivo → Descargar → PDF, hoja actual, horizontal.</p>') +
    '</div>').setWidth(440).setHeight(240);
  ui.showModalDialog(html, 'Concentrado ' + concNombreMes_(mes) + ' listo');
}

// Exporta la pestaña a PDF (horizontal, carta, sin cuadrícula) con la sesión
// del propio script y lo guarda en la carpeta CONC_CARPETA de Drive. Así no
// depende de con qué cuenta de Google esté abierto el navegador: una liga
// directa a /export abre con la cuenta principal del navegador y, si esa no
// tiene acceso al Sheet, Google muestra "Documentos de Google detectó un error"
// (pasó el 23 oct 2026). Si ya había un PDF del mismo mes, se manda a la
// papelera y queda el nuevo.
function concGuardarPdf_(ss, hoja, mes) {
  SpreadsheetApp.flush();
  const url = 'https://docs.google.com/spreadsheets/d/' + ss.getId() + '/export?format=pdf&gid=' + hoja.getSheetId() +
    '&portrait=false&size=letter&fitw=true&gridlines=false&printtitle=false&sheetnames=false' +
    '&pagenum=CENTER&top_margin=0.5&bottom_margin=0.5&left_margin=0.5&right_margin=0.5';
  const resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) throw new Error('Google respondió HTTP ' + resp.getResponseCode() + ' al exportar');
  const nombre = 'Concentrado correo institucional ' + mes + '.pdf';
  const carpeta = concCarpeta_();
  const previos = carpeta.getFilesByName(nombre);
  while (previos.hasNext()) previos.next().setTrashed(true);
  return carpeta.createFile(resp.getBlob().setName(nombre));
}

// Carpeta de evidencias junto al Sheet (misma carpeta padre). Se guarda su ID en
// Script Properties para no crear otra si alguien la renombra o la mueve.
function concCarpeta_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('CONC_CARPETA_ID');
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (err) { /* borrada o sin acceso: se crea otra */ }
  }
  const padres = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  const padre = padres.hasNext() ? padres.next() : DriveApp.getRootFolder();
  const existentes = padre.getFoldersByName(CONC_CARPETA);
  const carpeta = existentes.hasNext() ? existentes.next() : padre.createFolder(CONC_CARPETA);
  props.setProperty('CONC_CARPETA_ID', carpeta.getId());
  return carpeta;
}

// Cifras y lista de atendidas del mes, leyendo las 5 hojas por encabezado.
function concLeerMes_(ss, mes) {
  const tz = 'America/Mexico_City';
  const enMes = function (v) { return v instanceof Date && Utilities.formatDate(v, tz, 'yyyy-MM') === mes; };
  const txt = function (v) { return String(v == null ? '' : v).trim(); };
  const res = { recibidas: 0, rechazadas: 0, enProceso: 0, pendientesTotal: 0, atendidas: [], porTipo: {}, porSector: {} };

  concTipos_().forEach(function (t) {
    res.porTipo[t[1]] = 0;
    const hoja = ss.getSheetByName(t[0]);
    if (!hoja || hoja.getLastRow() < 2) return;
    const valores = hoja.getDataRange().getValues();
    const enc = valores[0];
    const i = {};
    ['Fecha', 'Folio', 'Sector', 'Zona', 'Función', 'NP SIGEE', 'Fecha subida a SIGEE',
      'Fecha de entrega', 'Motivo de rechazo', 'Estado general'].forEach(function (h) { i[h] = idxEncabezado_(enc, h); });
    const val = function (fila, h) { return i[h] === -1 ? '' : fila[i[h]]; };

    valores.slice(1).forEach(function (fila) {
      if (!txt(val(fila, 'Folio'))) return;
      const entrega = val(fila, 'Fecha de entrega');
      const rechazada = !!txt(val(fila, 'Motivo de rechazo')) || /rechaz/i.test(txt(val(fila, 'Estado general')));
      const atendida = entrega instanceof Date;
      if (!atendida && !rechazada) res.pendientesTotal++;
      if (enMes(val(fila, 'Fecha'))) {
        res.recibidas++;
        if (rechazada) res.rechazadas++;
        else if (!atendida) res.enProceso++;
      }
      if (!enMes(entrega)) return;
      const sector = txt(val(fila, 'Sector')) || 'Sin sector';
      res.porTipo[t[1]]++;
      res.porSector[sector] = (res.porSector[sector] || 0) + 1;
      res.atendidas.push({
        folio: txt(val(fila, 'Folio')).toUpperCase(),
        tipo: t[1],
        recepcion: val(fila, 'Fecha'),
        subida: val(fila, 'Fecha subida a SIGEE'),
        entrega: entrega,
        sector: sector,
        zona: txt(val(fila, 'Zona')),
        funcion: t[0] === HOJA_ALTA ? txt(val(fila, 'Función')) : '',
        np: txt(val(fila, 'NP SIGEE')).replace(/^#/, '')
      });
    });
  });
  res.atendidas.sort(function (a, b) {
    return a.entrega.getTime() - b.entrega.getTime() || (a.folio < b.folio ? -1 : a.folio > b.folio ? 1 : 0);
  });
  return res;
}

function concArmarHoja_(ss, mes, d) {
  const tz = 'America/Mexico_City';
  const nombre = CONC_PREFIJO + mes;
  const previa = ss.getSheetByName(nombre);
  if (previa) ss.deleteSheet(previa);
  const hoja = ss.insertSheet(nombre);
  hoja.setHiddenGridlines(true);
  [120, 190, 105, 120, 105, 70, 55, 150, 85].forEach(function (w, c) { hoja.setColumnWidth(c + 1, w); });

  const fecha = function (v) {
    return v instanceof Date ? Utilities.formatDate(v, tz, 'dd/MM/yyyy') : String(v == null ? '' : v).trim().split(' ')[0];
  };
  const titulo = function (fila, texto) {
    hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge().setValue(texto)
      .setFontWeight('bold').setBackground(CONC_GUINDA).setFontColor('#F9F8F5');
  };
  let fila = 1;

  hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge()
    .setValue('Concentrado mensual de solicitudes de correo institucional · ' + concNombreMes_(mes).toUpperCase())
    .setFontWeight('bold').setFontSize(14).setFontColor(CONC_GUINDA);
  fila++;
  hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge()
    .setValue('Oficina de Tecnología para el Desarrollo Educativo (OTDE) · Subdirección de Educación Primaria en la Región de Nezahualcóyotl')
    .setFontColor(CONC_GRIS);
  fila++;
  hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge()
    .setValue('N.P. 12. Gestionar las cuentas de correo institucional de las figuras educativas mediante la Oficina Virtual OTDE y la plataforma SIGEE. ' +
      'Medio de verificación: registro y seguimiento de solicitudes en la Oficina Virtual OTDE, en coordinación con la plataforma SIGEE.')
    .setWrap(true).setFontSize(9).setFontColor(CONC_GRIS);
  hoja.setRowHeight(fila, 32);
  fila += 2;

  // Cifras del mes
  titulo(fila, 'Cifras del mes');
  fila++;
  const cifras = [
    ['Atendidas en el mes', d.atendidas.length, 'Con fecha de entrega en el mes (incluye solicitudes recibidas antes).'],
    ['Recibidas en el mes', d.recibidas, 'Solicitudes nuevas en la Oficina Virtual OTDE.'],
    ['Recibidas en el mes y rechazadas', d.rechazadas, 'No corresponden al nivel o les faltó información.'],
    ['Recibidas en el mes y en proceso', d.enProceso, 'En trámite ante SIGEE al corte.'],
    ['Pendientes al corte (todos los meses)', d.pendientesTotal, 'Sin entrega ni rechazo, de cualquier mes.']
  ];
  hoja.getRange(fila, 1, cifras.length, 3).setValues(cifras);
  hoja.getRange(fila, 2, cifras.length, 1).setFontWeight('bold').setFontSize(12).setFontColor('#9F2241').setHorizontalAlignment('center');
  cifras.forEach(function (c, k) { hoja.getRange(fila + k, 3, 1, CONC_COLUMNAS - 2).merge().setFontColor(CONC_GRIS).setFontSize(9); });
  fila += cifras.length + 1;

  // Tablas por tipo y por sector (las gráficas leen de aquí)
  titulo(fila, 'Solicitudes atendidas por tipo y por sector');
  fila++;
  const tipos = Object.keys(d.porTipo).map(function (t) { return [t, d.porTipo[t]]; });
  const orden = function (s) { const k = CONC_SECTORES.indexOf(s); return k === -1 ? 99 : k; };
  const sectores = Object.keys(d.porSector).sort(function (a, b) { return orden(a) - orden(b); })
    .map(function (s) { return [s === 'SEPRN' ? 'Subdirección' : (s === 'Sin sector' ? s : 'Sector ' + s), d.porSector[s]]; });
  const filaTablas = fila;
  hoja.getRange(fila, 1, 1, 2).setValues([['Tipo', 'Atendidas']]);
  hoja.getRange(fila, 4, 1, 2).setValues([['Sector', 'Atendidas']]);
  hoja.getRange(fila, 1, 1, 2).setFontWeight('bold').setBackground(CONC_ARENA);
  hoja.getRange(fila, 4, 1, 2).setFontWeight('bold').setBackground(CONC_ARENA);
  hoja.getRange(fila + 1, 1, tipos.length, 2).setValues(tipos).setWrap(true);
  if (sectores.length) hoja.getRange(fila + 1, 4, sectores.length, 2).setValues(sectores);
  fila += Math.max(tipos.length, sectores.length) + 2;

  if (d.atendidas.length) {
    const opciones = function (chart, tituloGrafica) {
      return chart.setOption('title', tituloGrafica).setOption('legend', { position: 'none' })
        .setOption('colors', [CONC_GUINDA]).setOption('width', 470).setOption('height', 300)
        .setOption('hAxis', { minValue: 0, format: '0' }).setOption('vAxis', { minValue: 0, format: '0' });
    };
    hoja.insertChart(opciones(hoja.newChart().setChartType(Charts.ChartType.BAR)
      .addRange(hoja.getRange(filaTablas, 1, tipos.length + 1, 2)).setNumHeaders(1)
      .setPosition(fila, 1, 0, 0), 'Por tipo de solicitud').build());
    hoja.insertChart(opciones(hoja.newChart().setChartType(Charts.ChartType.COLUMN)
      .addRange(hoja.getRange(filaTablas, 4, sectores.length + 1, 2)).setNumHeaders(1)
      .setPosition(fila, 5, 0, 0), 'Por sector educativo').build());
    fila += 16; // espacio para las gráficas (300 px)
  }

  // Detalle de folios atendidos
  titulo(fila, 'Folios atendidos en el mes (' + d.atendidas.length + ')');
  fila++;
  hoja.getRange(fila, 1, 1, CONC_COLUMNAS).setValues([['Folio', 'Tipo', 'Recepción', 'Subida a SIGEE', 'Entrega', 'Sector', 'Zona', 'Función', 'NP SIGEE']])
    .setFontWeight('bold').setBackground(CONC_ARENA).setWrap(true);
  fila++;
  if (!d.atendidas.length) {
    hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge().setValue('Sin solicitudes atendidas este mes.').setFontStyle('italic').setFontColor(CONC_GRIS);
    fila += 2;
  } else {
    const filas = d.atendidas.map(function (a) {
      return [a.folio, a.tipo, fecha(a.recepcion), fecha(a.subida), fecha(a.entrega), a.sector, a.zona, a.funcion || '—', a.np || 'Sin NP'];
    });
    hoja.getRange(fila, 1, filas.length, CONC_COLUMNAS).setNumberFormat('@').setValues(filas)
      .setWrap(true).setVerticalAlignment('top').setFontSize(9)
      .setBorder(true, true, true, true, true, true, '#d1d5db', SpreadsheetApp.BorderStyle.SOLID);
    d.atendidas.forEach(function (a, k) {
      if (!a.np) hoja.getRange(fila + k, CONC_COLUMNAS).setFontColor('#8a2020').setBackground('#fbeaea').setFontWeight('bold');
    });
    fila += filas.length + 1;
  }

  hoja.getRange(fila, 1, 1, CONC_COLUMNAS).merge()
    .setValue('Fuente: Oficina Virtual OTDE (registro de solicitudes de correo institucional). NP SIGEE = número de solicitud en la plataforma SIGEE. ' +
      'Sin datos personales de las figuras educativas. Generado el ' + Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy HH:mm') + '.')
    .setWrap(true).setFontSize(8).setFontColor(CONC_GRIS);
  hoja.setRowHeight(fila, 28);
  return hoja;
}

function concNombreMes_(mes) {
  const p = mes.split('-');
  return CONC_MESES[Number(p[1]) - 1] + ' ' + p[0];
}
