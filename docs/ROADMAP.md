# Roadmap de Mejoras — SEPRN Sitio Web

Documento generado a partir de la auditoría UX/UI completa del 26 de mayo de 2026.
Objetivo: elevar el sitio de un nivel **5/10** (funcional-institucional 2019) a un **8.5/10** (producto digital premium institucional) sin cambiar el stack tecnológico (HTML/CSS/JS puro).

**Este documento es solo para lo pendiente/futuro** (consolidación del 5 ago 2026) — el
historial de qué ya se completó y cuándo vive en `docs/BITACORA.md`. Las secciones de FASE 1 y
FASE 2 de abajo se conservan como referencia técnica de patrones de implementación ya en uso
(la mayoría de sus ítems ya están hechos, marcados `✅`), no como trabajo pendiente.

---

## Estado actual — Scores de auditoría

| Dimensión | Score original (may 2026) | Post Fase 1 (jun 2026) | Post rediseño (16 jun 2026) | Post páginas internas (24 jun 2026) | Post bug-fixes (24 jun 2026) | Post smoke test (10 ago 2026) | Objetivo |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| UI | 5/10 | 6/10 | **8.5/10** | **8.5/10** | **9/10** | **9/10** | 8/10 ✅ |
| UX | 5/10 | 6.5/10 | **8/10** | **8.5/10** | **8.5/10** | **8.5/10** | 8/10 ✅ |
| Branding | 3/10 | 3.5/10 | **7.5/10** | **8/10** | **8/10** | **8.5/10** (tras logomark) | 7/10 ✅ |
| Profesionalismo | 5/10 | 6/10 | **8/10** | **8.5/10** | **9/10** | **9/10** (tras fix de banner) | 9/10 ✅ |
| Claridad | 6/10 | 6/10 | **7.5/10** | **8/10** | **8/10** | **8/10** | 9/10 |
| Conversión / Retención | 3/10 | 3/10 | **5/10** | **5/10** | **5/10** | **5/10** | 7/10 |
| Diseño móvil | 4/10 | 6/10 | **7.5/10** | **7.5/10** | **7.5/10** | **8/10** | 8/10 ✅ |
| Performance percibida | 6/10 | 7/10 | **8/10** | **8/10** | **8/10** | **7.5/10** | 8/10 |
| Accesibilidad | 3/10 | 6/10 | **7/10** | **7.5/10** | **8/10** | **8/10** | 8/10 ✅ |

**Promedio 10 ago 2026: ~7.9/10.** Detalle completo del smoke test que produjo esta columna
(qué se probó en vivo, qué se descartó como falso positivo, y por qué Performance percibida
bajó medio punto) en `docs/BITACORA.md`. Meta de 9.5/10 en todas las dimensiones planteada por
Jorge el 10 ago 2026: realista en UI/UX/Diseño móvil/Performance con solo código; Branding y
Conversión/Retención necesitan un logomark real y decisiones de producto respectivamente antes
de poder cruzar 9 — ver "Pendientes vigentes" abajo.

---


## FASE 1 — Quick Wins *(referencia histórica)*
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

Items 2.2, 2.3 y 2.4 completados en sesiones anteriores. Items 2.5 pendiente; 2.1, 2.6, 2.7 completados el 24 jun 2026.

### ~~2.1 Rediseñar las tarjetas de áreas del index~~ ✅
Íconos SVG y badge Subjefatura/Oficina agregados a las 7 tarjetas. Fondo de la sección cambiado a `var(--off-white)` para que las tarjetas blancas destaquen. Descripciones mejoradas.

### ~~2.2 Eliminar gradientes en CTE~~ ✅
**Problema:** `linear-gradient(135deg, #56212f 0%, #9F2241 100%)` en los headers del acordeón. Los dos colores son tan similares que el gradiente se ve plano y sucio. Estética 2015.
**Archivo:** `cte.html` (bloque `<style>`)
**Tarea:**
- Cambiar a `background: #56212f` (color sólido).
- Agregar `border-left: 4px solid #9F2241` al header para dar el acento visual sin el gradiente.
- Hover: `background: #6d2a3d`.

### ~~2.3 Arreglar la animación del acordeón CTE~~ ✅
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

