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
| Midnight | `#0C1A2E` | Hero oscuro (nuevo) |
| Off-white | `#F9F8F5` | Fondos cálidos (nuevo) |

## Sistema de diseño (implementado 16 jun 2026)
Clases reutilizables en `styles.css`:
- `.section-header` + `.section-eyebrow` + `.section-title` — encabezado de sección con eyebrow y líneas
- `.metrics-strip` / `.metrics-inner` / `.metric-item` / `.metric-number` / `.metric-label` — tira de cifras clave con contador animado
- `.btn-primary-dark` / `.btn-secondary-dark` — botones para fondos oscuros (hero)
- `.hero-badge` — pill de contexto institucional
- `.area-card.visible` — fade-up via IntersectionObserver

## Páginas del sitio
| Archivo | Sección |
|---|---|
| `index.html` | Portada — hero, métricas, áreas, mapa SVG |
| `nosotros.html` | Misión, visión, valores, equipo directivo |
| `areas.html` | Listado de áreas |
| `cte.html` | Sesiones CTE (acordeones + videos YouTube) |
| `contacto.html` | Datos de contacto |
| `academica.html` | Subjefatura Académica |
| `personal.html` | Subjefatura de Personal |
| `planeacion.html` | Subjefatura de Planeación |
| `recursos.html` | Subjefatura de Recursos |
| `otde.html` | Oficina de Tecnología (OTDE) |
| `oeve.html` | Oficina de Extensión y Vinculación |
| `juridico.html` | Oficina Jurídica |
| `asistencia.html` | Check-in de asistencia (eventos) |
| `charla-ia.html` | Página del evento IA jun 2026 (sin formulario) |
| `404.html` | Página de error personalizada |

## Páginas eliminadas (recrear cuando haya contenido)
- `gestion-escolar.html`
- `investigacion-educativa.html`
- `programas-educativos.html`
- `servicio-profesional.html`

## Backend (Apps Script)
- Archivo: `apps-script/conferencia-ia.gs`
- Conectado a Google Sheets (`Registros_IA_2026`)
- Funciones clave: `doPost` (registro), `doGet` (cupo/checkin), `reenviarConfirmacionListaEspera` (post-evento)
- Para cambios: copiar el `.gs` completo en el editor de Apps Script y re-desplegar

## Reglas de desarrollo
1. No introducir npm, frameworks ni build steps — stack estático puro
2. Cambios globales de UI → `styles.css`; cambios específicos de página → `<style>` inline en el HTML
3. Para modificar estilos del header/footer: son inline en cada página, no hay componente compartido
4. Imágenes en `images/`, PDFs en `pdfs/`
5. Después de push: esperar 5-10 min o Cmd+Shift+R para invalidar caché de GitHub Pages

## Pendientes al 16 jun 2026
- Aplicar sistema de diseño (section headers, motion) a páginas de área internas
- Accesibilidad: roles ARIA, contraste hero oscuro, skip-to-content (score actual 7/10)
- Recrear páginas eliminadas cuando haya contenido validado
