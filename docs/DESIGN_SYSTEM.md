# Sistema de diseño "premium" — Centro de Formación Docente

Documenta los tokens y patrones reales que salieron del rediseño de julio 2026
(commits `ef0dbde`, `63890e8`, `8d7e2b6`). No es una propuesta — es lo que
**ya está construido y funcionando** en producción, para no reinventarlo cada
vez que se toque una pantalla nueva de este mismo módulo.

## Dónde aplica y dónde no

**Aplica hoy:** `formacion-docente.html` e `instructivo-formacion-docente.html`.
Son páginas standalone (no importan `styles.css`), pensadas para sentirse como
un producto propio dentro del sitio institucional.

**NO aplica** al resto del sitio (`index.html`, `otde.html`, `nosotros.html`,
páginas de área, etc.). Esas páginas usan **Montserrat** y el lenguaje visual
más simple ya establecido desde el rediseño de junio 2026 (ver
`docs/ROADMAP.md`). Los banners dentro de `otde.html` que enlazan a Formación
Docente se refinaron (sombras, radios, micro-interacción) pero **a propósito
siguen en Montserrat** — meter Inter solo ahí crearía una fuente ajena
flotando dentro de una página que ya tiene su propia identidad tipográfica.

Antes de aplicar este sistema a una página nueva, pregúntate: ¿esta pantalla
vive dentro de la experiencia de Formación Docente (o su instructivo), o es
parte del sitio institucional general? Si es lo segundo, usa el sistema de
`styles.css` / Montserrat, no este.

## Color

Paleta institucional SEPRN sin cambios (`--midnight #0C1A2E`, `--guinda
#56212f`, `--acento #9F2241`) más neutrales propios con sesgo cálido (no gris
genérico), derivados de `--arena`:

```css
--midnight-2: #16273f;   /* variante para gradientes de hero */
--acento-2:   #c23861;   /* variante clara del acento, para texto sobre fondo oscuro */

--canvas:     #FAF8F4;   /* fondo de página */
--paper:      #FFFFFF;   /* fondo de tarjeta/panel */
--ink:        #1E1720;   /* texto principal */
--ink-soft:   #5C5058;   /* texto secundario */
--ink-faint:  #948A8E;   /* texto terciario / placeholders */
--hairline:   #EAE2DC;   /* bordes suaves */
--hairline-2: #DCD2C8;   /* bordes de inputs, algo más marcados */
```

Semántico, independiente del acento (para que "error" nunca se confunda con
"esto es importante pero no es un error", que ya usa el acento guinda):

```css
--ok: #146C43;      --ok-bg: #E9F5EE;      --ok-line: #BEE3CE;
--warn: #8A5A16;     --warn-bg: #FCF3E3;    --warn-line: #F0DAA8;
--danger: #B3261E;   --danger-bg: #FBEAE9;  --danger-line: #F1C8C4;
```

**Por qué no verde/paleta genérica de SaaS:** un brief de diseño pegado en
julio 2026 sugería "verdes elegantes" — es texto genérico de plantilla, no
algo específico de SEPRN. Se mantuvo la paleta institucional real y se elevó
la ejecución (tipografía, espaciado, sombras, movimiento) en vez de cambiar
la identidad visual.

## Tipografía

Dos familias, cargadas vía Google Fonts (no hay build step, es un `<link>`
normal en `<head>`):

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Tight:wght@600;700;800&display=swap" rel="stylesheet">
```

```css
--font-display: 'Inter Tight', 'Inter', -apple-system, sans-serif; /* títulos, botones, nombres de curso */
--font-body:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; /* todo lo demás */
```

Escala usada (no es una escala matemática estricta, son los tamaños reales
en el código):

| Uso | Tamaño | Familia |
|---|---|---|
| Hero h1 | `clamp(1.85rem, 5vw, 2.75rem)` peso 800 | display |
| Título de paso (`.paso-header h2`) | 1.6rem peso 800 | display |
| Confirmación h2 | 1.75rem peso 800 | display |
| Nombre de curso en tarjeta | .98rem peso 700 | display |
| Cuerpo / inputs | 1rem | body |
| Labels de formulario | .86rem peso 600 | body |
| Hints / notas pequeñas | .78rem | body |

## Espaciado y radios

Escala de 3 niveles, consistente en toda la experiencia:

```css
--radius-lg: 22px;  /* tarjetas de curso, .card, paneles grandes */
--radius-md: 14px;  /* botones, inputs de texto grandes, cajas de aviso */
--radius-sm: 9px;   /* inputs, elementos pequeños */
```

`instructivo-formacion-docente.html` usa valores ligeramente más
conservadores (14–16px) a mano en vez de las variables — es un documento
pensado para imprimirse, y una tarjeta de 22px de radio se ve exagerada en
papel carta. Si se vuelve a tocar ese archivo, vale la pena formalizar sus
propios `--radius-*` en vez de números sueltos.

## Sombras

```css
--shadow-1: 0 1px 2px rgba(30,23,32,.04);
--shadow-2: 0 8px 28px -8px rgba(30,23,32,.16), 0 2px 8px rgba(30,23,32,.06);
--shadow-3: 0 20px 48px -12px rgba(12,26,46,.28), 0 4px 14px rgba(12,26,46,.10);
```

`shadow-1` = reposo, `shadow-2` = hover/elevado, `shadow-3` = elementos
flotantes sobre el contenido (dropdown de sugerencias de CCT, la barra
sticky). La tarjeta **seleccionada** no usa esta escala tal cual — combina
`shadow-2` con un halo de color del acento (ver abajo), porque "seleccionado"
necesita leerse distinto a "solo hover".

## Movimiento

```css
--ease: cubic-bezier(.16,1,.3,1); /* easing estándar: transiciones, hover, fade-in de pasos */
```

Para el check de "curso seleccionado" se usa un easing con rebote aparte,
**no** el `--ease` estándar, porque un check que solo aparece con fade se
siente plano — el rebote es lo que comunica "esto se acaba de activar":

```css
transition: transform .5s cubic-bezier(.34,1.56,.64,1);
```

Todo el movimiento respeta `prefers-reduced-motion` con un bloque global al
principio del `<style>`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; scroll-behavior: auto !important; }
}
```

