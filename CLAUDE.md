# SEPRN Sitio Web — Guía para Claude

## Contexto del proyecto
Sitio web institucional de la **Subdirección de Educación Primaria en la Región de Nezahualcóyotl (SEPRN)**, desplegado en GitHub Pages.

- **URL producción:** `https://educaneza.github.io/seprn-sitio/`
- **Repo:** `educaneza/seprn-sitio` (rama `main`)
- **Stack:** HTML5 + CSS3 + Vanilla JS. Sin npm, sin frameworks, sin build step.
- **Deploy:** push a `main` → GitHub Pages. Caché CDN: 5-10 min. Un `git push origin main`
  directo es seguro desde el 31 ago 2026 (merge `3a8d218`). Si alguna vez se acumula trabajo
  local no listo para producción, publicar con una rama `publish-*` creada desde `origin/main`;
  antes de cualquier push, correr `git log --oneline -3 origin/main` y comparar contra `main`
  local. Historia y ejemplos en `docs/BITACORA.md` (buscar "publish-").

**Detalle por sistema:** el historial de cada página y backend (versiones, fechas de despliegue,
decisiones, bugs) vive en **`docs/SISTEMAS.md`**. Aquí solo va el resumen y las trampas que hay
que saber siempre. Antes de tocar un sistema, leer su sección en `docs/SISTEMAS.md`.

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
- **Identidad gráfica decidida (19 oct 2026, Jorge):** el sitio se queda en Montserrat (no se
  adoptan Gotham/BW Modelica/Corporative de la guía del Edomex) y **no** muestra el Escudo ni la
  pleca de logos del Gobierno del Estado de México. No reabrir sin que Jorge lo pida.
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
| Primera Sesión Ordinaria 2026-2027 | 2026-2027 (actual) | `vhuipmEOEuY` | — | 5 materiales (PPTX + 4 PDFs, `pdfs/cte/cte-2026-2027/cte-primera-sesión/`) | ✅ (`cte-primera-sesión-completa.zip`) |
| Fase Intensiva 2026-2027 | 2026-2027 (actual) | `bXq_TtMf_pc` | — | 9 PDFs (`pdfs/cte/cte-2026-2027/cte-fase-intensiva/`) | ✅ (`cte-fase-intensiva-completa.zip`) |
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
Tabla completa, con el historial de cada página, en `docs/SISTEMAS.md`.

| Archivo | Sección |
|---|---|
| `index.html` | Portada — hero midnight, métricas animadas, áreas, mapa SVG |
| `nosotros.html` | Misión, visión, valores, equipo directivo (hero midnight) |
| `areas.html` | Listado de áreas (hero midnight) |
| `cte.html` | Sesiones CTE — acordeones + videos YouTube (hero midnight) |
| `contacto.html` | Datos de contacto (hero midnight) |
| `academica.html` / `personal.html` / `planeacion.html` / `recursos.html` | Subjefaturas |
| `oeve.html` / `juridico.html` | Oficina de Extensión y Vinculación / Oficina Jurídica |
| `otde.html` | OTDE — 3 tabs sin formulario: Licencias Office (default), Chuka, Recursos |
| `correo.html` / `mantenimiento.html` / `asesorias.html` / `soporte.html` | Las 4 páginas propias de trámite (migradas desde tabs de `otde.html` el 27 ago 2026). Header/nav/footer institucional, sin entrada en nav/footer; se llega por `oficina-virtual.html` |
| `oficina-virtual.html` | Hub de servicios OTDE + consulta de estatus por folio |
| `reporte-visita.html` | Captura del técnico tras una visita de Mantenimiento. Link directo |
| `bitacora.html` | Bitácora interna OTDE (Jorge y Nancy), clave `CLAVE_CAPTURA`, `noindex`. También vive como pestaña "Actividad" de `oficios.html` (`?embed=1`); `?oficio=OF-NNNN` precarga un oficio |
| `oficios.html` | Oficina interna OTDE (Jorge, Nancy, Alejandro, Marcos): Tomar número · Oficios · Actividad. Clave `CLAVE_CAPTURA`, `noindex`. Guía `docs/manual-oficios.html` |
| `charla-ia.html` | Evento IA jun 2026 (sin formulario) |
| `formacion-docente.html` / `instructivo-formacion-docente.html` | Centro de Formación Docente (catálogo dinámico + registro) y su guía imprimible. Diseño propio, ver `docs/DESIGN_SYSTEM.md` |
| `excel-facil.html` | Herramienta 100% local de Excel para docentes (librerías incrustadas, sin internet, ~1.2 MB). Ver `docs/ARCHITECTURE.md §30` |
| `crea-tu-app.html` | Generador de prompts del Banco de Materiales 2.0, con `CATALOGO_SEP` incrustado. No llama a ninguna IA |
| `apps-educativas/*.html` | Apps de muestra del Banco de Materiales 2.0 (un archivo cada una, licencia CC BY-NC-SA 4.0 pendiente de confirmar) |
| `404.html` | Página de error personalizada |
| `protocolos.html` | 3 protocolos oficiales del Edomex/SEIEM |
| `ceremonias-civicas.html` / `ficha-ceremonias-civicas.html` | Reserva y ficha post-visita de Ceremonias Cívicas (SEPRN-wide, no OTDE) |
| `estrategias-nacionales.html` | Selección mensual de escuelas por estrategia (Programas Educativos). Se llega desde `academica.html` |

