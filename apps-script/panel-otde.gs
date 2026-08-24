// ============================================================
// SEPRN · OTDE — Panel único de solicitudes pendientes
// Junta en una sola hoja lo que hoy vive repartido en 3 Google Sheets
// distintos (Mantenimiento, Asesorías, Soporte Técnico Remoto), para no
// tener que entrar a cada uno por separado a ver qué falta atender. La
// columna "Días" se marca en rojo/negrita cuando una solicitud lleva
// PANEL_UMBRAL_DIAS_ALERTA (3 por default) o más sin moverse, y el aviso
// de arriba de la hoja resume cuántas están en ese caso.
//
// Correo Institucional (OTDE-ALT-/-CAM-/-2FA-/-INC-) SÍ está incluido:
// su backend vive en un repo aparte (Correos-institucionales/
// webform-2026-2027/, WebApp.gs) con el mismo endpoint ?action=pendientes
// — ahí "abierta" significa Estado general todavía en "Solicitud
// recibida" (los 4 tipos solo tienen ese estado inicial y un estado
// final propio, nunca texto libre real en la práctica).
//
// IMPLEMENTACIÓN:
//   1. Crea un Google Sheet nuevo y vacío (ej. "Panel OTDE") — no reutilices
//      ninguno de los Sheets de los trámites.
//   2. Extensiones → Apps Script → pega este código completo.
//   3. En los 4 backends (mantenimiento.gs, asesorias.gs, soporte-remoto.gs
//      en seprn-sitio; WebApp.gs en Correos-institucionales/webform-2026-2027),
//      corre UNA vez desde el editor de cada uno:
//        manConfigurarTokenPanel('el-mismo-secreto-largo')
//        aseConfigurarTokenPanel('el-mismo-secreto-largo')
//        sopConfigurarTokenPanel('el-mismo-secreto-largo')
//        configurarTokenPanel('el-mismo-secreto-largo')   ← WebApp.gs (Correo)
//      (mismo valor exacto en los 4 — inventa un secreto largo cualquiera,
//      no tiene que ser memorizable, solo copiarlo y pegarlo una vez).
//   4. Aquí en el Panel, Configuración del proyecto → Propiedades del
//      script → agrega PANEL_TOKEN con ese mismo valor.
//   5. Vuelve a esta hoja y recarga — aparece el menú "Panel OTDE".
//      Menú → "Actualizar ahora" para la primera carga.
//   6. Opcional: Menú → "Activar actualización automática" para que se
//      refresque solo cada 30 minutos sin que tengas que abrir el Sheet.
//
// Las 4 URLs de abajo son las mismas que ya usa oficina-virtual.html —
// si alguna cambia de despliegue allá, actualízala también aquí.
// ============================================================

const PANEL_TRAMITES = [
  { nombre: 'Mantenimiento', url: 'https://script.google.com/macros/s/AKfycbxxhyMUI8VuuxC29fWgkMWULwLdB7OhNJ-XawgtdseZY5hgV9P6I9uHFfiCMbAJzZb1/exec' },
  { nombre: 'Asesorías', url: 'https://script.google.com/macros/s/AKfycbxwJFE7d9P4b2e7lVYvBx7FK9bBws53T9V6Q3yU7W-NboeecvnZCvWdkJG0nL8Pmz8q/exec' },
  { nombre: 'Soporte Técnico Remoto', url: 'https://script.google.com/macros/s/AKfycbynU6hEtN7W-Q2MsTEbRZJeGH946n3YcQptGiW6w6fMzgZ98J6mu33bEqSoK_1Oxtk/exec' },
  { nombre: 'Correo Institucional', url: 'https://script.google.com/macros/s/AKfycbwjy-jx1J0riVAlcAkuwAqKq9LMQVIxs4R_ikBIRPXXntO3FwMkGTPBf90W5A8FPAD7/exec' }
];

const HOJA_PANEL = 'Pendientes';
const ENCABEZADOS_PANEL = ['Trámite', 'Folio', 'Días', 'Fecha', 'Nombre', 'Escuela', 'Sector', 'Zona', 'Estatus', 'Notas'];

// A partir de cuántos días sin moverse una solicitud se marca como alerta
// en la columna "Días". Cámbialo aquí si 3 días es muy sensible o muy laxo.
const PANEL_UMBRAL_DIAS_ALERTA = 3;

// Mismos colores de badge que usa oficina-virtual.html, para que el panel
// se lea como el mismo sistema que el buscador de folio del sitio.
const PANEL_COLORES_ESTATUS = {
  'Pendiente de validar': { bg: '#e5eefb', fg: '#1d4e89' },
  'Validado':             { bg: '#e5eefb', fg: '#1d4e89' },
  'En atención':          { bg: '#fdf1d6', fg: '#8a6413' }
};
// Mismo rojo que oficina-virtual.html usa para "Rechazado" — aquí no hay
// choque posible porque Rechazado nunca aparece en este panel (se filtra).
const PANEL_COLOR_ALERTA = { bg: '#fdecec', fg: '#8a2020' };

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Panel OTDE')
    .addItem('Actualizar ahora', 'panelActualizar')
    .addSeparator()
    .addItem('Activar actualización automática (cada 30 min)', 'panelInstalarTrigger')
    .addItem('Desactivar actualización automática', 'panelDesinstalarTrigger')
    .addToUi();
}