El fade-in entre pasos del wizard (`.paso-enter`) se retriggerea en JS
quitando y volviendo a poner la clase (un `@keyframes` no se reproduce dos
veces solo por seguir presente):

```js
function animarEntrada(id) {
  const el = document.getElementById(id);
  el.classList.remove('paso-enter');
  void el.offsetWidth; // fuerza reflow
  el.classList.add('paso-enter');
}
```

## Patrón: header ilustrado de tarjeta

Antes: rectángulo de color plano con un ícono centrado. Ahora es una
composición en capas, reutilizable para cualquier tarjeta con "categoría +
color":

1. Gradiente propio de 3 paradas por categoría (`gradient` en
   `CATEGORIA_STYLE`), más rico que un gradiente de 2 colores.
2. `::before` — glow radial (blanco arriba-derecha, sombra abajo-izquierda)
   con `mix-blend-mode: soft-light` para que el gradiente base se sienta con
   profundidad, no plano.
3. `::after` — trama de puntos (`radial-gradient` repetido cada 14px) con
   `mask-image` en diagonal para que se desvanezca hacia una esquina, no
   cubra parejo todo el header.
4. El ícono va en un contenedor con `backdrop-filter: blur()`, borde
   translúcido y sombra propia — no es un ícono suelto sobre el gradiente.

Ver `.cc-header`, `.cc-header::before`, `.cc-header::after`, `.cc-icon` en
`formacion-docente.html` para la implementación completa.

## Patrón: pill de categoría

Cada entrada de `CATEGORIA_STYLE` trae, además del `gradient` e `icon` del
header, un `tint` (fondo suave) y `solid` (color de texto/ícono) para la pill
que aparece en el cuerpo de la tarjeta:

```js
'Webinar': {
  gradient: 'linear-gradient(150deg,#0c4a6e,#0284c7 65%,#38bdf8)',
  tint: '#E6F4FC', solid: '#0369a1',
  icon: '<svg ...>'
}
```

Si se agrega una categoría nueva en el backend (`PREFIJOS_CATEGORIA` en
`apps-script/formacion-docente.gs`), hay que agregar su entrada aquí también
— si no, cae en `_default` (gris neutro), que no es necesariamente un error
pero sí una categoría "sin marca visual propia".

## Patrón: resumen sticky (barra flotante de selección)

Reemplaza el patrón viejo de "contador de texto + botón fijo en el flujo".
Vive **dentro** de `#paso-1` (no como hermano) a propósito: al ocultarse
`#paso-1` con `display:none` al cambiar de paso, la barra `position:fixed`
se oculta con él sin necesitar lógica de visibilidad aparte — un elemento
`fixed` dentro de un ancestro `display:none` no se renderiza.

Piezas: `#resumen-sticky` (contenedor, clase `.visible` la muestra/oculta),
`#rs-count-badge` (contador circular), `#rs-chips` (chips removibles, uno
por curso elegido, con su propia × que llama a `quitarCurso(id)`), y el
botón `#btn-paso1` reubicado dentro de la barra (mismo id de siempre, la
lógica de habilitar/deshabilitar no cambió).

Si se reutiliza este patrón en otra pantalla con selección múltiple, la
función a copiar es `actualizarResumenSticky()` — centraliza contador, chips
y estado del botón en un solo lugar en vez de tres actualizaciones sueltas.
