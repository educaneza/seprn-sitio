// ============================================================
// SEPRN — Visitas de jefes/docentes a escuelas
// (inicio de ciclo escolar + acompañamiento semanal de ceremonias cívicas)
//
// Contexto: la jefa instruyó a ~20 jefes de área + docentes que se sumen a
// visitar escuelas el primer día de clases (mensaje institucional +
// inauguración) y, después, a acompañar semanalmente las ceremonias
// cívicas en distintas escuelas. Cada visita tiene doble propósito:
// acompañar la ceremonia y revisar operatividad/necesidades de la escuela.
//
// Este backend resuelve tres cosas en una sola Sheet ("Reservas"):
//   1) Reserva/selección de escuela+semana, con bloqueo para que dos
//      personas no elijan la misma escuela la misma semana.
//   2) Histórico: quién visitó cada escuela y cuándo (se deriva de las
//      filas ya existentes, no hay tabla aparte que mantener a mano).
//   3) Validación: la ficha post-visita (con fotos) es la prueba de que
//      la visita sí ocurrió. Si no se llena en VIS_DIAS_LIMITE_VALIDACION
//      días después de la fecha planeada, un trigger diario marca la
//      reserva como "No realizada" automáticamente.
//
// SIN NOTIFICACIONES A PROPÓSITO: a diferencia de los demás backends de
// OTDE (mantenimiento.gs, asesorias.gs), este proyecto no manda correo ni
// Telegram a nadie — decisión explícita de Jorge. El folio se muestra en
// pantalla al reservar (y queda visible en la Sheet); no hay respaldo por
// correo si alguien lo pierde, más allá de volver a entrar a
// ceremonias-civicas.html y buscar su reserva en la tabla de histórico.
//
// IMPLEMENTACIÓN:
//   1. Abre o crea el Google Spreadsheet de registros
//      (real: "Seguimiento_Ceremonias_Cívicas_26-27")
//   2. Extensiones → Apps Script → pega este código completo
//   3. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   4. Copia la URL generada y pégala en ceremonias-civicas.html y en
//      ficha-ceremonias-civicas.html, en la constante VISITAS_APPS_SCRIPT_URL
//   5. Corre UNA vez visInstalarTriggerValidacion() (o el menú "SEPRN
//      Visitas" que agrega onOpen()) para activar el marcado automático
//      de "No realizada". No es urgente para el primer día — solo importa
//      varios días después de cada visita planeada.
//
// COLUMNAS DE LA HOJA "Reservas":
//   A Fecha de reserva | B Folio | C Nombre | D Cargo/Área | E Correo
//   F Teléfono | G CCT | H Escuela | I Sector | J Zona | K Tipo de visita
//   L Semana (lunes de esa semana) | M Fecha planeada | N Estatus
//   O Fecha de visita real | P Evidencias (links Drive)
//   Q Observaciones de operatividad | R Fecha de ficha enviada
//   S Nombre de la actividad | T Propósito | U Convocados/Participantes
//   V Descripción general de la actividad | W Cantidad de asistentes
// (S-W agregadas ago 2026, al final del esquema por el mismo criterio de
// auto-heal de siempre — alimentan al Community Manager para sus copys,
// se llenan junto con el resto de la ficha post-visita)
// Las columnas E/F (Correo/Teléfono) ya no se solicitan en el formulario
// (ago 2026, decisión de Jorge — sin notificaciones, no tenía caso pedirlos)
// y quedan vacías en cada fila nueva. Se mantienen en el esquema en vez de
// quitarlas para no correr las columnas siguientes ni romper folios ya
// usados — mismo criterio que el resto del sitio.
//
// Una sola fila por reserva: la ficha post-visita (doPost con
// {accion:'ficha', folio, ...}) actualiza esa misma fila en vez de crear
// una nueva — mismo patrón que manDoPostReporteVisita_() en
// mantenimiento.gs (buscar por folio, actualizar si existe).
//
// DISPONIBILIDAD (para que el picker de escuela muestre/bloquee lo ya
// tomado): doGet(?action=disponibilidad) devuelve todas las reservas del
// ciclo activo (nombre, escuela, semana, estatus — sin correo/teléfono,
// para no exponer datos de contacto en un endpoint público). El mismo
// listado sirve para calcular "última visita por escuela" en el cliente,
// sin necesidad de un segundo endpoint.
//
// DISEÑO PENSANDO EN UNA FASE 2 FUTURA (reportes de actividad para el
// Community Manager): esta Sheet es propia de Visitas, no compartida con
// otros trámites (misma decisión ya tomada para OTDE: una Sheet por
// trámite, un dashboard futuro como unificador). Lo reutilizable para esa
// Fase 2 es el PATRÓN de este archivo (subida de múltiples fotos,
// actualizar una fila por folio, doPost ramificado por accion) — se
// clonaría a un proyecto Apps Script + Sheet propios, igual que
// asesorias.gs se clonó del patrón de mantenimiento.gs.
// ============================================================

