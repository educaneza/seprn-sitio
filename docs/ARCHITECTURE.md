# Arquitectura y Convenciones — SEPRN Sitio Web

Este documento describe el modelo mental del proyecto: cómo está construido, cómo fluye la información y qué reglas hay que seguir para mantener la consistencia visual y técnica.

---

## 1. Arquitectura general

El sitio es **100% estático**: HTML + CSS + JS. No hay servidor, base de datos, ni proceso de build. Toda la "lógica" son manipulaciones del DOM con Vanilla JS inline.

```
Browser
  └── Carga HTML (cualquiera de los ~15 archivos)
        ├── Descarga styles.css (único, cacheado)
        ├── Descarga Montserrat desde Google Fonts
        ├── Ejecuta GA4 tag (en <head>)
        └── Ejecuta JS inline (al final de <body>)
              ├── IntersectionObserver (animaciones de entrada)
              ├── Acordeones CTE (toggleSesion)
              └── Tooltip del mapa SVG
```

No hay estado global, ni localStorage, ni cookies propias. La única "persistencia" es la analítica de GA4.

---

## 2. Estructura de plantilla por página

Cada página sigue este esqueleto HTML:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <!-- GA4 tag — debe ir DENTRO de <head> -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="[Descripción única ~150 chars]">
    <title>[Nombre Sección] - SEPRN</title>
    <link rel="stylesheet" href="styles.css">
    <!-- Estilos locales SOLO si son exclusivos de esta página -->
    <style> ... </style>
</head>
<body>
    <!-- 1. Header/Nav (idéntico en todas las páginas) -->
    <header> ... </header>

    <!-- 2. Contenido principal -->
    <main>
        <section class="content-section"> ... </section>
    </main>

    <!-- 3. Footer (idéntico en todas las páginas) -->
    <footer> ... </footer>

    <!-- 4. Scripts inline al final del body (si aplica) -->
    <script> ... </script>
</body>
</html>
```

**Reglas críticas:**
- El tag de GA4 siempre va dentro de `<head>`, como primera línea.
- El `<main>` envuelve el contenido principal (semántica + accesibilidad).
- Los scripts van al final del `<body>`, nunca en `<head>`.

---

## 3. Sistema de estilos

### Archivo global: `styles.css`

Contiene los componentes reutilizables. Toca este archivo solo cuando el cambio aplica a **todas** las páginas.

| Bloque CSS | Qué define |
|---|---|
| `*` reset | `box-sizing`, `margin`, `padding` |
| `body` | Fuente base, color, line-height |
| `header` / `nav` | Barra de navegación sticky |
| `.logo` | Logotipo SEPRN |
| `nav a`, `nav a:hover` | Links del menú y sus estados |
| `.hero` | Sección hero de la portada |
| `.area-card` | Tarjetas de áreas en portada |
| `.leadership` | Sección de equipo directivo (portada) |
| `footer` | Pie de página global |
| `.content-section` | Contenedor de páginas internas |
| `.video-grid` / `.video-card` | Grid de videos |
| `@media (max-width: 768px)` | Breakpoint mobile |

### Estilos locales (en `<style>` dentro del `<head>` de cada página)

Úsalos **solo** para componentes que no existen en ninguna otra página. Ejemplos actuales:
- `.sesion-accordion` — exclusivo de `cte.html`
- `.info-section`, `.value-card`, `.stat-card` — exclusivo de `nosotros.html`
- `.area-hero`, `.funciones-lista` — exclusivo de páginas de área

**Nunca** redefinir en estilos locales clases que ya existen en `styles.css` (como `.area-card`) porque genera ambigüedad.

---

## 4. Sistema de diseño (Design Tokens)

### Paleta de colores

```css
/* Primarios institucionales */
--color-guinda-dark:   #56212f;   /* Textos, headers, footer bg */
--color-guinda-mid:    #9F2241;   /* Acentos, CTAs, hover states */

/* Neutros cálidos */
--color-arena:         #d6d1ca;   /* Fondos de tarjetas */
--color-caramel:       #977e5b;   /* Subtítulos secundarios */
--color-gold-soft:     #c3b08f;   /* Footer copy, details */
--color-cream:         #ddc8a4;   /* Footer links */

/* Fondos */
--color-bg-white:      #ffffff;
--color-bg-warm:       #f9f8f6;   /* Secciones alternas */

/* Texto */
--color-text-primary:  #333333;   /* Cuerpo de texto (NO usar #000000) */
--color-text-muted:    #666666;   /* Texto secundario */
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

**Regla**: letter-spacing negativo en headings grandes (`-0.5px` a `-1.5px`) para apariencia moderna. `line-height: 1.8` en cuerpos de texto largo.

### Espaciado

El sistema de espaciado sigue múltiplos de 10px:
- **xs**: 10–15px
- **sm**: 20–30px
- **md**: 40–50px
- **lg**: 60–80px
- **xl**: 100–120px

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

### Header / Nav