// ── Trae las solicitudes abiertas de los 3 trámites y las escribe en la hoja ──
function panelActualizar() {
  const token = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!token) {
    try { SpreadsheetApp.getUi().alert('Falta configurar PANEL_TOKEN en Propiedades del script (ver instrucciones al inicio del código).'); } catch (err) {}
    return;
  }

  const filas = [];
  const errores = [];

  PANEL_TRAMITES.forEach(function (tramite) {
    const url = tramite.url + '?action=pendientes&token=' + encodeURIComponent(token);
    let respuesta;
    try {
      respuesta = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    } catch (err) {
      errores.push(tramite.nombre + ': ' + err.message);
      return;
    }
    let datos;
    try {
      datos = JSON.parse(respuesta.getContentText());
    } catch (err) {
      errores.push(tramite.nombre + ': respuesta no válida');
      return;
    }
    if (datos.status === 'no_autorizado') {
      errores.push(tramite.nombre + ': token no coincide con PANEL_TOKEN de ese backend');
      return;
    }
    if (datos.status !== 'ok') {
      errores.push(tramite.nombre + ': ' + (datos.status || 'error desconocido'));
      return;
    }
    (datos.items || []).forEach(function (item) {
      const fecha = item.fecha ? new Date(item.fecha) : null;
      const dias = fecha ? Math.floor((Date.now() - fecha.getTime()) / 86400000) : '';
      filas.push([
        tramite.nombre, item.folio, dias, fecha || item.fecha,
        item.nombre || '', item.escuela || '', item.sector || '', item.zona || '',
        item.estatus || '', item.notas || ''
      ]);
    });
  });

  // Más antiguo primero — lo que lleva más tiempo esperando sube arriba.
  filas.sort(function (a, b) {
    const da = typeof a[2] === 'number' ? a[2] : -1;
    const db = typeof b[2] === 'number' ? b[2] : -1;
    return db - da;
  });

  const hoja = panelObtenerHoja();
  const filasPrevias = hoja.getLastRow() - 1;
  if (filasPrevias > 0) {
    hoja.getRange(2, 1, filasPrevias, ENCABEZADOS_PANEL.length).clearContent().setBackground(null);
  }
  let enAlerta = 0;
  if (filas.length > 0) {
    hoja.getRange(2, 1, filas.length, ENCABEZADOS_PANEL.length).setValues(filas);
    panelColorearPorEstatus(hoja, filas);
    enAlerta = panelColorearAlertaDias(hoja, filas);
  }

  const celdaAviso = hoja.getRange(1, ENCABEZADOS_PANEL.length + 2);
  const lineaAlerta = enAlerta > 0
    ? '\n' + enAlerta + ' solicitud(es) llevan ' + PANEL_UMBRAL_DIAS_ALERTA + '+ días esperando'
    : '';
  celdaAviso.setValue(
    'Última actualización: ' + new Date().toLocaleString('es-MX') + lineaAlerta +
    (errores.length ? '\nErrores: ' + errores.join(' · ') : '')
  );
  celdaAviso.setBackground(enAlerta > 0 ? PANEL_COLOR_ALERTA.bg : null)
    .setFontColor(enAlerta > 0 ? PANEL_COLOR_ALERTA.fg : null)
    .setFontWeight(enAlerta > 0 ? 'bold' : 'normal');

  if (errores.length) {
    try { SpreadsheetApp.getUi().alert('Panel actualizado con errores:\n' + errores.join('\n')); } catch (err) {}
  }
}

// ── Obtener o crear la hoja "Pendientes" ──
function panelObtenerHoja() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_PANEL);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_PANEL);
    hoja.getRange(1, 1, 1, ENCABEZADOS_PANEL.length).setValues([ENCABEZADOS_PANEL])
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(1, 160); // Trámite
    hoja.setColumnWidth(5, 180); // Nombre
    hoja.setColumnWidth(6, 200); // Escuela
    hoja.setColumnWidth(10, 220); // Notas
  }
  return hoja;
}

// ── Colorea cada fila de datos según su Estatus (mismos colores del sitio) ──
function panelColorearPorEstatus(hoja, filas) {
  filas.forEach(function (fila, i) {
    const colores = PANEL_COLORES_ESTATUS[fila[8]];
    if (!colores) return;
    hoja.getRange(i + 2, 9).setBackground(colores.bg).setFontColor(colores.fg);
  });
}

// ── Marca en rojo/negrita la columna Días de lo que lleva demasiado tiempo
// esperando (PANEL_UMBRAL_DIAS_ALERTA o más) — regresa cuántas filas se
// marcaron, para el aviso resumido de arriba. ──
function panelColorearAlertaDias(hoja, filas) {
  let contador = 0;
  filas.forEach(function (fila, i) {
    const dias = fila[2];
    const celda = hoja.getRange(i + 2, 3);
    if (typeof dias === 'number' && dias >= PANEL_UMBRAL_DIAS_ALERTA) {
      celda.setBackground(PANEL_COLOR_ALERTA.bg).setFontColor(PANEL_COLOR_ALERTA.fg).setFontWeight('bold');
      contador++;
    } else {
      celda.setBackground(null).setFontColor(null).setFontWeight('normal');
    }
  });
  return contador;
}

// ── Actualización automática cada 30 minutos ──
function panelInstalarTrigger() {
  panelDesinstalarTrigger();
  ScriptApp.newTrigger('panelActualizar').timeBased().everyMinutes(30).create();
  try { SpreadsheetApp.getUi().alert('Actualización automática activada — cada 30 minutos.'); } catch (err) {}
}

function panelDesinstalarTrigger() {
  const quitados = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'panelActualizar';
  });
  quitados.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  if (quitados.length) {
    try { SpreadsheetApp.getUi().alert('Actualización automática desactivada.'); } catch (err) {}
  }
}
