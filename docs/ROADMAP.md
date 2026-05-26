# Roadmap de Mejoras — SEPRN Sitio Web

Documento generado a partir de la auditoría UX/UI completa del 26 de mayo de 2026.
Objetivo: elevar el sitio de un nivel **5/10** (funcional-institucional 2019) a un **8.5/10** (producto digital premium institucional) sin cambiar el stack tecnológico (HTML/CSS/JS puro).

---

## Estado actual — Scores de auditoría

| Dimensión | Score actual | Score objetivo |
|-----------|:---:|:---:|
| UI | 5/10 | 8/10 |
| UX | 5/10 | 8/10 |
| Branding | 3/10 | 7/10 |
| Profesionalismo | 5/10 | 9/10 |
| Claridad | 6/10 | 9/10 |
| Conversión / Retención | 3/10 | 7/10 |
| Diseño móvil | 4/10 | 8/10 |
| Performance percibida | 6/10 | 8/10 |

---

## FASE 1 — Quick Wins
**Objetivo:** Corregir lo que está roto sin tocar la estructura visual. Todo debería quedar en un sprint de 1–2 horas de trabajo.

### 1.1 Bug crítico: nav activo en 14 páginas
**Problema:** `class="active"` en el link del nav correspondiente falta en `index.html`, `cte.html`, `nosotros.html`, y todas las páginas de área.
**Archivos:** Los 16 HTML.
**Tarea:** Agregar `class="active"` al `<a>` correcto en cada página.
**Resultado:** El usuario sabe dónde está en todo momento.

### 1.2 Bug crítico: layout roto de cobertura en mobile
**Problema:** La sección "Nuestra Cobertura" en `index.html` usa `grid-template-columns: 1fr 1fr` sin media query. En móvil, el mapa SVG se comprime a ~150px (inutilizable) y la lista de 18 municipios en 2 columnas queda ilegible.
**Archivo:** `index.html` (inline styles del bloque cobertura, líneas ~110–265).
**Tarea:**
- Añadir `@media (max-width: 768px)` que cambie el grid a `grid-template-columns: 1fr` (columna única, mapa arriba).
- En mobile, ocultar el mapa SVG o reemplazarlo por un placeholder con texto informativo.
- El grid de municipios (`grid-template-columns: 1fr 1fr`) también necesita colapsar a 1 columna en < 480px.

### 1.3 Performance: Google Fonts bloqueante
**Problema:** `@import url(...)` en `styles.css` bloquea el render del CSS hasta que la fuente descarga (~300–600ms en móvil 3G).
**Archivo:** `styles.css` línea 1 + `<head>` de todos los HTML.
**Tarea:**
1. Eliminar el `@import` de `styles.css`.
2. Agregar en el `<head>` de todos los HTML (antes de `styles.css`):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap">
```

### 1.4 Accesibilidad: contraste del subtítulo hero
**Problema:** `color: #977e5b` sobre fondo blanco = ratio 3.5:1 (mínimo WCAG AA: 4.5:1). Ilegible para usuarios con baja visión.
**Archivo:** `styles.css`
**Tarea:** Cambiar `.hero p { color: #977e5b }` → `color: #6b5a44` (ratio ~4.8:1, pasa AA).

### 1.5 Accesibilidad: accordion como `<button>` con `aria-expanded`
**Problema:** Los headers del acordeón CTE son `<div onclick>`. No son semánticamente interactivos ni accesibles para screen readers.
**Archivo:** `cte.html`
**Tarea:**
- Cambiar `<div class="sesion-header" onclick="toggleSesion(this)">` → `<button class="sesion-header" onclick="toggleSesion(this)" aria-expanded="true/false">`.
- Actualizar CSS: resetear estilos de `<button>` (`background: none; border: none; width: 100%; text-align: left; cursor: pointer; font: inherit`).
- Actualizar `toggleSesion()` para que sincronice `aria-expanded`.

### 1.6 Accesibilidad: `aria-current` en nav
**Archivo:** Todos los HTML.
**Tarea:** Al mismo tiempo que se agrega `class="active"`, agregar `aria-current="page"` al mismo `<a>`.