```html
<header>
    <nav>
        <div class="logo">SEPRN</div>
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

**Regla**: Estos 5 ítems en este orden en TODAS las páginas. En la página actual, agregar `class="active"` al `<a>` correspondiente (requiere regla CSS `.active` en `styles.css`).

### Footer

Bloque idéntico en todas las páginas. Si cambia la dirección o el horario, hay que actualizarlo en los ~15 archivos. **Propuesta de mejora**: extraer a un componente incluido via JS o usar `fetch()`.

### Acordeón CTE (`sesion-accordion`)

Cada sesión es un bloque independiente:

```html
<div class="sesion-accordion [active]">
    <div class="sesion-header" onclick="toggleSesion(this)">
        <div class="sesion-header-text">
            <h2>📅 [Nombre Sesión] [Año ciclo escolar]</h2>
            <p>[Descripción breve]</p>
        </div>
        <div class="sesion-toggle">▼</div>
    </div>
    <div class="sesion-content">
        <!-- videos, materiales, link SEP -->
    </div>
</div>
```

- Solo agregar `class="active"` a la sesión más reciente.
- El JS en `cte.html` cierra todas las demás al abrir una.
- `max-height: 2500px` en `.sesion-accordion.active .sesion-content` es un workaround; no exceder ese contenido por sesión.

### Mapa SVG (Cobertura)

El mapa está hardcodeado como SVG en `index.html`. Los municipios son polígonos `<polygon>` con atributos `data-nombre` y `data-sector`. El tooltip es manejado por JS inline. Para agregar/modificar un municipio: editar los `points` del polígono correspondiente.

---

## 6. Flujo de actualización de contenido

### Agregar nueva sesión CTE

1. Crear subcarpeta: `pdfs/cte/[nombre]-sesion/`
2. Subir archivos (DOCX, PPTX, PDF, ZIP).
3. En `cte.html`:
   - Cambiar `class="sesion-accordion active"` → `class="sesion-accordion"` en la sesión anterior.
   - Pegar un nuevo bloque `sesion-accordion` al inicio (después de la sección `content-section`), con `class="active"` y badge "NUEVO".
4. Hacer commit y push.

### Actualizar equipo directivo

Editar `nosotros.html` (bloque "Equipo de Trabajo", líneas ~356–412) y `areas.html` (campo `area-responsable` de cada tarjeta).

### Agregar nueva página de área

1. Copiar `juridico.html` como plantilla (es la más simple).
2. Actualizar `<title>`, header, contenido.
3. Agregar tarjeta en `areas.html`.
4. Agregar enlace en `nosotros.html` (organigrama).

---

## 7. Integraciones externas

| Servicio | Propósito | Configuración |
|---|---|---|
| Google Analytics 4 | Analítica de visitas | ID: `G-7D68DB8ELW` — en `<head>` de cada página |
| Google Fonts | Tipografía Montserrat | Import en `styles.css` línea 1 |
| Google Maps Embed | Mapa en `contacto.html` | URL de embed en el `<iframe>` |
| YouTube Embed | Videos de sesiones CTE | `src="https://www.youtube.com/embed/[VIDEO_ID]"` |
| Portal SEP CTE | Link externo | `https://gestion.cte.sep.gob.mx/insumos/#!/` |
| Facebook | Redes sociales | `https://www.facebook.com/SubNeza` |
| YouTube Channel | Redes sociales | `https://www.youtube.com/channel/UCvDb2DPSJxFyhH3bCPd5D2Q` |

**Nota sobre YouTube**: Para ahorrar ancho de banda y acelerar la carga, los iframes de sesiones CTE **colapsadas** deberían cargarse solo al abrir el acordeón (`loading="lazy"` o creando el iframe dinámicamente con JS). Actualmente se cargan todos al mismo tiempo.

---

## 8. Bugs conocidos y pendientes

Ver también el reporte completo en el historial de commits.

| # | Severidad | Descripción | Archivo(s) |
|---|---|---|---|
| 1 | Alta | GA4 script fuera de `<head>` (entre `<html>` y `<head>`) | Todos los HTML |
| 2 | Alta | `referrerpolicy="strict-origin-when-cross-cross"` (typo) | `cte.html` (líneas ~500, ~715) |
| 3 | Media | Nav de `contacto.html` omite "Nosotros" | `contacto.html` |
| 4 | Media | No hay regla CSS para `.active` en nav | `styles.css` |
| 5 | Media | `target="_blank"` sin `rel="noopener noreferrer"` | Todos los HTML |
| 6 | Media | No hay menú hamburguesa para móvil | `styles.css` + todos los HTML |
| 7 | Baja | `text-align: justify` en textos de `nosotros.html` | `nosotros.html` |
| 8 | Baja | Color de texto `#000000` (usar `#333`) | `styles.css` |
| 9 | Baja | No hay `<meta name="description">` en ninguna página | Todos los HTML |
| 10 | Baja | `presentacion-adicional-tema12.pptx` en disco no está enlazado | `cte.html` |

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
- [ ] Nav completo con los 5 ítems + `class="active"` en el ítem actual
- [ ] Footer completo (copiar del template)
- [ ] `rel="noopener noreferrer"` en todos los `target="_blank"`
- [ ] Sin `text-align: justify`
- [ ] Texto de cuerpo en `#333` (no `#000`)
