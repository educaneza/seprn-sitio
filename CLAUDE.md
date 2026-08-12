# SEPRN Sitio Web — Guía para Claude

## Contexto del proyecto
Sitio web institucional de la **Subdirección de Educación Primaria en la Región de Nezahualcóyotl (SEPRN)**, desplegado en GitHub Pages.

- **URL producción:** `https://educaneza.github.io/seprn-sitio/`
- **Repo:** `educaneza/seprn-sitio` (rama `main`)
- **Stack:** HTML5 + CSS3 + Vanilla JS. Sin npm, sin frameworks, sin build step.
- **Deploy:** push a `main` → GitHub Pages. Caché CDN: 5-10 min.

## Propietario
**Mtro. Jorge Alberto Bonilla Torres** — Jefe de OTDE (Oficina de Tecnología para el Desarrollo Educativo). El contenido se valida con la Dra. Avelina Galindo Celix (Encargada del Despacho).

## Paleta institucional
| Token | Hex | Uso |
|---|---|---|
| `--guinda` | `#56212f` | Identidad, títulos |
| `--guinda-acento` | `#9F2241` | Énfasis, números, links activos |
| `--arena` | `#d6d1ca` | Fondos alternos, separadores |
| `--caramelo` | `#977e5b` | Labels secundarios |
| `--midnight` | `#0C1A2E` | Hero oscuro (todas las páginas) |
| `--off-white` | `#F9F8F5` | Fondos cálidos |

## Sistema de diseño (implementado y extendido jun 2026)
Clases reutilizables en `styles.css`:
- `.section-header` + `.section-eyebrow` + `.section-title` — encabezado de sección centrado con eyebrow y líneas laterales
- `.section-header-light` — modificador para `.section-header` sobre fondos oscuros (eyebrow y título en blanco/caramelo-claro)
- `.metrics-strip` / `.metrics-inner` / `.metric-item` / `.metric-number` / `.metric-label` — tira de cifras clave con contador animado (solo `index.html`)
- `.btn-primary-dark` / `.btn-secondary-dark` — botones para fondos oscuros (hero)
- `.hero-badge` — pill de contexto institucional
- `.area-card .area-icon` / `.area-card .area-tipo` — ícono SVG y badge de tipo en tarjetas de áreas del index
- `.area-card.visible` — fade-up via IntersectionObserver (páginas de áreas en index)
- `.fade-item.visible` — fade-up genérico para tarjetas internas (páginas de área individuales)
- `.skip-link` — enlace de saltar al contenido principal (accesibilidad, visible solo con Tab)
- `.ns-bloque` + `.ns-off-white` / `.ns-white` / `.ns-arena` / `.ns-midnight` / `.ns-guinda` — bandas de color completo en `nosotros.html`
- `.ns-inner.visible` — animación fade-up para contenido de cada banda (IntersectionObserver)
- `.footer-grid` / `.footer-col` / `.footer-col-title` / `.footer-links` / `.footer-bottom` — footer multi-columna (3 cols + barra inferior con redes y copyright)
- `.logo-icon` — ícono NE/ZA (mismo símbolo que `favicon.svg`, en Montserrat) dentro de `.logo`
  (nav) y `.footer-brand` (footer, colorway invertido) — ver `docs/ARCHITECTURE.md §18`

### Eyebrows estándar en páginas de área
Cuando se agrega o edita una sección en páginas de área, usar estos eyebrows:
- Sección Objetivo → `PROPÓSITO`
- Sección Funciones → `RESPONSABILIDADES`
- Sección Oficinas Adscritas (grid) → `ESTRUCTURA INTERNA`

## Estructura de una página de área típica
Todas las páginas de área siguen este patrón:
1. `<a href="#main-content" class="skip-link">` justo después de `<body>`
2. `<section class="hero hero-sm">` con `.hero-badge`, `<h1>`, `<p>` y `.hero-glow`
3. `<section class="content-section" id="main-content" role="main">` con secciones `.seccion`
4. Cada sección usa `.section-header` + `.section-eyebrow` + `.section-title` en lugar de `.seccion-titulo`
5. Las tarjetas de oficinas usan `class="oficina-card fade-item"` para animación al scroll

## CTE — Sesiones publicadas (al 10 ago 2026)
**Ojo:** "Taller Intensivo de Cierre 2025-2026" (jul 2026) y "Taller Intensivo CTE 2025-2026" (ene 2026) son **dos eventos distintos** — no confundirlos ni fusionar su contenido.

**Estructura por ciclo (ago 2026):** `cte.html` ya no es una lista plana única — se divide en un
bloque "Ciclo Escolar `<actual>`" (encabezado `.section-header`, sesiones normales) y un bloque
"Ciclo Anterior" colapsable (`.ciclo-archivo` / `.ciclo-archivo-toggle` / `toggleCicloArchivo()`,
CSS y JS al final del `<style>`/`<script>` del archivo) que agrupa las 11 sesiones del ciclo ya
cerrado, cerrado por default al cargar. Al cerrar un ciclo y arrancar el siguiente: mover las
`.sesion-accordion` del ciclo saliente dentro de `.ciclo-archivo-content-inner`, quitarles
`active`/badge NUEVO, y agregar la Fase Intensiva del ciclo entrante arriba como la nueva sesión
abierta. `toggleSesion()` sigue funcionando igual sin cambios (opera sobre
`querySelectorAll('.sesion-accordion')` en todo el documento, sin importar el anidado).

**Los PDFs también se reorganizaron por ciclo (ago 2026):** ya no es `pdfs/cte/<nombre-sesion>/`
a secas — ahora es `pdfs/cte/cte-<ciclo>/<nombre-sesion>/` (ej.
`pdfs/cte/cte-2025-2026/octava-sesion/`, `pdfs/cte/cte-2026-2027/cte-fase-intensiva/`). Nota: la
subcarpeta de Fase Intensiva 2026-2027 sí lleva el prefijo `cte-` (`cte-fase-intensiva`) mientras
que las del ciclo 2025-2026 no (`octava-sesion`, `sexta-sesion`...) — inconsistencia menor,
conocida, no corregida a propósito (decisión de Jorge).