### ~~2.4 Agregar CTAs al hero del index~~ ✅
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

### 2.5 Señales de legitimidad institucional *(parcialmente hecho)*
**Problema:** No hay ninguna señal de que este sea el sitio oficial. Sin escudo, sin referencia a SEIEM/SEEMx, sin código de la subdirección.
**Archivos:** Footer en todos los HTML.
**Estado:** El footer ya incluye "Órgano desconcentrado de SEIEM · Gobierno del Estado de México". Pendiente: agregar escudo/logo de SEIEM si se tiene el archivo oficial, y reforzar la mención de forma más visible.

### ~~2.6 Romper la monotonía visual en nosotros.html~~ ✅
7 bandas de color completo alternantes (off-white, blanco, midnight, off-white, arena, blanco, guinda). Section-headers con eyebrows por sección. Tarjetas de valores y equipo adaptadas a fondo oscuro.

### ~~2.7 CSS Custom Properties (Design Tokens — parcial)~~ ✅
`--midnight` y `--off-white` agregados a `:root`. Todos los `#0C1A2E` y `#F9F8F5` hardcodeados en `styles.css` migrados a variables.


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

### ~~3.3 Mapa SVG responsive con touch~~ ✅
`touchstart` con `{ passive: false }` + tooltip centrado fijo al tocar (`top: 8px; left: 50%; transform: translateX(-50%)`). Auto-cierre a los 2.8s. Implementado en `index.html`.

### ~~3.4 Barra de "Última actualización CTE"~~ ✅
**Objetivo:** Retención. Los usuarios frecuentes (docentes, directores) vuelven al sitio principalmente para materiales CTE.
**Tarea:** Agregar en `index.html`, debajo del nav, una barra de notificación:
```html
<div class="update-banner">
    <span>Nuevo</span>
    Octava Sesión Ordinaria 2025-2026 disponible
    <a href="cte.html">Ver materiales →</a>
</div>
```
Esta barra debe actualizarse manualmente cada vez que se agrega una sesión. **Texto actual a usar:** "Octava Sesión Ordinaria 2025-2026".

### ~~3.5 Footer multi-columna~~ ✅
3 columnas (SEPRN/contacto, Sitio, Áreas) + barra inferior con redes y copyright. Aplicado en las 13 páginas del sitio mediante script Python.

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
| ~~9~~ | ~~Sin `aria-current` en ninguna página~~ — resuelto Fase 1, ver `docs/ARCHITECTURE.md` (P6, `fd707cf`) | Todos | ✅ |
| ~~10~~ | ~~Sin favicon en ninguna página~~ — resuelto Fase 1, ver `docs/ARCHITECTURE.md` (P8, `fd707cf`) | Todos | ✅ |

---

## Notas para la próxima sesión

Al iniciar la siguiente sesión de trabajo, ejecutar primero:

```bash
git log --oneline -5
git status
# Verificar: https://educaneza.github.io/seprn-sitio/
```

**Pendientes vigentes** (la lista fechada "al 6 jul 2026" que vivía aquí ya se resolvió o se
movió — ver `docs/BITACORA.md` para el historial; esto es solo lo que sigue abierto):