### 1.7 UX mobile: touch targets insuficientes
**Problema:** Los links del menú mobile tienen `padding: 12px 4px`. El padding lateral de `4px` produce un área táctil de ~165px de ancho pero solo visualmente — el área de clic real puede ser menor. Además, 44px de altura mínima recomendada por Apple/Google.
**Archivo:** `styles.css`
**Tarea:** En el bloque `@media (max-width: 768px)`, cambiar `nav ul li a { padding: 12px 4px }` → `padding: 14px 12px`.

### 1.8 Branding: favicon
**Problema:** Sin favicon. Todas las pestañas muestran el icono genérico del navegador.
**Archivo:** Todos los HTML + crear `favicon.svg`.
**Tarea:**
- Crear `favicon.svg` minimalista (las letras "SP" estilizadas o un escudo simplificado en guinda `#56212f`).
- Agregar `<link rel="icon" href="favicon.svg" type="image/svg+xml">` en el `<head>` de todos los HTML.

### 1.9 Reemplazar `▼ ▶` por chevrons SVG
**Problema:** Los toggles del acordeón CTE usan caracteres Unicode crudos. Se ven como 1999 y no tienen animación fluida.
**Archivo:** `cte.html` + CSS del acordeón.
**Tarea:**
- Reemplazar el `<div class="sesion-toggle">▼</div>` por un SVG inline de chevron.
- CSS: `transform: rotate(0deg)` en reposo, `rotate(180deg)` en `.active` con `transition: transform 0.3s`.
- Eliminar el JS que cambia el texto del toggle a `▶`/`▼`.

```html
<!-- Reemplazar -->
<div class="sesion-toggle">▼</div>

<!-- Con -->
<div class="sesion-toggle">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
    </svg>
</div>
```

```css
.sesion-toggle {
    transition: transform 0.3s ease;
    display: flex;
    align-items: center;
}
.sesion-accordion.active .sesion-toggle {
    transform: rotate(180deg);
}
```

---

## FASE 2 — Elevación visual
**Objetivo:** Elevar la calidad percibida. Modernizar los componentes que más dañan la percepción premium.

### 2.1 Rediseñar las tarjetas de áreas del index
**Problema:** `background: #d6d1ca` con hover que oscurece el fondo. Evoca "tarjeta de presentación genérica". Sin ícono.
**Archivo:** `styles.css`, `index.html`
**Tarea:**
- Cambiar a `background: white`, `border: 1px solid #ebe9e4`, `box-shadow: 0 2px 8px rgba(86,33,47,0.06)`.
- Hover: `box-shadow: 0 12px 32px rgba(86,33,47,0.12)`, `border-color: #d6d1ca`, `transform: translateY(-4px)`.
- Agregar íconos SVG a las 7 tarjetas del index (reutilizar los de `areas.html`).

### 2.2 Eliminar gradientes en CTE
**Problema:** `linear-gradient(135deg, #56212f 0%, #9F2241 100%)` en los headers del acordeón. Los dos colores son tan similares que el gradiente se ve plano y sucio. Estética 2015.
**Archivo:** `cte.html` (bloque `<style>`)
**Tarea:**
- Cambiar a `background: #56212f` (color sólido).
- Agregar `border-left: 4px solid #9F2241` al header para dar el acento visual sin el gradiente.
- Hover: `background: #6d2a3d`.

### 2.3 Arreglar la animación del acordeón CTE
**Problema:** `max-height: 0 → 2500px` con `ease-out` produce una animación no lineal percibida: el contenido aparece bruscamente y luego la transición se "extiende" en el vacío.
**Archivo:** `cte.html`
**Tarea — Reemplazar con la técnica `grid-template-rows`:**
```css
/* Reemplazar */
.sesion-content {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s ease-out;
    padding: 0 35px;
}
.sesion-accordion.active .sesion-content {
    max-height: 2500px;
    padding: 35px;
}

/* Con */
.sesion-content-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.35s ease;
}
.sesion-accordion.active .sesion-content-wrapper {
    grid-template-rows: 1fr;
}
.sesion-content {
    overflow: hidden;
    padding: 0 35px;
}
.sesion-accordion.active .sesion-content {
    padding: 35px;
}
```
> Nota: Requiere envolver `.sesion-content` en un `<div class="sesion-content-wrapper">` en el HTML.

