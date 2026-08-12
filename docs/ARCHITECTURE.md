# Arquitectura y Convenciones — SEPRN Sitio Web

Describe el modelo mental del proyecto: cómo está construido, cómo fluye la información y qué reglas seguir para mantener la consistencia visual y técnica.

Ver [`ROADMAP.md`](ROADMAP.md) para el plan de mejoras hacia la versión premium.

---

## 1. Arquitectura general

El sitio es **100% estático**: HTML + CSS + JS. No hay servidor, base de datos, ni proceso de build.

```
Browser
  └── Carga HTML (cualquiera de los 17 archivos)
        ├── Descarga styles.css (único, cacheado)
        ├── Descarga Montserrat desde Google Fonts (via <link rel="preconnect"> en cada página)
        ├── Ejecuta GA4 tag (en <head>)
        └── Ejecuta script.js (defer, al final del body)
              ├── Hamburger menu (nav-toggle)
              └── IntersectionObserver → .area-card.visible + .fade-item.visible
        └── Ejecuta JS inline del body (por página)
              ├── toggleSesion() + lazy load iframes (cte.html)
              ├── IntersectionObserver animaciones (nosotros.html)
              └── Tooltip del mapa SVG (index.html)
```

No hay estado global, ni localStorage, ni cookies propias. La única "persistencia" es la analítica de GA4.

---

## 2. Estructura de plantilla por página

Cada página sigue este esqueleto HTML:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- GA4 tag — debe ir DENTRO de <head>, como primera línea -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-7D68DB8ELW"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-7D68DB8ELW');
    </script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[Descripción única ~150 chars]">
    <title>[Nombre Sección] - SEPRN</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">
    <link rel="icon" href="favicon.svg" type="image/svg+xml">
    <link rel="stylesheet" href="styles.css">
    <!-- Estilos locales SOLO si son exclusivos de esta página -->
    <style> ... </style>
</head>
<body>
    <a href="#main-content" class="skip-link">Saltar al contenido principal</a>
    <!-- 1. Header/Nav (idéntico en todas las páginas) -->
    <header>
        <nav>
            <div class="logo">SEPRN</div>
            <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
                <span></span><span></span><span></span>
            </button>
            <ul>
                <li><a href="index.html">Inicio</a></li>
                <li><a href="nosotros.html">Nosotros</a></li>
                <li><a href="areas.html">Áreas</a></li>
                <li><a href="cte.html">CTE</a></li>
                <li><a href="contacto.html">Contacto</a></li>
            </ul>
        </nav>
    </header>

    <!-- 2. Contenido principal -->
    <section class="content-section" id="main-content" role="main"> ... </section>

    <!-- 3. Footer (idéntico en todas las páginas) -->
    <footer> ... </footer>

    <!-- 4. script.js (siempre al final del body) -->
    <script src="script.js" defer></script>

    <!-- 5. Scripts inline de página (si aplica, después de script.js) -->
    <script> ... </script>
</body>
</html>
```

**Reglas críticas:**
- GA4 siempre dentro de `<head>`, como primera línea.
- `script.js` siempre al final del `<body>`, antes de cualquier JS inline de página.
- Los 5 ítems de nav en este orden en TODAS las páginas.
- Al página actual: `class="active"` + `aria-current="page"` en el `<a>` correspondiente.

---

## 3. Sistema de estilos

### Archivo global: `styles.css`

Toca este archivo solo cuando el cambio aplica a **todas** las páginas.

| Bloque CSS | Qué define |
|---|---|
| `<link rel="preconnect">` Google Fonts | Montserrat 300–700 (en `<head>` de cada página) |
| `*` reset | `box-sizing`, `margin`, `padding` |
| `body` | Fuente base, `color: #333333`, line-height |
| `header` / `nav` | Barra de navegación sticky |
| `.logo` | Logotipo texto SEPRN |
| `nav a`, `nav a:hover`, `nav a.active` | Links del menú y sus estados |
| `.nav-toggle` | Botón hamburguesa mobile (3 spans → X) |
| `:focus-visible` | Outline de accesibilidad 2px guinda |
| `.hero` | Sección hero de la portada |
| `.area-card` | Tarjetas de áreas en portada |
| `.section-header` / `.section-eyebrow` / `.section-title` | Encabezados de sección con eyebrow y líneas |
| `.metrics-strip` / `.metric-item` / `.metric-number` / `.metric-label` | Strip de métricas animadas (`index.html`) |
| `.btn-primary-dark` / `.btn-secondary-dark` | Botones para fondos oscuros (hero) |
| `.hero-badge` | Pill de contexto institucional |
| `.fade-item` / `.fade-item.visible` | Fade-up genérico para tarjetas internas (IntersectionObserver) |
| `.skip-link` | Saltar al contenido principal (accesibilidad) |
| `.section-header-light` | Modificador de `.section-header` para fondos oscuros |
| `.ns-bloque` / `.ns-*` | Bandas de color alternantes en `nosotros.html` |
| `.ns-inner` / `.ns-inner.visible` | Fade-up de contenido en bandas nosotros |
| `.leadership` | Sección de equipo directivo (portada) |
| `footer` / `.footer-grid` / `.footer-col` / `.footer-bottom` | Pie de página multi-columna |
| `.content-section` | Contenedor de páginas internas |
| `.video-grid` / `.video-card` | Grid de videos |
| `@media (max-width: 768px)` | Breakpoint mobile principal |
| `@media (max-width: 480px)` | Breakpoint mobile pequeño |

### Estilos locales (en `<style>` dentro del `<head>` de cada página)

Úsalos **solo** para componentes que no existen en ninguna otra página:
- `.sesion-accordion` — exclusivo de `cte.html`
- `.ns-texto-lead` — única clase local de `nosotros.html` (las bandas `.ns-bloque` y estilos de valores/equipo están en `styles.css`)
- `.area-hero`, `.funciones-lista`, `.oficinas-grid` — exclusivo de páginas de área

**Nunca** redefinir clases que ya existen en `styles.css` (como `.area-card`) en estilos locales.

**Íconos de contacto:** usar SVG inline en `<span class="contacto-icon">`, no emojis. Ver patrón en cualquier página de área (persona, correo, teléfono).

> **Alerta — bug conocido:** No definir una CSS custom property con `var()` de sí misma (ej. `--midnight: var(--midnight)`). El browser descarta el valor y toda regla que use `var(--midnight)` queda inválida silenciosamente.

---

## 4. Sistema de diseño (Design Tokens)

### Paleta de colores

```css
/* Variables implementadas en styles.css */
:root {
    --guinda:          #56212f;   /* Identidad, títulos, footer bg */
    --guinda-acento:   #9F2241;   /* Énfasis, números, links activos */
    --arena:           #d6d1ca;   /* Fondos de tarjetas, separadores */
    --caramelo:        #c3b08f;
    --caramelo-hover:  #bc955b;
    --caramelo-oscuro: #6b5a44;   /* AA-compliant sobre blanco */
    --caramelo-claro:  #ddc8a4;
    --midnight:        #0C1A2E;   /* Hero oscuro, fondo de ancla */
    --off-white:       #F9F8F5;   /* Fondos cálidos, strip de métricas */
    --texto:           #333333;
    --texto-muted:     #555555;
}
```

### Tipografía

| Elemento | Tamaño desktop | Tamaño mobile | Peso | Tracking |
|---|---|---|---|---|
| Hero H1 | 64px | 40px | 700 | -2.5px |
| Sección H1 | 48px | 32px | 600 | -1px |
| H2 | 32–38px | — | 600–700 | -0.8px |
| H3 | 24px | — | 600 | — |
| Cuerpo | 16px | 16px | 400 | — |
| Hero párrafo | 19px | 16px | 400 | — |
| Label / eyebrow | 11px | — | 700 | +1.8px uppercase |
| Micro / copyright | 12px | — | 400 | — |

Reglas: letter-spacing negativo en headings. `line-height: 1.8` en cuerpos largos. **Sin `text-align: justify`**.

### Espaciado (múltiplos de 8px)

| Token propuesto | Valor | Uso típico |
|---|---|---|
| `--space-xs` | 8px | Gaps internos, padding micro |
| `--space-sm` | 16px | Padding de chips, separadores |
| `--space-md` | 24px | Gap entre elementos de un componente |
| `--space-lg` | 40px | Padding de secciones internas |
| `--space-xl` | 60px | Separación entre secciones |
| `--space-2xl` | 80px | Padding de páginas |
| `--space-3xl` | 100px | Márgenes de hero |