const HOJA_VIS_RESERVAS = 'Reservas';
const CARPETA_VIS_FOTOS = 'Fotos de Visitas Jefes';
const VIS_TAMANO_MAX_BYTES = 8 * 1024 * 1024; // techo de seguridad por foto — el cliente ya comprime a unos cientos de KB antes de subir
const VIS_MAX_FOTOS = 20;
const VIS_DIAS_LIMITE_VALIDACION = 3; // días tras la fecha planeada sin ficha antes de marcar "No realizada"

const ENCABEZADOS_VIS_RESERVAS = [
  'Fecha de reserva', 'Folio', 'Nombre', 'Cargo/Área', 'Correo', 'Teléfono',
  'CCT', 'Escuela', 'Sector', 'Zona', 'Tipo de visita', 'Semana (lunes)',
  'Fecha planeada', 'Estatus', 'Fecha de visita real', 'Evidencias (links Drive)',
  'Observaciones de operatividad', 'Fecha de ficha enviada',
  'Nombre de la actividad', 'Propósito', 'Convocados/Participantes',
  'Descripción general de la actividad', 'Cantidad de asistentes',
  'Motivo de revisita (si aplica)'
];
const COL_VIS_CCT = 7;
const COL_VIS_SEMANA = 12;
const COL_VIS_FECHA_PLANEADA = 13;
const COL_VIS_ESTATUS = 14;
const COL_VIS_FECHA_VISITA_REAL = 15;
const COL_VIS_EVIDENCIAS = 16;
const COL_VIS_OBSERVACIONES = 17;
const COL_VIS_FECHA_FICHA = 18;
const COL_VIS_NOMBRE_ACTIVIDAD = 19;
const COL_VIS_PROPOSITO = 20;
const COL_VIS_CONVOCADOS = 21;
const COL_VIS_DESCRIPCION_ACTIVIDAD = 22;
const COL_VIS_CANTIDAD_ASISTENTES = 23;
const COL_VIS_MOTIVO_REVISITA = 24;

const ESTADOS_VIS_VALIDOS = ['Reservada', 'Realizada', 'No realizada', 'Cancelada'];
const TIPOS_VIS_VALIDOS = ['Inicio de ciclo escolar', 'Ceremonia cívica semanal'];

// ── doGet: disponibilidad (picker + historial) ──
function doGet(e) {
  const accion = e && e.parameter && e.parameter.action;
  if (accion === 'disponibilidad') {
    return visListarDisponibilidad();
  }
  if (accion === 'consulta') {
    return visConsultarFolio_(e.parameter.folio);
  }
  if (accion === 'dashboard') {
    return visObtenerDashboard_(e.parameter.token);
  }
  return visTextResponse(JSON.stringify({ status: 'ok', servicio: 'SEPRN Visitas a Escuelas' }));
}

// ── Configura la clave del panel de cobertura (nombres + conteos por
// docente es información de desempeño individual, no debe quedar abierta
// solo por tener el link de reservar/ficha). Mismo patrón que
// aseConfigurarTokenPanel() en asesorias.gs — corre esto UNA vez desde el
// editor de Apps Script (envuelta en una función temporal si usas
// ▶️ Ejecutar directo, ver docs/QA-NOTES.md #14 del repo). ──
function visConfigurarTokenDashboard(token) {
  PropertiesService.getScriptProperties().setProperty('DASHBOARD_TOKEN', token);
}

