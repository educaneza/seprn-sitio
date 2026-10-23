# Detalle de sistemas — SEPRN

Detalle por página y por backend que antes vivía en `CLAUDE.md` (movido aquí el 19 oct 2026
porque `CLAUDE.md` pasó el límite de 150k caracteres que Claude Code carga en cada sesión).
`CLAUDE.md` conserva un resumen de cada sistema con sus trampas vigentes y apunta aquí; este
archivo guarda el historial completo (fechas de despliegue, versiones, decisiones y bugs) tal
como estaba. Para la arquitectura técnica, ver `docs/ARCHITECTURE.md`; para el historial de
sesiones, `docs/BITACORA.md`.

**Al cerrar sesión**: si cambia un sistema, actualizar su sección aquí (detalle) y, solo si cambia
una regla o trampa que hay que saber siempre, su resumen en `CLAUDE.md`.

## Páginas del sitio (tabla completa)
| Archivo | Sección |
|---|---|
| `index.html` | Portada — hero midnight, métricas animadas, áreas, mapa SVG |
| `nosotros.html` | Misión, visión, valores, equipo directivo (hero midnight) |
| `areas.html` | Listado de áreas (hero midnight) |
| `cte.html` | Sesiones CTE — acordeones + videos YouTube (hero midnight) |
| `contacto.html` | Datos de contacto (hero midnight) |
| `academica.html` | Subjefatura Académica |
| `personal.html` | Subjefatura de Personal |
| `planeacion.html` | Subjefatura de Planeación |
| `recursos.html` | Subjefatura de Recursos |
| `otde.html` | Oficina de Tecnología (OTDE) — hoy solo Licencias Office, Chuka y Recursos (los 4 trámites con formulario propio ya migraron a páginas propias, ver abajo) |
| `asesorias.html` | Solicitud de Asesorías en TICCAD (Banco de Materiales/Chuka) — página propia, migrada desde la tab "Asesorías" de `otde.html` el 27 ago 2026 (ver `docs/ARCHITECTURE.md` y `apps-script/asesorias.gs` abajo). Header/nav/footer institucional completo (reusa `styles.css`), sin entrada en nav/footer del sitio — se llega vía `oficina-virtual.html` |
| `mantenimiento.html` | Solicitud de Mantenimiento Preventivo y Correctivo — página propia, migrada desde la tab "Mantenimiento" de `otde.html` el 27 ago 2026, mismo patrón que `asesorias.html` (ver `docs/ARCHITECTURE.md` y `apps-script/mantenimiento.gs` abajo) |
| `soporte.html` | Solicitud de Soporte Técnico Remoto (vía TeamViewer) — página propia, migrada desde la tab "Soporte Técnico" de `otde.html` el 27 ago 2026, mismo patrón que `asesorias.html`/`mantenimiento.html` (ver `docs/ARCHITECTURE.md` y `apps-script/soporte-remoto.gs` abajo) |
| `correo.html` | Correo Institucional — Alta de cuenta / Cambio de contraseña / Eliminar método de autenticación / Incidencias — página propia, migrada desde la tab "Correo Institucional" de `otde.html` el 27 ago 2026, última de las 4 migraciones (ver `docs/ARCHITECTURE.md` y `apps-script/correo/` abajo) |
| `oficina-virtual.html` | Oficina Virtual OTDE — hub de servicios digitales (Formación Docente, Mantenimiento, Asesorías, Correo, Soporte) + consulta de estatus de solicitudes por folio |
| `oeve.html` | Oficina de Extensión y Vinculación |
| `juridico.html` | Oficina Jurídica |
| `reporte-visita.html` | Formulario de captura del técnico tras una visita de Mantenimiento — reemplaza el llenado a mano de "Reportes de visita" en el Sheet, ver `apps-script/mantenimiento.gs` abajo. Sin entrada en nav/footer, se comparte por link directo |
| `bitacora.html` | Bitácora de actividades de OTDE (uso interno, Jorge y Nancy) — captura cada actividad una vez para armar el reporte mensual de Planeación. Protegida con clave de captura (`CLAVE_CAPTURA`), `noindex`, sin entrada en nav/footer. Backend `apps-script/bitacora.gs`; ver `docs/PLAN-OPERACION-INTERNA.md` Fase 1. **Desde el 8 oct 2026 también vive como pestaña "Actividad" de `oficios.html`** (`?embed=1`: sin encabezado, avisa su alto y eventos a la página contenedora por `postMessage`); sigue funcionando sola. `?oficio=OF-NNNN` precarga la actividad de un oficio y lo marca atendido al guardar (ver `docs/ARCHITECTURE.md §31`) |
| `oficios.html` | **Oficina interna OTDE** (oct 2026, uso interno de Jorge, Nancy, Alejandro y Marcos) — página única con 3 pestañas: **Tomar número** (consecutivo compartido por lotes; desde el 12 oct 2026 por tipo de documento, comisiones por persona × día con oficio en Word y "Reasignar / corregir"; carga `js/cct-db.js` y `js/escuelas-direcciones.js`), **Oficios** (registrar los recibidos — por Oficialía o internos sin folio, desde el 14 oct 2026 — + lista con chips Por atender / Falta folio / Todos y un "Siguiente paso" por oficio + "Marcar como atendido") y **Actividad** (la bitácora integrada, `bitacora.html?embed=1`, solo Jorge y Nancy). Una sola entrada con clave (`CLAVE_CAPTURA`), `noindex`, sin entrada en nav/footer. Backend `apps-script/oficios.gs`; guía visual `docs/manual-oficios.html`. Ver sección del backend abajo |
| `charla-ia.html` | Página del evento IA jun 2026 (sin formulario) |
| `formacion-docente.html` | Centro de Formación Docente — catálogo dinámico (webinars, seminarios, diplomados, cursos autogestivos, acciones formativas, proyectos didácticos) + registro. Diseño premium propio (ver `docs/DESIGN_SYSTEM.md`) |
| `instructivo-formacion-docente.html` | Guía imprimible del Centro de Formación Docente, mismo sistema tipográfico que la página anterior |
| `excel-facil.html` | Excel fácil (oct 2026) — herramienta 100% local para docentes/administrativos: duplicados, filtrar por zona/sector, validar RFC/CURP/CCT, combinar correspondencia con Word, fórmulas e IA/Copilot (los 6 temas de "Excel básico" de `asesorias.html`). Autónoma (sin `styles.css`), un solo archivo de ~1.2 MB con SheetJS/JSZip 2.6.1/docxtemplater **incrustados** para funcionar sin internet; ningún dato sale del navegador. Sin entrada en nav/footer, link directo. Desde el 16 oct 2026 lleva la identidad institucional (ver "Herramientas OTDE autónomas" abajo de esta tabla); el hero solo se muestra en `#inicio`. El 20 oct 2026 se alineó con la asesoría "Excel básico": hoja «Escuelas» y 7 retos en el archivo de práctica, rutas de menú en "Aprende a hacerlo tú" (módulos 1-3) y aviso de que BUSCARX no existe en Excel 2019. Ver `docs/ARCHITECTURE.md §30` |
| `crea-tu-app.html` | Crea tu app educativa (oct 2026) — generador de prompts del proyecto "Banco de Materiales 2.0": el docente elige grado, campo formativo, contenido y PDA, tipo de app (9) y crédito, y obtiene el prompt para que una IA (Arena/Gemini/ChatGPT/Claude) haga una app HTML de un solo archivo que funciona sin internet. No llama a ninguna IA ni guarda nada. Autónoma (sin `styles.css`, ~318 KB) con el catálogo SEP incrustado (`CATALOGO_SEP`: 246 contenidos y 1,339 PDA de Fases 3-5, formato `{fase: {campo: [[contenido, [PDA grado impar], [PDA grado par]]]}}`, tomado del JSON del proyecto personal `programa-sintetico-nem`, texto oficial de los programas sintéticos). Sin entrada en nav/footer, link directo. Identidad institucional desde el 16 oct 2026 (ver "Herramientas OTDE autónomas" abajo de esta tabla) |
| `apps-educativas/*.html` | Apps de muestra del Banco de Materiales 2.0 (oct 2026), una por campo formativo: `fracciones-pizza.html` (3°), `plato-del-bien-comer.html` (2°), `derechos-de-la-ninez.html` (5°). Cada una es un solo archivo sin recursos externos, con crédito y licencia CC BY-NC-SA 4.0 al pie (licencia pendiente de confirmar por Jorge). Enlazadas desde `crea-tu-app.html` |

**Herramientas OTDE autónomas (`excel-facil.html`, `crea-tu-app.html`) — identidad institucional
(16 oct 2026, decisión de Jorge):** como acciones de OTDE, llevan el encabezado, el hero midnight y
el pie del sitio, pero **copiados dentro de cada archivo** (bloque CSS con prefijo `inst-`, junto
con `.inst-header`/`.inst-hero`/`.inst-footer` y el script del menú móvil) en vez de ligar
`styles.css`, para que sigan funcionando solas y sin internet. Los enlaces del encabezado y el pie
usan URL absoluta (`https://educaneza.github.io/seprn-sitio/...`) para que sirvan también desde una
copia guardada. Montserrat se carga de Google Fonts con caída a la letra del sistema sin conexión.
Si cambia el encabezado o el pie del sitio, actualizar también estas dos copias. Las **apps
educativas** (`apps-educativas/` y las que hagan los docentes) **no** llevan estilo institucional:
diseño libre para niños, solo el sello de crédito al pie.
| `404.html` | Página de error personalizada |
| `protocolos.html` | Protocolos de Actuación — hub con 3 protocolos oficiales del Estado de México/SEIEM (ver sección propia abajo) |
| `ceremonias-civicas.html` | Ceremonias Cívicas — reserva de visitas de jefes/docentes SEPRN-wide (no un trámite de OTDE), histórico, cobertura y panel por clave (ver sección propia abajo) |
| `ficha-ceremonias-civicas.html` | Ficha post-visita de Ceremonias Cívicas, localizada por folio — sin entrada en nav/footer, se comparte por link directo (ver sección propia abajo) |
| `estrategias-nacionales.html` | Estrategias Nacionales — selección mensual de escuelas por estrategia (Oficina de Programas Educativos, Subjefatura Académica). Se llega desde la tarjeta de la oficina en `academica.html`, sin entrada en nav/footer. Backend `apps-script/estrategias-nacionales.gs` (ver abajo) |
| `agenda-prototipo.html` | Agenda SEPRN — **prototipo** (21 oct 2026) del tablero tipo aeropuerto que propuso la Subjefatura de Planeación para sustituir su calendario compartido de Outlook. Sin backend: datos de ejemplo de noviembre 2026 incrustados, nada se guarda. `noindex`, fuera de nav/footer, franja visible de prototipo. Pestañas Hoy (con modo pantalla para TV), Semana, Mes, Planeación (corte, choques, CSV) y Capturar. Pendiente de validar con Planeación; versión real en `docs/ROADMAP.md` ítem 37 |

**Documentación interna adicional en `docs/`:** `ARCHITECTURE.md` (arquitectura técnica), `ROADMAP.md` (scores UX/UI + pendientes por feature), `DESIGN_SYSTEM.md` (tokens/patrones del rediseño premium de Formación Docente), `QA-NOTES.md` (bugs reales ya cazados, con causa raíz — consultar antes de escribir un `fetch()` o un `appendRow()` nuevo), `manual-formacion-docente.html` / `manual-sistema-registro.html` / `manual-bases-tramites.html` (manuales operativos visuales para quien administra cada Sheet — el último es semáforo de qué llenar/tocar-con-cuidado/no-tocar por columna, un trámite por sección).

## Páginas eliminadas (recrear cuando haya contenido validado)
- `gestion-escolar.html`
- `investigacion-educativa.html`
- `programas-educativos.html`
- `servicio-profesional.html`

## Páginas retiradas definitivamente (no recrear)
- `jornada-verano-2026.html` e `instructivo-jornada-verano-2026.html` — eliminadas el 13 jul 2026: cerró el periodo de inscripciones a la Jornada de Capacitación Verano 2026 y ya nadie debe/puede llegar a ese wizard. El backend que usaban (`apps-script/formacion-docente.gs`) sigue vivo porque también sirve a `formacion-docente.html`; solo se perdió la parte de esas 2 páginas. Patrones que nacieron ahí (autocomplete de CCT con fallback manual por campo, `fetchJsonConTimeout()`, Title Case en Nombre/Escuela) siguen documentados en `docs/ARCHITECTURE.md` porque se reutilizan en `otde.html` y `formacion-docente.html`.

## Páginas retiradas (se pueden rehacer)
- `asistencia.html` — check-in con QR/PIN del evento IA de jun 2026, retirada el 14 oct 2026: sin
  uso desde el evento y su backend (`apps-script/conferencia-ia.gs`) ya respondía 403. Jorge no
  descarta replicarla o mejorarla para un evento futuro: recuperarla con
  `git show 7a1f171:asistencia.html` (último commit donde existe). El `.gs` se queda en el repo.


## Backend (Apps Script)

### `apps-script/conferencia-ia.gs`
- Conectado a Google Sheets (`Registros_IA_2026`)
- Funciones clave: `doPost` (registro), `doGet` (cupo/checkin), `reenviarConfirmacionListaEspera` (post-evento)
- Para cambios: copiar el `.gs` completo en el editor de Apps Script y re-desplegar

### `apps-script/cursos-coeee-2026.gs`
- **Congelado desde jul 2026**: la extinta `jornada-verano-2026.html` (eliminada 13 jul 2026) hizo cutover a `apps-script/formacion-docente.gs` antes de retirarse. Este backend queda desplegado pero inactivo, como archivo histórico de lo ya capturado antes del corte
- Conectado a Google Sheets (hoja `Cursos_OTDE_Verano_2026`)
- Folio: `OTDE-V26-NNNN` (secuencial, autoincremental)
- Columnas A-K: Fecha | Folio | Nombre | RFC | Función | CCT | Sector | Zona | Escuela/Unidad | Curso | Correo
- Funciones: `doPost` (un registro por llamada), `generarEstadisticas` (ejecución manual → hoja resumen)
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario)

### `apps-script/soporte-remoto.gs`
- Conectado a Google Sheets (hoja `Solicitudes_Soporte_2026`, autocreada si no existe; el archivo de Drive que la contiene se llama "Soporte Técnico Remoto", **no** igual que la hoja interna)
- Folio: `OTDE-SOP-NNNN` (secuencial, autoincremental)
- Columnas A-P: Fecha | Folio | Nombre | CCT | Sector | Zona | Escuela/Unidad | Función/Cargo | WhatsApp | Correo | Descripción | Urgencia | Tipo de ayuda | Estatus | Notas de revisión | Notificación de cierre enviada (las últimas 3, ago 2026 — ver "Oficina Virtual OTDE" abajo). Después: Q `ID de envío` (sep 2026) y R `Fecha de atención` (oct 2026, la anota `sopOnEditCierre` al marcar Resuelto; la usa `?action=soporteMes` para la Bitácora OTDE, ver `bitacora.gs`)
- **CCT con autocomplete**: mismo patrón usado en `otde.html`/`formacion-docente.html` (`js/cct-db.js`, 506 registros) — funciones `sopSeleccionarCct`/`sopResetCct`/`sopActualizarZonas`/`sopActualizarTipoCct` (prefijo `sop` para no chocar con las de otras páginas). Si la CCT no está en la base, aparecen campos manuales de Tipo de CCT/Sector/Zona/Escuela (`#sop-manual-fields`) — ver `docs/ARCHITECTURE.md §11`
- **Función/Cargo** es un `<select>` que se repuebla según el tipo de CCT (`otdePoblarFuncion()`, ver `docs/ARCHITECTURE.md §11`) con campo libre si se elige "Otro"
- **Tipo de ayuda** (ago 2026, columna M): `<select>` obligatorio — Correo institucional, Office/Licencias, Impresora, Antivirus/Seguridad, Internet/Red, Equipo de cómputo (hardware), Otro — complementa, no reemplaza, la descripción libre
- WhatsApp y Correo son obligatorios (ago 2026: Correo pasó de opcional a obligatorio, es el medio principal de contacto). WhatsApp valida `/^\d{10}$/`, sin lada. La notificación de Telegram incluye un link `https://wa.me/52<whatsapp>` para abrir el chat con un tap
- El `<form>` usa `novalidate` + validación 100% en JS (`validarSoporteForm()`) — necesario porque los `type="email"`/`required` nativos interceptan el `submit` antes de correr el JS si no se desactiva la validación del navegador
- Al recibir `doPost`, además de guardar en Sheets envía una notificación push vía **bot de Telegram** (`notificarTelegram`); si Telegram falla, el registro en Sheets no se pierde (try/catch silencioso)
- Requiere Propiedades del script configuradas manualmente en el editor de Apps Script (Project Settings → Script Properties): `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` — instrucciones completas para obtenerlas están al final del propio archivo `.gs`
- **`TELEGRAM_CHAT_ID` apunta al chat_id personal de Alejandro (sep 2026)**, ya no al chat
  compartido de OTDE — Alejandro atiende Soporte y Mantenimiento, decisión de Jorge. Se agregó
  además `sopNotificarEquipoPorCorreo()` (correo a `SOP_CORREO_EQUIPO`), llamada junto al
  Telegram existente en `doPost`
