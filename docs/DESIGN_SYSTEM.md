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

## Patrón: header de tarjeta (v2, jul 2026 — reemplaza la v1 de gradiente oscuro)

**Historial:** la v1 (commit `8d7e2b6`) usaba un gradiente saturado de 3
paradas + glow radial + trama de puntos enmascarada. Se reemplazó por
completo (commit `84606d5`) tras revisar una referencia visual concreta que
Jorge compartió — la v2 es más simple y se lee más "producto", no la
descartes por antigua, es la que está en producción:

1. Fondo **pastel plano** por categoría (`tint` en `CATEGORIA_STYLE`), sin
   gradiente ni capas decorativas — `background: ${style.tint}`.
2. Un solo `::before` con un glow radial blanco sutil arriba, nada más.
3. El ícono va en un contenedor blanco (`.cc-icon-wrap`, 84×84px, radio 22px)
   con el ícono grande (42px) coloreado con `style.solid` vía `color:` +
   `stroke="currentColor"` en el SVG — no ícono blanco sobre fondo de color,
   es ícono de color sobre fondo blanco. Este contrato importa: si agregas
   una categoría nueva, su SVG debe usar `stroke="currentColor"`, no un color
   fijo, o no heredará el tono correcto.
4. El campo `gradient` de `CATEGORIA_STYLE` quedó sin uso — no lo borres
   todavía por si se reutiliza en otro lado, pero no lo repliques en código
   nuevo.

Ver `.cc-header`, `.cc-icon-wrap` en `formacion-docente.html`.

## Patrón: categoría como texto, no pill

La v1 envolvía la categoría en una pill con fondo tintado. La v2 la simplificó
a texto simple en mayúsculas, coloreado con `style.solid` — más cercano a la
referencia de Jorge y con menos ruido visual en una tarjeta que ya tiene
harto color en el header. `.cc-categoria` + `style="color:${style.solid}"`.

## Patrón: pill "Seleccionado" + halo de selección

Al seleccionar, la tarjeta muestra una pill arriba-izquierda ("✓
Seleccionado", fondo `--ok` sólido) en vez de un simple check circular en la
esquina, y el borde/sombra combinan `--ok` (verde) en vez de `--acento`
(guinda) — la selección se lee como "confirmado/aceptado", reservando el
guinda para acciones primarias (botones). Ver `.cc-sel-badge`,
`.curso-card.selected`.

## Patrón: prueba social real (inscritos)

`doGet()` en `apps-script/formacion-docente.gs` cuenta las filas de
`Inscripciones` por `ID_Curso` (`contarInscritosPorCurso()`) y lo manda como
`inscritos` en cada curso del catálogo. El frontend solo lo muestra si
`inscritos > 0` — nunca "0 inscritos", eso resta confianza en vez de darla.
Los avatares (`ICON_AVATAR`) son siluetas abstractas genéricas, nunca fotos
reales: los docentes no dieron consentimiento para aparecer, solo se expone
el conteo agregado. **Si se agrega un dato de "prueba social" en cualquier
pantalla nueva, la regla es la misma: dato real o no se muestra, nunca una
cifra decorativa.**

## Patrón: resumen de selección — sidebar (escritorio) + sticky (móvil)

Un mismo estado (`cursosSeleccionados`) alimenta **dos** interfaces según el
viewport, actualizadas juntas por una sola función (`actualizarResumenSticky()`
— el nombre quedó de la v1, hoy actualiza ambas):

- **`#resumen-sidebar`** (`≥960px`): panel `position: sticky` a la derecha de
  la cuadrícula de cursos, dentro de `.paso1-body` (grid de 2 columnas,
  `1fr 300px`). Lista vertical con ícono de categoría + nombre + botón ×
  por curso, contador, y el botón Continuar (`#btn-paso1-desktop`).
- **`#resumen-sticky`** (`<960px`): la barra flotante inferior de la v1 seguía
  usándose tal cual, con chips horizontales y `#btn-paso1`.

Ambos viven **dentro** de `#paso-1` a propósito: al ocultarse `#paso-1` con
`display:none` al cambiar de paso, ambos se ocultan solos, sin lógica de
visibilidad aparte — un elemento `fixed` o `sticky` dentro de un ancestro
`display:none` no se renderiza.

**Hay DOS botones "Continuar" con IDs distintos** (`btn-paso1` y
`btn-paso1-desktop`) que deben habilitarse/deshabilitarse juntos — si se toca
esta lógica, no olvidar el segundo. `quitarCurso(id)` funciona para ambas
interfaces (chip del sticky y fila del sidebar llaman a la misma función).

## Patrón: ancho de contenedor variable por paso

`.container` es 1180px (no 720px como en la v1) para que la cuadrícula de
3 columnas + sidebar de paso-1 tengan aire. Los demás pasos (`#paso-2`,
`#paso-externo`, `#paso-confirmacion`) llevan la clase `.narrow`
(`max-width: 640px; margin: 0 auto;`) para no quedar dispersos en un
contenedor ancho pensado para otro layout. Si se agrega un paso nuevo de
una sola columna, agrégale `.narrow`.

## Franja de confianza — regla de honestidad

`.confianza-franja` (4 chips al fondo de paso-1) **no promete nada que no
sea cierto para todo el catálogo mixto**. En particular: nunca un chip
genérico de "Certificado" — la mayoría de las categorías (webinars, salvo
UNETE) no emiten constancia; el chip real dice "Constancia según programa".
Si se agrega un chip nuevo aquí, debe ser verdadero para **cualquier**
categoría del catálogo, no solo para la que se tenía en mente al escribirlo.