**Herramientas OTDE autónomas (`excel-facil.html`, `crea-tu-app.html`):** llevan encabezado,
hero midnight y pie del sitio **copiados dentro de cada archivo** (CSS con prefijo `inst-`), no
ligan `styles.css`, para funcionar solas y sin internet. Enlaces de encabezado/pie con URL
absoluta. **Si cambia el encabezado o el pie del sitio, actualizar también estas dos copias.**
Las apps educativas **no** llevan estilo institucional, solo el sello de crédito al pie.

## Páginas eliminadas (recrear cuando haya contenido validado)
- `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`,
  `servicio-profesional.html`

## Páginas retiradas
- `jornada-verano-2026.html` e `instructivo-jornada-verano-2026.html` — **no recrear** (cerró la
  Jornada Verano 2026, 13 jul 2026). Su backend `formacion-docente.gs` sigue vivo.
- `asistencia.html` — retirada el 14 oct 2026, **se puede rehacer**:
  `git show 7a1f171:asistencia.html`. El `.gs` (`conferencia-ia.gs`) se queda en el repo.

## Backend (Apps Script)
Detalle completo de cada backend en `docs/SISTEMAS.md`; arquitectura en `docs/ARCHITECTURE.md`.

### Reglas comunes a todos los backends
- **Desplegar**: pegar el `.gs` completo en el editor y **Administrar implementaciones → Editar →
  Nueva versión** (misma URL), con acceso "Cualquier usuario". Solo "Guardar" no publica nada.
  Si no tiene "Cualquier usuario", responde "Acceso denegado" (`docs/QA-NOTES.md #49`).
- **Probar con `curl` o un navegador escribe de verdad** (el sandbox tiene red real): `doPost`
  guarda en Sheets y manda Telegram/correo. Interceptar con `page.route()` o usar el modo de
  prueba del backend (`xxxActivarModoPrueba('correo')`), y CCT ficticios.
- **`curl` a un Web App**: el 302 a `script.googleusercontent.com/...` se sigue con **GET**;
  `curl -L -X POST` devuelve una página de error de Drive, no la respuesta real.
- Responden `Content-Type: text/plain` para evitar el preflight CORS.
- **Columnas por nombre**: los trámites (Asesorías, Mantenimiento, Soporte, Correo) y Formación
  Docente leen y escriben por nombre de encabezado (`docs/ARCHITECTURE.md §33`). Una columna
  nueva va en su bloque de `ENCABEZADOS_*`, no al final. Excepción: `bitacora.gs` lee
  `Planeacion` por posición (no insertar columnas antes de "Nombre corto").
