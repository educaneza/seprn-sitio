# OTDE — Siguiente nivel operativo: de "procesos sueltos" a un solo registro de actividades

## Contexto

Los trámites hacia escuelas (correo, mantenimiento, soporte, asesorías, formación docente, ceremonias) ya están sistematizados y funcionan. Lo que sigue en papel o en la memoria de Jorge y Nancy es la **operación interna de la oficina**:

- **Oficios** que llegan al Outlook institucional, se turnan y se atienden en cuanto llegan. Cuando la reunión es días después, la escuela se olvida y se termina recordando por WhatsApp a través de la estructura.
- **Padrones de programas** (Cuantrix, Internet en una caja, MIED, Internet CFE, UNETE, Red Digital IEEM) en Excel sueltos. Es engorroso saber qué programas tiene una escuela, sobre todo desde el celular y en territorio.
- **Planeación institucional** (Word), **agenda mensual** (Outlook) y **reporte mensual** (Word) se llenan a mano y por separado. Casi todo lo que se hace en realidad (oficios, reuniones, visitas) no estaba planeado, así que el reporte se arma de memoria a fin de mes.

**Diagnóstico:** los tres documentos administrativos (planeación, agenda y reporte) y el seguimiento de oficios describen lo mismo: **actividades**. Hoy cada uno se captura por separado. La propuesta es capturar cada actividad **una sola vez**, en el momento en que ocurre, y que los documentos salgan de esa captura. Así el reporte mensual deja de ser trabajo extra.

**Prioridad elegida por Jorge:** el reporte mensual. Por eso la Fase 1 es la **Bitácora única de actividades**, que además sirve de base para todo lo demás.

## Principios (los mismos que ya funcionan en el ecosistema)

- Una hoja de cálculo por dominio y un tablero como capa que las une (acuerdo del 5 de agosto; no se hace una hoja gigante).
- **La clave común es el CCT.** Ya existe `seprn-sitio/js/cct-db.js`, con 506 CCT, sector, zona y municipio. Se reutiliza, no se duplica.
- Captura desde el celular con un webform en Apps Script, con el mismo patrón que `apps-script/mantenimiento.gs` y `soporte-remoto.gs`, y avisos por Telegram (ya configurado en esos proyectos).
- Se trabaja por fases pequeñas y cada una se confirma antes de planear la siguiente.
- Límites que hay que tener presentes:
  - Apps Script no lee el buzón de Outlook institucional.
  - WhatsApp no tiene envío automático gratuito.
  - La cuota de MailApp es compartida con UNETE/Formación (sigue pendiente la decisión sobre Workspace antes del 6 de octubre).

## Arquitectura: un solo sistema para quien lo usa, piezas separadas por dentro

Hay dos caras que comparten los mismos datos de base:
- **Cara pública (`oficina-virtual.html` / `otde.html`):** lo que usan escuelas, supervisiones y directores (correo, mantenimiento, soporte, asesorías, formación, ceremonias). No cambia.
- **Cara interna (Panel OTDE, ya existe y se amplía):** `apps-script/panel-otde.gs` (ago 2026) ya junta en un Sheet propio los pendientes de Mantenimiento, Asesorías, Soporte y Correo vía `?action=pendientes&token=...` (ver `docs/ARCHITECTURE.md §20`). Ese es el punto de crecimiento: la bitácora, los oficios, el padrón y el tablero se suman al Panel reutilizando el mismo patrón de endpoint con token (`PANEL_TOKEN`). **No se crea un panel nuevo.**

Tres cosas se unifican:
1. **Catálogo de escuelas:** `cct-db` más el padrón de programas, con el CCT como clave común.
2. **Bitácora:** todos los sistemas escriben ahí lo que ocurrió.
3. **Tablero:** lee todas las hojas.

Cada trámite conserva su propio Sheet y su propio Apps Script por cuatro razones:
- Si falla uno, no se caen los demás.
- Las cuotas y límites de Apps Script se reparten entre proyectos.
- Cada persona ve solo lo suyo.
- Cada pieza se puede ajustar por ciclo escolar.

Esto es coherente con la decisión del 5 de agosto (una hoja por dominio y el tablero como capa que une). No es un cambio de arquitectura.

