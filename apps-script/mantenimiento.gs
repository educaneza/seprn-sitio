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
//   X Notificación de fecha programada enviada | Y Técnico asignado
//   Z Notificación a técnico enviada
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
// PROGRAMACIÓN DE VISITA: al escribir una fecha en "Fecha programada de
// visita" o un nombre en "Técnico asignado" (columnas de la hoja
// "Solicitudes"), un segundo trigger onEdit instalable, independiente del de
// cierre (manOnEditProgramacion), dispara dos avisos que pueden llenarse en
// cualquier orden: (1) con solo la fecha, notifica al solicitante (con
// Zona/Sector en CC) que ya hay fecha; (2) en cuanto AMBAS (fecha + técnico)
// tienen valor, avisa también al técnico asignado (folio, escuela, fecha,
// equipos con falla y link a reporte-visita.html) — antes nadie en el
// sistema le avisaba, Jorge coordinaba con él por fuera. Requiere correr UNA
// vez manInstalarTriggerProgramacion() (o el menú "OTDE Mantenimiento")
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
// REPORTE DE VISITA (Fase 2 hacia retirar v8.5): hoja aparte "Reportes de
// visita" (autocreada, ver COLUMNAS abajo) ligada a "Solicitudes" por folio.
// Dos caminos para llenarla y notificar:
//   1. Formulario propio del técnico (reporte-visita.html, ago 2026):
//      doPost con {accion:'reporteVisita', folio, ...} — valida el folio
//      contra "Solicitudes", hace upsert de la fila en "Reportes de visita"
//      (sobreescribe si el folio ya tenía una) y en el mismo envío arma el
//      PDF, lo sube a Drive y notifica por correo — todo en una sola
//      llamada, sin paso de menú aparte.
//   2. Menú "OTDE Mantenimiento" → "Generar y enviar reporte de visita"
//      (respaldo manual, primer corte del 25 ago 2026): pide el folio de
//      una fila ya llenada a mano en la hoja y repite el mismo PDF/correo.
// El PDF (tabla HTML, sin plantilla de Docs) se guarda en la carpeta de
// Drive "Reportes de Visita" y el correo va a la escuela + el técnico
// responsable + OTDE (Zona/Sector NO se incluyen aquí — se enteran en el
// correo de cierre ya existente).
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
  'Notificación de fecha programada enviada', 'Técnico asignado',
  'Notificación a técnico enviada'
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
// Técnico asignado a la visita y su columna de control — agregadas al final
// igual que las anteriores. El aviso al técnico (ver manOnEditProgramacion)
// solo se dispara cuando AMBAS (fecha programada y técnico asignado) ya
// tienen valor, sin importar cuál se llenó al último.
const COL_MAN_TECNICO_ASIGNADO = 25;
const COL_MAN_NOTIFICACION_TECNICO = 26;
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

    if (datos.accion === 'reporteVisita') {
      return manDoPostReporteVisita_(datos);
    }

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
  manAplicarValidacionTecnico(hoja);
  manAsegurarHojaContactos(ss);
  manAsegurarHojaReportes(ss);

  return hoja;
}