### Bordes y radios

| Elemento | Radio |
|---|---|
| Cards principales | `18px` |
| Cards secundarias | `12px` |
| Badges / chips | `20px` (pill) |
| Botones | `8–10px` |
| Inputs / campos | `8px` |

---

## 5. Componentes del sistema de diseño (actualizado 24 jun 2026)

Clases reutilizables en `styles.css`. Usar estas en lugar de estilos inline cuando sea posible.

### Hero oscuro — variante completa (`index.html`)

```html
<section class="hero">
    <div class="hero-inner">
        <div class="hero-badge">Etiqueta institucional</div>
        <h1>Título principal</h1>
        <p>Subtítulo</p>
        <div class="hero-actions">
            <a href="#" class="btn-primary-dark">CTA primario</a>
            <a href="#" class="btn-secondary-dark">CTA secundario</a>
        </div>
        <div class="hero-scroll" aria-hidden="true"></div>
    </div>
    <div class="hero-glow" aria-hidden="true"></div>
</section>
```

- Fondo: `#0C1A2E` (midnight), full-bleed
- Entrada: animaciones `hero-enter` escalonadas (stagger 150ms por elemento)
- Scroll indicator: dot pulsante animado en loop

### Métricas strip

```html
<div class="metrics-strip">
    <div class="metrics-inner">
        <div class="metric-item">
            <span class="metric-number" data-target="417">0</span>
            <span class="metric-label">Escuelas<br>oficiales</span>
        </div>
        <!-- repetir por cada métrica -->
    </div>
</div>
```

- Requiere el JS de `index.html` (IntersectionObserver + `animateCounter`)
- 4 columnas en desktop, 2×2 en mobile
- Separadores verticales automáticos con `::before`

### Section header

```html
<div class="section-header">
    <div class="section-eyebrow">Categoría · Subcategoría</div>
    <h2 class="section-title">Título de la sección</h2>
</div>
```

- Eyebrow: texto uppercase con líneas laterales (pseudo-elementos `::before` y `::after`)
- Centrado por defecto

### Botones

| Clase | Fondo | Uso |
|---|---|---|
| `btn-primary` | guinda sólido | Fondos claros |
| `btn-secondary` | transparente + borde guinda | Fondos claros |
| `btn-primary-dark` | `#F9F8F5` sólido | **Fondos oscuros (hero)** |
| `btn-secondary-dark` | transparente + borde blanco | **Fondos oscuros (hero)** |

### Hero oscuro — variante compacta (`hero-sm`, páginas internas)

```html
<section class="hero hero-sm">
    <div class="hero-inner">
        <span class="hero-badge">NOMBRE ÁREA · SEPRN</span>
        <h1>Título de la Página</h1>
        <p>Subtítulo descriptivo breve</p>
    </div>
    <div class="hero-glow" aria-hidden="true"></div>
</section>
```

- Idéntico al hero principal pero con `padding` reducido (via `.hero-sm`)
- Usado en `nosotros.html` y todas las páginas de área internas

### Fade-up genérico (`.fade-item`)

Para animar tarjetas en páginas internas, agregar la clase `fade-item` al elemento:

```html
<div class="oficina-card fade-item">...</div>
```

El `script.js` global observa todos los `.fade-item` y les agrega `.visible` al entrar al viewport. No requiere JS adicional por página.

### Skip to content (`.skip-link`)

Primera línea del `<body>` en todas las páginas:

```html
<body>
<a href="#main-content" class="skip-link">Saltar al contenido principal</a>
```

Y en la sección principal:

```html
<section class="content-section" id="main-content" role="main">
```

### Card de área con animación de entrada

Las `.area-card` requieren IntersectionObserver para activar la clase `.visible`:

```javascript
const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.area-card').forEach((c, i) => {
    c.style.transitionDelay = (i * 70) + 'ms';
    obs.observe(c);
});
```

---

## 6. Componentes documentados (originales)

### Header / Nav (estado actual)

```html
<header>
    <nav>
        <div class="logo">SEPRN</div>
        <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
            <span></span><span></span><span></span>
        </button>
        <ul>
            <li><a href="index.html">Inicio</a></li>
            <li><a href="nosotros.html">Nosotros</a></li>
            <li><a href="areas.html">Áreas</a></li>
            <li><a href="cte.html">CTE</a></li>
            <li><a href="contacto.html">Contacto</a></li>
        </ul>
    </nav>
</header>
```

El `script.js` global maneja el toggle del menú hamburguesa (clase `.open` en `nav-toggle` y `nav ul`).

Todas las páginas tienen `class="active"` + `aria-current="page"` en el `<a>` correspondiente.

### Footer

Bloque idéntico en todas las páginas. Si cambia la dirección o el horario, hay que actualizarlo en los ~16 archivos. **Deuda técnica**: considerar extraer a un componente via `fetch()` en el futuro.

### Acordeón CTE (`sesion-accordion`)

```html
<div class="sesion-accordion [active]">
    <button class="sesion-header" type="button" onclick="toggleSesion(this)" aria-expanded="[true|false]">
        <div class="sesion-header-text">
            <h2>[Nombre Sesión] [Ciclo escolar]</h2>
            <p>[Descripción breve]</p>
        </div>
        <div class="sesion-toggle">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
            </svg>
        </div>
    </button>
    <div class="sesion-content">
        <div class="sesion-content-inner">
            <!-- videos (src en activa, data-src en colapsadas), materiales, link SEP -->
        </div>
    </div>
</div>
```

**Estado actual:**
- Solo la sesión más reciente lleva `class="active"` y `aria-expanded="true"`. Las demás tienen `aria-expanded="false"`.
- Los iframes de sesiones colapsadas usan `data-src` (lazy load al abrir el acordeón).
- El JS en `cte.html` cierra todas las demás al abrir una y carga los iframes.
- La animación usa `grid-template-rows: 0fr → 1fr` con `transition: 0.35s ease` (técnica sin `max-height`).

### Grid de materiales (CTE)

Cada material usa `.material-item` con un `.material-icon` SVG (PNG por tipo de archivo), `.material-info` y un `<a href>` con `download`.

- PDF → icono de documento con líneas
- DOCX → icono de documento con W
- PPTX → icono de presentación
- ZIP → icono de caja/archivo comprimido

Los paths de archivos con acentos o espacios deben estar URL-encoded (ej. `S%C3%A9ptima-sesion.zip`, `fase3%20segundo-1.pdf`).

### Mapa SVG (Cobertura)

Hardcodeado en `index.html`. Municipios como `<polygon>` con `data-nombre` y `data-sector`. El tooltip se maneja con JS inline. Soporte touch implementado (`touchstart { passive: false }`, tooltip centrado fijo, auto-cierre 2.8s).

---

## 6. Flujo de actualización de contenido

### Agregar nueva sesión CTE

1. Crear subcarpeta: `pdfs/cte/[nombre]-sesion/` (sin acentos en el nombre de la carpeta).
2. Subir archivos (DOCX, PPTX, PDF, ZIP). Usar nombres URL-friendly (guiones, sin espacios).
3. En `cte.html`:
   - En la sesión anterior: quitar `class="active"`, quitar badge "NUEVO", convertir `src=` → `data-src=` en los iframes.
   - Agregar nuevo bloque `sesion-accordion` con `class="active"` y badge "NUEVO".
4. Hacer commit y push.

### Actualizar equipo directivo

Editar `nosotros.html` (bloque "Equipo de Trabajo") y `areas.html` (campo `area-responsable` de cada tarjeta).

### Agregar nueva página de área

1. Copiar `juridico.html` como plantilla (es la más simple).
2. Actualizar `<title>`, meta description, header, contenido.
3. Marcar `class="active"` en el nav correspondiente.
4. Agregar tarjeta en `areas.html`.
5. Agregar enlace en `nosotros.html` (organigrama).
6. Verificar checklist de nueva página (ver Sección 9).

---

## 7. Integraciones externas