- Usado por el formulario "Solicitar Soporte Técnico Remoto" en la pestaña Soporte Técnico de `otde.html`; responde `Content-Type: text/plain` para evitar preflight CORS
- URL del deployment vive en `otde.html` en la constante `SOPORTE_APPS_SCRIPT_URL`
- **Redesplegado (7 ago 2026, versión 4)**: mismo ID de implementación de siempre, no cambió `SOPORTE_APPS_SCRIPT_URL`. La columna `Tipo de ayuda` se agregó a mano al final de la hoja real (este proyecto no tenía auto-heal de encabezados, a diferencia de `mantenimiento.gs`/`formacion-docente.gs`)
- **Estatus + cierre automático + auto-heal (ago 2026, pendiente de redeploy)**: ya tiene el mismo mecanismo que Mantenimiento/Asesorías — dropdown de 5 valores en `Estatus`, trigger instalable `sopOnEditCierre` (correr `sopInstalarTriggerCierre()` una vez tras pegar esta versión, o el menú "OTDE Soporte" nuevo que agrega `onOpen()`), y ahora sí completa solo cualquier encabezado que falte en la hoja real. A diferencia de Mantenimiento/Asesorías, Soporte no tiene `Contactos_Zona_Sector` — el cierre solo notifica al solicitante, no a Zona/Sector (decisión deliberada, no un pendiente). Ver "Oficina Virtual OTDE" abajo para el endpoint de consulta que motivó este cambio.
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — **cuidado**: probar el endpoint con `curl -X POST`, o incluso desde un navegador headless con acceso real a internet (confirmado: el sandbox de pruebas SÍ tiene salida real a `script.google.com`), ejecuta `doPost` de verdad (escribe en Sheets y dispara Telegram). Para pruebas locales, interceptar la llamada de red (`page.route()` en Playwright) en vez de dejarla llegar al backend real
- **Modo de prueba (11 ago 2026; ya en producción — confirmado el 15 oct 2026 al comparar el editor con el repo)**: `sopEnviarCorreo_()` — mismo wrapper que `manEnviarCorreo_()`/`aseEnviarCorreo_()`, activable con `sopActivarModoPrueba('correo')`/`sopDesactivarModoPrueba()` — ya reemplaza el único `MailApp.sendEmail()` de este archivo (el de cierre al solicitante) en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue corriendo la versión sin modo de prueba
- **`?action=pendientes&token=...` (ago 2026)**: nuevo endpoint para el Panel OTDE (`apps-script/panel-otde.gs`, ver sección propia abajo) — regresa las solicitudes abiertas (Estatus ≠ Resuelto/Rechazado). Requiere `PANEL_TOKEN` en Propiedades del script, configurado con `sopConfigurarTokenPanel('secreto')` (correrla envuelta en una función temporal, no seleccionándola directo en ▶️ Ejecutar — ver `docs/QA-NOTES.md #14`). Detalle completo en `docs/ARCHITECTURE.md §20`
- **"Planchado" de la hoja — dropdowns + semáforo + protección de solo aviso (desplegado y
  verificado en vivo, 3 sep 2026)**: `sopConfigurarValidacionYSemaforo()`, mismo patrón que
  Mantenimiento/Asesorías/Correo. `Estatus` ya tenía dropdown duro desde antes — esta ronda solo
  le agregó el semáforo de color (mismos 5 colores). Dropdowns suaves nuevos en `Urgencia`
  (Alta/Media/Baja) y `Tipo de ayuda` (7 valores, catálogos confirmados contra los `<select>`
  reales de `soporte.html`), protección de solo aviso en `Fecha`/`Folio`/`Notificación de cierre
  enviada`. Sin `Contactos_Zona_Sector` ni Oficio en este trámite, nada más que proteger. Item
  nuevo `.addItem('Aplicar validación y semáforo', 'sopConfigurarValidacionYSemaforo')` en el
  menú "OTDE Soporte". Pegado y corrido en el proyecto real vía Chrome automatizado ("Se
  completó la ejecución" sin errores) y verificado en vivo contra `Solicitudes_Soporte_2026`:
  dropdown real de `Estatus` (5 valores) con semáforo verde sobre una fila ya resuelta, y
  dropdowns visibles en `Urgencia`/`Tipo de ayuda`. Sin probar el diálogo de protección de solo
  aviso en esta ronda. Ver `docs/ARCHITECTURE.md §24`.
- **Alta a prueba de reintentos (25 sep 2026, en producción y verificado en vivo)**: mismo patrón
  que Mantenimiento/Asesorías (`sopBuscarEnvioPrevio_`, `ID de envío` en la columna Q; el
  respaldo sin ID compara CCT + correo + descripción). Ver `docs/ARCHITECTURE.md §27`.
- **Columnas por nombre y orden por bloques (15 oct 2026, en producción y verificado en vivo,
  versión 13)**: mismo patrón que Asesorías/Mantenimiento (`ENCABEZADOS_SOPORTE` en el orden de
  `soporte.html`, mapa `SOP`, `sopFilasCanonicas_()`/`sopCol_()`; ya no hay `COL_SOP_*`, así que
  `ID de envío` ya no está en la Q). Menú "OTDE Soporte → Reordenar columnas"
  (`sopReordenarColumnas_()`), ya corrido en producción. "Fecha de atención" ya no depende de
  estar en la columna R: si falta, `sopOnEditCierre` la agrega al final. Ver
  `docs/ARCHITECTURE.md §33`.

### `apps-script/mantenimiento.gs`
- **Nuevo (ago 2026)**: conectado a un Google Sheet propio (hojas `Solicitudes` y
  `Contactos_Zona_Sector`, ambas autocreadas si no existen)
- Folio: `OTDE-MAN-NNNN` (secuencial, autoincremental, mismo patrón que `soporte-remoto.gs`)
- **No sustituye el oficio de solicitud** — Jorge confirmó que el oficio sigue siendo el
  respaldo administrativo oficial. El webform es un complemento: digitaliza los datos (que
  antes Jorge transcribía a mano a la hoja "seguimiento" del sistema de Reportes de Visitas,
  un proyecto v8.5 aparte que vive solo en Apps Script, sin copia local) y adjunta el oficio ya
  firmado como PDF/foto en vez de que viaje solo en papel
- **Cae en "Pendiente de validar"**, no directo a producción — Jorge revisa el oficio adjunto
  antes de promoverlo a mano a la hoja "seguimiento" real. La promoción automática entre ambos
  sistemas queda pendiente de una futura sesión (no se tocó el proyecto v8.5)
- **Columnas de `Solicitudes`**: Fecha | Folio | Nombre | Función | CCT | Sector | Zona |
  Escuela | Turno | WhatsApp | Correo | Equipos con falla | Oficio (link Drive) | Estatus |
  Notas de revisión | Notificación de cierre enviada | Tipo de equipo | Cantidad (Aula de
  medios) | Cantidad (Administrativas) | Marca/Modelo | Estado de instalación (las últimas 5,
  ago 2026, agregadas **al final** a propósito para no correr `COL_MAN_ESTATUS`/
  `COL_MAN_NOTIFICACION_CIERRE` del cierre automático — se auto-completan solas en la próxima
  solicitud real, mismo patrón que `obtenerHojaCursos()` de `formacion-docente.gs`)
- **`Contactos_Zona_Sector`** la llena Jorge a mano (Sector, Zona, Correo, Teléfono) — puede
  tener una fila de Zona específica y otra de Sector (de respaldo, sin Zona); sin datos ahí, la
  solicitud se registra igual pero solo se notifica al solicitante
- El oficio adjunto se sube en base64 desde el cliente (`FileReader.readAsDataURL` + recorte
  del prefijo `data:...;base64,`) y `doPost` lo decodifica con `Utilities.base64Decode` y lo
  guarda en una carpeta de Drive ("Oficios de Mantenimiento", autocreada), compartida como
  "cualquiera con el link, solo ver" para que el link quede usable desde la hoja
- Notifica por Telegram a OTDE (mismo patrón que `soporte-remoto.gs`, **Propiedades del script
  configuradas por separado** — son por proyecto, no se comparten aunque sea el mismo bot) y por
  correo al solicitante con Zona y Sector en copia (CC) si hay contacto(s) registrados —
  **correo combinado (11 ago 2026)**: antes solo avisaba a Zona/Sector (nunca al solicitante) y
  se detenía en el primer contacto que encontraba (Zona o Sector, nunca ambos);
  `manBuscarContactosZonaSector()` ahora busca ambos y `manNotificarSolicitudRecibida()` manda
  un solo correo con `to`=solicitante, `cc`=Zona+Sector. Mismo patrón en el cierre automático
  (ver abajo). No bloquea el registro si el envío falla
- **CCT con autocomplete** (`js/cct-db.js`): mismo patrón que el resto del sitio
  (`manSeleccionarCct`/`manResetCct`/`manActualizarZonas`/`manActualizarTipoCct`, prefijo
  `man`), con fallback manual de Tipo de CCT/Sector/Zona/Escuela si la CCT no está en la base —
  ver `docs/ARCHITECTURE.md §11`. **Función/Cargo** se repuebla según ese tipo de CCT
  (`otdePoblarFuncion()`, mismo `§11`)
- **"Equipos con falla" estructurado (ago 2026)**: checklist (aula de medios / administrativas
  / red-si-ya-hay-infraestructura / otro, `manToggleCantidad()`) en vez del textarea libre
  original — el textarea se conserva solo para "Describe la falla". Ver detalle en
  `docs/ARCHITECTURE.md §15`
- **Correo obligatorio (ago 2026)**: antes opcional, ahora requerido tanto en cliente como en
  `manValidarCampos()` — es el medio principal de contacto, WhatsApp queda como alternativo
- Usado por el formulario "Solicitar Mantenimiento" en la pestaña Mantenimiento de `otde.html`
- Límite de archivo: 5MB validado en el cliente, 8MB de margen validado en el servidor. **Solo
  PDF (ago 2026)**: antes aceptaba `application/pdf,image/*`, ahora solo PDF (`accept`,
  validación de `file.type` en el cliente) — el backend no cambió, sigue guardando cualquier
  `mimeType` que reciba
- **Desplegado (6 ago 2026)**: Spreadsheet `Solicitudes_Mantenimiento_2026`, proyecto Apps
  Script "Mantenimiento - Backend (mantenimiento.gs)", URL real ya pegada en `otde.html` en
  `MANTENIMIENTO_APPS_SCRIPT_URL`. ~~**Telegram deliberadamente sin configurar** (decisión de
  Jorge, 6 ago 2026)~~ — nota desactualizada: el 18 ago 2026 se configuró de todos modos (mismo
  bot/chat compartido que `soporte-remoto.gs`, ver `docs/BITACORA.md`), aunque esta sección no
  se había actualizado entonces. En sep 2026, `TELEGRAM_CHAT_ID` de este proyecto pasó al
  chat_id personal de Alejandro (Telegram DM) y se agregó `manNotificarEquipoPorCorreo()` (correo
  a `MAN_CORREO_EQUIPO`) junto al Telegram existente — Alejandro atiende Mantenimiento y Soporte,
  decisión de Jorge. Bug real encontrado y corregido en esta misma sesión al probarlo: la URL del
  oficio iba sin escapar dentro del mensaje de Telegram (`parse_mode: 'Markdown'`), y un `_` sin
  parear en el link de Drive tumbaba el envío completo en silencio — ver `docs/QA-NOTES.md #24`.
  `Contactos_Zona_Sector` ya está poblada (6 ago 2026, 88 filas: 75 por Zona + 13 de respaldo
  por Sector) a partir de `OTDE_Base_Contactos_v2.xlsx` (hojas `Supervisiones`/`Sectores` —
  correo real de cada jefatura, sin teléfono porque el xlsx no lo trae)
- **Redesplegado (7 ago 2026, versión 5)**: checklist de equipos + correo obligatorio + oficio
  solo PDF de arriba. Mismo ID de implementación de siempre, no cambió
  `MANTENIMIENTO_APPS_SCRIPT_URL`
- **Redesplegado (11 ago 2026, versión 8)**: correo combinado a solicitante + Zona + Sector,
  ver `docs/ARCHITECTURE.md §15`. Mismo ID de implementación de siempre. Se agregó además un
  modo de prueba (`manActivarModoPrueba('correo')`/`manDesactivarModoPrueba()`) que redirige
  todos los correos salientes a un solo correo para probar el flujo completo sin avisar a
  destinatarios reales.
- **Redesplegado (11 ago 2026, versión 9, mismo día)**: el `cc` ahora depende de quién solicita
  — escuela (o vacío/desconocido) recibe Zona+Sector, Zona (`supervision`) solo Sector, Sector
  (`jefatura`) a nadie. Columna nueva `Tipo de solicitante`, ver `docs/ARCHITECTURE.md §15`.
- **`?action=pendientes&token=...` (ago 2026)**: mismo endpoint que `soporte-remoto.gs` arriba,
  para el Panel OTDE. Token configurado con `manConfigurarTokenPanel('secreto')` (mismo cuidado
  del ▶️ Ejecutar sin argumentos, `docs/QA-NOTES.md #14`). Ver `docs/ARCHITECTURE.md §20`.
- **Reporte de visita técnica — Fase 2 hacia retirar v8.5 (25 ago 2026, construida, desplegada y
  verificada en vivo)**: hoja "Reportes de visita" ligada a `Solicitudes` por folio, PDF + correo
  a escuela+técnico+OTDE. Dos caminos para llenarla: acción de menú manual ("Generar y enviar
  reporte de visita", respaldo) o `doPost` con `{accion:'reporteVisita', ...}` desde el
  formulario nuevo `reporte-visita.html` (el técnico lo llena en campo, un solo envío ya arma el
  PDF y notifica). Probado de punta a punta contra producción con modo de prueba activo: correo a
  los destinatarios correctos, sin fugas. **El PDF se rediseñó con identidad institucional real**
  (misma sesión, pleca de logos oficiales + firmas, ver `docs/ARCHITECTURE.md §15`) — confirmado
  contra el PDF real de Apps Script, cabe en una sola página ("Página 1 de 1"), idéntico a la
  previsualización.
- **Aviso al técnico asignado (25 ago 2026, sesión siguiente, desplegado y verificado en
  vivo)**: cerraba un cuello de botella real — al programar la fecha de visita, el sistema
  avisaba a solicitante+Zona/Sector pero nunca al técnico, que se seguía coordinando por fuera.
  Columna nueva `Técnico asignado` (dropdown validado contra `MAN_TECNICOS`) en `Solicitudes`;
  `manOnEditProgramacion()` ahora también escucha esa columna y dispara
  `manNotificarTecnicoAsignado()` en cuanto **ambas** (fecha + técnico) tienen valor, sin
  importar cuál se llenó al último — folio, escuela, fecha, equipos con falla y link directo a
  `reporte-visita.html`. Probado contra producción real: ambos avisos dispararon correctamente,
  sin fugas. Ver `docs/ARCHITECTURE.md §15`.
- **"Planchado" de la hoja — dropdowns + semáforo + protección de solo aviso (1 sep 2026,
  piloto, desplegado y verificado en vivo)**: `manConfigurarValidacionYSemaforo()`, corrida una
  vez desde el editor (o el menú "OTDE Mantenimiento" → "Aplicar validación y semáforo").
  Dropdown suave nuevo en `Turno`/`Estado de instalación`/`Tipo de solicitante`, semáforo de
  color en `Estatus` (Solicitudes) y `Estado del aula` (Reportes de visita), aviso de "columna
  automática" en `Fecha`/`Folio`/`Oficio`/las 3 columnas de Notificación. No toca la validación
  de `Estatus`/`Técnico asignado` ya existente. Manual visual del equipo en
  `docs/manual-bases-tramites.html` (Asesorías/Soporte/Correo/Formación Docente pendientes,
  mismo tratamiento). Ver `docs/ARCHITECTURE.md §24`.
- **Rediseño de `reporte-visita.html` — todo obligatorio + campos enriquecidos + fotos de
  evidencia (17 sep 2026, desplegado por Jorge y verificado en vivo contra producción)**: pasó
  de 3 campos obligatorios (de ~18) a ~24, de 5 secciones a 8, y de puro texto libre a selects/
  checkboxes/numéricos donde un catálogo produce datos más útiles (Aula en uso, Mobiliario,
  Conectividad, Actividades preventivas/correctivas, Instalación realizada). Campos nuevos:
  Modelo/marca del equipo, Toolwiz Time Freeze, ¿Requiere segunda visita?, ¿Atención sin
  solicitud previa registrada? (trazabilidad de casos urgentes sin folio previo), Descripción de
  la atención realizada, y **fotos de evidencia obligatorias** (mismo patrón de compresión+Drive
  que `visitas-jefes.gs`, carpeta "Fotos de Reportes de Visita" con subcarpeta por folio).
  `ENCABEZADOS_MAN_REPORTES` creció de 20 a 27 columnas (las 7 nuevas van al final, U-AA, mismo
  criterio que `Solicitudes`); `manValidarDatosReporte_()` ahora exige todas las columnas
  capturables. Verificado end-to-end contra producción real con modo de prueba activo (folio
  real `OTDE-MAN-0014`): fila de 27 columnas, PDF en una sola página, foto subida y comprimida,
  correo `[PRUEBA]` con PDF adjunto — dejados sin limpiar a petición de Jorge. Ver
  `docs/ARCHITECTURE.md §15`.
- **Caso urgente sin folio + Conectividad "WiFi y Cable" + Instalación múltiple (17 sep 2026,
  cont., desplegado por Jorge y verificado en vivo contra producción esa misma noche)**: "¿Atención
  sin solicitud previa?" ahora es el primer campo; el Folio pasó a condicional — obligatorio solo
  si la respuesta es "No". Con "Sí", un sub-bloque nuevo captura CCT (autocomplete + fallback
  manual)/Turno/Función/Nombre/Correo y `manCrearSolicitudUrgente_()` da de alta la Solicitud
  con folio autogenerado y `Estatus = 'Resuelto'` desde el inicio, para que el resto del pipeline
  (PDF, correo) siga igual. Instalación realizada pasó de `<select>` a checkboxes (varias
  opciones a la vez, unidas por `"; "`). Ver `docs/ARCHITECTURE.md §15` y
  `docs/QA-NOTES.md #32` (bug real de mensajes de error pegados al alternar la respuesta,
  encontrado y corregido en la prueba de navegador). **Verificado end-to-end contra producción
  real con modo de prueba activo**: Escenario folio normal (`OTDE-MAN-0014`, 2 casillas de
  instalación) — fila nueva sin sobrescribir el reporte previo del mismo folio, PDF+foto en
  Drive, correo `[PRUEBA]` con destinatarios correctos. Escenario caso urgente (CCT
  `15DPR0860F`, autocomplete real) — `manCrearSolicitudUrgente_()` dio de alta folio
  `OTDE-MAN-0016` con `Estatus=Resuelto` desde el alta y nota automática correcta, y se confirmó
  que **no** se dispara el correo de "solicitud recibida" (solo el del reporte) — comportamiento
  esperado. Sin bugs encontrados en esta ronda.
- **Docentes/alumnos + `?action=reportesMes` para la Bitácora OTDE (24 sep 2026, desplegado y
  verificado en vivo)**: columnas AB/AC `Docentes de la escuela`/`Alumnos de la escuela` en
  "Reportes de visita" (obligatorias, aceptan 0), capturadas en `reporte-visita.html`.
  `manListarReportesMes_` devuelve los reportes de un mes cruzados con `Solicitudes`, con el
  mismo `PANEL_TOKEN` de `?action=pendientes`; lo consume `apps-script/bitacora.gs`. **Orden de
  despliegue** si vuelven a cambiar campos obligatorios: publicar primero `reporte-visita.html` y
  después el `.gs`, o el formulario viejo quedaría rechazado. Ver `docs/ARCHITECTURE.md §15`.
- **Alta a prueba de reintentos (25 sep 2026, en producción y verificado en vivo)**: `doPost`
  toma `LockService` y, antes de subir el oficio, busca el envío previo
  (`manBuscarEnvioPrevio_`: columna nueva AA `ID de envío`, o CCT + correo + "Equipos con falla"
  en 10 min). Un reintento devuelve el mismo folio sin repetir oficio ni avisos. Nació de
  duplicados reales (`OTDE-MAN-0025`/`0026`, `0028`/`0029`). `manCrearSolicitudUrgente_()`
  también genera su folio bajo el candado. Ver `docs/ARCHITECTURE.md §27` y
  `docs/QA-NOTES.md #44`.
- **`?action=oficiosOV&token=&desde=AAAA-MM-DD` (8 oct 2026, en producción)**: solicitudes con su
  oficio (folio, escuela, CCT, `Equipos con falla`, link del oficio, estatus, notas) para el
  paso 2B de `apps-script/oficios.gs` (`manListarOficiosOV_`, solo lectura, columnas por nombre,
  mismo `PANEL_TOKEN`). Ver `docs/ARCHITECTURE.md §31`.
- **Mejoras del 14 oct 2026 (páginas en producción, `.gs` desplegado por Jorge el 15 oct 2026)**: casilla
  obligatoria de respaldo (equipo administrativo), nota de aula limpia, pregunta de pila CMOS y
  hasta 3 fotos opcionales de los equipos (`manSubirFotosEquipos_()`, carpeta "Fotos de equipos
  (solicitudes)/<folio>"); columnas AB-AD al final de `Solicitudes`. `manBloquePreparacion_()`
  agrega "Prepárate para la visita" a los correos de solicitud recibida y fecha programada.
  `reporte-visita.html` abre con "Tipo de atención": en "Solo equipos administrativos" se ocultan
  los campos del aula (van como "No aplica"/0), columnas AD-AH en "Reportes de visita", estado
  "⚫ No se pudo trabajar". Endpoint `?action=mantenimientoPorCct` (`PANEL_TOKEN`) para la
  verificación de Asesorías, con hoja opcional `Historico_v8.5`. Ver `docs/ARCHITECTURE.md §32`.
- **Columnas por nombre y orden por bloques (15 oct 2026, en producción y verificado en vivo,
  versión 27)**: mismo patrón que Asesorías. `ENCABEZADOS_MAN_SOLICITUDES` y
  `ENCABEZADOS_MAN_REPORTES` siguen el orden de `mantenimiento.html` y `reporte-visita.html`;
  las constantes `COL_MAN_*`/`COL_MAN_REP_*` ahora se derivan del nombre (`MS`/`MR`) y solo
  valen sobre filas canónicas (`manFilasCanonicas_()`, `manFilaCanonica_()`); para escribir en
  la hoja, `manCol_()` y `manFilaRealDesdeObjeto_()`. Menú "Reordenar columnas (Solicitudes y
  Reportes de visita)" (`manReordenarColumnas_()`), ya corrido en producción. Ver
  `docs/ARCHITECTURE.md §33`.
- **Versión 28 (20 oct 2026)**: `?action=agendaVisitas&desde&hasta&token`
  (`manAgendaVisitas_()`, mismo contrato que Asesorías, más `Técnico asignado`) para el
  resumen diario de `oficios.gs`.

### `apps-script/asesorias.gs`
- **Nuevo (ago 2026)**: mismo patrón que `mantenimiento.gs` (Sheet propio con hojas
  `Solicitudes` y `Contactos_Zona_Sector`, ambas autocreadas), folio `OTDE-ASE-NNNN`
- **Contexto del trámite**: la asesoría (capacitación grupal sobre Banco de Materiales/Chuka)
  se ofrece tras una visita de mantenimiento — no es un trámite que llegue "en frío". Hoy ese
  control se lleva en un Excel simple sin nada automatizado ("SGA-OTDE Track 1", pausado). Este
  script solo digitaliza la captura inicial, igual filosofía que Mantenimiento: **el oficio
  sigue siendo obligatorio**, el webform lo complementa (se adjunta como PDF/foto) en vez de
  sustituirlo
- **Cae en "Pendiente de validar"**, Jorge promueve a mano a su control real — la
  automatización del resto del flujo (agenda, visita, reporte) queda fuera de alcance por
  ahora; la parte pedagógica del taller (Carta Descriptiva, Campos Formativos NEM, etc.) ya
  está resuelta aparte y no se tocó
- **Columnas de `Solicitudes`**: Fecha | Folio | Tipo de Asesoría | Nombre | Función | CCT |
  Sector | Zona | Escuela | Turno | Número de Docentes | WhatsApp | Correo | Observaciones |
  Oficio (link Drive) | Estatus | Notas de revisión | Confirmó Mantenimiento Previo |
  Notificación de cierre enviada | Tipo de solicitante | Fecha programada de visita |
  Notificación de fecha programada enviada | **Temas de Excel** (nueva, ago 2026 — ver abajo)
- **Dos tipos de asesoría (ago 2026 — el selector creció por primera vez)**: **Banco de
  Materiales y Chuka** (la original) exige la casilla obligatoria de confirmación de
  mantenimiento previo descrita abajo. **Excel básico para personal administrativo** (nueva) es
  una solicitud proactiva de ATP de zona/sector, directores, subdirectores y administrativos —
  no requiere mantenimiento previo, así que esa casilla ahora es condicional
  (`aseToggleTipoAsesoria()` en `asesorias.html` la oculta y no la exige salvo que el tipo sea
  Banco de Materiales/Chuka; mismo condicional en `aseValidarCampos()` del backend). En su
  lugar, Excel básico muestra un checklist opcional de 6 temas sugeridos (duplicados de
  docentes/CCT, filtrar por zona/sector/subdirección, validar RFC/CURP/CCT, combinar
  correspondencia con Word, fórmulas básicas, introducción a IA/Copilot) que se guarda en la
  columna `Temas de Excel`, separados por `; ` — vacía para Banco de Materiales/Chuka. El oficio
  de solicitud sigue siendo obligatorio para los dos tipos, sin excepción.
- **Casilla de confirmación de mantenimiento previo** (solo aplica a Banco de Materiales/Chuka):
  esa asesoría requiere que la escuela ya haya recibido mantenimiento con esos recursos
  instalados — sin eso, la asesoría no se puede dar. No se valida automáticamente contra el
  sistema de Reportes de Visitas (viven ahí, no en este proyecto, y la mayoría de escuelas ya
  atendidas lo fueron antes de que existiera este webform, así que cruzar contra datos parciales
  sería peor que no cruzar nada). En vez de eso, el formulario pide una casilla obligatoria de
  confirmación explícita — no lo garantiza, pero deja rastro y evita el supuesto silencioso;
  Jorge revisa esto como parte de su validación del oficio.
- **"Número de Docentes" generalizado a "Número de personas" (ago 2026)**: mismo campo/columna,
  solo cambió el texto visible — Excel básico va dirigido a personal administrativo, no solo
  docentes. Aplica en Mantenimiento y Asesorías por igual.
- Notifica por Telegram a OTDE (Propiedades del script configuradas por separado en este
  proyecto) y por correo al solicitante con Zona y Sector en copia (CC) si hay contacto(s)
  registrados — mismo mecanismo de correo combinado que `mantenimiento.gs` (ver esa sección y
  `docs/ARCHITECTURE.md §15`)
- **CCT con autocomplete** (`js/cct-db.js`): mismo patrón, prefijo `ase`
  (`aseSeleccionarCct`/`aseResetCct`/`aseActualizarZonas`/`aseActualizarTipoCct`), fallback
  manual con Tipo de CCT (ver `docs/ARCHITECTURE.md §11`). **Función/Cargo** se repuebla según
  ese tipo (`otdePoblarFuncion()`, mismo `§11`)
- **Correo obligatorio (ago 2026)**: antes opcional, ahora requerido en cliente y en
  `aseValidarCampos()`. **Oficio solo PDF (ago 2026)**: antes aceptaba
  `application/pdf,image/*`, ahora solo PDF — el backend no cambió
- Usado por el formulario "Solicitar Asesoría" en la nueva pestaña Asesorías de `otde.html`
- **Desplegado (6 ago 2026)**: Spreadsheet `Solicitudes_Asesorias_2026`, proyecto Apps Script
  "Asesorias - Backend (asesorias.gs)", URL real ya pegada en `otde.html` en
  `ASESORIAS_APPS_SCRIPT_URL`. ~~Mismo caso que Mantenimiento: Telegram deliberadamente sin
  configurar (decisión de Jorge, 6 ago 2026)~~ — misma nota desactualizada que en Mantenimiento
  arriba: se configuró el 18 ago 2026 con el bot/chat compartido. En sep 2026, `TELEGRAM_CHAT_ID`
  de este proyecto pasó al chat_id personal de Nancy Yarian (Telegram DM) y se agregó
  `aseNotificarEquipoPorCorreo()` (correo a `ASE_CORREO_EQUIPO`) junto al Telegram existente —
  Nancy atiende Asesorías, decisión de Jorge. Mismo bug de URL de oficio sin escapar en Markdown
  encontrado y corregido aquí (fue la causa real de que a Nancy no le llegara el primer intento
  de smoke test) — ver `docs/QA-NOTES.md #24`.
  `Contactos_Zona_Sector` ya poblada igual que en Mantenimiento (mismas 88 filas, misma fuente
  `OTDE_Base_Contactos_v2.xlsx`). **Redesplegado (7 ago 2026, versión 5)**: solo el cambio de
  correo obligatorio arriba, mismo ID de implementación. **Redesplegado (11 ago 2026, versión
  7)**: correo combinado a solicitante + Zona + Sector y modo de prueba
  (`aseActivarModoPrueba('correo')`/`aseDesactivarModoPrueba()`), mismo detalle que
  Mantenimiento arriba, ver `docs/ARCHITECTURE.md §15`. **Redesplegado (11 ago 2026, versión 8,
  mismo día)**: `cc` según tipo de solicitante (escuela/supervisión/jefatura), mismo detalle que
  Mantenimiento arriba
- **`?action=pendientes&token=...` (ago 2026)**: mismo endpoint que `mantenimiento.gs`, para el
  Panel OTDE. Token configurado con `aseConfigurarTokenPanel('secreto')`. Ver
  `docs/ARCHITECTURE.md §20`.
- **"Planchado" de la hoja — dropdowns + semáforo + protección de solo aviso (1 sep 2026,
  desplegado y verificado en vivo)**: `aseConfigurarValidacionYSemaforo()`, mismo patrón que
  `manConfigurarValidacionYSemaforo()` de Mantenimiento, corrida una vez desde el editor (o el
  menú "OTDE Asesorías" → "Aplicar validación y semáforo"). Dropdown suave en `Tipo de
  Asesoría`/`Turno`/`Confirmó Mantenimiento Previo`/`Tipo de solicitante`, semáforo de color en
  `Estatus`, aviso de "columna automática" en `Fecha`/`Folio`/`Oficio`/las 2 columnas de
  Notificación. No toca la validación de `Estatus` ya existente. Ver `docs/ARCHITECTURE.md §24`.
- **Fecha de realización + Asistentes y `?action=asesoriasMes` para la Bitácora OTDE (24 sep 2026,
  desplegado)**: columnas X/Y en `Solicitudes`, que Nancy llena al marcar "Resuelto" (las crea
  "Aplicar validación y semáforo"). `aseListarResueltasMes_` devuelve las resueltas del mes con el
  mismo `PANEL_TOKEN`; lo consume `apps-script/bitacora.gs`. Ver `docs/ARCHITECTURE.md §15`.
- **Alta a prueba de reintentos (25 sep 2026, en producción y verificado en vivo)**: mismo patrón
  que Mantenimiento (`aseBuscarEnvioPrevio_`, `ID de envío` en la columna Z; el respaldo sin ID
  compara CCT + correo + tipo de asesoría + observaciones). Ver `docs/ARCHITECTURE.md §27`.
- **`?action=oficiosOV` (8 oct 2026, en producción)**: mismo endpoint que Mantenimiento
  (`aseListarOficiosOV_`, el detalle es `Tipo de Asesoría`), para el paso 2B de oficios.
- **Verificación del mantenimiento previo (14 oct 2026, `.gs` desplegado por Jorge el 15 oct 2026)**: para
  Banco de Materiales y Chuka, `aseVerificarMantenimiento_()` consulta Mantenimiento por CCT
  (`MAN_URL` + `PANEL_TOKEN`, menú "Configurar conexión con Mantenimiento") y escribe
  `Verificación de mantenimiento` (Verificado / En proceso / Sin verificar, con semáforo) y
  `Folio de mantenimiento indicado` al final de `Solicitudes`. **No bloquea** la solicitud
  (decisión de Jorge). Folio opcional en `asesorias.html`. Ver `docs/ARCHITECTURE.md §32`.
- **Columnas por nombre y orden por bloques (15 oct 2026, en producción y verificado en vivo,
  versión 20)**: piloto del reordenamiento de las bases de trámites. `asesorias.gs` ya no usa
  `COL_ASE_*`: lee con `aseFilasCanonicas_()`/`aseFilaCanonica_()` (`fila[ASE['Estatus']]`) y
  escribe con `aseCol_()`; la fila nueva se arma por nombre en el orden real de la hoja.
  `ENCABEZADOS_ASE_SOLICITUDES` está por bloques (solicitud → quién la pide → centro de trabajo
  → mantenimiento previo → atención → automáticas). Menú "Reordenar columnas de Solicitudes"
  (`aseReordenarColumnasSolicitudes_()`, respaldo + verificación, columnas a mano al final), ya
  corrido en producción. Una columna nueva va en su bloque, no al final. Ver
  `docs/ARCHITECTURE.md §33`.
- **Versión 21 (20 oct 2026)**: `?action=agendaVisitas&desde&hasta&token`
  (`aseAgendaVisitas_()`, `PANEL_TOKEN`, solo lectura) para el resumen diario de `oficios.gs`:
  solicitudes con `Fecha programada de visita` en el rango, menos Rechazadas. El correo de fecha
  programada ya no dice "visita técnica" (texto heredado de Mantenimiento; observación de
  Jorge): "Ya se programó la fecha de tu asesoría", etiqueta "Fecha de la asesoría".

### `apps-script/formacion-docente.gs`
**Desplegado en producción desde jul 2026** (Spreadsheet real `Formacion_Docente_2026_2027`, URL real ya pegada en `APPS_SCRIPT_URL` de `formacion-docente.html`; la extinta `jornada-verano-2026.html` compartió este mismo backend hasta su eliminación el 13 jul 2026).

- Conectado a un Google Spreadsheet propio por ciclo escolar, con **3 pestañas relacionales** en vez de una hoja plana: `Docentes` (llave RFC, upsert), `Cursos` (catálogo administrado a mano por OTDE), `Inscripciones` (transaccional, FK a las otras dos, con columnas de vista I-O calculadas por `VLOOKUP` — nombre del docente/curso, CCT, escuela, sector, zona, función, todo en vivo, nunca copiado a mano)
- **`doGet`** regresa el catálogo de cursos con `Activo=TRUE` **y** a partir de `Visible_desde` si está llena (opcional, se evalúa por año/mes/día, sin depender de un trigger programado; `Visible_hasta` se retiró el 28 sep 2026). También manda `registro_previo_requerido` (fuerza pasar por una liga externa antes del formulario OTDE, para cursos con cupo real) y `inscritos` (conteo real desde `Inscripciones`, para prueba social en las tarjetas — nunca inventado)
- **`doPost`** hace *upsert* en `Docentes` por RFC (si ya existe, actualiza sus datos; si no, lo agrega). Un valor nuevo vacío **nunca sobrescribe** un dato bueno que ya hubiera (`valorOMantener()`) — importante para migraciones históricas incompletas. Agrega una fila en `Inscripciones` por cada curso; si el RFC ya estaba inscrito a ese mismo curso, no duplica folio: regresa el folio existente con `duplicado:true`
- Folio: `OTDE-CAP-NNNN`. ID de curso: `PREFIJO-CICLO-NNN` (ej. `WEB-2627-001`, prefijos en `PREFIJOS_CATEGORIA`)
- **Columnas de `Cursos` (28, por bloques en el orden en que se llena un curso, reordenada en producción el 28 sep 2026)**: 1. El curso: ID_Curso, Categoria, Nombre, Responsable, Modalidad, Dirigido_a, Descripcion, Liga_convocatoria · 2. Cuándo: Fecha_inicio, Fecha_fin, Hora_inicio, Hora_fin, Fechas_sesion · 3. Inscripción: Visible_desde, Fecha_limite_inscripcion, Hora_limite_inscripcion, Registro_previo_requerido, Cupo_agotado · 4. Validez: Valida_USICAMM, Valida_PROEEB, Liga_tutorial_constancia · 5. Control: Activo, Ocultar_historial, NP_planeacion (oct 2026, N.P. de la planeación para la Bitácora OTDE, ver `bitacora.gs`), Notas · 6. Automáticas (encabezado gris): Recordatorio_inicio/medio/webinar_enviado. **El código lee `Cursos` por nombre de encabezado** (`valoresCursos_()`, `row[CUR.<Columna>]`; escrituras con `colCursos_()`), igual que `Inscripciones`: mover o insertar columnas ya no rompe nada, y una columna nueva va en `ENCABEZADOS_CURSOS` donde tenga sentido (no solo al final). `obtenerHojaCursos()` agrega al final, por nombre, cualquier encabezado que falte. Retiradas el 28 sep 2026 (sin uso): `Requiere_codigo_asistencia`, `Codigo_asistencia`, `Visible_hasta`. **`Liga_convocatoria` lleva una sola URL, sin texto** (va en botones y en el `.ics`; ver `docs/QA-NOTES.md #47`); ligas extra van en `Descripcion`, donde se pintan clicables
- **Validez USICAMM/PROEEB + modelo de 3 estados + historial "Cursos anteriores" (sep 2026, desplegado y confirmado en producción el 17 sep 2026 vía `curl` al `doGet` real — ver `docs/ROADMAP.md` ítem 18)**: `Valida_USICAMM`/`Valida_PROEEB` (TRUE/FALSE independientes) se muestran como etiqueta destacada en la tarjeta. `evaluarEstadoCurso_()` distingue el periodo de inscripción (`Fecha_limite_inscripcion`, con fallback a `Fecha_inicio`) del periodo de desarrollo (`Fecha_inicio`/`Fecha_fin`): un curso puede estar con inscripción **abierta** (normal), **cerrada** (sigue visible con leyenda, sin CTA, el curso aún no termina) o **pasado** (`hoy > Fecha_fin` — sale del catálogo vigente y entra al historial). `doGet` ahora regresa también `cursos_pasados` (tope `MAX_CURSOS_PASADOS=6`, más reciente primero), que el frontend muestra siempre en una sección "Cursos anteriores" en gris/bloqueada — con o sin cursos vigentes disponibles, a propósito. `doPost` rechaza además, del lado servidor, un registro a un curso ya pasado (`obtenerFilaCurso_()`, reemplaza a `existeCurso()`). Detalle completo en `docs/ARCHITECTURE.md §12` y `docs/DESIGN_SYSTEM.md`
- **Cierre con hora + "Cupo agotado" + historial sin `Activo` (23 sep 2026, desplegado por Jorge y verificado en producción con `curl` y una fila de prueba `PRUEBA-QA-002`, fila 14, dejada con `Activo=FALSE`/`Ocultar_historial=TRUE` para que Jorge la borre)**: el modelo pasó a 4 estados (abierta → agotada → cerrada → pasado). El cierre es fecha + `Hora_limite_inscripcion` evaluado al minuto (`momentoCierreInscripcion_()`); `Cupo_agotado=TRUE` deja el curso visible sin registros nuevos, salvo "solo vengo a avisar" con registro externo confirmado. `doPost` ahora rechaza registros nuevos en cerrada/agotada (antes no, `docs/QA-NOTES.md #42`). "Cursos anteriores" ya no depende de `Activo`; `Ocultar_historial=TRUE` excluye un curso. **Regla de captura**: `Fecha_inicio`/`Fecha_fin` = desarrollo del curso; cerrar inscripción con `Fecha_limite_inscripcion` (+ hora), no con `Visible_hasta` (esa esconde el curso por completo)
- **Recordatorios automáticos por correo** (jul 2026, tiempos y diseño ajustados ago 2026, lógica de reintento corregida ago 2026): "empieza en 1 día" (cursos de varios días, + fallback en cursos de un solo día sin `Hora_inicio`), "vas a la mitad" (solo cursos de 30+ días), "empieza en 30 minutos" (cualquier curso con `Hora_inicio` capturada, a partir de 40 min antes). Un solo correo por curso con BCC a todos los inscritos (no uno por persona), plantilla HTML propia con paleta institucional + íconos de redes (`construirCorreoHtml()`) y `replyTo` a la cuenta institucional (`otde.nezahualcoyotl@dee.edu.mx`, no al Gmail real que envía), y revisión de `MailApp.getRemainingDailyQuota()` antes de enviar — la cuota diaria la comparten TODOS los Apps Script de la cuenta de Google, no es exclusiva de este proyecto. El disparador de "30 minutos" corre cada 15 min (antes cada hora); requiere volver a correr el menú "OTDE Formación → Instalar recordatorios automáticos" después de cada redeploy, porque `instalarRecordatoriosAutomaticos()` borra y recrea ambos activadores en cada corrida. `enviarRecordatoriosDiarios()` avisa a Jorge por correo (máx. 1x/día) si algún activador desaparece. **Desde el 28 sep 2026 los correos son respaldo "a quien alcance"** (decisión de Jorge; el aviso principal es el calendario de la confirmación, ver `formacion-docente.html` abajo): "empieza mañana" sale el día anterior y lo que no cupo el día de inicio ("empieza hoy"), y luego se cierra; "vas a la mitad" solo su día; el de 30 min reintenta solo durante el día de inicio (en cursos de varios días, solo la primera sesión). Sorteo en cada envío y el de 30 min va primero a quien no recibió "empieza mañana" (`ordenarParaEnvio_()`). Detalle completo en `docs/DESIGN_SYSTEM.md` y `docs/ARCHITECTURE.md §12`
- **Doble registro OTDE + plataforma externa, con recordatorio y confirmación de un toque
  (construido, desplegado y verificado en producción 16 sep 2026)**: cierra el hueco real de que
  muchos docentes se registran con OTDE pero nunca terminan su alta en la plataforma externa (o
  al revés). `Inscripciones` creció a 21 columnas reorganizadas **por bloques** (Registro →
  Participante → Centro de trabajo → Curso → Seguimiento, `ENCABEZADOS_INSCRIPCIONES`) y el
  código ahora lee/escribe siempre por nombre de encabezado, nunca por posición — reordenar ya no
  rompe nada. Columna `Registro_externo` (`No aplica`/`Pendiente`/`Confirmado por docente`,
  `mejorarRegistroExterno_()` solo puede mejorar el estado, nunca degradarlo ni duplicar folio) se
  llena con la pregunta "¿Ya te llegó el correo de bienvenida del curso?" en el wizard (prueba
  visual acordada con Jorge, sin subir archivos ni cruzar contra la plataforma real). A quien
  queda `Pendiente` se le manda un recordatorio individual (máx. 2, día siguiente + ≤2 días del
  cierre) con un botón firmado (HMAC del folio) que confirma con un toque vía
  `doGet ?action=confirmar`. `doPost` ahora toma `LockService` alrededor de todo el registro —
  cierra la ventana de carrera que produjo un folio duplicado real en producción antes de este
  fix (`OTDE-CAP-0089`, sin corregir en los datos, decisión pendiente de Jorge). Detalle completo
  en `docs/ARCHITECTURE.md` §"Doble registro" y `docs/DESIGN_SYSTEM.md`; bugs cazados en
  `docs/QA-NOTES.md #30`/`#31`. Pendiente: Paso 5 (reconciliar contra la lista de Aula Digital
  cuando CoEEE la tenga disponible) y borrar las 2 hojas de respaldo del reorden — ver
  `docs/ROADMAP.md` ítem 19.
- **Los recordatorios automáticos SÍ llegan a Recibidos, no a Enviados** (confirmado 6 ago 2026): `enviarCorreoLote()` manda `to: Session.getEffectiveUser().getEmail()` (copia a la misma cuenta que corre el script) con los inscritos en `bcc`. Gmail archiva esa copia-a-sí-mismo como correo recibido, no como enviado — mismo patrón en **todas** las automatizaciones de OTDE, incluido el SGCI viejo de `Correos-institucionales`. Si Jorge reporta "no veo nada en Enviados", el correo probablemente sí salió — hay que revisar Recibidos de la cuenta de Google que tiene instalados los activadores (`otde.nezahualcoyotl@gmail.com`), no Enviados ni ninguna cuenta de Outlook/Microsoft.
- ~~**Bug confirmado en producción (6 ago 2026)**: `enviarRecordatoriosDiarios()`/`enviarRecordatoriosWebinar()` marcaban la columna de recordatorio en `TRUE` sin haber mandado nunca el correo si la evaluación llegaba tarde~~ — corregido (6 ago 2026): ambos ahora reintentan en cada corrida subsecuente con mensaje ajustado a "ya inició"/"ya comenzó" mientras el curso no haya terminado; solo se resignan cuando `hoy > Fecha_fin`. Pasó de verdad con el Seminario "Convivencia digital entre estudiantes" (4 ago 2026, sin `Hora_inicio`) — ver `docs/QA-NOTES.md #8`. **Pendiente para Jorge**: re-desplegar `formacion-docente.gs` (Administrar implementaciones → Nueva versión) para que el fix llegue a producción.
- Menú "OTDE Formación" completo: Generar ID de cursos faltantes · Generar estadísticas · Actualizar vista de Inscripciones · Reordenar columnas de Cursos · Reordenar columnas de Inscripciones · Aplicar validación en Cursos · Instalar/Desinstalar recordatorios automáticos · enviar recordatorios/pruebas por folio · modo de prueba · Instalar/Desinstalar auto-generación de ID de curso ("Migrar Jornada Verano 2026" se retiró el 28 sep 2026: código muerto desde jul). **Correr "Instalar recordatorios automáticos" desde el menú de la hoja, no con ▶️ desde el editor**: desde el editor el aviso final no se puede mostrar y la ejecución queda "En tiempo de espera" (pasó el 28 sep 2026)
- **Auto-generación de ID de curso (ago 2026)**: `onEditCursos()`, instalable desde el menú de arriba — antes había que acordarse de correr "Generar ID de cursos faltantes" a mano después de dar de alta un curso; ahora se genera solo en cuanto se escribe la `Categoria` de una fila nueva. Misma lógica que el botón del menú (`generarIdsCursosFaltantes_()`, compartida por ambos caminos). Detalle en `docs/ARCHITECTURE.md §20`
- Responde `Content-Type: text/plain` para evitar preflight CORS, mismo patrón que el resto
- **Cuidado con `appendRow([])`**: Apps Script no acepta un arreglo vacío — usar `appendRow([''])` para filas en blanco. Ver `docs/QA-NOTES.md` para este y otros bugs reales ya corregidos (fetch sin timeout, fecha -1 día por parseo UTC, etc.)
- **Modo de prueba (código listo, aún sin desplegar, 11 ago 2026)**: `enviarCorreoLote()` ahora revisa la Script Property `MODO_PRUEBA_CORREO` (`fdActivarModoPrueba('correo')`/`fdDesactivarModoPrueba()`) y, si está activa, redirige `bcc`/`subject`/`htmlBody` al correo de prueba en vez de a los inscritos reales — en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue mandando a los inscritos de verdad
- **"Planchado" de la hoja `Cursos` — dropdowns + protección de solo aviso (desplegado y
  verificado en vivo, 3 sep 2026)**: `fdConfigurarValidacionYSemaforo()`, mismo patrón que
  Mantenimiento/Asesorías/Soporte, con dos diferencias: solo toca `Cursos` (`Inscripciones`/
  `Docentes` son datos transaccionales/computados, no captura manual, quedan fuera) y no hay
  columna tipo "Estatus" con semáforo de color — `Activo` ya cumple ese papel como interruptor.
  Dropdowns suaves en `Categoria` (7 valores de `PREFIJOS_CATEGORIA`), `Modalidad`
  (Virtual/Presencial/Híbrido — sin catálogo cerrado previo en el código, confirmado
  directamente con Jorge) y `Requiere_codigo_asistencia`/`Activo`/`Registro_previo_requerido`
  (TRUE/FALSE — confirmado con Jorge que estas 3 columnas son texto escrito a mano, no checkbox
  nativo de Sheets, antes de agregarles dropdown). Protección de solo aviso en `ID_Curso` y las 3
  columnas `Recordatorio_*_enviado`. Item nuevo `.addItem('Aplicar validación en Cursos',
  'fdConfigurarValidacionYSemaforo')` en el menú "OTDE Formación". Pegado y corrido en el
  proyecto real vía Chrome automatizado ("Se completó la ejecución" sin errores) y verificado en
  vivo contra `Formacion_Docente_2026_2027`: dropdowns visibles en las 5 columnas de `Cursos`.
  Sin probar el diálogo de protección de solo aviso en esta ronda. Ver `docs/ARCHITECTURE.md
  §24`.
- **Recordatorio y carga de constancia para conferencias UNETE (sep 2026, construido y
  verificado E2E en producción real, sin modo de prueba)**: solo para cursos con la columna
  nueva `Liga_tutorial_constancia` llena en `Cursos` (opt-in por curso, el resto del catálogo
  sigue igual) — agrega esa liga al correo de aviso normal y, tras la conferencia, dos
  recordatorios (inmediato + al día siguiente, `enviarRecordatoriosConstancia_()`) con una liga
  firmada distinta a la del doble registro que abre una carga de archivo a Drive
  (`subirConstancia_()`), cerrada automáticamente al segundo día de terminada la conferencia
  (`ventanaConstanciaAbierta_()`). Columna nueva `Hora_fin` en `Cursos`; 5 columnas nuevas en
  `Inscripciones` (`Constancia_recordatorios_enviados`, `Fecha_ultimo_recordatorio_constancia`,
  `Constancia_recibida`, `Fecha_recepcion_constancia`, `Liga_constancia_drive`). Detalle completo
  en `docs/ARCHITECTURE.md §12`. **Dos bugs reales encontrados y corregidos en la prueba E2E**:
  el `.html` no estaba publicado en GitHub Pages pese al `.gs` ya redesplegado (`docs/QA-NOTES.md
  #35`), y al proyecto le faltaba autorizar el permiso de `DriveApp` por ser la primera vez que
  este `.gs` toca Drive (`docs/QA-NOTES.md #36`) — ya resuelto, no requiere acción.
- **`enviarCorreoLote()` troceado por límite de destinatarios por mensaje (22 sep 2026,
  desplegado en producción)**: bug real encontrado en vivo — con 119 inscritos en la conferencia
  UNETE `CNF-2627-001`, un solo `bcc` con todos revienta `MailApp.sendEmail`
  ("Límite Excedido: Destinatarios de correo electrónico por mensaje") y tumbaba toda la
  ejecución de `enviarRecordatoriosWebinar()`, incluido el recordatorio de constancia que corre
  después. Fix: trocea en lotes de `MAX_DESTINATARIOS_POR_CORREO=45` + cada curso aislado en su
  propio `try/catch` dentro de los dos bucles de recordatorio. Ver `docs/QA-NOTES.md #38`.
  **Segundo bug, encontrado al verificar el fix, ya desplegado (Versión 20, mismo día)**: una
  dirección con formato inválido tumbaba el lote completo donde caía — `esEmailValido_()`
  (filtra antes de trocear) + cada lote aislado en su propio `try/catch` ya están en producción.
- **Brevo descartado; envío sigue en `MailApp` con reserva de cuota y envío parcial sin duplicar
  (22 sep 2026, Versiones 21 y 22 en producción, repo = producción)**: la migración a Brevo
  (`docs/QA-NOTES.md #39`) nunca se desplegó y se retiró del código por decisión de Jorge (no
  entrega bien a Hotmail/Outlook sin dominio propio). `RESERVA_CUOTA_CORREO` (50 desde el 28 sep
  2026, antes 30; + `RESERVA_AVISO_30MIN = 20` apartados para el aviso de 30 min los días que hay
  uno pendiente, `reservaCuota_()`) deja libres esos destinatarios/día para Mantenimiento/Correo/etc.
  — la respetan también los avisos en lote (`enviarCorreoLote()` revisa cuota + reserva antes de
  cada lote y recorta el último a la cuota que quede; cada lote cuesta `lote.length + 1` por el
  `to` a la propia cuenta). **Envío parcial**: `enviarCorreoLote(...,
  claveSeguimiento)` anota en Script Properties (`LOTE_ENVIADOS_<idCurso>_<INICIO|MEDIO|WEBINAR>`,
  huella MD5 corta por correo, no el correo en claro) a quién ya le llegó cada aviso, y solo
  devuelve `true` — y por lo tanto solo se marca `Recordatorio_*_enviado` — cuando llegó a
  **todos**; las corridas siguientes mandan solo a los que faltan, sin duplicar. Aguanta ~630
  destinatarios por aviso (límite de 9 KB por propiedad): si un aviso no cabe, se detiene sin
  mandar lotes que no pueda anotar (evita reenviar), se da por concluido y avisa a Jorge por
  correo (`avisarSeguimientoLleno_()`). El aviso "empieza en 30 min / ya
  comenzó" deja de reintentarse al terminar el evento (`finConferencia_()`, usa `Hora_fin` si
  está capturada) o al terminar el día de inicio, lo que pase primero (28 sep 2026,
  `docs/QA-NOTES.md #47`). `esEmailValido_()` ahora rechaza dominios con punto final o
  `..` (caso real `vero_130171@hotmail.com.`). Constancias UNETE: el formulario de carga cierra
  a los 7 días de la conferencia (`DIAS_LIMITE_CONSTANCIA`, antes 2). Activador diario movido a
  las **9am** (antes 8am). Ver `docs/QA-NOTES.md #40`.
- **Agenda para Oficios (20 oct 2026, versión 29):** `?action=agendaCursos&desde&hasta&token`
  (`fdAgendaCursos_()`, solo lectura, `PANEL_TOKEN`): cierre de inscripción, inicio, sesiones,
  mitad de cursos largos y fin, para el resumen diario por Telegram de `oficios.gs`, que avisa a
  OTDE aunque nadie del equipo esté inscrito. Ver `docs/ARCHITECTURE.md §31`
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — recordar **Administrar implementaciones → Nueva versión**, no solo "Guardar" en el editor, o el sitio sigue sirviendo la versión anterior

### `apps-script/panel-otde.gs` (nuevo, ago 2026 — apagado el 14 oct 2026)
- **Apagado (14 oct 2026):** Jorge nunca lo usó y Oficios ya muestra las solicitudes de
  Mantenimiento y Asesorías. Se desinstaló su actualización automática (corría 48 veces al día,
  hasta 35 s, del tope diario de activadores de la cuenta). El código y el Sheet se quedan
- **No es un backend de trámite** — es un Apps Script aparte, pegado en un Google Sheet nuevo y propio ("Panel OTDE"), que junta en una sola hoja las solicitudes abiertas de Mantenimiento/Asesorías/Soporte/Correo, para no tener que entrar a los 4 Sheets por separado
- Llama por `UrlFetchApp` al `?action=pendientes&token=...` de cada uno de los 4 backends (los 3 sueltos de `apps-script/` + `apps-script/correo/WebApp.gs`, ver esa sección abajo). Token en Propiedades del script (`PANEL_TOKEN`), mismo secreto que los 4 backends
- Columna "Días" marcada en rojo/negrita a partir de `PANEL_UMBRAL_DIAS_ALERTA` (3 por default) sin moverse; aviso resumen arriba de la hoja
- Menú "Panel OTDE": Actualizar ahora · Instalar/Desinstalar actualización automática (cada 30 min)
- Detalle completo de la arquitectura en `docs/ARCHITECTURE.md §20`

### `apps-script/bitacora.gs` (nuevo, sep 2026)
- **No es un trámite:** es la bitácora interna de OTDE (Jorge y Nancy) para el reporte mensual de
  Planeación. Sheet "Bitácora OTDE 2026-2027" con hojas `Planeacion` (13 acciones + "Nombre
  corto"), `Actividades` y `Config` (responsables). Frontend `bitacora.html`
  (`BITACORA_APPS_SCRIPT_URL`)
- Clave de captura en Script Properties (`CLAVE_CAPTURA`), configurada desde el menú "OTDE
  Bitácora → Configurar clave de captura". Estados `sin_clave`/`no_autorizado`. Sin correo ni
  Telegram
- Menú "OTDE Bitácora": Generar reporte del mes (pestaña "Reporte AAAA-MM", bloques META 21/23 — antes 23/25, renumeradas el 29 sep 2026 por
  `bitRenumerarMetas_()`, ver `docs/ARCHITECTURE.md §26`
  con las celdas combinadas del Excel de Planeación) · Preparar hojas y cargar planeación
  (idempotente; también agrega y llena "Nombre corto" si falta) · Configurar clave de captura
- Para cambios: `apps-script/desplegar.sh <proyecto> --publicar "motivo"` (`docs/ARCHITECTURE.md §35`);
  a mano: pegar el `.gs` completo y **Administrar implementaciones → Editar → Nueva
  versión** (misma URL). Si el cambio toca hojas, correr "Preparar hojas" después
- **Alimentación automática desde Mantenimiento (24 sep 2026, en producción)**: menús "Traer
  visitas de Mantenimiento" y "Configurar conexión con Mantenimiento" (Script Properties
  `MAN_URL` + `PANEL_TOKEN`, capturadas en cuadros de diálogo). "Generar reporte del mes"
  también las trae antes de armar el reporte. Crea una actividad por folio y mes en META 21 /
  N.P. 7, con `ID de envío` `MAN:<folio>:<mes>`, y nunca pisa una fila existente. En el reporte
  se presenta como rehabilitación del Aula de Medios (`BIT_TIPO_MAN_AULA`, decisión de Jorge).
- **Asesorías resueltas (24 sep 2026, desplegado)**: menús "Traer asesorías resueltas" y
  "Configurar conexión con Asesorías" (`ASE_URL`; reutiliza el `PANEL_TOKEN`). Una actividad por
  folio en META 23 / N.P. 8 (`ASE:<folio>`); avisa si falta la fecha de realización o los
  asistentes. "Generar reporte del mes" trae Mantenimiento y Asesorías.
- **Formación Docente (6 oct 2026, en producción, probado por Jorge)**: menús "Traer cursos de
  Formación Docente" y "Configurar conexión con Formación Docente" (`FD_URL`; mismo
  `PANEL_TOKEN`, que en `formacion-docente.gs` se guarda con el menú "Configurar token del panel
  (Bitácora OTDE)"). `?action=cursosMes` devuelve los cursos cuyo desarrollo cae en el mes; una
  actividad por curso y mes (`FD:<ID_Curso>:<mes>`). El N.P. sale de la columna `NP_planeacion` de
  `Cursos` (vacía = no planeada en META 23, con aviso). "Generar reporte del mes" trae las tres
  fuentes. Ver `docs/ARCHITECTURE.md §26`.
- **Soporte (6 oct 2026, en producción, probado por Jorge)**: menús "Traer resumen de Soporte" y
  "Configurar conexión con Soporte" (`SOP_URL`). Una fila de resumen por mes (`SOP:<mes>`) en
  META 21, no planeada. Es **regenerable**: si se trae otra vez, se actualiza con los totales
  nuevos salvo que se haya corregido a mano (huella en Script Properties). Ver
  `docs/ARCHITECTURE.md §26`.
- **Correo institucional (6 oct 2026, en producción, probado por Jorge)**: menús "Traer resumen de
  Correo institucional" y "Configurar conexión con Correo institucional" (`CORREO_URL`, la URL
  de `apps-script/correo/`). `?action=correoMes` en `correo/WebApp.gs` cuenta las solicitudes de
  las 5 hojas con "Fecha de entrega" en el mes; una fila de resumen regenerable (`CORREO:<mes>`)
  en el N.P. 12 / META 23. "Generar reporte del mes" trae las 5 fuentes. Ver
  `docs/ARCHITECTURE.md §26`.
