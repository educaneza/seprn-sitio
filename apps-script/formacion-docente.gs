// ============================================================
// SEPRN · OTDE — Centro de Formación Docente
// Endpoint para catálogo de cursos (webinars, seminarios,
// conferencias, cursos autogestivos, acciones formativas,
// diplomados, proyectos didácticos) y registro de docentes
//
// IMPLEMENTACIÓN:
//   1. Crea (o abre) el Google Spreadsheet "Formacion_Docente_2026_2027"
//      — uno nuevo por cada ciclo escolar (se duplica al cerrar el ciclo)
//   2. Extensiones → Apps Script → pega este código completo
//   3. Ajusta la constante CICLO_ESCOLAR más abajo si cambia el ciclo
//   4. Implementar → Nueva implementación → Tipo: Aplicación web
//      · Ejecutar como: Yo (tu cuenta)
//      · Quién tiene acceso: Cualquier usuario
//   5. Copia la URL generada y pégala en formacion-docente.html
//      en la constante APPS_SCRIPT_URL
//   6. Abre la hoja "Cursos" y da de alta tus cursos manualmente
//      (Categoria, Nombre, Responsable, Modalidad, fechas, Liga,
//      Activo=TRUE, Registro_previo_requerido=TRUE solo si el curso
//      tiene cupo real y limitado en una plataforma externa) — usa el
//      menú "OTDE Formación → Generar ID de cursos faltantes" para que
//      el ID_Curso se autocomplete
//
// HOJAS (pestañas dentro del mismo Spreadsheet):
//
//   Docentes — una fila por persona (llave: RFC)
//     A RFC | B Nombre_completo | C Correo | D Telefono | E CCT
//     F Escuela | G Sector | H Zona | I Municipio | J Funcion
//     K Fecha_primer_registro | L Fecha_ultima_actualizacion
//
//   Cursos — catálogo, administrado a mano por OTDE. Columnas por bloques
//   en el orden en que se llena un curso (28 sep 2026):
//     1. El curso:        A ID_Curso (auto) | B Categoria | C Nombre | D Responsable
//                         E Modalidad | F Dirigido_a | G Descripcion | H Liga_convocatoria
//     2. Cuándo:          I Fecha_inicio | J Fecha_fin | K Hora_inicio | L Hora_fin
//                         M Fechas_sesion
//     3. Inscripción:     N Visible_desde | O Fecha_limite_inscripcion
//                         P Hora_limite_inscripcion | Q Registro_previo_requerido
//                         R Cupo_agotado
//     4. Validez:         S Valida_USICAMM | T Valida_PROEEB | U Liga_tutorial_constancia
//     5. Control:         V Activo | W Ocultar_historial | X Notas
//     6. Automáticas:     Y-AA Recordatorio_{inicio,medio,webinar}_enviado
//     El código lee esta hoja SIEMPRE por nombre de encabezado
//     (valoresCursos_/colCursos_): mover columnas no rompe nada. Detalle de
//     cada columna más abajo, junto a ENCABEZADOS_CURSOS.
//
//   Registro_previo_requerido (TRUE/FALSE, tú lo decides por curso): si es
//   TRUE y hay Liga_convocatoria, el formulario OBLIGA a pasar por esa liga
//   externa antes de llenar los datos con OTDE — úsalo solo en cursos con
//   cupo real y limitado en la plataforma externa (diplomados, cursos
//   autogestivos). Si es FALSE, la liga solo se muestra como referencia al
//   final, sin forzar el paso — para categorías sin cupo real (la mayoría de
//   webinars).
//
//   Visible_desde (fecha, opcional): el curso aparece en el catálogo ese día
//   sin tener que tocar Activo. Se evalúa en doGet() en cada visita. Vacía →
//   se rige solo por Activo. Activo=FALSE siempre gana.
//
//   Inscripciones — una fila por registro (transaccional), columnas en
//   bloques (ver ENCABEZADOS_INSCRIPCIONES):
//     Registro:          Folio | Fecha_registro
//     Participante:      RFC_Docente | Nombre_Docente* | Correo* | Telefono* | Funcion*
//     Centro de trabajo: CCT* | Escuela* | Sector* | Zona*
//     Curso:             ID_Curso | Nombre_Curso*
//     Plataforma ext.:   Registro_externo | Fecha_confirmacion_externa
//                        Recordatorios_pendiente | Fecha_ultimo_recordatorio
//     Constancia:        Constancia_recordatorios_enviados | Fecha_ultimo_recordatorio_constancia
//                        Constancia_recibida | Fecha_recepcion_constancia | Liga_constancia_drive
//     Notas
//     * Fórmula VLOOKUP en vivo contra Docentes/Cursos — se recalculan solas
//     si cambian los datos del docente o del curso. Ver VISTA_INSCRIPCIONES.
//     El código lee esta hoja SIEMPRE por nombre de encabezado, nunca por
//     posición: reordenar columnas no rompe recordatorios ni estadísticas.
// ============================================================

const CICLO_ESCOLAR = '2627'; // 2026-2027 — actualizar cada ciclo
const MAX_CURSOS_PASADOS = 6; // tope de cursos en el historial "Cursos anteriores"

const HOJA_DOCENTES      = 'Docentes';
const HOJA_CURSOS        = 'Cursos';
const HOJA_INSCRIPCIONES = 'Inscripciones';

// ── Inscripciones: orden de columnas por bloques (sep 2026) ──
// Registro → Participante → Centro de trabajo → Curso → Seguimiento.
// Solo define el orden al CREAR la hoja o al correr "Reordenar columnas de
// Inscripciones"; la lectura/escritura siempre es por nombre (ver
// indicesPorEncabezado_), así que el código funciona con cualquier orden.
const ENCABEZADOS_INSCRIPCIONES = [
  'Folio', 'Fecha_registro',
  'RFC_Docente', 'Nombre_Docente', 'Correo', 'Telefono', 'Funcion',
  'CCT', 'Escuela', 'Sector', 'Zona',
  'ID_Curso', 'Nombre_Curso',
  // Seguimiento de la plataforma externa (doble registro)
  'Registro_externo', 'Fecha_confirmacion_externa',
  'Recordatorios_pendiente', 'Fecha_ultimo_recordatorio',
  // Recolección de constancia — solo cursos con Liga_tutorial_constancia
  // (ej. conferencias UNETE), ver "RECORDATORIO Y CARGA DE CONSTANCIA".
  'Constancia_recordatorios_enviados', 'Fecha_ultimo_recordatorio_constancia',
  'Constancia_recibida', 'Fecha_recepcion_constancia', 'Liga_constancia_drive',
  'Notas'
];
// Retiradas el 28 sep 2026 (sin uso real; "Reordenar columnas de
// Inscripciones" no las copia, quedan en el respaldo): Estado (siempre
// "Registrado"), Codigo_asistencia_capturado y Fecha_actualizacion_estado
// (la validación de asistencia con código nunca se construyó).

// Columnas calculadas con VLOOKUP en vivo: [rango, índice de columna, llave].
// Docentes!A:J = RFC, Nombre, Correo, Telefono, CCT, Escuela, Sector, Zona,
// Municipio, Funcion. Cursos!A:C = ID_Curso, Categoria, Nombre.
const VISTA_INSCRIPCIONES = {
  Nombre_Docente: ['Docentes!A:J', 2, 'RFC_Docente'],
  Correo:         ['Docentes!A:J', 3, 'RFC_Docente'],
  Telefono:       ['Docentes!A:J', 4, 'RFC_Docente'],
  Funcion:        ['Docentes!A:J', 10, 'RFC_Docente'],
  CCT:            ['Docentes!A:J', 5, 'RFC_Docente'],
  Escuela:        ['Docentes!A:J', 6, 'RFC_Docente'],
  Sector:         ['Docentes!A:J', 7, 'RFC_Docente'],
  Zona:           ['Docentes!A:J', 8, 'RFC_Docente'],
  Nombre_Curso:   ['Cursos!A:C', 3, 'ID_Curso']
};

// Registro_externo: ¿el docente confirmó su inscripción en la plataforma del
// curso (le llegó el correo de bienvenida)? Lo declara el propio docente en
// el formulario — no es verificación contra la plataforma. Vacío = registro
// anterior a esta columna, o página vieja en caché que no manda el dato.
const REGISTRO_EXTERNO = {
  CONFIRMADO: 'Confirmado por docente',
  PENDIENTE:  'Pendiente',
  NO_APLICA:  'No aplica'
};

// ── { 'Nombre_encabezado': índice 0-based } a partir de la fila de encabezados ──
function indicesPorEncabezado_(filaEncabezados) {
  const mapa = {};
  filaEncabezados.forEach((h, i) => {
    const nombre = String(h).trim();
    if (nombre && !(nombre in mapa)) mapa[nombre] = i;
  });
  return mapa;
}

function columnasInscripciones_(hoja) {
  const ancho = Math.max(hoja.getLastColumn(), 1);
  return indicesPorEncabezado_(hoja.getRange(1, 1, 1, ancho).getValues()[0]);
}

// ── Índice 0-based → letra de columna (0 → A, 25 → Z, 26 → AA) ──
function letraColumna_(indice) {
  let n = indice + 1, letras = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    letras = String.fromCharCode(65 + m) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

// ── Fórmula de vista para una columna calculada, en una fila dada ──
function formulaVista_(nombreColumna, fila, cols) {
  const [rango, indice, llave] = VISTA_INSCRIPCIONES[nombreColumna];
  return '=IFERROR(VLOOKUP(' + letraColumna_(cols[llave]) + fila + ',' + rango + ',' + indice + ',FALSE),"")';
}

const PREFIJOS_CATEGORIA = {
  'Webinar':               'WEB',
  'Seminario':              'SEM',
  'Conferencia':            'CNF',
  'Curso autogestivo':      'AUT',
  'Acción formativa':       'ACF',
  'Diplomado':              'DIP',
  'Proyecto didáctico':     'PRY'
};

// ── Fecha sin hora (año/mes/día), para comparar ventanas de visibilidad
// sin depender de husos horarios ni de la hora exacta de la visita ──
function soloFecha(valor) {
  const d = new Date(valor);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// ── ¿Este curso ya debe verse, según Visible_desde? Vacía: sin restricción.
// (Visible_hasta se retiró el 28 sep 2026: para cerrar inscripciones se usa
// Fecha_limite_inscripcion; para quitar un curso, Activo=FALSE.) ──
function dentroDeVentanaVisible(visibleDesde) {
  const hoy = soloFecha(new Date());
  return !(visibleDesde && hoy < soloFecha(visibleDesde));
}

// ── Parseo seguro de fecha: null si el valor no es una fecha real (vacío,
// o texto libre como "Por definir") — nunca lanza ni compara contra una
// fecha falsa como "31/12/1969". Fail-open: úsalo antes de cualquier
// comparación de estado, para que un dato incompleto nunca oculte ni
// bloquee un curso por error. ──
function parseFechaSegura_(valor) {
  if (!valor) return null;
  const d = soloFecha(valor);
  return isNaN(d.getTime()) ? null : d;
}

// ── Hora (H, M) de una celda: Date de Sheets (celda con formato de hora) o
// texto tipo "14:00" / "14:00 h". null si no se entiende (fail-open). ──
function horaYMinutos_(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]' && !isNaN(valor)) return { h: valor.getHours(), m: valor.getMinutes() };
  const t = String(valor || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!t || Number(t[1]) > 23 || Number(t[2]) > 59) return null;
  return { h: Number(t[1]), m: Number(t[2]) };
}

// ── Momento exacto en que cierra la inscripción: Fecha_limite_inscripcion
// (V, con fallback a Fecha_inicio) + Hora_limite_inscripcion (AA). Sin hora
// (o con una que no se entiende) → cierra al terminar ese día, como siempre.
// null si no hay fecha límite real. ──
function momentoCierreInscripcion_(row) {
  const fecha = row[CUR.Fecha_limite_inscripcion] ? parseFechaSegura_(row[CUR.Fecha_limite_inscripcion]) : parseFechaSegura_(row[CUR.Fecha_inicio]);
  if (!fecha) return null;
  const hora = row[COL_HORA_LIMITE_INSCRIPCION] ? horaYMinutos_(row[COL_HORA_LIMITE_INSCRIPCION]) : null;
  return hora
    ? new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), hora.h, hora.m)
    : new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);
}

// ── Estado de un curso según Fecha_fin, el cierre de inscripción (fecha +
// hora opcional) y Cupo_agotado. Modelo de 4 estados: inscripción abierta
// (normal) → cupo agotado (sigue visible, sin registros nuevos salvo "solo
// vengo a avisar") → inscripción cerrada pero el curso sigue en desarrollo
// (se queda en el catálogo con leyenda, sin CTA) → pasado (fuera del
// catálogo vigente, entra al historial). `ahora` lleva hora real: el cierre
// se evalúa al minuto; esPasado sigue siendo por día. ──
function evaluarEstadoCurso_(row, ahora) {
  const fechaFin = parseFechaSegura_(row[CUR.Fecha_fin]);
  const cierre = momentoCierreInscripcion_(row);
  let estadoInscripcion = 'abierta';
  if (cierre !== null && ahora > cierre) estadoInscripcion = 'cerrada';
  else if (String(row[COL_CUPO_AGOTADO]).trim().toUpperCase() === 'TRUE') estadoInscripcion = 'agotada';
  return {
    esPasado: fechaFin !== null && soloFecha(ahora) > fechaFin,
    fechaFinOrden: fechaFin ? fechaFin.getTime() : null,
    estadoInscripcion: estadoInscripcion
  };
}

// ── Construye el objeto de curso que viaja al catálogo — compartido por
// los cursos vigentes y los del historial ("cursos_pasados"). ──
// ── Fechas_sesion (AD) → ["2026-10-07", ...] ordenadas y sin repetir.
// "d/m" toma el año de Fecha_inicio; si el mes queda antes que el de
// Fecha_inicio, es del año siguiente (ciclo escolar que cruza diciembre).
// Si Sheets convirtió una sola fecha en Date, también se acepta. Lo que no
// se entienda se ignora (fail-open). ──
function fechasSesion_(valor, fechaInicio) {
  if (!valor) return [];
  const inicio = parseFechaSegura_(fechaInicio);
  const iso = d => Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  if (Object.prototype.toString.call(valor) === '[object Date]') return isNaN(valor) ? [] : [iso(valor)];
  const fechas = String(valor).split(/[,;\n]+/).map(function(t) {
    const m = t.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (!m) return null;
    const dia = Number(m[1]), mes = Number(m[2]) - 1;
    let anio = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : (inicio ? inicio.getFullYear() : new Date().getFullYear());
    if (!m[3] && inicio && mes < inicio.getMonth()) anio++;
    const d = new Date(anio, mes, dia);
    return d.getMonth() === mes ? iso(d) : null;
  }).filter(Boolean);
  return fechas.filter(function(f, i) { return fechas.indexOf(f) === i; }).sort();
}

function construirCursoApi_(row, estadoInscripcion, inscritosPorCurso) {
  const cierre = momentoCierreInscripcion_(row);
  const hora = row[COL_HORA_LIMITE_INSCRIPCION] ? horaYMinutos_(row[COL_HORA_LIMITE_INSCRIPCION]) : null;
  const horaInicio = row[COL_HORA_INICIO] ? horaYMinutos_(row[COL_HORA_INICIO]) : null;
  const horaFin = row[COL_HORA_FIN] ? horaYMinutos_(row[COL_HORA_FIN]) : null;
  const hhmm = h => h ? ('0' + h.h).slice(-2) + ':' + ('0' + h.m).slice(-2) : '';
  return {
    id:                        row[CUR.ID_Curso].toString().trim(),
    categoria:                 row[CUR.Categoria],
    nombre:                    row[CUR.Nombre],
    responsable:               row[CUR.Responsable],
    modalidad:                 row[CUR.Modalidad],
    fecha_inicio:              formatearFecha(row[CUR.Fecha_inicio]),
    fecha_fin:                 formatearFecha(row[CUR.Fecha_fin]),
    liga_convocatoria:         row[CUR.Liga_convocatoria] || '',
    registro_previo_requerido: String(row[CUR.Registro_previo_requerido]).trim().toUpperCase() === 'TRUE',
    descripcion:               row[CUR.Descripcion] || '',
    dirigido_a:                row[CUR.Dirigido_a] || '',
    valida_usicamm:            String(row[CUR.Valida_USICAMM]).trim().toUpperCase() === 'TRUE',
    valida_proeeb:             String(row[CUR.Valida_PROEEB]).trim().toUpperCase() === 'TRUE',
    estado_inscripcion:        estadoInscripcion,
    // Cierre de inscripción: fecha y hora para mostrar ("Inscríbete hasta
    // …") + instante exacto para que la página cierre sola si se queda
    // abierta. Vacíos si no hay fecha límite real (fail-open).
    fecha_limite_inscripcion:  cierre ? formatearFecha(cierre) : '',
    hora_limite_inscripcion:   hhmm(hora),
    // Hora del evento (HH:MM, hora del centro de México) para los botones
    // "Agregar a mi calendario" y el comprobante de la confirmación (sep 2026).
    hora_inicio:               hhmm(horaInicio),
    hora_fin:                  hhmm(horaFin),
    fechas_sesion:             fechasSesion_(row[COL_FECHAS_SESION], row[CUR.Fecha_inicio]),
    cierre_inscripcion_iso:    cierre ? cierre.toISOString() : '',
    inscritos:                inscritosPorCurso[row[CUR.ID_Curso].toString().trim().toUpperCase()] || 0
  };
}

