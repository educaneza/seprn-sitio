// ============================================================
// SEPRN · OTDE — Soporte Técnico Remoto
// Endpoint para solicitudes de soporte remoto (TeamViewer)
// Registra en Sheets y notifica por Telegram al equipo OTDE
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token que te da @BotFather
//        TELEGRAM_CHAT_ID   = chat_id que te devuelve getUpdates
//      (ver instrucciones para obtenerlos al final de este archivo)
//   4. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL generada y pégala en otde.html
//      en la constante SOPORTE_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA: ver ENCABEZADOS_SOPORTE abajo (orden por bloques del formulario,
// oct 2026). El código las lee y escribe por nombre, no por letra de columna.
//
// CIERRE AUTOMÁTICO (ago 2026, mismo patrón que mantenimiento.gs/
// asesorias.gs): al marcar Estatus = "Resuelto", un trigger onEdit
// instalable (sopOnEditCierre) notifica por correo al solicitante.
// A diferencia de Mantenimiento/Asesorías, Soporte no tiene hoja de
// Contactos_Zona_Sector ni avisa a Zona/Sector — decisión deliberada,
// no un pendiente olvidado. Requiere correr UNA vez
// sopInstalarTriggerCierre() (o el menú "OTDE Soporte" que crea
// onOpen()) después de pegar esta versión.
//
// CONSULTA DE FOLIO (Oficina Virtual OTDE): doGet(?action=consulta&
// folio=...&correo=...) devuelve estatus/fecha/notas si el folio y
// el correo coinciden, o {status:'no_encontrado'} en cualquier otro
// caso.
//
// PANEL OTDE (panel-otde.gs, Sheet aparte): doGet(?action=pendientes&
// token=...) devuelve todas las solicitudes abiertas. Configura el
// token una vez con sopConfigurarTokenPanel('un-secreto-largo') antes
// de usarlo.
// ============================================================

const HOJA_SOPORTE = 'Solicitudes_Soporte_2026';

// Orden por bloques, el mismo en que se llena soporte.html (oct 2026). El código lee y
// escribe SIEMPRE por nombre de encabezado: filas canónicas (sopFilasCanonicas_/
// sopFilaCanonica_, fila[SOP['Estatus']]) y sopCol_(hoja, nombre) para escribir. Mover o
// insertar columnas ya no rompe nada; para dejar una hoja vieja en este orden, menú
// "OTDE Soporte → Reordenar columnas". Una columna nueva va en su bloque.
const ENCABEZADOS_SOPORTE = [
  // 1. Registro
  'Fecha', 'Folio',
  // 2. Quién la pide
  'Nombre', 'Función/Cargo', 'WhatsApp', 'Correo',
  // 3. Centro de trabajo
  'CCT', 'Escuela/Unidad', 'Sector', 'Zona',
  // 4. La solicitud
  'Tipo de ayuda', 'Urgencia', 'Descripción',
  // 5. Atención (Alejandro). "Fecha de atención" la anota sopOnEditCierre al marcar
  //    Resuelto, para que la Bitácora OTDE cuente cada solicitud en su mes (?action=soporteMes)
  'Estatus', 'Notas de revisión', 'Fecha de atención',
  // 6. Automáticas
  'Notificación de cierre enviada', 'ID de envío'
];
// { 'Encabezado': índice 0-based } dentro de una fila canónica.
const SOP = ENCABEZADOS_SOPORTE.reduce(function (m, h, i) { m[h] = i; return m; }, {});
// Ventana del respaldo anti-duplicados para envíos sin idEnvio (páginas viejas en caché):
// misma CCT + correo + descripción dentro de estos minutos = mismo envío.
const SOP_VENTANA_DUPLICADO_MIN = 10;
const ESTADOS_SOP_VALIDOS = ['Pendiente de validar', 'Validado', 'En atención', 'Resuelto', 'Rechazado'];
// Notificación de "nueva solicitud" por correo, además del Telegram de abajo
// (sep 2026) — Alejandro atiende Soporte y Mantenimiento, decisión de Jorge.
const SOP_CORREO_EQUIPO = 'alejandro.morales@dee.edu.mx';

// ── Lectura y escritura por nombre de encabezado ──
function sopIndicesReales_(filaEncabezados) {
  const mapa = {};
  filaEncabezados.forEach(function (h, i) {
    const nombre = String(h).trim();
    if (nombre && !(nombre in mapa)) mapa[nombre] = i;
  });
  return mapa;
}

// Fila real → fila canónica (orden de ENCABEZADOS_SOPORTE). Lo que falte llega vacío.
function sopACanonica_(filaReal, real) {
  return ENCABEZADOS_SOPORTE.map(function (h) { return h in real ? filaReal[real[h]] : ''; });
}

// Filas de datos (sin encabezado) en orden canónico. La fila i es la fila i + 2 de la hoja.
function sopFilasCanonicas_(hoja) {
  if (!hoja || hoja.getLastRow() < 2) return [];
  const datos = hoja.getDataRange().getValues();
  const real = sopIndicesReales_(datos[0]);
  return datos.slice(1).map(function (r) { return sopACanonica_(r, real); });
}