- **Visitas de solo equipos administrativos (23 oct 2026, v14; Mantenimiento v30)**:
  `?action=reportesMes` manda `tipoAtencion`; si todas las visitas de un folio son "Solo equipos
  administrativos" (`bitManSoloAdmin_()`), la actividad va con `BIT_TIPO_MAN_ADMIN` y cuenta
  "Equipos administrativos". Los reportes sin ese campo se redactan como antes
  (`docs/QA-NOTES.md #57`). Las filas ya importadas no se regeneran: borrarlas y volver a traer.
- **La planeación se edita en el Sheet** (hoja `Planeacion`) y se ve al instante en el formulario.
  Se pueden agregar filas con N.P. único y meta 21/23, y el "Nombre corto" va a mano. No insertar
  ni reordenar columnas antes de "Nombre corto" (lectura por posición) ni renumerar los N.P. 7/8.
- **Captura asistida (1 oct 2026, en producción y probada en vivo)**: el Propósito debe iniciar
  con un verbo en infinitivo (regla del Comunicado 001 de Planeación; la validan la página y
  `doPost`) y su borrador sale de la columna "Propósito sugerido" de `Planeacion`, no de
  "Resultados esperados"; medios YouTube/Facebook/Otro; "Sugerir descripción" y descripciones
  anteriores (`anteriores` en `?action=planeacion`). Columna `Va al reporte` en `Actividades`:
  "No" saca la fila del reporte (oficios de solicitud, que no son acciones). Las columnas nuevas
  las crea "Preparar hojas"