| Sesión | Ciclo | Opening YT | Grabación | Materiales | ZIP |
|---|---|---|---|---|---|
| Fase Intensiva 2026-2027 | 2026-2027 (actual) | — | — | 9 PDFs (`pdfs/cte/cte-2026-2027/cte-fase-intensiva/`) | ✅ (`cte-fase-intensiva-completa.zip`) |
| Taller Intensivo de Cierre (16-17 jul 2026) | 2025-2026 (archivo) | `1PXPphhZd9s` | — (evento no ocurrió) | 5 materiales (`pdfs/cte/cte-2025-2026/taller-intensivo-docentes/`) | ✅ |
| Octava Ordinaria | 2025-2026 (archivo) | `BRneovXdqL8` | — | PPTX + PDF orientaciones | ✅ |
| Séptima Ordinaria | 2025-2026 (archivo) | `oUA9r4zKdgo` | — | PPTX + 7 materiales | ✅ |
| Sexta Ordinaria | 2025-2026 (archivo) | `k3JZp4rLafA` | `yyAF0y0QPqA` | 8 materiales | ✅ |
| Quinta Ordinaria | 2025-2026 (archivo) | `J2PULvX4XwM` | `m0AFF56RSDw` | 5 materiales | ✅ |
| Cuarta Ordinaria | 2025-2026 (archivo) | — | `lEZvJhxcHSE` | — | — |
| Taller Intensivo (ene 2026) | 2025-2026 (archivo) | — | `NPq6wjpFJsY` | — | — |
| Tercera Ordinaria | 2025-2026 (archivo) | — | `L7G7fwDi25A` | — | — |
| Segunda Ordinaria | 2025-2026 (archivo) | `ysX2Lj3xx3s` | `E_8IdfhULeE` | — | — |
| Primera Ordinaria | 2025-2026 (archivo) | — | `1vFCnnWKkzg` | — | — |
| Fase Intensiva 2025-2026 | 2025-2026 (archivo) | `djBBRNrFetE` | — | — | — |

