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
| Fase Intensiva 2026-2027 | 2026-2027 (actual) | — | — | 8 PDFs (`pdfs/cte/cte-2026-2027/cte-fase-intensiva/`) | ✅ (`cte-fase-intensiva-completa.zip`) |
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

**Ojo con 3 de los 8 PDFs de Fase Intensiva 2026-2027:** llevan prefijo de otro ciclo en el
nombre de archivo (`2526_s1_comunidad_aprendizaje.pdf`, `2526_s2_t4_orgcompleta_insumo1.pdf`,
`2526_s3_t4_orgcompleta_insumo2.pdf` = ciclo 2025-2026; `2425_s0_insumos_direc_proceso_mejora_continua.pdf`
= ciclo 2024-2025) pero viven en la carpeta de 2026-2027 — Jorge los puso ahí a propósito como
material de referencia, no es un error de organización.

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
- Conectado a Google Sheets (hoja `Solicitudes_Soporte_2026`, autocreada si no existe)
- Folio: `OTDE-SOP-NNNN` (secuencial, autoincremental)
- Columnas A-L: Fecha | Folio | Nombre | CCT | Sector | Zona | Escuela/Unidad | Función/Cargo | WhatsApp | Correo | Descripción | Urgencia
- **CCT con autocomplete**: mismo patrón usado en `otde.html`/`formacion-docente.html` (`js/cct-db.js`, 506 registros) — funciones `sopSeleccionarCct`/`sopResetCct`/`sopActualizarZonas` (prefijo `sop` para no chocar con las de otras páginas). Si la CCT no está en la base, aparecen campos manuales de Sector/Zona/Escuela (`#sop-manual-fields`)
- **Función/Cargo** es un `<select>` (mismas opciones que el resto del sitio: Docente, Director(a), Subdirector(a), ATP, Supervisor(a), Jefe(a) de Sector, Personal de apoyo (PAAE), Otro) con campo libre si se elige "Otro"
- WhatsApp es obligatorio (regex `/^\d{10}$/`, sin lada); Correo es opcional. La notificación de Telegram incluye un link `https://wa.me/52<whatsapp>` para abrir el chat con un tap
- El `<form>` usa `novalidate` + validación 100% en JS (`validarSoporteForm()`) — necesario porque los `type="email"`/`required` nativos interceptan el `submit` antes de correr el JS si no se desactiva la validación del navegador
- Al recibir `doPost`, además de guardar en Sheets envía una notificación push vía **bot de Telegram** (`notificarTelegram`); si Telegram falla, el registro en Sheets no se pierde (try/catch silencioso)
- Requiere Propiedades del script configuradas manualmente en el editor de Apps Script (Project Settings → Script Properties): `TELEGRAM_BOT_TOKEN` y `TELEGRAM_CHAT_ID` — instrucciones completas para obtenerlas están al final del propio archivo `.gs`
- Usado por el formulario "Solicitar Soporte Técnico Remoto" en la pestaña Soporte Técnico de `otde.html`; responde `Content-Type: text/plain` para evitar preflight CORS
- URL del deployment vive en `otde.html` en la constante `SOPORTE_APPS_SCRIPT_URL`
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario) — **cuidado**: probar el endpoint con `curl -X POST`, o incluso desde un navegador headless con acceso real a internet (confirmado: el sandbox de pruebas SÍ tiene salida real a `script.google.com`), ejecuta `doPost` de verdad (escribe en Sheets y dispara Telegram). Para pruebas locales, interceptar la llamada de red (`page.route()` en Playwright) en vez de dejarla llegar al backend real

### `apps-script/formacion-docente.gs`
**Desplegado en producción desde jul 2026** (Spreadsheet real `Formacion_Docente_2026_2027`, URL real ya pegada en `APPS_SCRIPT_URL` de `formacion-docente.html`; la extinta `jornada-verano-2026.html` compartió este mismo backend hasta su eliminación el 13 jul 2026).

