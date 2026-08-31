// ============================================================
// SEPRN · OTDE — Router del webform (doGet/doPost)
// ============================================================
// Punto de entrada único. doPost enruta por datos.tipo. Los 4
// tipos del sistema viejo ya están migrados (6 → 4: Alta dee +
// Alta aulamexiquense se consolidaron en uno solo, mismo criterio
// para Cambio de Contraseña; Reset 2FA e Incidencias se migraron
// tal cual). Cada uno vive en su propio archivo Xxx.gs.
//
// CONSULTA DE FOLIO (Oficina Virtual OTDE, ago 2026): doGet(?action=
// consulta&folio=...&correo=...) enruta por el prefijo del folio a
// la hoja correcta y devuelve su "Estado general" si el folio y el
// correo coinciden, o {status:'no_encontrado'} en cualquier otro
// caso — ver manejarConsultaCorreo() abajo.
//
// PANEL OTDE (panel-otde.gs, en seprn-sitio/apps-script, Sheet aparte):
// doGet(?action=pendientes&token=...) devuelve las solicitudes de los
// 4 tipos que siguen en "Solicitud recibida". Configura el token una
// vez con configurarTokenPanel('un-secreto-largo') — el mismo valor
// usado en mantenimiento.gs/asesorias.gs/soporte-remoto.gs (repo
// seprn-sitio) y en panel-otde.gs.
// ============================================================

function doGet(e) {
  const accion = e && e.parameter && e.parameter.action;
  if (accion === 'consulta') {
    return manejarConsultaCorreo(e.parameter.folio, e.parameter.correo);
  }
  if (accion === 'pendientes') {
    return listarPendientesCorreo(e.parameter.token);
  }
  return textResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Webform Correos 2026-2027' }));
}

// ── Token del Panel OTDE — ver nota arriba. ──
function configurarTokenPanel(token) {
  PropertiesService.getScriptProperties().setProperty('PANEL_TOKEN', token);
}

// ── Lista de solicitudes abiertas de los 4 tipos para el Panel OTDE
// (?action=pendientes) — "abierta" = Estado general todavía en
// 'Solicitud recibida', mismo criterio exacto que ya usa resumenSemanal()
// en ResumenSemanal.gs (cada hoja solo tiene ese estado inicial y un
// estado final propio, nunca texto libre real en la práctica: lo escribe
// siempre altaRevisarEdicion/cambioRevisarEdicion/resetRevisarEdicion/
// incidenciaRevisarEdicion, nunca una persona a mano). Lee por nombre de
// encabezado (indexOfHeader), no por posición, porque las 4 hojas tienen
// columnas distintas entre sí. ──
function listarPendientesCorreo(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return textResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojas = [HOJA_ALTA, HOJA_CAMBIO, HOJA_RESET, HOJA_INCIDENCIAS];
  const items = [];

  hojas.forEach(function (nombreHoja) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;

    const datos = hoja.getDataRange().getValues();
    const headers = datos[0];
    const idxFolio = indexOfHeader(headers, 'Folio');
    const idxFecha = indexOfHeader(headers, 'Fecha');
    const idxNombre = indexOfHeader(headers, 'Nombre');
    const idxEscuela = indexOfHeader(headers, 'Escuela');
    const idxSector = indexOfHeader(headers, 'Sector');
    const idxZona = indexOfHeader(headers, 'Zona');
    const idxEstado = indexOfHeader(headers, 'Estado general');
    if (idxFolio === -1 || idxFecha === -1 || idxEstado === -1) return;

    datos.slice(1).forEach(function (fila) {
      if (!fila[idxFolio]) return;
      if (normalizarTexto(fila[idxEstado]) !== normalizarTexto('Solicitud recibida')) return;

      const fecha = fila[idxFecha];
      items.push({
        folio: fila[idxFolio],
        fecha: fecha instanceof Date ? fecha.toISOString() : String(fecha),
        nombre: idxNombre !== -1 ? fila[idxNombre] : '',
        escuela: idxEscuela !== -1 ? fila[idxEscuela] : '',
        sector: idxSector !== -1 ? fila[idxSector] : '',
        zona: idxZona !== -1 ? fila[idxZona] : '',
        estatus: fila[idxEstado],
        notas: ''
      });
    });
  });

  return textResponse(JSON.stringify({ status: 'ok', tramite: 'Correo Institucional', items: items }));
}