- Detalle completo en `docs/ARCHITECTURE.md §26`

### `apps-script/oficios.gs` (nuevo, oct 2026)
- **Fase 2A de la operación interna** (`docs/PLAN-OPERACION-INTERNA.md`): Sheet "Control de
  oficios OTDE" con hojas `Lotes`, `Numeros`, `Oficios`, `Config` e `Importar`. Frontend
  `oficios.html` (`OFICIOS_APPS_SCRIPT_URL`), en producción el 8 oct 2026
- **Tomar número**: la lista de números es de toda la Subdirección; OTDE reparte solo dentro de
  los **lotes** que le asignan cada año (2026: 4501-5000; el sistema empezó en el 4832). Formato
  `228C0101110500T/<n>/<año>`, reinicio por año calendario. Bajo `LockService`, idempotente por
  `ID de envío`, nunca reutiliza un número (cancelar = `Estatus` Cancelado + motivo). Lote nuevo:
  menú "OTDE Oficios → Agregar lote de números" (solo Jorge). Correo a Jorge al quedar ≤10
- **Oficios recibidos**: llave = **folio de Oficialía de Partes** + año (no duplica); el "No. de
  oficio del remitente" es otro dato. `OF-NNNN`, N.P. por ciclo, PDF a la carpeta de Drive
  "Oficios OTDE"