## Ruta completa (visión) y fase en detalle

### Fase 1 — Bitácora única y reporte mensual automático ⬅ se planea a detalle ahora

**Formato real verificado (24 sep 2026)** con los insumos en `docs/insumos/` (locales, no se publican):
- **El reporte mensual no es un Word.** Es un **Excel compartido con la Oficina de Planeación en SharePoint M365**. Cada mes se usa un archivo nuevo a partir de la plantilla.
- El Excel tiene **una pestaña por meta**. OTDE solo reporta en **META 21** (Educación primaria: mantenimiento de equipos) y **META 23** (mejora de aprendizajes: todo lo demás). Hasta el 29 sep 2026 eran la **23** y la **25**: Planeación renumeró las metas y la bitácora ya se ajustó (`docs/ARCHITECTURE.md §26`). La plantilla verificada el 24 sep todavía tiene pestañas 23/24/25/81/83; confirmar los nombres de las pestañas en la plantilla nueva.
- Cada pestaña tiene un encabezado (periodo, fecha, proyecto, meta, indicador) y **filas de actividad de la 14 a la 30** (máximo 17 por meta), cada una con 7 campos: **Tipo y nombre de la actividad** (A:B) · **Fecha o periodo** (C) · **Responsable** (D) · **Lugar: sede, presencial o virtual** (E) · **Descripción** (F:I) · **Propósito u objetivo** (J:K) · **Número y tipo de beneficiarios** (L).
- La evidencia es **un PDF por mes** con todas las evidencias; en el Excel solo se anota su nombre (columna M de la primera fila).
- **No hay apartado de "no planeadas".** Toda actividad entra en META 21 o 23; por ejemplo, la reunión con CoEEE de septiembre (reportada entonces en la META 25) hoy está en la 23.
- **Planeación 2026-2027:** son 13 acciones (N.P. 1-13; la 10-13 se agregaron el 29 sep) y cada una dice su meta (N.P. 7 mantenimiento → 21; las demás → 23). Esa columna es la que conecta la planeación con la pestaña del reporte.

**Qué es:** un Sheet "Bitácora OTDE 2026-2027" con tres pestañas:
1. **`Planeacion`**: las 13 acciones del Word revisado, con N.P., Acción, Mes, Recursos, Resultados esperados, Instrumento, Beneficiarios, Responsables, **Meta** (21/23) y Eje PDI (ejes del PDI 23-29, con número). Se captura una vez por ciclo.
2. **`Actividades`**: una fila por cada cosa que se hizo. Las columnas calcan el Excel, más las que sirven para organizar:
   - **Meta** (21/23): se hereda del N.P.; si la actividad no está planeada, se elige.
   - **N.P.** de la planeación, o "No planeada" con su origen (oficio o convocatoria).
   - Tipo y nombre · Fecha (día o periodo; el texto "Los días 13 y 14 de enero" se genera solo) · Responsable (OTDE, UNETE, CoEEE, CUANTRIX, etc.) · Modalidad (presencial, virtual o híbrida) y sede o CCT (con autocompletado de `cct-db`) · Descripción · Propósito · Beneficiarios.
   - Capturó (Jorge o Nancy) y marca de tiempo.
3. **`Config`**: catálogos de responsables y modalidades, más el encabezado de cada meta (proyecto e indicador).

**Captura:**
- **Webform móvil** para Jorge en territorio y el mismo formulario para Nancy en la oficina.
- Al elegir el N.P., se proponen como borrador el **Propósito** (a partir de "Resultados esperados") y los **Beneficiarios** de la planeación. Se editan antes de guardar, para no redactar desde cero en el celular.
- La **Descripción** se redacta en el formulario. El lugar (sede) se arma sola a partir del CCT: "Presencial en la Escuela Primaria …, C.C.T. …, Zona …, Sector …".

