// ============================================================
// SEPRN · OTDE — Seguimiento de SIGEE, tiempos y rechazos (oct 2026)
// ============================================================
// Tres problemas reales del trámite de Correo:
//   1. Solicitudes que nunca se suben a SIGEE (nadie se entera hasta que
//      el docente reclama).
//   2. No se sabe cuánto tarda cada parte: nosotros en subirla, SIGEE en
//      responder, nosotros en entregar.
//   3. Las solicitudes que se rechazan (duplicadas, de otro nivel, datos
//      mal) se quedaban en "Solicitud recibida" para siempre, sin aviso.
//
// Principio: quien atiende no captura más de lo que ya captura. Las fechas
// se anotan solas:
//   - Escribir el "NP SIGEE"           → anota "Fecha subida a SIGEE".
//   - Llenar usuario/contraseña (o
//     "¿Reset listo?" = Sí)            → anota "Fecha respuesta SIGEE"
//                                       (editable, por si se llena días
//                                       después de que SIGEE respondió).
//   - "Fecha de entrega" ya la anota cada tipo al enviar el correo final.
//   - Elegir un "Motivo de rechazo"    → Estado general = "Rechazada" y
//                                       correo al solicitante con el motivo.
//
// Las columnas se agregan solas AL FINAL de cada hoja (estas hojas no tienen
// auto-heal y se leen por encabezado), en el primer envío nuevo o con el menú
// "OTDE Correos → Preparar columnas de seguimiento SIGEE". El resumen semanal
// (ResumenSemanal.gs) usa segResumenSemanal_() para avisar lo que se atoró.
// ============================================================

const SEG_COL_NP = 'NP SIGEE';
const SEG_COL_SUBIDA = 'Fecha subida a SIGEE';
const SEG_COL_RESPUESTA = 'Fecha respuesta SIGEE';
const SEG_COL_MOTIVO = 'Motivo de rechazo';
const SEG_COL_RECHAZO_ENVIADO = 'Rechazo notificado';
const SEG_ESTADO_RECIBIDA = 'Solicitud recibida';
const SEG_ESTADO_RECHAZADA = 'Rechazada';
const SEG_DIAS_ALERTA_SIGEE = 2;   // sin NP SIGEE después de esto = atorada
const SEG_DIAS_TIEMPOS = 30;       // ventana para los tiempos promedio
const SEG_TZ = 'America/Mexico_City';

// Motivo → qué le decimos al solicitante que haga. Un motivo escrito a mano
// (la lista es suave) usa el texto genérico.
const SEG_MOTIVOS = {
  'Duplicada':
    'Ya tenemos otra solicitud tuya en proceso para la misma cuenta. No necesitas enviar una nueva: te avisaremos por la solicitud que sigue abierta.',
  'No corresponde a nuestro nivel':
    'OTDE atiende únicamente a escuelas y centros de trabajo de Educación Primaria de la Región Nezahualcóyotl. Te sugerimos acudir al área de tecnología de tu nivel o región. Si crees que es un error, escríbenos.',
  'Datos incorrectos o incompletos':
    'Algunos datos no coinciden o están incompletos (por ejemplo CCT, RFC, CURP o el correo). Envía una nueva solicitud revisando con cuidado la información.',
  'Otro':
    'Si tienes dudas sobre este motivo, escríbenos y con gusto te orientamos.'
};

// Se arma dentro de una función (no como const de nivel superior): Apps
// Script no garantiza el orden de evaluación entre archivos (ver WebApp.gs).
function segHojasCorreo_() {
  return [HOJA_ALTA, HOJA_CAMBIO, HOJA_RESET, HOJA_CAMBIO_RESET, HOJA_INCIDENCIAS];
}

// Columnas cuya captura significa "SIGEE ya respondió". En Reset no hay
// contraseña: el disparador es "¿Reset listo?" = Sí.
function segColumnasRespuesta_(nombreHoja) {
  return nombreHoja === HOJA_RESET ? ['¿Reset listo?'] : ['Usuario asignado', 'Contraseña asignada'];
}