### 2.4 Agregar CTAs al hero del index
**Problema:** El hero termina sin ninguna acción. El usuario no tiene dirección.
**Archivo:** `index.html`
**Tarea:** Agregar después del `<p>` del hero:
```html
<div class="hero-ctas">
    <a href="cte.html" class="btn-primary">Ver materiales CTE</a>
    <a href="areas.html" class="btn-secondary">Conocer áreas</a>
</div>
```
**Estilos en `styles.css`:**
```css
.hero-ctas {
    display: flex;
    gap: 16px;
    justify-content: center;
    margin-top: 40px;
    flex-wrap: wrap;
}
.btn-primary {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    background: #56212f;
    color: white;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: background 0.2s, transform 0.2s;
}
.btn-primary:hover {
    background: #9F2241;
    transform: translateY(-2px);
}
.btn-secondary {
    display: inline-flex;
    align-items: center;
    padding: 14px 28px;
    background: transparent;
    color: #56212f;
    border: 2px solid #d6d1ca;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    text-decoration: none;
    transition: border-color 0.2s, transform 0.2s;
}
.btn-secondary:hover {
    border-color: #9F2241;
    transform: translateY(-2px);
}
```

### 2.5 Señales de legitimidad institucional
**Problema:** No hay ninguna señal de que este sea el sitio oficial. Sin escudo, sin referencia a SEIEM/SEEMx, sin código de la subdirección.
**Archivos:** Footer en todos los HTML.
**Tarea:**
- Agregar en el footer, debajo del copyright: `<p>Dependencia de SEIEM — Servicios Educativos Integrados al Estado de México</p>`.
- Agregar el escudo/logo de SEIEM como imagen SVG o PNG en el footer (si se tiene el archivo oficial).
- Alternativa inmediata: agregar número oficial de la subdirección en el footer.

### 2.6 Romper la monotonía visual en nosotros.html
**Problema:** 6 bloques consecutivos con `background: #d6d1ca`, mismo radius, mismo padding. El ojo no tiene puntos de descanso.
**Archivo:** `nosotros.html`
**Tarea:** Alternar fondos:
- Misión: `background: white`, borde sutil.
- Visión: `background: #f9f8f6`.
- Valores: `background: #56212f` (fondo oscuro, texto blanco — momento de impacto visual).
- Objetivo: `background: white`.
- Población + Estadísticas: `background: #f9f8f6` con stats en tarjetas blancas.
- Organigrama: `background: white`.
- Equipo: sin contenedor, grid directo sobre fondo de página.

### 2.7 Sistema de CSS Custom Properties (Design Tokens)
**Problema:** Los valores de color, espaciado y radio están hardcodeados en ~150 lugares distintos del CSS y HTML.
**Archivo:** `styles.css` — inicio del archivo.
**Tarea:** Agregar al inicio:
```css
:root {
    /* Color — Institucional */
    --color-brand-dark:    #56212f;
    --color-brand-accent:  #9F2241;
    --color-brand-hover:   #6d2a3d;

    /* Color — Neutros cálidos */
    --color-sand:          #d6d1ca;
    --color-sand-light:    #ebe9e4;
    --color-caramel:       #977e5b;
    --color-caramel-dark:  #6b5a44;   /* versión AA-compliant */
    --color-gold:          #c3b08f;

    /* Color — Fondos */
    --color-bg-white:      #ffffff;
    --color-bg-warm:       #f9f8f6;
    --color-bg-warm-alt:   #f0ede8;

    /* Color — Texto */
    --color-text-primary:  #333333;
    --color-text-secondary:#555555;
    --color-text-muted:    #6b5a44;   /* AA-compliant sobre blanco */

    /* Tipografía */
    --font-base:           'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
    --text-xs:             12px;
    --text-sm:             14px;
    --text-base:           16px;
    --text-lg:             18px;
    --text-xl:             21px;
    --text-2xl:            24px;
    --text-3xl:            32px;
    --text-4xl:            40px;
    --text-5xl:            48px;
    --text-hero:           56px;

    /* Espaciado */
    --space-xs:            8px;
    --space-sm:            16px;
    --space-md:            24px;
    --space-lg:            40px;
    --space-xl:            60px;
    --space-2xl:           80px;
    --space-3xl:           100px;

    /* Bordes */
    --radius-sm:           8px;
    --radius-md:           12px;
    --radius-lg:           18px;
    --radius-pill:         999px;

    /* Sombras */
    --shadow-ambient:      0 2px 8px rgba(86,33,47,0.06);
    --shadow-hover:        0 12px 32px rgba(86,33,47,0.12);
    --shadow-card-active:  0 8px 30px rgba(159,34,65,0.15);

    /* Transiciones */
    --transition-fast:     0.15s ease;
    --transition-base:     0.25s ease;
    --transition-slow:     0.4s ease;
}
```
Luego migrar `styles.css` para usar estas variables. Las páginas con estilos inline se migran en Fases posteriores.