// ── Panel de cobertura: visitas realizadas por docente y por sector.
// Requiere DASHBOARD_TOKEN (ver visConfigurarTokenDashboard arriba) — a
// diferencia de ?action=disponibilidad, aquí si tiene sentido agrupar por
// persona, que es justo el dato que no debe quedar público. ──
function visObtenerDashboard_(tokenRecibido) {
  const tokenEsperado = PropertiesService.getScriptProperties().getProperty('DASHBOARD_TOKEN');
  if (!tokenEsperado || tokenRecibido !== tokenEsperado) {
    return visTextResponse(JSON.stringify({ status: 'no_autorizado' }));
  }

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_VIS_RESERVAS);
  if (!hoja) return visTextResponse(JSON.stringify({ status: 'ok', porDocente: [], porSector: [], escuelasVisitadas: [] }));

  const filas = hoja.getDataRange().getValues().slice(1).filter(function (r) { return r[1]; });

  const porDocenteMapa = {};
  const porSectorMapa = {};
  const escuelasVisitadasSet = {};

  filas.forEach(function (r) {
    if (String(r[COL_VIS_ESTATUS - 1] || '').trim() !== 'Realizada') return;

    const clave = String(r[2] || '').trim() + ' · ' + String(r[3] || '').trim();
    porDocenteMapa[clave] = (porDocenteMapa[clave] || 0) + 1;

    const sector = String(r[8] || 'Sin sector').trim() || 'Sin sector';
    const cct = String(r[COL_VIS_CCT - 1] || '').trim().toUpperCase();
    if (!porSectorMapa[sector]) porSectorMapa[sector] = {};
    if (cct) porSectorMapa[sector][cct] = true;
    if (cct) escuelasVisitadasSet[cct] = true;
  });

  const porDocente = Object.keys(porDocenteMapa)
    .map(function (k) {
      const partes = k.split(' · ');
      return { nombre: partes[0], cargo: partes[1] || '', visitas: porDocenteMapa[k] };
    })
    .sort(function (a, b) { return b.visitas - a.visitas; });

  const porSector = Object.keys(porSectorMapa)
    .map(function (s) { return { sector: s, escuelasVisitadas: Object.keys(porSectorMapa[s]).length }; })
    .sort(function (a, b) { return b.escuelasVisitadas - a.escuelasVisitadas; });

  return visTextResponse(JSON.stringify({
    status: 'ok',
    porDocente: porDocente,
    porSector: porSector,
    escuelasVisitadas: Object.keys(escuelasVisitadasSet)
  }));
}

// ── Consulta de una reserva por folio, para precargar la ficha post-visita
// (ficha-ceremonias-civicas.html) sin pedirle al jefe que vuelva a teclear los
// datos de la escuela. No pide correo como segundo factor (a diferencia de
// ?action=consulta en los otros trámites): el folio ya no es más sensible
// que lo que ?action=disponibilidad expone públicamente (nombre+escuela). ──
function visConsultarFolio_(folioBuscado) {
  const noEncontrado = function () { return visTextResponse(JSON.stringify({ status: 'no_encontrado' })); };
  if (!folioBuscado) return noEncontrado();

  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_VIS_RESERVAS);
  if (!hoja) return noEncontrado();

  const fila = visBuscarFilaPorFolio_(hoja, folioBuscado);
  if (!fila) return noEncontrado();

  const d = fila.datos;
  return visTextResponse(JSON.stringify({
    status: 'ok',
    folio: d[1],
    nombre: d[2],
    cargo: d[3],
    cct: d[6],
    escuela: d[7],
    sector: d[8],
    zona: d[9],
    tipoVisita: d[10],
    fechaPlaneada: d[COL_VIS_FECHA_PLANEADA - 1] instanceof Date
      ? Utilities.formatDate(d[COL_VIS_FECHA_PLANEADA - 1], 'America/Mexico_City', 'yyyy-MM-dd') : String(d[COL_VIS_FECHA_PLANEADA - 1] || ''),
    estatus: String(d[COL_VIS_ESTATUS - 1] || '').trim()
  }));
}

// ── Lista todas las reservas del ciclo (sin correo/teléfono — endpoint
// público) para pintar el picker de disponibilidad y el historial. ──
function visListarDisponibilidad() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_VIS_RESERVAS);
  if (!hoja) return visTextResponse(JSON.stringify({ status: 'ok', items: [] }));

  const filas = hoja.getDataRange().getValues().slice(1);
  const items = filas
    .filter(function (r) { return r[1]; }) // folio no vacío
    .map(function (r) {
      return {
        nombre: r[2],
        cargo: r[3],
        cct: r[6],
        escuela: r[7],
        sector: r[8],
        zona: r[9],
        tipoVisita: r[10],
        semana: r[11] instanceof Date ? Utilities.formatDate(r[11], 'America/Mexico_City', 'yyyy-MM-dd') : String(r[11] || ''),
        fechaPlaneada: r[12] instanceof Date ? Utilities.formatDate(r[12], 'America/Mexico_City', 'yyyy-MM-dd') : String(r[12] || ''),
        estatus: String(r[COL_VIS_ESTATUS - 1] || 'Reservada').trim(),
        fechaVisitaReal: r[COL_VIS_FECHA_VISITA_REAL - 1] instanceof Date
          ? Utilities.formatDate(r[COL_VIS_FECHA_VISITA_REAL - 1], 'America/Mexico_City', 'yyyy-MM-dd') : ''
      };
    });

  return visTextResponse(JSON.stringify({ status: 'ok', items: items }));
}