**Ojo con 3 de los 9 PDFs de Fase Intensiva 2026-2027:** llevan prefijo de otro ciclo en el
nombre de archivo (`2526_s1_comunidad_aprendizaje.pdf`, `2526_s2_t4_orgcompleta_insumo1.pdf`,
`2526_s3_t4_orgcompleta_insumo2.pdf` = ciclo 2025-2026; `2425_s0_insumos_direc_proceso_mejora_continua.pdf`
= ciclo 2024-2025) pero viven en la carpeta de 2026-2027 — Jorge los puso ahí a propósito como
material de referencia, no es un error de organización. Un noveno archivo
(`admin,+1534-3581-1-CE.pdf`) es en realidad un artículo académico ("Territorio, Cultura y
Contextualización Curricular", Miguel Zabalza Beraza, revista *Interacções* No. 22, 2012) — no
un documento oficial de SEP, pero Jorge confirmó incluirlo como lectura complementaria del tema
(así se etiqueta en el `span` del material, distinto a "Fase Intensiva • PDF" del resto).

Dentro de cada bloque de ciclo, la sesión más reciente siempre debe ser el acordeón
activo/abierto al cargar la página, con badge NUEVO. Las sesiones anteriores se colapsan y sus
iframes usan `data-src` (lazy loading) — incluidas las que están dentro de `.ciclo-archivo`, que
no se cargan hasta que esa sesión específica se abre (independiente de que el bloque de archivo
ya esté expandido).

## Páginas del sitio
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
| `otde.html` | Oficina de Tecnología (OTDE) |
| `oficina-virtual.html` | Oficina Virtual OTDE — hub de servicios digitales (Formación Docente, Mantenimiento, Asesorías, Correo, Soporte) + consulta de estatus de solicitudes por folio |
| `oeve.html` | Oficina de Extensión y Vinculación |
| `juridico.html` | Oficina Jurídica |
| `asistencia.html` | Check-in de asistencia (eventos) |
| `charla-ia.html` | Página del evento IA jun 2026 (sin formulario) |
| `formacion-docente.html` | Centro de Formación Docente — catálogo dinámico (webinars, seminarios, diplomados, cursos autogestivos, acciones formativas, proyectos didácticos) + registro. Diseño premium propio (ver `docs/DESIGN_SYSTEM.md`) |
| `instructivo-formacion-docente.html` | Guía imprimible del Centro de Formación Docente, mismo sistema tipográfico que la página anterior |
| `404.html` | Página de error personalizada |

**Documentación interna adicional en `docs/`:** `ARCHITECTURE.md` (arquitectura técnica), `ROADMAP.md` (scores UX/UI + pendientes por feature), `DESIGN_SYSTEM.md` (tokens/patrones del rediseño premium de Formación Docente), `QA-NOTES.md` (bugs reales ya cazados, con causa raíz — consultar antes de escribir un `fetch()` o un `appendRow()` nuevo), `manual-formacion-docente.html` / `manual-sistema-registro.html` (manuales operativos visuales para quien administra cada Sheet).

## Páginas eliminadas (recrear cuando haya contenido validado)
- `gestion-escolar.html`
- `investigacion-educativa.html`
- `programas-educativos.html`
- `servicio-profesional.html`

## Páginas retiradas definitivamente (no recrear)
- `jornada-verano-2026.html` e `instructivo-jornada-verano-2026.html` — eliminadas el 13 jul 2026: cerró el periodo de inscripciones a la Jornada de Capacitación Verano 2026 y ya nadie debe/puede llegar a ese wizard. El backend que usaban (`apps-script/formacion-docente.gs`) sigue vivo porque también sirve a `formacion-docente.html`; solo se perdió la parte de esas 2 páginas. Patrones que nacieron ahí (autocomplete de CCT con fallback manual por campo, `fetchJsonConTimeout()`, Title Case en Nombre/Escuela) siguen documentados en `docs/ARCHITECTURE.md` porque se reutilizan en `otde.html` y `formacion-docente.html`.

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
- Columnas A-P: Fecha | Folio | Nombre | CCT | Sector | Zona | Escuela/Unidad | Función/Cargo | WhatsApp | Correo | Descripción | Urgencia | Tipo de ayuda | Estatus | Notas de revisión | Notificación de cierre enviada (las últimas 3, ago 2026 — ver "Oficina Virtual OTDE" abajo)
- **CCT con autocomplete**: mismo patrón usado en `otde.html`/`formacion-docente.html` (`js/cct-db.js`, 506 registros) — funciones `sopSeleccionarCct`/`sopResetCct`/`sopActualizarZonas`/`sopActualizarTipoCct` (prefijo `sop` para no chocar con las de otras páginas). Si la CCT no está en la base, aparecen campos manuales de Tipo de CCT/Sector/Zona/Escuela (`#sop-manual-fields`) — ver `docs/ARCHITECTURE.md §11`
- **Función/Cargo** es un `<select>` que se repuebla según el tipo de CCT (`otdePoblarFuncion()`, ver `docs/ARCHITECTURE.md §11`) con campo libre si se elige "Otro"
- **Tipo de ayuda** (ago 2026, columna M): `<select>` obligatorio — Correo institucional, Office/Licencias, Impresora, Antivirus/Seguridad, Internet/Red, Equipo de cómputo (hardware), Otro — complementa, no reemplaza, la descripción libre
- WhatsApp y Correo son obligatorios (ago 2026: Correo pasó de opcional a obligatorio, es el medio principal de contacto). WhatsApp valida `/^\d{10}$/`, sin lada. La notificación de Telegram incluye un link `https://wa.me/52<whatsapp>` para abrir el chat con un tap
- El `<form>` usa `novalidate` + validación 100% en JS (`validarSoporteForm()`) — necesario porque los `type="email"`/`required` nativos interceptan el `submit` antes de correr el JS si no se desactiva la validación del navegador
- Al recibir `doPost`, además de guardar en Sheets envía una notificación push vía **bot de Telegram** (`notificarTelegram`); si Telegram falla, el registro en Sheets no se pierde (try/catch silencioso)
- Requiere Propiedades del script configuradas manualmente en el editor de Apps Script (Project Settings → Script Properties): `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` — instrucciones completas para obtenerlas están al final del propio archivo `.gs`
- Usado por el formulario "Solicitar Soporte Técnico Remoto" en la pestaña Soporte Técnico de `otde.html`; responde `Content-Type: text/plain` para evitar preflight CORS
- URL del deployment vive en `otde.html` en la constante `SOPORTE_APPS_SCRIPT_URL`
- **Redesplegado (7 ago 2026, versión 4)**: mismo ID de implementación de siempre, no cambió `SOPORTE_APPS_SCRIPT_URL`. La columna `Tipo de ayuda` se agregó a mano al final de la hoja real (este proyecto no tenía auto-heal de encabezados, a diferencia de `mantenimiento.gs`/`formacion-docente.gs`)
- **Estatus + cierre automático + auto-heal (ago 2026, pendiente de redeploy)**: ya tiene el mismo mecanismo que Mantenimiento/Asesorías — dropdown de 5 valores en `Estatus`, trigger instalable `sopOnEditCierre` (correr `sopInstalarTriggerCierre()` una vez tras pegar esta versión, o el menú "OTDE Soporte" nuevo que agrega `onOpen()`), y ahora sí completa solo cualquier encabezado que falte en la hoja real. A diferencia de Mantenimiento/Asesorías, Soporte no tiene `Contactos_Zona_Sector` — el cierre solo notifica al solicitante, no a Zona/Sector (decisión deliberada, no un pendiente). Ver "Oficina Virtual OTDE" abajo para el endpoint de consulta que motivó este cambio.
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — **cuidado**: probar el endpoint con `curl -X POST`, o incluso desde un navegador headless con acceso real a internet (confirmado: el sandbox de pruebas SÍ tiene salida real a `script.google.com`), ejecuta `doPost` de verdad (escribe en Sheets y dispara Telegram). Para pruebas locales, interceptar la llamada de red (`page.route()` en Playwright) en vez de dejarla llegar al backend real
- **Modo de prueba (código listo, aún sin desplegar, 11 ago 2026)**: `sopEnviarCorreo_()` — mismo wrapper que `manEnviarCorreo_()`/`aseEnviarCorreo_()`, activable con `sopActivarModoPrueba('correo')`/`sopDesactivarModoPrueba()` — ya reemplaza el único `MailApp.sendEmail()` de este archivo (el de cierre al solicitante) en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue corriendo la versión sin modo de prueba

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
  `MANTENIMIENTO_APPS_SCRIPT_URL`. **Telegram deliberadamente sin configurar** (decisión de
  Jorge, 6 ago 2026): el código llama a `manNotificarTelegram()` sin condición, pero sin
  `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` en Propiedades del script es un no-op silencioso — no
  "arreglar" esto configurando esas propiedades sin confirmar con Jorge primero.
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
  Oficio (link Drive) | Estatus | Notas de revisión
- **Tipo de Asesoría** y **casilla de confirmación de mantenimiento previo** (ago 2026): la
  única asesoría que se ofrece hoy (Banco de Materiales + Chuka) requiere que la escuela ya haya
  recibido mantenimiento con esos recursos instalados — sin eso, la asesoría no se puede dar. No
  se valida automáticamente contra el sistema de Reportes de Visitas (viven ahí, no en este
  proyecto, y la mayoría de escuelas ya atendidas lo fueron antes de que existiera este webform,
  así que cruzar contra datos parciales sería peor que no cruzar nada). En vez de eso, el
  formulario pide una casilla obligatoria de confirmación explícita — no lo garantiza, pero deja
  rastro y evita el supuesto silencioso; Jorge revisa esto como parte de su validación del
  oficio. El selector de "Tipo de Asesoría" ya está listo para crecer (hoy 1 sola opción) cuando
  se separen Banco de Materiales/Chuka o se agreguen asesorías nuevas — replanteo pedagógico
  pendiente, deliberadamente fuera de alcance por ahora
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
  `ASESORIAS_APPS_SCRIPT_URL`. Mismo caso que Mantenimiento: Telegram deliberadamente sin
  configurar (decisión de Jorge, 6 ago 2026 — no es un pendiente, es la elección), y
  `Contactos_Zona_Sector` ya poblada igual que en Mantenimiento (mismas 88 filas, misma fuente
  `OTDE_Base_Contactos_v2.xlsx`). **Redesplegado (7 ago 2026, versión 5)**: solo el cambio de
  correo obligatorio arriba, mismo ID de implementación. **Redesplegado (11 ago 2026, versión
  7)**: correo combinado a solicitante + Zona + Sector y modo de prueba
  (`aseActivarModoPrueba('correo')`/`aseDesactivarModoPrueba()`), mismo detalle que
  Mantenimiento arriba, ver `docs/ARCHITECTURE.md §15`. **Redesplegado (11 ago 2026, versión 8,
  mismo día)**: `cc` según tipo de solicitante (escuela/supervisión/jefatura), mismo detalle que
  Mantenimiento arriba

### `apps-script/formacion-docente.gs`
**Desplegado en producción desde jul 2026** (Spreadsheet real `Formacion_Docente_2026_2027`, URL real ya pegada en `APPS_SCRIPT_URL` de `formacion-docente.html`; la extinta `jornada-verano-2026.html` compartió este mismo backend hasta su eliminación el 13 jul 2026).

- Conectado a un Google Spreadsheet propio por ciclo escolar, con **3 pestañas relacionales** en vez de una hoja plana: `Docentes` (llave RFC, upsert), `Cursos` (catálogo administrado a mano por OTDE), `Inscripciones` (transaccional, FK a las otras dos, con columnas de vista I-O calculadas por `VLOOKUP` — nombre del docente/curso, CCT, escuela, sector, zona, función, todo en vivo, nunca copiado a mano)
- **`doGet`** regresa el catálogo de cursos con `Activo=TRUE` **y** dentro de la ventana `Visible_desde`/`Visible_hasta` si esas columnas están llenas (opcional, se evalúa por año/mes/día, sin depender de un trigger programado). También manda `registro_previo_requerido` (fuerza pasar por una liga externa antes del formulario OTDE, para cursos con cupo real) y `inscritos` (conteo real desde `Inscripciones`, para prueba social en las tarjetas — nunca inventado)
- **`doPost`** hace *upsert* en `Docentes` por RFC (si ya existe, actualiza sus datos; si no, lo agrega). Un valor nuevo vacío **nunca sobrescribe** un dato bueno que ya hubiera (`valorOMantener()`) — importante para migraciones históricas incompletas. Agrega una fila en `Inscripciones` por cada curso; si el RFC ya estaba inscrito a ese mismo curso, no duplica folio: regresa el folio existente con `duplicado:true`
- Folio: `OTDE-CAP-NNNN`. ID de curso: `PREFIJO-CICLO-NNN` (ej. `WEB-2627-001`, prefijos en `PREFIJOS_CATEGORIA`)
- **Columnas de `Cursos`** (A-S): ID_Curso, Categoria, Nombre, Responsable, Modalidad, Fecha_inicio, Fecha_fin, Liga_convocatoria, Requiere_codigo_asistencia, Codigo_asistencia, Activo, Notas, Registro_previo_requerido, Visible_desde, Visible_hasta, Hora_inicio, Recordatorio_inicio_enviado, Recordatorio_medio_enviado, Recordatorio_webinar_enviado. `obtenerHojaCursos()` completa sola cualquier encabezado que falte en hojas ya creadas antes de agregar una columna — no hay que migrar nada a mano
- **Recordatorios automáticos por correo** (jul 2026, tiempos y diseño ajustados ago 2026, lógica de reintento corregida ago 2026): "empieza en 1 día" (cursos de varios días, + fallback en cursos de un solo día sin `Hora_inicio`), "vas a la mitad" (solo cursos de 30+ días), "empieza en 30 minutos" (cualquier curso con `Hora_inicio` capturada, a partir de 40 min antes). Un solo correo por curso con BCC a todos los inscritos (no uno por persona), plantilla HTML propia con paleta institucional + íconos de redes (`construirCorreoHtml()`) y `replyTo` a la cuenta institucional (`otde.nezahualcoyotl@dee.edu.mx`, no al Gmail real que envía), y revisión de `MailApp.getRemainingDailyQuota()` antes de enviar — la cuota diaria la comparten TODOS los Apps Script de la cuenta de Google, no es exclusiva de este proyecto. El disparador de "30 minutos" corre cada 15 min (antes cada hora); requiere volver a correr el menú "OTDE Formación → Instalar recordatorios automáticos" después de cada redeploy, porque `instalarRecordatoriosAutomaticos()` borra y recrea ambos activadores en cada corrida. `enviarRecordatoriosDiarios()` avisa a Jorge por correo (máx. 1x/día) si algún activador desaparece. Los avisos "1 día antes" y "30 minutos antes" ya no se resignan en silencio si se evalúan tarde (curso ya iniciado): reintentan con el mensaje ajustado a "ya inició"/"ya comenzó" en cada corrida subsecuente mientras el curso no haya terminado — ver `docs/QA-NOTES.md #8`. Detalle completo en `docs/DESIGN_SYSTEM.md` y `docs/ARCHITECTURE.md §12`
- **Los recordatorios automáticos SÍ llegan a Recibidos, no a Enviados** (confirmado 6 ago 2026): `enviarCorreoLote()` manda `to: Session.getEffectiveUser().getEmail()` (copia a la misma cuenta que corre el script) con los inscritos en `bcc`. Gmail archiva esa copia-a-sí-mismo como correo recibido, no como enviado — mismo patrón en **todas** las automatizaciones de OTDE, incluido el SGCI viejo de `Correos-institucionales`. Si Jorge reporta "no veo nada en Enviados", el correo probablemente sí salió — hay que revisar Recibidos de la cuenta de Google que tiene instalados los activadores (`otde.nezahualcoyotl@gmail.com`), no Enviados ni ninguna cuenta de Outlook/Microsoft.
- ~~**Bug confirmado en producción (6 ago 2026)**: `enviarRecordatoriosDiarios()`/`enviarRecordatoriosWebinar()` marcaban la columna de recordatorio en `TRUE` sin haber mandado nunca el correo si la evaluación llegaba tarde~~ — corregido (6 ago 2026): ambos ahora reintentan en cada corrida subsecuente con mensaje ajustado a "ya inició"/"ya comenzó" mientras el curso no haya terminado; solo se resignan cuando `hoy > Fecha_fin`. Pasó de verdad con el Seminario "Convivencia digital entre estudiantes" (4 ago 2026, sin `Hora_inicio`) — ver `docs/QA-NOTES.md #8`. **Pendiente para Jorge**: re-desplegar `formacion-docente.gs` (Administrar implementaciones → Nueva versión) para que el fix llegue a producción.
- Menú "OTDE Formación" completo: Generar ID de cursos faltantes · Generar estadísticas · Actualizar vista de Inscripciones · Migrar Jornada Verano 2026 · Instalar/Desinstalar recordatorios automáticos
- Responde `Content-Type: text/plain` para evitar preflight CORS, mismo patrón que el resto
- **Cuidado con `appendRow([])`**: Apps Script no acepta un arreglo vacío — usar `appendRow([''])` para filas en blanco. Ver `docs/QA-NOTES.md` para este y otros bugs reales ya corregidos (fetch sin timeout, fecha -1 día por parseo UTC, etc.)
- **Modo de prueba (código listo, aún sin desplegar, 11 ago 2026)**: `enviarCorreoLote()` ahora revisa la Script Property `MODO_PRUEBA_CORREO` (`fdActivarModoPrueba('correo')`/`fdDesactivarModoPrueba()`) y, si está activa, redirige `bcc`/`subject`/`htmlBody` al correo de prueba en vez de a los inscritos reales — en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue mandando a los inscritos de verdad
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — recordar **Administrar implementaciones → Nueva versión**, no solo "Guardar" en el editor, o el sitio sigue sirviendo la versión anterior

## Reglas de desarrollo
1. No introducir npm, frameworks ni build steps — stack estático puro
2. Cambios globales de UI → `styles.css`; cambios específicos de página → `<style>` inline en el HTML
3. Para modificar estilos del header/footer: son inline en cada página, no hay componente compartido
4. Imágenes en `images/`, PDFs en `pdfs/cte/cte-<ciclo>/<nombre-sesion>/` (ej. `pdfs/cte/cte-2026-2027/cte-fase-intensiva/`), instaladores/ejecutables descargables en `descargas/` (ej. `.exe`, `.bat`)
5. Después de push: esperar 5-10 min o Cmd+Shift+R para invalidar caché de GitHub Pages
6. Los PDFs de sesiones CTE se nombran con mayúsculas y acentos; URL-encodear la ó como `%C3%B3` en los hrefs
7. **Sin emojis** en HTML — usar SVG inline para íconos de contacto (persona, correo, teléfono). Ver `contacto-icon` en cualquier página de área como referencia
8. El portal SEP CTE usa la URL `https://gestion.cte.sep.gob.mx/insumos/` (sin `#!/` — ese sufijo era routing antiguo de AngularJS)
9. Los materiales de `cte.html` (`.material-item strong`) siempre muestran un título humano, nunca el nombre de archivo crudo — los PDFs de SEP suelen llegar con códigos internos (`2627_s0_orientaciones_directivos.pdf`), hay que limpiarlos a texto legible (ej. "Orientaciones Directivos") antes de publicarlos

## `otde.html` — Oficina de Tecnología (OTDE)

7 tabs, en este orden (los comentarios `<!-- SERVICIO N: ... -->` en el HTML deben coincidir
con esta numeración — si se agrega o reordena una tab, actualizarlos ahí también):
**1** Correo Institucional · **2** Mantenimiento · **3** Asesorías · **4** Soporte Técnico ·
**5** Licencias Office · **6** Chuka · **7** Recursos.

Patrón compartido por las tabs con formulario propio (Correo/Mantenimiento/Asesorías/
Soporte): validación 100% en JS con `novalidate` en el `<form>` (los `type="email"`/
`required` nativos interceptan el `submit` antes de correr el JS si no se desactiva la
validación del navegador), `fetchJsonConTimeout()` para evitar el freeze de `fetch()` sin
timeout documentado en `docs/QA-NOTES.md #1`, CCT con autocomplete + fallback manual de
Sector/Zona/Escuela (`js/cct-db.js`, detalle del patrón en `docs/ARCHITECTURE.md §11`; cada
campo del fallback valida y muestra su propio error — no agrupar todo bajo el mensaje del CCT,
anti-patrón ya corregido dos veces), y Nombre/Escuela manual homologados a Title Case.

### Correo Institucional
Reemplaza en código, tipo por tipo, al `<iframe>` del Google Form viejo — ver el modelo de
arquitectura completo en `docs/ARCHITECTURE.md §16`. Resumen operativo:

- Switcher de 2 botones (`.correo-panel-btn`, `mostrarCorreoPanel('alta'|'otros')`): **"Alta de
  cuenta"** y **"Cambio de contraseña / Eliminar autenticación / Otro"** (este último con su
  propio sub-switcher de 3 botones, prefijos `cam`/`rst`/`inc`). Los 4 tipos ya están completos
  — el `<iframe>` quedó retirado por completo del código.