| Servicio | Propósito | Configuración |
|---|---|---|
| Google Analytics 4 | Analítica de visitas | ID: `G-7D68DB8ELW` — en `<head>` de cada página |
| Google Fonts | Tipografía Montserrat | `<link rel="preconnect">` + `<link>` en `<head>` de cada página |
| Google Maps Embed | Mapa en `contacto.html` | URL de embed en el `<iframe>` |
| YouTube Embed | Videos de sesiones CTE | `src` (sesión activa) / `data-src` (colapsadas, lazy load) |
| Portal SEP CTE | Link externo | `https://gestion.cte.sep.gob.mx/insumos/#!/` |
| Facebook | Redes sociales | `https://www.facebook.com/SubNeza` |
| YouTube Channel | Redes sociales | `https://www.youtube.com/channel/UCvDb2DPSJxFyhH3bCPd5D2Q` |
| Google Apps Script | 4 backends independientes | `conferencia-ia.gs` (evento IA), `cursos-coeee-2026.gs` (Jornada Verano), `soporte-remoto.gs` (Soporte OTDE), `formacion-docente.gs` (Centro de Formación Docente) — cada uno Web App con `doGet`/`doPost`, URL embebida como constante en su página correspondiente |
| GmailApp (Apps Script) | Correo de confirmación | Envía HTML con QR; remitente: "Oficina de Tecnología · Neza" (usado por `conferencia-ia.gs`) |
| api.qrserver.com | Generación de QR en correo | URL dinámica con folio codificado; solo en correos de confirmación |
| html5-qrcode v2.3.8 | Escáner QR en `asistencia.html` | CDN `unpkg.com`; modo cámara trasera `environment` |
| Bot de Telegram (API `sendMessage`) | Notificación push de solicitudes de Soporte Remoto | Token y chat_id en Propiedades del script de `soporte-remoto.gs` (nunca hardcodeados); incluye link `wa.me` al WhatsApp del solicitante |

---

## 8. Sistema de Registro de Eventos (Junio 2026)

Arquitectura del sistema implementado para la Conferencia IA 2026. Reutilizable para futuros eventos con ajustes mínimos en el Apps Script y la base CCT.

### Diagrama de flujo

```
Visitante
  └── conferencia-ia.html
        ├── js/cct-db.js (autocompletado CCT, 506 registros)
        ├── fetch ?action=cupo  ──────────────────────────────────────┐
        └── POST datos del formulario ─────────────────────────────── Apps Script Web App
                                                                        │   (conferencia-ia.gs)
                                                                        ├── Google Sheets (Registros_IA_2026)
                                                                        └── GmailApp → correo HTML + QR

Operador en puerta
  └── asistencia.html
        ├── PIN local (sessionStorage) — sin red
        ├── html5-qrcode (cámara) o lector físico o tipeo manual
        └── fetch ?action=checkin&folio=...&pin=... ──────────────── Apps Script Web App
                                                                        └── Google Sheets (cols M + N)
```

### Estructura de la hoja `Registros_IA_2026`

| Col | Nombre | Tipo | Notas |
|---|---|---|---|
| A | Fecha | DateTime | `appendRow` inserta objeto `Date` |
| B | Folio | String | `CONF-{SECTOR}-{nn}` o `CONF-{SECTOR}-{nn}-LE` |
| C | Nombre | String | Validado: mín. 3 palabras de ≥ 2 letras |
| D | RFC | String | Regex `[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}` |
| E | Teléfono | String | Máscara `(55) 1234-5678` |
| F | Correo | String | Regex básica de email |
| G | Función | String | docente / director / supervisor / familiar / otro |
| H | CCT | String | Clave del Centro de Trabajo |
| I | Sector | String | De la CCT seleccionada |
| J | Zona | String | De la CCT seleccionada (puede ser vacío) |
| K | Escuela/Unidad | String | Nombre del plantel de la CCT |
| L | Estado | String | `ok` \| `lista_espera` |
| M | Asistencia | String | Vacío → `asistio` al hacer check-in |
| N | Hora_Checkin | String | `HH:mm` formateado; `@STRING@` para evitar reinterpretación |

### Constantes clave del Apps Script

```javascript
const HOJA_NOMBRE  = 'Registros_IA_2026'; // cambiar por evento
const CUPO_SECTOR  = 7;                    // cupo por sector (sin contar SEPRN)
const CORREO_ADMIN = 'adg0086n@dee.edu.mx';
const CHECKIN_PIN  = '2026IA';             // cambiar antes del evento
```

### Decisiones de diseño y limitaciones conocidas

- **PIN en dos capas**: `asistencia.html` valida el PIN localmente (sin red) para mostrar el scanner; el Apps Script también valida el PIN en `?action=checkin` como segunda línea de defensa.
- **Hora como texto**: Google Sheets convierte cadenas `HH:mm` a fracciones de día (float) si la celda tiene formato numérico. Forzar `@STRING@` en la columna N previene esta corrupción.
- **QR por email**: Se genera dinámicamente con `api.qrserver.com`. Requiere que el cliente de correo cargue imágenes externas. iCloud Mail las carga correctamente.
- **iCloud Mail y emojis**: Los clientes de correo de Apple no renderizan caracteres Unicode SMP (U+1F000+) aunque sean HTML entities. Solución: etiquetas de texto puro con estilo CSS.
- **Cupo sector SEPRN**: El sector "SEPRN" (personal interno) no tiene límite de cupo (`CUPO_SECTOR` no aplica).

---

## 9. Bugs y deuda técnica

### Bugs resueltos (Mayo 2026)

| # | Descripción | Archivo(s) | Estado |
|---|---|---|---|
| B1 | GA4 script fuera de `<head>` | Todos los HTML | ✅ Resuelto |
| B2 | `referrerpolicy="strict-origin-when-cross-cross"` (typo) | `cte.html` | ✅ Resuelto |
| B3 | Nav de `contacto.html` omitía "Nosotros" | `contacto.html` | ✅ Resuelto |
| B4 | No había regla CSS para `.active` en nav | `styles.css` | ✅ Resuelto |
| B5 | `target="_blank"` sin `rel="noopener noreferrer"` | Todos los HTML | ✅ Resuelto |
| B6 | Sin menú hamburguesa para móvil | `styles.css` + todos los HTML | ✅ Resuelto |
| B7 | `text-align: justify` en `nosotros.html` | `nosotros.html` | ✅ Resuelto |
| B8 | Color de texto `#000000` | `styles.css` | ✅ Resuelto |
| B9 | Sin `<meta name="description">` | Páginas clave | ✅ Resuelto |

### Resueltos en Fase 1 (junio 2026)

| # | Problema | Archivo(s) | Estado |
|---|---|---|---|
| P1 | Sin `class="active"` en nav de 14+ páginas | Todos los HTML | ✅ `fd707cf` |
| P2 | Sección cobertura rota en mobile (sin media query) | `index.html` | ✅ `9502c7f` |
| P3 | Google Fonts via `@import` (render-blocking) | `styles.css` + todos | ✅ `59086e9` |
| P4 | Contraste subtítulo hero: `#977e5b` (ratio 3.5:1, falla WCAG AA) | `styles.css` | ✅ `59086e9` |
| P5 | Accordion headers son `<div onclick>` (no semántico) | `cte.html` | ✅ `9502c7f` |
| P6 | Sin `aria-current="page"` en ninguna página | Todos los HTML | ✅ `fd707cf` |
| P7 | Touch targets insuficientes en nav mobile | `styles.css` | ✅ `59086e9` |
| P8 | Sin favicon en ninguna página | Todos los HTML | ✅ `fd707cf` |
| P9 | Toggles accordion con caracteres `▼▶` (no fluido) | `cte.html` | ✅ `9502c7f` |

### Resueltos en sesiones posteriores