- **Paso 2D (8 oct 2026, en producción):** el oficio **no** va al reporte; la acción sí. Tomar
  número "para responder" deja el oficio **Atendido** solo. Si no, "Marcar como atendido" con 3
  opciones (`atenderOficio`): *ya llega sola* (Mantenimiento/Asesorías/Formación Docente/Correo,
  sin fila nueva, para no duplicar el reporte), *capturar la actividad* (pestaña Actividad
  precargada; al guardar, el oficio queda Atendido con su BIT-ID) o *solo conocimiento*. La hoja
  `Config` tiene "N.P. planeación" por tipo de oficio (propuesta de Claude, **pendiente de
  revisión de Jorge**). Los recordatorios del 2D salieron el 20 oct 2026 (ver abajo)
- **Paso 2B (8 oct 2026, en producción):** las solicitudes nuevas de Mantenimiento y Asesorías
  entran solas (`ofSincronizarOV_`, cada 30 min + menú; jala `?action=oficiosOV` de los dos
  backends con `PANEL_TOKEN`; URLs en Script Properties `OV_MAN_URL`/`OV_ASE_URL`, configuradas
  con "Configurar conexión con la Oficina Virtual"). Solo desde `OF_OV_DESDE` (el día en que se
  configuró, para no duplicar el Excel histórico). Entran sin folio de Oficialía (columna
  `Origen` = "Oficina Virtual"), porque OTDE debe imprimir todo oficio digital y llevarlo a
  Oficialía: la lista los marca "Falta folio de Oficialía" y "Anotar folio de Oficialía"
  (`anotarFolioOP`) los completa sin registrarlos dos veces (también cuando la escuela manda el
  impreso). Pasan a Atendido solos al quedar Resuelto/Rechazado. Pendiente = falta atender **o**
  falta folio. La clave de duplicado (folio + año) ignora los folios vacíos
- **Tipos de documento, comisiones y reasignar (12 oct 2026, en producción, probado por Jorge
  con una comisión real):** pedido del equipo. Tipo de documento (`OF_TIPOS_DOCUMENTO`);
  Difusión y Toluca/CoEEE = **un solo número por asunto**, aunque vaya a los 13 sectores.
  **Comisión = un oficio por persona y por día**, cada uno con su folio aunque sea el mismo
  destino: la tanda (personas × días, máx. `OF_MAX_TANDA` = 20) es todo o nada. Destino del
  catálogo con su texto completo (`destinoCompletoDe()`, "Turno Matutino/Vespertino"), modalidad
  (`Config → Modalidades`, B3 por default) y **km de ida y vuelta** con el servicio Maps de Apps
  Script (SEPRN → destino → SEPRN, sumando los dos tramos, como se hace a mano en Google Maps).
  Catálogo de personal en `Config` (`Personal`/`RFC`/`Cargo`/`Iniciales`, por renglón); **el RFC
  nunca sale del Sheet ni va en el código** (el repo es público). **Oficio de comisión en Word**
  (`generarComision`): `.docx` (no Google Doc: Gotham y cuadros de texto) a partir de la plantilla
  en Drive (`OF_PLANTILLA_COMISION_ID`, menú "Configurar plantilla de comisión"; copia local en
  `docs/insumos/PLANTILLA-COMISION.docx`, ignorada por git), un oficio por página. **La hoja del
  mapa NO se genera**: Viáticos exige la impresión de Google Maps tal cual; la página da "Abrir la
  ruta en Google Maps" (`urlRutaMaps()`) y el km editable antes de generar. "Reasignar /
  corregir" conserva el número y deja lo anterior en `Historial`. Al tocar el `.gs`, Maps puede
  pedir autorización nueva. Ver `docs/ARCHITECTURE.md §31`
- **Simplificación de Oficios (14 oct 2026, en producción, probada por Jorge):** origen
  `Interno` (`OF_ORIGEN_INTERNO`, sin folio ni tipo, cerrado como "Solo conocimiento" por
  default), "¿Baja o sube?" deducido (`ofDeducirDireccion_()`, misma regla que
  `direccionDeducida()` de la página), "Más datos (opcional)" siempre visible, chips de filtro y
  un solo botón principal por oficio. Un payload sin `origen` sigue siendo Oficialía (compatible).
  Ver `docs/ARCHITECTURE.md §31`
- **Paso 2C — oficio de salida en Word (19 oct 2026, desplegado por Jorge):** "Redactar oficio
  (Word)" en todo número que no es comisión; plantilla `PLANTILLA-OFICIO.docx` (del machote real)
  en Script Property `OF_PLANTILLA_OFICIO_ID`; todos/algunos sectores en un solo oficio, un oficio
  por sector con texto propio, u otra persona; cuerpo escrito en la página y guardado en
  "Contenido del oficio"; catálogo "Sector / área" en `Config` (13 sectores, que Jorge captura, +
  CoEEE con el Dr. Elpidio Pacheco Ojeda). Al configurar la plantilla salió "le faltan estos
  campos: INICIALES": Word había partido el campo al guardarla; lo resuelve `ofUnirCampos_()`
  (`docs/QA-NOTES.md #54`). El cargo del CoEEE con "y" se publicó el 19 oct 2026 (versión 10,
  primer despliegue con `apps-script/desplegar.sh`). Ver `docs/ARCHITECTURE.md §31`
- **Paso 2D — resumen diario por Telegram (20 oct 2026, versión 11, configurado y probado por
  Jorge):** una Difusión puede marcar "Convoca a una actividad presencial" (fecha, horario y
  lugar en las columnas de la comisión); "Fecha límite" se quitó de la página. Activador diario
  `ofRecordatoriosAutomatico` (7-8 am) a Jorge y Nancy (`TELEGRAM_CHAT_IDS`, mismo bot): hoy,
  mañana y en 3 días, con presenciales (más un mensaje aparte con el texto de WhatsApp),
  comisiones y fechas de Formación Docente (`OF_FD_URL` → `?action=agendaCursos`). Menú: probar,
  configurar Telegram, conexión con Formación Docente, instalar el activador. Primera corrida
  automática: 21 oct 2026. Ver `docs/ARCHITECTURE.md §31`
- **Visitas en el resumen diario (20 oct 2026, versión 12):** entran las visitas programadas de
  Mantenimiento y Asesorías (`?action=agendaVisitas`, mismas `OV_MAN_URL`/`OV_ASE_URL` de la
  Oficina Virtual, sin configuración nueva). Jorge pidió no duplicar: el equipo hace oficio de
  comisión por cada salida, a veces de un día para otro. Se cruzan por **CCT destino + fecha**:
  con comisión, la visita se anota dentro de esa comisión (folio y tipo); sin comisión, sale en
  "Visitas sin oficio de comisión", que sirve de recordatorio para hacerlo. Una comisión con el
  lugar escrito a mano (sin CCT) no cruza y la visita sale en las dos secciones
- **Formato del resumen (21 oct 2026, versión 13):** la primera corrida automática salió bien
  (7:48 am, "1 mensaje enviado", les llegó a Jorge y a Nancy). A petición de Jorge, el resumen
  pasa a `parse_mode: 'HTML'` (negritas en días, personas y asunto; cursivas en secciones y
  cursos; folios en monoespaciado; viñetas `•`), con reenvío en texto plano si Telegram lo
  rechaza, y los textos de WhatsApp llevan `*negritas*` de WhatsApp. Jorge corrió "Probar
  recordatorios" y se ve bien. El bot es el mismo de Soporte (`soporteotdeneza_bot`); Jorge le
  cambia solo el nombre visible en @BotFather (el usuario no se cambia)
- **Sector/Zona y "Cómo llegar" (21 oct 2026, versión 14; Mantenimiento v29, Asesorías v22):**
  cada comisión muestra "Sector XI / Zona 53", sacado del `Destino completo` con
  `ofSectorZonaDeDestino_()` (si el lugar se escribió a mano no hay; si cruza con una visita, se
  toma de ella), y las visitas traen `sector`/`zona` en `?action=agendaVisitas`. Las comisiones
  de quien coincida con `OF_MAPS_PERSONAS` (hoy "Bonilla", a petición de Jorge) llevan liga
  "Cómo llegar" de Google Maps con la `Dirección destino`; en el reenvío plano queda la URL
- Si cambia la interfaz de `oficios.html`/`bitacora.html`, las capturas de
  `images/manual-oficios/` quedan desfasadas (las 02-05 de Tomar número desde el 12 oct; la 06, 10 y 13 desde la simplificación del 14 oct, y la 07 ya no se usa). Se generaron con un script de Playwright sobre la
  página real con los dos `.gs` en una simulación de Sheets: **ese script no está en el repo**
  (vivió en la carpeta temporal de la sesión del 8 oct), hay que rehacerlo. Detalle en
  `docs/ARCHITECTURE.md §31`

### `apps-script/visitas-jefes.gs` (nuevo, ago 2026)
- **No es un backend de OTDE** — lo usan jefes de toda la Subdirección (~20 jefes de área +
  docentes que se sumen) para reservar y reportar sus visitas de inicio de ciclo/ceremonias
  cívicas. Sheet real `Seguimiento_Ceremonias_Cívicas_26-27`, tab "Reservas" (24 columnas)
- Folio `SEPRN-CC-NNNN` (no `OTDE-`). **Sin correo ni Telegram a propósito** — decisión explícita
  de Jorge; el folio se muestra en pantalla al reservar, sin respaldo por correo si se pierde
- `doGet` con 3 acciones: `disponibilidad` (picker + histórico, sin correo/teléfono — endpoint
  público), `consulta` (localizar por folio, precarga la ficha), `dashboard` (cobertura por
  persona/sector, gated por `DASHBOARD_TOKEN` — mismo patrón `PANEL_TOKEN` de arriba, configurado
  con `visConfigurarTokenDashboard('clave')`). `doPost` ramificado por `datos.accion` (`'ficha'`
  actualiza la fila de la reserva por folio; si no, crea una reserva nueva)
- Reserva bloqueada por CCT+semana vía `LockService.getScriptLock()` — evita que dos jefes
  reserven la misma escuela la misma semana aunque envíen casi al mismo tiempo
- Validación automática: la ficha es la prueba de que la visita ocurrió — trigger de tiempo
  diario (`visInstalarTriggerValidacion()`, desde el menú del Sheet, no automático al desplegar)
  marca "No realizada" lo que sigue en "Reservada" tras `VIS_DIAS_LIMITE_VALIDACION` (3) días de
  la fecha planeada
- Cobertura desigual (misma escuela revisitada, otras nunca) resuelta con avisos, no un candado
  — contador de cobertura y badge "Ya visitada" en `ceremonias-civicas.html`, aviso no
  bloqueante con motivo opcional de revisita (columna nueva en el Sheet) si se reserva una
  escuela ya "Realizada" en otra semana
- Reporte PDF para quien da seguimiento sin usar Sheets ni correo activamente
  (`visGenerarReporteSeguimiento_()`, menú del Sheet, no el Web App — no requiere redeploy):
  próximas visitas, realizadas recientes con la Operatividad completa, pendientes "No realizada"
- Fotos de la ficha comprimidas en el navegador (canvas, 1600px/JPEG q0.8) antes de subir — hasta
  20 por ficha, sin acercarse al límite de payload de Apps Script
- **Fix de rendimiento en el envío de la ficha (31 ago 2026)**: jefes reportaban "el servidor
  tardó en responder" al enviar fichas con varias fotos — confirmado con un performance test en
  vivo (hasta 68.7s con 20 fotos, por encima del timeout fijo de 30s del cliente, con el
  servidor terminando de guardar de todos modos). `visSubirFotos_()` ya no llama
  `archivo.setSharing()` por foto — la carpeta de Drive se comparte "cualquiera con el link, ver"
  una sola vez en `visObtenerCarpetaFotos_()` y los archivos nuevos heredan ese permiso (bajó a
  35.4s con 20 fotos, verificado en vivo). `ficha-ceremonias-civicas.html` usa un timeout propio
  de 120s (`FICHA_TIMEOUT_ENVIO_MS`) solo para este envío, vía el tercer parámetro opcional
  `timeoutMs` de `fetchJsonConTimeout()` (`js/tramites-shared.js`) — el resto del sitio sigue en
  30s. Ver `docs/QA-NOTES.md #23`.
- **Archivo de no realizadas (29 sep 2026, en producción y verificado en vivo)**:
  `visArchivarNoRealizadas_()` mueve "No realizada"/"Cancelada" a la pestaña `Archivo — No
  realizadas` a los `VIS_DIAS_ARCHIVO` (7) días de la fecha planeada, dentro del trigger diario
  (menú "Archivar no realizadas/canceladas ahora"). `visGenerarFolio()` cuenta también el archivo;
  la consulta por folio responde `archivada: true`. **Cuidado:** `Reservas` tiene un filtro de la
  maestra de seguimiento — `deleteRow()` no borra filas ocultas por un filtro, por eso existe
  `visConFiltroQuitado_()` (`docs/QA-NOTES.md #48`)
- Detalle completo de la arquitectura (esquema de columnas, por qué el folio actualiza una fila
  en vez de crear una nueva, decisión de la Fase 2 separada) en `docs/ARCHITECTURE.md §22`

### `apps-script/estrategias-nacionales.gs` (nuevo, sep 2026)
- **No es un trámite de OTDE**: lo usa la Oficina de Programas Educativos. Sheet
  `Estrategias_Nacionales_26-27`, hoja `Selecciones` (12 columnas A-L), folio `SEPRN-EN-NNNN`
  por escuela. Frontend `estrategias-nacionales.html` (`ESTRATEGIAS_APPS_SCRIPT_URL`). En
  producción y probado en vivo el 29 sep 2026
- **Regla: 1 escuela = 1 estrategia por ciclo**, con bloqueo duro en el servidor
  (`enMapaOcupadas_()` bajo `LockService`), no un aviso como en Ceremonias Cívicas. Aplica igual
  a las 4 estrategias, Jornada por la Paz incluida. Un lote registra las libres y rechaza las
  ocupadas con motivo. Solo cancelar el folio libera la escuela
- El ciclo lo define la Sheet: el ciclo siguiente usa una Sheet nueva y se actualiza
  `MESES_EN_CICLO`. Sin correo ni Telegram. Menú "SEPRN Estrategias" → resumen estrategia × mes
- Para cambios: `apps-script/desplegar.sh <proyecto> --publicar "motivo"` (`docs/ARCHITECTURE.md §35`);
  a mano: pegar el `.gs` completo y **Administrar implementaciones → Editar → Nueva
  versión**, con acceso "Cualquier usuario" (si no, responde "Acceso denegado", ver
  `docs/QA-NOTES.md #49`). Probar con curl: el `POST` escribe de verdad; usar CCT ficticios y
  cancelarlos. Detalle en `docs/ARCHITECTURE.md §28`
- **Página, 19 oct 2026:** Registrar y Cancelar usan `esperaConProgreso()` (botón ocupado y caja
  de avance); en celular (≤600 px) las dos tablas avisan "Desliza la tabla" y fijan la primera
  columna, y la lista de escuelas ya no se desborda a 320 px. Mensajes en singular con 1 escuela.
  Jorge lo confirmó en su celular


## `otde.html` — Oficina de Tecnología (OTDE)

**3 tabs, ninguna con formulario** (eran 7 hasta el 27 ago 2026 — los 4 trámites con formulario
propio, Correo/Mantenimiento/Asesorías/Soporte, migraron todos a páginas propias ese día, ver
`docs/ARCHITECTURE.md §21`): **1** Licencias Office (activa por default — antes lo era Correo)
· **2** Chuka · **3** Recursos. Comentarios `<!-- SERVICIO N: ... -->` en el HTML deben
coincidir con esta numeración. `otde.html` ya no carga `js/cct-db.js` ni
`js/tramites-shared.js` (se quitaron el 27 ago 2026 al migrar Correo — ninguna tab restante los
usa) ni tiene código muerto: `toggleForm()`, un helper genérico que ya no llamaba nadie desde
antes de esta ronda de migraciones, se eliminó en la misma sesión.

