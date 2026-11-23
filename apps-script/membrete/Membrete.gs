// ============================================================
// SEPRN · OTDE — Concentrados con membrete oficial (23 nov 2026)
// ============================================================
// Planeación pide que los concentrados de evidencias (correo institucional y
// Formación Docente) lleven el membrete de los oficios y las firmas de
// validación (jefe de oficina) y Vo. Bo. (Encargada del Despacho).
//
// ESTE MISMO ARCHIVO se sube a dos proyectos de Apps Script (Correo y
// Formación Docente; ver apps-script/proyectos-clasp.json): un solo lugar
// para el formato. Todo lleva prefijo mbt para no chocar con nada.
//
// Cómo funciona: una PLANTILLA de Google Docs con el membrete (encabezado con
// logos, leyenda del año y dependencia; pie con greca y dirección; colibrí
// como marca de agua) se copia para cada concentrado, el script llena el
// cuerpo (cifras, gráficas, tablas, firmas) y la guarda como PDF. El Doc se
// queda junto al PDF por si hay que corregir algo a mano antes de entregar.
//
// La plantilla:
//   - "Crear plantilla de membrete" la arma sola a partir de tres imágenes que
//     se suben a Drive con estos nombres exactos: membrete-logos.png,
//     membrete-greca.png y membrete-colibri.png (NO van en el repo: es
//     público). La marca de agua (colibrí) se pone a mano en Docs
//     (Insertar → Marca de agua): la API de Documentos no puede crearla.
//   - "Configurar plantilla de membrete" guarda la liga de una plantilla ya
//     hecha (el otro proyecto usa la misma). Script Property MBT_PLANTILLA_ID.
//   - Cada año cambia la leyenda: MBT_LEYENDA, y volver a crear la plantilla
//     (o editar el encabezado del Doc a mano).
// ============================================================

const MBT_LEYENDA = '“2026. Año del Humanismo Mexicano en el Estado de México”';
const MBT_LEYENDA_ANIO = '2026.';
const MBT_DEPENDENCIA = ['Subdirección de Educación Primaria en la Región de Nezahualcóyotl',
  'Oficina de Tecnología para el Desarrollo Educativo'];
const MBT_DIRECCION = 'Av. Texcoco 116, Col. Juárez Pantitlán, C.P. 57460, Cd. Nezahualcóyotl, Estado de México. ' +
  'Teléfono: 5558364000, exts.: 9065 y 0502.\notde.nezahualcoyotl@dee.edu.mx';
const MBT_FIRMAS = [
  { rol: 'VALIDÓ', nombre: 'MTRO. JORGE ALBERTO BONILLA TORRES',
    cargo: 'JEFE DE LA OFICINA DE TECNOLOGÍA PARA EL DESARROLLO EDUCATIVO' },
  { rol: 'Vo. Bo.', nombre: 'DRA. EN C. AVELINA GALINDO CELIX',
    cargo: 'ENCARGADA DEL DESPACHO DE LA SUBDIRECCIÓN DE EDUCACIÓN PRIMARIA EN LA REGIÓN DE NEZAHUALCÓYOTL' }
];
const MBT_IMAGENES = { logos: 'membrete-logos.png', greca: 'membrete-greca.png', colibri: 'membrete-colibri.png' };
const MBT_GUINDA = '#56212f';
const MBT_ACENTO = '#9F2241';
const MBT_ARENA = '#d6d1ca';
const MBT_GRIS = '#6b7280';
const MBT_FUENTE = 'Arial';
const MBT_ANCHO_UTIL = 504; // pt: carta vertical (612 pt) menos márgenes de 54 pt
const MBT_ANCHO_UTIL_PX = 672; // lo mismo en píxeles (las imágenes se miden en px)