| # | Problema | Archivo(s) | Estado |
|---|---|---|---|
| P10b | Acordeón `<div onclick>` → `<button>` semántico con `aria-expanded` | `cte.html` | ✅ Fase 1.5 |
| P10c | Toggles `▼▶` → SVG chevron animado con CSS `rotate` | `cte.html` | ✅ Fase 1.9 |
| P10d | Animación acordeón `max-height` → `grid-template-rows` | `cte.html` | ✅ Fase 2.3 |
| P10e | Hero midnight en páginas de área | `*.html` | ✅ jun 2026 |
| P10f | Section headers sistema de diseño en páginas internas | `*.html` | ✅ 24 jun 2026 |
| P10g | `.skip-link` + `role="main"` en páginas de área | `*.html` | ✅ 24 jun 2026 |
| P10h | Tokens `--midnight` y `--off-white` migrados a `:root` | `styles.css` | ✅ 24 jun 2026 |
| P11 | Footer multi-columna (3 cols + barra inferior) en las 13 páginas | Todos los HTML | ✅ 24 jun 2026 |
| P13 | ARIA tabs + `aria-expanded` en formularios de `otde.html` | `otde.html` | ✅ 24 jun 2026 |
| P14 | Mapa SVG sin soporte touch | `index.html` | ✅ 24 jun 2026 |
| P15 | Bug: `--midnight: var(--midnight)` (autorreferencia) dejaba heroes transparentes | `styles.css` | ✅ 24 jun 2026 |
| P16 | `areas.html` y `cte.html` sin hero midnight (inconsistencia visual) | `areas.html`, `cte.html`, `contacto.html` | ✅ 24 jun 2026 |
| P17 | Emojis en `otde.html` (tabs, headings, íconos decorativos) | `otde.html` | ✅ 24 jun 2026 |
| P18 | Emojis 👤/📧/📞 en secciones de contacto de páginas de área | 6 páginas de área | ✅ 24 jun 2026 |
| P19 | URLs portal SEP con `#!/` obsoleto y `www.` incorrecto en `cte.html` | `cte.html` | ✅ 24 jun 2026 |

### Pendientes

| # | Problema | Archivo(s) | Fase |
|---|---|---|---|
| P12 | Footer y nav duplicados en ~16 archivos (sin componente compartido) | Todos los HTML | Deuda técnica |

---

## 10. Checklist para nuevas páginas

Antes de hacer commit de una página nueva:

- [ ] `<html lang="es">`
- [ ] GA4 tag **dentro** de `<head>` (primera línea de `<head>`)
- [ ] `<meta charset="UTF-8">`, `<meta name="viewport" ...>`, `<meta name="description" content="...">`
- [ ] `<title>[Sección] - SEPRN</title>`
- [ ] `<link rel="preconnect">` × 2 + `<link>` de Montserrat
- [ ] `<link rel="icon" href="favicon.svg" type="image/svg+xml">`
- [ ] `<link rel="stylesheet" href="styles.css">`
- [ ] OG tags: `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`
- [ ] Primera línea de `<body>`: `<a href="#main-content" class="skip-link">Saltar al contenido principal</a>`
- [ ] Nav completo con los 5 ítems + `nav-toggle` + `class="active"` + `aria-current="page"` en el ítem actual
- [ ] Sección hero: `<section class="hero hero-sm">` con `.hero-badge`, `<h1>`, `<p>`, `.hero-glow`
- [ ] Contenido: `<section class="content-section" id="main-content" role="main">`
- [ ] Secciones internas con `.section-header` + `.section-eyebrow` + `.section-title` (no `.seccion-titulo`)
- [ ] Tarjetas con `class="oficina-card fade-item"` para animación al scroll
- [ ] Footer completo (copiar del template)
- [ ] `<script src="script.js" defer></script>` antes de `</body>`
- [ ] `rel="noopener noreferrer"` en todos los `target="_blank"`
- [ ] Sin `text-align: justify`; texto de cuerpo en `#333333`

---

## 11. Patrón: CCT con autocompletado + fallback manual (Julio 2026)

Implementado primero en `jornada-verano-2026.html`, reutilizado en el formulario de Soporte Técnico Remoto de `otde.html` y en `formacion-docente.html`. Si se necesita en una nueva página, replicar este patrón en vez de inventar uno nuevo.

**Piezas del patrón:**
- `js/cct-db.js` — 506 registros `{cct, nombre, sector, zona, tipo, municipio}`. Cargar con `<script src="js/cct-db.js"></script>` antes del script inline de la página. El campo `municipio` (agregado jul 2026 desde `Catalogo SEPRN direcciones.xlsx`) se autocompleta igual que sector/zona/escuela — **no** se deriva del sector, porque un mismo sector puede abarcar varios municipios (ver mapa SVG de `index.html`); en el fallback manual (CCT no encontrada) el municipio queda vacío, no se le pide al usuario.
- Input de texto con `<ul id="...-suggestions">` absoluto debajo, poblado en el evento `input` (mínimo 3 caracteres, máximo 10 resultados) y navegable con flechas/Enter/Escape.
- Al seleccionar una sugerencia: llenar inputs ocultos `sector-val` / `zona-val` / `escuela-val` y marcar una bandera `cctEncontrada = true`.
- Si el usuario escribe una CCT que no existe (evento `change` sin `cctEncontrada`): mostrar bloque `.manual-fields` con un `<select>` de **Tipo de CCT** primero (Escuela / Zona escolar-Supervisión / Sector educativo-Jefatura / SEPRN, función `*ActualizarTipoCct()`), que decide si se muestran Sector+Zona (escuela/supervision), solo Sector (jefatura) o ninguno de los dos (subdireccion/SEPRN) — reemplaza, desde agosto 2026, al diseño anterior donde `SEPRN` era una opción más dentro del `<select>` de Sector (ese diseño viejo tenía un bug real: una CCT de tipo `jefatura` quedaba forzada a contestar también "Zona", que no le aplica). El `<select>` de Zona sigue poblándose dinámicamente vía `actualizarZonas()` a partir de un mapa `sector → zonas[]` derivado de `CCT_DB`, e `<input>` de Escuela/Unidad sin cambios.
- **Validación por campo, no agrupada**: Tipo de CCT, Sector, Zona y Escuela deben validar y mostrar su propio mensaje de error. Agrupar todo bajo el mensaje del campo CCT es un anti-patrón ya corregido dos veces (`jornada-verano-2026.html` lo resolvió como "BUG 4/5 fix"; `otde.html` lo resolvió en jul 2026) — Sector es obligatorio salvo en SEPRN, Zona solo en escuela/zona escolar.
- El formulario que use este patrón debe llevar `novalidate` en el `<form>` y validación 100% en JS (`onchange`/`onsubmit`), porque los atributos `required`/`type="email"` nativos interceptan el `submit` antes de que corra la validación personalizada.
- **Función/Cargo ramificada por tipo de CCT (agosto 2026)**: `js/cct-db.js` ya traía un campo `tipo` por registro (`escuela|supervision|jefatura|subdireccion`) que antes solo alimentaba el cálculo de dominio de correo (ver §16). La función compartida `otdeOpcionesFuncion(tipo)` (en `cct-db.js`) devuelve la lista de roles válida para ese tipo — escuela: Director(a)/Subdirector(a)/Docente/Personal de apoyo (PAAE); zona: Supervisor(a) Escolar/ATP/PAAE; sector: Supervisor(a) General/ATP/PAAE; SEPRN: Encargado(a) del Despacho/Subjefe(a)/Jefe(a) de Oficina/ATP/Administrativo (PAAE); siempre con "Otro" al final — y el helper de DOM `otdePoblarFuncion(selectId, tipo)` en `otde.html` repuebla el `<select>` de Función conservando la selección previa si sigue siendo válida. Se llama tanto al encontrar la CCT por autocompletado (usa `m.tipo` de `CCT_DB`) como al elegir el Tipo de CCT manual — los 4 formularios que preguntan Función (Alta, Mantenimiento, Asesorías, Soporte) lo usan. No requirió cambios de backend: los `.gs` correspondientes solo validan que `funcion` no venga vacío.

---

## 12. Centro de Formación Docente (Julio 2026 — desplegado en producción)

Nace de sistematizar el flujo real de convocatorias CoEEE (webinars, seminarios, conferencias, cursos autogestivos, acciones formativas, diplomados, proyectos didácticos), antes resuelto con un Google Form distinto por curso y sin seguimiento del ciclo de vida del participante. Diseño discutido y validado con Jorge antes de implementar. Desplegado en el Spreadsheet real `Formacion_Docente_2026_2027`; `jornada-verano-2026.html` hizo cutover a este mismo backend (ver §14).

### Modelo de datos — 3 hojas relacionales en un solo Spreadsheet (no una hoja por curso)

