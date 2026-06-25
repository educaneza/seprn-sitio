# Arquitectura y Convenciones — SEPRN Sitio Web

Describe el modelo mental del proyecto: cómo está construido, cómo fluye la información y qué reglas seguir para mantener la consistencia visual y técnica.

Ver [`ROADMAP.md`](ROADMAP.md) para el plan de mejoras hacia la versión premium.

---

## 1. Arquitectura general

El sitio es **100% estático**: HTML + CSS + JS. No hay servidor, base de datos, ni proceso de build.

```
Browser
  └── Carga HTML (cualquiera de los ~16 archivos)
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
| Google Apps Script | Backend registro de eventos | Web App con `doGet`/`doPost`; URL embebida en `conferencia-ia.html` y `asistencia.html` |
| GmailApp (Apps Script) | Correo de confirmación | Envía HTML con QR; remitente: "Oficina de Tecnología · Neza" |
| api.qrserver.com | Generación de QR en correo | URL dinámica con folio codificado; solo en correos de confirmación |
| html5-qrcode v2.3.8 | Escáner QR en `asistencia.html` | CDN `unpkg.com`; modo cámara trasera `environment` |

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