1. **Recrear páginas eliminadas** cuando haya contenido validado con la Dra. Avelina Galindo Celix: `gestion-escolar.html`, `investigacion-educativa.html`, `programas-educativos.html`, `servicio-profesional.html`.
2. ~~**Logomark SEPRN (3.1)**~~ — resuelto 10 ago 2026, con matices. Antes de construir nada se
   revisó la *Guía para la Elaboración de Materiales Gráficos en Redes Sociales* del Gobierno
   del Estado de México (`Guía de Contenidos Digitales.pdf` en la raíz del repo): el Escudo de
   Armas es único y oficial, dentro de una "pleca de logos" fija — ninguna dependencia interna
   inventa su propio escudo, así que las direcciones con escudo propio quedaron descartadas. En
   cambio, el manual sí contempla un "logo de organismo interno" simple, que es justo lo que ya
   era el favicon (`favicon.svg`, iniciales "NE"/"ZA" de Nezahualcóyotl). Se mantuvo esa idea
   intacta y solo se corrigió que estaba en Georgia (serif) mientras el wordmark "SEPRN" del nav
   está en Montserrat — mismatch que se notaba justo donde ambos conviven. Ahora el mismo ícono
   (Montserrat, mismos colores guinda/arena ya alineados con la paleta oficial del manual) se
   agregó en el nav y el footer (con colorway invertido en el footer, porque el original
   desaparecería sobre el fondo guinda) de las 13 páginas que comparten `styles.css`
   (`asistencia.html`, `charla-ia.html`, `formacion-docente.html` e
   `instructivo-formacion-docente.html` quedaron fuera a propósito — tienen su propio sistema de
   diseño o un header distinto). Nuevo archivo `logo.svg` en la raíz con el lockup horizontal
   completo (ícono + wordmark) como asset de referencia. **Pendiente real que sí sigue abierto**:
   el hallazgo de que las 3 tipografías oficiales del manual son Gotham/BW Modelica/Corporative
   Sans Alt — ninguna es Montserrat, y BW Modelica no debe usarse con palabras con "ñ" ni
   Corporative con palabras con "z" (ambas letras están en "Nezahualcóyotl") — se dejó fuera a
   propósito, es una decisión más grande que toca tipografía de todo el sitio, no solo el logo.
   Tampoco se confirmó si la página necesita mostrar el Escudo de Armas/logo Gobierno del Estado
   de México reales en algún lugar (hoy el footer solo los menciona en texto) — el documento
   revisado es de redes sociales, no el manual de identidad gráfica completo.