// ── doGet: catálogo de cursos activos + historial de cursos pasados ──
function doGet(e) {
  // Botón "Sí, ya me llegó" del recordatorio a pendientes (ver
  // confirmarDesdeCorreo_). Cualquier otra llamada regresa el catálogo.
  const params = (e && e.parameter) || {};
  if (params.action === 'confirmar') {
    return textResponse(JSON.stringify(confirmarDesdeCorreo_(params.folio, params.t)));
  }
  // Liga firmada del recordatorio de constancia (ver más abajo) — info previa
  // antes de mostrar el formulario de carga, para no ofrecerlo si ya se
  // recibió o si el plazo ya venció.
  if (params.action === 'constanciaInfo') {
    return textResponse(JSON.stringify(constanciaInfo_(params.folio, params.t)));
  }
  try {
    const hoja  = obtenerHojaCursos();
    const datos = valoresCursos_(hoja).slice(1);
    const inscritosPorCurso = contarInscritosPorCurso();
    const ahora = new Date();

    const cursos = [];
    const pasadosCandidatos = [];

    datos
      .filter(row => String(row[CUR.ID_Curso]).trim())
      .forEach(row => {
        const activo = String(row[CUR.Activo]).trim().toUpperCase() === 'TRUE';
        const { esPasado, fechaFinOrden, estadoInscripcion } = evaluarEstadoCurso_(row, ahora);

        if (esPasado) {
          // El historial NO depende de Activo (sep 2026): era costumbre
          // apagar el curso al terminar, y eso lo borraba también de
          // "Cursos anteriores". Para sacar uno de aquí (prueba, cancelado)
          // está Ocultar_historial=TRUE. Tampoco pasa por
          // dentroDeVentanaVisible(): esa ventana controla la aparición/
          // desaparición de cursos vigentes, no la de un curso ya terminado.
          if (String(row[COL_OCULTAR_HISTORIAL]).trim().toUpperCase() === 'TRUE') return;
          pasadosCandidatos.push({ cursoApi: construirCursoApi_(row, estadoInscripcion, inscritosPorCurso), fechaFinOrden });
        } else if (activo && dentroDeVentanaVisible(row[CUR.Visible_desde])) {
          cursos.push(construirCursoApi_(row, estadoInscripcion, inscritosPorCurso));
        }
      });

    const cursos_pasados = pasadosCandidatos
      .sort((a, b) => (b.fechaFinOrden || 0) - (a.fechaFinOrden || 0))
      .slice(0, MAX_CURSOS_PASADOS)
      .map(c => c.cursoApi);

    return textResponse(JSON.stringify({ status: 'ok', cursos, cursos_pasados }));
  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message, cursos: [], cursos_pasados: [] }));
  }
}

// ── Cuenta cuántas Inscripciones tiene cada ID_Curso ──
// Prueba social real para el catálogo (nunca un número inventado).
function contarInscritosPorCurso() {
  const datos = obtenerHojaInscripciones().getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);
  const conteo = {};
  datos.slice(1).forEach(row => {
    const idCurso = String(row[cols.ID_Curso]).trim().toUpperCase();
    if (!idCurso) return;
    conteo[idCurso] = (conteo[idCurso] || 0) + 1;
  });
  return conteo;
}

// ── doPost: recibe un registro (docente + un curso) ──
function doPost(e) {
  // Candado: dos registros simultáneos podían leer el mismo folio máximo en
  // generarFolio(); además, "Reordenar columnas de Inscripciones" toma este
  // mismo candado para que ningún registro se cuele a la mitad de la copia.
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (errLock) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' }));
  }

  try {
    const datos = JSON.parse(e.postData.contents);

    // Carga de constancia desde la liga firmada del recordatorio post-
    // conferencia (ver "RECORDATORIO Y CARGA DE CONSTANCIA" más abajo) — no
    // es un registro nuevo, se ramifica antes de validarCampos().
    if (datos.accion === 'subirConstancia') {
      return textResponse(JSON.stringify(subirConstancia_(datos)));
    }

    validarCampos(datos);

    const rfc      = datos.rfc.trim().toUpperCase();
    const idCurso  = datos.id_curso.trim().toUpperCase();
    const ahora    = new Date();

    const hojaCursos = obtenerHojaCursos();
    const filaCurso = obtenerFilaCurso_(hojaCursos, idCurso);
    if (!filaCurso) {
      throw new Error('Curso no encontrado: ' + idCurso);
    }
    // Capa de seguridad del lado servidor: la UI ya deja de ofrecer el clic
    // en cursos pasados, pero esto evita un registro colado por una llamada
    // directa al endpoint (curl, caché vieja del cliente, etc.) a un curso
    // cuyo periodo de desarrollo ya terminó.
    const estadoCurso = evaluarEstadoCurso_(filaCurso, ahora);
    if (estadoCurso.esPasado) {
      throw new Error('Este curso ya concluyó y no acepta más registros: ' + idCurso);
    }

    const registroExterno = resolverRegistroExterno_(filaCurso, datos.registro_externo);

    const hojaInscripciones = obtenerHojaInscripciones();
    const existente = buscarInscripcionExistente(hojaInscripciones, rfc, idCurso);

    // Cierre por fecha/hora y por cupo: solo frena registros NUEVOS (quien ya
    // tiene folio sí puede volver a avisar que le llegó el correo de
    // bienvenida). Con cupo agotado se acepta además a quien declara que ya
    // se inscribió en la plataforma externa ("solo vengo a avisar"): esa
    // persona sí tiene lugar y OTDE necesita su registro.
    if (!existente) {
      if (estadoCurso.estadoInscripcion === 'cerrada') {
        throw new Error('Las inscripciones de este curso ya cerraron: ' + filaCurso[CUR.Nombre]);
      }
      if (estadoCurso.estadoInscripcion === 'agotada' && registroExterno !== REGISTRO_EXTERNO.CONFIRMADO) {
        throw new Error('Cupo agotado — ya no hay lugares disponibles en: ' + filaCurso[CUR.Nombre]);
      }
    }

    const hojaDocentes = obtenerHojaDocentes();
    upsertDocente(hojaDocentes, datos, rfc, ahora);

    if (existente) {
      // El docente puede volver a "solo avisar" que ya le llegó el correo de
      // bienvenida: no se duplica el folio, pero sí se mejora el estado.
      mejorarRegistroExterno_(hojaInscripciones, existente, registroExterno, ahora);
      return textResponse(JSON.stringify({ status: 'ok', folio: existente.folio, duplicado: true }));
    }

    const folio = generarFolio(hojaInscripciones);
    agregarInscripcion(hojaInscripciones, folio, ahora, rfc, idCurso, '', registroExterno);

    return textResponse(JSON.stringify({ status: 'ok', folio: folio, duplicado: false }));

  } catch (err) {
    return textResponse(JSON.stringify({ status: 'error', mensaje: err.message }));
  } finally {
    lock.releaseLock();
  }
}

// ── Registro_externo según el CURSO (servidor) + lo que declaró el docente ──
// "No aplica" lo decide el servidor con la hoja Cursos, no el cliente: mismo
// criterio que el formulario (Registro_previo_requerido=TRUE y con liga).
function resolverRegistroExterno_(filaCurso, valorCliente) {
  const exigePrevio = String(filaCurso[CUR.Registro_previo_requerido]).trim().toUpperCase() === 'TRUE' &&
                      String(filaCurso[CUR.Liga_convocatoria] || '').trim() !== '';
  if (!exigePrevio) return REGISTRO_EXTERNO.NO_APLICA;
  const valor = String(valorCliente || '').trim().toLowerCase();
  if (valor === 'confirmado') return REGISTRO_EXTERNO.CONFIRMADO;
  if (valor === 'pendiente') return REGISTRO_EXTERNO.PENDIENTE;
  return ''; // página vieja en caché que todavía no manda el dato
}

// ── Mejora (nunca empeora) el Registro_externo de una inscripción existente ──
// Permitido: vacío → cualquier valor; Pendiente → Confirmado. Nunca se baja
// de Confirmado a Pendiente por un reenvío.
function mejorarRegistroExterno_(hoja, existente, nuevo, ahora) {
  const actual = existente.registroExterno;
  const mejora = nuevo && (
    actual === '' ||
    (actual === REGISTRO_EXTERNO.PENDIENTE && nuevo === REGISTRO_EXTERNO.CONFIRMADO)
  );
  if (!mejora) return false;

  const cols = columnasInscripciones_(hoja);
  hoja.getRange(existente.fila, cols.Registro_externo + 1).setValue(nuevo);
  if (nuevo === REGISTRO_EXTERNO.CONFIRMADO) {
    hoja.getRange(existente.fila, cols.Fecha_confirmacion_externa + 1).setValue(ahora);
  }
  return true;
}

// Si el valor nuevo viene vacío, conserva el que ya había en la hoja — evita
// que un registro incompleto (ej. la migración histórica, que no tiene
// Telefono) borre un dato bueno que el docente ya había dado en otro
// registro. Un valor nuevo no vacío siempre gana (última info conocida).
function valorOMantener(nuevo, actual) {
  const n = (nuevo === undefined || nuevo === null) ? '' : String(nuevo).trim();
  return n ? n : (actual === undefined || actual === null ? '' : String(actual).trim());
}

// ── Upsert: actualiza si el RFC ya existe, inserta si no ──
function upsertDocente(hoja, d, rfc, ahora) {
  const datos = hoja.getDataRange().getValues();

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][0]).trim().toUpperCase() === rfc) {
      const fila = i + 1;
      const actual = datos[i]; // [RFC, Nombre, Correo, Telefono, CCT, Escuela, Sector, Zona, Municipio, Funcion, ...]
      hoja.getRange(fila, 2, 1, 9).setValues([[
        valorOMantener(d.nombre, actual[1]),
        valorOMantener((d.correo || '').toLowerCase(), actual[2]),
        valorOMantener(d.telefono, actual[3]),
        valorOMantener((d.cct || '').toUpperCase(), actual[4]),
        valorOMantener(d.escuela, actual[5]),
        valorOMantener(d.sector, actual[6]),
        valorOMantener(d.zona, actual[7]),
        valorOMantener(d.municipio, actual[8]),
        valorOMantener(d.funcion, actual[9])
      ]]);
      hoja.getRange(fila, 12).setValue(ahora); // Fecha_ultima_actualizacion
      return;
    }
  }

  // No existía: se agrega
  hoja.appendRow([
    rfc,
    d.nombre.trim(),
    d.correo.trim().toLowerCase(),
    d.telefono.trim(),
    d.cct.trim().toUpperCase(),
    d.escuela.trim(),
    (d.sector || '').toString().trim(),
    (d.zona || '').toString().trim(),
    (d.municipio || '').trim(),
    d.funcion.trim(),
    ahora, // Fecha_primer_registro
    ahora  // Fecha_ultima_actualizacion
  ]);
}

// ── ¿Ya existe una inscripción de este RFC a este curso? ──
// Devuelve { folio, fila (1-based), registroExterno } o null.
function buscarInscripcionExistente(hoja, rfc, idCurso) {
  const datos = hoja.getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][cols.RFC_Docente]).trim().toUpperCase() === rfc &&
        String(datos[i][cols.ID_Curso]).trim().toUpperCase() === idCurso) {
      return {
        folio: datos[i][cols.Folio],
        fila: i + 1,
        registroExterno: cols.Registro_externo === undefined ? '' : String(datos[i][cols.Registro_externo]).trim()
      };
    }
  }
  return null;
}

// ── Busca la fila de este ID_Curso en el catálogo. null si no existe. ──
function obtenerFilaCurso_(hoja, idCurso) {
  const datos = valoresCursos_(hoja);
  const fila = datos.slice(1).find(row => String(row[CUR.ID_Curso]).trim().toUpperCase() === idCurso);
  return fila || null;
}

// ── Obtener o crear hoja Docentes ──
function obtenerHojaDocentes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_DOCENTES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_DOCENTES);
    hoja.appendRow([
      'RFC', 'Nombre_completo', 'Correo', 'Telefono', 'CCT', 'Escuela',
      'Sector', 'Zona', 'Municipio', 'Funcion',
      'Fecha_primer_registro', 'Fecha_ultima_actualizacion'
    ]);
    estilizarEncabezado(hoja, 12);
    hoja.setColumnWidth(2, 200); // Nombre_completo
    hoja.setColumnWidth(6, 220); // Escuela
  }
  return hoja;
}

// ── Obtener o crear hoja Cursos ──
// Encabezados completos de Cursos, en orden. Si agregas una columna nueva
// en el futuro, solo agrégala aquí — obtenerHojaCursos() completa sola el
// encabezado que falte en hojas ya existentes, sin tocar las columnas
// previas ni sus datos.
const ENCABEZADOS_CURSOS = [
  // 1. El curso
  'ID_Curso', 'Categoria', 'Nombre', 'Responsable', 'Modalidad',
  'Dirigido_a', 'Descripcion', 'Liga_convocatoria',
  // 2. Cuándo se imparte
  'Fecha_inicio', 'Fecha_fin', 'Hora_inicio', 'Hora_fin', 'Fechas_sesion',
  // 3. Inscripción
  'Visible_desde', 'Fecha_limite_inscripcion', 'Hora_limite_inscripcion',
  'Registro_previo_requerido', 'Cupo_agotado',
  // 4. Validez y constancia
  'Valida_USICAMM', 'Valida_PROEEB', 'Liga_tutorial_constancia',
  // 5. Control
  'Activo', 'Ocultar_historial', 'Notas',
  // 6. Automáticas — las marca el sistema, no se llenan a mano
  'Recordatorio_inicio_enviado', 'Recordatorio_medio_enviado', 'Recordatorio_webinar_enviado'
];

// Columnas retiradas el 28 sep 2026 (sin uso real): "Reordenar columnas de
// Cursos" no las copia a la hoja nueva (quedan en el respaldo).
//   Requiere_codigo_asistencia / Codigo_asistencia — la validación de
//   asistencia con código nunca se construyó.
//   Visible_hasta — escondía el curso por completo; para cerrar
//   inscripciones se usa Fecha_limite_inscripcion (+ hora).

// Índice 0-based de cada columna de Cursos EN EL ORDEN DE ENCABEZADOS_CURSOS.
// Las filas que devuelve valoresCursos_() vienen siempre en este orden, sin
// importar cómo esté acomodada la hoja real (se leen por nombre de
// encabezado, 28 sep 2026) — mover o insertar columnas ya no rompe nada.
const CUR = indicesPorEncabezado_(ENCABEZADOS_CURSOS);
// Hora_inicio (opcional): hora de inicio, ej. 16:00. Sin esto no se puede mandar el
// recordatorio de "faltan X horas" — no hay forma de saber la hora exacta
// solo con Fecha_inicio/Fecha_fin.
// Recordatorio_*_enviado: banderas TRUE/FALSE que el propio sistema marca solo para no
// mandar el mismo recordatorio dos veces — no las edites a mano salvo
// para forzar un reenvío (bórralas y se vuelve a evaluar en la próxima
// corrida del disparador).
// Descripcion (opcional): propósito/objetivo/de qué trata el curso,
// texto libre — se muestra en la tarjeta del catálogo.
// Dirigido_a (opcional): público objetivo (ej. "Docentes de primaria",
// "Personal administrativo") — texto libre, se muestra como pill en la
// tarjeta junto a la modalidad.
// Fecha_limite_inscripcion (opcional): último día para inscribirse —
// distinto de Fecha_inicio/Fecha_fin, que son el periodo de DESARROLLO del
// curso. Vacía → se usa Fecha_inicio como límite. Pasada esta fecha (pero
// con Fecha_fin todavía en el futuro), el curso sigue visible en el
// catálogo con la leyenda "Inscripciones cerradas · Curso en desarrollo" y
// sin botón de registro — solo desaparece del catálogo vigente (pasa al
// historial "Cursos anteriores") cuando también termina Fecha_fin.
// Valida_USICAMM / Valida_PROEEB (TRUE/FALSE, independientes entre
// sí — un curso puede tener una, otra, ambas o ninguna): validez oficial
// del curso para esos procesos. Se muestran como etiqueta destacada en la
// tarjeta ("USICAMM", "PROEEB" o "USICAMM · PROEEB" si aplican las dos).
// Liga_tutorial_constancia (opcional, sep 2026): liga al tutorial de la
// plataforma externa (ej. UNETE) para tramitar la constancia de
// participación. Su sola presencia es la señal que activa el recordatorio
// + carga de constancia de este curso — ver "RECORDATORIO Y CARGA DE
// CONSTANCIA" más abajo. Se agrega también al correo de aviso del curso
// (lineaTutorialConstancia_()), igual que Descripcion/Dirigido_a: solo se
// muestra si está llena.
// Hora_fin (opcional, sep 2026): hora en que termina la conferencia/
// webinar (ej. 18:00), para calcular el momento exacto en que debe salir
// el primer recordatorio de constancia. Vacía → se asume que termina a las
// 23:59 de Fecha_fin (fail-open, igual criterio que el resto de fechas/
// horas opcionales de esta hoja: nunca bloquea el recordatorio, solo lo
// vuelve menos preciso).
// Hora_limite_inscripcion (opcional, sep 2026): hora exacta en que
// cierra la inscripción el día de Fecha_limite_inscripcion (ej. 14:00).
// Vacía → cierra al terminar ese día (23:59), como siempre. Se evalúa al
// minuto en doGet/doPost, y la página se cierra sola si queda abierta.
// Cupo_agotado (TRUE/FALSE, sep 2026): márcalo a mano cuando ya no hay
// lugares aunque la inscripción siga en fecha. El curso sigue visible con
// la leyenda "Cupo agotado", sin registros nuevos — salvo quien ya se
// inscribió en la plataforma externa y viene a "solo avisar". Si ya pasó
// el cierre, gana "Inscripciones cerradas".
// Ocultar_historial (TRUE/FALSE, sep 2026): "Cursos anteriores" ya no
// depende de Activo (apagar un curso al terminar lo borraba del
// historial); usa esta columna para sacar de ahí un curso de prueba o
// cancelado.
// Fechas_sesion (opcional, sep 2026): días de sesión de un curso
// sincrónico de varios días, separados por coma — ej. "7/10, 14/10, 21/10"
// (también acepta "7/10/2026"). Sirve igual para días fijos (se listan) o
// sueltos. Todas las sesiones usan Hora_inicio/Hora_fin. Solo alimenta los
// botones "Agregar a mi calendario" de la página (un evento con aviso por
// sesión, sin gastar cuota de correo) — los correos no cambian. Vacía → el
// calendario agenda solo el día de inicio, como siempre.