### Licencias Office
Instalador `descargas/Instalador_Office_2019_OTDE.exe` (self-extracting, incluye
`Instalador_Office_OTDE.bat` + Office Deployment Tool) que valida por CCT. El texto evita
atribuir la causa a SEIEM directamente (se enmarca como "actualización del esquema de
licenciamiento institucional"). Los 5 pasos de la guía rápida están basados en el flujo real
del `.bat` — si el `.bat` cambia, actualizar el manual para que siga siendo preciso.

### Banner de convocatoria
Uno solo hoy: Oficina Virtual (ago 2026, gradiente guinda `#56212f→#9F2241`, CTA clase `.light`,
enlaza a `oficina-virtual.html`). El banner de Centro de Formación Docente que vivía debajo se
quitó el 10 ago 2026 — quedó redundante en cuanto Formación Docente se volvió una card más del
hub (`oficina-virtual.html`), así que mantenerlo en `otde.html` era un segundo punto de entrada
al mismo destino. `formacion-docente.html`/`instructivo-formacion-docente.html` no se tocaron,
solo perdieron ese acceso duplicado. Clase reutilizable `.otde-banner`/`.otde-banner-cta`/
`.otde-banner-link` (sombra en capas, glow sutil, hover con elevación) — sigue viva para el
banner que queda y para cualquier banner futuro. Usa **Montserrat** a propósito, no Inter — es
la tipografía ya establecida en esta página, meter una fuente distinta solo en el banner se
vería ajeno.

## Páginas propias de trámite (`correo.html`, `mantenimiento.html`, `asesorias.html`, `soporte.html`)

Las 4 nacieron como tabs de `otde.html` y migraron a páginas propias el 27 ago 2026 (Correo al
final, por ser la más grande — 4 sub-formularios anidados), mismo precedente que
`formacion-docente.html`/`asistencia.html` pero con header/nav/footer institucional completo
(reusa `styles.css`, no un sistema visual propio) — detalle completo de la decisión y el proceso
en `docs/ARCHITECTURE.md §21`.

Patrón compartido por las 4: validación 100% en JS con `novalidate` en el `<form>` (los
`type="email"`/`required` nativos interceptan el `submit` antes de correr el JS si no se
desactiva la validación del navegador), un `idEnvio` que se conserva en los reintentos (el
backend devuelve el mismo folio en vez de crear otro, `docs/ARCHITECTURE.md §27`),
`fetchJsonConTimeout()` para evitar el freeze de
`fetch()` sin timeout documentado en `docs/QA-NOTES.md #1`, CCT con autocomplete + fallback
manual de Sector/Zona/Escuela (`js/cct-db.js`, detalle del patrón en `docs/ARCHITECTURE.md
§11`; cada campo del fallback valida y muestra su propio error — no agrupar todo bajo el
mensaje del CCT, anti-patrón ya corregido dos veces), y Nombre/Escuela manual homologados a
Title Case. `toTitleCase()`, `fetchJsonConTimeout()`, `otdePoblarFuncion()`,
`leerArchivoBase64()`, `TAMANO_MAX_ARCHIVO_BYTES`, `comprimirImagen()` (oct 2026; también la usa
`reporte-visita.html`) y el indicador de progreso (`esperaConProgreso()`,
`botonOcupado()`, `mostrarProgreso()`, oct 2026: todo envío debe mostrar que sigue trabajando,
ver `docs/ARCHITECTURE.md §29`) viven en `js/tramites-shared.js`, cargado con
`<script src="js/tramites-shared.js"></script>` en cada una de las 4 páginas, justo después de
`js/cct-db.js`. El CSS de estos formularios (`.servicio-header`, `.content-block`,
`.form-button`, `.form-container`, `.soporte-form-group` y sus hijos, `.sop-cct-wrapper`,
`.sop-cct-status`, `.sop-manual-fields`, `.soporte-submit-msg`) y el de contenido institucional
compartido (`.highlight-box`, `.benefit-list`, `.featured-box`, `.download-button`) viven en
`styles.css`. Los nombres de clase (`soporte-*`/`sop-*`) son heredados de cuando solo existía
Soporte y no se renombraron al generalizarse — sí se corrigió el selector de sugerencias CCT,
que antes era `#sop-cct-suggestions` (solo aplicaba a Soporte) y ahora es
`ul[id$="-cct-suggestions"]` (aplica a las 4 páginas).

**Navegación de regreso a Oficina Virtual (ago 2026)**: las 4 páginas tenían antes un callejón
sin salida — sin link de vuelta al hub ni entre trámites. Clases nuevas en `styles.css`
(`.tramite-back-link`, junto al `.hero-badge` de cada página; `.tramite-otros-tramites`/
`.tramite-otros-links`, bloque discreto al final del contenido con links a los otros 3
trámites + Oficina Virtual) — mismo patrón repetido en las 4, sin componente compartido (regla
de arriba). **`.form-container` con `max-width: 640px` (ago 2026, hallazgo de QA)**: antes sin
límite, los campos de texto (`input`/`select`/`textarea` al 100% del contenedor) se estiraban
hasta ~850px en pantallas anchas — un solo cambio en `styles.css` corrigió las 4 páginas a la
vez. Ver `docs/QA-NOTES.md #16`.

### Correo Institucional (página propia desde el 27 ago 2026, ver `correo.html`)
Reemplaza en código, tipo por tipo, al `<iframe>` del Google Form viejo — ver el modelo de
arquitectura completo en `docs/ARCHITECTURE.md §16`. Resumen operativo:

- **Switcher aplanado a botones al mismo nivel (ago 2026, creció a 5 en sep 2026)**:
  `.correo-panel-btn`, `mostrarCorreoPanel('alta'|'cam'|'rst'|'cyr'|'inc')` — Alta de cuenta |
  Cambio de Contraseña | Eliminar Método de Autenticación | Cambio de Contraseña + Eliminar
  Autenticación | No puedo acceder a mi cuenta. Antes era un switcher de 2 (Alta / "Cambio de
  contraseña · Eliminar autenticación · Otro") con un sub-switcher anidado de 3 dentro del
  segundo — Jorge reportó que se veían amontonados (más notorio en móvil, poco espacio para 3
  botones con textos largos dentro de un panel ya angosto); se aplanó a un solo nivel, con más
  espacio (`gap`) y grid de 2 columnas en móvil. El `<iframe>` quedó retirado por completo del
  código.
- **Quinto tipo — Cambio de Contraseña + Eliminar Autenticación (sep 2026, desplegado y
  verificado por `curl`)**: SIGEE (`sigee.dee.edu.mx`, v7.1 — migró desde la URL vieja por IP
  `189.206.211.185/sigid`) modernizó su módulo "Correo Institucional" y agregó este tipo
  combinado como solicitud de primera clase en su propio formulario de "Nueva solicitud", junto
  con "Actualización de datos" y "Baja/eliminar cuenta" (estas dos, pendientes, ver
  `docs/ROADMAP.md`). Jorge pidió priorizar el combinado por ser el caso más frecuente. Backend
  nuevo en `apps-script/correo/CambioYReset.gs` (`HOJA_CAMBIO_RESET = 'Cambio y Eliminar
  Autenticación'`, folio `OTDE-CYR-NNNN`, mismos 6 campos requeridos que Cambio de
  Contraseña/Eliminar Autenticación por separado, correo final combinado con contraseña nueva +
  pasos de Authenticator). Reusa la misma URL de despliegue (`CAMBIO_APPS_SCRIPT_URL`) y
  `crearCctAutocomplete('cyr')` — no fue necesario un despliegue nuevo, solo repegar los 5
  archivos y "Nueva versión". Verificado con `curl` (no un formulario real, para no escribir en
  el Sheet ni disparar correos/Telegram de prueba): `doPost` con `{"tipo":
  "cambioContrasenaYReset"}` sin más campos responde `{"status":"error","mensaje":"Campo
  requerido: cct"}` (confirma que el `case` nuevo en `WebApp.gs` enruta a
  `manejarCambioContrasenaYReset()`), y agregar `cct` avanza el error al siguiente campo
  (`escuela`) — contra un tipo inventado de control, que sí da "Tipo de solicitud no
  reconocido". Nota de tooling: los Apps Script Web Apps responden con un 302 a
  `script.googleusercontent.com/macros/echo?...` que hay que seguir con **GET** — `curl -L -X
  POST` reintenta el POST contra esa URL y devuelve la página de error genérica de Google
  Drive, no la respuesta real. La prueba de extremo a extremo quedó cubierta con uso real:
  `OTDE-CYR-0002` (8 oct 2026) llegó a "Cuenta entregada" (revisado en el Sheet el 15 oct 2026).
- **"2FA" renombrado a "Eliminar método de autenticación" (ago 2026)**: mismo término que usa
  SIGEE (para que Jorge/Marcos mapeen 1:1 al procesar), con una aclaración en paréntesis para
  docentes ("código de seguridad extra que a veces se traba"). El identificador interno que
  viaja al backend (`tipo: 'reset2FA'`) no cambió — es contrato con `Reset2FA.gs`, no texto
  visible.
- **No se tocó el sistema en vivo** (repo aparte `Correos-institucionales`, `Code.gs`/
  `OnFormSubmit.gs`/`OnEditTrigger.gs`/`ResumenSemanal.gs`, atado al Form viejo que sigue usando
  Marcos, sin git) — el backend nuevo es un proyecto de Apps Script separado y en paralelo, cuyo
  código fuente vive en **`apps-script/correo/`** de este repo (`Config.gs`, `WebApp.gs`,
  `Alta.gs`, `CambioContrasena.gs`, `Reset2FA.gs`, `CambioYReset.gs` (sep 2026), `Incidencias.gs`,
  `OnEdit.gs`, `GenerarResumenSIGEE.gs`, `ResumenSemanal.gs` — un solo trigger `onEditWebform`
  que enruta por nombre de hoja). **Movido a este repo el 31 ago 2026** desde `Correos-institucionales/
  webform-2026-2027/` (nació ahí como proyecto paralelo antes de que existiera el ecosistema
  unificado) — el despliegue real en Apps Script no cambió, solo dónde vive la copia editable.
  **Desplegado (6 ago 2026)**: Spreadsheet
  `Solicitudes_Correo_2026_2027`, proyecto "Webform Correo 2026-2027 - Backend", las 4
  constantes (`ALTA_CORREO_APPS_SCRIPT_URL`, `CAMBIO_APPS_SCRIPT_URL`, `RESET_APPS_SCRIPT_URL`,
  `INCIDENCIA_APPS_SCRIPT_URL`) apuntan a la misma URL real (`WebApp.gs` enruta por `datos.tipo`,
  un solo despliegue — 5 tipos desde sep 2026, sin constante nueva: el 5º reusa
  `CAMBIO_APPS_SCRIPT_URL`). El switcher del sitio ya mostraba los 4 tipos nativos originales desde
  antes de este despliegue, así que técnicamente el webform ya está en producción — pero el
  sistema viejo de Marcos siguió vivo en paralelo hasta el **14 oct 2026**, cuando se apagó: el
  Form ya no aceptaba respuestas y Jorge borró los activadores `resumenSemanal` y `onFormSubmit`
  del proyecto "Envío automatico". Solo queda `onEditTrigger`, por si Marcos cierra a mano una
  solicitud vieja.
- **Notificaciones a Marcos por Telegram + correo, reactivadas y ampliadas (sep 2026)**: el 18
  ago 2026 Jorge había acotado Telegram a solo `Incidencias.gs` y decidido no agregar correo de
  respaldo, para evitar ruido en el chat compartido de OTDE ante trámites rutinarios. En sep
  2026 pidió configurar notificaciones **personales** (Telegram a un chat_id propio de Marcos,
  ya no el compartido, + correo a `CONFIG.correoResponsable`) — un DM dirigido no es el mismo
  "ruido" que motivó la decisión de agosto, así que la revirtió a propósito. Alcance:
  `cambioNotificarEquipo()` (`CambioContrasena.gs`), `resetNotificarEquipo()` (`Reset2FA.gs`) e
  `incidenciaNotificarEquipoPorCorreo()` (`Incidencias.gs`, el Telegram de este ya existía)
  avisan los 3 a Marcos. `Alta.gs` sigue sin nada, sin cambios — alta de cuenta no bloquea a
  nadie, mismo motivo de siempre. **Script Properties**: `TELEGRAM_CHAT_ID` de este proyecto
  pasó del chat_id compartido de OTDE al chat_id personal de Marcos (mismo bot, mismo token).
  Ver `docs/QA-NOTES.md #24` por un bug real encontrado al probar este cambio en Mantenimiento/
  Asesorías (no afecta a este proyecto — Correo no manda URLs de oficio por Telegram).
- **`GenerarResumenSIGEE.gs` y `ResumenSemanal.gs` portados (18 ago 2026)**: el sistema viejo
  del Google Form los tenía y no eran portables directo (6 hojas con nombres/encabezados
  distintos a las 4 de aquí) — reescritos contra la hoja "Alta" consolidada y los estados reales
  del webform nuevo (`Solicitud recibida` → `Cuenta entregada`/`Reset notificado`/`Incidencia
  resuelta`). Trigger `resumenSemanal` (lunes 9am) instalado y confirmado en "Activadores".
- **Dominio auto-derivado, no preguntado** (solo en Alta — Cambio/Reset/Incidencias leen el
  dominio del correo institucional que la persona ya tiene): regla verificada en vivo contra
  SIGEE. El formulario nunca pregunta "¿@dee.edu.mx o @aulamexiquense.mx?" directamente — ver
  la regla completa en `docs/ARCHITECTURE.md §16`. Toda la lógica del lado del cliente vive en
  `altActualizarDominio()`/`altCalcularDominio()`, se recalcula en cada cambio de CCT/Función.
  **"Tipo de cuenta" quitado del formulario (ago 2026)**: antes, Director(a)/Subdirector(a) de
  una escuela elegía manualmente "personal" u "oficina" (de ahí dependía el dominio); Jorge
  pidió simplificarlo — ahora Director(a)/Subdirector(a) de escuela recibe siempre la cuenta de
  oficina `@dee.edu.mx` automáticamente, sin preguntar. `otdeDominioParaCCT()` en `js/cct-db.js`
  quedó sin llamador y se eliminó como código muerto; el payload sigue mandando `tipoCuenta`
  (ahora calculado, no elegido) solo para no romper el contrato con `Alta.gs`. El resultado se
  muestra igual como confirmación (`#alt-dominio-preview`) antes de enviar.
- **Campos de Alta**: CCT, Función, Nombre/Apellido Paterno/Apellido Materno/RFC/CURP (campos
  separados), Correo personal, Teléfono, Observaciones — encabezados reales confirmados por
  Jorge el 5 ago 2026 contra el Sheet viejo. **Función se repuebla según el tipo de CCT** (ago
  2026, `otdePoblarFuncion()`, ver `docs/ARCHITECTURE.md §11`) y el fallback manual de CCT
  (cuando no se encuentra) pide "Tipo de CCT" explícito en vez de meter SEPRN como una opción
  más de Sector — mismo patrón en los 4 sub-formularios de esta página (Alta/Cambio/Reset/
  Incidencias), aunque solo Alta usa el tipo para ramificar Función (los otros 3 no preguntan
  Función).
- **Teléfono unificado a "Teléfono (WhatsApp)" + correo con aviso de spam (ago 2026)**: mismo
  wording y aviso de contacto que el resto del sitio, en los 4 sub-formularios de esta página.
- **`crearCctAutocomplete(prefijo)`**: con 4 formularios usando CCT autocomplete en esta misma
  página (Alta/Cambio/Reset/Incidencias), se factorizó en una función compartida — única
  excepción en el sitio a "cada página mantiene su propia copia del patrón" (Soporte/
  Mantenimiento/Asesorías sí la mantienen; aquí la 4ª repetición casi idéntica en el mismo
  archivo cruzó el umbral).
- **Migración a página propia (27 ago 2026)**: el backend no cambió — última de las 4
  migraciones de `docs/ROADMAP.md` ítem 7 (ahora resuelto por completo). `otde.html` termina la
  ronda en 598 líneas, desde las 4,186 originales de antes de empezar. Dejó de cargar
  `js/cct-db.js`/`js/tramites-shared.js` (ninguna tab restante los usa) y perdió `toggleForm()`,
  un helper genérico que ya no llamaba nadie desde antes de esta migración (código muerto, no
  una regresión de esta ronda). Licencias Office pasó a ser la tab activa por default (antes lo
  era Correo).
- **"Planchado" de las 4 hojas — semáforo + dropdowns nuevos + protección de solo aviso (1 sep
  2026, desplegado y verificado en vivo)**: `configurarValidacionYSemaforo()` en
  `apps-script/correo/Config.gs` (utilidades compartidas entre los 4 tipos, a diferencia de
  Mantenimiento/Asesorías que son proyectos separados), corrida una vez desde el editor. Cada
  `Xxx.gs` (Alta/CambioContrasena/Reset2FA/Incidencias) tiene su propia
  `xxxAplicarSemaforoYProteccion_()`. `Estado general` ya tenía su dropdown desde antes (ver
  `docs/ARCHITECTURE.md §20`) — esta sesión solo le agregó el color. Dropdowns suaves nuevos en
  `Tipo de Cuenta`/`¿Cuenta lista?` (Alta), `¿Cuenta lista?` (Cambio), `¿Reset listo?` (Reset, el
  disparador real de ese tipo), `¿Cuenta lista?` (Incidencias). `Usuario asignado`/`Contraseña
  asignada` (las que Marcos llena a mano para disparar el correo de credenciales) se dejan sin
  tocar a propósito. Ver `docs/ARCHITECTURE.md §24` y `docs/manual-bases-tramites.html`.
- **Videotutorial de Microsoft Authenticator + avisos de multi-dispositivo (7 sep 2026)**: Jorge
  reportó que configurar la app de autenticación de Microsoft sigue siendo un cuello de botella
  real para directores/docentes pese al videotutorial que OTDE ya comparte por WhatsApp/oficio —
  faltaba un lugar permanente en el sitio. Bloque nuevo insertado en `.content-block`, entre el
  `.highlight-box` de "Sobre tus datos" y el `.correo-panel-switcher` (visible sin importar cuál
  de los 4 trámites se esté viendo, porque el problema no es exclusivo de ninguno): el video
  embebido (mismo patrón `.video-wrapper` de `otde.html`, CSS copiado inline aquí porque no vive
  en `styles.css`) y dos `.highlight-box` de aviso. El primero explica que Authenticator admite
  2+ dispositivos por cuenta — cuello de botella operativo real que Jorge identificó: cuando el
  director(a) (único con el dispositivo configurado) cambia de centro de trabajo, se lleva su
  celular y la escuela se queda sin acceso al correo hasta tramitar un nuevo alta/reset; la
  recomendación es que otra persona de la escuela también configure la app. El segundo, agregado
  a petición de Jorge para que la información llegue "muy digerida" a docentes, cubre el caso
  de quien ya tenía la app configurada pero perdió el dispositivo — los dirige directo al botón
  "Eliminar Método de Autenticación" ya existente en vez de repetir el video.
- **Alta a prueba de reintentos (25 sep 2026, en producción y verificado en vivo con Cambio de
  Contraseña)**: los 5 `manejar*()` registran con `registrarSolicitudSinDuplicar_()`
  (`apps-script/correo/WebApp.gs`): `LockService` + `ID de envío` (o todas las columnas
  capturadas idénticas en 10 min). Un reintento devuelve el mismo folio sin volver a mandar correo
  ni Telegram. Casos reales previos: `OTDE-CAM-0008`/`0009`, `OTDE-2FA-0012`/`0013`. Como estas
  hojas no tienen auto-heal, `asegurarColumnaIdEnvio_()` agrega "ID de envío" después de la
  última columna con datos. (Desde el 15 oct 2026 las hojas están por bloques y las columnas de
  notas de Marcos van al final, con título.) Al redesplegar hay que pegar **los 6** (`WebApp.gs` + los 5 tipos)
  y hacer una sola "Nueva versión". Ver `docs/ARCHITECTURE.md §27`.
- **Seguimiento de SIGEE, rechazos y Authenticator (14 oct 2026, `correo.html` en producción,
  `.gs` desplegados por Jorge el 15 oct 2026)**: `apps-script/correo/Seguimiento.gs` (nuevo) agrega al final de
  las 5 hojas `NP SIGEE`/`Fecha subida a SIGEE`/`Fecha respuesta SIGEE` (se anotan solas) y
  `Motivo de rechazo` (elegirlo pone "Rechazada" y avisa al solicitante). El resumen semanal
  suma atoradas sin NP, tiempos y rechazos. Los correos de Alta/Eliminar/Cambio + Eliminar traen
  `recuadroDosDispositivosHTML_()`; los formularios de Eliminar y Cambio + Eliminar preguntan
  "¿Qué pasó?" (`Motivo de pérdida de acceso`). Infografía `images/authenticator-2-celulares.png`.
  Al redesplegar, pegar `Seguimiento.gs` **y** los 10 modificados en una sola Nueva versión, y
  correr "Preparar columnas de seguimiento SIGEE". Ver `docs/ARCHITECTURE.md §32`.
- **Columnas por nombre y orden por bloques (15 oct 2026, en producción y verificado en vivo,
  versión 28)**: último trámite del reordenamiento. `encabezadosCorreo_(nombreHoja)` (en
  `Config.gs`, dentro de una función porque usa `HOJA_*` de otros archivos) define el orden de las
  5 hojas: registro → quién la pide → centro de trabajo → la solicitud → atención de Marcos (NP
  SIGEE → fechas → usuario/contraseña o "¿Reset listo?" → motivo de rechazo) → automáticas. Las
  altas se arman como objeto por nombre (`registrarSolicitudSinDuplicar_(hoja, valores,
  estadoInicial, generarFolio, idEnvio)`, `filaRealDesdeObjeto_()`), los folios con
  `siguienteFolioCorreo_()` y las validaciones con `colCorreo_()`; ya no hay `COL_ALTA_*`/
  `COL_CAMBIO_*`/etc. `idxEncabezado_()` busca primero el nombre exacto, para no confundir
  `Observaciones` (sistema) con `OBSERVACIONES` (Marcos). Menú "OTDE Correos → Reordenar columnas
  de las 5 hojas" (`reordenarColumnasCorreo_()`, verificación por posición porque hay encabezados
  repetidos: NOTAS ×3 en Incidencias), ya corrido en producción. Las columnas de Marcos quedaron al
  final; la que no tenía título (Cambio y Eliminar Autenticación) ahora se llama `NOTAS`. Al
  redesplegar Correo, pegar los archivos modificados y una sola Nueva versión. Ver
  `docs/ARCHITECTURE.md §33`.
- **Concentrado mensual, evidencia del N.P. 12 (23 oct 2026, v29 y v30)**: `ConcentradoMensual.gs`,
  menú "OTDE Correos → Generar concentrado del mes (evidencia N.P. 12)". Arma la pestaña
  `Concentrado AAAA-MM` (cifras del mes, gráficas por tipo y por sector, folios atendidos con NP
  SIGEE; los que no lo tienen, en rojo) sin nombre, RFC, CURP, correos, teléfono, usuario ni
  contraseña. "Atendida" = mismo criterio que `listarAtendidasMesCorreo_` (cuadra con la fila
  `CORREO:<mes>` de la bitácora). El PDF lo genera el script (`concGuardarPdf_()`, export con
  `ScriptApp.getOAuthToken()`) y lo guarda en la carpeta `Evidencias Correo institucional`, junto
  al Sheet (`concCarpeta_()`, ID en la Script Property `CONC_CARPETA_ID`); el del mismo mes se
  reemplaza. No se usa una liga directa a `/export` (`docs/QA-NOTES.md #55`). El permiso de Drive
  se autoriza desde el editor, no desde el menú (`#56`).

### Mantenimiento (página propia desde el 27 ago 2026, ver `mantenimiento.html`)
Ya no es solo texto ("solicita por oficio y vía estructura") — formulario "Solicitar
Mantenimiento" (`#btn-mantenimiento` + `toggleMantenimientoForm`) que digitaliza la captura sin
quitarle el oficio: pide adjuntarlo ya firmado en vez de sustituirlo. Detalle completo del
backend en `apps-script/mantenimiento.gs` y `docs/ARCHITECTURE.md §15`.

- **Adjuntar oficio**: `input type="file"`, límite de 5MB validado en
  `validarMantenimientoForm()` antes de leer el archivo; la lectura a base64
  (`leerArchivoBase64()` — antes `manLeerArchivoBase64()`, ver `js/tramites-shared.js` arriba —
  `FileReader.readAsDataURL`) solo ocurre ya validado, dentro de
  `enviarSolicitudMantenimiento()`.
- **Desplegado (6 ago 2026)**: `MANTENIMIENTO_APPS_SCRIPT_URL` con la URL real del
  deployment — ver detalle en `apps-script/mantenimiento.gs` arriba.
- **Cierre automático (7 ago 2026)**: al marcar Estatus = `Resuelto` en el Sheet, un trigger
  `onEdit` instalable notifica por correo al solicitante y a la Zona/Sector. Requiere haber
  corrido `manInstalarTriggerCierre()` una vez por proyecto — ver `docs/ARCHITECTURE.md §15`.
- **Repaso de UX (7 ago 2026)**: "Equipos con falla" pasó de textarea libre a checklist
  estructurado, Correo pasó a obligatorio, oficio restringido a solo PDF, Función/Cargo se
  repuebla por tipo de CCT — ver `docs/ARCHITECTURE.md §11` y `§15`. Redesplegado como versión 5.
- **Correo combinado a solicitante + Zona + Sector (11 ago 2026)**: apertura y cierre mandan un
  solo correo (`to`=solicitante, `cc`=Zona+Sector si hay contacto(s)) en vez de avisos sueltos
  que antes solo llegaban a Zona/Sector — ver `docs/ARCHITECTURE.md §15`. Redesplegado como
  versión 8.
- **Migración a página propia (27 ago 2026)**: el backend no cambió — solo el frontend salió de
  `otde.html` a `mantenimiento.html`, segunda de las 4 migraciones de `docs/ROADMAP.md` ítem 7
  (mismo patrón ya piloteado con Asesorías). De paso se movió a `styles.css` el CSS de
  contenido institucional compartido (`.highlight-box`, `.benefit-list`, `.featured-box`,
  `.download-button`) que Correo/Soporte/Licencias Office/Chuka/Recursos ya reusaban.

### Asesorías (página propia desde el 27 ago 2026, ver `asesorias.html`)
Nació como tab de `otde.html` (no existía como trámite — antes solo había un video suelto en
Recursos) y migró a página propia el 27 ago 2026, primera de las 4 migraciones planeadas en
`docs/ROADMAP.md` ítem 7 (las 4 migraciones ya completas, Correo fue la última). Mismo
patrón que Mantenimiento (oficio obligatorio + captura digital), más selector de "Tipo de
asesoría" y casilla de confirmación de mantenimiento previo (Banco de Materiales/Chuka ya
instalados) — detalle de por qué en `apps-script/asesorias.gs` y `docs/ARCHITECTURE.md §15`.
Prefijo de IDs/funciones: `ase`. **Desplegado (6 ago 2026)**: `ASESORIAS_APPS_SCRIPT_URL` con
la URL real del deployment. **Cierre automático (7 ago 2026)**: mismo mecanismo que
Mantenimiento (`aseOnEditCierre` / `aseInstalarTriggerCierre`). **Repaso de UX (7 ago 2026)**:
Correo obligatorio, oficio solo PDF, Función/Cargo por tipo de CCT — mismo detalle que
Mantenimiento arriba, redesplegado como versión 5. **Correo combinado a solicitante + Zona +
Sector (11 ago 2026)**: mismo rediseño que Mantenimiento (ver arriba) — redesplegado como
versión 7. **Migración a página propia (27 ago 2026)**: el backend (`apps-script/asesorias.gs`)
no cambió — solo el frontend salió de `otde.html` a `asesorias.html`, con header/nav/footer
institucional completo (reusa `styles.css`, sin nav/footer propio del sitio, se llega vía
`oficina-virtual.html`). Al hacerlo se encontró que `enviarSolicitudAsesoria()` ya dependía de
`manLeerArchivoBase64()`/`MAN_TAMANO_MAX_BYTES`, definidos dentro del bloque de Mantenimiento en
`otde.html` — dependencia cruzada no documentada. Se resolvió moviendo esos dos (renombrados
`leerArchivoBase64()`/`TAMANO_MAX_ARCHIVO_BYTES`) junto con `toTitleCase()`/
`fetchJsonConTimeout()`/`otdePoblarFuncion()` a `js/tramites-shared.js` (ver arriba), en vez de
solo duplicarlos en la página nueva.