3. ~~**Barra CTE desactualizada**~~ — resuelto 10 ago 2026: `.update-banner` de `index.html`
   ahora dice "Fase Intensiva 2026-2027 ya disponible" (antes decía "Octava Sesión Ordinaria
   2025-2026 ya disponible", el ciclo cerrado).
4. **Fase Intensiva 2026-2027 sin video** — el acordeón en `cte.html` solo tiene los 9
   materiales + ZIP, sin `video-container`. Agregar el iframe (`data-src`, mismo patrón que el
   resto) cuando Jorge tenga el video del Opening.
5. ~~**Mensaje de error duplicado en CCT no encontrada**~~ — resuelto 10 ago 2026: en los 6
   formularios que comparten el patrón (`otde.html`: Mantenimiento, Asesorías, Soporte, y los 4
   sub-formularios de Correo vía `crearCctAutocomplete()`; y `formacion-docente.html`), el
   `change` handler que activa el fallback manual ahora también limpia `error`/`visible` del
   campo y mensaje de CCT — ya no quedan el aviso ámbar y el error rojo mostrados a la vez.
   Verificado en vivo reproduciendo el repro original (submit vacío → CCT inexistente).
6. ~~**Catálogo de Formación Docente sin feedback de espera larga**~~ — resuelto 10 ago 2026:
   `cargarCatalogo()` en `formacion-docente.html` ahora tiene un segundo aviso a los 10s
   ("Esto está tardando más de lo usual — seguimos esperando la respuesta del servidor"),
   además del ya existente a los 3s. El texto del loader también se resetea al reintentar
   (antes podía quedarse en el mensaje de "tardando más de lo usual" de un intento previo).
   Verificado simulando una respuesta lenta de Apps Script (12s) en el navegador: el mensaje
   escala correctamente y el loader se limpia sin quedar en un estado inconsistente cuando la
   respuesta por fin llega.
7. **Migrar los 4 trámites de `otde.html` a páginas propias** (destino decidido 10 ago 2026, no
   iniciado): `mantenimiento.html`, `asesorias.html`, `correo.html`, `soporte.html`, mismo
   precedente que `formacion-docente.html`/`asistencia.html` — no como tabs dentro de
   `oficina-virtual.html`, para no trasladar el problema de "archivo gigante" de un archivo a
   otro. Verificado que es viable sin extracción enredada: el `<script>` de `otde.html` (~2,300
   líneas) ya agrupa las funciones de cada trámite en bloques contiguos por prefijo (`sop*`/
   `man*`/`ase*`/`alt*·cam*·rst*·inc*`), compartiendo solo 4 helpers (`toggleForm`,
   `toTitleCase`, `fetchJsonConTimeout`, `otdePoblarFuncion`) que cada página nueva duplicaría.
   De paso, Licencias Office (hoy 100% estático, sin backend ni folio) entraría a la grid de
   `oficina-virtual.html` como card tipo "Recurso", no "Trámite" — sin el buscador de
   seguimiento. Detalle completo de la decisión en `docs/BITACORA.md`, checkpoint 10 ago 2026
   (noche, cont.).
8. **Coordinación de fecha de visita en Mantenimiento/Asesorías** (planteado 11 ago 2026,
   diseño confirmado y ampliado 24 ago 2026, **plan escrito, no iniciado**): hoy, tras
   "Validado", OTDE coordina la fecha de atención con Sector (que coordina con Zona, que
   coordina con la escuela) totalmente fuera del sistema. El sistema viejo v8.5 ya resuelve un
   problema parecido con su hoja "Despacho" (acuse de recibo + notificar fecha programada al
   sector), pero corre sobre su propio Sheet, desconectado del webform nuevo — replicar ese
   mismo propósito (columna "Fecha programada de visita" en `Solicitudes` + una acción que
   notifique a Zona/Sector reusando `manBuscarContactosZonaSector()`/
   `aseBuscarContactosZonaSector()`) directamente en `mantenimiento.gs`/`asesorias.gs`, sin
   tocar v8.5 ni duplicar captura. Es además la **Fase 1** de la ruta hacia retirar v8.5 (ver
   ítem 9 abajo). Detalle de la decisión en `docs/BITACORA.md`, checkpoint 11 ago 2026; plan de
   implementación completo en el checkpoint del 24 ago 2026 (sesión de revisión de flujo).
9. **Conexión con el sistema v8.5 ("Sistema Automatizado de Reportes de Visitas")** — **decisión
   revertida el 24 ago 2026**: la evaluación anterior (11 ago 2026) había descartado el
   reemplazo por "beneficio mayormente cosmético" frente al costo. Jorge confirmó que quiere
   retirar v8.5 y unificar todo en un solo stack mantenible (v8.5 no tiene repo ni control de
   versiones) — no es una necesidad puntual nueva de v8.5, es preferencia de arquitectura.
   Camino elegido: **reemplazo eventual, en fases**, ninguna construida todavía:
   - **Fase 1**: coordinación de fecha de visita — ver ítem 8 arriba.
   - **Fase 2**: reconstruir dentro de `mantenimiento.gs` el reporte técnico de la visita + PDF
     + cierre automático (nueva hoja "Reportes de visita" ligada a `Solicitudes` por folio),
     extendiendo el correo de cierre a escuela+zona+sector — mejora real sobre v8.5, que según
     la documentación de este proyecto solo avisa a director+técnico al cerrar (**pendiente de
     verificar en vivo contra el sistema real antes de asumirlo**, nunca confirmado en
     navegador).
   - **Fase 3**: réplica de la organización nocturna de fotos y el reporte mensual (formato
     Planeación, cruce contra el catálogo de direcciones) — menor prioridad, mayor complejidad.
   - **Fase 4**: decidir el destino del histórico de v8.5 (380 aulas, reportes ya generados —
     probablemente archivo de solo lectura, no migración) y el corte real.
   Detalle completo del diseño de la Fase 1 en `docs/BITACORA.md`, checkpoint 24 ago 2026
   (sesión de revisión de flujo).

Los 3 backends de Correo/Mantenimiento/Asesorías ya se desplegaron (6 ago 2026) — ver
`docs/BITACORA.md` para el detalle. Ver `CLAUDE.md` §"Pendientes vigentes" para lo que sigue
abierto de esa entrega (decisión de notificación de cierre de ticket, limpieza de función
temporal en Apps Script).

**Nota de caché:** tras un push a `main`, GitHub Pages tarda 5-10 min en propagar el CSS. Hacer Cmd+Shift+R para invalidar caché del navegador.

**Nota de pruebas locales:** el sandbox de este asistente tiene salida real a internet (confirmado — `script.google.com` responde de verdad), así que probar endpoints de Apps Script con `curl` o desde un navegador headless ejecuta `doPost` en producción de verdad. Para pruebas de UI sin riesgo, interceptar la llamada de red (`page.route()` en Playwright) en vez de dejarla llegar al backend real.
