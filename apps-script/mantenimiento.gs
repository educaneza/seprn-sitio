// ============================================================
// SEPRN · OTDE — Solicitudes de Mantenimiento (captura en línea)
// Complementa el oficio (que sigue siendo el respaldo oficial):
// digitaliza los datos y adjunta el oficio escaneado, en vez de
// que OTDE los transcriba a mano a la hoja de seguimiento del
// sistema de Reportes de Visitas.
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//   2. Extensiones → Apps Script → pega este código completo
//   3. Llena manualmente la hoja "Contactos_Zona_Sector" (se crea
//      sola con encabezados la primera vez que corra doPost) con
//      el correo de cada Zona y de cada Sector — el solicitante
//      siempre recibe confirmación (su correo ya es obligatorio),
//      Zona y Sector se agregan en copia (CC) si hay fila para
//      cada uno; sin contactos registrados, solo se notifica al
//      solicitante y la solicitud se sigue registrando igual.
//   4. Configura las Propiedades del script (ícono de engrane
//      "Configuración del proyecto" → Propiedades del script):
//        TELEGRAM_BOT_TOKEN = token del bot (ver soporte-remoto.gs
//          para instrucciones completas de cómo obtenerlo — puede
//          ser el mismo bot que ya usan, pero las Propiedades del
//          script son por proyecto, hay que configurarlo de nuevo
//          aquí aunque sea el mismo valor)
//        TELEGRAM_CHAT_ID   = chat_id del mismo bot
//   5. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   6. Copia la URL generada y pégala en otde.html en la
//      constante MANTENIMIENTO_APPS_SCRIPT_URL
//
// COLUMNAS DE LA HOJA "Solicitudes":
//   A Fecha | B Folio | C Nombre | D Función | E CCT | F Sector
//   G Zona | H Escuela | I Turno | J WhatsApp | K Correo
//   L Equipos con falla | M Oficio (link Drive) | N Estatus | O Notas de revisión
//   P Notificación de cierre enviada | Q Tipo de equipo | R Cantidad (Aula de medios)
//   S Cantidad (Administrativas) | T Marca/Modelo | U Estado de instalación
//   V Tipo de solicitante | W Fecha programada de visita
//   X Notificación de fecha programada enviada
//
// COLUMNAS DE LA HOJA "Contactos_Zona_Sector" (Jorge la llena a mano):
//   A Sector | B Zona | C Correo | D Teléfono
// Puede haber una fila de Zona específica y otra de Sector (sin Zona, de
// respaldo) para el mismo Sector — manBuscarContactosZonaSector() busca
// AMBAS y las notifica en CC, no solo la primera que encuentra.
//
// CORREO — patrón único (apertura y cierre): un solo envío por evento con
// to = solicitante (su correo ya es obligatorio) y cc = contacto(s) de
// Zona/Sector si existen, en vez de avisos sueltos por destinatario.
//
// CIERRE AUTOMÁTICO: al marcar Estatus = "Resuelto" en la hoja "Solicitudes",
// un trigger onEdit instalable (manOnEditCierre) notifica al solicitante
// (con Zona/Sector en CC). Requiere correr UNA vez
// manInstalarTriggerCierre() (o el menú "OTDE Mantenimiento" que crea
// onOpen()) después de pegar esta versión — los triggers no se reinstalan
// solos al redesplegar.
//
// PROGRAMACIÓN DE VISITA: al escribir una fecha en la columna "Fecha
// programada de visita" de la hoja "Solicitudes", un segundo trigger onEdit
// instalable, independiente del de cierre (manOnEditProgramacion), notifica
// al solicitante (con Zona/Sector en CC) que ya hay fecha. Requiere correr
// UNA vez manInstalarTriggerProgramacion() (o el menú "OTDE Mantenimiento")
// después de pegar esta versión.
//
// CONSULTA DE FOLIO (Oficina Virtual OTDE): doGet(?action=consulta&folio=..
// &correo=...) devuelve estatus/fecha/notas si el folio y el correo
// coinciden, o {status:'no_encontrado'} en cualquier otro caso.
//
// PANEL OTDE (panel-otde.gs, Sheet aparte): doGet(?action=pendientes&
// token=...) devuelve todas las solicitudes abiertas. Configura el token
// una vez con manConfigurarTokenPanel('un-secreto-largo') antes de usarlo.
//
// REPORTE DE VISITA (Fase 2 hacia retirar v8.5, primer corte): hoja aparte
// "Reportes de visita" (autocreada, ver COLUMNAS abajo) donde el técnico o
// Jorge capturan los datos de la visita a mano — todavía no hay formulario
// propio. El menú "OTDE Mantenimiento" → "Generar y enviar reporte de
// visita" pide el folio, arma un PDF (tabla HTML, sin plantilla de Docs), lo
// guarda en la carpeta de Drive "Reportes de Visita" y notifica por correo
// a la escuela + el técnico responsable + OTDE (Zona/Sector NO se incluyen
// aquí — se enteran en el correo de cierre ya existente).
//
// COLUMNAS DE LA HOJA "Reportes de visita":
//   A Folio | B Responsable de visita | C Fecha de atención
//   D Inicio de la visita | E Fin de la visita | F Aula en uso al llegar
//   G Mobiliario | H Equipos atendidos | I Equipos funcionales
//   J Equipos no funcionales | K Conectividad | L Actividades preventivas
//   M Actividades correctivas | N Instalación realizada
//   O Equipos administrativos | P Estado del aula | Q Seguimiento requerido
//   R Observaciones | S PDF del reporte (link Drive)
//   T Notificación de reporte enviada
// ============================================================