- **Alta a prueba de reintentos**: `LockService` + `ID de envío` (`docs/ARCHITECTURE.md §27`).
  Todo formulario nuevo conserva el `idEnvio` entre reintentos.
- `appendRow([])` truena: usar `appendRow([''])`. `const` de nivel superior que lee constantes de
  otro archivo del mismo proyecto puede tronar con `ReferenceError` (armarlo dentro de la función).
- Funciones que reciben argumentos (`xxxConfigurarTokenPanel('secreto')`) se corren envueltas en
  una función temporal, no con ▶️ Ejecutar directo (`docs/QA-NOTES.md #14`).
- **Triggers**: después de instalarlos, confirmar en "Activadores" que sí aparecen (una vez no
  quedó registrado aunque la función corrió sin error).
- Telegram con `parse_mode: 'Markdown'`: escapar URLs (un `_` sin pareja tumba el envío,
  `docs/QA-NOTES.md #24`). Las Script Properties son por proyecto.
- Antes de escribir un `fetch()` o un `appendRow()` nuevo, revisar `docs/QA-NOTES.md`.

### Resumen por backend
| Archivo | Sheet / folio | Lo esencial |
|---|---|---|
| `conferencia-ia.gs` | `Registros_IA_2026` | Evento IA jun 2026. Inactivo (responde 403) |
| `cursos-coeee-2026.gs` | `Cursos_OTDE_Verano_2026`, `OTDE-V26-NNNN` | **Congelado** desde jul 2026, solo histórico |
| `soporte-remoto.gs` | `Solicitudes_Soporte_2026` (archivo "Soporte Técnico Remoto"), `OTDE-SOP-NNNN` | URL en `SOPORTE_APPS_SCRIPT_URL` de `soporte.html`. Telegram a Alejandro + correo `SOP_CORREO_EQUIPO`. Cierre automático `sopOnEditCierre` (solo avisa al solicitante, sin Zona/Sector a propósito). `?action=pendientes`, `?action=soporteMes`, `?action=consulta` |
| `mantenimiento.gs` | `Solicitudes_Mantenimiento_2026` (hojas `Solicitudes`, `Contactos_Zona_Sector`, `Reportes de visita`), `OTDE-MAN-NNNN` | El oficio firmado sigue siendo obligatorio (PDF, 5 MB). Cae en "Pendiente de validar". Correo combinado: `to`=solicitante, `cc` según tipo de solicitante (escuela → Zona+Sector, supervisión → Sector, jefatura → nadie). Telegram a Alejandro. Aviso al técnico al tener fecha + `Técnico asignado`. Reporte de visita con PDF (`reporte-visita.html` → `doPost` `accion:'reporteVisita'`). **Si cambian campos obligatorios: publicar primero el `.html` y después el `.gs`.** Endpoints `pendientes`, `reportesMes`, `oficiosOV`, `mantenimientoPorCct`, `consulta` |
| `asesorias.gs` | `Solicitudes_Asesorias_2026`, `OTDE-ASE-NNNN` | Mismo patrón que Mantenimiento. Tipos: Banco de Materiales y Chuka (exige casilla de mantenimiento previo; verificación por CCT contra Mantenimiento, no bloquea) y Excel básico (temas opcionales). Telegram a Nancy. Endpoints `pendientes`, `asesoriasMes`, `oficiosOV`, `consulta` |
| `correo/` (10 `.gs`, un solo despliegue) | `Solicitudes_Correo_2026_2027`, 5 hojas, folios `OTDE-ALT/CAM/2FA/CYR/INC-` | `WebApp.gs` enruta por `datos.tipo`. Al redesplegar, pegar **todos** los archivos modificados y una sola Nueva versión. El sistema viejo de Marcos (Google Form) se apagó el 14 oct 2026. Telegram/correo a Marcos (Alta no avisa a propósito). `NP SIGEE` lo llena Marcos a mano: es lo que sostiene la trazabilidad |
| `formacion-docente.gs` | `Formacion_Docente_2026_2027` (`Docentes`/`Cursos`/`Inscripciones`), `OTDE-CAP-NNNN` | Ver sección abajo |
| `panel-otde.gs` | "Panel OTDE" | **Apagado** el 14 oct 2026 (el código y el Sheet se quedan) |
| `bitacora.gs` | "Bitácora OTDE 2026-2027" | Reporte mensual de Planeación (METAS 21/23). Se alimenta solo de Mantenimiento (N.P. 7), Asesorías (N.P. 8), Formación Docente (`NP_planeacion`), Soporte y Correo (resúmenes regenerables). URLs + `PANEL_TOKEN` en Script Properties. Tras cambiar hojas, correr "Preparar hojas" |
| `oficios.gs` | "Control de oficios OTDE" | Consecutivo de oficios por lotes (formato `228C0101110500T/<n>/<año>`), nunca reutiliza un número. Oficios recibidos (llave = folio de Oficialía + año), `OF-NNNN`. Comisiones = un oficio por persona y por día, `.docx` desde plantilla. Oficio de salida (2C): `.docx` desde la plantilla del machote, cuerpo escrito en la página, destinatarios del catálogo "Sector / área" de `Config`; los campos se buscan con `ofUnirCampos_()` porque Word los parte al guardar (`docs/QA-NOTES.md #54`). **El RFC del personal nunca sale del Sheet ni va en el código** (repo público). Las capturas de `images/manual-oficios/` están desfasadas y el script que las generó no está en el repo |
| `visitas-jefes.gs` | `Seguimiento_Ceremonias_Cívicas_26-27`, `SEPRN-CC-NNNN` | Sin correo ni Telegram a propósito. Bloqueo por CCT+semana con `LockService`. `Reservas` tiene un filtro: `deleteRow()` no borra filas ocultas, usar `visConFiltroQuitado_()` (`docs/QA-NOTES.md #48`). Panel de cobertura público sin clave (decisión de Jorge) |
| `estrategias-nacionales.gs` | `Estrategias_Nacionales_26-27`, `SEPRN-EN-NNNN` | 1 escuela = 1 estrategia por ciclo, bloqueo duro en el servidor. Ciclo nuevo = Sheet nueva + `MESES_EN_CICLO` |