// ── Menú: crea la plantilla con las tres imágenes de Drive ──
function mbtCrearPlantilla() {
  const ui = SpreadsheetApp.getUi();
  const blobs = {}, faltan = [];
  Object.keys(MBT_IMAGENES).forEach(function (k) {
    const it = DriveApp.getFilesByName(MBT_IMAGENES[k]);
    if (it.hasNext()) blobs[k] = it.next().getBlob(); else faltan.push(MBT_IMAGENES[k]);
  });
  if (faltan.length) {
    ui.alert('No encontré en Drive: ' + faltan.join(', ') + '. Súbelas con ese nombre exacto (con la cuenta OTDE) y vuelve a intentar.');
    return;
  }
  const doc = DocumentApp.create('Plantilla membrete concentrados OTDE');
  const body = doc.getBody();
  body.setPageWidth(612).setPageHeight(792)
    .setMarginTop(36).setMarginBottom(36).setMarginLeft(54).setMarginRight(54);

  const header = doc.addHeader();
  const pLogos = header.getParagraphs()[0];
  const logos = pLogos.appendInlineImage(blobs.logos);
  mbtEscalar_(logos, 440);
  const pLeyenda = header.appendParagraph(MBT_LEYENDA).setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  pLeyenda.editAsText().setFontFamily(MBT_FUENTE).setFontSize(10).setBold(true).setForegroundColor('#000000');
  pLeyenda.editAsText().setForegroundColor(1, MBT_LEYENDA_ANIO.length, MBT_ACENTO);
  pLeyenda.setSpacingBefore(6).setSpacingAfter(4);
  MBT_DEPENDENCIA.forEach(function (t) {
    const p = header.appendParagraph(t).setAlignment(DocumentApp.HorizontalAlignment.RIGHT).setSpacingAfter(0);
    p.editAsText().setFontFamily(MBT_FUENTE).setFontSize(7.5).setBold(true).setForegroundColor('#000000');
  });

  const footer = doc.addFooter();
  const pGreca = footer.getParagraphs()[0].setAlignment(DocumentApp.HorizontalAlignment.CENTER);
  mbtEscalar_(pGreca.appendInlineImage(blobs.greca), 560);
  MBT_DIRECCION.split('\n').forEach(function (t) {
    const p = footer.appendParagraph(t).setAlignment(DocumentApp.HorizontalAlignment.CENTER).setSpacingAfter(0);
    p.editAsText().setFontFamily(MBT_FUENTE).setFontSize(7.5).setForegroundColor('#000000');
  });

  body.getParagraphs()[0].setText('');
  doc.saveAndClose();
  PropertiesService.getScriptProperties().setProperty('MBT_PLANTILLA_ID', doc.getId());
  const url = 'https://docs.google.com/document/d/' + doc.getId() + '/edit';
  ui.showModalDialog(HtmlService.createHtmlOutput(
    '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' +
    '<p>Plantilla creada y guardada para este proyecto: <a href="' + url + '" target="_blank">abrirla</a>.</p>' +
    '<p><b>Falta un paso a mano:</b> en el Doc, Insertar → Marca de agua → Imagen → elige ' +
    '<b>' + MBT_IMAGENES.colibri + '</b> desde Drive, <b>quita</b> "Atenuado" y ajusta la escala para que llene la hoja.</p>' +
    '<p>En el otro proyecto (Correo o Formación Docente) usa "Configurar plantilla de membrete" y pega esta liga:</p>' +
    '<p style="font-size:12px;word-break:break-all">' + url + '</p></div>').setWidth(480).setHeight(300),
    'Plantilla de membrete');
}