---

## FASE 3 — Premium / Identidad
**Objetivo:** Convertir el sitio en un producto institucional de referencia. Requiere decisiones de diseño y activos gráficos.

### 3.1 Logomark SEPRN
**Problema:** "SEPRN" en Montserrat 22px no es un logo. Sin símbolo, sin identidad visual propia.
**Entregable requerido:** Un archivo `logo.svg` con:
- Símbolo/ícono (escudo simplificado, libro, o glifo geométrico en guinda).
- Wordmark "SEPRN" en Montserrat 600.
- Versión horizontal (nav) y cuadrada (favicon, redes).
**Dónde usar:** Header nav, footer, favicon, meta og:image.

### 3.2 Rediseño del hero
**Problema:** Hero puramente textual. Sin ancla visual. Sin composición.
**Dirección de diseño:**
```
[Logo grande / símbolo SEPRN]
[Headline principal 56px]
[Subtítulo 18px]
[CTA primario] [CTA secundario]
[Badge de confianza: "121,332 alumnos | 18 municipios | 13 sectores"]
```
Alternativa con split layout:
- Columna izquierda: texto + CTAs.
- Columna derecha: mapa SVG estilizado o datos estadísticos visuales.

### 3.3 Mapa SVG responsive con touch
**Problema:** El mapa solo funciona en hover (desktop). En mobile es una mancha decorativa sin información.
**Tarea:**
- Agregar `touchstart` y `touchend` events al JS del mapa.
- En mobile (<768px): mostrar un label fijo con el nombre del municipio al tocar.
- Considerar: reemplazar los polígonos aproximados por paths más precisos basados en GeoJSON real de los municipios.

### 3.4 Barra de "Última actualización CTE"
**Objetivo:** Retención. Los usuarios frecuentes (docentes, directores) vuelven al sitio principalmente para materiales CTE.
**Tarea:** Agregar en `index.html`, debajo del nav, una barra de notificación:
```html
<div class="update-banner">
    <span>Nuevo</span>
    Séptima Sesión Ordinaria 2025-2026 disponible
    <a href="cte.html">Ver materiales →</a>
</div>
```
Esta barra debe actualizarse manualmente cada vez que se agrega una sesión.

### 3.5 Footer rediseñado con navegación
**Problema:** Footer solo muestra contacto y redes. Sin mapa de navegación.
**Tarea:** Rediseñar el footer con columnas:
```
Col 1: Logo + descripción institucional
Col 2: Navegación (Inicio / Nosotros / Áreas / CTE / Contacto)
Col 3: Áreas de atención (links a las 7 páginas de área)
Col 4: Contacto + redes
```

### 3.6 Página 404 personalizada
**Problema:** Si un usuario llega a una URL inválida en GitHub Pages, ve la página 404 genérica de GitHub.
**Tarea:** Crear `404.html` con el mismo diseño del sitio, mensaje amigable y CTA hacia el inicio.