// ── Busca una columna por encabezado; si no existe, la agrega al final. ──
function segAsegurarColumna_(hoja, nombre) {
  const ultimaCol = Math.max(hoja.getLastColumn(), 1);
  const encabezados = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0];
  const idx = indexOfHeader(encabezados, nombre);
  if (idx !== -1) return idx + 1;
  hoja.getRange(1, ultimaCol + 1).setValue(nombre)
    .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  return ultimaCol + 1;
}

// ── Prepara las columnas de seguimiento de una hoja (idempotente). ──
function segPrepararColumnas_(hoja) {
  segAsegurarColumna_(hoja, SEG_COL_NP);   // Alta ya la tiene (col R): no se duplica
  const colSubida = segAsegurarColumna_(hoja, SEG_COL_SUBIDA);
  const colRespuesta = segAsegurarColumna_(hoja, SEG_COL_RESPUESTA);
  const colMotivo = segAsegurarColumna_(hoja, SEG_COL_MOTIVO);
  const colEnviado = segAsegurarColumna_(hoja, SEG_COL_RECHAZO_ENVIADO);

  aplicarValidacionListaSuave_(hoja, colMotivo, Object.keys(SEG_MOTIVOS));
  [colSubida, colRespuesta].forEach(function (col) {
    hoja.getRange(2, col, 1000, 1).setNumberFormat('dd/MM/yyyy HH:mm');
  });
  // "Fecha subida" y "Rechazo notificado" las escribe el sistema; "Fecha
  // respuesta" se deja libre a propósito para poder corregirla.
  protegerColumnaAutomatica_(hoja, colSubida);
  protegerColumnaAutomatica_(hoja, colEnviado);
}

// ── "¿Qué pasó con tu método de autenticación?" (Eliminar autenticación y Cambio +
// Eliminar, oct 2026): la causa real de cada solicitud, para medir cuánto pesa perder
// o cambiar el celular. Opcional en el servidor (una página vieja en caché no la manda). ──
const SEG_COL_MOTIVO_PERDIDA = 'Motivo de pérdida de acceso';

function segAnotarEnFolio_(hoja, folio, encabezado, valor) {
  const texto = String(valor || '').trim();
  if (!texto) return;
  try {
    const col = segAsegurarColumna_(hoja, encabezado);
    const folios = hoja.getRange(1, colCorreo_(hoja, 'Folio'), hoja.getLastRow(), 1).getValues();
    for (let i = folios.length - 1; i >= 1; i--) {
      if (String(folios[i][0]).trim() === folio) {
        hoja.getRange(i + 1, col).setValue(texto);
        return;
      }
    }
  } catch (err) {
    Logger.log('No se pudo anotar ' + encabezado + ' en ' + folio + ': ' + err.message);
  }
}

// ── Menú: prepara las 5 hojas de una vez, sin esperar un envío nuevo. ──
function prepararSeguimientoSIGEE() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  segHojasCorreo_().forEach(function (nombre) {
    const hoja = ss.getSheetByName(nombre);
    if (hoja) segPrepararColumnas_(hoja);
  });
  try {
    SpreadsheetApp.getUi().alert('Listo: columnas de seguimiento SIGEE agregadas al final de las 5 hojas.\n\n' +
      '• Escribe el NP SIGEE y la fecha de subida se anota sola.\n' +
      '• Para rechazar una solicitud, solo elige el "Motivo de rechazo": se avisa al solicitante.');
  } catch (err) {}
}