// ── doPost: reservar visita, o completar la ficha post-visita ──
function doPost(e) {
  try {
    const datos = JSON.parse(e.postData.contents);
    if (datos.accion === 'ficha') return visDoPostFicha_(datos);
    return visDoPostReservar_(datos);
  } catch (err) {
    return visTextResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  }
}

// ── Reservar escuela+semana ──
function visDoPostReservar_(datos) {
  visValidarReserva_(datos);

  const fechaPlaneada = visFechaLocal_(datos.fechaPlaneada);
  const semanaLunes = visLunesDeLaSemana_(fechaPlaneada);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = visObtenerHojaReservas();

    const conflicto = visExisteReservaActiva_(hoja, datos.cct, semanaLunes);
    if (conflicto) {
      throw new Error('Esta escuela ya tiene una visita ' + (conflicto.estatus === 'Realizada' ? 'realizada' : 'programada') +
        ' esta semana por ' + conflicto.nombre + ' (' + conflicto.cargo + '). Para evitar duplicidad, elige otra escuela o revisa la semana.');
    }

    const folio = visGenerarFolio(hoja);
    const ahora = new Date();

    hoja.appendRow([
      ahora,
      folio,
      datos.nombre.trim(),
      datos.cargo.trim(),
      '',
      '',
      datos.cct.trim().toUpperCase(),
      datos.escuela.trim(),
      (datos.sector || '').trim(),
      (datos.zona || '').toString().trim(),
      datos.tipoVisita.trim(),
      semanaLunes,
      fechaPlaneada,
      'Reservada',
      '', '', '', ''
    ]);

    const motivoRevisita = String(datos.motivoRevisita || '').trim();
    if (motivoRevisita) {
      hoja.getRange(hoja.getLastRow(), COL_VIS_MOTIVO_REVISITA).setValue(motivoRevisita);
    }

    return visTextResponse(JSON.stringify({ status: 'ok', folio: folio }));
  } finally {
    lock.releaseLock();
  }
}

// ── Ficha post-visita: actualiza la fila que ya creó la reserva (misma
// idea que manDoPostReporteVisita_() en mantenimiento.gs). ──
function visDoPostFicha_(datos) {
  const folio = String(datos.folio || '').trim().toUpperCase();
  if (!folio) {
    return visTextResponse(JSON.stringify({ status: 'error', mensaje: 'Falta el folio de la reserva.' }));
  }

  const hoja = visObtenerHojaReservas();
  const fila = visBuscarFilaPorFolio_(hoja, folio);
  if (!fila) {
    return visTextResponse(JSON.stringify({ status: 'error', mensaje: 'No se encontró ninguna reserva con folio "' + folio + '".' }));
  }
  if (String(fila.datos[COL_VIS_ESTATUS - 1] || '').trim() === 'Cancelada') {
    return visTextResponse(JSON.stringify({ status: 'error', mensaje: 'Esa reserva fue cancelada, no se puede reportar.' }));
  }

  const cct = fila.datos[COL_VIS_CCT - 1];
  const escuela = fila.datos[7];
  const fechaPlaneadaISO = fila.datos[COL_VIS_FECHA_PLANEADA - 1] instanceof Date
    ? Utilities.formatDate(fila.datos[COL_VIS_FECHA_PLANEADA - 1], 'America/Mexico_City', 'yyyy-MM-dd')
    : String(fila.datos[COL_VIS_FECHA_PLANEADA - 1] || '');

  const urls = visSubirFotos_(cct, escuela, fechaPlaneadaISO, datos.fotos);

  const fechaVisitaReal = datos.fechaVisitaReal ? visFechaLocal_(datos.fechaVisitaReal) : new Date();
  const observaciones = String(datos.observaciones || '').trim();
  const nombreActividad = String(datos.nombreActividad || '').trim();
  const proposito = String(datos.proposito || '').trim();
  const descripcionActividad = String(datos.descripcionActividad || '').trim();
  const cantidadAsistentes = String(datos.cantidadAsistentes || '').trim();
  if (!observaciones || !nombreActividad || !proposito || !descripcionActividad || !cantidadAsistentes) {
    throw new Error('Faltan campos obligatorios de la ficha (nombre de la actividad, propósito, cantidad de asistentes, descripción u operatividad).');
  }

  hoja.getRange(fila.rowIndex, COL_VIS_ESTATUS).setValue('Realizada');
  hoja.getRange(fila.rowIndex, COL_VIS_FECHA_VISITA_REAL).setValue(fechaVisitaReal);
  hoja.getRange(fila.rowIndex, COL_VIS_EVIDENCIAS).setValue(urls.join('\n'));
  hoja.getRange(fila.rowIndex, COL_VIS_OBSERVACIONES).setValue(observaciones);
  hoja.getRange(fila.rowIndex, COL_VIS_FECHA_FICHA).setValue(new Date());
  hoja.getRange(fila.rowIndex, COL_VIS_NOMBRE_ACTIVIDAD).setValue(nombreActividad);
  hoja.getRange(fila.rowIndex, COL_VIS_PROPOSITO).setValue(proposito);
  hoja.getRange(fila.rowIndex, COL_VIS_CONVOCADOS).setValue(String(datos.convocados || '').trim());
  hoja.getRange(fila.rowIndex, COL_VIS_DESCRIPCION_ACTIVIDAD).setValue(descripcionActividad);
  hoja.getRange(fila.rowIndex, COL_VIS_CANTIDAD_ASISTENTES).setValue(cantidadAsistentes);

  return visTextResponse(JSON.stringify({ status: 'ok', folio: folio, fotos: urls.length }));
}