function obtenerHojaCursos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_CURSOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_CURSOS);
    hoja.appendRow(ENCABEZADOS_CURSOS);
    estilizarEncabezado(hoja, ENCABEZADOS_CURSOS.length);
    hoja.setColumnWidth(3, 280); // Nombre
    hoja.setColumnWidth(8, 220); // Liga_convocatoria
  } else {
    // Encabezado faltante (columna nueva en el código): se agrega al final,
    // por NOMBRE — sin tocar las columnas ni los datos existentes.
    const actuales = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0].map(h => String(h).trim());
    const faltantes = ENCABEZADOS_CURSOS.filter(h => actuales.indexOf(h) === -1);
    if (faltantes.length) {
      const desde = hoja.getLastColumn() + 1;
      if (hoja.getMaxColumns() < desde + faltantes.length - 1) {
        hoja.insertColumnsAfter(hoja.getMaxColumns(), desde + faltantes.length - 1 - hoja.getMaxColumns());
      }
      hoja.getRange(1, desde, 1, faltantes.length)
        .setValues([faltantes])
        .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
    }
  }
  return hoja;
}

// ── Valores de Cursos con cada fila en el orden de ENCABEZADOS_CURSOS
// (row[CUR.Fecha_inicio], etc.), leídos por nombre de encabezado. La fila 0
// es el encabezado; el índice de fila no cambia (fila real = i + 1). Una
// columna que no exista en la hoja real llega vacía. ──
function valoresCursos_(hoja) {
  const datos = hoja.getDataRange().getValues();
  if (!datos.length) return [ENCABEZADOS_CURSOS.slice()];
  const real = indicesPorEncabezado_(datos[0].map(h => String(h).trim()));
  const mapa = ENCABEZADOS_CURSOS.map(h => (h in real ? real[h] : -1));
  return datos.map((fila, i) => i === 0 ? ENCABEZADOS_CURSOS.slice() : mapa.map(j => (j === -1 ? '' : fila[j])));
}

// ── Número de columna (1-based) REAL de un encabezado de Cursos, para
// escribir en la hoja. ──
function colCursos_(hoja, nombre) {
  const enc = hoja.getRange(1, 1, 1, Math.max(hoja.getLastColumn(), 1)).getValues()[0].map(h => String(h).trim());
  const i = enc.indexOf(nombre);
  if (i === -1) throw new Error('La hoja Cursos no tiene la columna "' + nombre + '".');
  return i + 1;
}

// ── Obtener o crear hoja Inscripciones ──
// Hoja nueva: se crea directo con el orden por bloques. Hoja existente: si le
// falta algún encabezado de ENCABEZADOS_INSCRIPCIONES (ej. Correo/Telefono/
// Registro_externo en una hoja creada antes de sep 2026), se agrega AL FINAL
// sin mover nada — para dejarla en el orden por bloques está el menú
// "Reordenar columnas de Inscripciones".
function obtenerHojaInscripciones() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = ss.getSheetByName(HOJA_INSCRIPCIONES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_INSCRIPCIONES);
    hoja.getRange(1, 1, 1, ENCABEZADOS_INSCRIPCIONES.length).setValues([ENCABEZADOS_INSCRIPCIONES]);
    darFormatoHojaInscripciones_(hoja);
    return hoja;
  }

  const cols = columnasInscripciones_(hoja);
  const faltantes = ENCABEZADOS_INSCRIPCIONES.filter(h => !(h in cols));
  if (faltantes.length) {
    const desde = hoja.getLastColumn() + 1;
    hoja.getRange(1, desde, 1, faltantes.length)
      .setValues([faltantes])
      .setFontWeight('bold').setBackground('#56212f').setFontColor('#F9F8F5');
  }
  return hoja;
}

// ── Estilo de Inscripciones: encabezado, fila fija, filtro, anchos, formatos ──
function darFormatoHojaInscripciones_(hoja) {
  const cols = columnasInscripciones_(hoja);
  const ancho = hoja.getLastColumn();
  estilizarEncabezado(hoja, ancho);

  const anchos = {
    Folio: 125, Fecha_registro: 150, RFC_Docente: 135, Nombre_Docente: 230, Correo: 220, Telefono: 105,
    Funcion: 150, Escuela: 200, ID_Curso: 110, Nombre_Curso: 260, Registro_externo: 170,
    Fecha_confirmacion_externa: 170, Recordatorios_pendiente: 160, Fecha_ultimo_recordatorio: 170, Notas: 220,
    Liga_constancia_drive: 220
  };
  Object.keys(anchos).forEach(h => { if (h in cols) hoja.setColumnWidth(cols[h] + 1, anchos[h]); });

  const filas = Math.max(hoja.getMaxRows() - 1, 1);
  ['Fecha_registro', 'Fecha_confirmacion_externa', 'Fecha_ultimo_recordatorio',
    'Fecha_ultimo_recordatorio_constancia', 'Fecha_recepcion_constancia'].forEach(h => {
    if (h in cols) hoja.getRange(2, cols[h] + 1, filas, 1).setNumberFormat('d/M/yyyy H:mm:ss');
  });
  if ('Constancia_recibida' in cols) {
    hoja.getRange(2, cols.Constancia_recibida + 1, filas, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).setAllowInvalid(true).build());
  }

  // Lista suave + color en Registro_externo: ámbar = pendiente, verde = confirmado.
  if ('Registro_externo' in cols) {
    const rango = hoja.getRange(2, cols.Registro_externo + 1, filas, 1);
    rango.setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList([REGISTRO_EXTERNO.CONFIRMADO, REGISTRO_EXTERNO.PENDIENTE, REGISTRO_EXTERNO.NO_APLICA], true)
      .setAllowInvalid(true).build());
    const reglas = hoja.getConditionalFormatRules().filter(r =>
      !r.getRanges().some(rg => rg.getColumn() === cols.Registro_externo + 1));
    reglas.push(
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(REGISTRO_EXTERNO.PENDIENTE)
        .setBackground('#FCF3E3').setFontColor('#8A5A16').setRanges([rango]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(REGISTRO_EXTERNO.CONFIRMADO)
        .setBackground('#E9F5EE').setFontColor('#146C43').setRanges([rango]).build()
    );
    hoja.setConditionalFormatRules(reglas);
  }

  // Filtro sobre TODAS las filas de la hoja (no solo las que hoy tienen
  // datos), para que los registros nuevos queden dentro del filtro.
  if (!hoja.getFilter()) {
    hoja.getRange(1, 1, hoja.getMaxRows(), ancho).createFilter();
  }
}

// ── Agrega una fila a Inscripciones (datos + fórmulas de vista) ──
// Escribe por nombre de encabezado, en una sola operación. Las columnas de
// VISTA_INSCRIPCIONES son VLOOKUP en vivo contra Docentes/Cursos: si el
// docente actualiza sus datos (otra inscripción) o cambia el nombre del
// curso, se reflejan solas — no son una copia congelada.
function agregarInscripcion(hoja, folio, fecha, rfc, idCurso, notas, registroExterno) {
  const cols = columnasInscripciones_(hoja);
  const fila = hoja.getLastRow() + 1;
  const ancho = Math.max(...Object.values(cols)) + 1;
  // A diferencia de appendRow(), getRange() no crece la hoja sola.
  if (fila > hoja.getMaxRows()) hoja.insertRowsAfter(hoja.getMaxRows(), 200);
  const valores = new Array(ancho).fill('');

  const poner = (h, v) => { if (h in cols) valores[cols[h]] = v; };
  poner('Folio', folio);
  poner('Fecha_registro', fecha);
  poner('RFC_Docente', rfc);
  poner('ID_Curso', idCurso);
  poner('Notas', notas || '');
  poner('Registro_externo', registroExterno || '');
  if (registroExterno === REGISTRO_EXTERNO.CONFIRMADO) poner('Fecha_confirmacion_externa', fecha);
  Object.keys(VISTA_INSCRIPCIONES).forEach(h => poner(h, formulaVista_(h, fila, cols)));

  // setValues interpreta los textos que empiezan con "=" como fórmulas.
  hoja.getRange(fila, 1, 1, ancho).setValues([valores]);
}

// ── Repara/rellena las columnas de vista en todas las filas ──
// (filas creadas antes de un cambio de columnas, o migradas a mano). Segura
// de correr varias veces: solo reescribe las fórmulas de VISTA_INSCRIPCIONES,
// nunca los datos capturados. Escribe por columna, no fila por fila.
function actualizarVistaInscripciones() {
  const hoja = obtenerHojaInscripciones(); // completa encabezados faltantes
  const cols = columnasInscripciones_(hoja);

  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) {
    SpreadsheetApp.getUi().alert('Encabezados actualizados. Aún no hay inscripciones para rellenar.');
    return;
  }
  Object.keys(VISTA_INSCRIPCIONES).forEach(h => {
    const formulas = [];
    for (let fila = 2; fila <= ultimaFila; fila++) formulas.push([formulaVista_(h, fila, cols)]);
    hoja.getRange(2, cols[h] + 1, formulas.length, 1).setFormulas(formulas);
  });
  SpreadsheetApp.getUi().alert('Vista actualizada en ' + (ultimaFila - 1) + ' inscripción(es).');
}

// ============================================================
// REORDENAR COLUMNAS DE INSCRIPCIONES (sep 2026, se corre UNA vez)
//
// Deja Inscripciones en el orden por bloques de ENCABEZADOS_INSCRIPCIONES.
// No mueve columnas en sitio: arma una hoja nueva, copia los datos por
// NOMBRE de encabezado, regenera las fórmulas, verifica que no se perdió
// ninguna fila y solo entonces intercambia las hojas. La hoja anterior queda
// intacta como "Inscripciones_respaldo_AAAAMMDD" (se puede borrar a mano
// cuando se confirme que todo está bien). Toma el mismo candado que doPost:
// ningún registro nuevo se cuela a la mitad de la copia.
// ============================================================
function reordenarColumnasInscripciones() {
  const ui = SpreadsheetApp.getUi();
  const resultado = reordenarColumnasInscripciones_();
  ui.alert(resultado.mensaje);
}

function reordenarColumnasInscripciones_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, mensaje: 'Hay un registro en curso. Intenta de nuevo en unos segundos.' };
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const vieja = ss.getSheetByName(HOJA_INSCRIPCIONES);
    if (!vieja) return { ok: false, mensaje: 'No existe la hoja "' + HOJA_INSCRIPCIONES + '".' };

    const datos = vieja.getDataRange().getValues();
    const encabezados = datos[0].map(h => String(h).trim());
    const colsViejas = indicesPorEncabezado_(encabezados);

    if (JSON.stringify(encabezados.filter(Boolean)) === JSON.stringify(ENCABEZADOS_INSCRIPCIONES)) {
      return { ok: true, mensaje: 'Inscripciones ya está en el orden nuevo. No se cambió nada.' };
    }
    const faltanBase = ['Folio', 'Fecha_registro', 'RFC_Docente', 'ID_Curso'].filter(h => !(h in colsViejas));
    if (faltanBase.length) {
      return { ok: false, mensaje: 'No se reordenó: faltan columnas base (' + faltanBase.join(', ') + ').' };
    }

    // Filas con al menos un dato capturado (las de vista son fórmulas).
    const columnasDatos = ENCABEZADOS_INSCRIPCIONES.filter(h => !(h in VISTA_INSCRIPCIONES) && h in colsViejas);
    const indicesFilas = [];
    for (let i = 1; i < datos.length; i++) {
      if (columnasDatos.some(h => String(datos[i][colsViejas[h]]).trim() !== '')) indicesFilas.push(i);
    }
    const n = indicesFilas.length;

    const nombreTemporal = HOJA_INSCRIPCIONES + '_nueva';
    const previa = ss.getSheetByName(nombreTemporal);
    if (previa) ss.deleteSheet(previa); // de un intento anterior interrumpido
    const nueva = ss.insertSheet(nombreTemporal, vieja.getIndex());
    const colsNuevas = indicesPorEncabezado_(ENCABEZADOS_INSCRIPCIONES);
    const anchoNuevo = ENCABEZADOS_INSCRIPCIONES.length;

    if (nueva.getMaxColumns() < anchoNuevo) nueva.insertColumnsAfter(nueva.getMaxColumns(), anchoNuevo - nueva.getMaxColumns());
    if (nueva.getMaxRows() < n + 1) nueva.insertRowsAfter(nueva.getMaxRows(), n + 1 - nueva.getMaxRows());
    nueva.getRange(1, 1, 1, anchoNuevo).setValues([ENCABEZADOS_INSCRIPCIONES]);
    darFormatoHojaInscripciones_(nueva);

    if (n > 0) {
      // Datos capturados: columna por columna, conservando el formato de
      // número de la hoja vieja (fechas) antes de escribir los valores.
      ENCABEZADOS_INSCRIPCIONES.forEach(h => {
        if (h in VISTA_INSCRIPCIONES || !(h in colsViejas)) return;
        const destino = nueva.getRange(2, colsNuevas[h] + 1, n, 1);
        destino.setValues(indicesFilas.map(i => [datos[i][colsViejas[h]]]));
      });
      // Fórmulas de vista, regeneradas según las columnas nuevas.
      Object.keys(VISTA_INSCRIPCIONES).forEach(h => {
        const formulas = [];
        for (let k = 0; k < n; k++) formulas.push([formulaVista_(h, k + 2, colsNuevas)]);
        nueva.getRange(2, colsNuevas[h] + 1, n, 1).setFormulas(formulas);
      });
    }
    SpreadsheetApp.flush();

    // Verificación antes de intercambiar: mismas filas, mismo folio/RFC/curso.
    const copia = n > 0 ? nueva.getRange(2, 1, n, anchoNuevo).getValues() : [];
    const discrepancias = indicesFilas.filter((i, k) =>
      ['Folio', 'RFC_Docente', 'ID_Curso'].some(h =>
        String(copia[k][colsNuevas[h]]) !== String(datos[i][colsViejas[h]])));
    if (nueva.getLastRow() - 1 !== n || discrepancias.length) {
      ss.deleteSheet(nueva);
      return { ok: false, mensaje: 'No se reordenó: la copia no coincide con el original (' +
        (nueva.getLastRow() - 1) + ' vs ' + n + ' filas, ' + discrepancias.length + ' discrepancias). La hoja original no se tocó.' };
    }

    let nombreRespaldo = HOJA_INSCRIPCIONES + '_respaldo_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd');
    if (ss.getSheetByName(nombreRespaldo)) {
      nombreRespaldo += '_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'HHmm');
    }
    vieja.setName(nombreRespaldo);
    nueva.setName(HOJA_INSCRIPCIONES);
    vieja.setTabColor('#948A8E');
    ss.setActiveSheet(vieja);
    ss.moveActiveSheet(ss.getNumSheets());
    ss.setActiveSheet(nueva);

    return { ok: true, n: n, respaldo: nombreRespaldo,
      mensaje: 'Listo: ' + n + ' inscripción(es) en el orden nuevo. La hoja anterior quedó como "' + nombreRespaldo + '".' };
  } finally {
    lock.releaseLock();
  }
}

// ── Estilo estándar de encabezado (igual al resto del sitio) ──
function estilizarEncabezado(hoja, numCols) {
  hoja.getRange(1, 1, 1, numCols)
    .setFontWeight('bold')
    .setBackground('#56212f')
    .setFontColor('#F9F8F5');
  hoja.setFrozenRows(1);
}

// ── Generar folio único ──
function generarFolio(hoja) {
  const datos  = hoja.getDataRange().getValues();
  const colFolio = indicesPorEncabezado_(datos[0]).Folio;
  const prefix = 'OTDE-CAP-';
  const maxNum = datos.slice(1)
    .map(row => String(row[colFolio]))
    .filter(f => f.startsWith(prefix))
    .map(f => parseInt(f.replace(prefix, ''), 10) || 0)
    .reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(maxNum + 1).padStart(4, '0');
}

// ── Validar campos requeridos ──
function validarCampos(d) {
  const requeridos = ['rfc', 'nombre', 'correo', 'telefono', 'cct', 'escuela', 'funcion', 'id_curso'];
  for (const campo of requeridos) {
    if (!d[campo] || !String(d[campo]).trim()) {
      throw new Error('Campo requerido: ' + campo);
    }
  }
  if (!/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i.test(d.rfc.trim())) {
    throw new Error('RFC inválido: ' + d.rfc);
  }
  if (!/^\d{2}[A-Z]{3}\d{4}[A-Z]$/i.test(d.cct.trim())) {
    throw new Error('CCT inválida: ' + d.cct);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.correo.trim())) {
    throw new Error('Correo inválido: ' + d.correo);
  }
  if (!/^\d{10}$/.test(d.telefono.trim())) {
    throw new Error('Teléfono inválido: ' + d.telefono);
  }
}

// ── Formatear fecha para el catálogo (dd/MM/yyyy) ──
// Si valor no es una fecha real (ej. texto libre como "Por definir"), new
// Date(valor) da Invalid Date — Utilities.formatDate no lanza error en ese
// caso, silenciosamente formatea como época 0 ("31/12/1969"). Se detecta con
// isNaN antes de formatear para devolver el texto tal cual en vez de esa
// fecha falsa.
function formatearFecha(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (isNaN(fecha.getTime())) return String(valor);
  try {
    return Utilities.formatDate(fecha, 'America/Mexico_City', 'dd/MM/yyyy');
  } catch (e) {
    return String(valor);
  }
}