### Soporte Técnico Remoto (página propia desde el 27 ago 2026, ver `soporte.html`)
TeamViewer (no Quick Assist) como herramienta de control remoto. Formulario "Solicitar Soporte
Técnico Remoto" (nombre, CCT, función, WhatsApp, correo, tipo de ayuda, urgencia, descripción) →
`apps-script/soporte-remoto.gs`. **Repaso de UX (7 ago 2026)**: Correo pasó de opcional a
obligatorio, nuevo campo "Tipo de ayuda" (select obligatorio), Función/Cargo por tipo de CCT —
redesplegado como versión 4. **Migración a página propia (27 ago 2026)**: el backend no cambió
— tercera de las 4 migraciones de `docs/ROADMAP.md` ítem 7 (Correo, la última, se migró justo
después en la misma sesión). Sin dependencias cruzadas nuevas ni CSS nuevo por mover — ambos ya
estaban resueltos por las migraciones de Asesorías y Mantenimiento. La referencia cruzada con
Licencias Office (cada uno enlaza al otro si el problema es de instalación/licencias) dejó de
usar `showServicio()` con `onclick` (solo funcionaba dentro de `otde.html`) — ahora son links
reales: `soporte.html` → `otde.html#office` (Office sigue siendo tab, aprovecha el deep-link
por hash ya existente en `otde.html`), y `otde.html` (tab Office) → `soporte.html` directo.

## `protocolos.html` — Protocolos de Actuación (ago 2026)
Hub con 3 protocolos oficiales del **Gobierno del Estado de México / SEIEM** (no producidos por
SEPRN): Erradicación del Acoso Escolar, Mochila de Paz y Prevención, y Prevención/Detección/
Actuación en Abuso Sexual Infantil-Acoso-Maltrato. **Ojo — no es un protocolo por oficina**: los
3 documentos aplican transversalmente y se accede a los 3 desde cualquiera de las tres páginas
(no hay mapeo 1:1 protocolo↔oficina). Nace del mismo patrón de aislamiento que
`oficina-virtual.html`: **no está en el nav principal ni en el sitemap del footer**, se llega
solo por un botón CTA (`.protocolo-banner`, estilo inline adaptado del `.otde-banner` de
`otde.html`, texto idéntico en las 3 páginas) insertado al inicio de `content-section` en
`juridico.html`, `academica.html` y `oeve.html` — los 3 apuntan igual a `protocolos.html`, sin
ancla.

- Una sola sección `.seccion` con las 3 tarjetas (`.protocolo-card fade-item`), cada una con un
  `id` descriptivo del protocolo (`erradicacion-acoso-escolar`/`mochila-de-paz`/
  `abuso-sexual-infantil`, no de oficina) por si se necesita enlazar a una directamente
  (`scroll-margin-top` en la tarjeta compensa el header `sticky`).
- Cada tarjeta lleva dos botones: **"Ver"** (`target="_blank" rel="noopener"`, sin `download`
  — abre el PDF en el visor del navegador) y **"Descargar"** (mismo `href` + `download`). Es el
  primer lugar del sitio con un link "Ver" — hasta ahora todo `href="pdfs/...pdf"` forzaba
  descarga.
- **Ícono temático por protocolo** (ago 2026, para hacerlas más visuales sin depender de
  portadas de PDF inconsistentes — se evaluaron miniaturas de la primera página de cada PDF y
  solo Mochila de Paz tenía una portada ilustrada, las otras dos son páginas de Gaceta de
  Gobierno sin diseño): escudo con check (Erradicación de Acoso Escolar), mochila (Mochila de
  Paz — literal), corazón (Abuso Sexual Infantil/Maltrato — deliberadamente no literal, tema
  sensible). Badge circular 64px, mismo estilo de línea que `.area-icon` de `areas.html`.
  `.protocolo-card` lleva además un `border-top` guinda de 4px como acento.
- Dos de los 3 protocolos tienen página/documento oficial externo — enlace `.info-link`
  ("Más información →") bajo los botones Ver/Descargar: Erradicación de Acoso Escolar →
  `conebi.edomex.gob.mx/.../dic181e.pdf` (verificado por hash SHA256: es el mismo archivo que
  el PDF local, no solo un documento relacionado); Abuso Sexual/Maltrato →
  `seiem.edu.mx/web/protocolo_derechos` (verificado por contenido de la página, coincide con el
  título exacto del protocolo). Mochila de Paz no tiene liga externa — Jorge solo compartió
  las otras dos.
- PDFs en `pdfs/protocolos/` (planos, sin subcarpeta por área — a diferencia de
  `pdfs/cte/cte-<ciclo>/...`, aquí no aplica porque no son documentos propios de SEPRN
  organizados por sesión/ciclo): `Protocolo-Erradicacion-Acoso.pdf`,
  `Protocolo-Mochila-Paz.pdf`, `Protocolo-Prevencion-Deteccion-Actuacion-Abuso-Sex.pdf`.
- **Sin contador de vistas/descargas** (decisión deliberada, ago 2026): se evaluó un backend
  Apps Script + Google Sheet (mismo patrón que `apps-script/cursos-coeee-2026.gs`) pero se
  dejó fuera para lanzar la página 100% estática sin configuración manual adicional; se
  reconsidera solo si hace falta después de ver la página en uso real.
- **Sección "Código QR"** (ago 2026): `images/qr-protocolos.png` — generado localmente con
  `qrcode`+Pillow (Python), no un servicio externo. Nivel de corrección de errores alto
  (`ERROR_CORRECT_H`) para poder superponer el logomark NE/ZA al centro sin perder legibilidad
  (verificado que decodifica correctamente con `cv2.QRCodeDetector` antes de publicarlo).
  Módulos redondeados en guinda, tarjeta con el mismo lenguaje visual que `.protocolo-card`,
  título/subtítulo/URL de respaldo ya incluidos dentro de la imagen. Enlaza a
  `https://educaneza.github.io/seprn-sitio/protocolos.html`. Botón "Descargar código QR" con
  `download` — pensado para compartirse por WhatsApp (recomendable enviarlo como documento, no
  como foto, para que WhatsApp no lo recomprima y arriesgue la lectura del QR).

## `oficina-virtual.html` — Oficina Virtual OTDE (ago 2026, hub de servicios + seguimiento)
Reusa `styles.css` (misma identidad institucional que `otde.html`, no un sistema propio como
Formación Docente — es una utilidad de una sola pantalla que continúa un trámite ya empezado en
`otde.html`, no una pieza de marketing/conversión). Nace de retomar la visión de Jorge de una
"oficina virtual" aparte de `otde.html`, planteada y pospuesta el 7 ago 2026
(`docs/BITACORA.md`), con el foco confirmado en seguimiento de solicitudes.

- **`otde.html` no cambió de estructura** — solo ganó el banner de arriba y un manejador de
  `location.hash` en `DOMContentLoaded` (busca `.servicio-tab[aria-controls="<hash>"]` y llama
  `showServicio()`) para que los links abran la tab correcta al cargar. Con los 4 trámites ya
  migrados a páginas propias (27 ago 2026), `oficina-virtual.html` ya no lo usa — enlaza directo
  a `correo.html`/`mantenimiento.html`/`asesorias.html`/`soporte.html`. El manejador se deja
  tal cual porque sigue siendo necesario para el link cruzado `soporte.html` → `otde.html#office`
  (ver `docs/ARCHITECTURE.md §21`) y es genérico (no referencia IDs específicos), no por
  descuido.
- **Grid de servicios** (patrón `.area-card` de `areas.html`, adaptado): Centro de Formación
  Docente y los 4 trámites tipo-ticket (Mantenimiento/Asesorías/Correo/Soporte), cada uno con un
  link "Solicitar →" (deep-link a `otde.html`) y "Consultar estatus →" (ancla a `#buscar-folio`).
  Una card "Próximamente" (`.ov-proximamente`, borde punteado) deja la grid lista para crecer.
  **Formación Docente reactivada (10 sep 2026)**: había estado deshabilitada desde el 1 sep 2026
  (`<div class="area-card ov-proximamente">`, catálogo vacío en producción) — se reactivó
  (`<a href="formacion-docente.html" class="area-card">` + "Ver catálogo →") al dar de alta el
  primer curso real en la hoja `Cursos` ("Formación Docente en Inteligencia Artificial",
  Fundación Televisa, `ACF-2627-001`), verificado en vivo contra el `doGet` de
  `formacion-docente.gs`.
- **Buscador de seguimiento** (`#buscar-folio`, debajo de la grid de tarjetas desde el 16 ago
  2026 — antes era el hero del hub, se reordenó para priorizar la acción principal de elegir un
  trámite sobre el caso secundario de consultar un folio ya existente): folio + correo → ruteo
  automático
  por prefijo (`OV_TIPOS_DE_TRAMITE`, función `ovResolverTramite()`) a la URL de deployment
  correspondiente, sin preguntarle al usuario el tipo de trámite. Desde el 5 oct 2026 carga
  `js/tramites-shared.js` (antes tenía su propia copia de `fetchJsonConTimeout()`), y la consulta
  muestra spinner y caja de progreso con `esperaConProgreso()` (`docs/ARCHITECTURE.md §29`).
- **Contrato de consulta, igual en los 4 backends**: `GET ?action=consulta&folio=XXX&correo=YYY`
  → `{status:'ok', folio, fecha, estatus, notas}` o `{status:'no_encontrado'}` (mismo mensaje si
  el folio no existe o el correo no coincide, para no dejar adivinar folios válidos por
  descarte). Es un GET simple sin headers custom — no dispara preflight CORS, a diferencia de los
  POST existentes que usan `Content-Type: text/plain` para lo mismo.
  - `mantenimiento.gs`/`asesorias.gs`: `doGet(e)` ramificado + `manConsultarFolio()`/
    `aseConsultarFolio()`, lectura directa por `getSheetByName()` sin pasar por
    `manObtenerHojaSolicitudes()`/`aseObtenerHojaSolicitudes()` (esas funciones escriben).
  - `soporte-remoto.gs`: mismo patrón (`sopConsultarFolio()`), habilitado por el `Estatus` nuevo
    documentado arriba.
  - `apps-script/correo/WebApp.gs` (en este repo desde el 31 ago 2026; antes vivía en el repo
    `Correos-institucionales`): `manejarConsultaCorreo()` resuelve la hoja correcta por el prefijo
    del folio (`Alta`/`Cambio de Contraseña`/`Reset 2FA`/`Cambio y Eliminar Autenticación`/
    `Incidencias`, columnas distintas entre sí) y
    expone `Estado general` tal cual — texto libre, sin vocabulario cerrado, a propósito no
    migrado a dropdown en esta ronda. Acepta Correo Personal o Institucional como llave
    indistintamente.
- **No es autenticación real** — folios secuenciales + correo institucional a veces predecible.
  Mismo nivel de protección que el resto del sitio (sin PII más allá de un estatus), consistente
  con la decisión previa de no construir login propio (ver Formación Docente arriba). El texto de
  cara al usuario dice "consulta rápida", nunca "portal seguro".
- **Badges de estatus** (`ovRenderEstatus()`): los 5 valores fijos de Mantenimiento/Asesorías/
  Soporte se pintan con color (`OV_BADGES`); el "Estado general" de Correo, al ser texto libre,
  se muestra plano — no se intenta mapear a un vocabulario cerrado que no existe. Si
  `Estatus` llega vacío, MAN/ASE/SOP muestran "Pendiente de validar" (`estatusInicial` en
  `OV_TIPOS_DE_TRAMITE`, 25 sep 2026). **Prefijos:** `OV_TIPOS_DE_TRAMITE` tiene 8 (3 sueltos +
  5 de Correo, incluido `OTDE-CYR-` desde el 25 sep 2026). Un prefijo nuevo va aquí **y** en el
  backend, ver `docs/QA-NOTES.md #45`.
- **Redesplegado a producción (10 ago 2026)**: los 4 backends — `mantenimiento.gs` (v6),
  `asesorias.gs` (v6), `soporte-remoto.gs` (v5), `WebApp.gs` de
  `Correos-institucionales/webform-2026-2027/` (v4) — mismos IDs de implementación de siempre.
  Verificado en vivo con `curl` para los 7 prefijos: todos responden `{"status":"no_encontrado"}`
  para un folio inventado, confirmando el código nuevo en producción.