// ── Menú: guarda la liga (o el ID) de una plantilla ya hecha ──
function mbtConfigurarPlantilla() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('Plantilla de membrete', 'Pega la liga del Google Doc de la plantilla.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const texto = r.getResponseText().trim();
  const m = texto.match(/\/d\/([a-zA-Z0-9_-]{20,})/) || texto.match(/^([a-zA-Z0-9_-]{20,})$/);
  if (!m) { ui.alert('No reconozco esa liga. Copia la dirección completa del Doc.'); return; }
  try {
    DocumentApp.openById(m[1]).getName();
  } catch (err) {
    ui.alert('No pude abrir ese Doc con esta cuenta (' + err.message + '). No se guardó.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('MBT_PLANTILLA_ID', m[1]);
  ui.alert('Plantilla guardada. Los concentrados ya salen con membrete.');
}

// InlineImage se mide en píxeles (setColumnWidth de las tablas, en puntos).
function mbtEscalar_(imagen, anchoPx) {
  const w = imagen.getWidth(), h = imagen.getHeight();
  imagen.setWidth(anchoPx).setHeight(Math.round(h * anchoPx / w));
  return imagen;
}

// ── Genera Doc + PDF con membrete en `carpeta`. Lanza error si no hay
// plantilla o algo falla: quien llama decide el plan B (PDF sin membrete).
//
// spec = { nombre, titulo, subtitulos: [texto], bloques: [...], pie }
// bloques:
//   { tipo: 'seccion', texto }
//   { tipo: 'parrafo', texto, chico: bool }
//   { tipo: 'pares', filas: [[etiqueta, valor]] }
//   { tipo: 'cifras', filas: [[etiqueta, número, explicación]] }
//   { tipo: 'tabla', encabezados: [], filas: [[]], anchos: [pt], resaltar: [índice de fila] }
//   { tipo: 'dosTablas', izq: {encabezados, filas}, der: {encabezados, filas} }
//   { tipo: 'graficas', blobs: [blob, blob] }
function mbtGenerarPdf_(spec, carpeta) {
  const idPlantilla = PropertiesService.getScriptProperties().getProperty('MBT_PLANTILLA_ID');
  if (!idPlantilla) throw new Error('falta configurar la plantilla de membrete');

  [spec.nombre, spec.nombre + '.pdf'].forEach(function (n) {
    const previos = carpeta.getFilesByName(n);
    while (previos.hasNext()) previos.next().setTrashed(true);
  });
  const copia = DriveApp.getFileById(idPlantilla).makeCopy(spec.nombre, carpeta);
  const doc = DocumentApp.openById(copia.getId());
  const body = doc.getBody();
  body.clear();
  const C = DocumentApp.HorizontalAlignment.CENTER;

  const parrafo = function (texto, o) {
    o = o || {};
    const p = body.appendParagraph(texto);
    p.setSpacingBefore(o.antes || 0).setSpacingAfter(o.despues === undefined ? 4 : o.despues).setLineSpacing(1);
    if (o.centro) p.setAlignment(C);
    p.editAsText().setFontFamily(MBT_FUENTE).setFontSize(o.tam || 9).setBold(!!o.negrita)
      .setForegroundColor(o.color || '#000000');
    return p;
  };
  const celdas = function (tabla, tam) {
    for (let r = 0; r < tabla.getNumRows(); r++) {
      const fila = tabla.getRow(r);
      for (let c = 0; c < fila.getNumCells(); c++) {
        const celda = fila.getCell(c);
        celda.setPaddingTop(1.5).setPaddingBottom(1.5).setPaddingLeft(3).setPaddingRight(3)
          .setVerticalAlignment(DocumentApp.VerticalAlignment.TOP);
        for (let k = 0; k < celda.getNumChildren(); k++) {
          const hijo = celda.getChild(k);
          if (hijo.getType() === DocumentApp.ElementType.PARAGRAPH) hijo.asParagraph().setSpacingAfter(0).setSpacingBefore(0);
        }
        celda.editAsText().setFontFamily(MBT_FUENTE).setFontSize(tam).setForegroundColor('#000000');
      }
    }
  };
  const tabla = function (encabezados, filas, anchos, tam, resaltar) {
    const t = body.appendTable([encabezados].concat(filas.length ? filas : [encabezados.map(function () { return ''; })]));
    t.setBorderColor('#bfbfbf').setBorderWidth(0.5);
    celdas(t, tam);
    for (let c = 0; c < encabezados.length; c++) {
      t.getRow(0).getCell(c).setBackgroundColor(MBT_ARENA).editAsText().setBold(true);
      if (anchos && anchos[c]) t.setColumnWidth(c, anchos[c]);
    }
    (resaltar || []).forEach(function (i) {
      const fila = t.getRow(i + 1);
      fila.getCell(fila.getNumCells() - 1).setBackgroundColor('#fbeaea').editAsText().setBold(true).setForegroundColor('#8a2020');
    });
    return t;
  };

  parrafo(spec.titulo, { tam: 12, negrita: true, color: MBT_GUINDA, centro: true, antes: 4, despues: 2 });
  (spec.subtitulos || []).forEach(function (s, k) {
    parrafo(s, { tam: k === 0 ? 9.5 : 8, negrita: k === 0, color: k === 0 ? MBT_GUINDA : MBT_GRIS, centro: true, despues: 2 });
  });

  (spec.bloques || []).forEach(function (b) {
    if (b.tipo === 'seccion') {
      parrafo(b.texto.toUpperCase(), { tam: 9.5, negrita: true, color: MBT_GUINDA, antes: 10, despues: 4 });
    } else if (b.tipo === 'parrafo') {
      parrafo(b.texto, { tam: b.chico ? 7.5 : 9, color: b.chico ? MBT_GRIS : '#000000' });
    } else if (b.tipo === 'pares') {
      const t = body.appendTable(b.filas.map(function (f) { return [String(f[0]), String(f[1])]; }));
      t.setBorderWidth(0);
      celdas(t, 8.5);
      t.setColumnWidth(0, 140).setColumnWidth(1, MBT_ANCHO_UTIL - 140);
      for (let r = 0; r < t.getNumRows(); r++) t.getRow(r).getCell(0).editAsText().setBold(true);
    } else if (b.tipo === 'cifras') {
      const t = body.appendTable(b.filas.map(function (f) { return [String(f[0]), String(f[1]), String(f[2])]; }));
      t.setBorderColor('#bfbfbf').setBorderWidth(0.5);
      celdas(t, 8.5);
      t.setColumnWidth(0, 170).setColumnWidth(1, 50).setColumnWidth(2, MBT_ANCHO_UTIL - 220);
      for (let r = 0; r < t.getNumRows(); r++) {
        t.getRow(r).getCell(0).editAsText().setBold(true);
        const n = t.getRow(r).getCell(1);
        n.getChild(0).asParagraph().setAlignment(C);
        n.editAsText().setBold(true).setFontSize(11).setForegroundColor(MBT_ACENTO);
        t.getRow(r).getCell(2).editAsText().setFontSize(7.5).setForegroundColor(MBT_GRIS);
      }
    } else if (b.tipo === 'tabla') {
      tabla(b.encabezados, b.filas, b.anchos, b.tam || 7.5, b.resaltar);
    } else if (b.tipo === 'dosTablas') {
      const marco = body.appendTable([['', '', '']]);
      marco.setBorderWidth(0);
      marco.setColumnWidth(0, 240).setColumnWidth(1, 24).setColumnWidth(2, 240);
      [[0, b.izq], [2, b.der]].forEach(function (par) {
        const celda = marco.getRow(0).getCell(par[0]);
        const datos = [par[1].encabezados].concat(par[1].filas.length ? par[1].filas : [['Sin registros', '']]);
        const t = celda.appendTable(datos.map(function (f) { return f.map(String); }));
        t.setBorderColor('#bfbfbf').setBorderWidth(0.5);
        celdas(t, 8);
        for (let c = 0; c < 2; c++) t.getRow(0).getCell(c).setBackgroundColor(MBT_ARENA).editAsText().setBold(true);
        t.setColumnWidth(0, 175).setColumnWidth(1, 55);
        celda.setPaddingLeft(0).setPaddingRight(0);
      });
    } else if (b.tipo === 'graficas') {
      const blobs = (b.blobs || []).filter(Boolean);
      if (!blobs.length) return;
      const marco = body.appendTable([blobs.map(function () { return ''; })]);
      marco.setBorderWidth(0);
      blobs.forEach(function (blob, i) {
        const celda = marco.getRow(0).getCell(i);
        celda.setPaddingLeft(0).setPaddingRight(0);
        const p = celda.getChild(0).asParagraph().setAlignment(C);
        mbtEscalar_(p.appendInlineImage(blob), Math.floor(MBT_ANCHO_UTIL_PX / blobs.length) - 12);
      });
    }
  });

  // Firmas
  parrafo('', { despues: 0, antes: 14 });
  const firmas = body.appendTable([MBT_FIRMAS.map(function (f) {
    return f.rol + '\n\n\n\n_________________________________\n' + f.nombre + '\n' + f.cargo;
  })]);
  firmas.setBorderWidth(0);
  MBT_FIRMAS.forEach(function (f, i) {
    const celda = firmas.getRow(0).getCell(i);
    celda.setPaddingLeft(8).setPaddingRight(8);
    for (let k = 0; k < celda.getNumChildren(); k++) {
      const hijo = celda.getChild(k);
      if (hijo.getType() === DocumentApp.ElementType.PARAGRAPH) hijo.asParagraph().setAlignment(C).setSpacingAfter(0);
    }
    const texto = celda.editAsText();
    texto.setFontFamily(MBT_FUENTE).setFontSize(8).setBold(false).setForegroundColor('#000000');
    const s = texto.getText();
    texto.setBold(0, f.rol.length - 1, true);
    const iNombre = s.indexOf(f.nombre);
    if (iNombre !== -1) texto.setBold(iNombre, iNombre + f.nombre.length - 1, true);
  });

  if (spec.pie) parrafo(spec.pie, { tam: 7, color: MBT_GRIS, antes: 12, despues: 0 });

  // body.clear() deja un párrafo vacío al inicio: se quita si sobra.
  const primero = body.getChild(0);
  if (primero.getType() === DocumentApp.ElementType.PARAGRAPH && !primero.asParagraph().getText() && body.getNumChildren() > 1) {
    try { primero.removeFromParent(); } catch (err) { /* Docs no deja quitar el último párrafo: se queda */ }
  }
  doc.saveAndClose();

  const pdf = carpeta.createFile(copia.getAs('application/pdf').setName(spec.nombre + '.pdf'));
  return { pdf: pdf, doc: copia };
}