// ── Respuesta de texto plano (evita preflight CORS) ──
function textResponse(text) {
  return ContentService
    .createTextOutput(text)
    .setMimeType(ContentService.MimeType.TEXT);
}

// ── "Planchado": listas suaves + protección de solo aviso (hoja Cursos) ──
const FD_CATEGORIAS_VALIDAS = ['Webinar', 'Seminario', 'Conferencia', 'Curso autogestivo',
  'Acción formativa', 'Diplomado', 'Proyecto didáctico'];
const FD_MODALIDADES_VALIDAS = ['Virtual', 'Presencial', 'Híbrido'];
const FD_BOOLEANOS_VALIDOS = ['TRUE', 'FALSE'];

function fdAplicarValidacionListaSuave_(hoja, columna, valores) {
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(true).build();
  hoja.getRange(2, columna, 1000, 1).setDataValidation(regla);
}

function fdProtegerColumnaAutomatica_(hoja, columna) {
  const yaProtegida = hoja.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    const r = p.getRange();
    return r.getColumn() === columna && r.getRow() === 2;
  });
  if (yaProtegida) return;
  hoja.getRange(2, columna, 1000, 1).protect()
    .setWarningOnly(true)
    .setDescription('Columna automática — se llena sola, evita editarla a mano.');
}

function fdConfigurarValidacionYSemaforo() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_CURSOS);
  if (hoja) fdAplicarValidacionCursos_(hoja);
  try { SpreadsheetApp.getUi().alert('Validación aplicada en Cursos.'); } catch (err) {}
}

// Dropdowns, notas y protecciones de Cursos, por NOMBRE de columna (28 sep
// 2026: antes por número fijo — reordenar la hoja los dejaba en otra columna).
function fdAplicarValidacionCursos_(hoja) {
  obtenerHojaCursos(); // asegura que existan todos los encabezados
  const col = nombre => colCursos_(hoja, nombre);
  fdAplicarValidacionListaSuave_(hoja, col('Categoria'), FD_CATEGORIAS_VALIDAS);
  fdAplicarValidacionListaSuave_(hoja, col('Modalidad'), FD_MODALIDADES_VALIDAS);
  ['Registro_previo_requerido', 'Cupo_agotado', 'Valida_USICAMM', 'Valida_PROEEB', 'Activo', 'Ocultar_historial']
    .forEach(h => fdAplicarValidacionListaSuave_(hoja, col(h), FD_BOOLEANOS_VALIDOS));
  // Nota al pasar el cursor por el encabezado — sobre todo las fechas
  // (inscripción vs. desarrollo del curso), la confusión más común al capturar.
  const notas = {
    Fecha_inicio: 'Día en que EMPIEZA el curso (desarrollo, no inscripción).',
    Fecha_fin: 'Día en que TERMINA el curso. Al día siguiente pasa a "Cursos anteriores".',
    Hora_inicio: 'Hora de inicio (ej. 16:00). Con ella salen el aviso de 30 min y el calendario con hora.',
    Hora_fin: 'Opcional. Hora de término. Vacía = el calendario agenda 1 h 30 min.',
    Fechas_sesion: 'Opcional. Días de sesión separados por coma, ej. 7/10, 14/10, 21/10. El calendario agenda cada una con su aviso.',
    Visible_desde: 'Opcional. Día en que el curso aparece en el catálogo (apertura de inscripción).',
    Fecha_limite_inscripcion: 'Último día para inscribirse. Vacía = se usa Fecha_inicio.',
    Hora_limite_inscripcion: 'Opcional. Hora exacta de cierre ese día (ej. 14:00). Vacía = cierra a las 23:59.',
    Cupo_agotado: 'TRUE = ya no hay lugares: el curso sigue visible con "Cupo agotado" y no acepta registros nuevos (salvo quien ya se inscribió en la plataforma externa y viene a avisar).',
    Ocultar_historial: 'TRUE = no mostrar en "Cursos anteriores" (cursos de prueba o cancelados). Activo=FALSE ya NO lo quita del historial.'
  };
  Object.keys(notas).forEach(h => hoja.getRange(1, col(h)).setNote(notas[h]));
  ['ID_Curso', 'Recordatorio_inicio_enviado', 'Recordatorio_medio_enviado', 'Recordatorio_webinar_enviado']
    .forEach(h => fdProtegerColumnaAutomatica_(hoja, col(h)));
  // Encabezados de las columnas automáticas en gris: "no se llenan a mano".
  ['Recordatorio_inicio_enviado', 'Recordatorio_medio_enviado', 'Recordatorio_webinar_enviado']
    .forEach(h => hoja.getRange(1, col(h)).setBackground('#948A8E'));
}

// ============================================================
// REORDENAR COLUMNAS DE CURSOS (28 sep 2026, se corre UNA vez)
//
// Deja Cursos en el orden por bloques de ENCABEZADOS_CURSOS (el orden en
// que se llena un curso) y quita las columnas retiradas. A diferencia de
// Inscripciones, se hace EN LA MISMA HOJA moviendo columnas completas: así
// se conservan formatos, dropdowns, notas y la hoja sigue siendo la misma
// (las fórmulas de Inscripciones apuntan a Cursos!A:C, que no se mueve).
// Antes de tocar nada deja una copia completa "Cursos_respaldo_AAAAMMDD".
// Columnas desconocidas (agregadas a mano) se quedan, al final.
// ============================================================
const COLUMNAS_CURSOS_RETIRADAS = ['Requiere_codigo_asistencia', 'Codigo_asistencia', 'Visible_hasta'];

function reordenarColumnasCursos() {
  SpreadsheetApp.getUi().alert(reordenarColumnasCursos_().mensaje);
}

function reordenarColumnasCursos_() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return { ok: false, mensaje: 'Hay un registro en curso. Intenta de nuevo en unos segundos.' };
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = obtenerHojaCursos(); // agrega encabezados faltantes (ej. Fechas_sesion)
    SpreadsheetApp.flush();
    const antes = hoja.getDataRange().getValues();
    let enc = antes[0].map(h => String(h).trim());

    const yaOrdenada = ENCABEZADOS_CURSOS.every((h, k) => enc[k] === h) &&
      !COLUMNAS_CURSOS_RETIRADAS.some(h => enc.indexOf(h) !== -1);
    if (yaOrdenada) return { ok: true, mensaje: 'Cursos ya está en el orden nuevo. No se cambió nada.' };

    // Respaldo completo antes de mover nada.
    let nombreRespaldo = HOJA_CURSOS + '_respaldo_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyyMMdd');
    if (ss.getSheetByName(nombreRespaldo)) nombreRespaldo += '_' + Utilities.formatDate(new Date(), 'America/Mexico_City', 'HHmm');
    const respaldo = hoja.copyTo(ss).setName(nombreRespaldo);
    respaldo.setTabColor('#948A8E');
    ss.setActiveSheet(respaldo);
    ss.moveActiveSheet(ss.getNumSheets());

    // Mover cada columna a su lugar, de izquierda a derecha.
    ENCABEZADOS_CURSOS.forEach((h, k) => {
      const i = enc.indexOf(h);
      if (i === -1 || i === k) return;
      hoja.moveColumns(hoja.getRange(1, i + 1), k + 1);
      enc.splice(k, 0, enc.splice(i, 1)[0]);
    });
    // Quitar las retiradas (de derecha a izquierda para no correr índices).
    COLUMNAS_CURSOS_RETIRADAS.map(h => enc.indexOf(h)).filter(i => i !== -1).sort((a, b) => b - a)
      .forEach(i => { hoja.deleteColumn(i + 1); enc.splice(i, 1); });
    SpreadsheetApp.flush();

    // Verificación: mismas filas y, columna por columna, los mismos valores.
    const despues = hoja.getDataRange().getValues();
    const idxAntes = indicesPorEncabezado_(antes[0].map(h => String(h).trim()));
    const idxDespues = indicesPorEncabezado_(despues[0].map(h => String(h).trim()));
    const valor = v => (v instanceof Date ? v.getTime() : String(v));
    const diferencias = [];
    if (despues.length !== antes.length) diferencias.push('filas ' + antes.length + ' → ' + despues.length);
    ENCABEZADOS_CURSOS.forEach(h => {
      if (!(h in idxAntes)) return;
      if (!(h in idxDespues)) { diferencias.push('falta ' + h); return; }
      for (let r = 1; r < antes.length; r++) {
        if (valor(antes[r][idxAntes[h]]) !== valor((despues[r] || [])[idxDespues[h]])) { diferencias.push(h + ' fila ' + (r + 1)); break; }
      }
    });
    if (diferencias.length) {
      return { ok: false, mensaje: 'ATENCIÓN: la verificación encontró diferencias (' + diferencias.slice(0, 5).join('; ') +
        '). Los datos originales están completos en la hoja "' + nombreRespaldo + '". No captures nada y avisa antes de continuar.' };
    }

    fdAplicarValidacionCursos_(hoja);
    ss.setActiveSheet(hoja);
    const extras = enc.slice(ENCABEZADOS_CURSOS.length).filter(Boolean);
    return { ok: true, respaldo: nombreRespaldo,
      mensaje: 'Listo: Cursos quedó en el orden nuevo (' + (antes.length - 1) + ' curso(s) verificados columna por columna). ' +
        'Se quitaron: ' + COLUMNAS_CURSOS_RETIRADAS.join(', ') + '. Respaldo: "' + nombreRespaldo + '".' +
        (extras.length ? ' Columnas que no reconocí y dejé al final: ' + extras.join(', ') + '.' : '') };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// MENÚ Y HERRAMIENTAS ADMINISTRATIVAS (uso manual desde Sheets)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Formación')
    .addItem('Generar ID de cursos faltantes', 'generarIdsCursosFaltantes')
    .addItem('Generar estadísticas', 'generarEstadisticas')
    .addItem('Actualizar vista de Inscripciones', 'actualizarVistaInscripciones')
    .addItem('Reordenar columnas de Cursos', 'reordenarColumnasCursos')
    .addItem('Reordenar columnas de Inscripciones', 'reordenarColumnasInscripciones')
    .addItem('Aplicar validación en Cursos', 'fdConfigurarValidacionYSemaforo')
    .addSeparator()
    .addItem('Instalar recordatorios automáticos', 'instalarRecordatoriosAutomaticos')
    .addItem('Desinstalar recordatorios automáticos', 'desinstalarRecordatoriosAutomaticos')
    .addSeparator()
    .addItem('Enviar recordatorios a pendientes ahora', 'fdMenuEnviarPendientesAhora')
    .addItem('Enviar recordatorio de prueba de un folio', 'fdMenuRecordatorioPruebaFolio')
    .addItem('Enviar recordatorio de prueba de constancia (folio)', 'fdMenuRecordatorioConstanciaPruebaFolio')
    .addItem('Activar / desactivar modo de prueba de correo', 'fdMenuModoPrueba')
    .addSeparator()
    .addItem('Instalar auto-generación de ID de curso', 'instalarTriggerAutoId')
    .addItem('Desinstalar auto-generación de ID de curso', 'desinstalarTriggerAutoId')
    .addToUi();
}

// Autocompleta ID_Curso en filas nuevas de la hoja Cursos que
// tengan Categoria pero no ID_Curso todavía. Envoltura del menú: corre la
// lógica compartida y avisa cuántos generó.
function generarIdsCursosFaltantes() {
  const generados = generarIdsCursosFaltantes_();
  SpreadsheetApp.getUi().alert(generados + ' ID(s) de curso generado(s).');
}

// ── Lógica compartida (sin UI) entre el menú de arriba y onEditCursos() de
// abajo — separada para que el disparador automático no muestre un alert
// en cada edición. ──
function generarIdsCursosFaltantes_() {
  const hoja  = obtenerHojaCursos();
  const datos = valoresCursos_(hoja);
  let generados = 0;

  for (let i = 1; i < datos.length; i++) {
    const idActual   = String(datos[i][CUR.ID_Curso]).trim();
    const categoria  = String(datos[i][CUR.Categoria]).trim();
    if (idActual || !categoria) continue;

    const prefijo = PREFIJOS_CATEGORIA[categoria] || 'GEN';
    const maxNum = datos
      .map(r => String(r[CUR.ID_Curso]))
      .filter(id => id.startsWith(prefijo + '-' + CICLO_ESCOLAR + '-'))
      .map(id => parseInt(id.split('-').pop(), 10) || 0)
      .reduce((a, b) => Math.max(a, b), 0);

    const nuevoId = prefijo + '-' + CICLO_ESCOLAR + '-' + String(maxNum + 1).padStart(3, '0');
    hoja.getRange(i + 1, colCursos_(hoja, 'ID_Curso')).setValue(nuevoId);
    datos[i][CUR.ID_Curso] = nuevoId; // para que el siguiente cálculo de maxNum ya lo considere
    generados++;
  }

  return generados;
}

// ── Auto-generar ID_Curso al escribir la Categoria (agosto 2026) ──
// Hoy, si Jorge da de alta un curso a mano en "Cursos" y olvida correr
// "Generar ID de cursos faltantes" del menú antes de marcarlo Activo, el
// curso sale en el catálogo sin ID_Curso y cualquier inscripción a él
// queda con esa columna vacía en "Inscripciones" — silencioso hasta que
// alguien lo nota. Instalable, mismo patrón que manOnEditCierre() en
// mantenimiento.gs: no usa e.value (se pierde en pegados/arrastres de
// varias celdas), revisa si la columna Categoria cae dentro del rango
// editado sin importar su tamaño, y reutiliza generarIdsCursosFaltantes_()
// tal cual — ambos caminos quedan sincronizados por construcción.
function onEditCursos(e) {
  if (!e || !e.range) return;
  if (e.range.getSheet().getName() !== HOJA_CURSOS) return;

  const colCategoria = colCursos_(e.range.getSheet(), 'Categoria');
  const colInicio = e.range.getColumn();
  const colFin = colInicio + e.range.getNumColumns() - 1;
  if (colCategoria < colInicio || colCategoria > colFin) return;

  generarIdsCursosFaltantes_();
}

function instalarTriggerAutoId() {
  desinstalarTriggerAutoId();
  ScriptApp.newTrigger('onEditCursos')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();
  try { SpreadsheetApp.getUi().alert('Auto-generación de ID de curso instalada.'); } catch (err) {}
}

function desinstalarTriggerAutoId() {
  const quitados = ScriptApp.getProjectTriggers().filter(function (t) {
    return t.getHandlerFunction() === 'onEditCursos';
  });
  quitados.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  if (quitados.length) {
    try { SpreadsheetApp.getUi().alert('Auto-generación de ID de curso desinstalada.'); } catch (err) {}
  }
}

// Genera una hoja resumen con conteos por curso, sector, municipio y estado.
function generarEstadisticas() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hojaInsc = obtenerHojaInscripciones();
  const datosInsc = hojaInsc.getDataRange().getValues();
  const colsInsc = indicesPorEncabezado_(datosInsc[0]);
  const inscripciones = datosInsc.slice(1).filter(row => String(row[colsInsc.Folio]).trim());

  if (!inscripciones.length) {
    SpreadsheetApp.getUi().alert('No hay inscripciones aún.');
    return;
  }

  const docentesPorRfc = {};
  obtenerHojaDocentes().getDataRange().getValues().slice(1).forEach(r => {
    docentesPorRfc[String(r[0]).trim().toUpperCase()] = r;
  });
  const cursosPorId = {};
  valoresCursos_(obtenerHojaCursos()).slice(1).forEach(r => {
    cursosPorId[String(r[CUR.ID_Curso]).trim().toUpperCase()] = r;
  });

  const porCurso = {}, porSector = {}, porMunicipio = {}, porRegistroExterno = {};

  inscripciones.forEach(row => {
    const rfc     = String(row[colsInsc.RFC_Docente]).trim().toUpperCase();
    const idCurso = String(row[colsInsc.ID_Curso]).trim().toUpperCase();
    const registroExterno = String(row[colsInsc.Registro_externo] || '').trim() || 'Sin dato (registro anterior)';
    porRegistroExterno[registroExterno] = (porRegistroExterno[registroExterno] || 0) + 1;
    const doc     = docentesPorRfc[rfc];
    const cur     = cursosPorId[idCurso];

    const nombreCurso = cur ? String(cur[CUR.Nombre]) : idCurso;
    const sector       = doc ? String(doc[6]) : '';
    const municipio    = doc ? String(doc[8]) : '';

    porCurso[nombreCurso] = (porCurso[nombreCurso] || 0) + 1;
    if (sector)    porSector['Sector ' + sector] = (porSector['Sector ' + sector] || 0) + 1;
    if (municipio) porMunicipio[municipio] = (porMunicipio[municipio] || 0) + 1;
  });

  let resumen = ss.getSheetByName('Estadisticas_Formacion');
  if (resumen) ss.deleteSheet(resumen);
  resumen = ss.insertSheet('Estadisticas_Formacion');

  const ahora = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yyyy HH:mm');
  resumen.appendRow(['ESTADÍSTICAS — Centro de Formación Docente OTDE']);
  resumen.appendRow(['Generado:', ahora]);
  resumen.appendRow(['Total de inscripciones:', inscripciones.length]);
  resumen.appendRow(['']);

  resumen.appendRow(['POR CURSO', 'Inscripciones']);
  Object.entries(porCurso).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow(['']);
  resumen.appendRow(['POR SECTOR', 'Inscripciones']);
  Object.entries(porSector).sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.appendRow(['']);
  resumen.appendRow(['POR MUNICIPIO', 'Inscripciones']);
  Object.entries(porMunicipio).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));


  resumen.appendRow(['']);
  resumen.appendRow(['POR REGISTRO EN PLATAFORMA EXTERNA', 'Inscripciones']);
  Object.entries(porRegistroExterno).sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => resumen.appendRow([k, v]));

  resumen.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  resumen.getRange(5, 1, 1, 2).setFontWeight('bold').setBackground('#9F2241').setFontColor('#fff');
  resumen.setColumnWidth(1, 320);
  resumen.setColumnWidth(2, 120);

  SpreadsheetApp.getUi().alert('Estadísticas generadas en la hoja "Estadisticas_Formacion".');
}