**Salida:**
- Menú **"OTDE → Reporte del mes"**: se elige el mes y aparece un diálogo con **un bloque por meta (23 y 25)**. Cada bloque trae las filas en orden de fecha, **con celdas vacías en B, G, H, I y K** para respetar las celdas combinadas. Se copia y se pega en la fila 14 de la pestaña correspondiente en SharePoint.
- Avisa si una meta pasa de 17 actividades (el formato solo tiene de la fila 14 a la 30).
- Muestra los datos del encabezado (mes, año, fecha) para llenarlos a mano.
- Incluye un **resumen de avance de la planeación** (qué N.P. tuvieron actividad en el mes). Este resumen es solo para OTDE; no va en el Excel.
- **El PDF de evidencia** sigue armándose a mano por ahora. Una mejora posterior podría juntar las fotos de las actividades del mes en un solo PDF.

**Alimentación automática (segunda iteración de la misma fase):** los sistemas que ya existen escriben su propia fila en `Actividades`:
- visitas de mantenimiento (v8.5 / flujo nuevo)
- sesiones de Formación Docente
- ceremonias
- asesorías

Así lo que ya queda registrado no se vuelve a capturar.

**Archivos previstos:**
- `seprn-sitio/apps-script/bitacora.gs` (patrón de `mantenimiento.gs`: webform + Sheet). El `?action=` para el Panel OTDE se deja para la Fase 5.
- `bitacora.html`: página de captura móvil con el estilo de `reporte-visita.html` (sin enlace, `noindex`).
- Reutilizar `js/cct-db.js` para el autocompletado de CCT.
- ~~Plantilla de reporte en Google Docs~~: se descartó, porque el reporte es Excel en SharePoint.

**Verificación:**
- Capturar las 5 actividades de septiembre que ya están en el Excel entregado (META 25, filas 14-18).
- Generar el reporte de septiembre con el menú.
- Pegarlo en una copia de la plantilla en blanco y compararlo celda por celda con el entregado.
- Lo da por bueno Jorge; Nancy lo prueba en la oficina.

### Fase 2 — Control de oficios y recordatorios (siguiente, se planea después)
- Nancy registra el oficio en un formulario corto con estos datos:
  - número y remitente
  - programa
  - asunto
  - fecha y hora del evento
  - CCT convocados (seleccionados desde el padrón)
  - a quién se turna
  - PDF del oficio
- **Recordatorios programados** (1 a 3 días antes y el mismo día a las 7 am):
  - Telegram a Nancy y Jorge con el **texto de WhatsApp ya redactado** y la lista de destinatarios, listo para copiar y pegar en los grupos. El envío automático por WhatsApp no es viable sin un servicio de pago.
  - Opcionalmente, un correo automático a los directores convocados, sujeto a la cuota de correo.
- Cuando el oficio se marca como "atendido", **crea su fila en la Bitácora** y alimenta el reporte sin captura extra.
- Pendiente de verificar: si la licencia M365 de @dee.edu.mx incluye Power Automate, podría enviar cada oficio que llega de ciertos remitentes directo al registro. Si no, Nancy lo captura a mano (unos 30 segundos).

**Ampliación acordada con Jorge (1 oct 2026): gestor de oficios con una sola puerta.** Jorge quiere un solo canal de entrada que alimente todo. Hoy captura en la bitácora los oficios de solicitud que llegan por la Oficina Virtual, y salen en el reporte aunque lo que se reporta es la acción (asesoría, mantenimiento…). Decisión:
- **Una sola puerta:** "Registrar oficio" (página propia con clave) o la Oficina Virtual cuando la solicitud ya llega por ahí, sin capturarla dos veces.
- **Por dentro, separado y conectado:** Sheet "Control de oficios" aparte de la bitácora, igual que Mantenimiento o Asesorías. **El oficio no va al reporte; la acción sí.** Mientras tanto, la columna "Va al reporte" de `Actividades` deja fuera los oficios ya capturados (`docs/ARCHITECTURE.md §26`).
- **Dos direcciones:** un oficio que **baja** (de instancias superiores) se atiende redactando oficios a sectores, zonas y escuelas; uno que **sube** (de la estructura) se atiende con una acción (mantenimiento, asesoría…).
- **Pasos, uno por sesión:**
  - **2A · Control:** las 10 columnas del Excel actual (N.P., No. de folio recibido de particular, Fecha de recepción, No. de oficio elaboración, Fecha de elaboración, Remitente, Asunto, Tipo de oficio, Quién recibió, Observaciones), más Dirección, Estatus, Forma de atención (oficio de salida / acción / solo conocimiento), Vínculo (folio de la Oficina Virtual o BIT-ID) y PDF en Drive. Se importa el histórico.
  - **2B · Oficina Virtual → control:** las solicitudes que traen oficio entran solas (patrón `?action=…Mes` + `PANEL_TOKEN`).
  - **2C · Redacción:** plantilla de Google Docs con membrete y consecutivo automático; borrador del oficio de salida para revisar, firmar y escanear. La firma y el sello siguen a mano.
  - **2D · Atendido → bitácora + recordatorios** (lo de arriba). *Atendido → bitácora en producción
    el 8 oct 2026; recordatorios pendientes.*
  - **2E · Archivo digital:** carpetas en Drive por ciclo y mes, búsqueda por remitente, asunto o folio.