**Notificaciones de equipo (sep 2026):** Mantenimiento y Soporte → Alejandro; Asesorías → Nancy;
Correo → Marcos. Cada una por Telegram (chat personal) + correo.

### `formacion-docente.gs` — lo que hay que saber siempre
- `doGet` da el catálogo (`Activo=TRUE` y `Visible_desde`) y `cursos_pasados`; `doPost` hace
  upsert de `Docentes` por RFC (un valor vacío nunca pisa uno bueno) y no duplica folio.
- Estados: abierta → agotada (`Cupo_agotado`) → cerrada (`Fecha_limite_inscripcion` +
  `Hora_limite_inscripcion`) → pasado (`hoy > Fecha_fin`). **Cerrar la inscripción con
  `Fecha_limite_inscripcion`, no con `Visible_desde`.** `Liga_convocatoria` lleva una sola URL.
- Recordatorios por correo son **respaldo**: el aviso principal es el calendario de la
  confirmación. La cuota de `MailApp` la comparten todos los Apps Script de la cuenta; lotes de
  45 con reserva (`RESERVA_CUOTA_CORREO`). Los correos se ven en **Recibidos** (no Enviados) de
  `otde.nezahualcoyotl@gmail.com`.
- Tras cada redeploy, correr "OTDE Formación → Instalar recordatorios automáticos" **desde el
  menú de la hoja**, no con ▶️ desde el editor.
- Constancias solo para cursos con `Liga_tutorial_constancia` (UNETE).

## Páginas propias de trámite (`correo.html`, `mantenimiento.html`, `asesorias.html`, `soporte.html`)
Patrón compartido (detalle en `docs/SISTEMAS.md` y `docs/ARCHITECTURE.md §21`):
- `<form novalidate>` + validación 100% en JS (los `required`/`type="email"` nativos interceptan
  el `submit` antes del JS). **Cada campo valida y muestra su propio error** — no agruparlos bajo
  el mensaje del CCT.