// ============================================================
// RECORDATORIOS AUTOMÁTICOS POR CORREO
//
// Tres tipos, cada uno se dispara solo cuando aplica — no hay que marcar
// nada por curso, se calculan a partir de sus propias fechas:
//
//   1. "Empieza en 1 día"    — cursos de varios días (Fecha_fin > Fecha_inicio)
//      SIEMPRE, más los de un solo día que no tengan Hora_inicio capturada
//      (fallback, para que no se queden sin ningún aviso). Se evalúa con un
//      rango (diasParaInicio <= 1, sin piso) y no con igualdad exacta: si la
//      evaluación de hoy llega tarde (activador no instalado, redeploy a
//      media mañana, etc.) y el curso ya inició, reintenta en cada corrida
//      subsecuente con el mensaje ajustado a "ya inició" en vez de marcarse
//      enviado sin haber mandado nada — solo se resigna cuando el curso ya
//      terminó por completo (hoy > Fecha_fin). Ver docs/QA-NOTES.md #8.
//   2. "Vas a la mitad"      — solo cursos "largos" (Fecha_fin - Fecha_inicio
//      >= DIAS_MINIMOS_CURSO_LARGO), el día que se cruza el punto medio.
//   3. "Empieza en 30 min"   — cualquier curso (de uno o varios días) que
//      tenga Hora_inicio capturada, a partir de MINUTOS_ANTES_INICIO_MAX
//      minutos antes — es ADICIONAL al aviso 1 cuando el curso dura varios
//      días (dos avisos independientes), y es el ÚNICO aviso cuando el
//      curso es de un solo día con hora capturada. Mismo criterio de
//      reintento que el aviso 1: si se evalúa tarde y el curso ya comenzó
//      pero no ha terminado, manda un aviso de "ya comenzó" en vez de
//      perder el aviso en silencio.
//
// Se manda UN solo correo por curso (destinatarios en copia oculta), no uno
// por docente — la cuota diaria de MailApp la comparten TODOS los Apps
// Script de la cuenta de Google, no es exclusiva de este proyecto, así que
// hay que cuidarla. Antes de mandar cada lote se revisa cuánta cuota queda;
// si no alcanza, ese aviso se salta HOY y se reintenta solo mañana (la
// bandera "enviado" no se marca hasta que el correo sale de verdad).
//
// Requiere correr UNA vez el menú "Instalar recordatorios automáticos" para
// dar de alta los disparadores (diario a las 9am + cada 15 minutos). Sin
// eso, estas funciones existen pero nadie las llama. Si ya estaban
// instalados con el intervalo viejo (cada hora), hay que volver a correr
// ese menú después de pegar esta versión — instalarRecordatoriosAutomaticos()
// ahora borra y recrea los activadores en cada corrida, así que el cambio
// de intervalo sí se aplica.
// ============================================================

const DIAS_ANTES_RECORDATORIO_INICIO = 1;
const DIAS_MINIMOS_CURSO_LARGO = 30;
const MINUTOS_ANTES_INICIO_MAX = 40;

// Si alguien le da "Responder" a un recordatorio, que llegue aquí (cuenta
// institucional en Microsoft/Exchange) y no al Gmail que en realidad manda
// el correo (Session.getEffectiveUser().getEmail()). Mismo patrón de
// replyTo ya usado en mantenimiento.gs / asesorias.gs.
const CORREO_REPLY_TO_INSTITUCIONAL = 'otde.nezahualcoyotl@dee.edu.mx';

// Redes reales de OTDE NEZA — mismas URLs que el footer del sitio
// (index.html, contacto.html, etc.) y el canal de WhatsApp de OTDE.
const REDES_SOCIALES = {
  facebook: 'https://www.facebook.com/SubNeza',
  youtube: 'https://www.youtube.com/channel/UCvDb2DPSJxFyhH3bCPd5D2Q',
  whatsapp: 'https://whatsapp.com/channel/0029VbBDCG572WTz3WCjRS11'
};

// Índices dentro de las filas de valoresCursos_() (orden de ENCABEZADOS_CURSOS).
const COL_HORA_INICIO = CUR.Hora_inicio;
const COL_RECORDATORIO_INICIO = CUR.Recordatorio_inicio_enviado;
const COL_RECORDATORIO_MEDIO = CUR.Recordatorio_medio_enviado;
const COL_RECORDATORIO_WEBINAR = CUR.Recordatorio_webinar_enviado;
const COL_LIGA_TUTORIAL_CONSTANCIA = CUR.Liga_tutorial_constancia;
const COL_HORA_FIN = CUR.Hora_fin;
const COL_HORA_LIMITE_INSCRIPCION = CUR.Hora_limite_inscripcion;
const COL_CUPO_AGOTADO = CUR.Cupo_agotado;
const COL_OCULTAR_HISTORIAL = CUR.Ocultar_historial;
const COL_FECHAS_SESION = CUR.Fechas_sesion;

// ── Combina la fecha (Y/M/D) de una celda con la hora (H:M) de otra ──
function combinarFechaHora(fecha, hora) {
  const f = new Date(fecha);
  const h = new Date(hora);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate(), h.getHours(), h.getMinutes());
}

// ── Correos de todos los docentes con inscripción activa a un curso ──
function obtenerCorreosInscritos(idCurso) {
  const datosInsc = obtenerHojaInscripciones().getDataRange().getValues();
  const cols = indicesPorEncabezado_(datosInsc[0]);
  const inscripciones = datosInsc.slice(1);
  const docentesPorRfc = {};
  obtenerHojaDocentes().getDataRange().getValues().slice(1).forEach(r => {
    docentesPorRfc[String(r[0]).trim().toUpperCase()] = r;
  });

  const correos = new Set();
  inscripciones.forEach(row => {
    if (String(row[cols.ID_Curso]).trim().toUpperCase() !== idCurso) return;
    const rfc = String(row[cols.RFC_Docente]).trim().toUpperCase();
    const doc = docentesPorRfc[rfc];
    const correo = doc ? String(doc[2]).trim() : ''; // Docentes!Correo
    if (correo) correos.add(correo);
  });
  return [...correos];
}

// ── Modo de prueba: redirige el BCC de los recordatorios a un solo correo,
// para probar el flujo completo sin avisarle a docentes reales. Actívalo
// corriendo fdActivarModoPrueba('tu@correo.com') una vez desde el editor de
// Apps Script; desactívalo con fdDesactivarModoPrueba(). No requiere
// redeploy — es una Script Property, se lee en cada envío. ──
function fdActivarModoPrueba(correo) {
  PropertiesService.getScriptProperties().setProperty('MODO_PRUEBA_CORREO', correo);
}

function fdDesactivarModoPrueba() {
  PropertiesService.getScriptProperties().deleteProperty('MODO_PRUEBA_CORREO');
}

// ── Envío en lote (BCC). Trocea en varios correos si hay más destinatarios
// que el límite por mensaje de Gmail (bug real, 22 sep 2026: con 119
// inscritos en un solo BCC, MailApp.sendEmail reventaba "Límite Excedido:
// Destinatarios de correo electrónico por mensaje" y el recordatorio nunca
// salía — ver docs/QA-NOTES.md #38).
//
// Envío parcial (docs/QA-NOTES.md #40): la cuota diaria de MailApp se cuenta
// por destinatario y la comparten TODOS los Apps Script de la cuenta, así que
// es normal que un aviso grande no quepa completo en un día. Con
// `claveSeguimiento`, cada destinatario que ya recibió ese aviso queda
// anotado en Script Properties (huella corta del correo, no el correo) y las
// corridas siguientes solo mandan a los que faltan — sin duplicar. Devuelve
// true solo cuando TODOS los destinatarios válidos ya lo recibieron; hasta
// entonces el llamador no debe marcar la columna "enviado". ──
const MAX_DESTINATARIOS_POR_CORREO = 45; // margen bajo el límite real de Gmail (50, incluyendo "to")
const PREFIJO_SEGUIMIENTO_LOTE = 'LOTE_ENVIADOS_';
// Una Script Property admite ~9 KB; con margen caben ~630 destinatarios por
// aviso. Si un aviso no cabe, se deja de mandar ese aviso (nunca se manda un
// lote sin poder anotarlo — se reenviaría en cada corrida) y se avisa a Jorge.
const MAX_BYTES_SEGUIMIENTO_LOTE = 8500;

function trocearArreglo_(arr, tamano) {
  const lotes = [];
  for (let i = 0; i < arr.length; i += tamano) lotes.push(arr.slice(i, i + tamano));
  return lotes;
}

// ── Validación mínima de formato — no garantiza que la cuenta exista, solo
// filtra direcciones claramente mal capturadas antes de que envenenen un
// lote completo (bug real, 22 sep 2026: un solo correo mal escrito tumbaba
// el lote entero de MailApp.sendEmail — "Invalid email"). El dominio no puede
// terminar ni empezar en punto ni tener ".." — caso real:
// `vero_130171@hotmail.com.` pasaba la versión anterior (docs/QA-NOTES.md #40). ──
function esEmailValido_(email) {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(String(email).trim());
}

// ── Huella corta de un correo para el seguimiento de envío parcial — cabe
// holgada en el límite de 9 KB por Script Property aun con cientos de
// inscritos, y no deja correos en claro en las propiedades del proyecto. ──
function huellaCorreo_(correo) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(correo).trim().toLowerCase());
  return Utilities.base64Encode(bytes).slice(0, 10);
}

function leerSeguimientoLote_(clave) {
  const raw = PropertiesService.getScriptProperties().getProperty(PREFIJO_SEGUIMIENTO_LOTE + clave);
  return raw ? JSON.parse(raw) : [];
}

// ── Se llama cuando el aviso ya no se va a volver a intentar (enviado
// completo, o el curso ya terminó) — no deja propiedades huérfanas. ──
function limpiarSeguimientoLote_(clave) {
  if (clave) PropertiesService.getScriptProperties().deleteProperty(PREFIJO_SEGUIMIENTO_LOTE + clave);
}

// ── Aviso interno a Jorge cuando un aviso masivo se cortó porque su lista
// de seguimiento ya no cabe (curso de más de ~630 inscritos). Directo con
// MailApp, fuera de la reserva: es un solo destinatario. ──
function avisarSeguimientoLleno_(asunto, clave, enviados, total) {
  const msg = 'El aviso "' + asunto + '" (' + clave + ') se detuvo tras llegar a ' + enviados +
    ' de ' + total + ' destinatarios: la lista de seguimiento ya no cabe en Script Properties. ' +
    'Los restantes no lo recibirán automáticamente — mándalo a mano o guarda el seguimiento en una hoja.';
  console.error('enviarCorreoLote: ' + msg);
  try {
    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: 'ALERTA: aviso de Formación Docente incompleto (' + clave + ')',
      body: msg
    });
  } catch (err) {
    console.error('avisarSeguimientoLleno_: no se pudo avisar: ' + err.message);
  }
}

// ── Orden de envío (28 sep 2026): como la cuota solo alcanza para una parte,
// el orden decide a quién le llega. Antes era el orden de la hoja, así que
// siempre recibían los mismos (los primeros inscritos) y los últimos nunca.
// Ahora: sorteo en cada corrida y, primero, quienes NO recibieron el aviso
// anterior del mismo curso (`huellasYaAvisados`, p. ej. el 30 min prioriza a
// quien no recibió "empieza mañana"). Si sobra cupo, sigue con los demás. ──
function ordenarParaEnvio_(correos, huellasYaAvisados) {
  const revueltos = correos.slice();
  for (let i = revueltos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = revueltos[i]; revueltos[i] = revueltos[j]; revueltos[j] = t;
  }
  if (!huellasYaAvisados.length) return revueltos;
  const avisados = revueltos.filter(function(c) { return huellasYaAvisados.indexOf(huellaCorreo_(c)) !== -1; });
  return revueltos.filter(function(c) { return huellasYaAvisados.indexOf(huellaCorreo_(c)) === -1; }).concat(avisados);
}

function enviarCorreoLote(destinatarios, asunto, cuerpoHtml, claveSeguimiento, esAvisoUrgente, clavePrioridad) {
  const reserva = reservaCuota_(!!esAvisoUrgente);
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  const enModoPrueba = !!correoPrueba;

  const validos = destinatarios.filter(esEmailValido_);
  const invalidos = destinatarios.filter(function(c) { return !esEmailValido_(c); });
  if (invalidos.length) {
    console.error('enviarCorreoLote: ' + invalidos.length + ' correo(s) con formato inválido, se omiten: ' + invalidos.join(', '));
  }
  if (!validos.length) return false;

  // En modo de prueba todo va a un solo correo (el de prueba) — no hay nada
  // que trocear ni que anotar en el seguimiento (nadie real lo recibió).
  const usaSeguimiento = !!claveSeguimiento && !enModoPrueba;
  const yaEnviados = usaSeguimiento ? leerSeguimientoLote_(claveSeguimiento) : [];
  const pendientes = ordenarParaEnvio_(usaSeguimiento
    ? validos.filter(function(c) { return yaEnviados.indexOf(huellaCorreo_(c)) === -1; })
    : validos, clavePrioridad ? leerSeguimientoLote_(clavePrioridad) : []);
  if (!pendientes.length) {
    limpiarSeguimientoLote_(claveSeguimiento);
    return true;
  }
  const lotes = enModoPrueba ? [pendientes] : trocearArreglo_(pendientes, MAX_DESTINATARIOS_POR_CORREO);

  // Cada lote se manda aislado: si uno falla (ej. una dirección que pasó el
  // formato pero el servidor igual rechaza), los demás lotes no se pierden.
  let fallidos = 0;
  let seguimientoLleno = false;
  lotes.forEach(function(loteCompleto) {
    if (seguimientoLleno) return;
    // Reserva para los demás sistemas de OTDE (la cuota diaria de MailApp es
    // compartida y se cuenta por destinatario): cada lote cuesta lote.length + 1
    // (el "to" a la propia cuenta). Si no alcanza el lote completo, se recorta
    // a lo que quede (28 sep 2026: antes se saltaba y se desperdiciaba el
    // sobrante); si no alcanza ni para un destinatario, se salta.
    const disponible = MailApp.getRemainingDailyQuota() - reserva - 1;
    const lote = enModoPrueba ? loteCompleto : loteCompleto.slice(0, Math.max(0, disponible));
    if (disponible < 1 || lote.length < loteCompleto.length) fallidos++;
    if (disponible < 1) {
      console.log('Cuota insuficiente (reserva ' + reserva + ') para un lote de ' + loteCompleto.length + ': ' + asunto);
      return;
    }
    const huellasLote = usaSeguimiento ? lote.map(huellaCorreo_) : [];
    if (usaSeguimiento &&
        JSON.stringify(yaEnviados.concat(huellasLote)).length > MAX_BYTES_SEGUIMIENTO_LOTE) {
      seguimientoLleno = true;
      return;
    }
    try {
      MailApp.sendEmail({
        to: Session.getEffectiveUser().getEmail(),
        bcc: enModoPrueba ? correoPrueba : lote.join(','),
        replyTo: CORREO_REPLY_TO_INSTITUCIONAL,
        subject: enModoPrueba ? '[PRUEBA] ' + asunto : asunto,
        htmlBody: enModoPrueba
          ? '<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;' +
            'padding:10px 16px;margin-bottom:16px;font-family:Arial,Helvetica,sans-serif;' +
            'font-size:13px;color:#555;"><strong>Modo de prueba activo</strong> — destino real (CCO): ' +
            destinatarios.join(', ') + '</div>' + cuerpoHtml
          : cuerpoHtml,
        name: 'OTDE NEZA · Centro de Formación Docente'
      });
      if (usaSeguimiento) {
        huellasLote.forEach(function(h) { yaEnviados.push(h); });
        PropertiesService.getScriptProperties().setProperty(
          PREFIJO_SEGUIMIENTO_LOTE + claveSeguimiento, JSON.stringify(yaEnviados));
      }
    } catch (err) {
      fallidos++;
      console.error('enviarCorreoLote: falló un lote de ' + lote.length + ' destinatario(s): ' + err.message);
    }
  });

  if (seguimientoLleno) {
    // Se da por concluido para que el llamador marque "enviado" y no se
    // reintente; los que faltaron se reportan a Jorge para atenderlos a mano.
    avisarSeguimientoLleno_(asunto, claveSeguimiento, yaEnviados.length, validos.length);
    limpiarSeguimientoLote_(claveSeguimiento);
    return true;
  }
  if (fallidos) {
    console.log('enviarCorreoLote: ' + fallidos + ' de ' + lotes.length + ' lote(s) pendientes — "' + asunto + '"');
    return false;
  }
  limpiarSeguimientoLote_(claveSeguimiento);
  return true;
}

