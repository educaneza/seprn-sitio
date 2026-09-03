# SEPRN Sitio Web — Guía para Claude

## Contexto del proyecto
Sitio web institucional de la **Subdirección de Educación Primaria en la Región de Nezahualcóyotl (SEPRN)**, desplegado en GitHub Pages.

- **URL producción:** `https://educaneza.github.io/seprn-sitio/`
- **Repo:** `educaneza/seprn-sitio` (rama `main`)
- **Stack:** HTML5 + CSS3 + Vanilla JS. Sin npm, sin frameworks, sin build step.
- **Deploy:** push a `main` → GitHub Pages. Caché CDN: 5-10 min. **Reconciliado (31 ago
  2026):** de jun a ago 2026, `main` local y `origin/main` estuvieron divergidos a propósito
  (`otde.html` en producción se mantenía congelado mientras el resto del trabajo de OTDE no
  estaba listo para publicarse) — cada publicación real usaba una rama `publish-*` creada desde
  `origin/main`, nunca un `git push origin main` directo desde `main` local. Ese freeze terminó
  cuando `otde.html` se publicó por completo (commit `c8f1252`); el 31 ago 2026 se confirmó con
  `git diff --stat origin/main main` que ambas ramas ya tenían contenido idéntico y se
  reconciliaron con un merge (`3a8d218`) — un `git push origin main` directo vuelve a ser
  seguro. Si en el futuro se vuelve a acumular trabajo local no listo para producción, el mismo
  patrón `publish-*` sigue siendo el mecanismo correcto: nunca asumir `git push origin main` sin
  antes correr `git log --oneline -3 origin/main` y comparar contra `main` local. Detalle del
  patrón y ejemplos reales en `docs/BITACORA.md` (buscar "publish-" o "Publicación a
  producción").

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
- `.servicio-header` / `.content-block` / `.highlight-box` / `.benefit-list` / `.featured-box` /
  `.download-button` — contenido institucional compartido (extraído a `styles.css` el 27 ago
  2026 al migrar Asesorías/Mantenimiento); usado por `otde.html` (Licencias Office, Chuka,
  Recursos, sin ningún formulario ya) y por las 4 páginas propias de trámite
- `.form-button` / `.form-container` / `.soporte-form-group` (y sus hijos
  `.soporte-field-hint`/`.soporte-field-error`) / `.sop-cct-wrapper` / `.sop-cct-status` /
  `.sop-manual-fields` / `.soporte-submit-msg` — sistema de formularios de trámite (extraído a
  `styles.css` el 27 ago 2026 al migrar Asesorías a página propia); ya no lo usa `otde.html`
  (sin formularios desde que Correo migró) — solo las 4 páginas propias de trámite
  (`correo.html`, `mantenimiento.html`, `asesorias.html`, `soporte.html`). Nombres heredados de
  Soporte (`soporte-*`/`sop-*`), no renombrados al generalizarse — ver `docs/ARCHITECTURE.md §21`

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
| `otde.html` | Oficina de Tecnología (OTDE) — hoy solo Licencias Office, Chuka y Recursos (los 4 trámites con formulario propio ya migraron a páginas propias, ver abajo) |
| `asesorias.html` | Solicitud de Asesorías en TICCAD (Banco de Materiales/Chuka) — página propia, migrada desde la tab "Asesorías" de `otde.html` el 27 ago 2026 (ver `docs/ARCHITECTURE.md` y `apps-script/asesorias.gs` abajo). Header/nav/footer institucional completo (reusa `styles.css`), sin entrada en nav/footer del sitio — se llega vía `oficina-virtual.html` |
| `mantenimiento.html` | Solicitud de Mantenimiento Preventivo y Correctivo — página propia, migrada desde la tab "Mantenimiento" de `otde.html` el 27 ago 2026, mismo patrón que `asesorias.html` (ver `docs/ARCHITECTURE.md` y `apps-script/mantenimiento.gs` abajo) |
| `soporte.html` | Solicitud de Soporte Técnico Remoto (vía TeamViewer) — página propia, migrada desde la tab "Soporte Técnico" de `otde.html` el 27 ago 2026, mismo patrón que `asesorias.html`/`mantenimiento.html` (ver `docs/ARCHITECTURE.md` y `apps-script/soporte-remoto.gs` abajo) |
| `correo.html` | Correo Institucional — Alta de cuenta / Cambio de contraseña / Eliminar método de autenticación / Incidencias — página propia, migrada desde la tab "Correo Institucional" de `otde.html` el 27 ago 2026, última de las 4 migraciones (ver `docs/ARCHITECTURE.md` y `apps-script/correo/` abajo) |
| `oficina-virtual.html` | Oficina Virtual OTDE — hub de servicios digitales (Formación Docente, Mantenimiento, Asesorías, Correo, Soporte) + consulta de estatus de solicitudes por folio |
| `oeve.html` | Oficina de Extensión y Vinculación |
| `juridico.html` | Oficina Jurídica |
| `asistencia.html` | Check-in de asistencia (eventos) |
| `reporte-visita.html` | Formulario de captura del técnico tras una visita de Mantenimiento — reemplaza el llenado a mano de "Reportes de visita" en el Sheet, ver `apps-script/mantenimiento.gs` abajo. Sin entrada en nav/footer, se comparte por link directo |
| `charla-ia.html` | Página del evento IA jun 2026 (sin formulario) |
| `formacion-docente.html` | Centro de Formación Docente — catálogo dinámico (webinars, seminarios, diplomados, cursos autogestivos, acciones formativas, proyectos didácticos) + registro. Diseño premium propio (ver `docs/DESIGN_SYSTEM.md`) |
| `instructivo-formacion-docente.html` | Guía imprimible del Centro de Formación Docente, mismo sistema tipográfico que la página anterior |
| `404.html` | Página de error personalizada |
| `protocolos.html` | Protocolos de Actuación — hub con 3 protocolos oficiales del Estado de México/SEIEM (ver sección propia abajo) |
| `ceremonias-civicas.html` | Ceremonias Cívicas — reserva de visitas de jefes/docentes SEPRN-wide (no un trámite de OTDE), histórico, cobertura y panel por clave (ver sección propia abajo) |
| `ficha-ceremonias-civicas.html` | Ficha post-visita de Ceremonias Cívicas, localizada por folio — sin entrada en nav/footer, se comparte por link directo (ver sección propia abajo) |

**Documentación interna adicional en `docs/`:** `ARCHITECTURE.md` (arquitectura técnica), `ROADMAP.md` (scores UX/UI + pendientes por feature), `DESIGN_SYSTEM.md` (tokens/patrones del rediseño premium de Formación Docente), `QA-NOTES.md` (bugs reales ya cazados, con causa raíz — consultar antes de escribir un `fetch()` o un `appendRow()` nuevo), `manual-formacion-docente.html` / `manual-sistema-registro.html` / `manual-bases-tramites.html` (manuales operativos visuales para quien administra cada Sheet — el último es semáforo de qué llenar/tocar-con-cuidado/no-tocar por columna, un trámite por sección).

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
- **`TELEGRAM_CHAT_ID` apunta al chat_id personal de Alejandro (sep 2026)**, ya no al chat
  compartido de OTDE — Alejandro atiende Soporte y Mantenimiento, decisión de Jorge. Se agregó
  además `sopNotificarEquipoPorCorreo()` (correo a `SOP_CORREO_EQUIPO`), llamada junto al
  Telegram existente en `doPost`
- Usado por el formulario "Solicitar Soporte Técnico Remoto" en la pestaña Soporte Técnico de `otde.html`; responde `Content-Type: text/plain` para evitar preflight CORS
- URL del deployment vive en `otde.html` en la constante `SOPORTE_APPS_SCRIPT_URL`
- **Redesplegado (7 ago 2026, versión 4)**: mismo ID de implementación de siempre, no cambió `SOPORTE_APPS_SCRIPT_URL`. La columna `Tipo de ayuda` se agregó a mano al final de la hoja real (este proyecto no tenía auto-heal de encabezados, a diferencia de `mantenimiento.gs`/`formacion-docente.gs`)
- **Estatus + cierre automático + auto-heal (ago 2026, pendiente de redeploy)**: ya tiene el mismo mecanismo que Mantenimiento/Asesorías — dropdown de 5 valores en `Estatus`, trigger instalable `sopOnEditCierre` (correr `sopInstalarTriggerCierre()` una vez tras pegar esta versión, o el menú "OTDE Soporte" nuevo que agrega `onOpen()`), y ahora sí completa solo cualquier encabezado que falte en la hoja real. A diferencia de Mantenimiento/Asesorías, Soporte no tiene `Contactos_Zona_Sector` — el cierre solo notifica al solicitante, no a Zona/Sector (decisión deliberada, no un pendiente). Ver "Oficina Virtual OTDE" abajo para el endpoint de consulta que motivó este cambio.
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — **cuidado**: probar el endpoint con `curl -X POST`, o incluso desde un navegador headless con acceso real a internet (confirmado: el sandbox de pruebas SÍ tiene salida real a `script.google.com`), ejecuta `doPost` de verdad (escribe en Sheets y dispara Telegram). Para pruebas locales, interceptar la llamada de red (`page.route()` en Playwright) en vez de dejarla llegar al backend real
- **Modo de prueba (código listo, aún sin desplegar, 11 ago 2026)**: `sopEnviarCorreo_()` — mismo wrapper que `manEnviarCorreo_()`/`aseEnviarCorreo_()`, activable con `sopActivarModoPrueba('correo')`/`sopDesactivarModoPrueba()` — ya reemplaza el único `MailApp.sendEmail()` de este archivo (el de cierre al solicitante) en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue corriendo la versión sin modo de prueba
- **`?action=pendientes&token=...` (ago 2026)**: nuevo endpoint para el Panel OTDE (`apps-script/panel-otde.gs`, ver sección propia abajo) — regresa las solicitudes abiertas (Estatus ≠ Resuelto/Rechazado). Requiere `PANEL_TOKEN` en Propiedades del script, configurado con `sopConfigurarTokenPanel('secreto')` (correrla envuelta en una función temporal, no seleccionándola directo en ▶️ Ejecutar — ver `docs/QA-NOTES.md #14`). Detalle completo en `docs/ARCHITECTURE.md §20`
- **"Planchado" de la hoja — dropdowns + semáforo + protección de solo aviso (código listo, aún
  sin desplegar, 3 sep 2026)**: `sopConfigurarValidacionYSemaforo()`, mismo patrón que
  Mantenimiento/Asesorías/Correo. `Estatus` ya tenía dropdown duro desde antes — esta ronda solo
  le agregó el semáforo de color (mismos 5 colores). Dropdowns suaves nuevos en `Urgencia`
  (Alta/Media/Baja) y `Tipo de ayuda` (7 valores, catálogos confirmados contra los `<select>`
  reales de `soporte.html`), protección de solo aviso en `Fecha`/`Folio`/`Notificación de cierre
  enviada`. Sin `Contactos_Zona_Sector` ni Oficio en este trámite, nada más que proteger. Item
  nuevo `.addItem('Aplicar validación y semáforo', 'sopConfigurarValidacionYSemaforo')` en el
  menú "OTDE Soporte". Pendiente que Jorge pegue el código en el proyecto real y lo corra. Ver
  `docs/ARCHITECTURE.md §24`.

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
- Menú "OTDE Formación" completo: Generar ID de cursos faltantes · Generar estadísticas · Actualizar vista de Inscripciones · Aplicar validación en Cursos · Migrar Jornada Verano 2026 · Instalar/Desinstalar recordatorios automáticos · Instalar/Desinstalar auto-generación de ID de curso
- **Auto-generación de ID de curso (ago 2026)**: `onEditCursos()`, instalable desde el menú de arriba — antes había que acordarse de correr "Generar ID de cursos faltantes" a mano después de dar de alta un curso; ahora se genera solo en cuanto se escribe la `Categoria` de una fila nueva. Misma lógica que el botón del menú (`generarIdsCursosFaltantes_()`, compartida por ambos caminos). Detalle en `docs/ARCHITECTURE.md §20`
- Responde `Content-Type: text/plain` para evitar preflight CORS, mismo patrón que el resto
- **Cuidado con `appendRow([])`**: Apps Script no acepta un arreglo vacío — usar `appendRow([''])` para filas en blanco. Ver `docs/QA-NOTES.md` para este y otros bugs reales ya corregidos (fetch sin timeout, fecha -1 día por parseo UTC, etc.)
- **Modo de prueba (código listo, aún sin desplegar, 11 ago 2026)**: `enviarCorreoLote()` ahora revisa la Script Property `MODO_PRUEBA_CORREO` (`fdActivarModoPrueba('correo')`/`fdDesactivarModoPrueba()`) y, si está activa, redirige `bcc`/`subject`/`htmlBody` al correo de prueba en vez de a los inscritos reales — en el repo local, pero **no se pegó ni redesplegó** en el proyecto de Apps Script real esta sesión; en producción sigue mandando a los inscritos de verdad
- **"Planchado" de la hoja `Cursos` — dropdowns + protección de solo aviso (código listo, aún
  sin desplegar, 3 sep 2026)**: `fdConfigurarValidacionYSemaforo()`, mismo patrón que
  Mantenimiento/Asesorías/Soporte, con dos diferencias: solo toca `Cursos` (`Inscripciones`/
  `Docentes` son datos transaccionales/computados, no captura manual, quedan fuera) y no hay
  columna tipo "Estatus" con semáforo de color — `Activo` ya cumple ese papel como interruptor.
  Dropdowns suaves en `Categoria` (7 valores de `PREFIJOS_CATEGORIA`), `Modalidad`
  (Virtual/Presencial/Híbrido — sin catálogo cerrado previo en el código, confirmado
  directamente con Jorge) y `Requiere_codigo_asistencia`/`Activo`/`Registro_previo_requerido`
  (TRUE/FALSE — confirmado con Jorge que estas 3 columnas son texto escrito a mano, no checkbox
  nativo de Sheets, antes de agregarles dropdown). Protección de solo aviso en `ID_Curso` y las 3
  columnas `Recordatorio_*_enviado`. Item nuevo `.addItem('Aplicar validación en Cursos',
  'fdConfigurarValidacionYSemaforo')` en el menú "OTDE Formación". Pendiente que Jorge pegue el
  código en el proyecto real y lo corra. Ver `docs/ARCHITECTURE.md §24`.
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — recordar **Administrar implementaciones → Nueva versión**, no solo "Guardar" en el editor, o el sitio sigue sirviendo la versión anterior

### `apps-script/panel-otde.gs` (nuevo, ago 2026)
- **No es un backend de trámite** — es un Apps Script aparte, pegado en un Google Sheet nuevo y propio ("Panel OTDE"), que junta en una sola hoja las solicitudes abiertas de Mantenimiento/Asesorías/Soporte/Correo, para no tener que entrar a los 4 Sheets por separado
- Llama por `UrlFetchApp` al `?action=pendientes&token=...` de cada uno de los 4 backends (los 3 sueltos de `apps-script/` + `apps-script/correo/WebApp.gs`, ver esa sección abajo). Token en Propiedades del script (`PANEL_TOKEN`), mismo secreto que los 4 backends
- Columna "Días" marcada en rojo/negrita a partir de `PANEL_UMBRAL_DIAS_ALERTA` (3 por default) sin moverse; aviso resumen arriba de la hoja
- Menú "Panel OTDE": Actualizar ahora · Instalar/Desinstalar actualización automática (cada 30 min)
- Detalle completo de la arquitectura en `docs/ARCHITECTURE.md §20`

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
- Detalle completo de la arquitectura (esquema de columnas, por qué el folio actualiza una fila
  en vez de crear una nueva, decisión de la Fase 2 separada) en `docs/ARCHITECTURE.md §22`

## Reglas de desarrollo
1. No introducir npm, frameworks ni build steps — stack estático puro
2. Cambios globales de UI → `styles.css`; cambios específicos de página → `<style>` inline en el HTML
3. Para modificar estilos del header/footer: son inline en cada página, no hay componente compartido
4. Imágenes en `images/`, PDFs en `pdfs/cte/cte-<ciclo>/<nombre-sesion>/` (ej. `pdfs/cte/cte-2026-2027/cte-fase-intensiva/`) o en `pdfs/protocolos/` para los protocolos oficiales del Estado de México (planos, sin subcarpeta — ver `protocolos.html` abajo), instaladores/ejecutables descargables en `descargas/` (ej. `.exe`, `.bat`)
5. Después de push: esperar 5-10 min o Cmd+Shift+R para invalidar caché de GitHub Pages
6. Los PDFs de sesiones CTE se nombran con mayúsculas y acentos; URL-encodear la ó como `%C3%B3` en los hrefs
7. **Sin emojis** en HTML — usar SVG inline para íconos de contacto (persona, correo, teléfono). Ver `contacto-icon` en cualquier página de área como referencia
8. El portal SEP CTE usa la URL `https://gestion.cte.sep.gob.mx/insumos/` (sin `#!/` — ese sufijo era routing antiguo de AngularJS)
9. Los materiales de `cte.html` (`.material-item strong`) siempre muestran un título humano, nunca el nombre de archivo crudo — los PDFs de SEP suelen llegar con códigos internos (`2627_s0_orientaciones_directivos.pdf`), hay que limpiarlos a texto legible (ej. "Orientaciones Directivos") antes de publicarlos

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
desactiva la validación del navegador), `fetchJsonConTimeout()` para evitar el freeze de
`fetch()` sin timeout documentado en `docs/QA-NOTES.md #1`, CCT con autocomplete + fallback
manual de Sector/Zona/Escuela (`js/cct-db.js`, detalle del patrón en `docs/ARCHITECTURE.md
§11`; cada campo del fallback valida y muestra su propio error — no agrupar todo bajo el
mensaje del CCT, anti-patrón ya corregido dos veces), y Nombre/Escuela manual homologados a
Title Case. `toTitleCase()`, `fetchJsonConTimeout()`, `otdePoblarFuncion()`,
`leerArchivoBase64()` y `TAMANO_MAX_ARCHIVO_BYTES` viven en `js/tramites-shared.js`, cargado con
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