- **Insumos para el 2A:** el Excel de control, 1-2 oficios reales (uno que baja y uno que sube), un oficio de salida con membrete y el formato del consecutivo, y la verificación de Power Automate.
- **2A en producción (8 oct 2026):** `apps-script/oficios.gs` + `oficios.html` (guía
  `docs/manual-oficios.html`). Respuestas de Jorge a las 5 preguntas: (1) dónde vive la lista:
  sin decidir, la reemplaza el sistema; (2) formato `228C0101110500T/4824/2026`; (3) se reinicia
  cada año calendario; (4) **la lista es de toda la Subdirección**: a OTDE le asignan un lote por
  año (2026: 4501-5000, último usado a mano 4831) y otro si se acaba, no necesariamente contiguo;
  (5) por número se anota Elabora, Asunto, Fecha de elaboración y una sola casilla de destino
  (Comisión / Sectores / CoEEE / Comisión sindical / Otro). Además: el "No. de folio recibido de
  particular" del Excel es el folio de **Oficialía de Partes** (sella y turna todo oficio). Detalle
  en `docs/ARCHITECTURE.md §31`.
- **2D y página única (8 oct 2026, en producción):** "crear la fila sin captura extra" no fue
  posible tal cual: el oficio no trae descripción, beneficiarios ni lugar, y muchas acciones ya
  llegan solas (crear otra fila las duplicaría). Quedó: responder con número = atendido; si no,
  "Marcar como atendido" → *ya llega sola* / *capturar la actividad* (precargada) / *solo
  conocimiento*. Jorge cuestionó que, en dos páginas, eso agregaba pasos; se resolvió con **una
  sola puerta**: `oficios.html` con pestañas Tomar número · Oficios · Actividad (bitácora
  integrada), una entrada, sin navegar entre páginas. Siguiente: 2B (que la Oficina Virtual
  registre y cierre sola lo que llega por ahí) y después los recordatorios.
- **Consecutivo compartido (dato nuevo de Jorge, 6 oct 2026; propuesta, ya construida en el 2A):** la lista de números de oficio asignada a OTDE la usan Jorge, Nancy, Alejandro y Marcos para **cualquier** documento (oficios, justificantes, comisiones…), no solo los oficios de salida. Si el gestor numerara por su cuenta mientras el resto sigue con la lista de siempre, habría números repetidos. Propuesta: un **"Tomar número"** compartido, con página corta con clave, para todo el equipo y cualquier tipo de documento. `LockService` evita repetidos; los números no usados se marcan "cancelado" y no se reutilizan; se importa la lista actual. El gestor (2C) tomaría su número de ahí. Se **adelantaría al 2A**, junto con el control, porque sirve desde el primer día. Antes, Jorge debe responder: (1) dónde vive hoy la lista; (2) el formato exacto del número (siglas, año); (3) cuándo se reinicia (año calendario, ciclo o nunca); (4) si alguna otra oficina usa la misma lista; (5) qué se anota hoy por cada número.

### Fase 3 — Padrón único de programas y consulta móvil
- Se consolidan los Excel en un Sheet "Padrón de programas": una fila por CCT × programa, con estatus y datos del programa (por ejemplo, número de servicio de Internet CFE o docentes UNETE).
- Página de consulta en el celular: se escribe el CCT o el nombre de la escuela y se ve la ficha con datos de `cct-db`, programas activos, últimas visitas y oficios relacionados.
- Es la misma fuente que usa la Fase 2 para elegir escuelas convocadas ("todas las escuelas de Internet CFE de la zona 12").