// ── Plantilla HTML compartida por los 3 tipos de recordatorio ──
// Estilos 100% inline (tabla) porque los clientes de correo ignoran <style>
// en el <head> con frecuencia — misma paleta institucional de styles.css.
function construirCorreoHtml(opts) {
  const filaDetalle = opts.detalle
    ? '<tr><td style="padding:16px 32px 0 32px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9F8F5;border:1px solid #d6d1ca;border-radius:10px;">' +
          '<tr><td style="padding:16px 20px;font:14px/1.6 Arial,Helvetica,sans-serif;color:#3a3a3a;">' + opts.detalle + '</td></tr>' +
        '</table>' +
      '</td></tr>'
    : '';

  const filaLiga = opts.liga
    ? '<tr><td style="padding:20px 32px 0 32px;">' +
        '<a href="' + opts.liga + '" style="display:inline-block;background:#9F2241;color:#ffffff;text-decoration:none;font:bold 14px/1 Arial,Helvetica,sans-serif;padding:13px 26px;border-radius:8px;">' +
          (opts.textoLiga || 'Ir al curso') + ' &rarr;' +
        '</a>' +
      '</td></tr>'
    : '';

  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
    '<body style="margin:0;padding:0;background:#eae7e1;font-family:Arial,Helvetica,sans-serif;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eae7e1;padding:32px 16px;">' +
      '<tr><td align="center">' +
        '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">' +
          '<tr><td style="background:#9F2241;padding:28px 32px;">' +
            '<div style="font:bold 10px/1 Arial,Helvetica,sans-serif;letter-spacing:2px;color:#d6a87e;text-transform:uppercase;">Oficina de Tecnología para el Desarrollo Educativo | OTDE</div>' +
            '<div style="font:600 20px/1.3 Arial,Helvetica,sans-serif;color:#ffffff;margin-top:8px;">Centro de Formación Docente</div>' +
          '</td></tr>' +
          '<tr><td style="background:#977e5b;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>' +
          '<tr><td style="padding:28px 32px 0 32px;">' +
            '<div style="display:inline-block;background:#f4e9ec;color:#9F2241;font:bold 11px/1 Arial,Helvetica,sans-serif;letter-spacing:1px;text-transform:uppercase;padding:6px 12px;border-radius:20px;">' + opts.chip + '</div>' +
          '</td></tr>' +
          '<tr><td style="padding:14px 32px 0 32px;">' +
            '<div style="font:bold 22px/1.35 Arial,Helvetica,sans-serif;color:#1a1a1a;">' + opts.titulo + '</div>' +
          '</td></tr>' +
          '<tr><td style="padding:12px 32px 0 32px;">' +
            '<div style="font:15px/1.7 Arial,Helvetica,sans-serif;color:#3a3a3a;">' + opts.cuerpo + '</div>' +
          '</td></tr>' +
          filaDetalle +
          filaLiga +
          '<tr><td style="padding:28px 32px 0 32px;">' +
            '<div style="font:bold 11px/1 Arial,Helvetica,sans-serif;letter-spacing:1px;color:#977e5b;text-transform:uppercase;margin-bottom:12px;">Síguenos</div>' +
            '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
              '<td style="padding-right:10px;"><a href="' + REDES_SOCIALES.facebook + '" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#F9F8F5;border:1px solid #d6d1ca;color:#56212f;border-radius:50%;text-decoration:none;font:bold 14px/34px Arial,Helvetica,sans-serif;">f</a></td>' +
              '<td style="padding-right:10px;"><a href="' + REDES_SOCIALES.youtube + '" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#F9F8F5;border:1px solid #d6d1ca;color:#56212f;border-radius:50%;text-decoration:none;font:bold 11px/34px Arial,Helvetica,sans-serif;">YT</a></td>' +
              '<td><a href="' + REDES_SOCIALES.whatsapp + '" style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;background:#F9F8F5;border:1px solid #d6d1ca;color:#56212f;border-radius:50%;text-decoration:none;font:bold 11px/34px Arial,Helvetica,sans-serif;">WA</a></td>' +
            '</tr></table>' +
          '</td></tr>' +
          '<tr><td style="padding:24px 32px 0 32px;">' +
            '<div style="border-top:1px solid #e6e2da;padding-top:18px;">' +
              '<p style="margin:0 0 2px 0;font:bold 14px/1 Arial,Helvetica,sans-serif;color:#9F2241;">Mtro. Jorge Alberto Bonilla Torres</p>' +
              '<p style="margin:0 0 2px 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#555555;">Jefe de la Oficina de Tecnología para el Desarrollo Educativo | <strong>OTDE</strong></p>' +
              '<p style="margin:0 0 12px 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#666666;">Subdirección de Educación Primaria en la Región de Nezahualcóyotl | SEPRN</p>' +
              '<p style="margin:0 0 4px 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#555555;">📞 55 3300 2400 Ext. 9065</p>' +
              '<p style="margin:0 0 4px 0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#555555;">📍 Av. Texcoco 116, Col. Juárez Pantitlán, Nezahualcóyotl C.P. 57460</p>' +
              '<p style="margin:0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#555555;">✉️ <a href="mailto:' + CORREO_REPLY_TO_INSTITUCIONAL + '" style="color:#9F2241;text-decoration:none;">' + CORREO_REPLY_TO_INSTITUCIONAL + '</a></p>' +
            '</div>' +
          '</td></tr>' +
          '<tr><td style="padding:18px 32px 28px 32px;">' +
            '<div style="font:12px/1.6 Arial,Helvetica,sans-serif;color:#8a8a8a;">' +
              'Este es un recordatorio automático de OTDE NEZA. Tu inscripción oficial (cuando aplica) se gestiona directamente en la plataforma o convocatoria correspondiente — este correo no la sustituye.' +
            '</div>' +
          '</td></tr>' +
          '<tr><td style="background:#9F2241;padding:9px 32px;text-align:center;">' +
            '<p style="margin:0;font:9.5px/1 Arial,Helvetica,sans-serif;color:#d6a87e;letter-spacing:1px;">SEPRN © 2026 — Gobierno del Estado de México</p>' +
          '</td></tr>' +
        '</table>' +
      '</td></tr>' +
    '</table>' +
  '</body></html>';
}

// ── Línea extra para el correo de aviso de cursos con Liga_tutorial_constancia
// llena (ej. conferencias UNETE) — se agrega al "detalle" del correo, no
// reemplaza el botón principal (que sigue siendo la Liga_convocatoria/acceso
// al curso). Vacía si el curso no pide constancia. ──
function lineaTutorialConstancia_(ligaTutorial) {
  return ligaTutorial
    ? '<br><br>Al terminar, no olvides tramitar tu constancia de participación: ' +
      '<a href="' + ligaTutorial + '" style="color:#9F2241;font-weight:bold;">Ver tutorial para tramitarla</a>.'
    : '';
}

// ── Avisa una vez al día (máximo) si algún activador de recordatorios
// desapareció — evita que el sistema se quede sordo en silencio. ──
function verificarActivadoresInstalados() {
  const props = PropertiesService.getScriptProperties();
  const hoy = Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd');
  if (props.getProperty('ULTIMA_ALERTA_TRIGGERS') === hoy) return;

  const existentes = ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  const requeridos = ['enviarRecordatoriosDiarios', 'enviarRecordatoriosWebinar'];
  const faltantes = requeridos.filter(fn => !existentes.includes(fn));
  if (!faltantes.length) return;

  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: 'ALERTA: recordatorios de Formación Docente desinstalados',
    htmlBody: '<p>Los siguientes activadores automáticos ya no están instalados: <strong>' +
      faltantes.join(', ') + '</strong>.</p>' +
      '<p>Corre de nuevo el menú "OTDE Formación &rarr; Instalar recordatorios automáticos" desde la hoja de cálculo.</p>'
  });
  props.setProperty('ULTIMA_ALERTA_TRIGGERS', hoy);
}

// ── Recordatorios que se evalúan una vez al día (inicio + medio curso) ──
//
// Reglas de negocio (ago 2026, ajustadas con Jorge):
//   · Cursos de más de un día: aviso 1 día antes del inicio. Si además
//     tienen Hora_inicio capturada, TAMBIÉN reciben el aviso de "30
//     minutos antes" el mismo día (ver enviarRecordatoriosWebinar) —
//     son dos avisos independientes, no uno sustituye al otro.
//   · Cursos de un solo día (webinars, seminarios, etc.) CON Hora_inicio:
//     solo reciben el aviso de "30 minutos antes" — el de "1 día antes"
//     se salta para no duplicar con un aviso tan cercano.
//   · Cursos de un solo día SIN Hora_inicio capturada: reciben el aviso
//     de "1 día antes" como respaldo (fallback), para que ningún curso
//     activo se quede sin ningún recordatorio solo por falta de hora.
function enviarRecordatoriosDiarios() {
  verificarActivadoresInstalados();

  const hoja  = obtenerHojaCursos();
  const datos = valoresCursos_(hoja);
  const hoy   = soloFecha(new Date());

  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    // Aislado por curso: si uno truena (ej. bug real 22 sep 2026, BCC con más
    // destinatarios que el límite de Gmail), no debe tumbar el resto del
    // recorrido ni el bloque 3 (pendientes de registro externo) de abajo.
    try {
    const idCurso = String(row[CUR.ID_Curso]).trim().toUpperCase();
    if (!idCurso || !row[CUR.Fecha_inicio] || !row[CUR.Fecha_fin]) continue; // sin ID o sin fechas

    const inicio = soloFecha(row[CUR.Fecha_inicio]);
    const fin    = soloFecha(row[CUR.Fecha_fin]);
    const fila   = i + 1;
    const esDeUnDia = inicio.getTime() === fin.getTime();
    const tieneHora = !!row[COL_HORA_INICIO];

    // 1. "Empieza en 1 día" — todos los cursos de varios días, más los de
    //    un solo día que no capturaron Hora_inicio (fallback).
    const aplicaUnDiaAntes = !esDeUnDia || !tieneHora;
    if (aplicaUnDiaAntes && String(row[COL_RECORDATORIO_INICIO] || '').trim().toUpperCase() !== 'TRUE') {
      const diasParaInicio = Math.round((inicio - hoy) / 86400000);
      if (hoy > fin || diasParaInicio < 0) {
        // Ya pasó el día de inicio: lo que no alcanzó a salir por cuota ya
        // no se manda (28 sep 2026, decisión de Jorge: "a quien alcance" —
        // antes seguía goteando "ya inició" durante días y se comía la cuota
        // de los demás avisos; el calendario de la confirmación cubre al
        // resto). Se marca enviado para dejar de reevaluarlo.
        hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_INICIO])).setValue('TRUE');
        limpiarSeguimientoLote_(idCurso + '_INICIO');
      } else if (diasParaInicio <= DIAS_ANTES_RECORDATORIO_INICIO) {
        // Ventana: el día anterior y el día de inicio (lo que no cupo ayer
        // sale hoy como "empieza hoy", sin duplicar).
        const cuando = diasParaInicio === 0 ? 'hoy' : 'mañana';
        const correos = obtenerCorreosInscritos(idCurso);
        const enviado = enviarCorreoLote(correos,
          'Tu curso "' + row[CUR.Nombre] + '" empieza ' + cuando,
          construirCorreoHtml({
            chip: 'TU CURSO EMPIEZA PRONTO',
            titulo: 'Tu curso "' + row[CUR.Nombre] + '" empieza ' + cuando,
            cuerpo: 'Hola, te recordamos que tu curso <strong>' + row[CUR.Nombre] + '</strong> comienza el <strong>' +
              formatearFecha(row[CUR.Fecha_inicio]) + '</strong>. Prepárate con anticipación para sacarle el máximo provecho.',
            detalle: 'Curso: ' + row[CUR.Nombre] + '<br>Inicio: ' + formatearFecha(row[CUR.Fecha_inicio]) +
              (esDeUnDia ? '' : '<br>Término: ' + formatearFecha(row[CUR.Fecha_fin])) +
              lineaTutorialConstancia_(row[COL_LIGA_TUTORIAL_CONSTANCIA]),
            liga: row[CUR.Liga_convocatoria] || '',
            textoLiga: 'Ver convocatoria / acceso'
          }),
          idCurso + '_INICIO');
        if (enviado) hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_INICIO])).setValue('TRUE');
      }
    }

    // 2. "Vas a la mitad" — solo cursos largos
    const duracionDias = Math.round((fin - inicio) / 86400000);
    if (duracionDias >= DIAS_MINIMOS_CURSO_LARGO &&
        String(row[COL_RECORDATORIO_MEDIO] || '').trim().toUpperCase() !== 'TRUE') {
      const medio = new Date(inicio.getTime() + (fin - inicio) / 2);
      if (hoy > fin || hoy > soloFecha(medio)) {
        // Ya terminó, o ya pasó el día de la mitad: lo que no alcanzó a salir
        // por cuota ya no se manda (28 sep 2026, mismo criterio que arriba).
        hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_MEDIO])).setValue('TRUE');
        limpiarSeguimientoLote_(idCurso + '_MEDIO');
      } else if (hoy.getTime() === soloFecha(medio).getTime()) {
        const correos = obtenerCorreosInscritos(idCurso);
        const enviado = enviarCorreoLote(correos,
          'Vas a la mitad de "' + row[CUR.Nombre] + '" — ¡sigue avanzando!',
          construirCorreoHtml({
            chip: 'SIGUE ASÍ',
            titulo: 'Vas a la mitad de "' + row[CUR.Nombre] + '"',
            cuerpo: 'Ya vas a la mitad de tu curso <strong>' + row[CUR.Nombre] + '</strong>. Este es un recordatorio ' +
              'para que no lo dejes a medias — termina antes del <strong>' + formatearFecha(row[CUR.Fecha_fin]) + '</strong>.',
            detalle: 'Curso: ' + row[CUR.Nombre] + '<br>Fecha límite: ' + formatearFecha(row[CUR.Fecha_fin]),
            liga: row[CUR.Liga_convocatoria] || '',
            textoLiga: 'Continuar curso'
          }),
          idCurso + '_MEDIO');
        if (enviado) hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_MEDIO])).setValue('TRUE');
      }
    }
    } catch (err) {
      console.error('enviarRecordatoriosDiarios: error en curso ' + row[CUR.ID_Curso] + ': ' + err.message);
    }
  }

  // 3. Inscripción pendiente en la plataforma externa (Paso 4, sep 2026).
  // Aislado: si falla, no afecta los recordatorios de curso de arriba.
  try {
    const res = enviarRecordatoriosPendientes_();
    console.log('Recordatorios a pendientes: ' + res.enviados + ' enviado(s), ' + res.pospuestos + ' pospuesto(s).');
  } catch (err) {
    console.error('enviarRecordatoriosPendientes_ falló: ' + err.message);
  }
}

// ============================================================
// RECORDATORIO A PENDIENTES DE INSCRIPCIÓN EXTERNA (Paso 4, sep 2026)
//
// A quien dijo "Todavía no me llega el correo de bienvenida" (Registro_externo
// = Pendiente) se le manda un correo INDIVIDUAL con dos botones por curso:
// "Ir a inscribirme" (liga del curso) y "Sí, ya me llegó" (confirma con un
// toque vía formacion-docente.html?confirmar=<folio>&t=<firma>).
//
// Reglas (decididas con Jorge), máximo MAX_RECORDATORIOS_PENDIENTE por
// inscripción, nunca el mismo día del registro:
//   1. Al día siguiente (o después) de registrarse como Pendiente.
//   2. A DIAS_ANTES_CIERRE_RECORDATORIO días o menos del cierre de inscripción
//      (Fecha_limite_inscripcion, o Fecha_inicio si no hay), siempre que hayan
//      pasado DIAS_ENTRE_RECORDATORIOS_PENDIENTE desde el primero. Si ambas
//      coinciden el mismo día, sale UN solo correo (cuenta como el último).
// Solo cursos Activo=TRUE con inscripción abierta (ni cerrada ni con cupo
// agotado: mandaría a completar un registro en un curso sin lugar). Un correo por docente
// aunque tenga varios cursos pendientes. Deja RESERVA_CUOTA_CORREO de cuota
// para los demás Apps Script de la cuenta; lo que no alcance sale mañana
// (las columnas solo se marcan si el correo salió de verdad).
// ============================================================

const SITIO_FORMACION_URL = 'https://educaneza.github.io/seprn-sitio/formacion-docente.html';
const MAX_RECORDATORIOS_PENDIENTE = 2;
const DIAS_ANTES_CIERRE_RECORDATORIO = 2;
const DIAS_ENTRE_RECORDATORIOS_PENDIENTE = 2;
const RESERVA_CUOTA_CORREO = 50; // correos libres para Mantenimiento, Correo, etc. (cuota compartida; 28 sep 2026: antes 30)

// ── Apartado para el aviso de "empieza en 30 minutos" (28 sep 2026) ──
// Con ~100 destinatarios/día y 50 reservados para los demás sistemas, los
// avisos de las 9 am se comían todo y el de 30 min de la tarde salía en
// cero. Los días en que hay un aviso de 30 min pendiente, todo lo demás de
// Formación Docente deja además RESERVA_AVISO_30MIN libres para él. Los
// días sin ese aviso no se aparta nada. Decisión de Jorge: los correos son
// respaldo del calendario de la confirmación — llegan "a quien alcance".
const RESERVA_AVISO_30MIN = 20;
let avisoUrgenteHoyCache_ = null;

function hayAvisoUrgentePendienteHoy_() {
  if (avisoUrgenteHoyCache_ !== null) return avisoUrgenteHoyCache_;
  const hoy = soloFecha(new Date());
  const ahora = new Date();
  avisoUrgenteHoyCache_ = valoresCursos_(obtenerHojaCursos()).slice(1).some(function(row) {
    if (!row[CUR.ID_Curso] || !row[COL_HORA_INICIO] || !row[CUR.Fecha_fin]) return false;
    if (String(row[COL_RECORDATORIO_WEBINAR] || '').trim().toUpperCase() === 'TRUE') return false;
    const inicio = parseFechaSegura_(row[CUR.Fecha_inicio]);
    return !!inicio && inicio.getTime() === hoy.getTime() && ahora <= finConferencia_(row);
  });
  return avisoUrgenteHoyCache_;
}

