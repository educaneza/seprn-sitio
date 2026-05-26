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
        ├── Descarga Montserrat desde Google Fonts (@import en styles.css — pendiente migrar a <link>)
        ├── Ejecuta GA4 tag (en <head>)
        └── Ejecuta script.js (defer, al final del body)
              └── Hamburger menu (nav-toggle)
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
    <!-- PENDIENTE (Fase 1.3): reemplazar con <link rel="preconnect"> + <link> para Google Fonts -->
    <link rel="stylesheet" href="styles.css">
    <!-- PENDIENTE (Fase 1.8): <link rel="icon" href="favicon.svg" type="image/svg+xml"> -->
    <!-- Estilos locales SOLO si son exclusivos de esta página -->
    <style> ... </style>
</head>
<body>
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
    <section class="content-section"> ... </section>

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
- Al página actual: `class="active"` + `aria-current="page"` en el `<a>` correspondiente (pendiente Fase 1.1 y 1.6).

---

## 3. Sistema de estilos

### Archivo global: `styles.css`

Toca este archivo solo cuando el cambio aplica a **todas** las páginas.

| Bloque CSS | Qué define |
|---|---|
| `@import` Google Fonts | Montserrat 300–700 (pendiente migrar a `<link>` — Fase 1.3) |
| `*` reset | `box-sizing`, `margin`, `padding` |
| `body` | Fuente base, `color: #333333`, line-height |
| `header` / `nav` | Barra de navegación sticky |
| `.logo` | Logotipo texto SEPRN |
| `nav a`, `nav a:hover`, `nav a.active` | Links del menú y sus estados |
| `.nav-toggle` | Botón hamburguesa mobile (3 spans → X) |
| `:focus-visible` | Outline de accesibilidad 2px guinda |
| `.hero` | Sección hero de la portada |
| `.area-card` | Tarjetas de áreas en portada |
| `.leadership` | Sección de equipo directivo (portada) |
| `footer` | Pie de página global |
| `.content-section` | Contenedor de páginas internas |
| `.video-grid` / `.video-card` | Grid de videos |
| `@media (max-width: 768px)` | Breakpoint mobile principal |
| `@media (max-width: 480px)` | Breakpoint mobile pequeño |

### Estilos locales (en `<style>` dentro del `<head>` de cada página)

Úsalos **solo** para componentes que no existen en ninguna otra página:
- `.sesion-accordion` — exclusivo de `cte.html`
- `.info-section`, `.value-card`, `.stat-card` — exclusivo de `nosotros.html`
- `.area-hero`, `.funciones-lista`, `.oficinas-grid` — exclusivo de páginas de área

**Nunca** redefinir clases que ya existen en `styles.css` (como `.area-card`) en estilos locales.

---

## 4. Sistema de diseño (Design Tokens)

### Estado actual
Los valores están hardcodeados en el CSS. La migración a CSS Custom Properties (`:root`) está planificada en **Fase 2.7** del roadmap.

### Paleta de colores

```css
/* Propuesta de variables (Fase 2.7) */
:root {
    --color-brand-dark:    #56212f;   /* Textos, headers, footer bg */
    --color-brand-accent:  #9F2241;   /* Acentos, CTAs, hover states */
    --color-brand-hover:   #6d2a3d;   /* Hover de brand-dark */

    --color-sand:          #d6d1ca;   /* Fondos de tarjetas, separadores */
    --color-sand-light:    #ebe9e4;
    --color-caramel:       #977e5b;   /* Subtítulos (NO pasar solo WCAG AA) */
    --color-caramel-dark:  #6b5a44;   /* Versión AA-compliant sobre blanco */
    --color-gold:          #c3b08f;

    --color-bg-white:      #ffffff;
    --color-bg-warm:       #f9f8f6;
    --color-bg-warm-alt:   #f0ede8;

    --color-text-primary:  #333333;
    --color-text-secondary:#555555;
    --color-text-muted:    #6b5a44;   /* AA-compliant sobre blanco */
}
```

### Tipografía

| Elemento | Tamaño desktop | Tamaño mobile | Peso |
|---|---|---|---|
| Hero H1 | 56px | 40px | 600 |
| Sección H1 | 48px | 36px | 600 |
| H2 | 32–40px | — | 600 |
| H3 | 24px | — | 600 |
| Cuerpo | 16px | 16px | 400 |
| Pequeño / label | 14px | — | 400–500 |
| Micro / copyright | 12px | — | 400 |

Reglas: letter-spacing negativo en headings (`-0.5px` a `-1.5px`). `line-height: 1.8` en cuerpos largos. **Sin `text-align: justify`**.

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

## 5. Componentes documentados

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

**Pendiente (Fase 1.1 / 1.6):** Agregar `class="active"` + `aria-current="page"` al `<a>` de la página actual en los 16 archivos HTML.

### Footer

Bloque idéntico en todas las páginas. Si cambia la dirección o el horario, hay que actualizarlo en los ~16 archivos. **Deuda técnica**: considerar extraer a un componente via `fetch()` en el futuro.