- **"2FA" renombrado a "Eliminar método de autenticación" (ago 2026)**: mismo término que usa
  SIGEE (para que Jorge/Marcos mapeen 1:1 al procesar), con una aclaración en paréntesis para
  docentes ("código de seguridad extra que a veces se traba"). El identificador interno que
  viaja al backend (`tipo: 'reset2FA'`) no cambió — es contrato con `Reset2FA.gs`, no texto
  visible.
- **No se tocó el sistema en vivo** (`Correos-institucionales`, `Code.gs`/`OnFormSubmit.gs`/
  `OnEditTrigger.gs`/`ResumenSemanal.gs`, atado al Form viejo que sigue usando Marcos) — el
  backend nuevo es un proyecto de Apps Script separado y en paralelo,
  `Correos-institucionales/webform-2026-2027/` (`Config.gs`, `WebApp.gs`, `Alta.gs`,
  `CambioContrasena.gs`, `Reset2FA.gs`, `Incidencias.gs`, `OnEdit.gs` — un solo trigger
  `onEditWebform` que enruta por nombre de hoja). **Desplegado (6 ago 2026)**: Spreadsheet
  `Solicitudes_Correo_2026_2027`, proyecto "Webform Correo 2026-2027 - Backend", las 4
  constantes (`ALTA_CORREO_APPS_SCRIPT_URL`, `CAMBIO_APPS_SCRIPT_URL`, `RESET_APPS_SCRIPT_URL`,
  `INCIDENCIA_APPS_SCRIPT_URL`) apuntan a la misma URL real (`WebApp.gs` enruta los 4 tipos por
  `datos.tipo`, un solo despliegue). El switcher del sitio ya mostraba los 4 tipos nativos desde
  antes de este despliegue, así que técnicamente el webform ya está en producción — pero el
  sistema viejo de Marcos sigue vivo en paralelo; retirarlo es una decisión de Jorge, no
  automática por haber desplegado esto.
