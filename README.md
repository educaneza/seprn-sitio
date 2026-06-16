# SEPRN — Sitio Web Oficial

Sitio web institucional de la **Subdirección de Educación Primaria en la Región de Nezahualcóyotl** (SEPRN), dependiente de SEIEM / SEEMx.

Cubre 18 municipios del oriente del Estado de México organizados en 13 sectores educativos, atendiendo 523 escuelas y más de 121,000 alumnas y alumnos.

**URL de producción:** `https://educaneza.github.io/seprn-sitio/`

---

## Estado del proyecto

Ver roadmap completo en [`docs/ROADMAP.md`](docs/ROADMAP.md).

| Dimensión | Score (may 2026) | Score actual (16 jun 2026) | Objetivo |
|---|:---:|:---:|:---:|
| UI | 5/10 | **8.5/10** | 8/10 ✅ |
| UX | 5/10 | **8/10** | 8/10 ✅ |
| Branding | 3/10 | **7.5/10** | 7/10 ✅ |
| Diseño móvil | 4/10 | **7.5/10** | 8/10 |
| Performance percibida | 6/10 | **8/10** | 8/10 ✅ |
| Accesibilidad | 3/10 | **7/10** | 8/10 |

### Completado el 16 jun 2026 — Rediseño visual élite
- **Hero oscuro** — fondo midnight `#0C1A2E` full-bleed, badge pill institucional, tipografía display 64px, botones dark-variant, glow decorativo, scroll indicator animado, entrada escalonada
- **Strip de métricas** — nueva sección con 4 cifras clave animadas con contador easeOutCubic al hacer scroll
- **System de diseño** — clases reutilizables: `.section-header`, `.section-eyebrow`, `.metrics-strip`, `.btn-primary-dark`, `.btn-secondary-dark`
- **Cierre evento Charla IA** — banner y formulario de registro retirados; función `reenviarConfirmacionListaEspera()` agregada al Apps Script para post-evento

### Completado en junio 2026 — Fase 1 Quick Wins
- Google Fonts: `@import` bloqueante → `<link rel="preconnect">`
- Contraste hero: `#977e5b` → `#6b5a44` (pasa WCAG AA)
- `class="active"` + `aria-current="page"` en el nav de todas las páginas
- `favicon.svg` creado y agregado a todas las páginas
- Cobertura mobile: grid responsivo
- Acordeón CTE: `<div onclick>` → `<button>` con `aria-expanded`
- Toggle ▼/▶ → SVG chevron animado

### Completado en junio 2026 — Sistema de Registro de Eventos
- Formulario de registro con autocompletado CCT (506 registros), validación y verificación de cupos
- Apps Script: registro en Sheets, folios, cupos por sector (7), correo HTML con QR, check-in por PIN
- Página de check-in (`asistencia.html`) con escáner QR por cámara
- Manual interno (`docs/manual-sistema-registro.html`)

### Próxima sesión
- Aplicar sistema de diseño a páginas de área internas
- Accesibilidad (score 7/10 → 8/10)
- Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para el plan detallado

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Markup | HTML5 semántico |
| Estilos | CSS3 (archivo único `styles.css` + `<style>` inline por página especial) |
| Scripts | Vanilla JavaScript (`script.js` global + inline por página) |
| Tipografía | Google Fonts — Montserrat (300–700) |
| Analítica | Google Analytics 4 (`G-7D68DB8ELW`) |
| Mapas | Google Maps Embed API |
| Video | YouTube Embed (lazy load en acordeones colapsados) |
| Hosting | GitHub Pages (rama `main`) |
| Backend eventos | Google Apps Script (Web App) + Google Sheets |
| Correo | GmailApp (Apps Script) + api.qrserver.com para QR |
| Scanner QR | html5-qrcode v2.3.8 vía CDN (solo `asistencia.html`) |

No hay framework, bundler, ni dependencias npm. El sitio es completamente estático. El único backend externo es el Apps Script vinculado al Spreadsheet del evento.

---

## Estructura de archivos