### Fase 4 — Agenda del mes sin doble captura
- Desde `Planeacion` (acciones del mes) y los oficios con fecha, se genera un **archivo .ics** que se importa en Outlook de una vez al inicio de mes. No se necesita API ni permisos especiales.
- Vista semanal "qué hay esta semana" enviada por Telegram cada lunes.

### Fase 5 — Tablero OTDE (la capa unificadora ya acordada)
- Evoluciona el Panel OTDE existente, no se construye aparte. Lee la Bitácora, los oficios, el padrón y los trámites existentes: pendientes, oficios por vencer, avance de la planeación y actividades por programa o zona.

## Siguiente paso concreto
Fase 1 construida (24 sep): `apps-script/bitacora.gs` y `bitacora.html`, probados localmente. Desplegada, publicada y **validada** el mismo día: las 5 actividades reales de septiembre (BIT-0001 a 0005) generaron un reporte que Jorge pegó en el Excel real de SharePoint sin problemas con las celdas combinadas. Mismo día: nombres cortos para las acciones en el formulario.

**24 sep (cont.): alimentación desde Mantenimiento en producción.** La bitácora jala los reportes de visita (`?action=reportesMes` de `mantenimiento.gs`, con `PANEL_TOKEN`) y crea una actividad por folio y mes en META 23 / N.P. 7. En el reporte se presenta como "Rehabilitación del Aula de Medios mediante mantenimiento preventivo y correctivo…". El técnico ahora captura docentes y alumnos para los Beneficiarios. Verificado con 4 visitas reales de septiembre, sin duplicados al repetir. Detalle en `docs/ARCHITECTURE.md §26`.

**Próxima sesión, en este orden:**
1. ~~**Alimentación automática** desde Mantenimiento~~ y ~~Asesorías resueltas → N.P. 8~~ (hecho el 24 sep; Asesorías usa las columnas *Fecha de realización* y *Asistentes* que Nancy llena al cerrar, y falta el primer caso real). La asesoría de IA (N.P. 9), Soporte y Correo siguen a mano. Texto original del paso:
   **Alimentación automática** (la segunda iteración de la Fase 1 descrita arriba). Empezar por Mantenimiento: al guardar un reporte de visita, `mantenimiento.gs` crea su actividad en `Actividades` (META 23, N.P. 7), con fecha, escuela/CCT y la descripción de la atención. Decidir el mecanismo: que `mantenimiento.gs` llame por `UrlFetchApp` al `doPost` de la bitácora (con la clave), o que la bitácora lea los reportes, como el Panel OTDE. Después, Asesorías resueltas → N.P. 8. Soporte y Correo no tienen acción en la planeación: preguntar a Jorge si se reportan.
2. **Alimentación desde Formación Docente, Soporte y Correo** (plan aprobado el 24 sep, ver la sección de abajo). Va **antes** de la Fase 2, por decisión de Jorge. ~~Pasos A (Formación Docente), B (Soporte) y C (Correo)~~ en producción el 6 oct 2026: plan completo. Sigue la Fase 2.
3. **Fase 2 (oficios):** ~~2A~~ en producción el 8 oct 2026 (ver Fase 2 arriba); sigue el 2B. Antes, que Jorge verifique Power Automate en su cuenta M365 (make.powerautomate.com) y comparta 1-2 oficios reales. Desde el 1 oct 2026 es un gestor de oficios con una sola puerta (pasos 2A-2E, ver Fase 2); Jorge decide si va antes que el paso A (Formación Docente).

## Alimentación desde Formación Docente, Soporte y Correo (plan aprobado el 24 sep 2026)

**Estrategia.** Es el mismo mecanismo que Mantenimiento y Asesorías: cada backend expone un endpoint de solo lectura `?action=<x>Mes&mes=AAAA-MM&token=…` (`PANEL_TOKEN`), la bitácora lo jala con `bitConsultarBackend_` y da de alta las filas con `bitAgregarActividades_` (`ID de envío` único, nunca pisa lo corregido a mano). "Generar reporte del mes" agrega una fuente más a su lista, y cada fuente tiene su menú "Traer…" y "Configurar conexión con…".