### Acordeón CTE (`sesion-accordion`)

```html
<div class="sesion-accordion [active]">
    <div class="sesion-header" onclick="toggleSesion(this)">
        <div class="sesion-header-text">
            <h2>[Nombre Sesión] [Ciclo escolar]</h2>
            <p>[Descripción breve]</p>
        </div>
        <div class="sesion-toggle">▼</div>
    </div>
    <div class="sesion-content">
        <!-- videos (src en activa, data-src en colapsadas), materiales, link SEP -->
    </div>
</div>
```

**Estado actual:**
- Solo la sesión más reciente lleva `class="active"`.
- Los iframes de sesiones colapsadas usan `data-src` (lazy load al abrir).
- El JS en `cte.html` cierra todas las demás al abrir una y carga los iframes.
- `max-height: 2500px` es un workaround para la animación — se reemplazará con `grid-template-rows` en Fase 2.3.

**Pendiente (Fase 1.5 / 1.9):** Cambiar `<div onclick>` a `<button>` con `aria-expanded`, y `▼▶` a SVG chevron con CSS `rotate`.

### Grid de materiales (CTE)

Cada material usa `.material-item` con un `.material-icon` SVG (PNG por tipo de archivo), `.material-info` y un `<a href>` con `download`.

- PDF → icono de documento con líneas
- DOCX → icono de documento con W
- PPTX → icono de presentación
- ZIP → icono de caja/archivo comprimido

Los paths de archivos con acentos o espacios deben estar URL-encoded (ej. `S%C3%A9ptima-sesion.zip`, `fase3%20segundo-1.pdf`).

### Mapa SVG (Cobertura)

Hardcodeado en `index.html`. Municipios como `<polygon>` con `data-nombre` y `data-sector`. El tooltip se maneja con JS inline. **Pendiente (Fase 3.3):** Agregar soporte touch.

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
| Google Fonts | Tipografía Montserrat | `@import` en `styles.css` línea 1 (pendiente migrar a `<link>` — Fase 1.3) |
| Google Maps Embed | Mapa en `contacto.html` | URL de embed en el `<iframe>` |
| YouTube Embed | Videos de sesiones CTE | `src` (sesión activa) / `data-src` (colapsadas, lazy load) |
| Portal SEP CTE | Link externo | `https://gestion.cte.sep.gob.mx/insumos/#!/` |
| Facebook | Redes sociales | `https://www.facebook.com/SubNeza` |
| YouTube Channel | Redes sociales | `https://www.youtube.com/channel/UCvDb2DPSJxFyhH3bCPd5D2Q` |

---

## 8. Bugs y deuda técnica

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

### Pendientes (referenciados en el Roadmap)

| # | Problema | Archivo(s) | Fase |
|---|---|---|---|
| P1 | Sin `class="active"` en nav de 14+ páginas | Todos los HTML | Fase 1.1 |
| P2 | Sección cobertura rota en mobile (sin media query) | `index.html` | Fase 1.2 |
| P3 | Google Fonts via `@import` (render-blocking) | `styles.css` + todos | Fase 1.3 |
| P4 | Contraste subtítulo hero: `#977e5b` (ratio 3.5:1, falla WCAG AA) | `styles.css` | Fase 1.4 |
| P5 | Accordion headers son `<div onclick>` (no semántico) | `cte.html` | Fase 1.5 |
| P6 | Sin `aria-current="page"` en ninguna página | Todos los HTML | Fase 1.6 |
| P7 | Touch targets insuficientes en nav mobile | `styles.css` | Fase 1.7 |
| P8 | Sin favicon en ninguna página | Todos los HTML | Fase 1.8 |
| P9 | Toggles accordion con caracteres `▼▶` (no fluido) | `cte.html` | Fase 1.9 |
| P10 | CSS custom properties no implementadas | `styles.css` | Fase 2.7 |
| P11 | Animación accordion con `max-height` (no lineal) | `cte.html` | Fase 2.3 |
| P12 | Footer duplicado en 16 archivos | Todos los HTML | Deuda técnica |

---

## 9. Checklist para nuevas páginas

Antes de hacer commit de una página nueva:

- [ ] `<html lang="es">`
- [ ] GA4 tag **dentro** de `<head>` (primera línea de `<head>`)
- [ ] `<meta charset="UTF-8">`
- [ ] `<meta name="viewport" ...>`
- [ ] `<meta name="description" content="...">`
- [ ] `<title>[Sección] - SEPRN</title>`
- [ ] `<link rel="stylesheet" href="styles.css">`
- [ ] Nav completo con los 5 ítems + botón `nav-toggle` + `class="active"` en el ítem actual
- [ ] Footer completo (copiar del template)
- [ ] `<script src="script.js" defer></script>` antes de `</body>`
- [ ] `rel="noopener noreferrer"` en todos los `target="_blank"`
- [ ] Sin `text-align: justify`
- [ ] Texto de cuerpo en `#333333` (no `#000000`)
- [ ] Sin emojis en headings (usar SVG inline o Unicode limpio)