```
seprn-sitio/
│
├── index.html                    # Inicio — hero + mapa de cobertura
├── nosotros.html                 # Misión, visión, valores, equipo directivo
├── areas.html                    # Hub de las 7 áreas (tarjetas con links)
├── contacto.html                 # Dirección, horarios, mapa, redes sociales
├── cte.html                      # CTE — acordeones por sesión (videos + materiales)
│
├── planeacion.html               # Área: Planeación Educativa
├── personal.html                 # Área: Administración de Personal
├── academica.html                # Área: Académica
├── recursos.html                 # Área: Recursos Materiales y Financieros
├── otde.html                     # Área: OTDE (Tecnología para el Desarrollo Educativo)
├── oeve.html                     # Área: OEVE (Extensión y Vinculación Educativa)
├── juridico.html                 # Área: Asuntos Jurídicos
│
├── styles.css                    # Hoja de estilos global (única)
├── script.js                     # JS global: hamburger menu
│
├── conferencia-ia.html           # Formulario de registro — Conferencia IA 2026
├── asistencia.html               # Check-in con QR para operador en puerta
│
├── js/
│   └── cct-db.js                 # Base de datos CCT (506 registros) + buscarCCT() / sugerirCCT()
│
├── apps-script/
│   └── conferencia-ia.gs         # Apps Script Web App (copiar en Google Apps Script)
│
├── docs/
│   ├── ARCHITECTURE.md           # Arquitectura, componentes, convenciones
│   ├── ROADMAP.md                # Plan de mejoras: Fase 1 / 2 / 3
│   └── manual-sistema-registro.html  # Manual de uso interno del sistema de registro
│
├── kit-digital/                  # Recursos digitales OTDE
│   ├── Organizadores_Gráficos_Editable.docx
│   └── Tabla_SAMR_Niveles_Integración.pdf
│
├── pdfs/                         # Archivos descargables
│   ├── chuka-guia-docentes.pdf
│   ├── chuka-guia-familias.pdf
│   ├── Manual-Autenticacion-2FA.pdf
│   ├── MODELOS_DE_USO_DEL_AULA_DE_MEDIOS.pdf
│   └── cte/
│       ├── quinta-sesion/        # Materiales 5ª sesión (DOCX, PPTX, ZIP)
│       ├── sexta-sesion/         # Materiales 6ª sesión (DOCX, PPTX, PDF, ZIP)
│       └── septima-sesion/       # Materiales 7ª sesión (PPTX, PDF, ZIP)
│
└── images/                       # Imágenes estáticas
    ├── convocatoria-ia-2026.jpg  # Flyer de la Conferencia IA 2026
    ├── CHUKA_INFOGRAFIA.png
    ├── Firma_institucional_OTDE.png
    ├── Pleca 4x.png
    ├── qr-guiones-docentes.png
    └── qr-guiones-paae.png
```

---

## Entorno local

No se requiere instalación. Para ver el sitio en local:

**Opción A — Extensión VS Code (recomendada)**
1. Instala la extensión **Live Server** en VS Code.
2. Abre la carpeta del proyecto.
3. Clic derecho en `index.html` → **Open with Live Server**.

**Opción B — Servidor HTTP con Python**
```bash
cd seprn-sitio
python3 -m http.server 8000
# Abre http://localhost:8000
```

**Opción C — Doble clic** en `index.html` (funciona para la mayoría de páginas, pero los paths relativos pueden fallar en algunos navegadores).

---

## Despliegue en GitHub Pages

El sitio se publica automáticamente desde la rama `main`.

```
URL pública: https://educaneza.github.io/seprn-sitio/
```

Para actualizar:
1. Realiza los cambios en local.
2. Haz commit y push a `main`.
3. GitHub Pages re-publica en ~1 minuto.

---

## Convenciones de desarrollo

- **Un archivo CSS global** (`styles.css`). Los estilos específicos de página van en un bloque `<style>` dentro del `<head>` de esa página.
- **`script.js`** para JS que aplica a todas las páginas. El JS específico de una página va inline al final del `<body>`.
- **Paleta de colores y componentes**: ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- **Navegación**: el header `<nav>` es idéntico en todas las páginas (incluye `<button class="nav-toggle">`). Al copiar una página nueva, actualizar `<title>`, meta description, y marcar el ítem activo con `class="active"`.
- **Nueva sesión CTE**: ver instrucciones en `ARCHITECTURE.md §6`.

---

## Paleta institucional (referencia rápida)

| Token | Hex | Uso |
|---|---|---|
| Guinda oscuro | `#56212f` | Textos principales, logo, footer bg |
| Guinda medio | `#9F2241` | Acentos, hovers, CTA |
| Arena cálida | `#d6d1ca` | Fondos de tarjetas, separadores |
| Caramelo | `#977e5b` | Subtítulos secundarios (⚠ no pasa WCAG AA solo) |
| Caramelo AA | `#6b5a44` | Versión AA-compliant de caramelo |
| Dorado suave | `#c3b08f` | Footer copy, detalles |
| Fondo neutro | `#f9f8f6` | Secciones de fondo alterno |
| Texto principal | `#333333` | Cuerpo de texto |

---

## Mantenimiento de contenido

| Contenido | Archivo | Qué editar |
|---|---|---|
| Equipo directivo | `nosotros.html` | Bloque "Equipo de Trabajo" |
| Tarjetas de áreas | `areas.html` | `.area-card` → `area-responsable` |
| Nueva sesión CTE | `cte.html` | Nuevo bloque `sesion-accordion` al inicio |
| Materiales CTE | `pdfs/cte/<sesion>/` | Subir archivo + agregar `<a>` en `cte.html` |
| Datos de contacto | `contacto.html` + footer de todas las páginas | Dirección, horario |