- CCT con autocomplete + fallback manual de Tipo de CCT/Sector/Zona/Escuela (`js/cct-db.js`,
  `docs/ARCHITECTURE.md §11`), prefijo por página (`sop`/`man`/`ase`; Correo usa
  `crearCctAutocomplete(prefijo)`). Nombre/Escuela manual en Title Case.
- `js/tramites-shared.js` (cargado después de `js/cct-db.js`): `toTitleCase()`,
  `fetchJsonConTimeout()`, `otdePoblarFuncion()`, `leerArchivoBase64()`,
  `TAMANO_MAX_ARCHIVO_BYTES`, `comprimirImagen()` y el indicador de progreso
  (`esperaConProgreso()`, `botonOcupado()`, `mostrarProgreso()`). **Todo envío debe mostrar que
  sigue trabajando** (`docs/ARCHITECTURE.md §29`).
- CSS de formularios y de contenido institucional en `styles.css` (nombres heredados
  `soporte-*`/`sop-*`). Navegación de regreso: `.tramite-back-link` y `.tramite-otros-tramites`.
- Correo: el identificador `tipo: 'reset2FA'` es contrato con el backend aunque el texto visible
  diga "Eliminar método de autenticación". El dominio de la cuenta se deriva solo
  (`altCalcularDominio()`, regla en `docs/ARCHITECTURE.md §16`).

## `oficina-virtual.html`
- Ruteo de la consulta por prefijo de folio (`OV_TIPOS_DE_TRAMITE`, 8 prefijos). **Un prefijo
  nuevo va aquí y en el backend** (`docs/QA-NOTES.md #45`).
- Contrato `GET ?action=consulta&folio=&correo=` → `{status:'ok', ...}` o
  `{status:'no_encontrado'}` (mismo mensaje si el folio no existe o el correo no coincide). No es
  autenticación real: el texto dice "consulta rápida", nunca "portal seguro".
- `otde.html` conserva el manejador de `location.hash` por el link `soporte.html` →
  `otde.html#office`.

## Otras páginas — lo esencial
- **`otde.html`**: el instalador `descargas/Instalador_Office_2019_OTDE.exe` valida por CCT; los 5
  pasos de la guía siguen el `.bat` real (si cambia el `.bat`, actualizar la guía). Comentarios
  `<!-- SERVICIO N -->` = numeración de tabs. Banner `.otde-banner` en Montserrat, no Inter.
- **`protocolos.html`**: no está en nav ni footer; se llega por el `.protocolo-banner` de
  `juridico.html`, `academica.html` y `oeve.html`. Los 3 protocolos aplican a las 3 oficinas.
  PDFs planos en `pdfs/protocolos/`. Sin contador de descargas (decisión deliberada).
- **`formacion-docente.html`**: no importa `styles.css`; **consultar `docs/DESIGN_SYSTEM.md`
  antes de rediseñar**. La prueba social de inscritos es real, nunca inventada (se oculta en 0).
  La confirmación genera calendario (Google + `.ics`) y comprobante en el navegador.
- **Ceremonias Cívicas**: sin correo ni teléfono en el formulario (el sistema no notifica). La
  ficha separa los campos "Para difusión" de la Operatividad "Uso interno". Fotos comprimidas en
  el navegador, timeout propio de 120 s (`FICHA_TIMEOUT_ENVIO_MS`).
- **`js/cct-db.js`**: 506 registros con `municipio`. El municipio sale del CCT exacto, no del
  sector (un sector abarca varios municipios).