- **Switcher aplanado a 4 botones al mismo nivel (ago 2026)**: `.correo-panel-btn`,
  `mostrarCorreoPanel('alta'|'cam'|'rst'|'inc')` — Alta de cuenta | Cambio de Contraseña |
  Eliminar Método de Autenticación | No puedo acceder a mi cuenta. Antes era un switcher de 2
  (Alta / "Cambio de contraseña · Eliminar autenticación · Otro") con un sub-switcher anidado
  de 3 dentro del segundo — Jorge reportó que se veían amontonados (más notorio en móvil, poco
  espacio para 3 botones con textos largos dentro de un panel ya angosto); se aplanó a un solo
  nivel, con más espacio (`gap`) y grid de 2 columnas en móvil. Los 4 tipos ya están completos —
  el `<iframe>` quedó retirado por completo del código.
- **"2FA" renombrado a "Eliminar método de autenticación" (ago 2026)**: mismo término que usa
  SIGEE (para que Jorge/Marcos mapeen 1:1 al procesar), con una aclaración en paréntesis para
  docentes ("código de seguridad extra que a veces se traba"). El identificador interno que
  viaja al backend (`tipo: 'reset2FA'`) no cambió — es contrato con `Reset2FA.gs`, no texto
  visible.
- **No se tocó el sistema en vivo** (repo aparte `Correos-institucionales`, `Code.gs`/
  `OnFormSubmit.gs`/`OnEditTrigger.gs`/`ResumenSemanal.gs`, atado al Form viejo que sigue usando
  Marcos, sin git) — el backend nuevo es un proyecto de Apps Script separado y en paralelo, cuyo
  código fuente vive en **`apps-script/correo/`** de este repo (`Config.gs`, `WebApp.gs`,
  `Alta.gs`, `CambioContrasena.gs`, `Reset2FA.gs`, `Incidencias.gs`, `OnEdit.gs`,
  `GenerarResumenSIGEE.gs`, `ResumenSemanal.gs` — un solo trigger `onEditWebform` que enruta por
  nombre de hoja). **Movido a este repo el 31 ago 2026** desde `Correos-institucionales/
  webform-2026-2027/` (nació ahí como proyecto paralelo antes de que existiera el ecosistema
  unificado) — el despliegue real en Apps Script no cambió, solo dónde vive la copia editable.
  **Desplegado (6 ago 2026)**: Spreadsheet
  `Solicitudes_Correo_2026_2027`, proyecto "Webform Correo 2026-2027 - Backend", las 4
  constantes (`ALTA_CORREO_APPS_SCRIPT_URL`, `CAMBIO_APPS_SCRIPT_URL`, `RESET_APPS_SCRIPT_URL`,
  `INCIDENCIA_APPS_SCRIPT_URL`) apuntan a la misma URL real (`WebApp.gs` enruta los 4 tipos por
  `datos.tipo`, un solo despliegue). El switcher del sitio ya mostraba los 4 tipos nativos desde
  antes de este despliegue, así que técnicamente el webform ya está en producción — pero el
  sistema viejo de Marcos sigue vivo en paralelo; retirarlo es una decisión de Jorge, no
  automática por haber desplegado esto.
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
  **Formación Docente deshabilitada temporalmente (1 sep 2026)**: pasó de `<a href=
  "formacion-docente.html">` a `<div class="area-card ov-proximamente">` (mismo patrón visual
  que la card "Más servicios en camino") porque el catálogo real está vacío en producción
  (verificado en vivo contra el `doGet` de `formacion-docente.gs`: `{"status":"ok","cursos":[]}`)
  — la difusión pública del hub no debía arrancar con la tarjeta más visible sin nada
  accionable. Reactivarla es un cambio de una línea (regresar el `href` y el texto "Ver
  catálogo →") en cuanto haya cursos dados de alta en la hoja `Cursos`.
- **Buscador de seguimiento** (`#buscar-folio`, debajo de la grid de tarjetas desde el 16 ago
  2026 — antes era el hero del hub, se reordenó para priorizar la acción principal de elegir un
  trámite sobre el caso secundario de consultar un folio ya existente): folio + correo → ruteo
  automático
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
  pedirlos) + tabla de disponibilidad/histórico con buscador + contador de cobertura + panel de
  cobertura por persona/sector protegido con clave (`DASHBOARD_TOKEN`) — **panel comentado/oculto
  en el HTML a petición de Jorge**, no visible las primeras semanas del ciclo; el código (HTML +
  JS + backend) queda completo, reactivarlo es quitar el comentario
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
- **Retiro de v8.5 — Fase 3 y Fase 4, no iniciadas** (ver `docs/ROADMAP.md` ítem 9): el trigger
  nocturno de organización de fotos y el reporte mensual (formato Planeación, cruce contra el
  catálogo de direcciones) siguen viviendo solo en el sistema viejo v8.5 — no se replicaron
  todavía en `mantenimiento.gs`. Tampoco se decidió el destino del histórico de v8.5 (380 aulas,
  reportes ya generados) ni el corte real. Mientras tanto, v8.5 sigue vivo en paralelo solo para
  estas dos funciones — el resto del ciclo por-solicitud (intake, fecha programada, reporte
  técnico con PDF, cierre) ya no lo necesita.
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
- **Centro de Formación Docente** — dar de alta los primeros cursos propios del ciclo 26-27 en la hoja `Cursos` (verificado en vivo el 1 sep 2026: el catálogo real está vacío, `{"status":"ok","cursos":[]}` — la nota de "2 webinars" de sesiones anteriores ya no aplica). Mientras tanto la tarjeta en `oficina-virtual.html` queda deshabilitada ("Próximamente", ver esa sección arriba) — reactivarla en cuanto haya cursos dados de alta.
- **Correo/Mantenimiento/Asesorías** — los 3 backends nuevos ya están desplegados y con `Contactos_Zona_Sector` poblado (6 ago 2026, ver sus secciones arriba). Notificaciones de equipo (Telegram + correo) por trámite reorganizadas en sep 2026: ver sus secciones arriba y las de Soporte/Correo Institucional.
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
