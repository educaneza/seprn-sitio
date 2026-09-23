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
3. El ícono va en un contenedor blanco (`.cc-icon-wrap`, 52×52px, radio 15px
   desde el 23 sep 2026 — antes 84px en una cabecera de 148px que era solo
   decoración) con el ícono (26px) coloreado con `style.solid` vía `color:` +
   `stroke="currentColor"` en el SVG — no ícono blanco sobre fondo de color,
   es ícono de color sobre fondo blanco. Este contrato importa: si agregas
   una categoría nueva, su SVG debe usar `stroke="currentColor"`, no un color
   fijo, o no heredará el tono correcto.
4. El campo `gradient` de `CATEGORIA_STYLE` quedó sin uso — no lo borres
   todavía por si se reutiliza en otro lado, pero no lo repliques en código
   nuevo.

Ver `.cc-header`, `.cc-icon-wrap` en `formacion-docente.html`.

**Rediseño del 23 sep 2026 (feedback de producción)**: la cabecera bajó de
148px a ~110px y dejó de ser solo decorativa — ícono a la izquierda y,
debajo, el chip de estado de la inscripción (`.cc-estado`, fondo blanco,
color por estado: `--ok` abierta con punto, `--warn` "Cierra hoy · 14:00 h"/
"Cierra mañana", `--danger` "Cupo agotado", `--ink-soft` "Inscripciones
cerradas"/"Concluido"). La palomita de selección (`.cc-sel-badge`, 22px)
vive ahora en la esquina del ícono, no de la tarjeta. En el cuerpo, las
fechas van en un bloque con etiqueta arriba del valor (`.cc-fechas`:
"Inscríbete hasta · lun 28 sep · 14:00 h" / "Curso · 29 sep – 10 oct",
formateadas en el cliente con `textoPeriodoCurso()`/`textoInscripcion()`) —
antes era un solo rango sin etiqueta que los docentes leían como periodo de
inscripción. Al pie, un botón visual `.cc-cta` "Elegir este curso" →
"✓ Elegido" (verde): es un `<span aria-hidden>`, la tarjeta entera sigue
siendo el `role=button` real — así no hay un interactivo anidado.

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

## Patrón: descripción expandible ("Leer más")

`.cc-desc` recorta la `Descripcion` del curso a 3 líneas (`-webkit-line-clamp:
3`). Como el texto es de largo variable (Jorge escribe lo que quiera en el
Sheet), algunas descripciones se recortan y otras no — el botón "Leer más"
solo se agrega si de verdad hay texto cortado, midiendo tras insertar la
tarjeta en el DOM (`descEl.scrollHeight > descEl.clientHeight`, dentro de un
`requestAnimationFrame` porque `scrollHeight` solo es real ya en el layout).
Al expandir, `.cc-desc.expanded` quita el `line-clamp` y el botón cambia a
"Leer menos" — la tarjeta crece y empuja las de abajo en el grid, aceptado a
propósito (es el patrón esperado en catálogos con texto de longitud
variable, más simple que un modal o tooltip aparte). El botón usa
`ev.stopPropagation()` para no disparar `seleccionarCurso()` de la tarjeta.

## Patrón: aviso de registro externo (dinámico, por curso y no solo global)

Antes el aviso "Este formulario no es tu inscripción oficial al curso"
(`.aviso-legal`) era un bloque estático siempre visible en el paso 1,
aplicara o no al curso que el docente terminaba eligiendo — confuso cuando
el catálogo mezcla cursos con y sin plataforma externa. Son **tres señales
relacionadas**, todas condicionadas a `Registro_previo_requerido=TRUE` **y**
a que el curso tenga `Liga_convocatoria` (no basta con que exista la liga:
un curso puede guardar ahí un link puramente informativo — p. ej. el link
de una conferencia, mostrado como referencia al final y mandado en el
recordatorio — sin que el registro en esa plataforma sea obligatorio; ver
"Registro previo externo" en `docs/ARCHITECTURE.md §12` y
`docs/QA-NOTES.md #37`, el bug real de sep 2026 donde estas tres señales sí
solo miraban la liga):

1. **Badge en la tarjeta del catálogo** (`.cc-externo-tag`, pill ámbar con
   `ICON_EXTERNO`) — visible solo para cursos con `registro_previo_requerido`
   y liga, incluso antes de seleccionar nada.
2. **Nota por curso en el resumen de selección** — `.rsb-nota-externo` en el
   panel de escritorio (debajo del nombre de ese curso específico) y
   `.rs-chip-warn` (solo el ícono, sin texto, por espacio) en el chip móvil,
   ambas dentro de `actualizarResumenSticky()`.
3. **El aviso general** (`.aviso-legal`, oculto por defecto, dentro del
   paso 2 — formulario OTDE) — se muestra u oculta en `mostrarFormularioOtde()`:
   `cursosSeleccionados.some(c => c.registroPrevio && c.liga)`. Con cero
   cursos seleccionados, o solo cursos sin registro previo obligatorio,
   permanece oculto.

`ICON_EXTERNO` es el mismo ícono (círculo con "i") en las tres señales — un
solo símbolo visual para "hay una plataforma externa de por medio" en todo
el flujo, en vez de íconos distintos para la misma idea.

## Patrón: paso intermedio guiado + confirmación de doble registro (sep 2026)

Las tres señales de arriba avisan que hay una plataforma externa de por
medio; este patrón es el paso completo que se inserta cuando el docente
elige un curso con `Registro_previo_requerido=TRUE` — construido para
cerrar el hueco que Jorge señaló: docentes que se registran con OTDE pero
nunca terminan su alta real en la plataforma (o al revés). Modelo completo
del dato en `docs/ARCHITECTURE.md` §"Doble registro".

- **Indicador de 3 pasos** (`.steps-wrapper`, arriba del contenido): "Elige
  tu curso" → "Inscríbete" (`#step-ind-ext`, oculto por defecto,
  `actualizarIndicadorPasos()` lo revela solo si algún curso seleccionado
  tiene `registroPrevio && liga`) → "Avisa a OTDE". Una sola palabra en la
  etiqueta del paso 2 a propósito: con dos líneas el indicador crecía y
  empujaba las tarjetas del catálogo al aparecer.
