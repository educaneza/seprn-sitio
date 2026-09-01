// ============================================================
// SEPRN · OTDE — Solicitudes de Asesoría (captura en línea)
// Complementa el oficio (que sigue siendo el respaldo oficial),
// mismo patrón que apps-script/mantenimiento.gs.
//
// Contexto del trámite — dos tipos de asesoría, mismo formulario/backend:
//   1) Banco de Materiales y Chuka: tras una visita de mantenimiento (esos
//      recursos ya instalados), el técnico le ofrece al director una
//      asesoría/taller sobre su uso pedagógico. Requiere confirmar que el
//      mantenimiento ya se dio (ver aseValidarCampos).
//   2) Excel básico (ago 2026): solicitud proactiva de personal
//      administrativo (ATP de zona/sector, directores, subdirectores,
//      administrativos) para resolver tareas del día a día en Excel —
//      no requiere mantenimiento previo. El solicitante puede marcar
//      temas sugeridos (columna "Temas de Excel") y/o describir su
//      necesidad en Observaciones.
// En ambos casos, el solicitante elabora su oficio y lo manda a OTDE. Hoy
// ese control se lleva en un Excel simple sin nada automatizado (columnas:
// N.P., Número de Oficio, Sector, Zona, Escuela, CCT, Turno, Fecha de
// recepción, Número de Docentes, Estatus, Fecha de visita, Observaciones)
// — este script solo digitaliza la captura inicial, no sustituye ese
// control ni el oficio.
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
//   W Temas de Excel (ago 2026 — solo aplica al tipo "Excel básico"; checkboxes
//     de temas sugeridos que marcó el solicitante, separados por "; ". Vacía para
//     Banco de Materiales y Chuka. Agregada al final, mismo criterio de las
//     columnas anteriores, para no correr ninguna columna existente)
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
// Notificación de "nueva solicitud" por correo, además del Telegram de abajo
// (sep 2026) — Nancy Yarian atiende Asesorías, decisión de Jorge.
const ASE_CORREO_EQUIPO = 'nancy.garcia@dee.edu.mx';