// ── Dropdown de técnicos válidos en "Técnico asignado" (idempotente) —
// mismos nombres que MAN_TECNICOS, para que manNotificarTecnicoAsignado()
// siempre encuentre el correo real a partir del texto capturado. ──
function manAplicarValidacionTecnico(hoja) {
  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(Object.keys(MAN_TECNICOS), true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_MAN_TECNICO_ASIGNADO, 1000, 1).setDataValidation(regla);
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

// ── Plantilla institucional compartida por los correos de este archivo —
// mismo lenguaje visual (header, caja de resumen, firma, redes sociales)
// que ya usa en producción Correos-institucionales (Code.gs/OnFormSubmit.gs,
// repo aparte), adoptado aquí letra por letra para que todo lo que manda
// OTDE se sienta parte del mismo sistema. Cada .gs mantiene su propia copia
// — no hay import entre proyectos de Apps Script, mismo patrón que el resto
// de helpers compartidos del sitio. ──
const MAN_CORREO_CSS =
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

// ── Firma institucional + redes sociales, idéntica a la que ya usa
// Correos-institucionales (mismos datos reales, mismos links). ──
function manCorreoFirma_() {
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

// ── Compone el HTML completo de un correo de Mantenimiento. opts:
// {titulo, introHtml, filas:[{icono,etiqueta,valor}], colorCaja,
// ctaHref, ctaTexto, avisoTexto}. filas/caja usan <table> (no <div>) para
// que sobreviva en Outlook de escritorio. ──
function manCorreoHtml_(opts) {
  const filasHtml = (opts.filas || []).map(f =>
    '<p style="margin:0 0 8px 0;font-size:13.5px;color:#333333;line-height:1.6;">' +
    f.icono + ' <strong>' + f.etiqueta + ':</strong> ' + f.valor + '</p>'
  ).join('');

  const caja = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f6f3;border-left:4px solid ' +
    (opts.colorCaja || '#9F2241') + ';border-radius:4px;margin-bottom:14px;">' +
    '<tr><td style="padding:15px 17px;">' + filasHtml + '</td></tr></table>';

  const cta = opts.ctaHref
    ? '<a href="' + opts.ctaHref + '" class="btn">' + (opts.ctaTexto || 'Consultar estatus de tu solicitud') + ' &rarr;</a>'
    : '';

  const aviso = '<div class="aviso"><p style="margin:0;font-size:12px;color:#7a6a5a;line-height:1.6;">⚠️ ' +
    (opts.avisoTexto || 'Este correo no se monitorea — para dudas o seguimiento escríbenos a <a href="mailto:otde.nezahualcoyotl@dee.edu.mx" style="color:#9F2241;">otde.nezahualcoyotl@dee.edu.mx</a>.') +
    '</p></div>';

  return '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + MAN_CORREO_CSS + '</style></head>' +
    '<body><div class="wrapper"><div class="card">' +
    '<div class="header">' +
    '<p class="header-sub">Oficina de Tecnología para el Desarrollo Educativo | OTDE</p>' +
    '<p class="header-title">' + opts.titulo + '</p>' +
    '<div class="header-line"></div></div>' +
    '<div class="body">' + (opts.introHtml || '') + caja + cta + aviso + '</div>' +
    manCorreoFirma_() +
    '<div class="pie"><p>SEPRN © 2026 — Gobierno del Estado de México</p></div>' +
    '</div></div></body></html>';
}

const MAN_CTA_SEGUIMIENTO = 'https://educaneza.github.io/seprn-sitio/oficina-virtual.html#buscar-folio';

// ── Confirma al solicitante que su solicitud quedó registrada, con Zona y
// Sector en copia (CC) si hay contacto(s) registrados — un solo correo por
// solicitud en vez de avisos sueltos por destinatario. ──
function manNotificarSolicitudRecibida(folio, d) {
  try {
    const contactos = manFiltrarContactosPorTipo(
      manBuscarContactosZonaSector(d.sector, d.zona), (d.tipoCct || '').trim());
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Solicitud de mantenimiento recibida — Folio ' + folio;
    const html = manCorreoHtml_({
      titulo: 'Solicitud de mantenimiento recibida',
      introHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Hola, <strong>' + manEscapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Se registró tu solicitud de mantenimiento. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>',
      filas: [
        { icono: '🎫', etiqueta: 'Folio', valor: folio },
        { icono: '🏫', etiqueta: 'Escuela / CCT', valor: manEscapeHtml_(d.escuela || '') + ' — ' + manEscapeHtml_(d.cct.trim().toUpperCase()) },
        { icono: '👤', etiqueta: 'Solicita', valor: manEscapeHtml_(d.nombre.trim()) + ' (' + manEscapeHtml_(d.funcion.trim()) + ')' },
        { icono: '🛠️', etiqueta: 'Equipos con falla', valor: manEscapeHtml_(d.equipos.trim()) }
      ],
      ctaHref: MAN_CTA_SEGUIMIENTO,
      ctaTexto: 'Consultar estatus de tu solicitud'
    });

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
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: manEscapeHtml_(escuela || '') + ' — ' + manEscapeHtml_(cct) },
      { icono: '👤', etiqueta: 'Solicitó', valor: manEscapeHtml_(nombre) }
    ];
    if (notas) filas.push({ icono: '📝', etiqueta: 'Notas', valor: manEscapeHtml_(notas) });

    const html = manCorreoHtml_({
      titulo: 'Solicitud de mantenimiento resuelta',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Tu solicitud de mantenimiento fue marcada como resuelta por OTDE.</p>',
      filas: filas,
      ctaHref: MAN_CTA_SEGUIMIENTO,
      ctaTexto: 'Ver el detalle de tu solicitud'
    });

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
// visita" o "Técnico asignado" — segundo trigger onEdit independiente del de
// cierre, mismo esqueleto que manOnEditCierre. Cubre dos avisos
// independientes que pueden llenarse en cualquier orden: (1) fecha
// programada → solicitante+Zona/Sector (como antes), (2) fecha + técnico
// juntos → el técnico asignado, sin importar cuál de los dos campos se llenó
// al último. No se llama "onEdit" por la misma razón: solo debe correr vía
// manInstalarTriggerProgramacion(). ──
function manOnEditProgramacion(e) {
  try {
    if (!e || !e.range) return;
    const hoja = e.range.getSheet();
    if (hoja.getName() !== HOJA_MAN_SOLICITUDES) return;

    const colInicio = e.range.getColumn();
    const colFin = e.range.getLastColumn();
    const tocaFecha = COL_MAN_FECHA_PROGRAMADA >= colInicio && COL_MAN_FECHA_PROGRAMADA <= colFin;
    const tocaTecnico = COL_MAN_TECNICO_ASIGNADO >= colInicio && COL_MAN_TECNICO_ASIGNADO <= colFin;
    if (!tocaFecha && !tocaTecnico) return;

    const filaInicio = Math.max(e.range.getRow(), 2);
    const filaFin = e.range.getRow() + e.range.getNumRows() - 1;

    for (let fila = filaInicio; fila <= filaFin; fila++) {
      const datosFila = hoja.getRange(fila, 1, 1, ENCABEZADOS_MAN_SOLICITUDES.length).getValues()[0];
      const fechaProgramada = datosFila[COL_MAN_FECHA_PROGRAMADA - 1];
      const tecnicoAsignado = String(datosFila[COL_MAN_TECNICO_ASIGNADO - 1] || '').trim();

      if (fechaProgramada) {
        const yaNotificadoFecha = String(datosFila[COL_MAN_NOTIFICACION_PROGRAMADA - 1] || '').trim();
        if (yaNotificadoFecha !== 'Sí') {
          manNotificarFechaProgramada(datosFila);
          hoja.getRange(fila, COL_MAN_NOTIFICACION_PROGRAMADA).setValue('Sí');
        }
      }

      if (fechaProgramada && tecnicoAsignado) {
        const yaNotificadoTecnico = String(datosFila[COL_MAN_NOTIFICACION_TECNICO - 1] || '').trim();
        if (yaNotificadoTecnico !== 'Sí') {
          manNotificarTecnicoAsignado(datosFila);
          hoja.getRange(fila, COL_MAN_NOTIFICACION_TECNICO).setValue('Sí');
        }
      }
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
    const html = manCorreoHtml_({
      titulo: 'Fecha de visita programada',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Ya se programó la fecha de la visita técnica para tu solicitud de mantenimiento.</p>',
      filas: [
        { icono: '🎫', etiqueta: 'Folio', valor: folio },
        { icono: '📅', etiqueta: 'Fecha de visita', valor: manEscapeHtml_(fechaProgramada) },
        { icono: '🏫', etiqueta: 'Escuela / CCT', valor: manEscapeHtml_(escuela || '') + ' — ' + manEscapeHtml_(cct) },
        { icono: '👤', etiqueta: 'Solicitó', valor: manEscapeHtml_(nombre) }
      ],
      ctaHref: MAN_CTA_SEGUIMIENTO,
      ctaTexto: 'Consultar estatus de tu solicitud'
    });

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

// ── Avisa al técnico asignado que tiene una visita programada — hasta ahora
// nadie en el sistema le avisaba, Jorge coordinaba con él por fuera (mismo
// cuello de botella que Fase 1 resolvió para Zona/Sector, sin resolver para
// el técnico). Incluye folio, escuela, fecha, equipos con falla reportados y
// el contacto de quien solicitó, más el link directo a reporte-visita.html
// para cerrar el círculo. Se dispara solo cuando YA hay fecha programada Y
// técnico asignado — ver manOnEditProgramacion. ──
function manNotificarTecnicoAsignado(fila) {
  try {
    const folio = fila[1];
    const nombre = fila[2];
    const whatsapp = fila[9];
    const cct = fila[4];
    const sector = fila[5];
    const zona = fila[6];
    const escuela = fila[7];
    const equipos = fila[11];
    const tecnico = String(fila[COL_MAN_TECNICO_ASIGNADO - 1] || '').trim();
    const correoTecnico = MAN_TECNICOS[tecnico];
    if (!correoTecnico) return; // el texto capturado no coincide con MAN_TECNICOS

    const fechaProgramadaRaw = fila[COL_MAN_FECHA_PROGRAMADA - 1];
    const fechaProgramada = fechaProgramadaRaw instanceof Date
      ? Utilities.formatDate(fechaProgramadaRaw, 'America/Mexico_City', 'dd/MM/yyyy')
      : String(fechaProgramadaRaw || '');

    const asunto = 'Visita asignada — ' + (escuela || cct) + ' · ' + folio;
    const html = manCorreoHtml_({
      titulo: 'Visita técnica asignada',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Se te asignó una visita de mantenimiento.</p>',
      filas: [
        { icono: '🎫', etiqueta: 'Folio', valor: folio },
        { icono: '📅', etiqueta: 'Fecha de visita', valor: manEscapeHtml_(fechaProgramada) },
        { icono: '🏫', etiqueta: 'Escuela / CCT', valor: manEscapeHtml_(escuela || '') + ' — ' + manEscapeHtml_(cct) },
        { icono: '🏢', etiqueta: 'Sector / Zona', valor: 'Sector ' + manEscapeHtml_(sector) + ' · Zona ' + manEscapeHtml_(zona) },
        { icono: '🛠️', etiqueta: 'Equipos con falla reportados', valor: manEscapeHtml_(equipos || '—') },
        { icono: '👤', etiqueta: 'Contacto en la escuela', valor: manEscapeHtml_(nombre) + (whatsapp ? ' · WhatsApp ' + manEscapeHtml_(whatsapp) : '') }
      ],
      colorCaja: '#977e5b',
      ctaHref: 'https://educaneza.github.io/seprn-sitio/reporte-visita.html',
      ctaTexto: 'Llenar reporte de visita',
      avisoTexto: 'Este aviso es solo para personal técnico de OTDE.'
    });

    manEnviarCorreo_({
      to: correoTecnico,
      subject: asunto,
      htmlBody: html,
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
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

// ── Logo institucional (images/Pleca 4x.png del sitio, redimensionado a
// 1600px de ancho) embebido en base64 para el PDF del reporte — evita
// depender de que Apps Script alcance una URL externa al convertir el HTML a
// PDF. Si el logo oficial cambia, regenerar este base64 a partir del PNG
// actualizado (sips/Photoshop → redimensionar → base64) y pegarlo aquí. ──
const MAN_LOGO_PLECA_B64 = 'iVBORw0KGgoAAAANSUhEUgAABkAAAADfCAIAAAAhjohcAAAAAXNSR0IArs4c6QAAAJhlWElmTU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAIdpAAQAAAABAAAATgAAAAAAAAEgAAAAAQAAASAAAAABAASQBAACAAAAFAAAAISgAQADAAAAAQABAACgAgAEAAAAAQAABkCgAwAEAAAAAQAAAN8AAAAAMjAyNDowNjowNiAxNTozNDozMgDpuu2TAAAACXBIWXMAACxLAAAsSwGlPZapAAABsmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPkFkb2JlIFBob3Rvc2hvcCAyNy40IChNYWNpbnRvc2gpPC94bXA6Q3JlYXRvclRvb2w+CiAgICAgICAgIDx4bXA6Q3JlYXRlRGF0ZT4yMDI0LTA2LTA2VDE1OjM0OjMyPC94bXA6Q3JlYXRlRGF0ZT4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CnOJrFUAAEAASURBVHgB7J0HfFTF2saT7SW9955AIKEECC10pEuVahfFLlfxs129tnsVvYpiBRU7iIXeew81CQmQkN57NmV7S/Z7NgvLso0E8bok7/lFmZ0zM2fO/7Q5z3nfd5yVSqUTLUSACBABIkAEiAARIAJEgAgQASJABIgAESACRMBRCTjrdDpH7Rv1iwgQASJABIgAESACRIAIEAEiQASIABEgAkSACDgxiAERIAJEgAgQASJABIgAESACRIAIEAEiQASIABFwZAIkYDny0aG+EQEiQASIABEgAkSACBABIkAEiAARIAJEgAiQBRadA0SACBABIkAEiAARIAJEgAgQASJABIgAESACjk2ALLAc+/hQ74gAESACRIAIEAEiQASIABEgAkSACBABItDtCZCA1e1PAQJABIgAESACRIAIEAEiQASIABEgAkSACBABxyZAApZjHx/qHREgAkSACBABIkAEiAARIAJEgAgQASJABLo9ARKwuv0pQACIABEgAkSACBABIkAEiAARIAJEgAgQASLg2ARIwHLs40O9IwJEgAgQASJABIgAESACRIAIEAEiQASIQLcnQAJWtz8FCAARIAJEgAgQASJABIgAESACRIAIEAEiQAQcmwAJWI59fKh3RIAIEAEiQASIABEgAkSACBABIkAEiAAR6PYESMDq9qcAASACRIAIEAEiQASIABEgAkSACBABIkAEiIBjEyABy7GPD/WOCBABIkAEiAARIAJEgAgQASJABIgAESAC3Z4ACVjd/hQgAESACBABIkAEiAARIAJEgAgQASJABIgAEXBsAiRgOfbxod4RASJABIgAESACRIAIEAEiQASIABEgAkSg2xMgAavbnwIEgAgQASJABIgAESACRIAIEAEiQASIABEgAo5NgAQsxz4+1DsiQASIABEgAkSACBABIkAEiAARIAJEgAh0ewIkYHX7U4AAEAEiQASIABEgAkSACBABIkAEiAARIAJEwLEJkIDl2MeHekcEiAARIAJEgAgQASJABIgAESACRIAIEIFuT4AErG5/ChAAIkAEiAARIAJEgAgQASJABIgAESACRIAIODYBErAc+/hQ74gAESACRIAIEAEiQASIABEgAkSACBABItDtCZCA1e1PAQJABIgAESACRIAIEAEiQASIABEgAkSACBABxyZAApZjHx/qHREgAkSACBABIkAEiAARIAJEgAgQASJABLo9ARKwuv0pQACIABEgAkSACBABIkAEiAARIAJEgAgQASLg2ARIwHLs40O9IwJEgAgQASJABIgAESACRIAIEAEiQASIQLcnQAJWtz8FCAARIAJEgAgQASJABIgAESACRIAIEAEiQAQcmwAJWI59fKh3RIAIEAEiQASIABEgAkSACBABIkAEiAAR6PYESMDq9qcAASACRIAIEAEiQASIABEgAkSACBABIkAEiIBjEyABy7GPD/WOCBABIkAEiAARIAJEgAgQASJABIgAESAC3Z4ACVjd/hQgAESACBABIkAEiAARIAJEgAgQASJABIgAEXBsAiRgOfbxod4RASJABIgAESACRIAIEAEiQASIABEgAkSg2xMgAavbnwIEgAgQASJABIgAESACRIAIEAEiQASIABEgAo5NgAQsxz4+1DsiQASIABEgAkSACBABIkAEiAARIAJEgAh0ewIkYHX7U4AAEAEiQASIABEgAkSACBABIkAEiAARIAJEwLEJkIDl2MeHekcEiAARIAJEgAgQASJABIgAESACRIAIEIFuT4AErG5/ChAAIkAEiAARIAJEgAgQASJABIgAESACRIAIODYBErAc+/hQ74gAESACRIAIEAEiQASIABEgAkSACBABItDtCZCA1e1PAQJABIgAESACRIAIEAEiQASIABEgAkSACBABxyZAApZjHx/qHREgAkSACBABIkAEiAARIAJEgAgQASJABLo9ARKwuv0pQACIABEgAkSACBABIkAEiAARIAJEgAgQASLg2ARIwHLs40O9IwJEgAgQASJABIgAESACRIAIEAEiQASIQLcnQAJWtz8FCAARIAJEgAgQASJABIgAESACRIAIEAEiQAQcmwAJWI59fKh3RIAIEAEiQASIABEgAkSACBABIkAEiAAR6PYESMDq9qcAASACRIAIEAEiQASIABEgAkSACBABIkAEiIBjEyABy7GPD/WOCBABIkAEiAARIAJEgAgQASJABIgAESAC3Z4ACVjd/hQgAESACBABIkAEiAARIAJEgAgQASJABIgAEXBsAiRgOfbxod4RASJABIgAESACRIAIEAEiQASIABEgAkSg2xMgAavbnwIEgAgQASJABIgAESACRIAIEAEiQASIABEgAo5NgAQsxz4+1DsiQASIABEgAkSACBABIkAEiAARIAJEgAh0ewIkYHX7U4AAEAEiQASIABEgAkSACBABIkAEiAARIAJEwLEJkIDl2MeHekcEiAARIAJEgAgQASJABIgAESACRIAIEIFuT4AErG5/ChAAIkAEiAARIAJEgAgQASJABIgAESACRIAIODYBErAc+/hQ74gAESACRIAIEAEiQASIABEgAkSACBABItDtCZCA1e1PAQJABIgAESACRIAIEAEiQASIABEgAkSACBABxyZAApZjHx/qHREgAkSACBABIkAEiAARIAJEgAgQASJABLo9ARKwuv0p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FeQQvvR/fEbyMrPCI3yTkhO8vb02fbfDFhIVEn7UpKFNTbhixbVP6tq/d/dB/cNbHd4K+hjsVBMR+IUI5O1Zvf6Tx8hcjk8TMXSVhRnN/rNowuGIkDfyOlUWcbUFmZ6MLOVs0rqPHiHF+ymDzrPvQujlFRrdHrHGuQLeTzhPVZfnEzOIb5RLHCKeTSXZO7mErxY1q8vyjiTPatGCjFK0RXsiXpD+Q6LbowFRrYKcVl7ejsxT9rhFN0dTU1FmKh5MgeGxpE6nWxQ6thSkuamMTxlprVDuGDo0uh15rNx00qIFPRAbiH5HNbyoEOCsatiKbfU15ahMTNk+fUcIYVVJNm5T5q1VGX8rPMIYHZtNoSlBpWK+eIeRxJ1dCNETLTc3cupjHonnmanVj05EQAREQAREQAREQARE4CQmIAHrJF5cTe1XIlCcX/DUzXceqi0qyi8dfMaEGbfc4Gc7st3Pr2SEhhGB40qAwDq8n8ji1H/qvcfcMV5aq+fcWZq3d8C0B9xuCHjMPauhCIiACIiACIiACIiACIjA742A/nL7e1txzff4E4iIbnXpH/9ny9odTS38L/zDtVKvjj9i9firE6guzUV+Isn6zxmZUD4ykeOWhYPUz+lHbUVABERABERABERABERABERAObB0D4jAcSCQ0KF9r6GDEzudEhDY8jh0py5EwAMIkMvcvoPezzga66qJegsMa02u9J/RjZqKgAiIgAiIgAiIgAiIgAiIQAuFEOomEIHjQ6Chrt7bx5udB49Pd+pFBH5TAoca6knAhPOUlRbqGMyhB/oh9RVZnI6huZqIgAiIgAiIgAiIgAiIgAiIgEVAApaFQiciIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAKeSEA5sDxxVWSTCIiACIiACIiACIiACIiACIiACIiACIiARUACloVCJyIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAp5IQAKWJ66KbBIBERABERABERABERABERABERABERABEbAISMCyUOhEBERABERABERABERABERABERABERABETAEwlIwPLEVZFNIiACIiACIiACIiACIiACIiACIiACIiACFgEJWBYKnYiACIiACIiACIiACIiACIiACIiACIiACHgiAQlYnrgqskkEREAEREAEREAEREAEREAEREAEREAERMAiIAHLQqETERABERABERABERABERABERABERABERABTyQgAcsTV0U2iYAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIWAQkYFkodCICIiACIiACIiACIiACIiACIiACIiACIuCJBCRgeeKqyCYREAEREAEREAEREAEREAEREAEREAEREAGLgAQsC4VOREAEREAEREAEREAEREAEREAEREAEREAEPJGABCxPXBXZJAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIiYBGQgGWh0IkIiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAnEpCA5YmrIptEQAREQAREQAREQAREQAREQAREQAREQAQsAhKwLBQ6EQEREAEREAEREAEREAEREAEREAEREAER8EQCErA8cVVkkwiIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgEVAApaFQiciIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAKeSEAClieuimwSAREQAREQAREQAREQAREQAREQAREQARGwCEjAslDoRAREQAREQAREQAREQAREQAREQAREQAREwBMJSMDyxFWRTSIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAhYBCVgWCp2IgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAh4IgEJWJ64KrJJBERABERABERABERABERABERABERABETAIiABy0KhExEQAREQAREQAREQAREQAREQAREQAREQAU8kIAHLE1dFNomACIiACIiACIiACIiACIiACIiACIiACFgEJGBZKHQiAiIgAiIgAiIgAiIgAiIgAiIgAiIgAiLgiQQkYHniqsgmERABERABERABERABERABERABERABERABi4AELAuFTkRABERABERABERABERABERABERABERABDyRgAQsT1wV2SQCIiACIiACIiACIiACIiACIiACIiACImARkIBlodCJCIiACIiACIiACIiACIiACIiACIiACIiAJxKQgOWJqyKbREAEREAEREAEREAEREAEREAEREAEREAELAISsCwUOhEBERABERABERABERABERABERABERABEfBEAhKwPHFVZJMIiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIBFQAKWhUInIiACIiACIiACIiACIiACIiACIiACIiACnkhAApYnropsEgEREAEREAEREAEREAEREAEREAEREAERsAhIwLJQ6EQEREAEREAEREAEREAEREAEREAEREAERMATCUjA8sRVkU0iIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIWAQlYFgqdiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIeCIBJwGrqckTDZRNIiACIiACIiACIiACIiACIiACIiACIiACv28Cvtb0iw/mfnz3X+tr6728rDKdiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIiMCvTaCxoSGhe+cJd9/o5RCqjghY9TW1Wxcsq6mo8vKWgvVrr4rGEwEREAEREAEREAEREAEREAEREAEREAERsAg01Nbxz6hXFB4RsCjytfn7NTRKwLJg6UQEREAEREAEREAEREAEREAEREAEREAERODXJ4BO5ePnZ43rlAPLKtOJCIiACIiACIiACIiACIiACIiACIiACIiACHgMAQlYHrMUMkQEREAEREAEREAEREAEREAEREAEREAERMAdAQlY7qioTAREQAREQAREQAREQAREQAREQAREQAREwGMISMDymKWQISIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAu4ISMByR0VlIiACIiACIiACIiACIiACIiACIiACIiACHkNAApbHLIUMEQEREAEREAEREAEREAEREAEREAEREAERcEdAApY7KioTAREQAREQAREQAREQAREQAREQAREQARHwGAISsDxmKWSICIiACIiACIiACIiACIiACIiACIiACIiAOwISsNxRUZkIiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIDHEJCA5TFLIUNEQAREQAREQAREQAREQAREQAREQAREQATcEZCA5Y6KykRABERABERABERABERABERABERABERABDyGgAQsj1kKGSICIiACIiACIiACIiACIiACIiACIiACIuCOgAQsd1RUJgIiIAIiIAIiIAIiIAIiIAIiIAIiIAIi4DEEJGB5zFLIEBEQAREQAREQAREQAREQAREQAREQAREQAXcEJGC5o6IyERABERABERABERABERABERABERABERABjyEgActjlkKGiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIuCMgAcsdFZWJgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAh4DAEJWB6zFDJEBERABERABERABERABERABERABERABETAHQEJWO6oqEwEREAEREAEREAEREAEREAEREAEREAERMBjCEjA8pilkCEiIAIiIAIiIAIiIAIiIAIiIAIiIAIiIALuCEjAckdFZSIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgAh5DQAKWxyyFDBEBERABERABERABERABERABERABERABEXBHQAKWOyoqEwEREAEREAEREAEREAEREAEREAEREAER8BgCErA8ZilkiAiIgAiIgAiIgAiIgAiIgAiIgAiIgAiIgDsCErDcUVGZCIiACIiACIiACIiACIiACIiACIiACIiAxxCQgOUxSyFDREAEREAEREAEREAEREAEREAEREAEREAE3BGQgOWOispEQAREQAREQAREQAREQAREQAREQAREQAQ8hoAELI9ZChkiAiIgAiIgAiIgAiIgAiIgAiIgAiIgAiLgjoAELHdUVCYCIiACIiACIiACIiACIiACIiACIiACIuAxBCRgecxSyBAREAEREAEREAEREAEREAEREAEREAEREAF3BCRguaOiMhEQAREQAREQAREQAREQAREQAREQAREQAY8hIAHLY5ZChoiACIiACIiACIiACIiACIiACIiACIiACLgjIAHLHRWViYAIiIAIiIAIiIAIiIAIiIAIiIAIiIAIeAwBCVgesxQyRAREQAREQAREQAREQAREQAREQAREQAREwB0BCVjuqKhMBERABERABERABERABERABERABERABETAYwj41tbWGmPq6uoamw41NjV5NXmMdTJEBERABERABERABERABERABERABERABETg90egsUVTw6FGS7b6/1rioOZxJF7LAAAAAElFTkSuQmCC';

// Lema oficial vigente del Gobierno del Estado de México — actualizar cada
// año calendario.
const MAN_LEMA_ANUAL = '2026. Año del Humanismo Mexicano en el Estado de México';

// ── Hora en formato 12h con a.m./p.m. en minúsculas, mismo criterio que ya
// usan los reportes oficiales de OTDE (ej. "7:58 a.m."). ──
function manFormatearHora12_(fecha) {
  if (!(fecha instanceof Date)) return '—';
  const horas = Number(Utilities.formatDate(fecha, 'America/Mexico_City', 'H'));
  const minutos = Utilities.formatDate(fecha, 'America/Mexico_City', 'mm');
  const ampm = horas >= 12 ? 'p.m.' : 'a.m.';
  const horas12 = horas % 12 === 0 ? 12 : horas % 12;
  return horas12 + ':' + minutos + ' ' + ampm;
}

// ── Duración de la visita a partir de inicio/fin — ambos son opcionales en
// el formulario, así que sin los dos no hay nada que calcular. ──
function manCalcularDuracion_(inicio, fin) {
  if (!(inicio instanceof Date) || !(fin instanceof Date)) return '—';
  const ms = fin.getTime() - inicio.getTime();
  if (ms <= 0) return '—';
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.round((ms % 3600000) / 60000);
  const partes = [];
  if (horas > 0) partes.push(horas + (horas === 1 ? ' hr' : ' hrs'));
  if (minutos > 0 || !horas) partes.push(minutos + ' min');
  return partes.join(' ');
}

// ── Arma el PDF del reporte con la misma identidad institucional que ya usan
// los reportes oficiales de OTDE (pleca de logos, lema anual del Gobierno del
// Estado de México, secciones con acento guinda, firmas) — carta, pensado
// para caber en una sola página. Sin plantilla de Docs/Slides, para no
// depender de un archivo aparte que mantener sincronizado. ──
function manGenerarPDFReporte_(solicitud, datos) {
  const ahora = new Date();
  const fechaAtencion = datos[COL_MAN_REP_FECHA_ATENCION - 1];
  const inicio = datos[3];
  const fin = datos[4];
  const responsable = String(datos[COL_MAN_REP_RESPONSABLE - 1] || '').trim();

  const fechaTexto = fechaAtencion instanceof Date
    ? Utilities.formatDate(fechaAtencion, 'America/Mexico_City', 'dd/MM/yyyy')
    : '—';
  const registroTexto = Utilities.formatDate(ahora, 'America/Mexico_City', 'HH:mm');

  const val = (v) => manEscapeHtml_(v || '—');

  const fila = (etiqueta, valorHtml) =>
    '<tr><td class="etq">' + manEscapeHtml_(etiqueta) + '</td>' +
    '<td class="val">' + valorHtml + '</td></tr>';

  const seccion = (titulo) =>
    '<tr><td colspan="2" class="seccion">' + manEscapeHtml_(titulo) + '</td></tr>';

  const filasHtml =
    seccion('Datos de la escuela') +
    fila('CCT', val(solicitud.cct)) +
    fila('Escuela', val(solicitud.escuela)) +
    fila('Sector / Zona', 'Sector ' + val(solicitud.sector) + ' · Zona ' + val(solicitud.zona)) +
    fila('Solicitó', val(solicitud.nombre)) +
    seccion('Visita técnica') +
    fila('Responsable de visita', val(responsable)) +
    fila('Inicio de la visita', manFormatearHora12_(inicio)) +
    fila('Fin de la visita', manFormatearHora12_(fin)) +
    fila('Duración de la jornada', manCalcularDuracion_(inicio, fin)) +
    fila('Aula en uso al llegar', val(datos[5])) +
    fila('Mobiliario', val(datos[6])) +
    fila('Conectividad', val(datos[10])) +
    seccion('Equipos atendidos') +
    fila('Equipos atendidos', val(datos[7])) +
    fila('Equipos funcionales', val(datos[8])) +
    fila('Equipos no funcionales', val(datos[9])) +
    fila('Equipos administrativos', val(datos[14])) +
    seccion('Actividades realizadas') +
    fila('Preventivas', val(datos[11])) +
    fila('Correctivas', val(datos[12])) +
    fila('Instalación realizada', val(datos[13])) +
    seccion('Resultado de la intervención') +
    fila('Estado del aula', val(datos[COL_MAN_REP_ESTADO_AULA - 1])) +
    fila('Seguimiento requerido', val(datos[16])) +
    seccion('Observaciones') +
    fila('Observaciones', val(datos[17]));

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#222; font-size:9px; margin:0; padding:26px 30px; }
  img.pleca { width:100%; height:auto; display:block; }
  .barra-oficina { background:#9F2241; color:#fff; text-align:center; font-size:9px; font-weight:bold;
    letter-spacing:.4px; padding:6px; text-transform:uppercase; }
  .barra-lema { background:#0C1A2E; color:#F9F8F5; text-align:center; font-style:italic; font-size:8px; padding:4px; }
  .meta { border-left:3px solid #9F2241; padding:6px 10px; margin:10px 0; font-size:9.5px; }
  table.datos { width:100%; border-collapse:collapse; margin-bottom:2px; }
  td.seccion { color:#9F2241; font-size:10px; font-weight:bold; text-transform:uppercase;
    letter-spacing:.4px; padding:10px 4px 4px; border-bottom:1.5px solid #9F2241; }
  td.etq { width:170px; color:#6b6b6b; font-weight:bold; padding:4px 8px; border-bottom:1px solid #e5e1da;
    vertical-align:top; }
  td.val { padding:4px 8px; border-bottom:1px solid #e5e1da; vertical-align:top; }
  table.firmas { width:100%; margin-top:22px; }
  table.firmas td { width:33%; text-align:center; font-size:8.5px; padding-top:26px;
    border-top:1px solid #222; }
  table.firmas .cargo { color:#6b6b6b; }
  .pie { border-top:1px solid #d6d1ca; margin-top:14px; padding-top:6px; text-align:center;
    font-size:7px; color:#6b6b6b; }
  </style></head>
  <body>
    <img class="pleca" src="data:image/png;base64,${MAN_LOGO_PLECA_B64}" alt="Gobierno del Estado de México · Educación · SEIEM">
    <div class="barra-oficina">Subdirección de Educación Primaria en la Región de Nezahualcóyotl · Oficina de Tecnología para el Desarrollo Educativo</div>
    <div class="barra-lema">${MAN_LEMA_ANUAL}</div>
    <div class="meta"><strong>Folio:</strong> ${manEscapeHtml_(solicitud.folio)} &nbsp;|&nbsp;
      <strong>Fecha:</strong> ${fechaTexto} &nbsp;|&nbsp; <strong>Registro:</strong> ${registroTexto} hrs</div>
    <table class="datos">${filasHtml}</table>
    <table class="firmas">
      <tr>
        <td>${val(responsable)}<br><span class="cargo">Técnico responsable</span></td>
        <td>${val(solicitud.nombre)}<br><span class="cargo">Recibió en la escuela</span></td>
        <td>Mtro. Jorge Alberto Bonilla Torres<br><span class="cargo">Jefe de la OTDE · SEPRN</span></td>
      </tr>
    </table>
    <div class="pie">Av. Texcoco 116, Col. Juárez Pantitlán, C.P. 57460, Nezahualcóyotl, Estado de México ·
      Tel. 55 3300 2400 ext. 9065<br>otde.nezahualcoyotl@dee.edu.mx · Documento generado automáticamente ·
      Folio ${manEscapeHtml_(solicitud.folio)} · ${fechaTexto}</div>
  </body></html>`;

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
  const html = manCorreoHtml_({
    titulo: 'Reporte de visita técnica',
    introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Adjuntamos el reporte de la visita técnica realizada.</p>',
    filas: [
      { icono: '🎫', etiqueta: 'Folio', valor: solicitud.folio },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: manEscapeHtml_(solicitud.escuela || '') + ' — ' + manEscapeHtml_(solicitud.cct) },
      { icono: '📋', etiqueta: 'Estado del aula', valor: manEscapeHtml_(String(datos[COL_MAN_REP_ESTADO_AULA - 1] || '')) }
    ],
    ctaHref: MAN_CTA_SEGUIMIENTO,
    ctaTexto: 'Ver el detalle de tu solicitud'
  });

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

// ── Construye un Date con componentes explícitos en vez de parsear un
// string — new Date('YYYY-MM-DD') se interpreta en UTC y el huso de México
// (UTC-6) lo recorre un día al formatear después (docs/QA-NOTES.md #3).
// isoFecha: 'YYYY-MM-DD'. horaHHmm opcional: 'HH:mm' (mismo día que isoFecha). ──
function manFechaHoraLocal_(isoFecha, horaHHmm) {
  if (!isoFecha) return '';
  const [y, m, d] = isoFecha.split('-').map(Number);
  if (!horaHHmm) return new Date(y, m - 1, d);
  const [h, min] = horaHHmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min);
}

// ── doPost cuando datos.accion === 'reporteVisita': el formulario propio
// del técnico (reporte-visita.html). A diferencia del respaldo manual de
// menú de arriba, aquí un solo envío ya arma el PDF y notifica — se llena
// de una sola sentada en campo, no en varias sesiones sobre la hoja. ──
function manDoPostReporteVisita_(datos) {
  const folio = String(datos.folio || '').trim().toUpperCase();
  if (!folio) {
    return manTextResponse(JSON.stringify({ status: 'error', mensaje: 'Falta el folio.' }));
  }

  const solicitud = manBuscarSolicitudPorFolio_(folio);
  if (!solicitud) {
    return manTextResponse(JSON.stringify({ status: 'error', mensaje: 'No se encontró una solicitud con folio "' + folio + '" en Solicitudes.' }));
  }

  const fechaAtencion = manFechaHoraLocal_(datos.fechaAtencion);
  const inicioVisita = manFechaHoraLocal_(datos.fechaAtencion, datos.inicioVisita);
  const finVisita = manFechaHoraLocal_(datos.fechaAtencion, datos.finVisita);

  // Mismo orden que ENCABEZADOS_MAN_REPORTES — PDF y Notificación se llenan
  // después de generar el reporte, abajo.
  const filaValores = [
    folio,
    String(datos.responsable || '').trim(),
    fechaAtencion,
    inicioVisita,
    finVisita,
    String(datos.aulaEnUso || '').trim(),
    String(datos.mobiliario || '').trim(),
    String(datos.equiposAtendidos || '').trim(),
    String(datos.equiposFuncionales || '').trim(),
    String(datos.equiposNoFuncionales || '').trim(),
    String(datos.conectividad || '').trim(),
    String(datos.actividadesPreventivas || '').trim(),
    String(datos.actividadesCorrectivas || '').trim(),
    String(datos.instalacionRealizada || '').trim(),
    String(datos.equiposAdministrativos || '').trim(),
    String(datos.estadoAula || '').trim(),
    String(datos.seguimientoRequerido || '').trim(),
    String(datos.observaciones || '').trim(),
    '',
    ''
  ];

  const faltantes = manValidarDatosReporte_(filaValores);
  if (faltantes.length) {
    return manTextResponse(JSON.stringify({ status: 'error', mensaje: 'Faltan campos obligatorios: ' + faltantes.join(', ') + '.' }));
  }

  const hojaReportes = manObtenerHojaReportes_();
  const filaExistente = manBuscarFilaReportePorFolio_(hojaReportes, folio);
  let rowIndex;
  if (filaExistente) {
    rowIndex = filaExistente.rowIndex;
    hojaReportes.getRange(rowIndex, 1, 1, filaValores.length).setValues([filaValores]);
  } else {
    hojaReportes.appendRow(filaValores);
    rowIndex = hojaReportes.getLastRow();
  }

  const pdfBlob = manGenerarPDFReporte_(solicitud, filaValores);
  const urlPDF = manGuardarPDFReporte_(pdfBlob);
  manEnviarReporteVisita_(solicitud, filaValores, pdfBlob);

  hojaReportes.getRange(rowIndex, COL_MAN_REP_PDF_URL).setValue(urlPDF);
  hojaReportes.getRange(rowIndex, COL_MAN_REP_NOTIFICACION).setValue('Sí');

  return manTextResponse(JSON.stringify({ status: 'ok', folio: folio, urlPDF: urlPDF }));
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
