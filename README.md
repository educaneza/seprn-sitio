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

### Completado el 13 jul 2026 — Retiro de Jornada Verano 2026
- Cerró el periodo de inscripciones a la Jornada de Capacitación Verano 2026: se eliminó el banner en `otde.html` y se borraron `jornada-verano-2026.html` e `instructivo-jornada-verano-2026.html` — ya nadie debe llegar a ese wizard
- El backend `apps-script/formacion-docente.gs` sigue vivo (también sirve a `formacion-docente.html`); solo se perdió la parte específica de esas 2 páginas

### Completado el 7 jul 2026 — Centro de Formación Docente: deploy + rediseño premium + cutover
- **Desplegado en producción**: Spreadsheet real `Formacion_Docente_2026_2027`, `apps-script/formacion-docente.gs` con URL real en `APPS_SCRIPT_URL`
- **Arquitectura relacional en Sheets** (no una hoja por curso): `Docentes` (upsert por RFC, nunca sobrescribe con vacío) + `Cursos` (catálogo administrado a mano: `Activo`, ventanas de fecha `Visible_desde`/`Visible_hasta`, `Registro_previo_requerido`, `Hora_inicio`) + `Inscripciones` (transaccional, con vista VLOOKUP en vivo)
- **Cutover de Jornada Verano 2026**: `jornada-verano-2026.html` reporta ahora a este mismo backend, no al suyo propio (`cursos-coeee-2026.gs` queda congelado como histórico). Sus 5 cursos se migraron a la hoja `Cursos`
- **Recordatorios automáticos por correo** (inicio de curso, medio de curso, horas antes de webinar), con cuidado de la cuota de `MailApp` compartida entre backends
- **Prueba social real**: conteo de inscritos por curso desde `Inscripciones`, nunca un número inventado
- **Rediseño visual premium**: tipografía Inter/Inter Tight, tarjetas con fondo pastel + ícono grande, panel lateral sticky (escritorio) / barra flotante (móvil) para el resumen de selección — ver `docs/DESIGN_SYSTEM.md`
- Smoke test completo + corrección de bugs reales (freeze de `fetch()` sin timeout en 4 archivos, `appendRow([])` inválido en Apps Script, fecha corrida -1 día por parseo UTC) — ver `docs/QA-NOTES.md`
- **Pendiente**: dar de alta los primeros cursos propios del ciclo 26-27 en la hoja `Cursos` (hoy solo están los 5 migrados de Verano)

### Completado el 1 jul 2026 — Instalador de Office + Soporte Técnico Remoto potenciado
- **Pestaña "Licencias Office"** en `otde.html`: instalador `descargas/Instalador_Office_2019_OTDE.exe` (validación por CCT, Office 2019 Professional Plus) con guía de instalación paso a paso basada en el `.bat` real
- **Formulario "Solicitar Soporte Técnico Remoto"**: autocompletado de CCT (`js/cct-db.js`, con fallback manual de Sector/Zona/Escuela y validación de error por campo), select de Función/Cargo con opción "Otro", campo de WhatsApp con link `wa.me` directo
- **Backend nuevo** `apps-script/soporte-remoto.gs`: registra en Sheets y notifica por **bot de Telegram** al equipo OTDE
- **Referencia cruzada** entre las pestañas Licencias Office ↔ Soporte Técnico Remoto

### Completado el 1 jul 2026 — Jornada de Capacitación Verano 2026
- `jornada-verano-2026.html`: wizard de 3 pasos, selección multi-curso, registro en Sheets (CoEEE + reporte OTDE NEZA)
- `instructivo-jornada-verano-2026.html`: guía imprimible para difundir junto al oficio de la convocatoria

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

### Pendientes (al 7 jul 2026)
- **Centro de Formación Docente**: dar de alta los primeros cursos propios del ciclo 26-27 en la hoja `Cursos` (hoy el catálogo solo tiene los 5 cursos migrados de Jornada Verano)
- **Recrear páginas eliminadas** — `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`, `servicio-profesional.html`: requieren contenido validado con la Dra. Galindo
- **Logomark SEPRN** — requiere archivo `logo.svg` (diseño gráfico pendiente)
- **Barra CTE** — actualizar texto del `.update-banner` en `index.html` cuando se publique la 9ª sesión
- Ver [`docs/ROADMAP.md`](docs/ROADMAP.md) para el histórico completo, [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) para los tokens del rediseño, y [`docs/QA-NOTES.md`](docs/QA-NOTES.md) para bugs reales ya corregidos

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
| Notificaciones | Bot de Telegram (API `sendMessage`) — solicitudes de Soporte Remoto |
| Scanner QR | html5-qrcode v2.3.8 vía CDN (solo `asistencia.html`) |