```
Docentes                    Cursos                              Inscripciones
─────────                   ──────                              ─────────────
RFC (llave, upsert)          ID_Curso (llave)                     Folio (llave, OTDE-CAP-NNNN)
Nombre_completo              Categoria                             Fecha_registro
Correo                       Nombre                                RFC_Docente     ──┐ FK
Telefono                     Responsable                           ID_Curso        ──┤ FK
CCT                          Modalidad                             Estado           │
Escuela                      Fecha_inicio / Fecha_fin               Codigo_asistencia_capturado
Sector / Zona / Municipio    Liga_convocatoria                      Fecha_actualizacion_estado
Funcion                      Requiere_codigo_asistencia             Notas
Fecha_primer_registro        Codigo_asistencia                      I-O: vista VLOOKUP (Nombre_Docente,
Fecha_ultima_actualizacion   Activo (controla el catálogo)              CCT, Escuela, Sector, Zona,
                             Notas                                      Funcion, Nombre_Curso) — en vivo,
                             Registro_previo_requerido                  nunca se escriben como valor fijo
                             Visible_desde / Visible_hasta
                             Hora_inicio
                             Recordatorio_inicio_enviado
                             Recordatorio_medio_enviado
                             Recordatorio_webinar_enviado
```

`obtenerHojaCursos()` completa sola cualquier encabezado que falte en una hoja ya creada antes de agregar una columna nueva (compara `ENCABEZADOS_CURSOS` contra `getLastColumn()`) — no hace falta migrar nada a mano cuando el modelo crece.

- **Upsert en `Docentes`**: si el RFC ya existe, se actualizan sus datos y `Fecha_ultima_actualizacion`; si no existe, se agrega. **Un valor nuevo vacío nunca sobrescribe uno bueno que ya hubiera** (`valorOMantener()`) — importante para migraciones históricas incompletas (ej. la de Jornada Verano, que no capturaba Teléfono).
- **Catálogo dinámico + ventanas de fecha**: `Cursos` la administra OTDE a mano. El `doGet` regresa las filas con `Activo=TRUE` **y**, si `Visible_desde`/`Visible_hasta` están llenas, dentro de esa ventana (comparación por año/mes/día vía `soloFecha()`, sin depender de un trigger que pueda fallar en silencio — se evalúa en cada visita al sitio). `Activo=FALSE` siempre gana sobre las fechas.
- **Prueba social real**: `doGet` también manda `inscritos` (conteo de `Inscripciones` por `ID_Curso`, `contarInscritosPorCurso()`) — el frontend solo lo muestra si es mayor a 0, nunca un número inventado.
- **Sin gestión de constancias**: los webinars/seminarios no las emiten (salvo conferencias UNETE) y en los demás programas la emite la plataforma de CoEEE. OTDE solo registra participación para estadística propia.
- **Deduplicación de inscripción**: antes de insertar en `Inscripciones`, se busca si ya existe la combinación (RFC, ID_Curso); si existe, se regresa el folio original con `duplicado:true`.

### Registro previo externo (paso condicional, no global)

A diferencia de `jornada-verano-2026.html` (que siempre manda a un solo portal CoEEE), aquí el catálogo mezcla categorías con y sin cupo real. `Registro_previo_requerido=TRUE` en un curso (más `Liga_convocatoria` llena) hace que el wizard inserte un paso intermedio — lista esa convocatoria, exige abrir el link y confirmar "ya me registré" antes de pasar al formulario de OTDE. Si ningún curso seleccionado lo requiere, no aparece ningún paso extra. Detalle de implementación en `docs/DESIGN_SYSTEM.md`.

### Recordatorios automáticos por correo

Tres avisos calculados a partir de las propias fechas del curso, sin marcar nada a mano (reglas ajustadas con Jorge, ago 2026):

| Aviso | Se dispara | Requiere |
|---|---|---|
| "Empieza en 1 día" | 1 día antes de `Fecha_inicio`, cursos de varios días **siempre** + cursos de un solo día **sin** `Hora_inicio` (fallback) | — |
| "Vas a la mitad" | Al cruzar el punto medio `Fecha_inicio`/`Fecha_fin`, solo cursos de 30+ días | — |
| "Empieza en 30 minutos" | Entre 20 y 40 minutos antes del inicio exacto, cualquier curso (de uno o varios días) | `Hora_inicio` capturada |

Un curso de varios días con `Hora_inicio` capturada recibe el primero y el tercero — son avisos independientes, uno no sustituye al otro (aviso temprano + empujón el mismo día). Un curso de un solo día con `Hora_inicio` recibe **solo** el tercero (el primero se salta para no duplicar con un aviso tan cercano). Cada aviso se manda como **un solo correo por curso, con BCC a todos los inscritos** (no uno por persona), con una plantilla HTML propia (`construirCorreoHtml()`, con la paleta institucional — ver ejemplo en `docs/DESIGN_SYSTEM.md`), y se revisa `MailApp.getRemainingDailyQuota()` antes de enviar — la cuota diaria la comparten TODOS los Apps Script de la cuenta de Google, no es exclusiva de este proyecto; si no alcanza, el aviso se salta ese día y se reintenta el siguiente (la bandera `Recordatorio_*_enviado` no se marca hasta que el correo sale de verdad; el aviso de "1 día antes" usa un rango, no una igualdad exacta, para poder reintentar al día siguiente sin perderse en silencio).

El aviso de "30 minutos" necesita precisión de minutos, así que su disparador corre **cada 15 minutos** (no cada hora como antes) — requiere volver a correr el menú "OTDE Formación → Instalar recordatorios automáticos" después de desplegar una nueva versión, porque `instalarRecordatoriosAutomaticos()` borra y recrea ambos activadores en cada corrida (antes solo los creaba si faltaban, así que un cambio de intervalo no se aplicaba solo). `enviarRecordatoriosDiarios()` además llama a `verificarActivadoresInstalados()` al inicio, que manda un correo de alerta a Jorge (máximo una vez al día, vía `PropertiesService`) si alguno de los dos activadores desapareció.

**Diseño del correo y protección de respuestas (ago 2026):** `construirCorreoHtml()` genera un correo con header midnight/guinda, chip de categoría, caja de detalle del curso, botón CTA a la convocatoria/acceso, y un footer con 3 íconos de redes (Facebook `facebook.com/SubNeza`, YouTube del canal institucional, Canal de WhatsApp de OTDE — mismas URLs reales que usa el footer del sitio, constante `REDES_SOCIALES`). Todo el HTML declara `<meta charset="utf-8">` explícito — sin eso los acentos se corrompen en clientes/visores que no respeten el charset de la cabecera MIME (ver `docs/QA-NOTES.md #7`). `enviarCorreoLote()` manda con `replyTo: CORREO_REPLY_TO_INSTITUCIONAL` (`otde.nezahualcoyotl@dee.edu.mx`) porque `Session.getEffectiveUser().getEmail()` — el remitente real — resuelve a esa dirección como *alias* de la cuenta de Gmail que en realidad es dueña del proyecto de Apps Script; sin `replyTo` explícito, un "Responder" del destinatario habría ido a esa cuenta de Gmail en vez de a la institucional. Mismo patrón de `replyTo` que ya usan `mantenimiento.gs`/`asesorias.gs`.

### Diagrama de flujo

```
Docente
  └── formacion-docente.html  ◄──────────────────────────  jornada-verano-2026.html (cutover, §14)
        ├── fetch doGet ────────────────────────────────────────── Apps Script Web App
        │     (catálogo Activo=TRUE + ventana de fecha + inscritos)  (formacion-docente.gs)
        ├── selecciona 1+ cursos (multi-select)
        ├── [paso condicional] registro previo externo si aplica
        └── POST secuencial por curso (evita race condition        ├── upsert en Docentes (valorOMantener)
              en generarFolio())  ─────────────────────────────────►├── dedupe + folio en Inscripciones
                                                                     └── Google Sheets

                                    Disparadores de tiempo (independientes de doGet/doPost)
                                    ├── enviarRecordatoriosDiarios() — 1x/día
                                    └── enviarRecordatoriosWebinar() — 1x/hora
```

### Ciclo escolar y archivado

Un Spreadsheet por ciclo (`Formacion_Docente_2026_2027`), con el `.gs` bound a él vía `CICLO_ESCOLAR = '2627'` (afecta el prefijo del `ID_Curso`). Al cerrar el ciclo: duplicar el Spreadsheet completo, actualizar la constante y volver a desplegar.

### Fases futuras (no implementadas aún)

