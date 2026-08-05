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

**Lo más reciente** (5 ago 2026): webforms nuevos de Correo (Alta), Mantenimiento y Asesorías —
ver el checkpoint completo en [`docs/BITACORA.md`](docs/BITACORA.md).

Para el historial completo de qué se hizo y cuándo, ver [`docs/BITACORA.md`](docs/BITACORA.md).
Para lo genuinamente pendiente, ver [`docs/ROADMAP.md`](docs/ROADMAP.md). Para tokens del
rediseño, [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md); para bugs reales ya corregidos,
[`docs/QA-NOTES.md`](docs/QA-NOTES.md).

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

No hay framework, bundler, ni dependencias npm. El sitio es completamente estático. Los backends externos son 6 Google Apps Script (uno por Spreadsheet/flujo): `conferencia-ia.gs`, `cursos-coeee-2026.gs` (congelado desde jul 2026, ver abajo), `soporte-remoto.gs`, `formacion-docente.gs`, `mantenimiento.gs` y `asesorias.gs` (ago 2026). La cuota diaria de `MailApp`/`GmailApp` la comparten los 6, no es por proyecto. Aparte, el webform nuevo de Correo Institucional (Alta/Cambio/Reset/Incidencias) vive en un proyecto de Apps Script separado, `Correos-institucionales/webform-2026-2027/` — no en este repo — en paralelo al Google Form que sigue en producción; ver `docs/ARCHITECTURE.md §16`.

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
├── otde.html                     # Área: OTDE — Correo, Mantenimiento, Asesorías, Soporte Remoto, Licencias Office, Chuka, Recursos
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
│   ├── formacion-docente.gs      # Backend Centro de Formación Docente + Jornada Verano (Docentes/Cursos/Inscripciones, folios OTDE-CAP-NNNN, recordatorios automáticos)
│   ├── mantenimiento.gs          # Backend Mantenimiento (ago 2026) — webform complementa el oficio, no lo sustituye
│   └── asesorias.gs              # Backend Asesorías (ago 2026) — mismo patrón que mantenimiento.gs
│
├── descargas/                    # Instaladores/ejecutables descargables
│   ├── Instalador_Office_2019_OTDE.exe
│   └── Instalador_Office_OTDE.bat
│
├── docs/
│   ├── ARCHITECTURE.md           # Arquitectura, componentes, convenciones
│   ├── BITACORA.md               # Bitácora cronológica: qué se hizo y cuándo (checkpoints por sesión)
│   ├── ROADMAP.md                # Solo lo pendiente/futuro — el historial vive en BITACORA.md
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