## Reglas de desarrollo
1. No introducir npm, frameworks ni build steps — stack estático puro
2. Cambios globales de UI → `styles.css`; cambios específicos de página → `<style>` inline en el HTML
3. Para modificar estilos del header/footer: son inline en cada página, no hay componente compartido
4. Imágenes en `images/`, PDFs en `pdfs/cte/cte-<ciclo>/<nombre-sesion>/` (ej. `pdfs/cte/cte-2026-2027/cte-fase-intensiva/`) o en `pdfs/protocolos/` para los protocolos oficiales del Estado de México (planos, sin subcarpeta — ver `protocolos.html` abajo), instaladores/ejecutables descargables en `descargas/` (ej. `.exe`, `.bat`). Documentos pesados de página de área (`.pptx`/`.pdf` propios de una Subjefatura, no institucionales): archivo descargable en `pdfs/<area>/`, diapositivas de vista previa (si aplica) en `images/<area>/<slug-del-documento>/slide-NN.jpg` — ver `docs/ARCHITECTURE.md §25` (compresión de `.pptx` + lightbox sin convertir a PDF, caso real en `planeacion.html`)
   - **Antes de comitear material pesado nuevo** (ZIPs/PPTX de sesiones CTE, sobre todo):
     revisar contra los umbrales de `docs/ROADMAP.md` ítem 10 (contenido publicado total y
     tamaño del archivo más grande del commit) y **avisar a Jorge de inmediato si se cruzan** —
     no esperar al cierre de sesión. Estado al 21 sep 2026: 514 MB publicados (umbral de aviso
     800 MB), archivos individuales hasta 80 MB (umbral de aviso 80 MB, límite duro de GitHub
     100 MB). Git LFS no es viable aquí — GitHub Pages no resuelve sus punteros, serviría el
     archivo de puntero en vez del PDF/ZIP real (confirmado ese mismo día, ver ROADMAP).
5. Después de push: esperar 5-10 min o Cmd+Shift+R para invalidar caché de GitHub Pages. Antes
   de dar algo por publicado, revisar con `gh run list -R educaneza/seprn-sitio -L 3` que el run
   de **cada** commit terminó en `success`. Un run en "failure" o en `queued` más de 10 min
   significa cancelarlo (`gh run cancel`) y volver a desplegar. Después confirmar con `curl` un
   cambio de cada commit, no solo del primero (`docs/QA-NOTES.md #53`). `gh` en esta Mac tiene
   dos cuentas (`educaneza` y `auliamx`): confirmar con `gh auth status` que la activa es
   `educaneza`, o usar `gh auth switch -u educaneza`.
6. Los PDFs de sesiones CTE se nombran con mayúsculas y acentos; URL-encodear la ó como `%C3%B3` en los hrefs
7. **Sin emojis** en HTML — usar SVG inline para íconos de contacto (persona, correo, teléfono). Ver `contacto-icon` en cualquier página de área como referencia
8. El portal SEP CTE usa la URL `https://gestion.cte.sep.gob.mx/insumos/` (sin `#!/` — ese sufijo era routing antiguo de AngularJS)
9. Los materiales de `cte.html` (`.material-item strong`) siempre muestran un título humano, nunca el nombre de archivo crudo — los PDFs de SEP suelen llegar con códigos internos (`2627_s0_orientaciones_directivos.pdf`), hay que limpiarlos a texto legible (ej. "Orientaciones Directivos") antes de publicarlos

## Ritual de cierre de sesión
Automatizado en el skill `/close` (`.claude/skills/close/SKILL.md`) — invocarlo al terminar una
sesión de trabajo en vez de repetir este ritual a mano. Tabla de qué documento actualizar según
qué cambió (el skill defiere a esta tabla, no la duplica — si cambia, solo se edita aquí).
La apertura es el skill `/open` (`.claude/skills/open/SKILL.md`): revisa la cuenta de `gh`, git
contra `origin/main` y los últimos despliegues, y retoma la fila **Pendiente** del checkpoint más
reciente de `docs/BITACORA.md` (por eso esa fila debe quedar clara al cerrar):