- **Telegram deliberadamente parcial** (decisión de Jorge, 6 ago 2026): solo los tipos
  "urgentes" (alguien no puede entrar a su cuenta ahora mismo) avisan por Telegram —
  `Reset2FA.gs`/`Incidencias.gs` sin condición, `CambioContrasena.gs` solo si
  `dominio === 'dee.edu.mx'` (`@aulamexiquense.mx` no avisa), `Alta.gs` no llama a Telegram en
  absoluto (alta de cuenta no bloquea a nadie). Detalle completo en
  `Correos-institucionales/CLAUDE.md`.
- **Dominio auto-derivado, no preguntado** (solo en Alta — Cambio/Reset/Incidencias leen el
  dominio del correo institucional que la persona ya tiene): usa
  `otdeDominioParaCCT(cct, tipoCuenta)` en `js/cct-db.js`, regla verificada en vivo contra
  SIGEE. El formulario nunca pregunta "¿@dee.edu.mx o @aulamexiquense.mx?" directamente — ver
  la regla completa en `docs/ARCHITECTURE.md §16`. Toda la lógica del lado del cliente vive en
  `altActualizarDominio()`/`altCalcularDominio()`, se recalcula en cada cambio de
  CCT/Función/Tipo de cuenta, y se muestra como confirmación (`#alt-dominio-preview`) antes de
  enviar.
