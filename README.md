# SEPRN — Sitio Web Oficial

Sitio web institucional de la **Subdirección de Educación Primaria en la Región de Nezahualcóyotl** (SEPRN), dependiente de SEIEM / SEEMx.

Cubre 18 municipios del oriente del Estado de México organizados en 13 sectores educativos, atendiendo 523 escuelas y más de 121,000 alumnas y alumnos.

**URL de producción:** `https://educaneza.github.io/seprn-sitio/`

---

## Estado del proyecto

Auditoría realizada en mayo 2026. El roadmap completo de mejoras está en [`docs/ROADMAP.md`](docs/ROADMAP.md).

| Dimensión | Score actual | Score objetivo |
|---|:---:|:---:|
| UI | 5/10 | 8/10 |
| UX | 5/10 | 8/10 |
| Branding | 3/10 | 7/10 |
| Profesionalismo | 5/10 | 9/10 |
| Diseño móvil | 4/10 | 8/10 |
| Performance percibida | 6/10 | 8/10 |

### Completado en junio 2026 — Fase 1 Quick Wins (sitio principal)
- Google Fonts: `@import` bloqueante → `<link rel="preconnect">` en 16 páginas (performance mobile ~300–600ms)
- Contraste hero: `#977e5b` → `#6b5a44` (ratio 3.5:1 → 4.8:1, pasa WCAG AA)
- Touch targets mobile nav: `padding: 12px 4px` → `14px 12px`
- `class="active"` + `aria-current="page"` en el nav de las 16 páginas
- `favicon.svg` creado (cuadrado guinda, letras SP) + agregado a las 18 páginas
- Sección Cobertura mobile: grid 2→1 columna en ≤768px; lista de municipios 2→1 en ≤480px
- Accordeón CTE: `<div onclick>` → `<button type="button">` con `aria-expanded` sincronizado
- Toggle ▼/▶ → SVG chevron animado por CSS en los 9 acordeones activos

### Completado en junio 2026 — Sistema de Registro de Eventos
- **`conferencia-ia.html`** — formulario de registro para la Conferencia IA 2026 con autocompletado CCT, validación RFC/teléfono/nombre completo (3 palabras mín.), verificación de cupos en tiempo real y pantalla de confirmación con folio
- **`js/cct-db.js`** — base de datos CCT con 506 registros reales (417 escuelas, 75 supervisiones, 13 jefaturas, subdirección) generada desde `OTDE_Base_Contactos_v2.xlsx`
- **`apps-script/conferencia-ia.gs`** — Web App (Google Apps Script): registro en Sheets, generación de folios `CONF-{SECTOR}-{nn}`, control de cupos por sector (7 por sector), correo HTML con QR, endpoint de check-in protegido por PIN
- **`asistencia.html`** — página de check-in para operador en puerta: PIN local (sin red), escáner de cámara QR vía `html5-qrcode`, lector físico compatible, tarjetas de resultado codificadas por color, contador de asistencias
- **`docs/manual-sistema-registro.html`** — manual de uso interno en lenguaje llano (7 secciones + glosario)
- Banner temporal en `index.html` → `conferencia-ia.html`
- Correo de confirmación: nombre del remitente personalizado "SEPRN · OTDE", QR del folio embebido

### Completado en mayo 2026
- Todos los bugs críticos resueltos (GA4 fuera de `<head>`, typo `referrerpolicy`, nav faltante en contacto)
- Hamburger menu para móvil (`script.js` + `.nav-toggle` CSS)
- `rel="noopener noreferrer"` en todos los `target="_blank"`
- `text-align: justify` eliminado
- Color de texto corregido (`#000` → `#333`)
- Meta descriptions en páginas clave
- Lazy loading de iframes en acordeones CTE colapsados
- Emojis de headings reemplazados por SVG inline (CTE, Areas)
- Séptima Sesión Ordinaria 2025-2026 agregada a CTE

### Próxima sesión — Fase 2 (Elevación visual)
Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para el plan detallado.

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
├── academica.html                # Área: Académica (hub con 4 sub-páginas)
├── programas-educativos.html     # Sub-área de Académica
├── gestion-escolar.html          # Sub-área de Académica
├── investigacion-educativa.html  # Sub-área de Académica
├── servicio-profesional.html     # Sub-área de Académica
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
