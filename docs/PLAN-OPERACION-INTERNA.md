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

**Qué es:** un Sheet "Bitácora OTDE 2026-2027" con tres pestañas:
1. **`Planeacion`**: las acciones del Word de planeación institucional, una fila por N.P., con los campos Acción, Mes, Recursos, Resultados esperados, Instrumento, Beneficiarios, Responsables y Vinculación SSII/PDI. Se captura una vez por ciclo.
2. **`Actividades`**: una fila por cada cosa que se hizo, planeada o no. Campos:
   - fecha y hora
   - tipo (reunión, visita, oficio atendido, capacitación, etc.)
   - descripción breve
   - **N.P. de la planeación** o **"No planeada — solicitud de estructura ascendente"**, con el origen (oficio, núm. de oficio)
   - CCT(s) / beneficiarios
   - responsable (Jorge / Nancy / técnico)
   - resultado
   - evidencia (foto o PDF a Drive)
3. **`Config`**: catálogos de tipos, responsables y ejes SSII/PDI.

**Captura (menos de 1 minuto):**
- **Webform móvil** para Jorge en territorio: dice qué hice, con qué escuela y adjunta la foto. Al elegir el N.P., la vinculación SSII/PDI, los recursos y el instrumento se heredan de la planeación, así no se escriben dos veces.
- Nancy captura desde la oficina en el mismo formulario lo que Jorge le dicte o reenvíe.

**Salida:**
- Menú **"OTDE → Generar reporte mensual"**. Copia una plantilla de Google Docs idéntica al formato oficial, llena la tabla con las actividades del mes y agrupa las no planeadas bajo su propio rubro. El resultado se descarga como Word.
- Incluye también un **resumen de avance de la planeación**: qué N.P. del mes se cumplieron y cuáles no. Hoy nadie lo lleva.

**Alimentación automática (segunda iteración de la misma fase):** los sistemas que ya existen escriben su propia fila en `Actividades`:
- visitas de mantenimiento (v8.5 / flujo nuevo)
- sesiones de Formación Docente
- ceremonias
- asesorías

Así lo que ya queda registrado no se vuelve a capturar.

**Qué necesito de Jorge antes de construir** (verificar con el material real, no suponer):
1. El Word de la **planeación institucional** 2026-2027 (aunque esté incompleto).
2. El Word del **reporte mensual** en blanco y uno ya entregado (por ejemplo, agosto o septiembre), para calcar las columnas exactas.
3. Saber si el reporte lo recibe alguien en Word editable o en PDF firmado.

**Archivos previstos:**
- Nuevo `seprn-sitio/apps-script/bitacora.gs` (patrón de `mantenimiento.gs`: webform + Sheet + Drive + Telegram), con su propio `?action=` protegido con token para que el Panel OTDE lo lea.
- Para la alimentación automática, evaluar primero el patrón `UrlFetchApp` del Panel (la bitácora lee de los trámites) antes que modificar cada backend para que escriba en la bitácora.
- Nueva página de captura móvil con el mismo estilo del sitio (probablemente privada o sin enlace, no en `otde.html` público).
- Plantilla de reporte en Google Docs.
- Reutilizar `js/cct-db.js` para el autocompletado de CCT.

**Verificación:**
- Capturar 5 actividades reales de esta semana (2 planeadas, 3 no planeadas, una con foto) desde el celular.
- Generar el reporte de septiembre con el menú.
- Compararlo lado a lado con el reporte hecho a mano.
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
Jorge comparte los Word de **planeación** y **reporte mensual** (en blanco y uno lleno). Con eso se diseñan la estructura exacta de `Actividades` y la plantilla del reporte, y se confirma antes de escribir código.