- **Campos de Alta**: CCT, Función, Nombre/Apellido Paterno/Apellido Materno/RFC/CURP (campos
  separados), Correo personal, Teléfono, Observaciones — encabezados reales confirmados por
  Jorge el 5 ago 2026 contra el Sheet viejo. **Función se repuebla según el tipo de CCT** (ago
  2026, `otdePoblarFuncion()`, ver `docs/ARCHITECTURE.md §11`) y el fallback manual de CCT
  (cuando no se encuentra) pide "Tipo de CCT" explícito en vez de meter SEPRN como una opción
  más de Sector — mismo patrón en los 4 sub-formularios de esta tab (Alta/Cambio/Reset/
  Incidencias), aunque solo Alta usa el tipo para ramificar Función (los otros 3 no preguntan
  Función).
- **Teléfono unificado a "Teléfono (WhatsApp)" + correo con aviso de spam (ago 2026)**: mismo
  wording y aviso de contacto que el resto del sitio, en los 4 sub-formularios de esta tab.
- **`crearCctAutocomplete(prefijo)`**: con 4 formularios usando CCT autocomplete en esta misma
  tab (Alta/Cambio/Reset/Incidencias), se factorizó en una función compartida — única
  excepción en el sitio a "cada tab mantiene su propia copia del patrón" (Soporte/
  Mantenimiento/Asesorías sí la mantienen; aquí la 4ª repetición casi idéntica en el mismo
  archivo cruzó el umbral).

### Mantenimiento
Ya no es solo texto ("solicita por oficio y vía estructura") — formulario "Solicitar
Mantenimiento" (`#btn-mantenimiento` + `toggleMantenimientoForm`) que digitaliza la captura sin
quitarle el oficio: pide adjuntarlo ya firmado en vez de sustituirlo. Detalle completo del
backend en `apps-script/mantenimiento.gs` y `docs/ARCHITECTURE.md §15`.

- **Adjuntar oficio**: `input type="file"`, límite de 5MB validado en
  `validarMantenimientoForm()` antes de leer el archivo; la lectura a base64
  (`manLeerArchivoBase64()`, `FileReader.readAsDataURL`) solo ocurre ya validado, dentro de
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