Las columnas `Requiere_codigo_asistencia` / `Codigo_asistencia` en `Cursos` y `Codigo_asistencia_capturado` en `Inscripciones` ya existen en el modelo para cuando se active:
- **Validación de asistencia en webinars** vía código de cierre anunciado al final de la transmisión.
- **Dashboards por sector/zona** vía Looker Studio conectado directo a la hoja (sin construir autenticación/login propios) — decisión previa a confirmar con Jorge si en algún momento se prefiere algo más custom.

**No es lo mismo que la validación de CCT en la pestaña "Licencias Office" de `otde.html`**: esa usa un CSV/Sheet publicado distinto (base de licenciamiento, no `cct-db.js`) y corre del lado del instalador `.bat`/`.exe`, no en el navegador.

## 13. Bugs reales corregidos (julio 2026) — ver también `docs/QA-NOTES.md`

Cinco bugs concretos detectados y corregidos en esta ronda, documentados con causa raíz en `docs/QA-NOTES.md` para no reintroducirlos: (1) `fetch()` sin timeout → botón congelado indefinidamente, presente en 4 archivos (`formacion-docente.html`, `jornada-verano-2026.html`, `otde.html`, `asistencia.html`) antes de corregirse en todos; (2) `appendRow([])` inválido en Apps Script, en 2 archivos; (3) `new Date('YYYY-MM-DD')` corre la fecha un día por interpretarse como UTC; (4) upsert que sobrescribía datos buenos con vacíos en migraciones; (5) cuota de `MailApp` compartida entre todos los Apps Script de la cuenta, no por proyecto.

## 14. Cutover de Jornada Verano 2026 a Formación Docente (julio 2026) — página retirada 13 jul 2026

**Nota (13 jul 2026):** `jornada-verano-2026.html` e `instructivo-jornada-verano-2026.html` se eliminaron del sitio porque cerró el periodo de inscripciones. Esta sección queda como registro histórico de la decisión de arquitectura (por qué compartía backend con Formación Docente); ya no describe una página en producción.

`jornada-verano-2026.html` dejó de usar su propio backend (`apps-script/cursos-coeee-2026.gs`, que queda desplegado pero congelado como archivo histórico) y pasó a reportar a `apps-script/formacion-docente.gs`, el mismo backend del Centro de Formación Docente. Los 5 cursos de la Jornada se dieron de alta en la hoja `Cursos` vía `asegurarCursosVerano()`/`migrarJornadaVerano()` (menú "OTDE Formación → Migrar Jornada Verano 2026", idempotente). Acoplamiento que existió mientras la página vivió: el wizard resolvía `id_curso` por **nombre exacto** contra el catálogo — editar el texto del `Nombre` de esos 5 cursos en Sheets, o poner `Activo=FALSE`, rompía el registro en silencio mientras la página siguiera publicada.

## 15. Mantenimiento y Asesorías: webform que complementa el oficio, no lo sustituye (agosto 2026)

Antes de estos dos entregables, ambos trámites llegaban por oficio en papel/PDF y alguien de
OTDE lo transcribía a mano a un control en Excel/Sheets. La decisión de arquitectura clave,
confirmada con Jorge en ambos casos: **el oficio sigue siendo el respaldo oficial** — el
webform no lo reemplaza, lo complementa (se adjunta como PDF/foto en vez de viajar solo en
papel) y digitaliza la captura de datos que antes se tecleaba a mano.

Mismo patrón en los dos (`apps-script/mantenimiento.gs`, `apps-script/asesorias.gs`), calcado
del ya probado `soporte-remoto.gs`:

- Sheet propio (no comparten spreadsheet con nada más), hoja `Solicitudes` con folio
  secuencial (`OTDE-MAN-####` / `OTDE-ASE-####`) y estatus inicial `Pendiente de validar` — no
  caen directo a producción, Jorge revisa el oficio adjunto antes de promover a mano al
  control real (`seguimiento` del sistema de Reportes de Visitas para Mantenimiento; el Excel
  de asesorías para Asesorías — ninguno de los dos sistemas de control real se tocó ni se
  integró automáticamente, es una decisión deliberada para no arriesgar sistemas en producción
  ajenos a este entregable).
- Hoja `Contactos_Zona_Sector` (Sector, Zona, Correo, Teléfono) que Jorge mantiene a mano —
  puede tener una fila de Zona específica y otra de Sector (de respaldo, sin Zona) para el
  mismo Sector; `manBuscarContactosZonaSector()`/`aseBuscarContactosZonaSector()` (agosto 2026,
  plural a propósito) busca ambas y las agrega en copia (CC) del correo al solicitante, no solo
  la primera que encuentra. Además del correo, avisa a OTDE por Telegram.
- El oficio adjunto se sube en base64 desde el cliente (`FileReader.readAsDataURL`), se
  decodifica en `doPost` con `Utilities.base64Decode` y se guarda en una carpeta de Drive
  dedicada por trámite, compartida "cualquiera con el link, solo ver".
- Mismo patrón de CCT con autocompletado + fallback manual que el resto del sitio (§11),
  prefijos `man`/`ase` en los IDs para no chocar entre tabs.

Asesorías añade una validación de negocio propia: la asesoría de Banco de Materiales/Chuka
requiere que la escuela ya haya recibido mantenimiento con esos recursos instalados. No hay
forma de validarlo automáticamente sin integrar con el sistema de Reportes de Visitas (fuera de
alcance — y la mayoría de escuelas ya atendidas lo fueron antes de que existiera el webform de
Mantenimiento, así que cruzar contra datos parciales sería peor que no cruzar nada). En su
lugar, el formulario pide una casilla de confirmación obligatoria y dejó listo un selector de
"Tipo de asesoría" (hoy una sola opción) para cuando se decida separar Banco de
Materiales/Chuka o agregar asesorías nuevas — decisión pedagógica pendiente, deliberadamente
fuera de alcance de este entregable.

**Cierre automático del ticket (agosto 2026).** El hallazgo de QA "nadie le avisa al
solicitante cuando su ticket se resolvió" se cerró con un trigger `onEdit` **instalable** (no
un trigger simple — esos corren sin autorización y no pueden llamar `MailApp`) en cada
proyecto: `manOnEditCierre` / `aseOnEditCierre`. Se instala una sola vez por proyecto corriendo
`manInstalarTriggerCierre()` / `aseInstalarTriggerCierre()` desde el editor de Apps Script (o
desde el menú `OTDE Mantenimiento` / `OTDE Asesorías` que agrega `onOpen()`) — no se reinstala
solo al pegar una versión nueva del código.

- La columna `Estatus` pasó de texto libre a un dropdown con lista fija
  (`SpreadsheetApp.newDataValidation().requireValueInList(...)`): `Pendiente de validar` ·
  `Validado` · `En atención` · `Resuelto` · `Rechazado`. Sin esto el trigger no tendría un
  valor confiable contra el cual comparar.
- Al detectar que la columna editada incluye `Estatus` y el nuevo valor es exactamente
  `'Resuelto'`, envía un correo (`to` = solicitante, `cc` = Zona/Sector si hay contacto(s) —
  mismo patrón `to`/`cc` que el aviso de alta, ver arriba). Antes (ago 2026) eran 2 correos
  sueltos por evento (uno al solicitante, otro a un solo contacto de Zona/Sector); el rediseño
  de correo combinado reduce el conteo de envíos mientras aumenta el alcance de información.
  `Rechazado` queda en el dropdown pero deliberadamente sin lógica todavía — mismo mecanismo,
  se puede sumar después sin rediseñar nada.
- Una columna nueva `Notificación de cierre enviada` (auto-heal de encabezados, mismo patrón
  que ya usaba `aseObtenerHojaSolicitudes()`) evita reenviar si Jorge cambia el Estatus fuera de
  `Resuelto` y vuelve a `Resuelto`.
- Todo el envío está envuelto en try/catch silencioso, mismo criterio que el resto del
  archivo: un fallo de `MailApp` nunca debe impedir que la edición del Sheet se guarde.

Explícitamente fuera de alcance de esta ronda: migrar a webform el reporte de cierre que llena
el técnico al terminar un mantenimiento (es el mismo "Sistema Automatizado de Reportes de
Visitas" ya maduro, con generación de PDF y envío automático — reimplementar eso desde cero no
compensaba el beneficio, mayormente cosmético, para un flujo de uso interno) y el formulario de
feedback de Asesorías que redirige al Kit Digital (totalmente desconectado del Sheet de
`asesorias.gs`, es un loop pedagógico aparte que no bloqueaba el hallazgo de QA).