// ── onEdit (llamado desde OnEdit.gs, después de la revisión de cada tipo). ──
function segRevisarEdicion_(e) {
  const hoja = e.range.getSheet();
  const nombreHoja = hoja.getName();
  if (segHojasCorreo_().indexOf(nombreHoja) === -1) return;

  const ultimaCol = hoja.getLastColumn();
  const headers = hoja.getRange(1, 1, 1, ultimaCol).getValues()[0]
    .map(function (h) { return (h || '').toString().trim(); });
  const idx = function (n) { return indexOfHeader(headers, n); };

  const iNP = idx(SEG_COL_NP);
  const iSubida = idx(SEG_COL_SUBIDA);
  const iRespuesta = idx(SEG_COL_RESPUESTA);
  const iMotivo = idx(SEG_COL_MOTIVO);
  const iResp = segColumnasRespuesta_(nombreHoja).map(idx).filter(function (i) { return i !== -1; });

  const colIni = e.range.getColumn();
  const colFin = colIni + e.range.getNumColumns() - 1;
  const toca = function (i) { return i !== -1 && i + 1 >= colIni && i + 1 <= colFin; };

  const tocaNP = toca(iNP) && iSubida !== -1;
  const tocaResp = iResp.some(toca) && iRespuesta !== -1;
  const tocaMotivo = toca(iMotivo);
  if (!tocaNP && !tocaResp && !tocaMotivo) return;

  const esReset = nombreHoja === HOJA_RESET;
  const filaIni = e.range.getRow();
  for (let f = filaIni; f < filaIni + e.range.getNumRows(); f++) {
    if (f === 1) continue;
    const v = hoja.getRange(f, 1, 1, ultimaCol).getValues()[0];

    if (tocaNP && String(v[iNP]).trim() && !v[iSubida]) {
      hoja.getRange(f, iSubida + 1).setValue(new Date());
    }
    if (tocaResp && !v[iRespuesta]) {
      const respondio = iResp.some(function (i) {
        return esReset ? esAfirmativo(v[i]) : String(v[i]).trim() !== '';
      });
      if (respondio) hoja.getRange(f, iRespuesta + 1).setValue(new Date());
    }
    if (tocaMotivo) segProcesarRechazo_(hoja, f, headers);
  }
}

// ── Rechazo: con motivo elegido, marca "Rechazada" y avisa una sola vez. ──
// No rechaza una solicitud ya entregada (estado final distinto de
// "Solicitud recibida"): ahí el motivo se queda como nota y nada más.
function segProcesarRechazo_(hoja, fila, headers) {
  const v = hoja.getRange(fila, 1, 1, headers.length).getValues()[0];
  const leer = function (n) {
    const i = indexOfHeader(headers, n);
    return i === -1 ? '' : (v[i] || '').toString().trim();
  };
  const motivo = leer(SEG_COL_MOTIVO);
  const iEstado = indexOfHeader(headers, 'Estado general');
  const iEnviado = indexOfHeader(headers, SEG_COL_RECHAZO_ENVIADO);
  if (!motivo || iEstado === -1 || iEnviado === -1) return;
  if (esAfirmativo(v[iEnviado])) return;

  const estado = normalizarTexto(v[iEstado]);
  if (estado && estado !== normalizarTexto(SEG_ESTADO_RECIBIDA) &&
      estado !== normalizarTexto(SEG_ESTADO_RECHAZADA)) return;

  try {
    segEnviarCorreoRechazo_(leer('Folio'), leer('Nombre'), leer('Apellido Paterno'), leer('Correo Personal'), motivo);
    hoja.getRange(fila, iEstado + 1).setValue(SEG_ESTADO_RECHAZADA);
    hoja.getRange(fila, iEnviado + 1).setValue('Sí');
    SpreadsheetApp.flush();
  } catch (err) {
    Logger.log('❌ Error notificando rechazo fila ' + fila + ': ' + err.message);
  }
}