### Asesorías
Tab nueva (no existía como trámite — antes solo había un video suelto en Recursos). Mismo
patrón que Mantenimiento (oficio obligatorio + captura digital), más selector de "Tipo de
asesoría" y casilla de confirmación de mantenimiento previo (Banco de Materiales/Chuka ya
instalados) — detalle de por qué en `apps-script/asesorias.gs` y `docs/ARCHITECTURE.md §15`.
Prefijo de IDs/funciones: `ase`. **Desplegado (6 ago 2026)**: `ASESORIAS_APPS_SCRIPT_URL` con
la URL real del deployment. **Cierre automático (7 ago 2026)**: mismo mecanismo que
Mantenimiento (`aseOnEditCierre` / `aseInstalarTriggerCierre`). **Repaso de UX (7 ago 2026)**:
Correo obligatorio, oficio solo PDF, Función/Cargo por tipo de CCT — mismo detalle que
Mantenimiento arriba, redesplegado como versión 5. **Correo combinado a solicitante + Zona +
Sector (11 ago 2026)**: mismo rediseño que Mantenimiento (ver arriba) — redesplegado como
versión 7.

### Soporte Técnico Remoto
TeamViewer (no Quick Assist) como herramienta de control remoto. Formulario "Solicitar Soporte
Técnico Remoto" (nombre, CCT, función, WhatsApp, correo, tipo de ayuda, urgencia, descripción) →
`apps-script/soporte-remoto.gs`. Referencia cruzada con Licencias Office: cada tab enlaza a la
otra vía `showServicio()` con `onclick` si el problema es de instalación/licencias. **Repaso de
UX (7 ago 2026)**: Correo pasó de opcional a obligatorio, nuevo campo "Tipo de ayuda"
(select obligatorio), Función/Cargo por tipo de CCT — redesplegado como versión 4.

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

## `oficina-virtual.html` — Oficina Virtual OTDE (ago 2026, hub de servicios + seguimiento)
Reusa `styles.css` (misma identidad institucional que `otde.html`, no un sistema propio como
Formación Docente — es una utilidad de una sola pantalla que continúa un trámite ya empezado en
`otde.html`, no una pieza de marketing/conversión). Nace de retomar la visión de Jorge de una
"oficina virtual" aparte de `otde.html`, planteada y pospuesta el 7 ago 2026
(`docs/BITACORA.md`), con el foco confirmado en seguimiento de solicitudes.

- **`otde.html` no cambió de estructura** — solo ganó el banner de arriba y un manejador de
  `location.hash` en `DOMContentLoaded` (busca `.servicio-tab[aria-controls="<hash>"]` y llama
  `showServicio()`) para que los links del hub abran la tab correcta al cargar
  (`otde.html#mantenimiento`, `#asesorias`, `#correo`, `#soporte`).
- **Grid de servicios** (patrón `.area-card` de `areas.html`, adaptado): Centro de Formación
  Docente (→ `formacion-docente.html`, sin seguimiento — no aplica) y los 4 trámites tipo-ticket
  (Mantenimiento/Asesorías/Correo/Soporte), cada uno con un link "Solicitar →" (deep-link a
  `otde.html`) y "Consultar estatus →" (ancla a `#buscar-folio`). Una card "Próximamente"
  (`.ov-proximamente`, borde punteado) deja la grid lista para crecer.
- **Buscador de seguimiento** (`#buscar-folio`, hero del hub): folio + correo → ruteo automático
  por prefijo (`OV_TIPOS_DE_TRAMITE`, función `ovResolverTramite()`) a la URL de deployment
  correspondiente, sin preguntarle al usuario el tipo de trámite. Reusa `fetchJsonConTimeout()`
  duplicada inline (mismo patrón que el resto del sitio).
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
  - `Correos-institucionales/webform-2026-2027/WebApp.gs` (**repo git distinto**, no
    `seprn-sitio`): `manejarConsultaCorreo()` resuelve la hoja correcta por el prefijo del folio
    (`Alta`/`Cambio de Contraseña`/`Reset 2FA`/`Incidencias`, columnas distintas entre sí) y
    expone `Estado general` tal cual — texto libre, sin vocabulario cerrado, a propósito no
    migrado a dropdown en esta ronda. Acepta Correo Personal o Institucional como llave
    indistintamente.
- **No es autenticación real** — folios secuenciales + correo institucional a veces predecible.
  Mismo nivel de protección que el resto del sitio (sin PII más allá de un estatus), consistente
  con la decisión previa de no construir login propio (ver Formación Docente arriba). El texto de
  cara al usuario dice "consulta rápida", nunca "portal seguro".
- **Badges de estatus** (`ovRenderEstatus()`): los 5 valores fijos de Mantenimiento/Asesorías/
  Soporte se pintan con color (`OV_BADGES`); el "Estado general" de Correo, al ser texto libre,
  se muestra plano — no se intenta mapear a un vocabulario cerrado que no existe.
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
- **Constancias fuera de alcance**: ni los webinars (salvo UNETE) ni los programas de CoEEE requieren que OTDE administre el documento — solo seguimiento estadístico. La franja de confianza al pie de la página lo refleja como "Constancia según programa", nunca como promesa genérica
- **Diseño premium propio (jul 2026)**: tipografía Inter/Inter Tight (Google Fonts), tarjetas de curso con fondo pastel por categoría + ícono grande, prueba social real de inscritos (nunca inventada — se oculta si es 0), resumen de selección como panel lateral sticky en escritorio (≥960px) / barra flotante en móvil, ambos alimentados por una sola función `actualizarResumenSticky()`. Detalle completo de tokens y patrones en `docs/DESIGN_SYSTEM.md` — **consultarlo antes de rediseñar cualquier parte de esta página**, ya tiene su propio sistema
- **Recordatorios automáticos** y **ventanas de fecha por curso** (`Visible_desde`/`Visible_hasta`): ver sección de `apps-script/formacion-docente.gs` arriba
- Pendiente de fases futuras: validación de asistencia con código de cierre en webinars (columnas `Requiere_codigo_asistencia`/`Codigo_asistencia` ya existen), dashboards por sector/zona (decisión previa: Looker Studio conectado directo a la hoja, no un dashboard propio — revisar con Jorge antes de construir uno custom, ver `docs/ROADMAP.md`)