// ── Obtener o crear la hoja de reservas ──
function visObtenerHojaReservas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_VIS_RESERVAS);

  if (!hoja) {
    hoja = ss.insertSheet(HOJA_VIS_RESERVAS);
    hoja.appendRow(ENCABEZADOS_VIS_RESERVAS);
    const header = hoja.getRange(1, 1, 1, ENCABEZADOS_VIS_RESERVAS.length);
    header.setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    hoja.setFrozenRows(1);
    hoja.setColumnWidth(3, 180); // Nombre
    hoja.setColumnWidth(8, 200); // Escuela
    hoja.setColumnWidth(16, 260); // Evidencias
    hoja.setColumnWidth(17, 260); // Observaciones
  } else {
    const colsActuales = hoja.getLastColumn();
    if (colsActuales < ENCABEZADOS_VIS_RESERVAS.length) {
      const faltantes = ENCABEZADOS_VIS_RESERVAS.slice(colsActuales);
      hoja.getRange(1, colsActuales + 1, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }

  const regla = SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS_VIS_VALIDOS, true)
    .setAllowInvalid(false)
    .build();
  hoja.getRange(2, COL_VIS_ESTATUS, 1000, 1).setDataValidation(regla);

  return hoja;
}

// ── Buscar una fila por folio (columna B) ──
function visBuscarFilaPorFolio_(hoja, folio) {
  const datos = hoja.getDataRange().getValues();
  const folioNorm = String(folio).trim().toUpperCase();
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][1]).trim().toUpperCase() === folioNorm) {
      return { rowIndex: i + 1, datos: datos[i] };
    }
  }
  return null;
}

// ── ¿Ya hay una reserva activa (Reservada/Realizada) para esta escuela
// esta semana? Compara por CCT + lunes de la semana, no por fecha exacta,
// porque una ceremonia cívica podría moverse de día dentro de la misma
// semana sin dejar de ser "la misma semana". ──
function visExisteReservaActiva_(hoja, cct, semanaLunesDate) {
  const datos = hoja.getDataRange().getValues();
  const cctNorm = String(cct).trim().toUpperCase();
  const semanaStr = Utilities.formatDate(semanaLunesDate, 'America/Mexico_City', 'yyyy-MM-dd');

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const filaCct = String(fila[COL_VIS_CCT - 1] || '').trim().toUpperCase();
    if (filaCct !== cctNorm) continue;

    const filaSemana = fila[COL_VIS_SEMANA - 1];
    const filaSemanaStr = filaSemana instanceof Date
      ? Utilities.formatDate(filaSemana, 'America/Mexico_City', 'yyyy-MM-dd') : String(filaSemana || '');
    if (filaSemanaStr !== semanaStr) continue;

    const estatus = String(fila[COL_VIS_ESTATUS - 1] || '').trim();
    if (estatus === 'Reservada' || estatus === 'Realizada') {
      return { nombre: fila[2], cargo: fila[3], estatus: estatus };
    }
  }
  return null;
}