- Conectado a un Google Spreadsheet propio por ciclo escolar, con **3 pestañas relacionales** en vez de una hoja plana: `Docentes` (llave RFC, upsert), `Cursos` (catálogo administrado a mano por OTDE), `Inscripciones` (transaccional, FK a las otras dos, con columnas de vista I-O calculadas por `VLOOKUP` — nombre del docente/curso, CCT, escuela, sector, zona, función, todo en vivo, nunca copiado a mano)
- **`doGet`** regresa el catálogo de cursos con `Activo=TRUE` **y** dentro de la ventana `Visible_desde`/`Visible_hasta` si esas columnas están llenas (opcional, se evalúa por año/mes/día, sin depender de un trigger programado). También manda `registro_previo_requerido` (fuerza pasar por una liga externa antes del formulario OTDE, para cursos con cupo real) y `inscritos` (conteo real desde `Inscripciones`, para prueba social en las tarjetas — nunca inventado)
- **`doPost`** hace *upsert* en `Docentes` por RFC (si ya existe, actualiza sus datos; si no, lo agrega). Un valor nuevo vacío **nunca sobrescribe** un dato bueno que ya hubiera (`valorOMantener()`) — importante para migraciones históricas incompletas. Agrega una fila en `Inscripciones` por cada curso; si el RFC ya estaba inscrito a ese mismo curso, no duplica folio: regresa el folio existente con `duplicado:true`
- Folio: `OTDE-CAP-NNNN`. ID de curso: `PREFIJO-CICLO-NNN` (ej. `WEB-2627-001`, prefijos en `PREFIJOS_CATEGORIA`)
- **Columnas de `Cursos`** (A-S): ID_Curso, Categoria, Nombre, Responsable, Modalidad, Fecha_inicio, Fecha_fin, Liga_convocatoria, Requiere_codigo_asistencia, Codigo_asistencia, Activo, Notas, Registro_previo_requerido, Visible_desde, Visible_hasta, Hora_inicio, Recordatorio_inicio_enviado, Recordatorio_medio_enviado, Recordatorio_webinar_enviado. `obtenerHojaCursos()` completa sola cualquier encabezado que falte en hojas ya creadas antes de agregar una columna — no hay que migrar nada a mano
- **Recordatorios automáticos por correo** (jul 2026): "empieza en 2 días" (todos los cursos), "vas a la mitad" (solo cursos de 30+ días), "faltan unas horas" (eventos de un solo día con `Hora_inicio` capturada, evaluado cada hora). Un solo correo por curso con BCC a todos los inscritos (no uno por persona) y revisión de `MailApp.getRemainingDailyQuota()` antes de enviar — la cuota diaria la comparten TODOS los Apps Script de la cuenta de Google, no es exclusiva de este proyecto. Requiere correr una vez el menú "OTDE Formación → Instalar recordatorios automáticos" para dar de alta los disparadores (diario + cada hora); detalle completo en `docs/DESIGN_SYSTEM.md` y `docs/ARCHITECTURE.md §12`
- **No hay gestión de constancias**: los webinars/seminarios no las emiten (salvo UNETE) y en los demás programas las emite la plataforma de CoEEE — OTDE solo registra participación para fines estadísticos
- Menú "OTDE Formación" completo: Generar ID de cursos faltantes · Generar estadísticas · Actualizar vista de Inscripciones · Migrar Jornada Verano 2026 · Instalar/Desinstalar recordatorios automáticos
- Responde `Content-Type: text/plain` para evitar preflight CORS, mismo patrón que el resto
- **Cuidado con `appendRow([])`**: Apps Script no acepta un arreglo vacío — usar `appendRow([''])` para filas en blanco. Ver `docs/QA-NOTES.md` para este y otros bugs reales ya corregidos (fetch sin timeout, fecha -1 día por parseo UTC, etc.)
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

## `otde.html` — Pestañas "Licencias Office" y Soporte Técnico Remoto (jul 2026)
- **Licencias Office**: nueva pestaña de servicio con instalador `descargas/Instalador_Office_2019_OTDE.exe` (self-extracting, incluye `Instalador_Office_OTDE.bat` + Office Deployment Tool) que valida por CCT contra una base de datos publicada en Sheets/CSV. El texto evita atribuir la causa a SEIEM directamente (se enmarca como "actualización del esquema de licenciamiento institucional")
- **Guía rápida de instalación**: los 5 pasos del mini-manual están basados en el flujo real del `.bat` (autoelevación, validación CCT, desinstalación de Office previo si existe, instalación de Office 2019 Professional Plus, aviso de privacidad) — si el `.bat` cambia, actualizar el manual para que siga siendo preciso
- **Soporte Técnico Remoto**: se mantiene TeamViewer (no Quick Assist) como herramienta de control remoto. Se agregó un formulario "Solicitar Soporte Técnico Remoto" (nombre, CCT, función, WhatsApp, correo opcional, urgencia, descripción) que envía a `apps-script/soporte-remoto.gs`
- **Validación de formulario**: el `<form>` usa `novalidate` + validación 100% en JS (`validarSoporteForm()`) — necesario porque los inputs `type="email"`/`required` nativos interceptan el `submit` antes de que corra el JS si no se desactiva la validación del navegador
- **`fetchJsonConTimeout()`** en el envío — mismo bug de freeze corregido aquí que en `formacion-docente.html`/`asistencia.html` (ver `docs/QA-NOTES.md #1`)
- **Nombre y Escuela (manual)** homologados a Title Case
- **Referencia cruzada**: la pestaña Office enlaza a Soporte si hay problemas durante la instalación; Soporte enlaza de vuelta a Office si la consulta es sobre licencias — ambos via `showServicio()` con `onclick` (no back-forward real de navegador)
- **CCT con autocomplete** (`js/cct-db.js`): fallback manual de Sector/Zona/Escuela si la CCT no está en la base. Cada campo del fallback valida y muestra su propio error (Zona, Sector, Escuela) — no agrupar todo bajo el mensaje del campo CCT, es un anti-patrón ya corregido dos veces en el sitio. Detalle completo del patrón en `docs/ARCHITECTURE.md §11`
- **Banners de convocatoria** (hoy solo Formación Docente; el de Jornada Verano se retiró 13 jul 2026): clases reutilizables `.otde-banner`/`.otde-banner-cta`/`.otde-banner-link` (sombra en capas, glow sutil, hover con elevación). Usan **Montserrat** a propósito, no Inter — es la tipografía ya establecida en esta página, meter una fuente distinta solo en el banner se vería ajeno

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

## Pendientes (al 7 jul 2026)
- **Recrear páginas eliminadas** — `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`, `servicio-profesional.html`: requieren contenido validado con la Dra. Galindo
- **Logomark SEPRN** — requiere archivo `logo.svg` (diseño gráfico pendiente)
- **Barra CTE** — actualizar texto del `.update-banner` en `index.html` cuando se publique la 9ª sesión
- **Centro de Formación Docente** — ya desplegado y con rediseño premium; falta que OTDE dé de alta los primeros cursos propios del ciclo 26-27 en la hoja `Cursos` (hoy el catálogo solo tiene los 5 de Jornada Verano, migrados). Recordar setear `Registro_previo_requerido` y, si aplica, `Hora_inicio` en cada curso nuevo