const HOJA_MAN_SOLICITUDES = 'Solicitudes';
const HOJA_MAN_CONTACTOS = 'Contactos_Zona_Sector';
const CARPETA_MAN_OFICIOS = 'Oficios de Mantenimiento';
const MAN_TAMANO_MAX_BYTES = 8 * 1024 * 1024; // 8MB, margen sobre el límite de 5MB validado en el cliente

const ENCABEZADOS_MAN_SOLICITUDES = [
  'Fecha', 'Folio', 'Nombre', 'Función', 'CCT', 'Sector', 'Zona',
  'Escuela', 'Turno', 'WhatsApp', 'Correo', 'Equipos con falla',
  'Oficio (link Drive)', 'Estatus', 'Notas de revisión',
  'Notificación de cierre enviada', 'Tipo de equipo', 'Cantidad (Aula de medios)',
  'Cantidad (Administrativas)', 'Marca/Modelo', 'Estado de instalación',
  'Tipo de solicitante', 'Fecha programada de visita',
  'Notificación de fecha programada enviada'
];
// Índice (0-based) de 'Tipo de solicitante' dentro de una fila leída con getValues() —
// ya no es la última columna (se agregaron 2 más después, misma lógica de no correr
// columnas existentes), así que queda fijo en vez de derivarse de .length - 1.
const COL_MAN_TIPO_SOLICITANTE_IDX = 21;
const COL_MAN_ESTATUS = 14;
const COL_MAN_NOTIFICACION_CIERRE = 16;
// Fecha programada de visita y su columna de control — agregadas al final,
// mismo criterio, para no correr ninguna columna existente.
const COL_MAN_FECHA_PROGRAMADA = 23;
const COL_MAN_NOTIFICACION_PROGRAMADA = 24;
const ESTADOS_MAN_VALIDOS = ['Pendiente de validar', 'Validado', 'En atención', 'Resuelto', 'Rechazado'];

// ── Fase 2 hacia retirar v8.5: reporte técnico de la visita, en una hoja
// aparte ligada a Solicitudes por folio (no una columna más de Solicitudes,
// a diferencia de la Fase 1 — aquí son ~15 campos que llena el técnico, no
// uno solo). Por ahora se llenan a mano en esta hoja (sin formulario propio
// todavía); "Generar y enviar reporte de visita" del menú arma el PDF y
// notifica. Ver docs/ARCHITECTURE.md §15. ──
const HOJA_MAN_REPORTES = 'Reportes de visita';
const CARPETA_MAN_REPORTES = 'Reportes de Visita';
const ENCABEZADOS_MAN_REPORTES = [
  'Folio', 'Responsable de visita', 'Fecha de atención', 'Inicio de la visita',
  'Fin de la visita', 'Aula en uso al llegar', 'Mobiliario', 'Equipos atendidos',
  'Equipos funcionales', 'Equipos no funcionales', 'Conectividad',
  'Actividades preventivas', 'Actividades correctivas', 'Instalación realizada',
  'Equipos administrativos', 'Estado del aula', 'Seguimiento requerido',
  'Observaciones', 'PDF del reporte (link Drive)', 'Notificación de reporte enviada'
];
const COL_MAN_REP_FOLIO = 1;
const COL_MAN_REP_RESPONSABLE = 2;
const COL_MAN_REP_FECHA_ATENCION = 3;
const COL_MAN_REP_ESTADO_AULA = 16;
const COL_MAN_REP_PDF_URL = 19;
const COL_MAN_REP_NOTIFICACION = 20;
// Nombre → correo, para el "cc" del correo del reporte y el selector de la
// hoja. Mismo criterio de "no inventar" que el resto del sitio — confirmado
// por Jorge, no copiado de v8.5 (ese proyecto no expuso los correos reales
// al revisarlo en vivo).
const MAN_TECNICOS = {
  'Alejandro Morales García': 'alejandro.morales@dee.edu.mx',
  'Marcos Colín Mora': 'marcos.colin@dee.edu.mx'
};
const MAN_ESTADOS_AULA = [
  '🟢 Operativa — todos los equipos encienden y funcionan correctamente. Lista para uso regular, asesorías y aula modelo.',
  '🟡 Operativa con observaciones — funciona pero con detalles menores que no impiden su uso.',
  '🟠 Operativa parcialmente — menos del 70% de equipos funcionales o intervención incompleta. Uso limitado, se requiere segunda visita.',
  '🔴 No operativa — la mayoría de los equipos no funciona o el aula no está en condiciones de uso.'
];

// ── Modo de prueba: redirige TODOS los correos salientes (Zona/Sector +
// cierre) a un solo correo, para probar el flujo completo sin avisar a
// escuelas/zonas/sectores reales. Actívalo corriendo
// manActivarModoPrueba('tu@correo.com') una vez desde el editor de Apps
// Script; desactívalo con manDesactivarModoPrueba(). No requiere redeploy —
// es una Script Property, se lee en cada envío. ──
function manActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function manDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