**Criterio de detalle (límite de 17 filas por meta):**
- **Eventos** (pocos al mes): una fila por evento. Aplica a Formación Docente.
- **Trámites de alto volumen:** una fila de **resumen mensual** con totales y desglose. Aplica a Soporte y Correo; caso por caso, en un mes normal llenarían las 17 filas.

**Decisiones de Jorge (24 sep):**
- Soporte va en **META 23** (atención a equipos, igual que mantenimiento) y Correo en **META 25**. Los dos entran como no planeados, con origen. *(Con la renumeración del 29 sep: Soporte → META 21 y Correo → META 23. Además, la planeación revisada ya tiene N.P. 12 para correo institucional, y N.P. 10 y 13 para formación a distancia y difusión de conferencias. Correo y parte de Formación Docente ya no serían "no planeados": revisar con Jorge antes del paso A.)*
- Un curso que dura varios meses aparece **en cada mes en que tiene desarrollo** (fechas de inicio y fin que se cruzan con el mes). `ID de envío` = `FD:<ID_Curso>:<AAAA-MM>`.
- Soporte y Correo, como **resumen mensual**.
- Todo esto va **antes** de la Fase 2.

**Qué hay hoy (revisado en el código el 24 sep):**
- **Formación Docente:** `Cursos` tiene fechas de inicio y fin, `Responsable`, `Categoria`, `Descripcion`, `Dirigido_a` y `Modalidad`. `Inscripciones` tiene los inscritos por `ID_Curso` con `Sector`/`Zona` y, en UNETE, `Constancia_recibida`. No tiene endpoint con token ni un vínculo con la planeación.
- **Soporte (`soporte-remoto.gs`):** fecha de la solicitud, `Tipo de ayuda`, `Urgencia`, CCT, sector, `Función/Cargo` y `Estatus`. **No guarda la fecha de resolución**: `sopOnEditCierre` solo anota "Sí" en `Notificación de cierre enviada`.
- **Correo (`correo/`):** una hoja por tipo, con `Fecha de entrega` en Alta, Cambio de Contraseña, Reset 2FA y Cambio+Reset, y `Estado general`. Falta confirmar si Incidencias tiene una fecha de cierre equivalente.

**Pasos (uno por sesión, cada uno verificado en vivo antes del siguiente):**

