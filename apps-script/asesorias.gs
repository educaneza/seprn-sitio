// ============================================================
// SEPRN · OTDE — Solicitudes de Asesoría (captura en línea)
// Complementa el oficio (que sigue siendo el respaldo oficial),
// mismo patrón que apps-script/mantenimiento.gs.
//
// Contexto del trámite: tras una visita de mantenimiento (Banco
// de Materiales, Chuka ya instalados), el técnico le ofrece al
// director una asesoría/taller sobre su uso pedagógico. Si el
// director acepta, elabora su oficio y lo manda a OTDE. Hoy ese
// control se lleva en un Excel simple sin nada automatizado
// (columnas: N.P., Número de Oficio, Sector, Zona, Escuela, CCT,
// Turno, Fecha de recepción, Número de Docentes, Estatus, Fecha
// de visita, Observaciones) — este script solo digitaliza la
// captura inicial, no sustituye ese control ni el oficio.
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Llena manualmente la hoja "Contactos_Zona_Sector" (se crea
//      sola con encabezados la primera vez que corra doPost) con
//      el correo de cada Zona y de cada Sector — el solicitante
//      siempre recibe confirmación (su correo ya es obligatorio),
//      Zona y Sector se agregan en copia (CC) si hay fila para
//      cada uno
//   4. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token del bot (Propiedades del
//          script son por proyecto — hay que configurarlo aquí
//          aunque sea el mismo bot que en soporte-remoto.gs)
//        TELEGRAM_CHAT_ID   = chat_id del mismo bot
//   5. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   6. Copia la URL generada y pégala en otde.html en la
//      constante ASESORIAS_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA "Solicitudes":
//   A Fecha | B Folio | C Tipo de Asesoría | D Nombre | E Función | F CCT
//   G Sector | H Zona | I Escuela | J Turno | K Número de Docentes
//   L WhatsApp | M Correo | N Observaciones | O Oficio (link Drive)
//   P Estatus | Q Notas de revisión | R Confirmó Mantenimiento Previo
//   S Notificación de cierre enviada | T Tipo de solicitante
//   U Fecha programada de visita | V Notificación de fecha programada enviada
//
// COLUMNAS DE LA HOJA "Contactos_Zona_Sector" (Jorge la llena a mano):
//   A Sector | B Zona | C Correo | D Teléfono
// Puede haber una fila de Zona específica y otra de Sector (sin Zona, de
// respaldo) para el mismo Sector — aseBuscarContactosZonaSector() busca
// AMBAS y las notifica en CC, no solo la primera que encuentra.
//
// CORREO — patrón único (apertura y cierre): un solo envío por evento con
// to = solicitante (su correo ya es obligatorio) y cc = contacto(s) de
// Zona/Sector si existen, en vez de avisos sueltos por destinatario.
//
// CIERRE AUTOMÁTICO: al marcar Estatus = "Resuelto" en la hoja "Solicitudes",
// un trigger onEdit instalable (aseOnEditCierre) notifica al solicitante
// (con Zona/Sector en CC). Requiere correr UNA vez
// aseInstalarTriggerCierre() (o el menú "OTDE Asesorías" que crea onOpen())
// después de pegar esta versión — los triggers no se reinstalan solos al
// redesplegar.
//
// PROGRAMACIÓN DE VISITA: al escribir una fecha en la columna "Fecha
// programada de visita" de la hoja "Solicitudes", un segundo trigger onEdit
// instalable, independiente del de cierre (aseOnEditProgramacion), notifica
// al solicitante (con Zona/Sector en CC) que ya hay fecha. Requiere correr
// UNA vez aseInstalarTriggerProgramacion() (o el menú "OTDE Asesorías")
// después de pegar esta versión.
//
// CONSULTA DE FOLIO (Oficina Virtual OTDE): doGet(?action=consulta&folio=..
// &correo=...) devuelve estatus/fecha/notas si el folio y el correo
// coinciden, o {status:'no_encontrado'} en cualquier otro caso.
//
// PANEL OTDE (panel-otde.gs, Sheet aparte): doGet(?action=pendientes&
// token=...) devuelve todas las solicitudes abiertas. Configura el token
// una vez con aseConfigurarTokenPanel('un-secreto-largo') antes de usarlo.
// ============================================================

const HOJA_ASE_SOLICITUDES = 'Solicitudes';
const HOJA_ASE_CONTACTOS = 'Contactos_Zona_Sector';
const CARPETA_ASE_OFICIOS = 'Oficios de Asesorías';
const ASE_TAMANO_MAX_BYTES = 8 * 1024 * 1024; // 8MB, margen sobre el límite de 5MB validado en el cliente

const ENCABEZADOS_ASE_SOLICITUDES = [
  'Fecha', 'Folio', 'Tipo de Asesoría', 'Nombre', 'Función', 'CCT', 'Sector', 'Zona',
  'Escuela', 'Turno', 'Número de Docentes', 'WhatsApp', 'Correo',
  'Observaciones', 'Oficio (link Drive)', 'Estatus', 'Notas de revisión',
  'Confirmó Mantenimiento Previo', 'Notificación de cierre enviada',
  'Tipo de solicitante', 'Fecha programada de visita',
  'Notificación de fecha programada enviada'
];
// Índice (0-based) de 'Tipo de solicitante' dentro de una fila leída con getValues() —
// ya no es la última columna (se agregaron 2 más después, misma lógica de no correr
// columnas existentes), así que queda fijo en vez de derivarse de .length - 1.
const COL_ASE_TIPO_SOLICITANTE_IDX = 19;
const COL_ASE_ESTATUS = 16;
const COL_ASE_NOTIFICACION_CIERRE = 19;
// Fecha programada de visita y su columna de control — agregadas al final,
// mismo criterio, para no correr ninguna columna existente.
const COL_ASE_FECHA_PROGRAMADA = 21;
const COL_ASE_NOTIFICACION_PROGRAMADA = 22;
const ESTADOS_ASE_VALIDOS = ['Pendiente de validar', 'Validado', 'En atención', 'Resuelto', 'Rechazado'];

// ── Modo de prueba: redirige TODOS los correos salientes (Zona/Sector +
// cierre) a un solo correo, para probar el flujo completo sin avisar a
// escuelas/zonas/sectores reales. Actívalo corriendo
// aseActivarModoPrueba('tu@correo.com') una vez desde el editor de Apps
// Script; desactívalo con aseDesactivarModoPrueba(). No requiere redeploy —
// es una Script Property, se lee en cada envío. ──
function aseActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function aseDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

// ── Token del Panel OTDE: a diferencia de ?action=consulta (que exige ya
// conocer un folio + correo específicos), ?action=pendientes regresa TODAS
// las solicitudes abiertas con nombre/escuela/contacto — sin este token
// cualquiera que viera la URL en el código fuente del sitio podría listar
// esos datos. Configúralo una vez con aseConfigurarTokenPanel('un-secreto-
// largo') desde el editor — el mismo valor debe pegarse en panel-otde.gs. ──
function aseConfigurarTokenPanel(token) {
  PropertiesService.getScriptProperties().setProperty('PANEL_TOKEN', token);
}

// ── Escapa HTML/Markdown de campos capturados por el solicitante antes de
// insertarlos en el cuerpo de un correo o mensaje de Telegram — el endpoint
// es público, así que sin esto cualquiera podría inyectar <a>/<img> en un
// correo con membrete institucional real, o un link falso en Telegram. ──
function aseEscapeHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function aseEscapeMarkdown_(valor) {
  return String(valor == null ? '' : valor).replace(/([_*[\]`])/g, '\\$1');
}

function aseEnviarCorreo_(opciones) {
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
    return aseConsultarFolio(e.parameter.folio, e.parameter.correo);
  }
  if (accion === 'pendientes') {
    return aseListarPendientes(e.parameter.token);
  }
  return aseTextResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Solicitudes de Asesoría' }));
}

// ── Lista de solicitudes abiertas para el Panel OTDE (?action=pendientes) ──
// "Abierta" = Estatus distinto de Resuelto/Rechazado (o vacío). Requiere el
// mismo token configurado con aseConfigurarTokenPanel() — ver esa función arriba.
function aseListarPendientes(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return aseTextResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ASE_SOLICITUDES);
  if (!hoja) return aseTextResponse(JSON.stringify({ status: 'ok', tramite: 'Asesorías', items: [] }));

  const filas = hoja.getDataRange().getValues().slice(1);
  const items = filas
    .filter(function (r) { return r[1]; }) // folio no vacío
    .filter(function (r) {
      const estatus = String(r[COL_ASE_ESTATUS - 1] || '').trim();
      return estatus !== 'Resuelto' && estatus !== 'Rechazado';
    })
    .map(function (r) {
      return {
        folio: r[1],
        fecha: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        nombre: r[3],
        escuela: r[8],
        sector: r[6],
        zona: r[7],
        estatus: String(r[COL_ASE_ESTATUS - 1] || 'Pendiente de validar').trim(),
        notas: r[16] || '',
        fechaProgramada: r[COL_ASE_FECHA_PROGRAMADA - 1] instanceof Date
          ? r[COL_ASE_FECHA_PROGRAMADA - 1].toISOString() : (r[COL_ASE_FECHA_PROGRAMADA - 1] || '')
      };
    });

  return aseTextResponse(JSON.stringify({ status: 'ok', tramite: 'Asesorías', items: items }));
}

// ── Consulta de estatus por folio + correo (Oficina Virtual OTDE) ──
// Mismo diseño que manConsultarFolio() en mantenimiento.gs: lectura directa,
// sin pasar por aseObtenerHojaSolicitudes() (esa función escribe), y mismo
// mensaje genérico si el folio no existe o el correo no coincide.
function aseConsultarFolio(folioBuscado, correoBuscado) {
  const noEncontrado = function () {
    return aseTextResponse(JSON.stringify({ status: 'no_encontrado' }));
  };
  if (!folioBuscado || !correoBuscado) return noEncontrado();

  const folio = String(folioBuscado).trim().toUpperCase();
  const correo = String(correoBuscado).trim().toLowerCase();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_ASE_SOLICITUDES);
  if (!hoja) return noEncontrado();

  const filas = hoja.getDataRange().getValues().slice(1);
  const fila = filas.find(r => String(r[1]).trim().toUpperCase() === folio);
  if (!fila || String(fila[12]).trim().toLowerCase() !== correo) return noEncontrado();

  return aseTextResponse(JSON.stringify({
    status: 'ok',
    folio: fila[1],
    fecha: fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0]),
    estatus: fila[COL_ASE_ESTATUS - 1],
    notas: fila[16] || '',
    fechaProgramada: fila[COL_ASE_FECHA_PROGRAMADA - 1] instanceof Date
      ? fila[COL_ASE_FECHA_PROGRAMADA - 1].toISOString() : (fila[COL_ASE_FECHA_PROGRAMADA - 1] || '')
  }));
}

// ── doPost: recibe solicitud de asesoría ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    aseValidarCampos(datos);

    const oficioUrl = aseSubirOficio(datos);

    const hoja = aseObtenerHojaSolicitudes();
    const folio = aseGenerarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.tipoAsesoria.trim(),
      datos.nombre.trim(),
      datos.funcion.trim(),
      datos.cct.trim().toUpperCase(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      (datos.escuela || '').trim(),
      datos.turno.trim(),
      datos.numDocentes.toString().trim(),
      datos.whatsapp.trim(),
      (datos.correo || '').trim(),
      (datos.observaciones || '').trim(),
      oficioUrl,
      'Pendiente de validar',
      '',
      datos.confirmaMantenimiento ? 'Sí' : 'No',
      '',
      (datos.tipoCct || '').trim()
    ]);

    aseNotificarTelegram(folio, datos, oficioUrl);
    aseNotificarSolicitudRecibida(folio, datos);

    return aseTextResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return aseTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Obtener o crear la hoja de solicitudes ──
function aseObtenerHojaSolicitudes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_ASE_SOLICITUDES);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ASE_SOLICITUDES);
    hoja.appendRow(ENCABEZADOS_ASE_SOLICITUDES);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_ASE_SOLICITUDES.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(4, 180);  // Nombre
    hoja.setColumnWidth(9, 200);  // Escuela
    hoja.setColumnWidth(14, 260); // Observaciones
    hoja.setColumnWidth(15, 220); // Oficio
  } else {
    // Hoja creada antes de agregar esta columna: se completa el encabezado
    // faltante sin tocar las columnas ni los datos ya existentes.
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_ASE_SOLICITUDES.length) {
      const faltantes = ENCABEZADOS_ASE_SOLICITUDES.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  aseAplicarValidacionEstatus(hoja);
  aseAsegurarHojaContactos(ss);

  return hoja;
}

// ── Dropdown de valores válidos en la columna Estatus (idempotente) ──
function aseAplicarValidacionEstatus(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_ASE_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_ASE_ESTATUS, 1000, 1).setDataValidation(regla);
}

// ── Crear la hoja de contactos vacía si no existe (Jorge la llena a mano) ──
function aseAsegurarHojaContactos(ss) {
  let hoja = ss.getSheetByName(HOJA_ASE_CONTACTOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_ASE_CONTACTOS);
    hoja.appendRow(['Sector', 'Zona', 'Correo', 'Teléfono']);
    const header = hoja.getRange(1, 1, 1, 4);
    header.setFontWeight('bold')
          .setBackground('#977e5b')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 240);
  }
}

// ── Generar folio único ──
function aseGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-ASE-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function aseValidarCampos(d) {
  const requeridos = ['tipoAsesoria', 'nombre', 'cct', 'escuela', 'turno', 'funcion', 'numDocentes', 'whatsapp', 'correo'];
  for (const campo of requeridos) {
    if (d[campo] === undefined || d[campo] === null || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!d.confirmaMantenimiento) {
    throw new Error('Debes confirmar que el Aula de Medios ya recibió mantenimiento con Banco de Materiales y Chuka instalados.');
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (!/^\d+$/.test(String(d.numDocentes).trim()) || parseInt(d.numDocentes, 10) < 1) {
    throw new Error('Número de docentes inválido: ' + d.numDocentes);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.correo).trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
  if (!d.oficioBase64 || !d.oficioNombre) {
    throw new Error('Falta adjuntar el oficio.');
  }
}

// ── Subir el oficio adjunto a Drive, devuelve el URL para verlo ──
function aseSubirOficio(d) {
  const bytes = Utilities.base64Decode(d.oficioBase64);
  if (bytes.length > ASE_TAMANO_MAX_BYTES) {
    throw new Error('El oficio adjunto es demasiado grande (máximo 8MB).');
  }

  const mimeType = d.oficioTipo || 'application/octet-stream';
  const nombreLimpio = (d.cct || 'SIN-CCT').trim().toUpperCase() + ' — ' + d.oficioNombre;
  const blob = Utilities.newBlob(bytes, mimeType, nombreLimpio);

  const carpeta = aseObtenerCarpetaOficios();
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return archivo.getUrl();
}

// ── Obtener o crear la carpeta de Drive para los oficios ──
function aseObtenerCarpetaOficios() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_ASE_OFICIOS);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_ASE_OFICIOS);
}

// ── Buscar los contactos de Zona y de Sector en la hoja de contactos —
// pueden ser dos filas distintas (Zona específica + Sector de respaldo sin
// Zona) y ambas jefaturas quieren enterarse, así que se devuelven las que
// existan (0, 1 o 2), sin quedarse en la primera coincidencia. ──
function aseBuscarContactosZonaSector(sector, zona) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_ASE_CONTACTOS);
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const sectorNorm = String(sector || '').trim().toUpperCase();
  const zonaNorm = String(zona || '').trim();

  let contactoZona = null;
  let contactoSector = null;

  for (let i = 1; i < datos.length; i++) {
    const filaSector = String(datos[i][0] || '').trim().toUpperCase();
    const filaZona = String(datos[i][1] || '').trim();
    const correo = String(datos[i][2] || '').trim();
    if (!correo) continue;

    if (!contactoZona && filaZona && zonaNorm && filaZona === zonaNorm) {
      contactoZona = { correo: correo, telefono: String(datos[i][3] || '').trim(), nivel: 'zona' };
    }
    if (!contactoSector && !filaZona && filaSector && sectorNorm && filaSector === sectorNorm) {
      contactoSector = { correo: correo, telefono: String(datos[i][3] || '').trim(), nivel: 'sector' };
    }
  }

  const vistos = new Set();
  return [contactoZona, contactoSector].filter(Boolean).filter(c => {
    const key = c.correo.toLowerCase();
    if (vistos.has(key)) return false;
    vistos.add(key);
    return true;
  });
}

// ── Filtra los contactos de Zona/Sector según quién solicita, para no
// avisarle a alguien de su propio nivel o de un nivel inferior: escuela (o
// tipo vacío/desconocido — solicitudes previas a esta columna, se tratan
// como escuela) → Zona + Sector; supervisión (solicita la propia Zona) →
// solo Sector; jefatura o subdirección (solicita el propio Sector o SEPRN)
// → nadie, no hay a quién notificar arriba. ──
function aseFiltrarContactosPorTipo(contactos, tipoSolicitante) {
  if (tipoSolicitante === 'supervision') return contactos.filter(c => c.nivel === 'sector');
  if (tipoSolicitante === 'jefatura' || tipoSolicitante === 'subdireccion') return [];
  return contactos;
}

// ── Notificar por Telegram a OTDE (no interrumpe el registro si falla) ──
function aseNotificarTelegram(folio, d, oficioUrl) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const mensaje =
      '🎓 *Nueva solicitud de Asesoría*\n' +
      'Folio: ' + folio + '\n' +
      'Tipo: ' + aseEscapeMarkdown_(d.tipoAsesoria.trim()) + '\n' +
      'Nombre: ' + aseEscapeMarkdown_(d.nombre.trim()) + ' (' + aseEscapeMarkdown_(d.funcion.trim()) + ')\n' +
      'CCT: ' + aseEscapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + aseEscapeMarkdown_(d.escuela.trim()) : '') + '\n' +
      (d.sector ? 'Sector ' + aseEscapeMarkdown_(d.sector) + (d.zona ? ' · Zona ' + aseEscapeMarkdown_(d.zona) : '') + '\n' : '') +
      'Turno: ' + aseEscapeMarkdown_(d.turno.trim()) + '\n' +
      'Número de docentes: ' + d.numDocentes + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + '\n' +
      (d.observaciones ? 'Observaciones: ' + aseEscapeMarkdown_(d.observaciones.trim()) + '\n' : '') +
      'Oficio: ' + oficioUrl;

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

// ── Confirma al solicitante que su solicitud quedó registrada, con Zona y
// Sector en copia (CC) si hay contacto(s) registrados — un solo correo por
// solicitud en vez de avisos sueltos por destinatario. ──
function aseNotificarSolicitudRecibida(folio, d) {
  try {
    const contactos = aseFiltrarContactosPorTipo(
      aseBuscarContactosZonaSector(d.sector, d.zona), (d.tipoCct || '').trim());
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Recibimos tu solicitud de asesoría — Folio ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de asesoría recibida</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Se registró tu solicitud de asesoría. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + aseEscapeHtml_(d.tipoAsesoria.trim()) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + aseEscapeHtml_(d.escuela || '') + ' — ' + aseEscapeHtml_(d.cct.trim().toUpperCase()) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicita:</strong> ' + aseEscapeHtml_(d.nombre.trim()) + ' (' + aseEscapeHtml_(d.funcion.trim()) + ')</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Número de docentes:</strong> ' + d.numDocentes + '</p>' +
      '</div></div>';

    const opciones = {
      to: (d.correo || '').trim(),
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    aseEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada aunque falle este aviso
  }
}

// ── onEdit instalable: dispara al marcar Estatus = "Resuelto" ──
// No se llama "onEdit" a propósito: así solo corre vía el trigger instalable
// (aseInstalarTriggerCierre), nunca como trigger simple sin autorización
// para MailApp.
function aseOnEditCierre(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_ASE_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_ASE_ESTATUS < colInicio || COL_ASE_ESTATUS > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const estatus = String(hoja.getRange(fila, COL_ASE_ESTATUS).getValue()).trim();
      if (estatus !== 'Resuelto') continue;

      const yaNotificado = String(hoja.getRange(fila, COL_ASE_NOTIFICACION_CIERRE).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_ASE_SOLICITUDES.length).getValues()[0];
      aseNotificarCierre(datosFila);
      hoja.getRange(fila, COL_ASE_NOTIFICACION_CIERRE).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Avisa que el ticket se resolvió: un solo correo (to = solicitante,
// cc = Zona/Sector si hay contacto(s) registrados) en vez de 2 avisos
// sueltos como antes. ──
function aseNotificarCierre(fila) {
  try {
    const folio = fila[1];
    const tipo = fila[2];
    const nombre = fila[3];
    const cct = fila[5];
    const sector = fila[6];
    const zona = fila[7];
    const escuela = fila[8];
    const correo = String(fila[12] || '').trim();
    const notas = fila[16];
    const tipoSolicitante = String(fila[COL_ASE_TIPO_SOLICITANTE_IDX] || '').trim();

    if (!correo) return;

    const contactos = aseFiltrarContactosPorTipo(
      aseBuscarContactosZonaSector(sector, zona), tipoSolicitante);
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Tu solicitud de asesoría fue resuelta — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#56212f;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de asesoría resuelta</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Tu solicitud de asesoría fue marcada como resuelta por OTDE.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + aseEscapeHtml_(tipo) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + aseEscapeHtml_(escuela || '') + ' — ' + aseEscapeHtml_(cct) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicitó:</strong> ' + aseEscapeHtml_(nombre) + '</p>' +
      (notas ? '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Notas:</strong> ' + aseEscapeHtml_(notas) + '</p>' : '') +
      '</div></div>';

    const opciones = {
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    aseEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ── onEdit instalable: dispara al capturar/editar "Fecha programada de
// visita" — segundo trigger onEdit independiente del de cierre, mismo
// esqueleto que aseOnEditCierre. No se llama "onEdit" por la misma razón:
// solo debe correr vía aseInstalarTriggerProgramacion(). ──
function aseOnEditProgramacion(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_ASE_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_ASE_FECHA_PROGRAMADA < colInicio || COL_ASE_FECHA_PROGRAMADA > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const fechaProgramada = hoja.getRange(fila, COL_ASE_FECHA_PROGRAMADA).getValue();
      if (!fechaProgramada) continue;

      const yaNotificado = String(hoja.getRange(fila, COL_ASE_NOTIFICACION_PROGRAMADA).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_ASE_SOLICITUDES.length).getValues()[0];
      aseNotificarFechaProgramada(datosFila);
      hoja.getRange(fila, COL_ASE_NOTIFICACION_PROGRAMADA).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Avisa que ya hay fecha de visita programada: un solo correo (to =
// solicitante, cc = Zona/Sector si hay contacto(s) registrados), mismo
// patrón que aseNotificarCierre. ──
function aseNotificarFechaProgramada(fila) {
  try {
    const folio = fila[1];
    const tipo = fila[2];
    const nombre = fila[3];
    const cct = fila[5];
    const sector = fila[6];
    const zona = fila[7];
    const escuela = fila[8];
    const correo = String(fila[12] || '').trim();
    const tipoSolicitante = String(fila[COL_ASE_TIPO_SOLICITANTE_IDX] || '').trim();
    const fechaProgramadaRaw = fila[COL_ASE_FECHA_PROGRAMADA - 1];
    const fechaProgramada = fechaProgramadaRaw instanceof Date
      ? Utilities.formatDate(fechaProgramadaRaw, 'America/Mexico_City', 'dd/MM/yyyy')
      : String(fechaProgramadaRaw || '');

    if (!correo) return;

    const contactos = aseFiltrarContactosPorTipo(
      aseBuscarContactosZonaSector(sector, zona), tipoSolicitante);
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Tu solicitud de asesoría ya tiene fecha de visita — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Fecha de visita programada</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Ya se programó la fecha de la visita técnica para tu solicitud de asesoría.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Tipo:</strong> ' + aseEscapeHtml_(tipo) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Fecha de visita:</strong> ' + aseEscapeHtml_(fechaProgramada) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + aseEscapeHtml_(escuela || '') + ' — ' + aseEscapeHtml_(cct) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicitó:</strong> ' + aseEscapeHtml_(nombre) + '</p>' +
      '</div></div>';

    const opciones = {
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    aseEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ── Instala el trigger de cierre automático (seguro correrlo de nuevo:
// borra cualquier instalación previa antes de crear una nueva) ──
function aseInstalarTriggerCierre() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditCierre') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aseOnEditCierre')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de cierre automático instalado.'); } catch (err) {}
}

// ── Quita el trigger de cierre automático ──
function aseDesinstalarTriggerCierre() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditCierre') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de cierre eliminado(s).'); } catch (err) {}
}

// ── Instala el trigger de notificación de fecha programada (seguro
// correrlo de nuevo: borra cualquier instalación previa antes de crear una
// nueva) ──
function aseInstalarTriggerProgramacion() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditProgramacion') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aseOnEditProgramacion')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de programación de visita instalado.'); } catch (err) {}
}

// ── Quita el trigger de notificación de fecha programada ──
function aseDesinstalarTriggerProgramacion() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'aseOnEditProgramacion') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de programación eliminado(s).'); } catch (err) {}
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Asesorías')
    .addItem('Instalar trigger de cierre automático', 'aseInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'aseDesinstalarTriggerCierre')
    .addItem('Instalar trigger de programación de visita', 'aseInstalarTriggerProgramacion')
    .addItem('Desinstalar trigger de programación de visita', 'aseDesinstalarTriggerProgramacion')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function aseTextResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