function segEnviarCorreoRechazo_(folio, nombre, apellido, correo, motivo) {
  if (!correo) throw new Error('Sin correo personal');
  const queHacer = SEG_MOTIVOS[motivo] || SEG_MOTIVOS['Otro'];
  const html = altaEncabezadoHTML('OTDE — Oficina de Tecnología para el Desarrollo Educativo | Neza') +
    '<p style="margin:0 0 14px 0;font-size:15px;color:#1a1a1a;">Hola, <strong>' + escapeHtml_((nombre + ' ' + apellido).trim()) + '</strong>,</p>' +
    '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.7;">Revisamos tu solicitud y no pudo proceder. Te explicamos por qué:</p>' +
    altaCajaHTML('Folio', escapeHtml_(folio)) +
    altaCajaHTML('Motivo', escapeHtml_(motivo)) +
    '<p style="margin:0 0 20px 0;font-size:15px;color:#333333;line-height:1.7;"><strong>¿Qué sigue?</strong> ' + escapeHtml_(queHacer) + '</p>' +
    '<p style="margin:0 0 20px 0;"><a href="mailto:' + CONFIG.correoOTDE + '" style="color:#9F2241;font-weight:bold;font-size:15px;text-decoration:none;">' + CONFIG.correoOTDE + '</a></p>' +
    altaAvisoPieHTML() +
    altaFirmaHTML();

  enviarCorreoConModoPrueba_({
    to: correo,
    subject: 'Tu solicitud ' + folio + ' no pudo proceder — Correo institucional',
    htmlBody: html,
    name: CONFIG.remitente,
    replyTo: CONFIG.correoOTDE
  });
}