| Documento | Actualizar cuando la sesión… |
|---|---|
| `docs/BITACORA.md` | **Siempre.** Agregar un checkpoint nuevo arriba del anterior (orden cronológico inverso) |
| `docs/ARCHITECTURE.md` | Cambió estructura de archivos, arquitectura de un backend, o un flujo técnico nuevo (patrón §11-16 como referencia) |
| `docs/ROADMAP.md` | Se resolvió o se agregó un pendiente genuinamente futuro (no "qué se hizo", eso va a `BITACORA.md`) |
| `README.md` | Cambió cómo se levanta/despliega el proyecto, o la estructura de archivos en disco |
| `docs/SISTEMAS.md` | Cambió una página o un backend: su sección de detalle (versiones, despliegues, decisiones) |
| `CLAUDE.md` (este archivo) | Se acordó una regla o convención nueva, cambió una trampa que hay que saber siempre, o una página/backend cambió lo suficiente para que su **resumen** aquí quede desactualizado. Aquí no va historial: va a `docs/SISTEMAS.md` y `docs/BITACORA.md`. Mantener este archivo por debajo de ~60k caracteres |
| `docs/QA-NOTES.md` | Se cazó un bug real con causa raíz identificada |
| `docs/TABLERO-SALUD.md` | Se tocó, se probó en vivo, se apagó o se retiró un sistema (solo sus filas). `/open` lo lee para no olvidar los sistemas que no se están trabajando |

Regla de esta tabla: **no tocar todos los documentos por costumbre** — solo los que el trabajo
de la sesión realmente volvió obsoletos.


## Pendientes vigentes
Para saber qué sistema necesita atención (y cuál se está olvidando), empezar por
`docs/TABLERO-SALUD.md`. Detalle en `docs/ROADMAP.md`; historial en `docs/BITACORA.md`; pendientes
ya resueltos al final de `docs/SISTEMAS.md`. Lo genuinamente abierto:
- **Crea tu app educativa / Banco de Materiales 2.0**: falta que Jorge revise PDA y apps, decida
  la licencia y valide con la Dra. Galindo; después, carta descriptiva del taller, ficha técnica y
  catálogo del banco. `docs/ROADMAP.md` ítem 35.
- **Mejoras de operación del 14 oct 2026**: desplegadas (15 oct), sin prueba en vivo a propósito
  (Jorge espera feedback de usuarios). Mientras, revisar "Ejecuciones" de cada proyecto. No habrá
  `Historico_v8.5`. `docs/ROADMAP.md` ítem 33.
- **Operación interna OTDE**: Fase 1 (bitácora + reporte mensual) y Fase 2 pasos 2A, 2B, 2C y 2D
  en producción (`oficios.html`, arrancado oficialmente el 12 oct 2026; 2C el 19 oct). Falta:
  que Jorge capture los 13 supervisores en `Config` y pruebe un oficio de salida real, importar
  el primer caso real de Asesorías resueltas (Nancy llena *Fecha de realización* y *Asistentes*),
  llenar `NP_planeacion` en cursos nuevos, revisión de Jorge del "N.P. planeación" por tipo de
  oficio, y siguiente paso (recordatorios o 2E). `docs/PLAN-OPERACION-INTERNA.md` y ROADMAP ítem 27.
- **Formación Docente — calendario**: iPhone y computadora confirmados; falta Android y Outlook.
  Compartir la liga `?calendario=ACF-2627-001`. Los correos casi no salen en cursos grandes por
  cuota; decidido así (el calendario es el aviso principal). ROADMAP ítems 19 y 28.
- **Formación Docente — doble registro**: Paso 5 (reconciliar `Registro_externo` contra la lista
  de Aula Digital cuando CoEEE la tenga) y borrar las hojas de respaldo de los reordenamientos.
  ROADMAP ítem 19.
- **Retiro de v8.5 — Fase 3 (reducida) y Fase 4**: único pendiente real es el reporte mensual
  (formato Planeación) que sigue solo en v8.5; falta decidir el corte. El histórico no se migra y
  "OTDE Reportes" ya no tiene activadores. ROADMAP ítem 9.
- **Recrear páginas eliminadas** (las 4 de arriba): requieren contenido validado con la Dra.
  Galindo.
- **Formación Docente — más cursos**: el catálogo se alimenta a mano en la hoja `Cursos`.
- **Recordatorio operativo**: "NP SIGEE" en Correo se llena a mano por Marcos; sin eso se pierde
  la trazabilidad.