// ── Token del Panel OTDE: a diferencia de ?action=consulta (que exige ya
// conocer un folio + correo específicos), ?action=pendientes regresa TODAS
// las solicitudes abiertas con nombre/escuela/contacto — sin este token
// cualquiera que viera la URL en el código fuente del sitio podría listar
// esos datos. Configúralo una vez con manConfigurarTokenPanel('un-secreto-
// largo') desde el editor — el mismo valor debe pegarse en panel-otde.gs. ──
function manConfigurarTokenPanel(token) {
  PropertiesService.getScriptProperties().setProperty('PANEL_TOKEN', token);
}

// ── Escapa HTML/Markdown de campos capturados por el solicitante antes de
// insertarlos en el cuerpo de un correo o mensaje de Telegram — el endpoint
// es público, así que sin esto cualquiera podría inyectar <a>/<img> en un
// correo con membrete institucional real, o un link falso en Telegram. ──
function manEscapeHtml_(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function manEscapeMarkdown_(valor) {
  return String(valor == null ? '' : valor).replace(/([_*[\]`])/g, '\\$1');
}

function manEnviarCorreo_(opciones) {
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
    return manConsultarFolio(e.parameter.folio, e.parameter.correo);
  }
  if (accion === 'pendientes') {
    return manListarPendientes(e.parameter.token);
  }
  return manTextResponse(JSON.stringify({ status: 'ok', servicio: 'OTDE Solicitudes de Mantenimiento' }));
}

// ── Lista de solicitudes abiertas para el Panel OTDE (?action=pendientes) ──
// "Abierta" = Estatus distinto de Resuelto/Rechazado (o vacío, que
// manConsultarFolio ya trata como recién creada). Requiere el mismo token
// configurado con manConfigurarTokenPanel() — ver esa función arriba.
function manListarPendientes(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('PANEL_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return manTextResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_MAN_SOLICITUDES);
  if (!hoja) return manTextResponse(JSON.stringify({ status: 'ok', tramite: 'Mantenimiento', items: [] }));

  const filas = hoja.getDataRange().getValues().slice(1);
  const items = filas
    .filter(function (r) { return r[1]; }) // folio no vacío
    .filter(function (r) {
      const estatus = String(r[COL_MAN_ESTATUS - 1] || '').trim();
      return estatus !== 'Resuelto' && estatus !== 'Rechazado';
    })
    .map(function (r) {
      return {
        folio: r[1],
        fecha: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
        nombre: r[2],
        escuela: r[7],
        sector: r[5],
        zona: r[6],
        estatus: String(r[COL_MAN_ESTATUS - 1] || 'Pendiente de validar').trim(),
        notas: r[14] || '',
        fechaProgramada: r[COL_MAN_FECHA_PROGRAMADA - 1] instanceof Date
          ? r[COL_MAN_FECHA_PROGRAMADA - 1].toISOString() : (r[COL_MAN_FECHA_PROGRAMADA - 1] || '')
      };
    });

  return manTextResponse(JSON.stringify({ status: 'ok', tramite: 'Mantenimiento', items: items }));
}

// ── Consulta de estatus por folio + correo (Oficina Virtual OTDE) ──
// Lectura directa por getSheetByName(), sin pasar por manObtenerHojaSolicitudes()
// a propósito: esa función escribe (auto-heal de encabezados, validación de
// dropdown), efectos secundarios que no debe tener una consulta de solo lectura.
// Mismo mensaje genérico si el folio no existe o si el correo no coincide, para
// no dejar adivinar folios válidos por descarte.
function manConsultarFolio(folioBuscado, correoBuscado) {
  const noEncontrado = function () {
    return manTextResponse(JSON.stringify({ status: 'no_encontrado' }));
  };
  if (!folioBuscado || !correoBuscado) return noEncontrado();

  const folio = String(folioBuscado).trim().toUpperCase();
  const correo = String(correoBuscado).trim().toLowerCase();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_MAN_SOLICITUDES);
  if (!hoja) return noEncontrado();

  const filas = hoja.getDataRange().getValues().slice(1);
  const fila = filas.find(r => String(r[1]).trim().toUpperCase() === folio);
  if (!fila || String(fila[10]).trim().toLowerCase() !== correo) return noEncontrado();

  return manTextResponse(JSON.stringify({
    status: 'ok',
    folio: fila[1],
    fecha: fila[0] instanceof Date ? fila[0].toISOString() : String(fila[0]),
    estatus: fila[COL_MAN_ESTATUS - 1],
    notas: fila[14] || '',
    fechaProgramada: fila[COL_MAN_FECHA_PROGRAMADA - 1] instanceof Date
      ? fila[COL_MAN_FECHA_PROGRAMADA - 1].toISOString() : (fila[COL_MAN_FECHA_PROGRAMADA - 1] || '')
  }));
}

// ── doPost: recibe solicitud de mantenimiento ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    manValidarCampos(datos);

    const oficioUrl = manSubirOficio(datos);

    const hoja = manObtenerHojaSolicitudes();
    const folio = manGenerarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.nombre.trim(),
      datos.funcion.trim(),
      datos.cct.trim().toUpperCase(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      (datos.escuela || '').trim(),
      datos.turno.trim(),
      datos.whatsapp.trim(),
      (datos.correo || '').trim(),
      datos.equipos.trim(),
      oficioUrl,
      'Pendiente de validar',
      '',
      '',
      (datos.tipoEquipo || '').trim(),
      (datos.cantidadAula || '').trim(),
      (datos.cantidadAdmin || '').trim(),
      (datos.marcaModelo || '').trim(),
      (datos.estadoEquipo || '').trim(),
      (datos.tipoCct || '').trim()
    ]);

    manNotificarTelegram(folio, datos, oficioUrl);
    manNotificarSolicitudRecibida(folio, datos);

    return manTextResponse(JSON.stringify({ status: 'ok', folio: folio }));

  } catch (err) {
    return manTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Obtener o crear la hoja de solicitudes ──
function manObtenerHojaSolicitudes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_MAN_SOLICITUDES);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_MAN_SOLICITUDES);
    hoja.appendRow(ENCABEZADOS_MAN_SOLICITUDES);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_MAN_SOLICITUDES.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180);  // Nombre
    hoja.setColumnWidth(8, 200);  // Escuela
    hoja.setColumnWidth(12, 260); // Equipos con falla
    hoja.setColumnWidth(13, 220); // Oficio
  } else {
    // Hoja creada antes de agregar la columna de cierre: se completa el
    // encabezado faltante sin tocar las columnas ni los datos ya existentes.
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_MAN_SOLICITUDES.length) {
      const faltantes = ENCABEZADOS_MAN_SOLICITUDES.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  manAplicarValidacionEstatus(hoja);
  manAsegurarHojaContactos(ss);
  manAsegurarHojaReportes(ss);

  return hoja;
}

// ── Dropdown de valores válidos en la columna Estatus (idempotente) ──
function manAplicarValidacionEstatus(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_MAN_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_MAN_ESTATUS, 1000, 1).setDataValidation(regla);
}

// ── Crear la hoja de contactos vacía si no existe (Jorge la llena a mano) ──
function manAsegurarHojaContactos(ss) {
  let hoja = ss.getSheetByName(HOJA_MAN_CONTACTOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_MAN_CONTACTOS);
    hoja.appendRow(['Sector', 'Zona', 'Correo', 'Teléfono']);
    const header = hoja.getRange(1, 1, 1, 4);
    header.setFontWeight('bold')
          .setBackground('#977e5b')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 240);
  }
}

// ── Crear (o completar encabezados de) la hoja de reportes de visita —
// mismo patrón de auto-heal que manObtenerHojaSolicitudes(), para que una
// hoja creada antes de agregar un campo nuevo se complete sola. El técnico
// (o Jorge) llena las filas a mano por ahora; no hay formulario propio
// todavía (Fase 2, primer corte). ──
function manAsegurarHojaReportes(ss) {
  let hoja = ss.getSheetByName(HOJA_MAN_REPORTES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_MAN_REPORTES);
    hoja.appendRow(ENCABEZADOS_MAN_REPORTES);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_MAN_REPORTES.length);
    header.setFontWeight('bold')
          .setBackground('#56212f')
          .setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(6, 200);  // Aula en uso al llegar
    hoja.setColumnWidth(8, 200);  // Equipos atendidos
    hoja.setColumnWidth(16, 320); // Estado del aula
    hoja.setColumnWidth(18, 240); // Observaciones
  } else {
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_MAN_REPORTES.length) {
      const faltantes = ENCABEZADOS_MAN_REPORTES.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  hoja.getRange(2, COL_MAN_REP_RESPONSABLE, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(Object.keys(MAN_TECNICOS), true).setAllowInvalid(false).build()
  );
  hoja.getRange(2, COL_MAN_REP_ESTADO_AULA, 1000, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(MAN_ESTADOS_AULA, true).setAllowInvalid(false).build()
  );
}

// ── Generar folio único ──
function manGenerarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const prefix = 'OTDE-MAN-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function manValidarCampos(d) {
  const requeridos = ['nombre', 'cct', 'escuela', 'turno', 'funcion', 'whatsapp', 'correo', 'equipos', 'tipoEquipo'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (d.correo && String(d.correo).trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
  if (!d.oficioBase64 || !d.oficioNombre) {
    throw new Error('Falta adjuntar el oficio.');
  }
}

// ── Subir el oficio adjunto a Drive, devuelve el URL para verlo ──
function manSubirOficio(d) {
  const bytes = Utilities.base64Decode(d.oficioBase64);
  if (bytes.length > MAN_TAMANO_MAX_BYTES) {
    throw new Error('El oficio adjunto es demasiado grande (máximo 8MB).');
  }

  const mimeType = d.oficioTipo || 'application/octet-stream';
  const nombreLimpio = (d.cct || 'SIN-CCT').trim().toUpperCase() + ' — ' + d.oficioNombre;
  const blob = Utilities.newBlob(bytes, mimeType, nombreLimpio);

  const carpeta = manObtenerCarpetaOficios();
  const archivo = carpeta.createFile(blob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return archivo.getUrl();
}

// ── Obtener o crear la carpeta de Drive para los oficios ──
function manObtenerCarpetaOficios() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_MAN_OFICIOS);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_MAN_OFICIOS);
}

// ── Buscar los contactos de Zona y de Sector en la hoja de contactos —
// pueden ser dos filas distintas (Zona específica + Sector de respaldo sin
// Zona) y ambas jefaturas quieren enterarse, así que se devuelven las que
// existan (0, 1 o 2), sin quedarse en la primera coincidencia. ──
function manBuscarContactosZonaSector(sector, zona) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJA_MAN_CONTACTOS);
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
function manFiltrarContactosPorTipo(contactos, tipoSolicitante) {
  if (tipoSolicitante === 'supervision') return contactos.filter(c => c.nivel === 'sector');
  if (tipoSolicitante === 'jefatura' || tipoSolicitante === 'subdireccion') return [];
  return contactos;
}

// ── Notificar por Telegram a OTDE (no interrumpe el registro si falla) ──
function manNotificarTelegram(folio, d, oficioUrl) {
  try {
    const props = PropertiesService.getScriptProperties();
    const token  = props.getProperty('TELEGRAM_BOT_TOKEN');
    const chatId = props.getProperty('TELEGRAM_CHAT_ID');
    if (!token || !chatId) return;

    const mensaje =
      '🛠 *Nueva solicitud de Mantenimiento*\n' +
      'Folio: ' + folio + '\n' +
      'Nombre: ' + manEscapeMarkdown_(d.nombre.trim()) + ' (' + manEscapeMarkdown_(d.funcion.trim()) + ')\n' +
      'CCT: ' + manEscapeMarkdown_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + manEscapeMarkdown_(d.escuela.trim()) : '') + '\n' +
      (d.sector ? 'Sector ' + manEscapeMarkdown_(d.sector) + (d.zona ? ' · Zona ' + manEscapeMarkdown_(d.zona) : '') + '\n' : '') +
      'Turno: ' + manEscapeMarkdown_(d.turno.trim()) + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + '\n' +
      (d.tipoEquipo ? 'Tipo de equipo: ' + manEscapeMarkdown_(d.tipoEquipo) + '\n' : '') +
      'Equipos con falla: ' + manEscapeMarkdown_(d.equipos.trim()) + '\n' +
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
function manNotificarSolicitudRecibida(folio, d) {
  try {
    const contactos = manFiltrarContactosPorTipo(
      manBuscarContactosZonaSector(d.sector, d.zona), (d.tipoCct || '').trim());
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Recibimos tu solicitud de mantenimiento — Folio ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de mantenimiento recibida</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Se registró tu solicitud de mantenimiento. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + manEscapeHtml_(d.escuela || '') + ' — ' + manEscapeHtml_(d.cct.trim().toUpperCase()) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicita:</strong> ' + manEscapeHtml_(d.nombre.trim()) + ' (' + manEscapeHtml_(d.funcion.trim()) + ')</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Equipos con falla:</strong> ' + manEscapeHtml_(d.equipos.trim()) + '</p>' +
      '</div></div>';

    const opciones = {
      to: (d.correo || '').trim(),
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    manEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada aunque falle este aviso
  }
}

// ── onEdit instalable: dispara al marcar Estatus = "Resuelto" ──
// No se llama "onEdit" a propósito: así solo corre vía el trigger instalable
// (manInstalarTriggerCierre), nunca como trigger simple sin autorización
// para MailApp.
function manOnEditCierre(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_MAN_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_MAN_ESTATUS < colInicio || COL_MAN_ESTATUS > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const estatus = String(hoja.getRange(fila, COL_MAN_ESTATUS).getValue()).trim();
      if (estatus !== 'Resuelto') continue;

      const yaNotificado = String(hoja.getRange(fila, COL_MAN_NOTIFICACION_CIERRE).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_MAN_SOLICITUDES.length).getValues()[0];
      manNotificarCierre(datosFila);
      hoja.getRange(fila, COL_MAN_NOTIFICACION_CIERRE).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Avisa que el ticket se resolvió: un solo correo (to = solicitante,
// cc = Zona/Sector si hay contacto(s) registrados) en vez de 2 avisos
// sueltos como antes. ──
function manNotificarCierre(fila) {
  try {
    const folio = fila[1];
    const nombre = fila[2];
    const cct = fila[4];
    const sector = fila[5];
    const zona = fila[6];
    const escuela = fila[7];
    const correo = String(fila[10] || '').trim();
    const notas = fila[14];
    const tipoSolicitante = String(fila[COL_MAN_TIPO_SOLICITANTE_IDX] || '').trim();

    if (!correo) return;

    const contactos = manFiltrarContactosPorTipo(
      manBuscarContactosZonaSector(sector, zona), tipoSolicitante);
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Tu solicitud de mantenimiento fue resuelta — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#56212f;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Solicitud de mantenimiento resuelta</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Tu solicitud de mantenimiento fue marcada como resuelta por OTDE.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + manEscapeHtml_(escuela || '') + ' — ' + manEscapeHtml_(cct) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicitó:</strong> ' + manEscapeHtml_(nombre) + '</p>' +
      (notas ? '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Notas:</strong> ' + manEscapeHtml_(notas) + '</p>' : '') +
      '</div></div>';

    const opciones = {
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    manEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ── onEdit instalable: dispara al capturar/editar "Fecha programada de
// visita" — segundo trigger onEdit independiente del de cierre, mismo
// esqueleto que manOnEditCierre. No se llama "onEdit" por la misma razón:
// solo debe correr vía manInstalarTriggerProgramacion(). ──
function manOnEditProgramacion(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_MAN_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    if (COL_MAN_FECHA_PROGRAMADA < colInicio || COL_MAN_FECHA_PROGRAMADA > colFin) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const fechaProgramada = hoja.getRange(fila, COL_MAN_FECHA_PROGRAMADA).getValue();
      if (!fechaProgramada) continue;

      const yaNotificado = String(hoja.getRange(fila, COL_MAN_NOTIFICACION_PROGRAMADA).getValue()).trim();
      if (yaNotificado === 'Sí') continue;

      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_MAN_SOLICITUDES.length).getValues()[0];
      manNotificarFechaProgramada(datosFila);
      hoja.getRange(fila, COL_MAN_NOTIFICACION_PROGRAMADA).setValue('Sí');
    }
  } catch (err) {
    // Silencioso: un fallo aquí no debe romper la edición del Sheet
  }
}

// ── Avisa que ya hay fecha de visita programada: un solo correo (to =
// solicitante, cc = Zona/Sector si hay contacto(s) registrados), mismo
// patrón que manNotificarCierre. ──
function manNotificarFechaProgramada(fila) {
  try {
    const folio = fila[1];
    const nombre = fila[2];
    const cct = fila[4];
    const sector = fila[5];
    const zona = fila[6];
    const escuela = fila[7];
    const correo = String(fila[10] || '').trim();
    const tipoSolicitante = String(fila[COL_MAN_TIPO_SOLICITANTE_IDX] || '').trim();
    const fechaProgramadaRaw = fila[COL_MAN_FECHA_PROGRAMADA - 1];
    const fechaProgramada = fechaProgramadaRaw instanceof Date
      ? Utilities.formatDate(fechaProgramadaRaw, 'America/Mexico_City', 'dd/MM/yyyy')
      : String(fechaProgramadaRaw || '');

    if (!correo) return;

    const contactos = manFiltrarContactosPorTipo(
      manBuscarContactosZonaSector(sector, zona), tipoSolicitante);
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Tu solicitud de mantenimiento ya tiene fecha de visita — ' + folio;
    const html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
      '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
      '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Fecha de visita programada</p>' +
      '</div>' +
      '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
      '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Ya se programó la fecha de la visita técnica para tu solicitud de mantenimiento.</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + folio + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Fecha de visita:</strong> ' + manEscapeHtml_(fechaProgramada) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + manEscapeHtml_(escuela || '') + ' — ' + manEscapeHtml_(cct) + '</p>' +
      '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Solicitó:</strong> ' + manEscapeHtml_(nombre) + '</p>' +
      '</div></div>';

    const opciones = {
      to: correo,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    };
    if (cc) opciones.cc = cc;
    manEnviarCorreo_(opciones);
  } catch (err) {
    // Silencioso: el Sheet ya quedó actualizado aunque falle este aviso
  }
}

// ============================================================
// FASE 2 (primer corte): REPORTE TÉCNICO DE LA VISITA
// Acción manual de menú, no un trigger automático — a diferencia de la
// programación de fecha (un solo campo), aquí el técnico llena ~15 campos
// en varios momentos, así que un onEdit de una sola columna dispararía el
// correo a medio llenar. Jorge/el técnico terminan la fila en "Reportes de
// visita" y corren "Generar y enviar reporte de visita" desde el menú,
// dando el folio.
// ============================================================

// ── Busca la fila de Solicitudes con ese folio, regresa los datos que el
// reporte necesita (escuela/CCT/sector/zona/correo) o null si no existe. ──
function manBuscarSolicitudPorFolio_(folio) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_MAN_SOLICITUDES);
  if (!hoja) return null;
  const filas = hoja.getDataRange().getValues().slice(1);
  const fila = filas.find(r => String(r[1]).trim().toUpperCase() === folio);
  if (!fila) return null;
  return {
    folio: fila[1],
    nombre: fila[2],
    cct: fila[4],
    sector: fila[5],
    zona: fila[6],
    escuela: fila[7],
    correo: String(fila[10] || '').trim()
  };
}

// ── Busca la fila de "Reportes de visita" con ese folio. Regresa
// {rowIndex, datos} (rowIndex en base 1, tal cual lo usa getRange) o null. ──
function manBuscarFilaReportePorFolio_(hoja, folio) {
  const valores = hoja.getDataRange().getValues();
  for (let i = 1; i < valores.length; i++) {
    if (String(valores[i][COL_MAN_REP_FOLIO - 1]).trim().toUpperCase() === folio) {
      return { rowIndex: i + 1, datos: valores[i] };
    }
  }
  return null;
}

// ── Campos mínimos para generar el reporte — no se exige llenar las ~15
// columnas completas (equipos sin atender, observaciones libres, etc. son
// legítimamente opcionales), solo lo indispensable para que el PDF y el
// correo tengan sentido. ──
function manValidarDatosReporte_(datos) {
  const faltantes = [];
  if (!String(datos[COL_MAN_REP_RESPONSABLE - 1] || '').trim()) faltantes.push('Responsable de visita');
  if (!datos[COL_MAN_REP_FECHA_ATENCION - 1]) faltantes.push('Fecha de atención');
  if (!String(datos[COL_MAN_REP_ESTADO_AULA - 1] || '').trim()) faltantes.push('Estado del aula');
  return faltantes;
}

// ── Obtener o crear la carpeta de Drive para los reportes de visita ──
function manObtenerCarpetaReportes_() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_MAN_REPORTES);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_MAN_REPORTES);
}

// ── Arma el PDF del reporte como una tabla HTML (mismo criterio de color
// institucional que el resto del sitio) y lo convierte a PDF — sin
// plantilla de Docs/Slides, para no depender de un archivo aparte que
// mantener sincronizado. ──
function manGenerarPDFReporte_(solicitud, datos) {
  const fmt = (v) => v instanceof Date
    ? Utilities.formatDate(v, 'America/Mexico_City', 'dd/MM/yyyy HH:mm')
    : manEscapeHtml_(v || '—');

  const filas = [
    ['Folio', solicitud.folio],
    ['Escuela / CCT', (solicitud.escuela || '') + ' — ' + solicitud.cct],
    ['Sector / Zona', 'Sector ' + (solicitud.sector || '—') + ' · Zona ' + (solicitud.zona || '—')],
    ['Responsable de visita', datos[COL_MAN_REP_RESPONSABLE - 1]],
    ['Fecha de atención', fmt(datos[2])],
    ['Inicio de la visita', fmt(datos[3])],
    ['Fin de la visita', fmt(datos[4])],
    ['Aula en uso al llegar', datos[5]],
    ['Mobiliario', datos[6]],
    ['Equipos atendidos', datos[7]],
    ['Equipos funcionales', datos[8]],
    ['Equipos no funcionales', datos[9]],
    ['Conectividad', datos[10]],
    ['Actividades preventivas', datos[11]],
    ['Actividades correctivas', datos[12]],
    ['Instalación realizada', datos[13]],
    ['Equipos administrativos', datos[14]],
    ['Estado del aula', datos[COL_MAN_REP_ESTADO_AULA - 1]],
    ['Seguimiento requerido', datos[16]],
    ['Observaciones', datos[17]]
  ];

  const filasHtml = filas.map(([etiqueta, valor]) =>
    '<tr><td style="padding:6px 10px;border-bottom:1px solid #d6d1ca;font-weight:bold;' +
    'color:#56212f;width:220px;">' + manEscapeHtml_(etiqueta) + '</td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #d6d1ca;">' +
    manEscapeHtml_(valor || '—') + '</td></tr>'
  ).join('');

  const html =
    '<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#333;">' +
    '<div style="background:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
    '<div style="color:#fff;font-size:16px;font-weight:bold;">Reporte de Visita Técnica · OTDE</div>' +
    '<div style="color:#F9F8F5;font-size:12px;">Oficina de Tecnología para el Desarrollo Educativo · SEPRN</div>' +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:12px;">' + filasHtml + '</table>' +
    '</body></html>';

  const blobHtml = Utilities.newBlob(html, 'text/html', 'reporte.html');
  return blobHtml.getAs('application/pdf').setName(solicitud.folio + ' — Reporte de visita.pdf');
}

// ── Guarda el PDF en Drive (carpeta "Reportes de Visita", autocreada), lo
// comparte como "cualquiera con el link, solo ver" y regresa la URL. ──
function manGuardarPDFReporte_(pdfBlob) {
  const carpeta = manObtenerCarpetaReportes_();
  const archivo = carpeta.createFile(pdfBlob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return archivo.getUrl();
}

// ── Notifica que el reporte de visita quedó listo: escuela + técnico + OTDE
// (decisión de Jorge, 25 ago 2026 — Zona/Sector NO se incluyen aquí para no
// saturarlos; se enteran en el correo de cierre que ya existe cuando Jorge
// marca Estatus = Resuelto). PDF adjunto, mismo wrapper manEnviarCorreo_
// (respeta el modo de prueba). ──
function manEnviarReporteVisita_(solicitud, datos, pdfBlob) {
  const responsable = String(datos[COL_MAN_REP_RESPONSABLE - 1] || '').trim();
  const correoTecnico = MAN_TECNICOS[responsable];
  const asunto = 'Reporte de visita técnica — ' + (solicitud.escuela || solicitud.cct) + ' · ' + solicitud.folio;
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;">' +
    '<div style="background-color:#9F2241;padding:16px 20px;border-radius:8px 8px 0 0;">' +
    '<p style="margin:0;color:#fff;font-size:15px;font-weight:bold;">OTDE — Reporte de visita técnica</p>' +
    '</div>' +
    '<div style="border:1px solid #d6d1ca;border-top:none;border-radius:0 0 8px 8px;padding:18px 20px;">' +
    '<p style="margin:0 0 10px 0;font-size:14px;color:#333;">Adjuntamos el reporte de la visita técnica realizada.</p>' +
    '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Folio:</strong> ' + solicitud.folio + '</p>' +
    '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Escuela / CCT:</strong> ' + manEscapeHtml_(solicitud.escuela || '') + ' — ' + manEscapeHtml_(solicitud.cct) + '</p>' +
    '<p style="margin:0 0 4px 0;font-size:13px;color:#333;"><strong>Estado del aula:</strong> ' + manEscapeHtml_(String(datos[COL_MAN_REP_ESTADO_AULA - 1] || '')) + '</p>' +
    '</div></div>';

  const opciones = {
    to: solicitud.correo,
    cc: [correoTecnico, 'otde.nezahualcoyotl@dee.edu.mx'].filter(Boolean).join(','),
    subject: asunto,
    htmlBody: html,
    name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
    replyTo: 'otde.nezahualcoyotl@dee.edu.mx',
    attachments: [pdfBlob]
  };
  manEnviarCorreo_(opciones);
}

// ── Acción de menú: arma el PDF y notifica el reporte de visita de un
// folio dado. Valida que la solicitud y la fila del reporte existan, que
// los campos mínimos estén llenos, y confirma antes de reenviar si ya se
// había notificado. ──
function manGenerarYEnviarReporteVisita() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('Generar reporte de visita', 'Folio de la solicitud (ej. OTDE-MAN-0007):', ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  const folio = resp.getResponseText().trim().toUpperCase();
  if (!folio) return;

  const solicitud = manBuscarSolicitudPorFolio_(folio);
  if (!solicitud) { ui.alert('No se encontró una solicitud con folio "' + folio + '" en Solicitudes.'); return; }

  const hojaReportes = manObtenerHojaReportes_();
  const filaReporte = manBuscarFilaReportePorFolio_(hojaReportes, folio);
  if (!filaReporte) {
    ui.alert('No hay ninguna fila en "Reportes de visita" con folio "' + folio + '". Agrégala primero con los datos de la visita.');
    return;
  }

  const faltantes = manValidarDatosReporte_(filaReporte.datos);
  if (faltantes.length) {
    ui.alert('Faltan campos obligatorios en esa fila: ' + faltantes.join(', ') + '.');
    return;
  }

  const yaNotificado = String(filaReporte.datos[COL_MAN_REP_NOTIFICACION - 1] || '').trim();
  if (yaNotificado === 'Sí') {
    const confirmar = ui.alert('Ya se había notificado este reporte antes.', '¿Reenviarlo de todas formas?', ui.ButtonSet.YES_NO);
    if (confirmar !== ui.Button.YES) return;
  }

  const pdfBlob = manGenerarPDFReporte_(solicitud, filaReporte.datos);
  const urlPDF = manGuardarPDFReporte_(pdfBlob);
  manEnviarReporteVisita_(solicitud, filaReporte.datos, pdfBlob);

  hojaReportes.getRange(filaReporte.rowIndex, COL_MAN_REP_PDF_URL).setValue(urlPDF);
  hojaReportes.getRange(filaReporte.rowIndex, COL_MAN_REP_NOTIFICACION).setValue('Sí');
  ui.alert('Reporte enviado a la escuela, el técnico y OTDE.');
}

// ── La hoja de reportes es "ligera": a diferencia de Solicitudes, no
// escribe nada al leerla desde el menú — solo la busca. Si no existe
// todavía (nunca corrió manObtenerHojaSolicitudes()/doPost), la crea aquí. ──
function manObtenerHojaReportes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  manAsegurarHojaReportes(ss);
  return ss.getSheetByName(HOJA_MAN_REPORTES);
}

// ── Instala el trigger de cierre automático (seguro correrlo de nuevo:
// borra cualquier instalación previa antes de crear una nueva) ──
function manInstalarTriggerCierre() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'manOnEditCierre') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('manOnEditCierre')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de cierre automático instalado.'); } catch (err) {}
}

// ── Quita el trigger de cierre automático ──
function manDesinstalarTriggerCierre() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'manOnEditCierre') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de cierre eliminado(s).'); } catch (err) {}
}

// ── Instala el trigger de notificación de fecha programada (seguro
// correrlo de nuevo: borra cualquier instalación previa antes de crear una
// nueva) ──
function manInstalarTriggerProgramacion() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'manOnEditProgramacion') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('manOnEditProgramacion')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger de programación de visita instalado.'); } catch (err) {}
}

// ── Quita el trigger de notificación de fecha programada ──
function manDesinstalarTriggerProgramacion() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'manOnEditProgramacion') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de programación eliminado(s).'); } catch (err) {}
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Mantenimiento')
    .addItem('Instalar trigger de cierre automático', 'manInstalarTriggerCierre')
    .addItem('Desinstalar trigger de cierre automático', 'manDesinstalarTriggerCierre')
    .addItem('Instalar trigger de programación de visita', 'manInstalarTriggerProgramacion')
    .addItem('Desinstalar trigger de programación de visita', 'manDesinstalarTriggerProgramacion')
    .addItem('Generar y enviar reporte de visita', 'manGenerarYEnviarReporteVisita')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function manTextResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}