**"Equipos con falla" estructurado + correo obligatorio (agosto 2026).** El textarea libre de
Mantenimiento se reemplazó por un checklist (`man-equipo-aula`/`man-equipo-admin`/
`man-equipo-red`/`man-equipo-otro`, función `manToggleCantidad()`) que refleja lo que OTDE
realmente atiende — computadoras de aula de medios y administrativas (cada una con su propio
desplegable de cantidad aproximada, para estimar tiempo de atención), red/internet solo si ya
hay infraestructura instalada — y lo que no (impresoras, proyectores, instalación nueva de
red/eléctrica se canaliza a CoEEE), con marca/modelo opcional y estado de instalación
condicionales a marcar alguna categoría de cómputo. `ENCABEZADOS_MAN_SOLICITUDES` ganó 5
columnas nuevas (`Tipo de equipo`, `Cantidad (Aula de medios)`, `Cantidad
(Administrativas)`, `Marca/Modelo`, `Estado de instalación`) agregadas **al final** del arreglo
a propósito, para no correr los índices fijos `COL_MAN_ESTATUS`/`COL_MAN_NOTIFICACION_CIERRE`
que usa el trigger de cierre automático de arriba. El campo Correo, antes opcional en
Mantenimiento/Asesorías/Soporte, ahora es obligatorio en los tres (validado también
server-side en los 3 `.gs`) — es el medio principal de contacto, WhatsApp queda como
alternativo.

**Correo combinado a solicitante + Zona + Sector (11 ago 2026).** Jorge probó el flujo real y
encontró que la solicitante nunca recibía confirmación de que su solicitud llegó, y que Zona y
Sector nunca se enteraban ambos a la vez — la búsqueda de contacto se detenía en la primera
coincidencia (Zona exacta si existía, si no Sector). Rediseño en `mantenimiento.gs`/
`asesorias.gs`:

- `manBuscarContactosZonaSector()`/`aseBuscarContactosZonaSector()` (plural) recorre toda la
  hoja `Contactos_Zona_Sector` y devuelve un array con la fila de Zona **y** la fila de Sector
  si ambas existen (deduplicadas por correo), en vez de una sola.
- Al recibir la solicitud, `manNotificarSolicitudRecibida()`/`aseNotificarSolicitudRecibida()`
  (reemplaza a `manNotificarZonaSector()`/`aseNotificarZonaSector()`) manda un correo con
  `to` = solicitante (siempre, ya que Correo es obligatorio) y `cc` = Zona/Sector si hay
  contacto(s) — antes solo se avisaba a Zona/Sector, nunca al solicitante.
- Al cerrar, `manNotificarCierre()`/`aseNotificarCierre()` se consolidó en una sola función que
  manda un correo (`to` = solicitante, `cc` = Zona/Sector) en vez de los 2 correos sueltos que
  mandaba antes (`manNotificarCierreSolicitante`+`manNotificarCierreZonaSector`, eliminadas).
- Probado en vivo con modo de prueba (ver más abajo) usando Sector I/Zona 1 —confirmado que el
  correo llega con ambos contactos (`fiz0042v@dee.edu.mx` de Zona 1 y `fjs0015d@dee.edu.mx` de
  Sector I) en CC, tanto en apertura como en cierre.
- Redesplegado el mismo día: `mantenimiento.gs` versión 8, `asesorias.gs` versión 7.

**CC según jerarquía del solicitante (11 ago 2026, mismo día, ajuste sobre lo anterior).**
El correo combinado de arriba trataba a todo solicitante igual (siempre `cc` = Zona + Sector).
Jorge señaló que eso no es correcto si quien solicita **es** la Zona o el Sector: `js/cct-db.js`
ya distingue el `tipo` de cada CCT (`escuela` | `supervision` = Zona | `jefatura` = Sector |
`subdireccion` = SEPRN — 75 supervisiones y 13 jefaturas tienen su propio CCT, con `sector`/
`zona` propios), dato que ya se capturaba en un campo oculto (`man-tipo-cct-val`/
`ase-tipo-cct-val`, repuebla el `<select>` de Función) pero nunca viajaba al backend.

- `otde.html`: los payloads de Mantenimiento y Asesorías ahora incluyen `tipoCct` (mismo valor
  del campo oculto, tanto si el CCT vino del autocompletado como del fallback manual — ambos
  caminos ya lo llenaban).