function sopFilaCanonica_(hoja, numFila) {
  const ancho = Math.max(hoja.getLastColumn(), 1);
  const real = sopIndicesReales_(hoja.getRange(1, 1, 1, ancho).getValues()[0]);
  return sopACanonica_(hoja.getRange(numFila, 1, 1, ancho).getValues()[0], real);
}

// Número de columna (1-based) REAL de un encabezado, para escribir en la hoja.
function sopCol_(hoja, nombre) {
  const enc = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0]
    .map(function (h) { return String(h).trim(); });
  const i = enc.indexOf(nombre);
  if (i === -1) throw new Error('La hoja ' + hoja.getName() + ' no tiene la columna "' + nombre + '".');
  return i + 1;
}

// ── Modo de prueba: redirige el correo de cierre al solicitante a un solo
// correo, para probar el flujo completo sin avisarle a nadie real. Actívalo
// corriendo sopActivarModoPrueba('tu@correo.com') una vez desde el editor de
// Apps Script; desactívalo con sopDesactivarModoPrueba(). No requiere
// redeploy — es una Script Property, se lee en cada envío. ──
function sopActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function sopDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

// ── Token del Panel OTDE: a diferencia de ?action=consulta (que exige ya
// conocer un folio + correo específicos), ?action=pendientes regresa TODAS
// las solicitudes abiertas con nombre/escuela/contacto — sin este token
// cualquiera que viera la URL en el código fuente del sitio podría listar
// esos datos. Configúralo una vez con sopConfigurarTokenPanel('un-secreto-
// largo') desde el editor — el mismo valor debe pegarse en panel-otde.gs. ──
function sopConfigurarTokenPanel(token) {
  PropertiesService.getScriptProperties().setProperty('PANEL_TOKEN', token);
}