- **Bug real cazado en el primer despliegue de `WebApp.gs`**: un `const` de nivel superior
  (`MAPA_PREFIJO_HOJA_CONSULTA`) que leía `HOJA_ALTA`/`HOJA_CAMBIO`/`HOJA_RESET`/
  `HOJA_INCIDENCIAS` (definidas en los otros archivos del proyecto) tronaba
  `ReferenceError: HOJA_ALTA is not defined` — Apps Script no garantiza el orden de evaluación de
  `const`/`let` de nivel superior entre archivos de un mismo proyecto multi-archivo. Fix: el mapa
  se arma ahora dentro de `manejarConsultaCorreo()`, no a nivel de módulo — ver el comentario en
  el propio `WebApp.gs`. Corregido y redesplegado (v4) antes de que ningún usuario real lo
  encontrara.
- **Trigger de Soporte instalado vía UI, no programáticamente**: `sopInstalarTriggerCierre()`
  corrió sin error desde el editor pero no dejó ningún activador registrado (0 en "Activadores").
  Se instaló en su lugar a mano vía "Agregar activador" → función `sopOnEditCierre`, fuente
  "Desde la hoja de cálculo", evento "Al editar" — eso sí quedó registrado y funcional. Causa
  raíz no investigada; si se vuelve a instalar este trigger (o los de Mantenimiento/Asesorías),
  confirmar en la pestaña "Activadores" del proyecto que sí aparece, no solo que la función
  corrió sin arrojar error.

## `formacion-docente.html` — Centro de Formación Docente (jul 2026, DESPLEGADO)
Página autónoma (no importa `styles.css`). Vinculada desde `otde.html` mediante banner destacado. Nace de sistematizar el flujo de convocatorias CoEEE (webinars, seminarios, diplomados, cursos autogestivos, acciones formativas, proyectos didácticos) que antes se resolvía con un Google Form distinto por curso.

- **Flujo**: 2 pasos — (1) selección multi-curso desde un catálogo **cargado dinámicamente** (`fetch` a `doGet`), con un paso intermedio condicional "regístrate primero en la plataforma externa" si algún curso elegido tiene `registro_previo_requerido=true`; (2) formulario único de datos personales, envío secuencial por curso
- **Sin paso de redirección externa obligatorio para todos**: solo los cursos marcados con cupo real fuerzan ese paso — el resto muestra la liga como referencia en la confirmación. Ver `docs/DESIGN_SYSTEM.md`
- **Campos**: Nombre completo, RFC, Correo, Teléfono (10 dígitos), CCT (autocomplete), Función — deliberadamente mínimo; Sector/Zona/Escuela/Municipio se autocompletan desde `cct-db.js`. Nombre/Escuela manual homologados a Title Case
- **Modelo de datos relacional en Sheets**: `Docentes` + `Cursos` + `Inscripciones`, ver detalle en la sección de `apps-script/formacion-docente.gs` arriba
- **Constancias fuera de alcance, salvo UNETE (sep 2026, ya implementado)**: ni los webinars/seminarios ni los programas de CoEEE requieren que OTDE administre el documento — solo seguimiento estadístico. La única excepción real es el Ciclo de Conferencias Virtuales de UNETE, que sí tiene recordatorio + carga de constancia (ver `apps-script/formacion-docente.gs` arriba y `docs/ARCHITECTURE.md §12`) — activado por curso, no por categoría. La franja de confianza al pie de la página lo refleja como "Constancia según programa", nunca como promesa genérica
- **Carga de constancia (sep 2026)**: sección `#paso-subir-constancia` (`mostrarSubirConstancia()`/`enviarConstancia()`), activada por `formacion-docente.html?subirConstancia=<folio>&t=<firma>` — mismo patrón de página que la confirmación del doble registro, pero con un campo de archivo en vez de un botón de un clic
- **Diseño premium propio (jul 2026)**: tipografía Inter/Inter Tight (Google Fonts), tarjetas de curso con fondo pastel por categoría + ícono grande, prueba social real de inscritos (nunca inventada — se oculta si es 0), resumen de selección como panel lateral sticky en escritorio (≥960px) / barra flotante en móvil, ambos alimentados por una sola función `actualizarResumenSticky()`. Detalle completo de tokens y patrones en `docs/DESIGN_SYSTEM.md` — **consultarlo antes de rediseñar cualquier parte de esta página**, ya tiene su propio sistema
- **Recordatorios automáticos** y **aparición programada** (`Visible_desde`): ver sección de `apps-script/formacion-docente.gs` arriba
- **Calendario y comprobante en la confirmación (28 sep 2026)**: como la cuota de correo no alcanza para todos, `mostrarConfirmacion()` le da a cada curso "Copiar" folio, fecha y hora, y "Agrégalo a tu calendario" (Google Calendar + `.ics` con alarmas 1 día y 30 min antes). Si el curso trae `Fechas_sesion`, hay un evento por sesión; **sin `Hora_inicio` (autogestivos, 12 oct 2026)** esas fechas son puntos de avance y, sin ninguna, se agenda un "Vas a la mitad" (`eventosSinHora()`). Al pie: "Guardar comprobante (imagen)" (PNG en canvas; en celular abre "Compartir") y "Enviármelo por WhatsApp". Liga para inscritos previos: `formacion-docente.html?calendario=ID[,ID2]` (`mostrarSoloCalendario()`), solo con los botones de calendario. Todo se genera en el navegador. **29 sep 2026:** botón "Recomendado" según el dispositivo (`plataformaCalendario()`: Google en Android, `.ics` en iPhone, ninguno en computadora), etiquetas de para quién es cada botón (sin logotipos de marca) y, con 2+ cursos, un `.ics` "Todos mis cursos" arriba de las tarjetas (`crearBloqueTodosCalendario()`, no en Android). Detalle en `docs/ARCHITECTURE.md §12`
- **Orden del catálogo (28 sep 2026)**: `ordenarCatalogo()` pone primero lo abierto, luego cupo agotado y al final cerrado; dentro de cada grupo, el curso agregado más recientemente a la hoja va primero. Las ligas en `Descripcion` se pintan clicables y cortas (`pintarTextoConLigas()`)
- **Etiqueta de validez USICAMM/PROEEB + historial "Cursos anteriores" (sep 2026, desplegado y confirmado en producción el 17 sep 2026)**: `.cc-valida-badge` destaca los cursos con `Valida_USICAMM`/`Valida_PROEEB` (combinadas en una sola etiqueta si aplican ambas). Cursos con inscripción cerrada pero aún en desarrollo pierden el CTA de selección sin salir del catálogo. **Tarjetas rediseñadas el 23 sep 2026**: cabecera más baja con chip de estado `.cc-estado` (reemplaza a `.cc-cerrado-tag`), fechas con etiqueta en `.cc-fechas` ("Inscríbete hasta" / "Curso"), botón visual `.cc-cta` al pie y cierre en vivo en el cliente (`vigilarCierres()`) — ver `docs/DESIGN_SYSTEM.md`. Sección nueva `#cursos-pasados-wrap` (`renderCursosPasados()`) con hasta 6 cursos ya concluidos, en gris/bloqueados (`.curso-card-historial`), siempre visible cuando hay historial — con o sin cursos vigentes disponibles — y coexistiendo con el mensaje de `#catalogo-vacio` en vez de reemplazarlo. Detalle completo del modelo de 3 estados en `docs/ARCHITECTURE.md §12` y `docs/DESIGN_SYSTEM.md`; estado real verificado en `docs/ROADMAP.md` ítem 18
- Pendiente de fases futuras: validación de asistencia con código de cierre en webinars (columnas `Requiere_codigo_asistencia`/`Codigo_asistencia` ya existen), dashboards por sector/zona (decisión previa: Looker Studio conectado directo a la hoja, no un dashboard propio — revisar con Jorge antes de construir uno custom, ver `docs/ROADMAP.md`)

## `ceremonias-civicas.html` + `ficha-ceremonias-civicas.html` — Ceremonias Cívicas (ago 2026)
Primer sistema del sitio que no es un trámite de OTDE — lo usan ~20 jefes de área de toda la
Subdirección más docentes que se sumen, para reservar y reportar sus visitas de acompañamiento
al inicio de ciclo escolar y a las ceremonias cívicas semanales. Header/nav/footer institucional
completo (reusa `styles.css`), mismo patrón que las páginas de trámite de OTDE, aunque no es una
de ellas. Backend: `apps-script/visitas-jefes.gs` (ver arriba). Sin entrada en nav/footer del
sitio, se comparte por link directo (hay un QR institucional, `images/qr-ceremonias-civicas.png`/
`.pdf`, generado con el mismo estilo/técnica que `images/qr-protocolos.png` — ver esa sección).

- **`ceremonias-civicas.html`** (renombrado de `visitas-escolares.html`): formulario de reserva
  (CCT con autocomplete + fallback manual con cascade Sector→Zona, campo "Subjefatura/Oficina"
  sin opción "Docente", sin correo/teléfono — el sistema no notifica a nadie, no tenía caso
  pedirlos) + tabla de disponibilidad/histórico con buscador + paginación (20/página) + contador
  de cobertura + panel de cobertura por persona/sector (`DASHBOARD_TOKEN`). El formulario de
  reserva empieza **expandido por defecto** (sep 2026, feedback de que nadie intuía que había que
  abrirlo) y arriba de él hay una guía "Cómo funciona, paso a paso" (4 pasos). El panel de
  cobertura, que estuvo comentado/oculto hasta el 6 sep 2026, ya se reactivó, y esa misma sesión
  quedó además en **modo público temporal sin clave** (`visConfigurarDashboardPublico(true)`,
  prueba de unos días a pedido de Jorge — ver `docs/ARCHITECTURE.md §22` para revertirlo)
- Bug real corregido (sep 2026): fichas duplicadas hasta 5 veces por reintentos tras timeout, sin
  idempotencia en el backend — ver `docs/QA-NOTES.md #26`. Las fotos de Drive ahora además se
  organizan en subcarpetas por semana (`Semana YYYY-MM-DD`)
- **Cuatro mejoras por etapas (20 sep 2026, desplegadas y confirmadas por Jorge)**, detalle
  completo en `docs/ARCHITECTURE.md §22`: (1) filtros de historial (chips de estatus incl. "⚠
  Vencida", rango de fechas) y el Panel de cobertura ahora lista también los sectores en 0/X,
  ordenados por menor cobertura primero; (2) nueva sección "Reagendar o cancelar mi visita"
  (autoservicio por folio, motivo obligatorio, columna Y `Historial de cambios` en la Sheet); (3)
  el reporte de seguimiento ahora acepta una fecha de referencia (`visPedirFechaReferencia_()`) y
  hay un segundo reporte PDF (`visGenerarReporteResumen_()`, columnas C/D/G/H/I/J/O/Q/U/V/W de
  visitas `Realizada`) — rediseñado de tabla a tarjetas el mismo día tras feedback de Jorge de que
  la tabla original era ilegible; (4) nueva pestaña **"Dashboard" dentro de la misma Sheet**
  (`visActualizarDashboardHoja_()`, menú "SEPRN Visitas") con mezcla de estatus, visitas por
  persona/sector y tendencia semanal — **este es el dashboard que Jorge había pedido desde antes**,
  no el panel de cobertura del sitio (que resuelve un pedido distinto, sectores sin visitar).
- **Escuelas pendientes de visita + archivo de no realizadas (29 sep 2026, en producción)**:
  sección `#vis-pendientes` con las escuelas sin visita realizada ni reserva vigente (filtros
  sector/zona/municipio/turno, domicilio, "Elegir esta escuela"); turno y domicilio en
  `js/escuelas-direcciones.js`, cargado solo aquí. Las "No realizada"/"Cancelada" salen de la
  tabla a los 7 días (pestaña `Archivo — No realizadas`, ver `apps-script/visitas-jefes.gs`
  arriba). Detalle en `docs/ARCHITECTURE.md §22`.
- **Confirmación con comprobante + progreso visible (5 oct 2026, en producción)**: al reservar, la
  tarjeta `#reservar-ok` reemplaza al formulario: folio con "Copiar", resumen, "Guardar
  comprobante (imagen)" (PNG en canvas, como Formación Docente), WhatsApp y "Ir a la ficha". Todas
  las esperas (reserva, ficha con fotos, buscar folio, reagendar, cancelar, panel) usan el
  indicador compartido. Antes, la ficha escribía su progreso en una caja oculta
  (`docs/QA-NOTES.md #51`). Ver `docs/ARCHITECTURE.md §22` y `§29`.
- **`ficha-ceremonias-civicas.html`** (renombrado dos veces: `ficha-visita-jefe.html` →
  `ficha-informativa-visita.html` → nombre final; el genérico quedó reservado para una futura
  Fase 2 de reporte general al Community Manager, ver `docs/ROADMAP.md` ítem 13): ficha
  post-visita localizada por folio, precarga automática si llega por `?folio=...`. Campos para
  el Community Manager (Nombre de la actividad, Propósito, Convocados/Participantes con nombre
  de autoridades, Descripción general, Cantidad de asistentes — badge "Para difusión") separados
  visualmente de la Operatividad de la escuela (badge "Uso interno", no se difunde). Hasta 20
  fotos comprimidas en el navegador (canvas, 1600px/JPEG q0.8) antes de subir, con guía de qué
  fotografiar y aviso de protección de menores de edad (repetido también en el formulario de
  reserva, para que llegue *antes* de la visita, no solo después)
- Detalle completo de la arquitectura (esquema de columnas, decisión de sin notificaciones, por
  qué el folio actualiza una fila en vez de crear una nueva, la separación de la Fase 2, los 3
  fixes de UI/UX encontrados en pruebas) en `docs/ARCHITECTURE.md §22`

## `js/cct-db.js` — Campo `municipio` agregado (jul 2026)
Los 506 registros se enriquecieron con `municipio` (18 municipios) cruzando por CCT contra `Catalogo SEPRN direcciones.xlsx` (columna `municip`, 612 filas, 100% poblada). El sector **no** determina el municipio de forma confiable — varios sectores abarcan múltiples municipios (ver mapa SVG de `index.html`) — por eso el municipio se deriva del CCT exacto, no del sector. Cualquier página que use el autocomplete de CCT puede ahora leer `m.municipio` igual que `m.sector`/`m.zona`/`m.nombre`.


## Pendientes ya resueltos (historial)

- ~~**Formación Docente — Workspace, decidir antes del 6 oct 2026**~~ — resuelto 12 oct 2026:
  Jorge canceló la prueba. Ver `docs/ROADMAP.md` ítem 26.
- ~~**Logomark SEPRN**~~ — resuelto 10 ago 2026 (ver `docs/ARCHITECTURE.md §18`): se descartó un
  escudo propio tras revisar `Guía de Contenidos Digitales.pdf` (raíz del repo, no rastreado en
  git por tamaño — guía de redes sociales del Gobierno del Estado de México), y se evolucionó el
  favicon existente en vez de inventar un símbolo nuevo. Dos cosas que ese mismo documento dejó
  abiertas, deliberadamente no resueltas todavía: (1) las tipografías oficiales son
  Gotham/BW Modelica/Corporative Sans Alt, ninguna es Montserrat (lo que usa todo el sitio hoy)
  — BW Modelica no debe usarse con palabras con "ñ", Corporative no con palabras con "z", ambas
  letras están en "Nezahualcóyotl"; (2) no se confirmó si el sitio necesita mostrar el Escudo de
  Armas / logo Gobierno del Estado de México reales en algún lugar (footer, probablemente) más
  allá del texto plano actual — el documento revisado es de redes sociales, no el manual de
  identidad gráfica completo.
- ~~**Barra CTE desactualizada**~~ — resuelto 10 ago 2026: `.update-banner` en `index.html` ahora
  dice "Fase Intensiva 2026-2027 ya disponible".
- ~~**Fase Intensiva 2026-2027 sin video**~~ — resuelto 21 sep 2026: se publicaron los opening
  de Fase Intensiva (`bXq_TtMf_pc`) y de la nueva Primera Sesión Ordinaria 2026-2027
  (`vhuipmEOEuY`), junto con los 5 materiales de esta última (PPTX + 4 PDFs,
  `pdfs/cte/cte-2026-2027/cte-primera-sesión/`). Primera Sesión Ordinaria pasó a ser el
  acordeón activo/NUEVO del ciclo; Fase Intensiva se colapsó debajo, sin perder su badge de
  sesión del ciclo actual. Banner de `index.html` actualizado al mismo texto.
- ~~**Centro de Formación Docente** — dar de alta los primeros cursos propios del ciclo
  26-27~~ — resuelto 10 sep 2026: primer curso dado de alta (`ACF-2627-001`, "Formación
  Docente en Inteligencia Artificial", Fundación Televisa) y tarjeta reactivada en
  `oficina-virtual.html` (ver esa sección arriba). Nuevas columnas `Descripcion`/`Dirigido_a`
  en la hoja `Cursos` (auto-heal de `obtenerHojaCursos()`, igual que las anteriores) —
  `descripcion` es el propósito/objetivo del curso, `dirigido_a` el público objetivo; ambas
  opcionales, se muestran en la tarjeta del catálogo si están llenas. `formatearFecha()` ahora
  detecta fechas inválidas (`isNaN`) y devuelve el texto tal cual en vez de formatear como
  "31/12/1969" — permite usar texto libre como "Por definir" en `Fecha_inicio` para cursos sin
  fecha confirmada aún (bug real encontrado y corregido en esta sesión). Sigue habiendo solo un
  curso en el catálogo — agregar más cuando estén listos.
- ~~**Ceremonias Cívicas — `visitas-jefes.gs` con fixes sin desplegar (6 sep 2026)**~~ — nota
  desactualizada, corregida el 20 sep 2026: esos fixes (fichas duplicadas, fotos por semana) ya
  se habían pegado y redesplegado el 6 sep 2026 (`docs/ROADMAP.md` ítem 17 sí lo tenía correcto,
  esta sección quedó desincronizada). El pendiente (a) se cerró el 14 oct 2026: el panel de
  cobertura se queda público, sin clave (decisión de Jorge).
- ~~**Ceremonias Cívicas — verificación en vivo pendiente de las 4 etapas del 20 sep 2026**~~ —
  resuelto 14 oct 2026: Jorge confirmó que ya se probaron en vivo y funcionan. Historia: Jorge
  ya pegó y redesplegó `visitas-jefes.gs` (confirmado) y probó el reporte resumido (encontró y se
  corrigió el problema de legibilidad de la tabla). Falta probar en vivo, con una reserva real:
  reagendar/cancelar (conflicto de semana, liberación del cupo al cancelar, los mensajes por
  estatus), el reporte de seguimiento con una fecha de referencia pasada, y "Actualizar dashboard
  (hoja)" contra los datos reales del ciclo. Ver `docs/ROADMAP.md` ítem 20.
- ~~**Centro de Formación Docente** — función temporal `enviarAhoraManual_WEB2627001()` seguía
  pegada en el editor de Apps Script del proyecto en vivo~~ — eliminada del editor (7 ago 2026).
- ~~**Asesorías/Formación Docente — fixes de QA sin redesplegar**~~ — corregido (7 ago 2026):
  el código de ambos proyectos en el repo tenía los 3 fixes de QA del checkpoint anterior, pero
  nunca se habían pegado ni redesplegado en Apps Script (verificado en vivo: `confirmaMantenimiento`
  no existía en el código desplegado de Asesorías, `MINUTOS_ANTES_INICIO_MIN` seguía presente en
  Formación Docente). Ya redesplegados los dos.