### 3.7 Rediseño de `nosotros.html` con variedad visual
**Ver detalle en Fase 2.6.** Esta es la versión avanzada con el bloque de valores en fondo oscuro, las estadísticas como tarjetas destacadas, y el equipo en grid con avatars con iniciales.

### 3.8 Animaciones de entrada mejoradas
**Problema:** El `IntersectionObserver` artesanal en `nosotros.html` crea N observadores independientes para cada grupo de elementos. Además, `opacity: 0; transform: translateY(30px)` en el HTML causa FOIC (flash of invisible content) si JS tarda.
**Tarea:**
- Consolidar en 1 solo `IntersectionObserver` con atributo `data-animate`.
- Usar `animation-delay` escalonado por CSS, no por `setTimeout`.
- Fallback: los elementos deben ser visibles si JS no carga (no `opacity: 0` en el CSS estático, sino añadido via JS).

---

## Priorización visual (matriz impacto / esfuerzo)

```
ALTO IMPACTO / BAJO ESFUERZO          ALTO IMPACTO / ALTO ESFUERZO
─────────────────────────────         ──────────────────────────────
✓ Nav active states (14 páginas)      → Logomark SEPRN
✓ Contraste hero subtitle             → Hero split layout con visual
✓ Cobertura mobile fix                → Mapa responsive con touch
✓ Google Fonts → <link>               → Rediseño nosotros.html
✓ Favicon SVG                         → Footer multi-columna
✓ Chevrons SVG en accordion
✓ Touch targets mobile nav
✓ CTAs en hero
✓ Tokens CSS (:root variables)
✓ Gradientes CTE → sólido
✓ Señales de legitimidad
✓ Animación accordion (grid-rows)

BAJO IMPACTO / BAJO ESFUERZO         BAJO IMPACTO / ALTO ESFUERZO
─────────────────────────────         ──────────────────────────────
→ aria-current en nav                 → Precisión geográfica del mapa SVG
→ button semántico en accordion       → Dark mode
→ Variación fondos nosotros.html      → Personalización por audiencia
→ Update banner CTE                   → Sistema de animaciones GSAP
→ 404.html
```

---

## Deuda técnica documentada

| # | Problema | Archivo(s) | Severidad |
|---|----------|-----------|-----------|
| 1 | Estilos inline masivos en `index.html` (sección cobertura) | `index.html` | Media |
| 2 | Estilos de página en `<style>` bloques locales vs `styles.css` | Múltiples | Media |
| 3 | Footer duplicado en 16 archivos (cambio de dirección = 16 ediciones) | Todos | Media |
| 4 | Nav duplicado en 16 archivos | Todos | Media |
| 5 | `script.js` tiene solo la lógica de hamburger; JS de páginas sigue inline | Múltiples | Baja |
| 6 | Archivos PDF con acentos en el nombre (riesgo en algunos servidores) | `pdfs/cte/` | Baja |
| 7 | Sección cobertura sin breakpoint mobile | `index.html` | Alta |
| 8 | `<div onclick>` en acordeones (no semántico) | `cte.html` | Alta |
| 9 | Sin `aria-current` en ninguna página | Todos | Media |
| 10 | Sin favicon en ninguna página | Todos | Media |

---

## Notas para la próxima sesión

Al iniciar la siguiente sesión de trabajo, ejecutar primero:

```bash
# Ver estado actual del repositorio
git log --oneline -5
git status

# Verificar el sitio en producción antes de cambios
# https://educaneza.github.io/seprn-sitio/
```

**Orden de ejecución recomendado para la siguiente sesión:**
1. Empezar con Fase 1 completa (todos los quick wins son independientes entre sí).
2. Una vez terminada Fase 1, hacer commit.
3. Pasar a Fase 2 empezando por el sistema de CSS Custom Properties (2.7), ya que todos los demás cambios visuales lo usarán.
4. Luego implementar Fase 2 en orden numérico.

**Archivos que más cambiarán en Fase 2:**
- `styles.css` (refactoring completo con variables)
- `index.html` (cobertura mobile + CTAs + cards)
- `cte.html` (accordion redesign + aria)
- `nosotros.html` (variedad visual)