// Cuánta cuota debe quedar libre después de un envío de Formación Docente.
function reservaCuota_(esAvisoUrgente) {
  return RESERVA_CUOTA_CORREO + (!esAvisoUrgente && hayAvisoUrgentePendienteHoy_() ? RESERVA_AVISO_30MIN : 0);
}

// ── Firma del botón "Sí, ya me llegó": HMAC-SHA256 del folio con un secreto
// propio del proyecto (Script Properties, se genera solo la primera vez).
// Sin la firma correcta nadie puede confirmar el folio de otra persona. ──
function secretoConfirmacion_() {
  const props = PropertiesService.getScriptProperties();
  let secreto = props.getProperty('SECRETO_CONFIRMACION');
  if (!secreto) {
    secreto = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('SECRETO_CONFIRMACION', secreto);
  }
  return secreto;
}

function tokenConfirmacion_(folio) {
  const firma = Utilities.computeHmacSha256Signature(String(folio).trim(), secretoConfirmacion_());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 24);
}

function ligaConfirmacion_(folio) {
  return SITIO_FORMACION_URL + '?confirmar=' + encodeURIComponent(String(folio).trim()) +
    '&t=' + tokenConfirmacion_(folio);
}

// ── doGet ?action=confirmar&folio=&t= : Pendiente → Confirmado por docente ──
// Respuesta mínima (sin nombre, RFC ni correo): solo el nombre del curso.
function confirmarDesdeCorreo_(folio, token) {
  folio = String(folio || '').trim();
  if (!folio || !token || String(token) !== tokenConfirmacion_(folio)) return { status: 'invalido' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (errLock) {
    return { status: 'error', mensaje: 'El sistema está ocupado, intenta de nuevo en unos segundos.' };
  }
  try {
    const hoja = obtenerHojaInscripciones();
    const datos = hoja.getDataRange().getValues();
    const cols = indicesPorEncabezado_(datos[0]);
    for (let i = 1; i < datos.length; i++) {
      if (String(datos[i][cols.Folio]).trim() !== folio) continue;
      const actual = String(datos[i][cols.Registro_externo] || '').trim();
      const curso = String(datos[i][cols.Nombre_Curso] || datos[i][cols.ID_Curso] || '');
      if (actual === REGISTRO_EXTERNO.CONFIRMADO) return { status: 'ok', curso: curso, yaConfirmado: true };
      if (actual !== REGISTRO_EXTERNO.PENDIENTE) return { status: 'invalido' };
      mejorarRegistroExterno_(hoja, { folio: folio, fila: i + 1, registroExterno: actual },
        REGISTRO_EXTERNO.CONFIRMADO, new Date());
      return { status: 'ok', curso: curso, yaConfirmado: false };
    }
    return { status: 'invalido' };
  } finally {
    lock.releaseLock();
  }
}

// ── ¿Toca recordatorio a esta inscripción pendiente? Devuelve el nuevo valor
// de Recordatorios_pendiente (1 o 2), o 0 si hoy no toca. ──
function decidirRecordatorioPendiente_(row, cols, filaCurso, hoy) {
  const enviados = Number(row[cols.Recordatorios_pendiente]) || 0;
  if (enviados >= MAX_RECORDATORIOS_PENDIENTE) return 0;

  const fechaRegistro = parseFechaSegura_(row[cols.Fecha_registro]);
  if (!fechaRegistro) return 0;
  const dias = (a, b) => Math.round((a - b) / 86400000);
  if (dias(hoy, fechaRegistro) < 1) return 0; // nunca el mismo día del registro

  const ultimo = parseFechaSegura_(row[cols.Fecha_ultimo_recordatorio]);
  const limite = filaCurso[CUR.Fecha_limite_inscripcion] ? parseFechaSegura_(filaCurso[CUR.Fecha_limite_inscripcion]) : parseFechaSegura_(filaCurso[CUR.Fecha_inicio]);

  const tocaPorCierre = limite !== null &&
    dias(limite, hoy) <= DIAS_ANTES_CIERRE_RECORDATORIO &&
    (enviados === 0 || (ultimo !== null && dias(hoy, ultimo) >= DIAS_ENTRE_RECORDATORIOS_PENDIENTE));
  if (tocaPorCierre) return MAX_RECORDATORIOS_PENDIENTE;
  if (enviados === 0) return 1;
  return 0;
}

// ── Recorre Inscripciones y manda los recordatorios que tocan hoy ──
function enviarRecordatoriosPendientes_() {
  const ahora = new Date();
  const hoy = soloFecha(ahora);
  const modoPrueba = !!PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');

  const cursosPorId = {};
  valoresCursos_(obtenerHojaCursos()).slice(1).forEach(r => {
    const id = String(r[0]).trim().toUpperCase();
    if (id) cursosPorId[id] = r;
  });
  const docentesPorRfc = {};
  obtenerHojaDocentes().getDataRange().getValues().slice(1).forEach(r => {
    docentesPorRfc[String(r[0]).trim().toUpperCase()] = r;
  });

  const hoja = obtenerHojaInscripciones();
  const datos = hoja.getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);

  const porDocente = {};
  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    if (String(row[cols.Registro_externo]).trim() !== REGISTRO_EXTERNO.PENDIENTE) continue;
    const filaCurso = cursosPorId[String(row[cols.ID_Curso]).trim().toUpperCase()];
    if (!filaCurso || String(filaCurso[CUR.Activo]).trim().toUpperCase() !== 'TRUE') continue;
    const estado = evaluarEstadoCurso_(filaCurso, ahora);
    if (estado.esPasado || estado.estadoInscripcion !== 'abierta') continue;

    const nuevoConteo = decidirRecordatorioPendiente_(row, cols, filaCurso, hoy);
    if (!nuevoConteo) continue;

    const rfc = String(row[cols.RFC_Docente]).trim().toUpperCase();
    (porDocente[rfc] = porDocente[rfc] || []).push({
      fila: i + 1, folio: String(row[cols.Folio]).trim(), filaCurso: filaCurso, nuevoConteo: nuevoConteo
    });
  }

  let enviados = 0, pospuestos = 0;
  Object.keys(porDocente).forEach(rfc => {
    const docente = docentesPorRfc[rfc];
    const correo = docente ? String(docente[2]).trim() : '';
    if (!correo) return;
    if (MailApp.getRemainingDailyQuota() <= reservaCuota_(false)) { pospuestos++; return; }

    const items = porDocente[rfc];
    const mensaje = construirCorreoPendiente_(items);
    if (!enviarCorreoIndividual_(correo, mensaje.asunto, mensaje.html)) { pospuestos++; return; }
    enviados++;

    // En modo de prueba NO se marcan las columnas: el correo fue a la
    // dirección de prueba, así que el docente real debe recibirlo después.
    if (modoPrueba) return;
    const ahora = new Date();
    items.forEach(it => {
      hoja.getRange(it.fila, cols.Recordatorios_pendiente + 1).setValue(it.nuevoConteo);
      hoja.getRange(it.fila, cols.Fecha_ultimo_recordatorio + 1).setValue(ahora);
    });
  });
  return { enviados: enviados, pospuestos: pospuestos };
}

function escaparHtml_(texto) {
  return String(texto || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Correo del recordatorio: un bloque por curso con sus dos botones ──
function construirCorreoPendiente_(items) {
  const boton = (href, texto, fondo) =>
    '<a href="' + escaparHtml_(href) + '" style="display:inline-block;background:' + fondo + ';color:#ffffff;' +
    'text-decoration:none;font:bold 14px/1.2 Arial,Helvetica,sans-serif;padding:12px 18px;border-radius:8px;margin:6px 6px 0 0;">' +
    texto + '</a>';

  const bloques = items.map(it => {
    const c = it.filaCurso;
    const cierre = momentoCierreInscripcion_(c);
    const hora = c[COL_HORA_LIMITE_INSCRIPCION] ? horaYMinutos_(c[COL_HORA_LIMITE_INSCRIPCION]) : null;
    const limite = cierre
      ? formatearFecha(cierre) + (hora ? ' a las ' + ('0' + hora.h).slice(-2) + ':' + ('0' + hora.m).slice(-2) + ' h' : '')
      : '';
    return '<div style="padding:4px 0 16px 0;border-bottom:1px solid #e6e2da;margin-bottom:14px;">' +
      '<div style="font:bold 16px/1.4 Arial,Helvetica,sans-serif;color:#1a1a1a;">' + escaparHtml_(c[CUR.Nombre]) + '</div>' +
      (limite ? '<div style="font:13px/1.5 Arial,Helvetica,sans-serif;color:#8A5A16;margin-top:2px;">Cierre de inscripciones: <strong>' + escaparHtml_(limite) + '</strong></div>' : '') +
      '<div style="font:13px/1.5 Arial,Helvetica,sans-serif;color:#555555;margin-top:10px;">1. Inscríbete en la plataforma del curso:</div>' +
      boton(c[CUR.Liga_convocatoria], 'Ir a inscribirme &rarr;', '#9F2241') +
      '<div style="font:13px/1.5 Arial,Helvetica,sans-serif;color:#555555;margin-top:12px;">2. Cuando te llegue el correo de bienvenida del curso, avísanos con un toque:</div>' +
      boton(ligaConfirmacion_(it.folio), '&#10003; Sí, ya me llegó', '#146C43') +
    '</div>';
  }).join('');

  const unCurso = items.length === 1;
  return {
    asunto: unCurso
      ? 'Te falta un paso para apartar tu lugar en "' + items[0].filaCurso[CUR.Nombre] + '"'
      : 'Te falta un paso para apartar tu lugar en ' + items.length + ' cursos',
    html: construirCorreoHtml({
      chip: 'TE FALTA UN PASO',
      titulo: 'Tu lugar todavía no está apartado',
      cuerpo: 'Hola, avisaste a OTDE NEZA que te interesa ' + (unCurso ? 'este curso' : 'estos cursos') +
        ', pero todavía no confirmas tu inscripción en la plataforma. <strong>Tu lugar solo se aparta ahí</strong>, ' +
        'y la prueba es el correo de bienvenida que te manda la plataforma.',
      detalle: bloques
    })
  };
}

// ── Envío individual (no BCC), con revisión de modo de prueba. true si salió. ──
function enviarCorreoIndividual_(para, asunto, cuerpoHtml) {
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  try {
    MailApp.sendEmail({
      to: correoPrueba || para,
      replyTo: CORREO_REPLY_TO_INSTITUCIONAL,
      subject: correoPrueba ? '[PRUEBA] ' + asunto : asunto,
      htmlBody: correoPrueba
        ? '<div style="background:#fff3cd;border:1px solid #e0a800;border-radius:6px;padding:10px 16px;margin-bottom:16px;' +
          'font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555;"><strong>Modo de prueba activo</strong> — destino real: ' +
          escaparHtml_(para) + '</div>' + cuerpoHtml
        : cuerpoHtml,
      name: 'OTDE NEZA · Centro de Formación Docente'
    });
    return true;
  } catch (err) {
    console.error('No se pudo enviar a ' + para + ': ' + err.message);
    return false;
  }
}

// ── Menú: activar/desactivar modo de prueba sin tocar el código ──
function fdMenuModoPrueba() {
  const ui = SpreadsheetApp.getUi();
  const actual = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (actual) {
    const r = ui.alert('Modo de prueba ACTIVO', 'Todos los correos van a: ' + actual + '\n\n¿Desactivarlo? Los correos volverán a ir a los docentes.', ui.ButtonSet.YES_NO);
    if (r === ui.Button.YES) {
      fdDesactivarModoPrueba();
      ui.alert('Modo de prueba desactivado. Los correos vuelven a ir a los docentes.');
    }
    return;
  }
  const r = ui.prompt('Activar modo de prueba', 'Correo que recibirá TODOS los envíos (recordatorios incluidos) mientras esté activo:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const correo = r.getResponseText().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { ui.alert('Correo inválido: ' + correo); return; }
  fdActivarModoPrueba(correo);
  ui.alert('Modo de prueba ACTIVO: todos los correos van a ' + correo + '. No olvides desactivarlo al terminar.');
}

// ── Menú: manda a la dirección de prueba el recordatorio de UN folio, sin
// aplicar reglas ni marcar columnas — para revisar el diseño y el botón. ──
function fdMenuRecordatorioPruebaFolio() {
  const ui = SpreadsheetApp.getUi();
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (!correoPrueba) { ui.alert('Primero activa el modo de prueba (menú OTDE Formación).'); return; }

  const r = ui.prompt('Recordatorio de prueba', 'Folio de la inscripción (ej. OTDE-CAP-0270):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const folio = r.getResponseText().trim().toUpperCase();

  const datos = obtenerHojaInscripciones().getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);
  const row = datos.slice(1).find(x => String(x[cols.Folio]).trim().toUpperCase() === folio);
  if (!row) { ui.alert('No existe el folio ' + folio); return; }
  const filaCurso = obtenerFilaCurso_(obtenerHojaCursos(), String(row[cols.ID_Curso]).trim().toUpperCase());
  if (!filaCurso) { ui.alert('El curso de ese folio ya no está en la hoja Cursos.'); return; }

  const mensaje = construirCorreoPendiente_([{ folio: folio, filaCurso: filaCurso }]);
  const ok = enviarCorreoIndividual_(String(row[cols.Correo] || '(sin correo)'), mensaje.asunto, mensaje.html);
  ui.alert(ok ? 'Enviado a ' + correoPrueba + '.' : 'No se pudo enviar (revisa el registro de ejecución).');
}

// ── Menú: aplica las reglas y envía ahora (mismo código que el activador diario) ──
function fdMenuEnviarPendientesAhora() {
  const ui = SpreadsheetApp.getUi();
  const modo = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  const r = ui.alert('Enviar recordatorios a pendientes',
    (modo ? 'Modo de prueba ACTIVO: todo irá a ' + modo + '.' : 'ATENCIÓN: modo de prueba desactivado, los correos irán a los docentes.') +
    '\n\n¿Continuar?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  const res = enviarRecordatoriosPendientes_();
  ui.alert('Listo: ' + res.enviados + ' correo(s) enviado(s), ' + res.pospuestos + ' pospuesto(s) por cuota o error.');
}

// ── Recordatorio de "empieza en 30 minutos", evaluado cada 15 minutos ──
// Aplica a CUALQUIER curso con Hora_inicio capturada (de un día o de
// varios) — ya no es exclusivo de webinars de un solo día.
function enviarRecordatoriosWebinar() {
  const hoja  = obtenerHojaCursos();
  const datos = valoresCursos_(hoja);
  const ahora = new Date();
  const hoy   = soloFecha(ahora);

  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    // Aislado por curso: si uno truena (ej. bug real 22 sep 2026, BCC con más
    // destinatarios que el límite de Gmail), no debe tumbar el resto del
    // recorrido ni el recordatorio de constancia de abajo.
    try {
    const idCurso = String(row[CUR.ID_Curso]).trim().toUpperCase();
    if (!idCurso || !row[CUR.Fecha_inicio] || !row[CUR.Fecha_fin] || !row[COL_HORA_INICIO]) continue;
    if (String(row[COL_RECORDATORIO_WEBINAR] || '').trim().toUpperCase() === 'TRUE') continue;

    const inicio = combinarFechaHora(row[CUR.Fecha_inicio], row[COL_HORA_INICIO]);
    const fin = soloFecha(row[CUR.Fecha_fin]);
    const minutosFaltantes = (inicio - ahora) / 60000;
    const fila = i + 1;

    // Cursos de varios días con hora: el aviso es solo de la primera sesión —
    // al terminar el día de inicio se cierra (28 sep 2026; antes, sin
    // Hora_fin, seguía mandando "ya comenzó" diario hasta Fecha_fin).
    if (hoy > fin || ahora > finConferencia_(row) || hoy > soloFecha(row[CUR.Fecha_inicio])) {
      // El curso/evento ya terminó y el aviso no alcanzó a salir (completo) —
      // ya no hay nada útil que avisar, se marca enviado para dejar de
      // reevaluarlo — ver docs/QA-NOTES.md #8. Con Hora_fin capturada se corta
      // al terminar el evento, no a medianoche: sin esto, un envío parcial
      // retomado de noche mandaría "ya comenzó — conéctate ahora" a un evento
      // ya concluido (docs/QA-NOTES.md #40).
      hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_WEBINAR])).setValue('TRUE');
      limpiarSeguimientoLote_(idCurso + '_WEBINAR');
      continue;
    }
    // Sin piso en minutosFaltantes: si la evaluación llega tarde (curso ya
    // comenzado, hoy <= fin) reintenta en la siguiente corrida (cada 15 min)
    // con el mensaje ajustado a "ya comenzó" en vez de perder el aviso.
    if (minutosFaltantes <= MINUTOS_ANTES_INICIO_MAX) {
      const yaEmpezo = minutosFaltantes < 0;
      const horaTexto = Utilities.formatDate(new Date(row[COL_HORA_INICIO]), 'America/Mexico_City', 'HH:mm');
      const correos = obtenerCorreosInscritos(idCurso);
      const enviado = enviarCorreoLote(correos,
        yaEmpezo ? '"' + row[CUR.Nombre] + '" ya comenzó — conéctate ahora' : '"' + row[CUR.Nombre] + '" empieza en 30 minutos',
        construirCorreoHtml({
          chip: yaEmpezo ? 'YA COMENZÓ' : 'EMPIEZA EN 30 MINUTOS',
          titulo: yaEmpezo ? '"' + row[CUR.Nombre] + '" ya comenzó' : '"' + row[CUR.Nombre] + '" empieza en media hora',
          cuerpo: yaEmpezo
            ? 'Tu curso/webinar <strong>' + row[CUR.Nombre] + '</strong> ya comenzó hoy a las <strong>' + horaTexto + ' hrs</strong>. Conéctate ahora.'
            : 'Tu curso/webinar <strong>' + row[CUR.Nombre] + '</strong> empieza hoy a las <strong>' + horaTexto +
              ' hrs</strong>. Ten a la mano tu conexión y materiales.',
          detalle: 'Curso: ' + row[CUR.Nombre] + '<br>Hoy a las: ' + horaTexto + ' hrs' +
            lineaTutorialConstancia_(row[COL_LIGA_TUTORIAL_CONSTANCIA]),
          liga: row[CUR.Liga_convocatoria] || '',
          textoLiga: 'Ir a la transmisión / acceso'
        }),
        idCurso + '_WEBINAR', true, idCurso + '_INICIO'); // urgente (apartado de 30 min); primero quien no recibió "empieza mañana"
      if (enviado) hoja.getRange(fila, colCursos_(hoja, ENCABEZADOS_CURSOS[COL_RECORDATORIO_WEBINAR])).setValue('TRUE');
    }
    } catch (err) {
      console.error('enviarRecordatoriosWebinar: error en curso ' + row[CUR.ID_Curso] + ': ' + err.message);
    }
  }

  // Recordatorio + carga de constancia (sep 2026). Aislado: si falla, no
  // afecta el aviso de "empieza en 30 minutos" de arriba. Reusa este mismo
  // disparador de cada 15 min porque necesita precisión de minutos para el
  // primer recordatorio ("inmediatamente después de la conferencia") — el
  // segundo ("al día siguiente") también queda cubierto por esta misma
  // cadencia a lo largo del día.
  try {
    const resConstancia = enviarRecordatoriosConstancia_();
    console.log('Recordatorios de constancia: ' + resConstancia.enviados + ' enviado(s), ' + resConstancia.pospuestos + ' pospuesto(s).');
  } catch (err) {
    console.error('enviarRecordatoriosConstancia_ falló: ' + err.message);
  }
}