## `js/cct-db.js` — Campo `municipio` agregado (jul 2026)
Los 506 registros se enriquecieron con `municipio` (18 municipios) cruzando por CCT contra `Catalogo SEPRN direcciones.xlsx` (columna `municip`, 612 filas, 100% poblada). El sector **no** determina el municipio de forma confiable — varios sectores abarcan múltiples municipios (ver mapa SVG de `index.html`) — por eso el municipio se deriva del CCT exacto, no del sector. Cualquier página que use el autocomplete de CCT puede ahora leer `m.municipio` igual que `m.sector`/`m.zona`/`m.nombre`.

## Ritual de cierre de sesión
Automatizado en el skill `/close` (`.claude/skills/close/SKILL.md`) — invocarlo al terminar una
sesión de trabajo en vez de repetir este ritual a mano. Tabla de qué documento actualizar según
qué cambió (el skill defiere a esta tabla, no la duplica — si cambia, solo se edita aquí):

| Documento | Actualizar cuando la sesión… |
|---|---|
| `docs/BITACORA.md` | **Siempre.** Agregar un checkpoint nuevo arriba del anterior (orden cronológico inverso) |
| `docs/ARCHITECTURE.md` | Cambió estructura de archivos, arquitectura de un backend, o un flujo técnico nuevo (patrón §11-16 como referencia) |
| `docs/ROADMAP.md` | Se resolvió o se agregó un pendiente genuinamente futuro (no "qué se hizo", eso va a `BITACORA.md`) |
| `README.md` | Cambió cómo se levanta/despliega el proyecto, o la estructura de archivos en disco |
| `CLAUDE.md` (este archivo) | Se acordó una regla o convención de desarrollo nueva, o una página/tab cambió lo suficiente para que su sección aquí quede desactualizada |
| `docs/QA-NOTES.md` | Se cazó un bug real con causa raíz identificada |

Regla de esta tabla: **no tocar todos los documentos por costumbre** — solo los que el trabajo
de la sesión realmente volvió obsoletos.

## Pendientes vigentes
Ver `docs/ROADMAP.md` para el detalle completo (deuda técnica, Fase 3 Premium/Identidad) y
`docs/BITACORA.md` para el historial de qué ya se hizo. Resumen de lo genuinamente abierto:
- **Recrear páginas eliminadas** — `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`, `servicio-profesional.html`: requieren contenido validado con la Dra. Galindo
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
- **Fase Intensiva 2026-2027 sin video** — falta agregar el `iframe` del Opening en `cte.html` cuando Jorge lo tenga
- **Centro de Formación Docente** — dar de alta los primeros cursos propios del ciclo 26-27 en la hoja `Cursos` (hoy el catálogo solo tiene 2 webinars; Jorge los va agregando conforme haya más oferta)
- **Correo/Mantenimiento/Asesorías** — los 3 backends nuevos ya están desplegados y con `Contactos_Zona_Sector` poblado (6 ago 2026, ver sus secciones arriba); Telegram parcial es decisión final, no pendiente.
- **QA pre-producción (6 ago 2026)** — hallazgos pendientes de atender antes de confiar el flujo completo:
  - ~~**Asesorías**: el checkbox de confirmación de asesoría previa no viaja en el payload al backend~~ — corregido: `otde.html` ahora manda `confirmaMantenimiento` en el payload, `asesorias.gs` lo valida server-side y lo guarda en la columna nueva `Confirmó Mantenimiento Previo` (col. R, autocompletada en la hoja ya desplegada vía el mismo patrón de auto-heal de encabezados que `formacion-docente.gs`).
  - ~~**Asesorías**: el mensaje de error del checkbox no se limpia al marcarlo~~ — corregido: listener `change` en `ase-confirma-mantenimiento` limpia el error apenas se marca.
  - ~~**Mantenimiento/Asesorías no cierran el ciclo automáticamente con el solicitante**~~ —
    corregido (7 ago 2026): trigger `onEdit` instalable que notifica al solicitante y a la
    Zona/Sector al marcar Estatus = `Resuelto`. Ver `docs/ARCHITECTURE.md §15`.
  - Recordatorio operativo (no de código): "NP SIGEE" en la hoja de Alta se llena a mano por Marcos y es el paso crítico que sostiene la trazabilidad — sin ese llenado, se vuelve a caer en "adivinar por fecha/sector/zona".
  - Correo (Alta/Cambio de Contraseña/Reset 2FA/Incidencias) probado de punta a punta el 6 ago 2026: los 4 sub-formularios, el autocompletado de CCT y su fallback manual, la regla de dominio Director(a)+Cuenta de oficina, y los payloads reales — todo correcto, sin bugs encontrados.
- ~~**Centro de Formación Docente** — función temporal `enviarAhoraManual_WEB2627001()` seguía
  pegada en el editor de Apps Script del proyecto en vivo~~ — eliminada del editor (7 ago 2026).
- ~~**Asesorías/Formación Docente — fixes de QA sin redesplegar**~~ — corregido (7 ago 2026):
  el código de ambos proyectos en el repo tenía los 3 fixes de QA del checkpoint anterior, pero
  nunca se habían pegado ni redesplegado en Apps Script (verificado en vivo: `confirmaMantenimiento`
  no existía en el código desplegado de Asesorías, `MINUTOS_ANTES_INICIO_MIN` seguía presente en
  Formación Docente). Ya redesplegados los dos.