- **Guía visual de 4 íconos** (`.guia-externa`, sin texto largo): Entra o
  crea tu cuenta → Confirma tu correo (solo la 1ª vez) → Inscríbete al
  curso → Te llega el correo de bienvenida. El 4º paso es literalmente la
  pregunta que sigue.
- **Pregunta de confirmación** (`.decision-externa`): "¿Ya te llegó el
  correo de bienvenida del curso?" con dos salidas, ninguna bloqueante —
  "Sí, ya me llegó" (`continuarDesdeExterno(true)`) y "Todavía no — avisar
  a OTDE de todos modos" (`continuarDesdeExterno(false)`). El correo de
  bienvenida de la plataforma es la señal acordada con Jorge: visual y
  ligera, sin subir archivos ni cruzar contra ninguna lista de inscritos
  real de la plataforma.
- **Confirmación final con checklist por curso**: dos `crearCheck()` por
  curso con plataforma externa — "Registro con OTDE" (siempre `ok`) e
  "Inscripción en la plataforma" (`ok` si confirmó, `pendiente` con el
  texto "Tu lugar no está apartado hasta que te llegue el correo de
  bienvenida. Te enviaremos un recordatorio por correo." si no) — con un
  CTA "Ir a inscribirme" (`ICON_LINK_EXT` + la `Liga_convocatoria`) cuando
  quedó pendiente.
- **Navegación entre pasos con `history.pushState`**: el botón Atrás del
  navegador regresa de paso 2 a la guía externa (o de ahí al catálogo) sin
  perder los datos ya capturados — no es solo un `display:none` sin
  historial.
- **Gotcha de scroll**: bajar al indicador de pasos (no hasta arriba del
  hero) usa `scrollTo({behavior:'instant'})`, no `'smooth'` — en Chrome,
  `'smooth'` junto con la animación `.paso-enter` / el cambio de foco no
  hace scroll en absoluto, en silencio (sin error, simplemente no se movía
  la página). Si se toca cualquier `scrollTo` de este flujo, probar en
  Chrome real, no asumir que `'smooth'` es equivalente.

## Patrón: etiqueta de validez oficial (USICAMM/PROEEB)

`.cc-valida-badge` (sep 2026) marca un curso con validez oficial para los
procesos de USICAMM y/o PROEEB — información que le importa al docente
tanto o más que la categoría del curso, así que se le dio esquina propia:
**superior derecha** de `.cc-header`, en espejo de `.cc-sel-badge` (que ya
ocupa la superior izquierda) para que nunca se superpongan aunque una
tarjeta esté seleccionada y validada a la vez. Nuevos tokens `--oficial`/
`--oficial-bg` (azul, el mismo que ya usa `oficina-virtual.html` en su
badge "validado" — reusar el lenguaje visual ya establecido para "esto es
oficial/confiable" en vez de inventar un color nuevo), deliberadamente
distinto de `--ok` (verde = selección) y `--warn` (ámbar = registro
externo).

A diferencia de `.cc-sel-badge`, **siempre es visible cuando aplica**, no
depende de ningún estado de interacción — se decide una sola vez al
construir el `innerHTML` de la tarjeta:

```js
let validaLabel = '';
if (curso.valida_usicamm && curso.valida_proeeb) validaLabel = 'USICAMM · PROEEB';
else if (curso.valida_usicamm) validaLabel = 'USICAMM';
else if (curso.valida_proeeb) validaLabel = 'PROEEB';
```

Un curso con ambas validaciones muestra **una sola** etiqueta combinada, no
dos badges apilados — evita que la esquina de la tarjeta se sature. El
mismo badge se reutiliza tal cual en las tarjetas del historial "Cursos
anteriores" (ver patrón siguiente): la validez de un curso sigue siendo
información útil aunque ya haya pasado.

## Patrón: estados de inscripción + historial "Cursos anteriores"

> **Actualización 23 sep 2026**: ahora son 4 estados — se agregó **Cupo
> agotado** (`.curso-card.agotado`: visible, sin botón, "Ya no hay lugares
> disponibles"; elegible solo en modo "¿Ya te inscribiste? Avísanos aquí",
> que agrega `.modo-aviso` a `#cursos-grid` y muestra el botón "Ya estoy
> inscrito · avisar"). `.cc-cerrado-tag` se retiró: el estado va en el chip
> `.cc-estado` de la cabecera (ver "Encabezado de tarjeta" arriba). El
> historial ya no depende de `Activo`. Lo de abajo describe la versión de 3
> estados; la lógica de fechas vigente está en `docs/ARCHITECTURE.md §12`.

Antes un curso solo tenía dos estados implícitos: visible (`Activo=TRUE` +
dentro de `Visible_desde`/`Visible_hasta`) o invisible. Jorge pidió un
matiz real: el periodo de **inscripción** de un curso no es lo mismo que
su periodo de **desarrollo** — un curso puede seguir corriendo con la
inscripción ya cerrada, y eso debe verse distinto de "ya terminó por
completo". El modelo quedó en 3 estados, calculados en `doGet()` (detalle
de la lógica de fechas en `docs/ARCHITECTURE.md §12`):

1. **Abierta** (default): tarjeta normal, sin cambios visuales.
2. **Cerrada**: venció `Fecha_limite_inscripcion` (o `Fecha_inicio` si esa
   columna está vacía) pero no `Fecha_fin`. La tarjeta se queda en el
   catálogo vigente — **no** desaparece — con la leyenda `.cc-cerrado-tag`
   ("Inscripciones cerradas · Curso en desarrollo", tono neutro
   `--ink-soft`/`--hairline`, deliberadamente distinto de `--warn` que ya
   significa "registro en plataforma externa") y sin el
   `addEventListener('click', ...)` de selección — la tarjeta se marca con
   la clase `.cerrado`, que solo neutraliza el cursor/hover, sin ponerla
   en gris (sigue siendo un curso vigente, no historial).
3. **Pasado**: venció también `Fecha_fin`. El curso sale por completo del
   catálogo vigente y pasa a la sección `#cursos-pasados-wrap`
   ("Cursos anteriores"), pintada por `renderCursosPasados()` — misma
   `CATEGORIA_STYLE` y pills de fecha/modalidad/dirigido_a que las
   tarjetas normales, pero **de solo lectura**: `.curso-card-historial`
   aplica `filter: grayscale(85%)`, `opacity: .62` y `pointer-events: none`
   (bloquea toda interacción sin tener que auditar cada handler uno por
   uno), sin `cc-sel-badge`, sin "Leer más", sin `cc-externo-tag`/inscritos
   (ya no aplica registrarse a algo que terminó).

**El historial se muestra siempre que exista, no solo cuando el catálogo
vigente está vacío** — es la pieza central del pedido original de Jorge:
que los docentes vean qué se ha ofrecido antes y les genere estar más
atentos a futuras convocatorias, incluso con cursos vigentes disponibles.
Por eso `#cursos-pasados-wrap` es un bloque hermano independiente de
`#cursos-grid`/`#catalogo-vacio` — nunca los reemplaza, solo se
muestra/oculta con su propia condición (`cursos_pasados.length > 0`) en
`cargarCatalogo()`/`actualizarCatalogoEnSegundoPlano()`.