**A. Formación Docente → una fila por curso y mes** (hecho el 6 oct 2026, en producción y probado por Jorge). Cambio respecto a lo planeado: como la planeación ya tiene N.P. 5, 10 y 13, casi todos los cursos entran como **planeados** con el N.P. de `NP_planeacion`, y el propósito sale de "Propósito sugerido", no de "Resultados esperados". Sin N.P., no planeado en META 23 con el propósito del N.P. 10 si la descripción no empieza con verbo. Detalle en `docs/ARCHITECTURE.md §26`. Plan original:
- `formacion-docente.gs`:
  - Columna nueva opcional en `Cursos`: **`NP_planeacion`**, al final, con el auto-heal de `obtenerHojaCursos()`.
  - `PANEL_TOKEN` (función de configuración con cuadro de diálogo, no argumento: QA-NOTES #14).
  - Endpoint `?action=cursosMes`: cursos cuyo desarrollo se cruza con el mes, con los inscritos totales y por sector, y las constancias recibidas si aplica.
- `bitacora.gs`: fuente "Formación Docente" (`FD_URL`).
  - N.P. = `NP_planeacion`; la meta sale de `Planeacion`. Si está vacía, queda como no planeada en META 23, con origen "Convocatoria de <Responsable>".
  - Tipo: "<Categoría>: <Nombre>". Fecha: la parte del curso que cae en el mes. Responsable: `Responsable`. Lugar: "Virtual, a través de …" según `Modalidad`.
  - Descripción: `Descripcion` más la difusión y el registro por OTDE. Propósito: "Resultados esperados" del N.P., o `Descripcion` si no tiene N.P.
  - Beneficiarios: "N docentes inscritos" con desglose por sector, más "N constancias recibidas" en UNETE.
- Verificación: `ACF-2627-001` (IA) y la conferencia UNETE `CNF-2627-001` (119 inscritos) en su mes; la segunda corrida debe dar 0 nuevas.

**B. Soporte → META 21, resumen mensual** (hecho el 6 oct 2026, en producción y probado por Jorge). Agregado al plan: el resumen es **regenerable** (se actualiza al volver a traerlo, salvo que se haya corregido a mano), porque se puede traer antes de que acabe el mes; el paso C puede usar lo mismo. Detalle en `docs/ARCHITECTURE.md §26`. Plan original:
- `soporte-remoto.gs`: columna `Fecha de atención`, que `sopOnEditCierre` llena sola al marcar Resuelto, y endpoint `?action=soporteMes`.
- `bitacora.gs`: una fila por mes (`ID de envío` `SOP:<AAAA-MM>`).
  - Descripción: "Se atendieron N solicitudes: por tipo de ayuda…, en los sectores…".
  - Beneficiarios: por función (docentes, directores, administrativos).
- Las resueltas antes de este cambio no tienen fecha de atención. Se usa la fecha de la solicitud y se avisa.

**C. Correo → META 23, N.P. 12 (acción propia desde el 29 sep), resumen mensual** (hecho el 6 oct 2026, en producción y probado por Jorge). Entra como **planeada** (N.P. 12) y regenerable como Soporte. Incidencias sí tiene "Fecha de entrega" (se anota al resolverla), así que las 5 hojas se cuentan igual y no hizo falta columna nueva. Detalle en `docs/ARCHITECTURE.md §26`. Plan original:
- `correo/WebApp.gs`: endpoint `?action=correoMes` que junta las 5 hojas por `Fecha de entrega`. Antes, revisar la fecha de cierre de Incidencias.
- `bitacora.gs`: una fila por mes (`CORREO:<AAAA-MM>`).
  - Descripción: "Gestión de cuentas de correo institucional ante SIGEE: N altas, N cambios de contraseña, N eliminaciones de método de autenticación, N combinados, N incidencias resueltas".
  - Beneficiarios: el total.

**D. Fuera de este plan:** si Mantenimiento se acerca a 17 visitas en un mes (el reporte ya avisa), decidir si se agrupan. La asesoría de IA (N.P. 9) sigue a mano hasta que haya solicitudes reales.

**Editar la planeación en el Sheet (respuesta a Jorge, 24 sep):** sí se puede. La hoja `Planeacion` manda y se lee en cada consulta; el formulario de la bitácora no la guarda en el navegador. Hay 4 cuidados:
- Una acción nueva lleva `N.P.` único y `Meta` 21 o 23. Su "Nombre corto" se escribe a mano (el automático solo existe para las 13 de la semilla).
- No insertar ni reordenar columnas antes de "Nombre corto": `bitLeerPlaneacion_` las lee por posición. Agregar filas o editar textos sí se puede.
- No cambiar el número de los N.P. 7 y 8: la alimentación automática de Mantenimiento y Asesorías los busca por número (`BIT_NP_MANTENIMIENTO`, `BIT_NP_ASESORIAS`).
- Si se cambia la meta de una acción, las actividades ya registradas conservan la que tenían.

**Decisiones de construcción (24 sep):**
- **Clave de captura** (`CLAVE_CAPTURA`, se configura desde el menú con un cuadro de diálogo): la URL del backend es visible en el sitio público, así que sin clave cualquiera podría leer la planeación o meter actividades. Se escribe una vez por dispositivo.
- **La meta de una actividad planeada la decide la hoja `Planeacion`**, no el navegador. Las no planeadas eligen meta y anotan su origen.
- **Sin fotos ni evidencia en esta primera versión:** la evidencia sigue siendo un PDF por mes armado a mano.
- **`ID de envío` + `LockService`**: un reintento después de un timeout no duplica la actividad (`docs/QA-NOTES.md` #26/#31).
- **El reporte es una pestaña de Google Sheets, no un cuadro de texto para copiar:** copiar desde Sheets conserva los saltos de línea dentro de las celdas al pegar en Excel, y replica las combinaciones A:B, F:I y J:K.
