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
- El Excel tiene **una pestaña por meta**. OTDE solo reporta en **META 23** (Educación primaria: mantenimiento de equipos) y **META 25** (mejora de aprendizajes: todo lo demás). Las pestañas 24, 81 y 83 no son de OTDE.
- Cada pestaña tiene un encabezado (periodo, fecha, proyecto, meta, indicador) y **filas de actividad de la 14 a la 30** (máximo 17 por meta), cada una con 7 campos: **Tipo y nombre de la actividad** (A:B) · **Fecha o periodo** (C) · **Responsable** (D) · **Lugar: sede, presencial o virtual** (E) · **Descripción** (F:I) · **Propósito u objetivo** (J:K) · **Número y tipo de beneficiarios** (L).
- La evidencia es **un PDF por mes** con todas las evidencias; en el Excel solo se anota su nombre (columna M de la primera fila).
- **No hay apartado de "no planeadas".** Toda actividad entra en META 23 o 25; por ejemplo, la reunión con CoEEE de septiembre quedó en META 25.
- **Planeación 2026-2027:** son 9 acciones (N.P. 1-9) y cada una dice su meta (N.P. 7 mantenimiento → 23; las demás → 25). Esa columna es la que conecta la planeación con la pestaña del reporte.

**Qué es:** un Sheet "Bitácora OTDE 2026-2027" con tres pestañas:
1. **`Planeacion`**: las 9 acciones del Word, con N.P., Acción, Mes, Recursos, Resultados esperados, Instrumento, Beneficiarios, Responsables, **Meta** (23/25) y Eje PDI. Se captura una vez por ciclo.
2. **`Actividades`**: una fila por cada cosa que se hizo. Las columnas calcan el Excel, más las que sirven para organizar:
   - **Meta** (23/25): se hereda del N.P.; si la actividad no está planeada, se elige.
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
2. **Fase 2 (oficios):** antes, que Jorge verifique Power Automate en su cuenta M365 (make.powerautomate.com) y comparta 1-2 oficios reales.

**Decisiones de construcción (24 sep):**
- **Clave de captura** (`CLAVE_CAPTURA`, se configura desde el menú con un cuadro de diálogo): la URL del backend es visible en el sitio público, así que sin clave cualquiera podría leer la planeación o meter actividades. Se escribe una vez por dispositivo.
- **La meta de una actividad planeada la decide la hoja `Planeacion`**, no el navegador. Las no planeadas eligen meta y anotan su origen.
- **Sin fotos ni evidencia en esta primera versión:** la evidencia sigue siendo un PDF por mes armado a mano.
- **`ID de envío` + `LockService`**: un reintento después de un timeout no duplica la actividad (`docs/QA-NOTES.md` #26/#31).
- **El reporte es una pestaña de Google Sheets, no un cuadro de texto para copiar:** copiar desde Sheets conserva los saltos de línea dentro de las celdas al pegar en Excel, y replica las combinaciones A:B, F:I y J:K.