// ── Generar folio único — CC de "Ceremonias Cívicas", mismo nombre que la
// Sheet real ("Seguimiento_Ceremonias_Cívicas_26-27"). ──
function visGenerarFolio(hoja) {
  const datos = hoja.getDataRange().getValues();
  const prefix = 'SEPRN-CC-';
  const maxNum = datos.slice(1)
    .map(row => String(row[1]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos de la reserva. Sin correo/teléfono a propósito (ago
// 2026, decisión de Jorge): el sistema no envía nada a nadie, así que
// pedirlos solo agregaba fricción sin propósito — la identificación de
// quién reservó es nombre + Subjefatura/Oficina. ──
function visValidarReserva_(d) {
  const requeridos = ['nombre', 'cargo', 'cct', 'escuela', 'tipoVisita', 'fechaPlaneada'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (TIPOS_VIS_VALIDOS.indexOf(d.tipoVisita.trim()) === -1) {
    throw new Error('Tipo de visita inválido: ' + d.tipoVisita);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.fechaPlaneada).trim())) {
    throw new Error('Fecha planeada inválida: ' + d.fechaPlaneada);
  }
}

// ── Construye un Date con componentes explícitos en vez de parsear un
// string — new Date('YYYY-MM-DD') se interpreta en UTC y el huso de
// México (UTC-6) lo recorre un día al formatear después. ──
function visFechaLocal_(isoFecha) {
  if (!isoFecha) return null;
  const partes = String(isoFecha).split('-').map(Number);
  return new Date(partes[0], partes[1] - 1, partes[2]);
}

// ── Lunes de la semana de una fecha dada (semana natural lunes-domingo) ──
function visLunesDeLaSemana_(fecha) {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const dia = d.getDay(); // 0=domingo..6=sábado
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

// ── Subir las fotos de evidencia a Drive (carpeta plana, nombre codifica
// CCT/escuela/fecha — mismo criterio que el resto del sitio para
// oficios). Devuelve el arreglo de URLs. ──
function visSubirFotos_(cct, escuela, fechaISO, fotos) {
  if (!fotos || !fotos.length) {
    throw new Error('Adjunta al menos una foto como evidencia de la visita.');
  }
  if (fotos.length > VIS_MAX_FOTOS) {
    throw new Error('Máximo ' + VIS_MAX_FOTOS + ' fotos por ficha.');
  }

  const carpeta = visObtenerCarpetaFotos_();
  const prefijo = (cct || 'SIN-CCT').toString().trim().toUpperCase() + ' — ' +
    (escuela || '').toString().trim() + ' — ' + (fechaISO || '');

  return fotos.map(function (foto, idx) {
    const bytes = Utilities.base64Decode(foto.base64);
    if (bytes.length > VIS_TAMANO_MAX_BYTES) {
      throw new Error('Una de las fotos pesa más de 8MB. Comprímela e intenta de nuevo.');
    }
    const mimeType = foto.tipo || 'image/jpeg';
    const nombreLimpio = prefijo + ' — ' + (idx + 1) + '.' + visExtensionPorMime_(mimeType);
    const blob = Utilities.newBlob(bytes, mimeType, nombreLimpio);
    const archivo = carpeta.createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return archivo.getUrl();
  });
}

function visExtensionPorMime_(mime) {
  if (mime.indexOf('png') !== -1) return 'png';
  if (mime.indexOf('webp') !== -1) return 'webp';
  return 'jpg';
}

function visObtenerCarpetaFotos_() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_VIS_FOTOS);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_VIS_FOTOS);
}

// ── Marca "No realizada" cualquier reserva cuya fecha planeada tenga más
// de VIS_DIAS_LIMITE_VALIDACION días y siga sin ficha (Estatus=Reservada).
// La ficha misma es la prueba de que la visita ocurrió — si no llegó a
// tiempo, se asume que no se hizo. ──
function visMarcarNoRealizadas_() {
  const hoja = visObtenerHojaReservas();
  const datos = hoja.getDataRange().getValues();
  const hoy = new Date();

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];
    const estatus = String(fila[COL_VIS_ESTATUS - 1] || '').trim();
    if (estatus !== 'Reservada') continue;

    const fechaPlaneada = fila[COL_VIS_FECHA_PLANEADA - 1];
    if (!(fechaPlaneada instanceof Date)) continue;

    const limite = new Date(fechaPlaneada.getTime());
    limite.setDate(limite.getDate() + VIS_DIAS_LIMITE_VALIDACION);

    if (hoy > limite) {
      hoja.getRange(i + 1, COL_VIS_ESTATUS).setValue('No realizada');
    }
  }
}

// ── Instala el trigger diario de validación (seguro correrlo de nuevo:
// borra cualquier instalación previa antes de crear una nueva) ──
function visInstalarTriggerValidacion() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'visMarcarNoRealizadas_') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('visMarcarNoRealizadas_')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();
  try { SpreadsheetApp.getUi().alert('Trigger diario de validación instalado (corre ~6am).'); } catch (err) {}
}