// ============================================================
// RECORDATORIO Y CARGA DE CONSTANCIA (sep 2026)
//
// Solo para cursos con Liga_tutorial_constancia llena en Cursos (hoy: el
// Ciclo de Conferencias Virtuales de UNETE) — la mayoría de webinars/
// seminarios no la necesitan (ver "Sin gestión de constancias" en
// docs/ARCHITECTURE.md). Reglas decididas con Jorge:
//   1. Recordatorio 1: inmediatamente después de terminar la conferencia
//      (o en los siguientes 15 min, cadencia del disparador que lo llama).
//   2. Recordatorio 2: al día siguiente de terminada, si aún no llega la
//      constancia.
//   3. El formulario de carga se cierra al segundo día de terminada la
//      conferencia (DIAS_LIMITE_CONSTANCIA) — ya no acepta cargas ni se
//      manda un tercer recordatorio.
// Cada correo trae una liga firmada (HMAC, mismo mecanismo que
// tokenConfirmacion_() del doble registro pero con un mensaje distinto —
// nunca intercambiable con esa liga) que abre
// formacion-docente.html?subirConstancia=<folio>&t=<firma>, una carga
// directa a Drive (mismo patrón que mantenimiento.gs/visitas-jefes.gs).
// ============================================================

const CARPETA_CONSTANCIAS = 'Constancias de Conferencias';
const DIAS_LIMITE_CONSTANCIA = 7; // el formulario cierra al llegar a este número de días desde Fecha_fin
const MAX_RECORDATORIOS_CONSTANCIA = 2;
const TAMANO_MAX_CONSTANCIA_BYTES = 8 * 1024 * 1024;

function tokenConstancia_(folio) {
  const firma = Utilities.computeHmacSha256Signature('constancia:' + String(folio).trim(), secretoConfirmacion_());
  return Utilities.base64EncodeWebSafe(firma).replace(/=+$/, '').slice(0, 24);
}

function ligaConstancia_(folio) {
  return SITIO_FORMACION_URL + '?subirConstancia=' + encodeURIComponent(String(folio).trim()) +
    '&t=' + tokenConstancia_(folio);
}

// ── ¿Sigue abierto el formulario de carga para este curso, hoy? ──
// Días 0 y 1 desde Fecha_fin: abierto. Día 2 en adelante: cerrado.
function ventanaConstanciaAbierta_(filaCurso, hoy) {
  const fin = parseFechaSegura_(filaCurso[CUR.Fecha_fin]);
  if (!fin) return false;
  const dias = Math.round((hoy - fin) / 86400000);
  return dias >= 0 && dias < DIAS_LIMITE_CONSTANCIA;
}

// ── Momento exacto en que termina la conferencia, para el recordatorio
// inmediato. Sin Hora_fin capturada, se asume que termina a las 23:59 de
// Fecha_fin (fail-open: nunca bloquea el recordatorio, solo lo retrasa). ──
function finConferencia_(filaCurso) {
  if (filaCurso[COL_HORA_FIN]) return combinarFechaHora(filaCurso[CUR.Fecha_fin], filaCurso[COL_HORA_FIN]);
  const f = soloFecha(filaCurso[CUR.Fecha_fin]);
  return new Date(f.getFullYear(), f.getMonth(), f.getDate(), 23, 59, 59);
}

// ── ¿Toca recordatorio de constancia a esta inscripción? Devuelve el nuevo
// valor de Constancia_recordatorios_enviados (1 o 2), o 0 si hoy no toca. ──
function decidirRecordatorioConstancia_(row, cols, filaCurso, ahora, hoy) {
  if (String(row[cols.Constancia_recibida] || '').trim() === 'Sí') return 0;
  const enviados = Number(row[cols.Constancia_recordatorios_enviados]) || 0;
  if (enviados >= MAX_RECORDATORIOS_CONSTANCIA) return 0;
  if (!ventanaConstanciaAbierta_(filaCurso, hoy)) return 0; // plazo ya vencido, no insiste

  if (enviados === 0) {
    return ahora >= finConferencia_(filaCurso) ? 1 : 0;
  }
  // Nunca el mismo día que el recordatorio 1: si ese salió tarde (ej. cuota
  // agotada hasta el día siguiente), sin este chequeo el "Último aviso" salía
  // 15 min después — ver docs/QA-NOTES.md #41.
  const ultimo = row[cols.Fecha_ultimo_recordatorio_constancia];
  if (ultimo instanceof Date && !isNaN(ultimo) && soloFecha(ultimo) >= hoy) return 0;
  const fin = parseFechaSegura_(filaCurso[CUR.Fecha_fin]);
  return (fin && Math.round((hoy - fin) / 86400000) >= 1) ? 2 : 0;
}

// ── Correo del recordatorio de constancia (uno u otro según "numero") ──
function construirCorreoConstancia_(filaCurso, folio, numero) {
  const nombreCurso = filaCurso[CUR.Nombre];
  const ligaTutorial = filaCurso[COL_LIGA_TUTORIAL_CONSTANCIA];
  const esUltimo = numero === MAX_RECORDATORIOS_CONSTANCIA;
  const pasoTutorial = ligaTutorial
    ? '1. Tramita tu constancia: <a href="' + escaparHtml_(ligaTutorial) + '" style="color:#9F2241;font-weight:bold;">Ver tutorial</a><br>2. '
    : '';
  return {
    asunto: (esUltimo ? 'Último aviso: envíanos' : 'Envíanos') + ' tu constancia de "' + nombreCurso + '"',
    html: construirCorreoHtml({
      chip: esUltimo ? 'ÚLTIMO AVISO' : 'GRACIAS POR PARTICIPAR',
      titulo: esUltimo ? 'Todavía no recibimos tu constancia' : '¡Gracias por participar!',
      cuerpo: 'Hola, gracias por asistir a <strong>' + escaparHtml_(nombreCurso) + '</strong>. Para que OTDE registre tu ' +
        'participación necesitamos una copia digital de tu constancia' +
        (esUltimo ? ' — este es el último recordatorio, el formulario de carga se cierra pronto.' : '.'),
      detalle: pasoTutorial + 'Sube aquí tu constancia (PDF o imagen):',
      liga: ligaConstancia_(folio),
      textoLiga: 'Subir mi constancia'
    })
  };
}

// ── Recorre Inscripciones de cursos con Liga_tutorial_constancia y manda
// los recordatorios que tocan hoy — un correo individual por folio, mismo
// patrón que enviarRecordatoriosPendientes_(). ──
function enviarRecordatoriosConstancia_() {
  const ahora = new Date();
  const hoy = soloFecha(ahora);
  const modoPrueba = !!PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');

  const cursosPorId = {};
  valoresCursos_(obtenerHojaCursos()).slice(1).forEach(r => {
    const id = String(r[0]).trim().toUpperCase();
    if (id && String(r[COL_LIGA_TUTORIAL_CONSTANCIA] || '').trim()) cursosPorId[id] = r;
  });
  if (!Object.keys(cursosPorId).length) return { enviados: 0, pospuestos: 0 };

  const docentesPorRfc = {};
  obtenerHojaDocentes().getDataRange().getValues().slice(1).forEach(r => {
    docentesPorRfc[String(r[0]).trim().toUpperCase()] = r;
  });

  const hoja = obtenerHojaInscripciones();
  const datos = hoja.getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);

  let enviados = 0, pospuestos = 0, sinCuota = false;
  for (let i = 1; i < datos.length; i++) {
    const row = datos[i];
    const filaCurso = cursosPorId[String(row[cols.ID_Curso]).trim().toUpperCase()];
    if (!filaCurso) continue;

    const nuevoConteo = decidirRecordatorioConstancia_(row, cols, filaCurso, ahora, hoy);
    if (!nuevoConteo) continue;

    const rfc = String(row[cols.RFC_Docente]).trim().toUpperCase();
    const docente = docentesPorRfc[rfc];
    const correo = docente ? String(docente[2]).trim() : '';
    if (!correo) continue;
    // Una vez que la cuota llega a la reserva ya no se vuelve a consultar
    // (antes: una llamada por folio, ~75 s por corrida) — solo se cuentan
    // los pendientes para el registro.
    if (sinCuota || MailApp.getRemainingDailyQuota() <= reservaCuota_(false)) {
      sinCuota = true; pospuestos++; continue;
    }

    const folio = String(row[cols.Folio]).trim();
    const mensaje = construirCorreoConstancia_(filaCurso, folio, nuevoConteo);
    if (!enviarCorreoIndividual_(correo, mensaje.asunto, mensaje.html)) { pospuestos++; continue; }
    enviados++;

    // En modo de prueba NO se marcan las columnas: el correo fue a la
    // dirección de prueba, el docente real debe recibirlo después.
    if (modoPrueba) continue;
    hoja.getRange(i + 1, cols.Constancia_recordatorios_enviados + 1).setValue(nuevoConteo);
    hoja.getRange(i + 1, cols.Fecha_ultimo_recordatorio_constancia + 1).setValue(ahora);
  }
  return { enviados: enviados, pospuestos: pospuestos };
}

// ── doGet ?action=constanciaInfo&folio=&t= : info previa a mostrar el
// formulario de carga (¿ya se recibió? ¿sigue abierto el plazo?). Respuesta
// mínima, igual criterio que confirmarDesdeCorreo_(): solo el nombre del
// curso. ──
function constanciaInfo_(folio, token) {
  folio = String(folio || '').trim();
  if (!folio || !token || String(token) !== tokenConstancia_(folio)) return { status: 'invalido' };

  const datos = obtenerHojaInscripciones().getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);
  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][cols.Folio]).trim() !== folio) continue;
    const curso = String(datos[i][cols.Nombre_Curso] || datos[i][cols.ID_Curso] || '');
    if (String(datos[i][cols.Constancia_recibida] || '').trim() === 'Sí') {
      return { status: 'ok', curso: curso, yaRecibida: true, abierta: false };
    }
    const filaCurso = obtenerFilaCurso_(obtenerHojaCursos(), String(datos[i][cols.ID_Curso]).trim().toUpperCase());
    const abierta = !!filaCurso && ventanaConstanciaAbierta_(filaCurso, soloFecha(new Date()));
    return { status: 'ok', curso: curso, yaRecibida: false, abierta: abierta };
  }
  return { status: 'invalido' };
}

// ── doPost {accion:'subirConstancia', folio, t, archivoBase64, archivoNombre,
// archivoTipo} : guarda el archivo en Drive y lo enlaza a la inscripción. ──
function subirConstancia_(d) {
  const folio = String(d.folio || '').trim();
  if (!folio || !d.t || String(d.t) !== tokenConstancia_(folio)) return { status: 'invalido' };
  if (!d.archivoBase64 || !d.archivoNombre) return { status: 'error', mensaje: 'Falta adjuntar el archivo.' };

  const hoja = obtenerHojaInscripciones();
  const datos = hoja.getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);

  for (let i = 1; i < datos.length; i++) {
    if (String(datos[i][cols.Folio]).trim() !== folio) continue;
    const curso = String(datos[i][cols.Nombre_Curso] || datos[i][cols.ID_Curso] || '');

    if (String(datos[i][cols.Constancia_recibida] || '').trim() === 'Sí') {
      return { status: 'ok', curso: curso, yaRecibida: true };
    }

    const filaCurso = obtenerFilaCurso_(obtenerHojaCursos(), String(datos[i][cols.ID_Curso]).trim().toUpperCase());
    if (!filaCurso || !ventanaConstanciaAbierta_(filaCurso, soloFecha(new Date()))) {
      return { status: 'cerrado' };
    }

    const bytes = Utilities.base64Decode(d.archivoBase64);
    if (bytes.length > TAMANO_MAX_CONSTANCIA_BYTES) {
      return { status: 'error', mensaje: 'El archivo es demasiado grande (máximo 8MB).' };
    }
    const mimeType = d.archivoTipo || 'application/octet-stream';
    const blob = Utilities.newBlob(bytes, mimeType, folio + ' — ' + d.archivoNombre);
    const archivo = obtenerCarpetaConstancias_().createFile(blob);
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const ahora = new Date();
    hoja.getRange(i + 1, cols.Constancia_recibida + 1).setValue('Sí');
    hoja.getRange(i + 1, cols.Fecha_recepcion_constancia + 1).setValue(ahora);
    hoja.getRange(i + 1, cols.Liga_constancia_drive + 1).setValue(archivo.getUrl());

    return { status: 'ok', curso: curso, yaRecibida: false };
  }
  return { status: 'invalido' };
}

function obtenerCarpetaConstancias_() {
  const carpetas = DriveApp.getFoldersByName(CARPETA_CONSTANCIAS);
  return carpetas.hasNext() ? carpetas.next() : DriveApp.createFolder(CARPETA_CONSTANCIAS);
}

// ── Menú: manda a la dirección de prueba el recordatorio de constancia de
// UN folio, sin aplicar reglas ni marcar columnas. ──
function fdMenuRecordatorioConstanciaPruebaFolio() {
  const ui = SpreadsheetApp.getUi();
  const correoPrueba = PropertiesService.getScriptProperties().getProperty('MODO_PRUEBA_CORREO');
  if (!correoPrueba) { ui.alert('Primero activa el modo de prueba (menú OTDE Formación).'); return; }

  const r = ui.prompt('Recordatorio de constancia de prueba', 'Folio de la inscripción (ej. OTDE-CAP-0270):', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const folio = r.getResponseText().trim().toUpperCase();

  const datos = obtenerHojaInscripciones().getDataRange().getValues();
  const cols = indicesPorEncabezado_(datos[0]);
  const row = datos.slice(1).find(x => String(x[cols.Folio]).trim().toUpperCase() === folio);
  if (!row) { ui.alert('No existe el folio ' + folio); return; }
  const filaCurso = obtenerFilaCurso_(obtenerHojaCursos(), String(row[cols.ID_Curso]).trim().toUpperCase());
  if (!filaCurso) { ui.alert('El curso de ese folio ya no está en la hoja Cursos.'); return; }
  if (!String(filaCurso[COL_LIGA_TUTORIAL_CONSTANCIA] || '').trim()) {
    ui.alert('Ese curso no tiene Liga_tutorial_constancia — no pide constancia.'); return;
  }

  const mensaje = construirCorreoConstancia_(filaCurso, folio, 1);
  const ok = enviarCorreoIndividual_(String(row[cols.Correo] || '(sin correo)'), mensaje.asunto, mensaje.html);
  ui.alert(ok ? 'Enviado a ' + correoPrueba + '.' : 'No se pudo enviar (revisa el registro de ejecución).');
}

// ── Instala los disparadores. Es seguro correrlo de nuevo — borra y
// vuelve a crear los dos activadores en vez de solo agregar si faltan,
// para que un cambio de intervalo (ej. de cada hora a cada 15 min) se
// aplique de verdad la próxima vez que se ejecute este menú. ──
function instalarRecordatoriosAutomaticos() {
  ScriptApp.getProjectTriggers().forEach(t => {
    const fn = t.getHandlerFunction();
    if (fn === 'enviarRecordatoriosDiarios' || fn === 'enviarRecordatoriosWebinar') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('enviarRecordatoriosDiarios').timeBased().everyDays(1).atHour(9).create();
  ScriptApp.newTrigger('enviarRecordatoriosWebinar').timeBased().everyMinutes(15).create();

  SpreadsheetApp.getUi().alert('Recordatorios automáticos instalados: uno diario (9am) y uno cada 15 minutos.');
}

// ── Quita los disparadores de recordatorios (no borra las columnas) ──
function desinstalarRecordatoriosAutomaticos() {
  const triggers = ScriptApp.getProjectTriggers();
  let quitados = 0;
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'enviarRecordatoriosDiarios' || t.getHandlerFunction() === 'enviarRecordatoriosWebinar') {
      ScriptApp.deleteTrigger(t);
      quitados++;
    }
  });
  SpreadsheetApp.getUi().alert(quitados + ' disparador(es) de recordatorios eliminado(s).');
}
