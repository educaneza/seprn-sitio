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

## CTE — Sesiones publicadas (al 24 jun 2026)
| Sesión | Opening YT | Grabación | Materiales | ZIP |
|---|---|---|---|---|
| Octava Ordinaria | `BRneovXdqL8` | — | PPTX + PDF orientaciones | ✅ |
| Séptima Ordinaria | `oUA9r4zKdgo` | — | PPTX + 7 materiales | ✅ |
| Sexta Ordinaria | `k3JZp4rLafA` | `yyAF0y0QPqA` | 8 materiales | ✅ |
| Quinta Ordinaria | `J2PULvX4XwM` | `m0AFF56RSDw` | 5 materiales | ✅ |
| Cuarta Ordinaria | — | `lEZvJhxcHSE` | — | — |
| Taller Intensivo | — | `NPq6wjpFJsY` | — | — |
| Tercera Ordinaria | — | `L7G7fwDi25A` | — | — |
| Segunda Ordinaria | `ysX2Lj3xx3s` | `E_8IdfhULeE` | — | — |
| Primera Ordinaria | — | `1vFCnnWKkzg` | — | — |
| Fase Intensiva | `djBBRNrFetE` | — | — | — |

La sesión más reciente siempre debe ser el acordeón activo/abierto al cargar la página, con badge NUEVO. Las sesiones anteriores se colapsan y sus iframes usan `data-src` (lazy loading).

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
| `jornada-verano-2026.html` | Wizard 3 pasos: registro de inscripción a Jornada Capacitación Verano 2026 (CoEEE + OTDE NEZA) |
| `404.html` | Página de error personalizada |

## Páginas eliminadas (recrear cuando haya contenido validado)
- `gestion-escolar.html`
- `investigacion-educativa.html`
- `programas-educativos.html`
- `servicio-profesional.html`

## Backend (Apps Script)

### `apps-script/conferencia-ia.gs`
- Conectado a Google Sheets (`Registros_IA_2026`)
- Funciones clave: `doPost` (registro), `doGet` (cupo/checkin), `reenviarConfirmacionListaEspera` (post-evento)
- Para cambios: copiar el `.gs` completo en el editor de Apps Script y re-desplegar

### `apps-script/cursos-coeee-2026.gs`
- Conectado a Google Sheets (hoja `Cursos_OTDE_Verano_2026`)
- Folio: `OTDE-V26-NNNN` (secuencial, autoincremental)
- Columnas A-K: Fecha | Folio | Nombre | RFC | Función | CCT | Sector | Zona | Escuela/Unidad | Curso | Correo
- Funciones: `doPost` (un registro por llamada), `generarEstadisticas` (ejecución manual → hoja resumen)
- Usado por `jornada-verano-2026.html`; responde `Content-Type: text/plain` para evitar preflight CORS
- Para cambios: copiar el `.gs` completo en Apps Script y re-desplegar como aplicación web (Cualquier usuario)

## Reglas de desarrollo
1. No introducir npm, frameworks ni build steps — stack estático puro
2. Cambios globales de UI → `styles.css`; cambios específicos de página → `<style>` inline en el HTML
3. Para modificar estilos del header/footer: son inline en cada página, no hay componente compartido
4. Imágenes en `images/`, PDFs en `pdfs/cte/<nombre-sesion>/`
5. Después de push: esperar 5-10 min o Cmd+Shift+R para invalidar caché de GitHub Pages
6. Los PDFs de sesiones CTE se nombran con mayúsculas y acentos; URL-encodear la ó como `%C3%B3` en los hrefs
7. **Sin emojis** en HTML — usar SVG inline para íconos de contacto (persona, correo, teléfono). Ver `contacto-icon` en cualquier página de área como referencia
8. El portal SEP CTE usa la URL `https://gestion.cte.sep.gob.mx/insumos/` (sin `#!/` — ese sufijo era routing antiguo de AngularJS)

## `jornada-verano-2026.html` — Arquitectura y decisiones clave (jul 2026)
Página autónoma (no importa `styles.css` — estilos inline completos). Vinculada desde `otde.html` mediante un banner destacado.

- **Flujo**: wizard 3 pasos — (1) selección multi-curso con tarjetas visuales, (2) redirección al portal CoEEE, (3) formulario de reporte OTDE NEZA
- **Multi-curso**: `cursosSeleccionados[]` acumula selecciones; al enviar, se hace un `await fetch()` **secuencial** por cada curso (no `Promise.all`) para evitar race condition en `generarFolio()` de Apps Script
- **CCT**: autocomplete desde `js/cct-db.js` (506 registros). Si CCT no está en la base, muestra campos manuales de Sector/Zona/Escuela
- **RFC** (no CURP): regex `/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i`
- **Sin confirmación por correo** — CoEEE ya la envía; OTDE solo guarda el reporte
- **Función "Otro"**: al seleccionarla aparece un `<input>` libre; su valor (no "Otro") es lo que se envía al Sheet
- **Marca**: OTDE NEZA en todo el flujo; CoEEE acreditada en el subtítulo del hero
- **URL CoEEE**: `https://auladigital.dee.edu.mx`

## Pendientes (al 1 jul 2026)
- **Recrear páginas eliminadas** — `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`, `servicio-profesional.html`: requieren contenido validado con la Dra. Galindo
- **Logomark SEPRN** — requiere archivo `logo.svg` (diseño gráfico pendiente)
- **Barra CTE** — actualizar texto del `.update-banner` en `index.html` cuando se publique la 9ª sesión