function visDesinstalarTriggerValidacion() {
  let quitados = 0;
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'visMarcarNoRealizadas_') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  try { SpreadsheetApp.getUi().alert(quitados + ' trigger(s) de validación eliminado(s).'); } catch (err) {}
}

// ── Reporte de seguimiento en PDF (ago 2026): la persona encargada de dar
// seguimiento no tiene habilidades digitales para navegar la Sheet ni el
// sitio — no se le construye una interfaz, se le imprime o platica un
// resumen. Este botón genera ese resumen: próximas visitas, realizadas
// recientes (con la Operatividad completa, en formato de tarjeta legible,
// no una tabla apretada) y pendientes de seguimiento (No realizada).
// Mismo técnica que manGenerarPDFReporte_() en mantenimiento.gs (HTML →
// PDF vía Utilities.newBlob().getAs('application/pdf')), sin la pleca de
// logos institucional (ese base64 vive en el otro proyecto, no se
// duplica aquí para un documento de uso interno). ──
const CARPETA_VIS_REPORTES = 'Reportes de Seguimiento — Ceremonias Cívicas';
const VIS_REPORTE_DIAS_ATRAS = 14; // ventana de "recientes" para realizadas/no realizadas

function visGenerarReporteSeguimiento_() {
  const hoja = visObtenerHojaReservas();
  const filas = hoja.getDataRange().getValues().slice(1).filter(function (r) { return r[1]; });
  const hoy = new Date();
  const limiteAtras = new Date(hoy.getTime());
  limiteAtras.setDate(limiteAtras.getDate() - VIS_REPORTE_DIAS_ATRAS);

  const val = function (v) { return visEscapeHtmlReporte_(v || '—'); };
  const fechaTexto = function (f) {
    return f instanceof Date ? Utilities.formatDate(f, 'America/Mexico_City', 'dd/MM/yyyy') : '—';
  };

  const proximas = filas
    .filter(function (r) { return String(r[COL_VIS_ESTATUS - 1]).trim() === 'Reservada'; })
    .sort(function (a, b) { return new Date(a[COL_VIS_FECHA_PLANEADA - 1]) - new Date(b[COL_VIS_FECHA_PLANEADA - 1]); });

  const realizadas = filas
    .filter(function (r) {
      if (String(r[COL_VIS_ESTATUS - 1]).trim() !== 'Realizada') return false;
      const f = r[COL_VIS_FECHA_VISITA_REAL - 1];
      return f instanceof Date && f >= limiteAtras;
    })
    .sort(function (a, b) { return new Date(b[COL_VIS_FECHA_VISITA_REAL - 1]) - new Date(a[COL_VIS_FECHA_VISITA_REAL - 1]); });

  const noRealizadas = filas
    .filter(function (r) {
      if (String(r[COL_VIS_ESTATUS - 1]).trim() !== 'No realizada') return false;
      const f = r[COL_VIS_FECHA_PLANEADA - 1];
      return f instanceof Date && f >= limiteAtras;
    })
    .sort(function (a, b) { return new Date(b[COL_VIS_FECHA_PLANEADA - 1]) - new Date(a[COL_VIS_FECHA_PLANEADA - 1]); });

  const filasProximas = proximas.map(function (r) {
    return '<tr><td>' + val(r[7]) + ' (' + val(r[6]) + ')</td><td>' + fechaTexto(r[COL_VIS_FECHA_PLANEADA - 1]) + '</td>' +
      '<td>' + val(r[10]) + '</td><td>' + val(r[2]) + ' (' + val(r[3]) + ')</td></tr>';
  }).join('');

  const tarjetasRealizadas = realizadas.map(function (r) {
    return '<div class="tarjeta">' +
      '<div class="tarjeta-titulo">' + val(r[7]) + ' — ' + fechaTexto(r[COL_VIS_FECHA_VISITA_REAL - 1]) + '</div>' +
      '<div class="tarjeta-meta">Visitó: ' + val(r[2]) + ' (' + val(r[3]) + ') · CCT ' + val(r[6]) + '</div>' +
      '<div class="tarjeta-obs"><strong>Operatividad:</strong> ' + val(r[COL_VIS_OBSERVACIONES - 1]) + '</div>' +
      '</div>';
  }).join('');

  const filasNoRealizadas = noRealizadas.map(function (r) {
    return '<tr><td>' + val(r[7]) + ' (' + val(r[6]) + ')</td><td>' + fechaTexto(r[COL_VIS_FECHA_PLANEADA - 1]) + '</td>' +
      '<td>' + val(r[2]) + ' (' + val(r[3]) + ')</td></tr>';
  }).join('');

  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color:#222; font-size:11px; margin:0; padding:30px 34px; }' +
    '.encabezado { background:#56212f; color:#F9F8F5; padding:14px 18px; border-radius:8px 8px 0 0; }' +
    '.encabezado h1 { margin:0; font-size:16px; }' +
    '.encabezado p { margin:4px 0 0; font-size:10px; opacity:.85; }' +
    'h2 { color:#9F2241; font-size:13px; text-transform:uppercase; letter-spacing:.4px; border-bottom:1.5px solid #9F2241; padding-bottom:4px; margin:22px 0 10px; }' +
    'table { width:100%; border-collapse:collapse; font-size:10.5px; margin-bottom:6px; }' +
    'th { text-align:left; background:#F9F8F5; color:#56212f; padding:6px 8px; border-bottom:1.5px solid #d6d1ca; }' +
    'td { padding:6px 8px; border-bottom:1px solid #e5e1da; vertical-align:top; }' +
    '.vacio { color:#977e5b; font-size:10.5px; padding:6px 0; }' +
    '.tarjeta { border:1px solid #d6d1ca; border-left:4px solid #9F2241; border-radius:6px; padding:10px 14px; margin-bottom:10px; }' +
    '.tarjeta-titulo { font-weight:bold; color:#56212f; font-size:12px; }' +
    '.tarjeta-meta { color:#6b6b6b; font-size:9.5px; margin:2px 0 8px; }' +
    '.tarjeta-obs { font-size:11px; line-height:1.4; }' +
    '.pie { border-top:1px solid #d6d1ca; margin-top:20px; padding-top:8px; text-align:center; font-size:8px; color:#6b6b6b; }' +
    '</style></head><body>' +
    '<div class="encabezado"><h1>Seguimiento de Ceremonias Cívicas</h1>' +
    '<p>SEPRN · Subdirección de Educación Primaria en la Región de Nezahualcóyotl — generado el ' +
    Utilities.formatDate(hoy, 'America/Mexico_City', "dd/MM/yyyy 'a las' HH:mm") + ' hrs</p></div>' +
    '<h2>Próximas visitas</h2>' +
    (proximas.length
      ? '<table><tr><th>Escuela (CCT)</th><th>Fecha</th><th>Tipo</th><th>Quién visita</th></tr>' + filasProximas + '</table>'
      : '<p class="vacio">No hay visitas próximas registradas.</p>') +
    '<h2>Visitas realizadas (últimos ' + VIS_REPORTE_DIAS_ATRAS + ' días)</h2>' +
    (realizadas.length ? tarjetasRealizadas : '<p class="vacio">Sin visitas realizadas en este periodo.</p>') +
    '<h2>Pendientes de seguimiento — no realizadas</h2>' +
    (noRealizadas.length
      ? '<table><tr><th>Escuela (CCT)</th><th>Fecha planeada</th><th>Quién la había reservado</th></tr>' + filasNoRealizadas + '</table>'
      : '<p class="vacio">Sin pendientes en este periodo.</p>') +
    '<div class="pie">Documento generado autom&aacute;ticamente desde el sistema de Ceremonias C&iacute;vicas · Uso interno de seguimiento, no difundir.</div>' +
    '</body></html>';

  const blobHtml = Utilities.newBlob(html, 'text/html', 'reporte.html');
  const pdfBlob = blobHtml.getAs('application/pdf')
    .setName('Seguimiento Ceremonias Cívicas — ' + Utilities.formatDate(hoy, 'America/Mexico_City', 'dd-MM-yyyy') + '.pdf');

  const carpeta = visObtenerCarpetaReportes_();
  const archivo = carpeta.createFile(pdfBlob);
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  try { SpreadsheetApp.getUi().alert('Reporte generado:\n' + archivo.getUrl()); } catch (err) {}

  return archivo.getUrl();
}

function visObtenerCarpetaReportes_() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_VIS_REPORTES);
  if (carpetas.hasNext()) return carpetas.next();
  return DriveApp.createFolder(CARPETA_VIS_REPORTES);
}

function visEscapeHtmlReporte_(valor) {
  return String(valor == null ? '' : valor).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Menú del Sheet ──
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SEPRN Visitas')
    .addItem('Generar reporte de seguimiento (PDF)', 'visGenerarReporteSeguimiento_')
    .addSeparator()
    .addItem('Instalar trigger de validación diaria ("No realizada")', 'visInstalarTriggerValidacion')
    .addItem('Desinstalar trigger de validación diaria', 'visDesinstalarTriggerValidacion')
    .addItem('Marcar "No realizadas" ahora (manual)', 'visMarcarNoRealizadas_')
    .addToUi();
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function visTextResponse(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.TEXT);
}