- `mantenimiento.gs`/`asesorias.gs`: nueva columna `Tipo de solicitante` al final de
  `ENCABEZADOS_MAN_SOLICITUDES`/`ENCABEZADOS_ASE_SOLICITUDES` (mismo criterio de "agregar al
  final" que las demás). `manBuscarContactosZonaSector()`/`aseBuscarContactosZonaSector()` ahora
  etiqueta cada contacto con `nivel: 'zona'|'sector'`, y una función nueva
  `manFiltrarContactosPorTipo(contactos, tipoSolicitante)`/`aseFiltrarContactosPorTipo(...)`
  decide el `cc` final: `escuela` (o tipo vacío/desconocido — solicitudes previas a esta
  columna se tratan así, decisión de Jorge, es el comportamiento más seguro) → Zona + Sector;
  `supervision` (solicita la propia Zona) → solo Sector; `jefatura`/`subdireccion` (solicita el
  propio Sector o SEPRN) → nadie, no hay a quién notificar arriba en la jerarquía.
- Al recibir la solicitud usa `d.tipoCct` directo del payload; al cerrar lee la columna nueva de
  la fila (`COL_MAN_TIPO_SOLICITANTE_IDX`/`COL_ASE_TIPO_SOLICITANTE_IDX`).
- Verificado corriendo `manFiltrarContactosPorTipo`/`aseFiltrarContactosPorTipo` directo en el
  editor de Apps Script contra Sector I/Zona 1 (que tiene ambos contactos reales): escuela/vacío
  devuelve los 2 correos, `supervision` solo el de Sector, `jefatura` un arreglo vacío.
- Redesplegado el mismo día: `mantenimiento.gs` versión 9, `asesorias.gs` versión 8.

**Modo de prueba (11 ago 2026).** Ambos backends ganaron `manEnviarCorreo_()`/
`aseEnviarCorreo_()`, un wrapper alrededor de `MailApp.sendEmail()` que todos los envíos ya
pasaban a usar. Si la Script Property `MODO_PRUEBA_CORREO` está definida (activarla con
`manActivarModoPrueba('correo')`/`aseActivarModoPrueba('correo')` desde el editor de Apps
Script, desactivarla con `manDesactivarModoPrueba()`/`aseDesactivarModoPrueba()`), todo correo
saliente se redirige a ese correo con el asunto marcado `[PRUEBA]` y una nota indicando el
destino real (`to`/`cc` originales) — para poder probar el flujo completo de un trámite sin
avisar a escuelas/zonas/sectores reales ni gastar la cuota diaria de correo en pruebas. No
requiere redeploy para activar/desactivar, se lee en cada envío.

## 16. Webform de Correo Institucional en paralelo al Google Form (agosto 2026)

`otde.html` reemplazó, en código, el `<iframe>` del Google Form que hasta ahora capturaba las
4 solicitudes de correo institucional (Alta, Cambio de Contraseña, Reset 2FA, Incidencias).
Decisión de arquitectura central: el backend nuevo vive en un **proyecto de Apps Script
separado y paralelo** — `Correos-institucionales/webform-2026-2027/` (repo aparte, no
documentado en este archivo) — pensado para una Spreadsheet nueva del ciclo 2026-2027. El
sistema en vivo que usa Marcos hoy (`Correos-institucionales/Code.gs` +
`OnFormSubmit.gs`/`OnEditTrigger.gs`, atado al Form actual) **no se tocó**, sigue corriendo en
paralelo — retirarlo es decisión de Jorge, no automática. **Desplegado (6 ago 2026)**:
Spreadsheet `Solicitudes_Correo_2026_2027`, proyecto "Webform Correo 2026-2027 - Backend"; las
4 constantes en `otde.html` (`ALTA_CORREO_APPS_SCRIPT_URL`, `CAMBIO_APPS_SCRIPT_URL`,
`RESET_APPS_SCRIPT_URL`, `INCIDENCIA_APPS_SCRIPT_URL`) ya no tienen el placeholder
`PENDIENTE_DE_DESPLEGAR` — las 4 apuntan a la misma URL real, porque `WebApp.gs` enruta los 4
tipos por `datos.tipo` en un solo despliegue.

Se aprovechó el rediseño para consolidar 6 tipos de solicitud del sistema viejo (Alta dee, Alta
aulamexiquense, Cambio Contr dee, Cambio Contr aulamexiquense, Reset 2FA, Incidencias) en 4
(Alta, Cambio de Contraseña, Reset 2FA, Incidencias) — el dominio ya no es una rama separada
del flujo, es un dato calculado.

**Regla de dominio, verificada en vivo contra SIGEE** (el sistema real de CoEEE donde se
aprovisionan las cuentas, no hay API — ver `otdeDominioParaCCT(cct, tipoCuenta)` en
`js/cct-db.js`):
- CCT con `tipo` ∈ {supervision, jefatura, subdireccion} → dominio siempre `dee.edu.mx`.
- CCT con `tipo` = escuela → depende de si la cuenta es "personal" (`aulamexiquense.mx`) o "de
  oficina" (`dee.edu.mx`, una por escuela, representa al CT/directivo) — y esa pregunta solo se
  le muestra al solicitante si su Función es Director(a)/Subdirector(a); para el resto se fija
  en "personal" sin preguntar.
- CCT en fallback manual (no encontrado en `cct-db.js`) → no se puede derivar, se pide un
  selector explícito y queda marcado para revisión manual.

Esto significa que el docente promedio **nunca ve la pregunta** "¿tu correo es @dee.edu.mx o
@aulamexiquense.mx?" — el formulario se la resuelve.

Cambio de Contraseña, Reset 2FA e Incidencias son más simples: el dominio no se deriva, se lee
directo del sufijo del correo institucional que la persona ya tiene (no hace falta cruzar
contra `cct-db.js` para una cuenta que ya existe).

Refactor notable de esta ronda: con 4 formularios en la misma tab usando CCT-autocompletado
(§11), se factorizó `crearCctAutocomplete(prefijo)` en `otde.html` como función compartida —
única vez en el sitio que se hizo esto (Soporte/Mantenimiento/Asesorías mantienen su propia
copia del patrón, es la convención normal del resto del sitio; aquí la 4ª repetición casi
idéntica en un mismo archivo cruzó el umbral).

## 17. `cte.html`: archivo de ciclo escolar dentro de la misma página (agosto 2026)

Hasta el ciclo 2025-2026, `cte.html` era una sola lista plana de `.sesion-accordion` (acordeón
único: abrir uno cierra los demás, vía `toggleSesion()`). Al cerrar ese ciclo y arrancar
2026-2027, se decidió con Jorge **no crear una página nueva por ciclo** — el histórico se
archiva dentro de la misma `cte.html`, agrupado y colapsado por default, para no perder
materiales viejos sin dejar crecer la página sin límite ciclo tras ciclo.

Estructura resultante, de arriba a abajo dentro de `<section class="content-section">`:
1. `.section-header` con eyebrow "CICLO ESCOLAR" — encabezado del ciclo actual (mismo patrón
   `.section-header`/`.section-eyebrow`/`.section-title` de las páginas de área, ver tabla de
   clases reutilizables en `CLAUDE.md`).
2. Las `.sesion-accordion` normales del ciclo actual (la más reciente `active` + badge NUEVO,
   igual que siempre).
3. `.ciclo-archivo` — contenedor nuevo, no es una sesión más: agrupa **todas** las
   `.sesion-accordion` del ciclo ya cerrado. Header propio `.ciclo-archivo-toggle` con estilo
   deliberadamente secundario (paleta de `.link-sep`, `rgba(159,34,65,0.08)` + borde
   `#9F2241`, no el guinda sólido de `.sesion-header`) para leerse como "menos prioritario" que
   las sesiones activas. Colapsado por default (`aria-expanded="false"`, sin clase `active` al
   cargar).
4. Dentro de `.ciclo-archivo-content-inner`: las `.sesion-accordion` del ciclo cerrado, tal
   cual — mismo HTML, mismos `data-src` de lazy-load, sin ningún cambio de comportamiento.

**Dos funciones de toggle independientes, sin interferencia entre sí:**
- `toggleSesion()` (ya existía) sigue operando sobre `document.querySelectorAll('.sesion-accordion')`
  — no le importa si una sesión está anidada dentro de `.ciclo-archivo` o no, el acordeón único
  sigue funcionando exactamente igual en toda la página.
- `toggleCicloArchivo(toggle)` (nueva) solo hace `toggle.parentElement.classList.toggle('active')`
  sobre el contenedor `.ciclo-archivo` — no toca el estado de las sesiones que agrupa. Misma
  animación `grid-template-rows: 0fr → 1fr` que ya usaba `.sesion-content`, aplicada a
  `.ciclo-archivo-content`.

**Al cerrar el ciclo actual y arrancar el siguiente** (repetir cada año): mover las
`.sesion-accordion` del ciclo saliente dentro de `.ciclo-archivo-content-inner` (o crear un
`.ciclo-archivo` nuevo si no existía), quitarles `active`/badge NUEVO/`aria-expanded="true"`, y
agregar la Fase Intensiva del ciclo entrante arriba como la nueva sesión abierta. El acordeón
de archivo de ciclos aún más viejos se puede anidar o dejar como bloques `.ciclo-archivo`
independientes uno debajo del otro — no se probó todavía con más de un ciclo archivado.

**Los PDFs se reorganizaron junto con el HTML**: `pdfs/cte/<sesion>/` pasó a
`pdfs/cte/cte-<ciclo>/<sesion>/` (ej. `pdfs/cte/cte-2025-2026/octava-sesion/`,
`pdfs/cte/cte-2026-2027/cte-fase-intensiva/`). La subcarpeta de sesión de 2026-2027 sí lleva
prefijo `cte-` (`cte-fase-intensiva`) mientras que las de 2025-2026 no (`octava-sesion`,
`sexta-sesion`...) — inconsistencia menor y conocida, no corregida a propósito (así los nombró
Jorge al reorganizar la carpeta a mano).

## 18. Logomark: ícono NE/ZA en nav y footer (agosto 2026)

`favicon.svg` (rect `rx="12"` guinda + dos líneas de texto "NE"/"ZA", iniciales de
Nezahualcóyotl) ya existía como favicon. En agosto 2026 se decidió no diseñar un símbolo nuevo
—una guía de identidad gráfica del Gobierno del Estado de México (ver pendiente en `CLAUDE.md`)
reserva el Escudo de Armas oficial para una "pleca de logos" fija y no permite que cada
dependencia interna tenga su propio escudo— así que la misma marca se promovió a ícono del
sitio, con un único cambio: `font-family` de `Georgia,serif` a
`'Montserrat','Helvetica Neue',Arial,sans-serif`, para dejar de ser la única pieza del sitio
fuera de la tipografía del wordmark.

**Dónde vive:** inline en cada página, no como componente compartido (misma convención que
nav/footer, regla 3 de `CLAUDE.md`) — no un `<img src="favicon.svg">`. Dos usos:
- `.logo` (header nav): ícono 34×34 tal cual — fondo guinda `#56212f`, texto arena `#d6d1ca`.
- `.footer-brand` (footer): ícono 30×30 con **colorway invertido** — fondo `#F9F8F5`, texto
  guinda `#56212f`. Necesario porque el footer del sitio ya es guinda; el colorway del favicon
  desaparecería sobre su propio fondo.

`logo.svg` (nuevo, raíz del repo) es el lockup horizontal completo (ícono + wordmark "SEPRN")
como asset de referencia — no se usa directamente en ninguna página, es para reutilizar fuera
del sitio (impresos, futuro og:image) sin tener que reconstruirlo desde cero.

**Alcance:** las 13 páginas que comparten `styles.css` (`.logo-icon` en `styles.css`, junto a
`.logo`/`.footer-brand`). Deliberadamente sin tocar: `asistencia.html`, `charla-ia.html`,
`formacion-docente.html`, `instructivo-formacion-docente.html` — tienen su propio header o
sistema de diseño aparte (ver sección 12 y CLAUDE.md). `otde.html` sí tiene el ícono aplicado en
el repo, pero no llegó a `origin/main` en el primer push por conflicto con las pestañas de
Mantenimiento/Asesorías/Correo que aún no están publicadas — ver `docs/BITACORA.md`.