const ENCABEZADOS_ASE_SOLICITUDES = [
  'Fecha', 'Folio', 'Tipo de Asesoría', 'Nombre', 'Función', 'CCT', 'Sector', 'Zona',
  'Escuela', 'Turno', 'Número de Docentes', 'WhatsApp', 'Correo',
  'Observaciones', 'Oficio (link Drive)', 'Estatus', 'Notas de revisión',
  'Confirmó Mantenimiento Previo', 'Notificación de cierre enviada',
  'Tipo de solicitante', 'Fecha programada de visita',
  'Notificación de fecha programada enviada', 'Temas de Excel'
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
      datos.tipoAsesoria.trim() === 'Banco de Materiales y Chuka' ? (datos.confirmaMantenimiento ? 'Sí' : 'No') : 'N/A',
      '',
      (datos.tipoCct || '').trim(),
      '',  // Fecha programada de visita — la llena aseOnEditProgramacion()
      '',  // Notificación de fecha programada enviada — la llena aseOnEditProgramacion()
      (datos.temasExcel || '').trim()
    ]);

    aseNotificarTelegram(folio, datos, oficioUrl);
    aseNotificarEquipoPorCorreo(folio, datos, oficioUrl);
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
  if (d.tipoAsesoria.trim() === 'Banco de Materiales y Chuka' && !d.confirmaMantenimiento) {
    throw new Error('Debes confirmar que el Aula de Medios ya recibió mantenimiento con Banco de Materiales y Chuka instalados.');
  }
  if (!/^\d{10}$/.test(d.whatsapp.trim())) {
    throw new Error('WhatsApp inválido: ' + d.whatsapp);
  }
  if (!/^\d+$/.test(String(d.numDocentes).trim()) || parseInt(d.numDocentes, 10) < 1 || parseInt(d.numDocentes, 10) > 200) {
    throw new Error('Número de personas inválido: ' + d.numDocentes);
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
      'Número de personas: ' + d.numDocentes + '\n' +
      'WhatsApp: ' + d.whatsapp.trim() + '\n' +
      (d.temasExcel ? 'Temas de Excel: ' + aseEscapeMarkdown_(d.temasExcel.trim()) + '\n' : '') +
      (d.observaciones ? 'Observaciones: ' + aseEscapeMarkdown_(d.observaciones.trim()) + '\n' : '') +
      'Oficio: ' + aseEscapeMarkdown_(oficioUrl);

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

// ── Correo a Nancy, además del Telegram de arriba (sep 2026) ──
function aseNotificarEquipoPorCorreo(folio, d, oficioUrl) {
  try {
    aseEnviarCorreo_({
      to: ASE_CORREO_EQUIPO,
      subject: 'Nueva solicitud de Asesoría (Folio ' + folio + ')',
      htmlBody:
        '<p style="margin:0 0 8px 0;font-size:14px;">Folio: <strong>' + folio + '</strong></p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Tipo: ' + aseEscapeHtml_(d.tipoAsesoria.trim()) + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Nombre: ' + aseEscapeHtml_(d.nombre.trim()) + ' (' + aseEscapeHtml_(d.funcion.trim()) + ')</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">CCT: ' + aseEscapeHtml_(d.cct.trim().toUpperCase()) + (d.escuela ? ' — ' + aseEscapeHtml_(d.escuela.trim()) : '') + '</p>' +
        '<p style="margin:0 0 8px 0;font-size:14px;">Número de personas: ' + d.numDocentes + '</p>' +
        '<p style="margin:0;font-size:14px;">Oficio: <a href="' + oficioUrl + '">' + oficioUrl + '</a></p>',
      name: 'OTDE | Oficina de Tecnología para el Desarrollo Educativo',
      replyTo: 'otde.nezahualcoyotl@dee.edu.mx'
    });
  } catch (err) {
    // Silencioso: la solicitud ya quedó registrada en Sheets aunque falle la notificación
  }
}

// ── Confirma al solicitante que su solicitud quedó registrada, con Zona y
// Sector en copia (CC) si hay contacto(s) registrados — un solo correo por
// solicitud en vez de avisos sueltos por destinatario. ──
// ── Plantilla institucional compartida por los correos de este archivo —
// mismo lenguaje visual (header, caja de resumen, firma, redes sociales)
// que ya usa en producción Correos-institucionales (repo aparte), adoptado
// aquí letra por letra. Ver mantenimiento.gs para el mismo patrón — cada
// .gs mantiene su propia copia, no hay import entre proyectos. ──
const ASE_CORREO_CSS =
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

function aseCorreoFirma_() {
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

function aseCorreoHtml_(opts) {
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
    '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' + ASE_CORREO_CSS + '</style></head>' +
    '<body><div class="wrapper"><div class="card">' +
    '<div class="header">' +
    '<p class="header-sub">Oficina de Tecnología para el Desarrollo Educativo | OTDE</p>' +
    '<p class="header-title">' + opts.titulo + '</p>' +
    '<div class="header-line"></div></div>' +
    '<div class="body">' + (opts.introHtml || '') + caja + cta + aviso + '</div>' +
    aseCorreoFirma_() +
    '<div class="pie"><p>SEPRN © 2026 — Gobierno del Estado de México</p></div>' +
    '</div></div></body></html>';
}

const ASE_CTA_SEGUIMIENTO = 'https://educaneza.github.io/seprn-sitio/oficina-virtual.html#buscar-folio';

function aseNotificarSolicitudRecibida(folio, d) {
  try {
    const contactos = aseFiltrarContactosPorTipo(
      aseBuscarContactosZonaSector(d.sector, d.zona), (d.tipoCct || '').trim());
    const cc = contactos.map(c => c.correo).join(',');
    const asunto = 'Solicitud de asesoría recibida — Folio ' + folio;
    const html = aseCorreoHtml_({
      titulo: 'Solicitud de asesoría recibida',
      introHtml:
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Hola, <strong>' + aseEscapeHtml_(d.nombre.trim()) + '</strong>,</p>' +
        '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Se registró tu solicitud de asesoría. OTDE la está atendiendo directamente — te avisaremos por este medio en cuanto se resuelva.</p>',
      filas: [
        { icono: '🎫', etiqueta: 'Folio', valor: folio },
        { icono: '📋', etiqueta: 'Tipo', valor: aseEscapeHtml_(d.tipoAsesoria.trim()) },
        { icono: '🏫', etiqueta: 'Escuela / CCT', valor: aseEscapeHtml_(d.escuela || '') + ' — ' + aseEscapeHtml_(d.cct.trim().toUpperCase()) },
        { icono: '👤', etiqueta: 'Solicita', valor: aseEscapeHtml_(d.nombre.trim()) + ' (' + aseEscapeHtml_(d.funcion.trim()) + ')' },
        { icono: '👥', etiqueta: 'Número de personas', valor: d.numDocentes }
      ],
      ctaHref: ASE_CTA_SEGUIMIENTO,
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
    const filas = [
      { icono: '🎫', etiqueta: 'Folio', valor: folio },
      { icono: '📋', etiqueta: 'Tipo', valor: aseEscapeHtml_(tipo) },
      { icono: '🏫', etiqueta: 'Escuela / CCT', valor: aseEscapeHtml_(escuela || '') + ' — ' + aseEscapeHtml_(cct) },
      { icono: '👤', etiqueta: 'Solicitó', valor: aseEscapeHtml_(nombre) }
    ];
    if (notas) filas.push({ icono: '📝', etiqueta: 'Notas', valor: aseEscapeHtml_(notas) });

    const html = aseCorreoHtml_({
      titulo: 'Solicitud de asesoría resuelta',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Tu solicitud de asesoría fue marcada como resuelta por OTDE.</p>',
      filas: filas,
      ctaHref: ASE_CTA_SEGUIMIENTO,
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
    const html = aseCorreoHtml_({
      titulo: 'Fecha de visita programada',
      introHtml: '<p style="margin:0 0 16px 0;font-size:15px;color:#333333;line-height:1.7;">Ya se programó la fecha de la visita técnica para tu solicitud de asesoría.</p>',
      filas: [
        { icono: '🎫', etiqueta: 'Folio', valor: folio },
        { icono: '📋', etiqueta: 'Tipo', valor: aseEscapeHtml_(tipo) },
        { icono: '📅', etiqueta: 'Fecha de visita', valor: aseEscapeHtml_(fechaProgramada) },
        { icono: '🏫', etiqueta: 'Escuela / CCT', valor: aseEscapeHtml_(escuela || '') + ' — ' + aseEscapeHtml_(cct) },
        { icono: '👤', etiqueta: 'Solicitó', valor: aseEscapeHtml_(nombre) }
      ],
      ctaHref: ASE_CTA_SEGUIMIENTO,
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