// ── Para el resumen semanal: lo atorado y los tiempos. ──
// Devuelve { html, hayAlgo }. "Días" son naturales, con un decimal.
function segResumenSemanal_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ahora = Date.now();
  const dia = 24 * 60 * 60 * 1000;
  const dias = function (a, b) { return (b.getTime() - a.getTime()) / dia; };
  const esFecha = function (x) { return x instanceof Date && !isNaN(x.getTime()); };

  const sinSubir = [];
  const entregadasSinNP = [];
  const rechazadas = {};
  const perdidas = {};
  const tramos = { subir: [], sigee: [], entregar: [] };

  segHojasCorreo_().forEach(function (nombreHoja) {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;
    const datos = hoja.getDataRange().getValues();
    const h = datos[0].map(function (x) { return (x || '').toString().trim(); });
    const i = {
      folio: indexOfHeader(h, 'Folio'), fecha: indexOfHeader(h, 'Fecha'),
      estado: indexOfHeader(h, 'Estado general'), np: indexOfHeader(h, SEG_COL_NP),
      subida: indexOfHeader(h, SEG_COL_SUBIDA), resp: indexOfHeader(h, SEG_COL_RESPUESTA),
      entrega: indexOfHeader(h, 'Fecha de entrega'), motivo: indexOfHeader(h, SEG_COL_MOTIVO),
      perdida: indexOfHeader(h, SEG_COL_MOTIVO_PERDIDA)
    };
    if (i.folio === -1 || i.fecha === -1 || i.estado === -1 || i.np === -1) return;

    datos.slice(1).forEach(function (r) {
      if (!r[i.folio]) return;
      const folio = String(r[i.folio]).trim();
      const fecha = r[i.fecha];
      const estado = normalizarTexto(r[i.estado]);
      const np = String(r[i.np] || '').trim();
      const entrega = i.entrega === -1 ? null : r[i.entrega];

      if (estado === normalizarTexto(SEG_ESTADO_RECIBIDA) && !np && esFecha(fecha) &&
          (ahora - fecha.getTime()) / dia > SEG_DIAS_ALERTA_SIGEE) {
        sinSubir.push({ folio: folio, tipo: nombreHoja, dias: Math.floor((ahora - fecha.getTime()) / dia) });
      }
      if (esFecha(entrega) && ahora - entrega.getTime() <= 7 * dia && !np) {
        entregadasSinNP.push({ folio: folio, tipo: nombreHoja });
      }
      if (estado === normalizarTexto(SEG_ESTADO_RECHAZADA) && i.motivo !== -1 &&
          esFecha(fecha) && ahora - fecha.getTime() <= SEG_DIAS_TIEMPOS * dia) {
        const m = String(r[i.motivo] || 'Sin motivo').trim();
        rechazadas[m] = (rechazadas[m] || 0) + 1;
      }
      if (i.perdida !== -1 && String(r[i.perdida] || '').trim() &&
          esFecha(fecha) && ahora - fecha.getTime() <= SEG_DIAS_TIEMPOS * dia) {
        const p = String(r[i.perdida]).trim();
        perdidas[p] = (perdidas[p] || 0) + 1;
      }
      if (esFecha(entrega) && ahora - entrega.getTime() <= SEG_DIAS_TIEMPOS * dia && esFecha(fecha)) {
        const subida = i.subida === -1 ? null : r[i.subida];
        const resp = i.resp === -1 ? null : r[i.resp];
        if (esFecha(subida)) tramos.subir.push(dias(fecha, subida));
        if (esFecha(subida) && esFecha(resp)) tramos.sigee.push(dias(subida, resp));
        if (esFecha(resp)) tramos.entregar.push(dias(resp, entrega));
      }
    });
  });

  sinSubir.sort(function (a, b) { return b.dias - a.dias; });
  const prom = function (arr) {
    if (!arr.length) return '—';
    const p = arr.reduce(function (a, b) { return a + Math.max(b, 0); }, 0) / arr.length;
    return p.toFixed(1) + ' días <span style="color:#7a6a5a;">(' + arr.length + ')</span>';
  };
  const fila = function (a, b, color) {
    return '<tr><td style="padding:8px 14px;font-size:13px;color:#333333;border-bottom:1px solid #e8e0d8;">' + a +
      '</td><td style="padding:8px 14px;font-size:13px;color:' + (color || '#9F2241') +
      ';font-weight:bold;text-align:right;border-bottom:1px solid #e8e0d8;">' + b + '</td></tr>';
  };
  const tabla = function (titulo, filas) {
    return '<p style="margin:0 0 8px 0;font-size:14px;color:#1a1a1a;font-weight:bold;">' + titulo + '</p>' +
      '<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e0d8;border-radius:4px;margin-bottom:22px;">' +
      filas + '</table>';
  };

  let html = '';
  if (sinSubir.length) {
    html += tabla('⚠️ Sin subir a SIGEE desde hace más de ' + SEG_DIAS_ALERTA_SIGEE + ' días (' + sinSubir.length + ')',
      sinSubir.slice(0, 25).map(function (s) {
        return fila(escapeHtml_(s.folio) + ' · ' + escapeHtml_(s.tipo), s.dias + ' días');
      }).join(''));
  }
  if (entregadasSinNP.length) {
    html += tabla('Entregadas esta semana sin NP SIGEE anotado (' + entregadasSinNP.length + ')',
      entregadasSinNP.slice(0, 25).map(function (s) {
        return fila(escapeHtml_(s.folio) + ' · ' + escapeHtml_(s.tipo), 'falta NP', '#977e5b');
      }).join(''));
  }
  const hayTiempos = tramos.subir.length || tramos.sigee.length || tramos.entregar.length;
  if (hayTiempos) {
    html += tabla('Tiempos promedio (entregadas en los últimos ' + SEG_DIAS_TIEMPOS + ' días)',
      fila('Nosotros: de la solicitud a subirla a SIGEE', prom(tramos.subir)) +
      fila('SIGEE: de la subida a su respuesta', prom(tramos.sigee)) +
      fila('Nosotros: de la respuesta de SIGEE a la entrega', prom(tramos.entregar)));
  }
  const motivos = Object.keys(rechazadas);
  if (motivos.length) {
    html += tabla('Rechazadas en los últimos ' + SEG_DIAS_TIEMPOS + ' días',
      motivos.map(function (m) { return fila(escapeHtml_(m), rechazadas[m], '#7a6a5a'); }).join(''));
  }
  const causas = Object.keys(perdidas).sort(function (a, b) { return perdidas[b] - perdidas[a]; });
  if (causas.length) {
    html += tabla('¿Por qué perdieron el acceso? (últimos ' + SEG_DIAS_TIEMPOS + ' días)',
      causas.map(function (c) { return fila(escapeHtml_(c), perdidas[c], '#7a6a5a'); }).join(''));
  }
  return { html: html, hayAlgo: !!(sinSubir.length || entregadasSinNP.length) };
}