// ── Escapa HTML/Markdown de campos capturados por el solicitante antes de
// insertarlos en el cuerpo de un correo o mensaje de Telegram — el endpoint
// es público, así que sin esto cualquiera podría inyectar <a>/<img> en un
// correo con membrete institucional real, o un link falso en Telegram. ──
function sopEscapeHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sopEscapeMarkdown_(valor) {
  return String(valor == null ? '' : valor).replace(/([_*[\]`])/g, '\\$1');
}

function sopEnviarCorreo_(opciones) {
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (correoPrueba) {
    const destinoOriginal = [
      opciones.to ? 'Para: ' + opciones.to : '',
      opciones.cc ? 'CC: ' + opciones.cc : '',
      opciones.bcc ? 'CCO: ' + opciones.bcc : ''
    ].filter(Boolean).join(' · ');
    opciones = Object.assign({}, opciones, {
      to: correoPrueba,
      cc: null,
      bcc: null,
      subject: '[PRUEBA] ' + opciones.subject,
      htmlBody: '<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;' +
        'padding:10px 16px;margin-bottom:16px;font-family:Arial,Helvetica,sans-serif;' +
        'font-size:13px;color:#555;"><strong>Modo de prueba activo</strong> — destino real: ' +
        destinoOriginal + '</div>' + (opciones.htmlBody || '')
    });
  }
  MailApp.sendEmail(opciones);
}

// ── doGet: verificación de estado, o consulta de folio (?action=consulta) ──
function doGet(e) {
  const accion = e && e.parameter && e.parameter.action;
  if (accion === 'consulta') {
    return sopConsultarFolio(e.parameter.folio, e.parameter.correo);
  }
  if (accion === 'pendientes') {
    return sopListarPendientes(e.parameter.token);
  }
  if (accion === 'soporteMes') {
    return textResponse(JSON.stringify(sopListarResueltasMes_(e.parameter.token, e.parameter.mes)));
  }
  return textResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Soporte Técnico Remoto' }));
}

// ── Lista de solicitudes abiertas para el Panel OTDE (?action=pendientes) ──
// "Abierta" = Estatus distinto de Resuelto/Rechazado (o vacío, que
// sopConsultarFolio ya trata como Pendiente de validar). Requiere el mismo
// token configurado con sopConfigurarTokenPanel() — ver esa función arriba.
function sopListarPendientes(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return textResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (!hoja) return textResponse(JSON.stringify({ status: 'ok', tramite: 'Soporte Técnico Remoto', items: [] }));

  const items = sopFilasCanonicas_(hoja)
    .filter(function (r) { return r[SOP['Folio']]; }) // folio no vacío
    .filter(function (r) {
      const estatus = String(r[SOP['Estatus']] || '').trim();
      return estatus !== 'Resuelto' && estatus !== 'Rechazado';
    })
    .map(function (r) {
      const fecha = r[SOP['Fecha']];
      return {
        folio: r[SOP['Folio']],
        fecha: fecha instanceof Date ? fecha.toISOString() : String(fecha),
        nombre: r[SOP['Nombre']],
        escuela: r[SOP['Escuela/Unidad']],
        sector: r[SOP['Sector']],
        zona: r[SOP['Zona']],
        estatus: String(r[SOP['Estatus']] || 'Pendiente de validar').trim(),
        notas: r[SOP['Notas de revisión']] || ''
      };
    });

  return textResponse(JSON.stringify({ status: 'ok', tramite: 'Soporte Técnico Remoto', items: items }));
}

// ── Solicitudes resueltas de un mes para la Bitácora OTDE (?action=soporteMes) ──
// La bitácora (apps-script/bitacora.gs) arma con ellas una fila de resumen
// mensual. Solo lectura, mismo PANEL_TOKEN que ?action=pendientes. La fecha es
// "Fecha de atención"; si falta (resueltas antes de oct 2026), la de la
// solicitud, y fechaFuente lo dice para que la bitácora avise.
function sopListarResueltasMes_(tokenRecibido, mes) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) return { status: 'no_autorizado' };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(mes || ''))) {
    return { status: 'error', mensaje: 'Mes no válido (AAAA-MM).' };
  }
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (!hoja) return { status: 'ok', items: [] };

  const tz = 'America/Mexico_City';
  const txt = function (v) { return String(v == null ? '' : v).trim(); };
  const items = [];
  sopFilasCanonicas_(hoja).forEach(function (r) {
    if (!txt(r[SOP['Folio']]) || txt(r[SOP['Estatus']]) !== 'Resuelto') return;
    const atencion = r[SOP['Fecha de atención']];
    const solicitada = r[SOP['Fecha']];
    const fecha = atencion instanceof Date ? atencion : (solicitada instanceof Date ? solicitada : null);
    if (!fecha || Utilities.formatDate(fecha, tz, 'yyyy-MM') !== mes) return;
    items.push({
      folio: txt(r[SOP['Folio']]).toUpperCase(),
      fecha: Utilities.formatDate(fecha, tz, 'yyyy-MM-dd'),
      fechaFuente: atencion instanceof Date ? 'atencion' : 'solicitud',
      cct: txt(r[SOP['CCT']]).toUpperCase(),
      sector: txt(r[SOP['Sector']]),
      funcion: txt(r[SOP['Función/Cargo']]),
      urgencia: txt(r[SOP['Urgencia']]),
      tipoAyuda: txt(r[SOP['Tipo de ayuda']])
    });
  });
  return { status: 'ok', items: items };
}

// ── Consulta de estatus por folio + correo (Oficina Virtual OTDE) ──
// Mismo diseño que manConsultarFolio()/aseConsultarFolio(): lectura directa
// por getSheetByName(), sin pasar por obtenerHojaSoporte() (esa función
// escribe — auto-heal, validación), y mismo mensaje genérico si el folio no
// existe o el correo no coincide.
function sopConsultarFolio(folioBuscado, correoBuscado) {
  const noEncontrado = function () {
    return textResponse(JSON.stringify({ status: 'no_encontrado' }));
  };
  if (!folioBuscado || !correoBuscado) return noEncontrado();

  const folio = String(folioBuscado).trim().toUpperCase();
  const correo = String(correoBuscado).trim().toLowerCase();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE);
  if (!hoja) return noEncontrado();

  const fila = sopFilasCanonicas_(hoja).find(r => String(r[SOP['Folio']]).trim().toUpperCase() === folio);
  if (!fila || String(fila[SOP['Correo']]).trim().toLowerCase() !== correo) return noEncontrado();

  const fecha = fila[SOP['Fecha']];
  return textResponse(JSON.stringify({
    status: 'ok',
    folio: fila[SOP['Folio']],
    fecha: fecha instanceof Date ? fecha.toISOString() : String(fecha),
    estatus: fila[SOP['Estatus']] || 'Pendiente de validar',
    notas: fila[SOP['Notas de revisión']] || ''
  }));
}

// ── doPost: recibe solicitud de soporte ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    validarCampos(datos);

    // LockService + "ID de envío" generado en el navegador: si la confirmación se pierde
    // en el camino (el servidor sí guardó) y la persona vuelve a presionar Enviar, el
    // reintento devuelve el mismo folio en vez de crear otro (QA-NOTES #44, mismo
    // patrón que mantenimiento.gs/asesorias.gs).
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(20000);
    } catch (errLock) {
      return textResponse(JSON.stringify({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' }));
    }

    let folio;
    try {
      const hoja = obtenerHojaSoporte();
      const folioPrevio = sopBuscarEnvioPrevio_(hoja, datos);
      if (folioPrevio) {
        return textResponse(JSON.stringify({ status: 'ok', folio: folioPrevio, duplicado: true }));
      }

      folio = generarFolioSoporte(hoja);
      // Por nombre, en el orden REAL de la hoja (antes y después de reordenar); lo que no
      // se nombra (notas, fecha de atención, notificación, columnas a mano) queda en blanco.
      const valores = {
        'Fecha': new Date(),
        'Folio': folio,
        'Nombre': datos.nombre.trim(),
        'Función/Cargo': datos.funcion.trim(),
        'WhatsApp': datos.whatsapp.trim(),
        'Correo': (datos.correo || '').trim(),
        'CCT': datos.cct.trim().toUpperCase(),
        'Escuela/Unidad': (datos.escuela || '').trim(),
        'Sector': (datos.sector || '').trim(),
        'Zona': (datos.zona || '').toString().trim(),
        'Tipo de ayuda': (datos.tipoAyuda || '').trim(),
        'Urgencia': datos.urgencia.trim(),
        'Descripción': datos.descripcion.trim(),
        'Estatus': 'Pendiente de validar',
        'ID de envío': String(datos.idEnvio || '').trim()
      };
      hoja.appendRow(hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0].map(function (h) {
        const nombre = String(h).trim();
        return nombre in valores ? valores[nombre] : '';
      }));
      SpreadsheetApp.flush();
    } finally {
      lock.releaseLock();
    }

    // Notificaciones fuera del candado — no bloquean a otro envío mientras salen.
    notificarTelegram(folio, datos);
    sopNotificarEquipoPorCorreo(folio, datos);
    sopNotificarSolicitudRecibida(folio, datos);

    return textResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Busca si este envío ya se registró: primero por ID de envío (lo manda
// soporte.html desde sep 2026); si no viene, por CCT + correo + descripción dentro de
// SOP_VENTANA_DUPLICADO_MIN minutos. Devuelve el folio o null. ──
function sopBuscarEnvioPrevio_(hoja, datos) {
  const filas = sopFilasCanonicas_(hoja);
  if (!filas.length) return null;
  const iFolio = SOP['Folio'];
  const iId = SOP['ID de envío'];
  const idEnvio = String(datos.idEnvio || '').trim();

  if (idEnvio) {
    const previa = filas.find(r => String(r[iId] || '') === idEnvio);
    if (previa) return String(previa[iFolio]);
  }

  const iFecha = SOP['Fecha'];
  const iCct = SOP['CCT'];
  const iCorreo = SOP['Correo'];
  const iDesc = SOP['Descripción'];
  const cct = String(datos.cct || '').trim().toUpperCase();
  const correo = String(datos.correo || '').trim().toLowerCase();
  const desc = String(datos.descripcion || '').trim();
  const limite = Date.now() - SOP_VENTANA_DUPLICADO_MIN * 60 * 1000;

  for (let i = filas.length - 1; i >= 0; i--) {
    const r = filas[i];
    const fecha = r[iFecha] instanceof Date ? r[iFecha].getTime() : 0;
    if (fecha < limite) continue;
    if (String(r[iCct]).trim().toUpperCase() === cct &&
        String(r[iCorreo]).trim().toLowerCase() === correo &&
        String(r[iDesc]).trim() === desc) {
      return String(r[iFolio]);
    }
  }
  return null;
}

// ── Obtener o crear la hoja ──
function obtenerHojaSoporte() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let hoja   = ss.getSheetByName(HOJA_SOPORTE);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_SOPORTE);
    hoja.appendRow(ENCABEZADOS_SOPORTE);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_SOPORTE.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    [['Nombre', 180], ['Escuela/Unidad', 200], ['Descripción', 320]]
      .forEach(function (p) { hoja.setColumnWidth(SOP[p[0]] + 1, p[1]); });
  } else {
    // Hoja ya existente: se agrega AL FINAL, por nombre, cualquier encabezado que le
    // falte, sin mover nada. Para el orden por bloques está "Reordenar columnas".
    const ancho = Math.max(hoja.getLastColumn(), 1);
    const reales = sopIndicesReales_(hoja.getRange(1, 1, 1, ancho).getValues()[0]);
    const faltantes = ENCABEZADOS_SOPORTE.filter(function (h) { return !(h in reales); });
    if (faltantes.length) {
      hoja.getRange(1, hoja.getLastColumn() + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  sopAplicarValidacionEstatus(hoja);

  return hoja;
}

// ── Dropdown de valores válidos en la columna Estatus (idempotente) ──
function sopAplicarValidacionEstatus(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_SOP_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, sopCol_(hoja, 'Estatus'), 1000, 1).setDataValidation(regla);
}

// ── Generar folio único ──
function generarFolioSoporte(hoja) {
  const prefix = 'OTDE-SOP-';
  const maxNum = sopFilasCanonicas_(hoja)
    .map(row => String(row[SOP['Folio']]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function validarCampos(d) {
  const requeridos = ['nombre', 'cct', 'escuela', 'funcion', 'whatsapp', 'correo', 'descripcion', 'urgencia', 'tipoAyuda'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.correo).trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
}

// ── Notificar por Telegram (no interrumpe el registro si falla) ──
function notificarTelegram(folio, d) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const urgenciaEmoji = { 'Alta': '🔴', 'Media': '🟡', 'Baja': '🟢' };
    const marca = urgenciaEmoji[d.urgencia] || '⚪';
    const whatsappDigits = d.whatsapp.trim().replace(/\D/g, '');
    const whatsappLink = 'https://wa.me/52' + whatsappDigits;

    const mensaje =
      marca + ' *Nueva solicitud de Soporte Remoto*\n' +
      'Folio: ' + folio + '\n' +
      'Urgencia: ' + d.urgencia + '\n' +
      'Nombre: ' + sopEscapeMarkdown_(d.nombre.trim()) + '\n' +
      'CCT: ' + sopEscapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + sopEscapeMarkdown_(d.escuela.trim()) : '') + '\n' +
      (d.sector ? 'Sector ' + sopEscapeMarkdown_(d.sector) + (d.zona ? ' · Zona ' + sopEscapeMarkdown_(d.zona) : '') + '\n' : '') +
      'Función: ' + sopEscapeMarkdown_(d.funcion.trim()) + '\n' +
      'Tipo de ayuda: ' + sopEscapeMarkdown_((d.tipoAyuda || '').trim()) + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + ' — [Abrir chat](' + whatsappLink + ')\n' +
      (d.correo && d.correo.trim() ? 'Correo: ' + d.correo.trim() + '\n' : '') +
      'Descripción: ' + sopEscapeMarkdown_(d.descripcion.trim());

    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      payload: {
        chat_id: chatId,
        text: mensaje,
        parse_mode: 'Markdown'
      },
      muteHttpExceptions: true
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada en Sheets aunque falle la notificación
  }
}

// ── Correo a Alejandro, además del Telegram de arriba (sep 2026) ──
function sopNotificarEquipoPorCorreo(folio, d) {
  try {
    sopEnviarCorreo_({
      to: SOP_CORREO_EQUIPO,
      subject: 'Nueva solicitud de Soporte Remoto (Folio ' + folio + ')',
      htmlBody:
        '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Urgencia: ' + sopEscapeHtml_(d.urgencia) + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + sopEscapeHtml_(d.nombre.trim()) + ' (' + sopEscapeHtml_(d.funcion.trim()) + ')</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">CCT: ' + sopEscapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + sopEscapeHtml_(d.escuela.trim()) : '') + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Tipo de ayuda: ' + sopEscapeHtml_((d.tipoAyuda || '').trim()) + '</p>' +
        '<p style="margin:0;font-size:14px;">Descripción: ' + sopEscapeHtml_(d.descripcion.trim()) + '</p>',
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada en Sheets aunque falle la notificación
  }
}

// ── onEdit instalable: dispara al marcar Estatus = "Resuelto" ──
// No se llama "onEdit" a propósito: así solo corre vía el trigger instalable
// (sopInstalarTriggerCierre), nunca como trigger simple sin autorización
// para MailApp. Mismo patrón que manOnEditCierre()/aseOnEditCierre(), pero
// solo notifica al solicitante — Soporte no tiene Contactos_Zona_Sector.
function sopOnEditCierre(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_SOPORTE) return;

    const colEstatus = sopCol_(hoja, 'Estatus');
    const colNotificacion = sopCol_(hoja, 'Notificación de cierre enviada');
    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (colEstatus < colInicio || colEstatus > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const estatus = String(hoja.getRange(fila, colEstatus).getValue()).trim();
      if (estatus !== 'Resuelto') continue;

      // Fecha de atención: solo la primera vez (no se pisa si se vuelve a marcar Resuelto
      // ni si se corrigió a mano). Si la hoja aún no tiene la columna, se agrega al final.
      let colAtencion;
      try {
        colAtencion = sopCol_(hoja, 'Fecha de atención');
      } catch (errCol) {
        colAtencion = hoja.getLastColumn() + 1;
        hoja.getRange(1, colAtencion).setValue('Fecha de atención')
          .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
      }
      const celdaAtencion = hoja.getRange(fila, colAtencion);
      if (!celdaAtencion.getValue()) celdaAtencion.setValue(new Date());

      const yaNotificado = String(hoja.getRange(fila, colNotificacion).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = sopFilaCanonica_(hoja, fila);
      const folio = datosFila[SOP['Folio']];
      const cct = datosFila[SOP['CCT']];
      const escuela = datosFila[SOP['Escuela/Unidad']];
      const correo = datosFila[SOP['Correo']];
      const notas = datosFila[SOP['Notas de revisión']];

      if (correo) {
        sopNotificarCierreSolicitante(folio, escuela, cct, notas, correo);
      }
      hoja.getRange(fila, colNotificacion).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Plantilla institucional compartida por los correos de este archivo —
// mismo lenguaje visual (header, caja de resumen, firma, redes sociales)
// que ya usa en producción Correos-institucionales (repo aparte), adoptado
// aquí letra por letra. Ver mantenimiento.gs para el mismo patrón — cada
// .gs mantiene su propia copia, no hay import entre proyectos. ──
const SOP_CORREO_CSS =
  'body{margin:0;padding:0;background-color:#f4f1ee;font-family:Arial,Helvetica,sans-serif;}' +
  '.wrapper{width:100%;background-color:#f4f1ee;padding:20px 0;}' +
  '.card{max-width:560px;width:100%;margin:0 auto;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.10);}' +
  '.header{background-color:#9F2241;padding:24px 24px 20px 24px;}' +
  '.header-sub{font-size:10px;color:#d6a87e;letter-spacing:2px;text-transform:uppercase;font-weight:bold;margin:0 0 6px 0;}' +
  '.header-title{font-size:17px;color:#ffffff;font-weight:bold;margin:0;}' +
  '.header-line{margin-top:14px;height:3px;background-color:#977e5b;border-radius:2px;width:50px;}' +
  '.body{padding:26px 24px 18px 24px;}' +
  '.btn{display:inline-block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;text-align:center;padding:12px 22px;border-radius:6px;margin:8px 0 6px 0;}' +
  '.aviso{background-color:#fff8f0;border:1px solid #e8ddd4;border-radius:4px;padding:12px 14px;margin-top:8px;}' +
  '.footer-firma{padding:0 24px 26px 24px;border-top:1px solid #e0d8d0;margin-top:16px;padding-top:18px;}' +
  '.pie{background-color:#9F2241;padding:10px 24px;text-align:center;}' +
  '.pie p{margin:0;font-size:10px;color:#d6a87e;letter-spacing:1px;}' +
  '@media only screen and (max-width:480px){' +
  '.header{padding:20px 18px 16px 18px;}.header-title{font-size:15px;}' +
  '.body{padding:22px 18px 16px 18px;}.footer-firma{padding:0 18px 22px 18px;}}';

function sopCorreoFirma_() {
  return '<div class="footer-firma">' +
    '<p style="margin:0 0 2px 0;font-size:14px;font-weight:bold;color:#9F2241;">Mtro. Jorge Alberto Bonilla Torres</p>' +
    '<p style="margin:0 0 2px 0;font-size:12px;color:#555555;">Jefe de la Oficina de Tecnología para el Desarrollo Educativo | <strong>OTDE</strong></p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#666666;">Subdirección de Educación Primaria en la Región de Nezahualcóyotl | SEPRN</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📞 55 3300 2400 Ext. 9065</p>' +
    '<p style="margin:0 0 4px 0;font-size:12px;color:#555555;">📍 Av. Texcoco 116, Col. Juárez Pantitlán, Nezahualcóyotl C.P. 57460</p>' +
    '<p style="margin:0 0 14px 0;font-size:12px;color:#555555;">✉️ <a href="mailto:otde.nezahualcoyotl@dee.edu.mx" style="color:#9F2241;text-decoration:none;">otde.nezahualcoyotl@dee.edu.mx</a></p>' +
    '<p style="margin:0;font-size:12px;line-height:2.1;">' +
    '<a href="https://educaneza.github.io/seprn-sitio/index.html" style="color:#977e5b;text-decoration:none;font-weight:bold;">🌐 Sitio Web</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://www.facebook.com/SubNeza" style="color:#977e5b;text-decoration:none;font-weight:bold;">📘 Facebook</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://www.youtube.com/@subneza" style="color:#977e5b;text-decoration:none;font-weight:bold;">▶️ YouTube</a>&nbsp;&nbsp;|&nbsp;&nbsp;' +
    '<a href="https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11" style="color:#977e5b;text-decoration:none;font-weight:bold;">💬 WhatsApp</a>' +
    '</p></div>';
}

function sopCorreoHtml_(opts) {
  const filasHtml = (opts.filas || []).map(f =>
    '<p style="margin:0 0 8px 0;font-size:13.5px;color:#333333;line-height:1.6;">' +
    f.icono + ' <strong>' + f.etiqueta + ':</strong> ' + f.valor + '</p>'
  ).join('');

  const caja = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3;border-left:4px solid ' +
    (opts.colorCaja || '#9F2241') + ';border-radius:4px;margin-bottom:14px;">' +
    '<tr><td style="padding:15px 17px;">' + filasHtml + '</td></tr></table>';

  // style inline además de class="btn": varios clientes de correo (Outlook,
  // Gmail, Apple Mail) ignoran el color del <style> del <head> y aplican su
  // propio azul/morado de link por default — el inline sí sobrevive.
  const cta = opts.ctaHref
    ? '<a href="' + opts.ctaHref + '" class="btn" style="display:inline-block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;text-align:center;padding:12px 22px;border-radius:6px;">' + (opts.ctaTexto || 'Consultar estatus de tu solicitud') + ' &rarr;</a>'
    : '';

  const aviso = '<div class="aviso"><p style="margin:0;font-size:12px;color:#7a6a5a;line-height:1.6;">⚠️ ' +
    (opts.avisoTexto || 'Este correo no se monitorea — para dudas o seguimiento escríbenos a <a href="mailto:otde.nezahualcoyotl@dee.edu.mx" style="color:#9F2241;">otde.nezahualcoyotl@dee.edu.mx</a>.') +
    '</p></div>';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + SOP_CORREO_CSS + '</style></head>' +
    '<body><div class="wrapper"><div class="card">' +
    '<div class="header">' +
    '<p class="header-sub">Oficina de Tecnología para el Desarrollo Educativo | OTDE</p>' +
    '<p class="header-title">' + opts.titulo + '</p>' +
    '<div class="header-line"></div></div>' +
    '<div class="body">' + (opts.introHtml || '') + caja + cta + aviso + '</div>' +
    sopCorreoFirma_() +
    '<div class="pie"><p>SEPRN © 2026 — Gobierno del Estado de México</p></div>' +
    '</div></div></body></html>';
}

const SOP_CTA_SEGUIMIENTO = 'https://educaneza.github.io/seprn-sitio/oficina-virtual.html#buscar-folio';

// ── Confirma al solicitante que su solicitud de soporte quedó registrada.
// Sin CC a Zona/Sector: Soporte no tiene Contactos_Zona_Sector (decisión
// deliberada, ver CLAUDE.md), a diferencia de Mantenimiento/Asesorías. ──
function sopNotificarSolicitudRecibida(folio, d) {
  try {
    const asunto = 'Solicitud de soporte técnico recibida — Folio ' + folio;
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: sopEscapeHtml_(d.escuela || '') + ' — ' + sopEscapeHtml_(d.cct.trim().toUpperCase()) },
      { icono: '👤', etiqueta: 'Solicita', valor: sopEscapeHtml_(d.nombre.trim()) + ' (' + sopEscapeHtml_(d.funcion.trim()) + ')' }
    ];
    if (d.tipoAyuda) filas.push({ icono: '💻', etiqueta: 'Tipo de ayuda', valor: sopEscapeHtml_(d.tipoAyuda) });
    filas.push({ icono: '📝', etiqueta: 'Descripción', valor: sopEscapeHtml_(d.descripcion.trim()) });

    const html = sopCorreoHtml_({
      titulo: 'Solicitud de soporte técnico recibida',
      introHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Hola, <strong>' + sopEscapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Se registró tu solicitud de soporte técnico remoto. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>',
      filas: filas,
      ctaHref: SOP_CTA_SEGUIMIENTO,
      ctaTexto: 'Consultar estatus de tu solicitud'
    });

    sopEnviarCorreo_({
      to: (d.correo || '').trim(),
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada aunque falle este aviso
  }
}

// ── Avisa al solicitante que su ticket fue resuelto ──
function sopNotificarCierreSolicitante(folio, escuela, cct, notas, correo) {
  try {
    const asunto = 'Tu solicitud de soporte técnico fue resuelta — ' + folio;
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: sopEscapeHtml_(escuela || '') + ' — ' + sopEscapeHtml_(cct) }
    ];
    if (notas) filas.push({ icono: '📝', etiqueta: 'Notas', valor: sopEscapeHtml_(notas) });

    const html = sopCorreoHtml_({
      titulo: 'Solicitud de soporte técnico resuelta',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Tu solicitud de soporte técnico remoto fue marcada como resuelta por OTDE.</p>',
      filas: filas,
      ctaHref: SOP_CTA_SEGUIMIENTO,
      ctaTexto: 'Ver el detalle de tu solicitud'
    });

    sopEnviarCorreo_({
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ── Instala el trigger de cierre automático (seguro correrlo de nuevo:
// borra cualquier instalación previa antes de crear una nueva) ──
function sopInstalarTriggerCierre() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sopOnEditCierre') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sopOnEditCierre')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de cierre automático instalado.'); } catch (err) {}
}

// ── Quita el trigger de cierre automático ──
function sopDesinstalarTriggerCierre() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'sopOnEditCierre') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de cierre eliminado(s).'); } catch (err) {}
}

// ── "Planchado": listas suaves + semáforo + protección de solo aviso ──
const SOP_URGENCIAS_VALIDAS = ['Alta', 'Media', 'Baja'];
const SOP_TIPOS_AYUDA_VALIDOS = ['Correo institucional', 'Office/Licencias', 'Impresora',
  'Antivirus/Seguridad', 'Internet/Red', 'Equipo de cómputo (hardware)', 'Otro'];
const SOP_COLORES_ESTATUS = {
  'Pendiente de validar': '#e5e7eb',
  'Validado': '#dbeafe',
  'En atención': '#fef3c7',
  'Resuelto': '#d1fae5',
  'Rechazado': '#fee2e2'
};

function sopAplicarValidacionListaSuave_(hoja, columna, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
  hoja.getRange(2, columna, 1000, 1).setDataValidation(regla);
}

function sopAplicarSemaforoPorValor_(hoja, columna, valores, colores) {
  const rango = hoja.getRange(2, columna, 1000, 1);
  const reglasSinEstaColumna = hoja.getConditionalFormatRules().filter(function (r) {
    return r.getRanges().every(function (rg) { return rg.getColumn() !== columna; });
  });
  const reglasNuevas = valores
    .filter(function (valor) { return colores[valor]; })
    .map(function (valor) {
      return SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(valor)
        .setBackground(colores[valor])
        .setRanges([rango])
        .build();
    });
  hoja.setConditionalFormatRules(reglasSinEstaColumna.concat(reglasNuevas));
}

function sopProtegerColumnaAutomatica_(hoja, columna) {
  const yaProtegida = hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    const r = p.getRange();
    return r.getColumn() === columna && r.getRow() === 2;
  });
  if (yaProtegida) return;
  hoja.getRange(2, columna, 1000, 1).protect()
    .setWarningOnly(true)
    .setDescription('Columna automática — se llena sola, evita editarla a mano.');
}

const SOP_COLUMNAS_AUTOMATICAS = ['Fecha', 'Folio', 'Notificación de cierre enviada', 'ID de envío'];

function sopConfigurarValidacionYSemaforo() {
  sopConfigurarValidacionYSemaforo_();
  try { SpreadsheetApp.getUi().alert('Validación y semáforo aplicados en Solicitudes.'); } catch (err) {}
}

function sopConfigurarValidacionYSemaforo_() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_SOPORTE) ? obtenerHojaSoporte() : null;
  if (!hoja) return;
  const col = function (n) { return sopCol_(hoja, n); };
  sopAplicarValidacionListaSuave_(hoja, col('Urgencia'), SOP_URGENCIAS_VALIDAS);
  sopAplicarValidacionListaSuave_(hoja, col('Tipo de ayuda'), SOP_TIPOS_AYUDA_VALIDOS);
  sopAplicarSemaforoPorValor_(hoja, col('Estatus'), ESTADOS_SOP_VALIDOS, SOP_COLORES_ESTATUS);
  SOP_COLUMNAS_AUTOMATICAS.forEach(function (n) { sopProtegerColumnaAutomatica_(hoja, col(n)); });
}

// ============================================================
// REORDENAR COLUMNAS (oct 2026) — mismo patrón que aseReordenarColumnasSolicitudes_()
// de asesorias.gs: respaldo completo "<hoja>_respaldo_AAAAMMDD", moveColumns() (conserva
// dropdowns, semáforo y protecciones), verificación columna por columna, columnas a mano
// al final. Toma el mismo candado que doPost.
// ============================================================
function sopReordenarColumnas() {
  SpreadsheetApp.getUi().alert(sopReordenarColumnas_().mensaje);
}

function sopReordenarColumnas_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, mensaje: 'Hay una solicitud registrándose en este momento. Intenta de nuevo en unos segundos.' };
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaSoporte(); // agrega al final los encabezados que falten
    SpreadsheetApp.flush();
    const antes = hoja.getDataRange().getValues();
    const enc = antes[0].map(function (h) { return String(h).trim(); });
    if (ENCABEZADOS_SOPORTE.every(function (h, k) { return enc[k] === h; })) {
      return { ok: true, mensaje: 'La hoja ya está en el orden nuevo. No se cambió nada.' };
    }

    const tz = 'America/Mexico_City';
    let nombreRespaldo = HOJA_SOPORTE + '_respaldo_' + Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
    if (ss.getSheetByName(nombreRespaldo)) nombreRespaldo += '_' + Utilities.formatDate(new Date(), tz, 'HHmm');
    const respaldo = hoja.copyTo(ss).setName(nombreRespaldo);
    respaldo.setTabColor('#948A8E');
    ss.setActiveSheet(respaldo);
    ss.moveActiveSheet(ss.getNumSheets());

    ENCABEZADOS_SOPORTE.forEach(function (h, k) {
      const i = enc.indexOf(h);
      if (i === -1 || i === k) return;
      hoja.moveColumns(hoja.getRange(1, i + 1), k + 1);
      enc.splice(k, 0, enc.splice(i, 1)[0]);
    });
    SpreadsheetApp.flush();

    const despues = hoja.getDataRange().getValues();
    const idxAntes = sopIndicesReales_(antes[0]);
    const idxDespues = sopIndicesReales_(despues[0]);
    const valor = function (v) { return v instanceof Date ? v.getTime() : String(v); };
    const diferencias = [];
    if (despues.length !== antes.length) diferencias.push('filas ' + antes.length + ' → ' + despues.length);
    if (despues[0].length !== antes[0].length) diferencias.push('columnas ' + antes[0].length + ' → ' + despues[0].length);
    Object.keys(idxAntes).forEach(function (h) {
      if (!(h in idxDespues)) { diferencias.push('falta ' + h); return; }
      for (let r = 1; r < antes.length; r++) {
        if (valor(antes[r][idxAntes[h]]) !== valor((despues[r] || [])[idxDespues[h]])) {
          diferencias.push(h + ' fila ' + (r + 1));
          break;
        }
      }
    });
    if (diferencias.length) {
      return { ok: false, mensaje: 'ATENCIÓN: la verificación encontró diferencias (' + diferencias.slice(0, 5).join('; ') +
        '). Los datos originales están completos en la hoja "' + nombreRespaldo + '". No captures nada y avisa antes de continuar.' };
    }

    sopConfigurarValidacionYSemaforo_();
    ss.setActiveSheet(hoja);
    const extras = enc.slice(ENCABEZADOS_SOPORTE.length).filter(Boolean);
    return { ok: true, mensaje: 'Listo: la hoja quedó en el orden nuevo (' + (antes.length - 1) +
      ' solicitud(es) verificadas columna por columna). Respaldo: "' + nombreRespaldo + '".' +
      (extras.length ? ' Columnas agregadas a mano que dejé al final: ' + extras.join(', ') + '.' : '') };
  } finally {
    lock.releaseLock();
  }
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Soporte')
    .addItem('Instalar trigger de cierre automático', 'sopInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'sopDesinstalarTriggerCierre')
    .addItem('Aplicar validación y semáforo', 'sopConfigurarValidacionYSemaforo')
    .addItem('Reordenar columnas', 'sopReordenarColumnas')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// CÓMO OBTENER EL TOKEN Y CHAT_ID DE TELEGRAM
// ============================================================
// 1. En Telegram, busca "@BotFather" e inicia conversación.
// 2. Envía /newbot, sigue las instrucciones (nombre y username
//    del bot, este último debe terminar en "bot").
// 3. BotFather te entrega un TOKEN como:
//    123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
// 4. Busca el username de tu nuevo bot en Telegram y envíale
//    cualquier mensaje (ej. "hola") para "activar" el chat.
// 5. Desde un navegador, visita (reemplaza <TOKEN>):
//    https://api.telegram.org/bot<TOKEN>/getUpdates
//    Busca "chat":{"id":XXXXXXXXX  — ese número es tu CHAT_ID.
// 6. En Apps Script: ícono de engrane (Configuración del
//    proyecto) → Propiedades del script → Agregar propiedad del
//    script:
//      TELEGRAM_BOT_TOKEN = <tu token>
//      TELEGRAM_CHAT_ID   = <tu chat id>
// ============================================================