No hay framework, bundler, ni dependencias npm. El sitio es completamente estático. Los backends externos son 4 Google Apps Script (uno por Spreadsheet/flujo): `conferencia-ia.gs`, `cursos-coeee-2026.gs` (congelado desde jul 2026, ver abajo), `soporte-remoto.gs`, `formacion-docente.gs`. La cuota diaria de `MailApp`/`GmailApp` la comparten los 4, no es por proyecto.

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
├── otde.html                     # Área: OTDE — Correo, Mantenimiento, Soporte Remoto, Licencias Office, Chuka, Recursos
├── oeve.html                     # Área: OEVE (Extensión y Vinculación Educativa)
├── juridico.html                 # Área: Asuntos Jurídicos
│
├── styles.css                    # Hoja de estilos global (única)
├── script.js                     # JS global: hamburger menu + IntersectionObserver
│
├── charla-ia.html                # Página del evento IA jun 2026 (informativa, sin formulario)
├── asistencia.html                # Check-in con QR/PIN para operador en puerta (evento IA)
├── formacion-docente.html        # Centro de Formación Docente — catálogo dinámico + registro, diseño premium propio
├── instructivo-formacion-docente.html  # Guía imprimible del Centro de Formación Docente
├── 404.html                      # Página de error personalizada
│
├── js/
│   └── cct-db.js                 # Base de datos CCT (506 registros, incluye municipio), usada por otde.html y formacion-docente.html
│
├── apps-script/
│   ├── conferencia-ia.gs         # Backend Conferencia IA 2026 (Sheets + correo QR)
│   ├── cursos-coeee-2026.gs      # Backend Jornada Verano 2026 — CONGELADO desde jul 2026 (cutover a formacion-docente.gs), queda como histórico
│   ├── soporte-remoto.gs         # Backend Soporte Técnico Remoto (Sheets + notificación Telegram)
│   └── formacion-docente.gs      # Backend Centro de Formación Docente + Jornada Verano (Docentes/Cursos/Inscripciones, folios OTDE-CAP-NNNN, recordatorios automáticos)
│
├── descargas/                    # Instaladores/ejecutables descargables
│   ├── Instalador_Office_2019_OTDE.exe
│   └── Instalador_Office_OTDE.bat
│
├── docs/
│   ├── ARCHITECTURE.md           # Arquitectura, componentes, convenciones
│   ├── ROADMAP.md                # Plan de mejoras: Fase 1 / 2 / 3
│   ├── DESIGN_SYSTEM.md          # Tokens/patrones del rediseño premium de Formación Docente
│   ├── QA-NOTES.md               # Bugs reales ya cazados, con causa raíz — consultar antes de fetch()/appendRow() nuevos
│   ├── manual-sistema-registro.html    # Manual de uso interno del sistema de registro (Conferencia IA)
│   └── manual-formacion-docente.html   # Manual de uso interno del Centro de Formación Docente
│
├── kit-digital/                  # Recursos digitales OTDE (banco de materiales)
│
├── pdfs/                         # Archivos descargables
│   ├── chuka-guia-docentes.pdf
│   ├── chuka-guia-familias.pdf
│   ├── Manual-Autenticacion-2FA.pdf
│   ├── MODELOS_DE_USO_DEL_AULA_DE_MEDIOS.pdf
│   └── cte/
│       ├── quinta-sesion/ · sexta-sesion/ · septima-sesion/ · octava-sesion/
│
└── images/                       # Imágenes estáticas
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
| Instalador de Office | `descargas/` + `otde.html` (pestaña Licencias Office) | Reemplazar `.exe`/`.bat`, actualizar guía si cambia el flujo |
| Notificaciones de Soporte Remoto | `apps-script/soporte-remoto.gs` | Propiedades del script `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` (ver instrucciones al final del archivo) |
| Cursos del Centro de Formación Docente | Hoja `Cursos` del Spreadsheet `Formacion_Docente_2026_2027` | Agregar fila con Categoria/Nombre/Responsable/Modalidad/fechas/Liga y `Activo=TRUE`; usar el menú "OTDE Formación → Generar ID de cursos faltantes" para autocompletar `ID_Curso`. Opcional: `Registro_previo_requerido=TRUE` si tiene cupo real externo, `Visible_desde`/`Visible_hasta` para programar aparición/desaparición, `Hora_inicio` si se quiere el recordatorio de "faltan unas horas" (ver `docs/DESIGN_SYSTEM.md`) |