// ── Consulta de estatus por folio + correo (Oficina Virtual OTDE) ──
// Resuelve la hoja correcta por el prefijo del propio folio (las 4 hojas
// tienen columnas distintas entre sí, así que no hay una sola función de
// lectura compartible como en mantenimiento.gs/asesorias.gs). Expone
// "Estado general" tal cual — texto libre progresivo, sin vocabulario
// cerrado, a propósito no se migra a dropdown en esta ronda. Correo
// Personal e Institucional se aceptan como llave indistintamente (Alta solo
// tiene Correo Personal porque el institucional aún no existe en ese punto
// del trámite). Mismo mensaje genérico si el folio no existe o el correo no
// coincide, para no dejar adivinar folios válidos por descarte.
//
// El mapa de prefijo→hoja se arma DENTRO de la función a propósito, no como
// const de nivel superior: Apps Script concatena todos los .gs en un solo
// scope, pero el orden de evaluación de los const/let de nivel superior
// entre archivos no está garantizado — un const aquí que lea HOJA_ALTA
// (definida en Alta.gs) puede evaluarse antes de que Alta.gs corra la suya,
// y truena con "HOJA_ALTA is not defined" (bug real, encontrado al probar
// el endpoint recién desplegado). Dentro de la función no hay problema: para
// cuando doGet() se invoca, todos los archivos ya terminaron de evaluarse.
function manejarConsultaCorreo(folioBuscado, correoBuscado) {
  const mapaPrefijoHoja = {
    'OTDE-ALT-': HOJA_ALTA,
    'OTDE-CAM-': HOJA_CAMBIO,
    'OTDE-2FA-': HOJA_RESET,
    'OTDE-INC-': HOJA_INCIDENCIAS
  };
  const noEncontrado = function () {
    return textResponse(JSON.stringify({ status: 'no_encontrado' }));
  };
  if (!folioBuscado || !correoBuscado) return noEncontrado();

  const folio = String(folioBuscado).trim().toUpperCase();
  const prefijo = Object.keys(mapaPrefijoHoja).find(p => folio.startsWith(p));
  if (!prefijo) return noEncontrado();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(mapaPrefijoHoja[prefijo]);
  if (!hoja) return noEncontrado();

  const datos = hoja.getDataRange().getValues();
  const headers = datos[0];
  const idxFolio = indexOfHeader(headers, 'Folio');
  const idxFecha = indexOfHeader(headers, 'Fecha');
  const idxEstado = indexOfHeader(headers, 'Estado general');
  const idxCorreoPersonal = indexOfHeader(headers, 'Correo Personal');
  const idxCorreoInstitucional = indexOfHeaderAlias(headers, ['Correo Institucional', 'Correo Institucional Afectado']);

  const fila = datos.slice(1).find(r => String(r[idxFolio]).trim().toUpperCase() === folio);
  if (!fila) return noEncontrado();

  const correoBuscadoNorm = String(correoBuscado).trim().toLowerCase();
  const coincide =
    (idxCorreoPersonal !== -1 && String(fila[idxCorreoPersonal]).trim().toLowerCase() === correoBuscadoNorm) ||
    (idxCorreoInstitucional !== -1 && String(fila[idxCorreoInstitucional]).trim().toLowerCase() === correoBuscadoNorm);
  if (!coincide) return noEncontrado();

  return textResponse(JSON.stringify({
    status: 'ok',
    folio: fila[idxFolio],
    fecha: fila[idxFecha] instanceof Date ? fila[idxFecha].toISOString() : String(fila[idxFecha]),
    estatus: idxEstado !== -1 ? fila[idxEstado] : ''
  }));
}

function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);

    switch (datos.tipo) {
      case 'alta':
        return manejarAlta(datos);
      case 'cambioContrasena':
        return manejarCambioContrasena(datos);
      case 'reset2FA':
        return manejarReset2FA(datos);
      case 'incidencia':
        return manejarIncidencia(datos);
      default:
        throw new Error('Tipo de solicitud no reconocido: ' + datos.tipo);
    }

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}
