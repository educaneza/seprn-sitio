# Notas de QA — bugs reales ya cazados en este proyecto

No es un checklist genérico de "revisa responsive/accesibilidad/contraste".
Es una lista de bugs **concretos** que ya pasaron en este repo, con su causa
raíz, para no reintroducirlos por accidente en un archivo nuevo que use el
mismo patrón. La mayoría se descubrió y corrigió en julio 2026; los ítems 8 y 9 se agregaron el
6 de agosto de 2026 (el 8 ya corregido ese mismo día, el 9 es comportamiento a conocer, no un
bug con fix).

## 1. `fetch()` sin timeout → botón congelado para siempre

**Síntoma:** el usuario le da a "Enviar"/"Verificar", el botón queda
deshabilitado con spinner, y nunca se recupera — ni éxito ni error.

**Causa raíz:** `fetch()` se resuelve en cuanto llegan los **encabezados**
de la respuesta, no cuando termina de llegar el **cuerpo**. Si el cuerpo se
cuelga (pasa con Apps Script/Google Drive ocasionalmente), un `try/catch`
alrededor de solo el `fetch()` no lo detecta.

**Dónde ya pasó:** `formacion-docente.html`, `jornada-verano-2026.html`,
`otde.html` (Soporte Remoto), `asistencia.html` (check-in de eventos) — el
mismo bug apareció en 4 archivos porque se copió el patrón sin timeout de
uno a otro antes de que se detectara.

**Fix ya aplicado — `fetchJsonConTimeout()`:**
```js
async function fetchJsonConTimeout(url, options) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(url, { ...options, signal: ctrl.signal });
    return await r.json(); // el .json() va DENTRO del try, no fuera
  } finally {
    clearTimeout(t);
  }
}
```
**Si se agrega un `fetch()` nuevo en cualquier archivo del sitio, debe usar
este patrón** (o llamar a la función si ya existe en ese archivo) — nunca
un `fetch(...).then(r => r.json())` suelto con timeout solo alrededor del
`fetch`.

## 2. `appendRow([])` en Apps Script — arreglo vacío no es válido

**Síntoma:** `Exception: El valor rowContents que se pasa a appendRow() no
debe estar vacío.`

**Causa raíz:** usar `hoja.appendRow([])` como truco para dejar una fila en
blanco entre secciones de un reporte. Apps Script nunca lo permitió.

**Fix:** `hoja.appendRow([''])` — un arreglo con un elemento vacío, mismo
efecto visual, sí es válido.

**Dónde ya pasó:** `generarEstadisticas()` en `apps-script/formacion-docente.gs`
y en `apps-script/cursos-coeee-2026.gs` (mismo patrón copiado entre ambos).

## 3. `new Date('YYYY-MM-DD')` se corre un día en Apps Script

**Síntoma:** un curso capturado con fecha de inicio "10 de agosto" aparece
en el catálogo como "09 de agosto".

**Causa raíz:** `new Date('2026-08-10')` se interpreta como medianoche
**UTC**. Al formatear después con `Utilities.formatDate(fecha,
'America/Mexico_City', ...)`, el huso (UTC-6) recorre la fecha al día
anterior.

**Fix — construir la fecha con componentes explícitos, no parseando un
string:**
```js
function fechaLocal(isoYYYYMMDD) {
  const [y, m, d] = isoYYYYMMDD.split('-').map(Number);
  return new Date(y, m - 1, d); // constructor con Y/M/D = hora local, no UTC
}
```
Aplica a cualquier fecha que se escriba en una hoja de Sheets partiendo de
un string ISO. Si la fecha ya viene como objeto `Date` (leída de
`getValues()`), no aplica — ese objeto ya refleja la hora local correcta.

## 4. Upsert que sobrescribe datos buenos con datos vacíos

**Síntoma (potencial, detectado antes de causar daño real):** un docente ya
tenía Teléfono/Correo capturados en un registro real; una migración
histórica sin esos campos (la hoja vieja de Jornada Verano nunca capturó
teléfono) vuelve a correr y los deja en blanco.

**Causa raíz:** `upsertDocente()` sobrescribía las 9 columnas sin
condición, sin importar si el valor nuevo venía vacío.

**Fix — solo sobrescribir si el valor nuevo no viene vacío:**
```js
function valorOMantener(nuevo, actual) {
  const n = (nuevo == null) ? '' : String(nuevo).trim();
  return n ? n : (actual == null ? '' : String(actual).trim());
}
```
Relevante para cualquier función de upsert/migración futura que combine
datos de distintas fuentes con distinto nivel de completitud.

## 5. Cuota de `MailApp`/`GmailApp` — es de la cuenta, no del script

Antes de agregar cualquier envío de correo automático nuevo: el límite
diario (100 en una cuenta de Gmail normal) lo comparten **todos** los Apps
Script de esa cuenta de Google, no es exclusivo del proyecto que se esté
tocando. Un envío en lote (BCC a todos los destinatarios en un solo
`MailApp.sendEmail()`) en vez de uno por destinatario, más una revisión de
`MailApp.getRemainingDailyQuota()` antes de enviar, ya está implementado en
`apps-script/formacion-docente.gs` (recordatorios automáticos) — replicar
ese patrón, no reinventar uno nuevo que mande un correo por persona.

## 6. Mensaje de error de un campo que no se limpia al corregirse por selección (no por tecleo)

**Síntoma:** el usuario selecciona una CCT válida del autocomplete en
`formacion-docente.html`, el campo queda bien (status box verde con
Sector/Zona/Escuela), pero el mensaje rojo "Ingresa una CCT válida" se
queda visible hasta el siguiente clic en "Confirmar registro".

**Causa raíz:** `validarFormulario()` sí limpia la clase `error` del input
y `visible` del `<div>` de error, pero solo corre al enviar el formulario.
`seleccionarCct(m)` (la función que corre al hacer clic en una sugerencia)
nunca tocaba esas clases — a diferencia de teclear en el campo, que sí
puede disparar una re-validación en algunos flujos.

**Fix:** cualquier función que corrija un campo por una vía distinta a
que el usuario teclee directamente (clic en sugerencia, autocompletado,
valor puesto por JS) debe limpiar `error`/`visible` de ese campo ahí
mismo, no asumir que la próxima validación lo hará.

**Dónde ya pasó:** `seleccionarCct()` en `formacion-docente.html`.

## 7. Correo HTML sin `<meta charset="utf-8">` — acentos corruptos

**Síntoma:** al previsualizar un correo HTML generado por Apps Script
fuera de `MailApp` (ej. sirviéndolo con un server local para revisar el
diseño), los acentos aparecen como "Ã³n", "Â±", "â€"" en vez de "ón", "±", "—".

**Causa raíz:** el HTML no declaraba `<meta charset="utf-8">`, así que
cualquier cliente/visor que no reciba (o no respete) el charset por la
cabecera MIME tiene que adivinar la codificación de los bytes — y suele
adivinar mal con UTF-8 multibyte. `MailApp.sendEmail` normalmente sí pone
el charset correcto en la cabecera MIME real, pero declararlo también en
el `<meta>` del HTML es la práctica estándar para correos y evita
depender de que cada cliente/proxy de correo respete la cabecera.

**Fix:** todo HTML que se mande como `htmlBody` de un correo debe incluir
`<head><meta charset="utf-8"></head>` como lo primero en el documento.

**Dónde ya pasó:** `construirCorreoHtml()` en `apps-script/formacion-docente.gs`.

## 8. Recordatorio marcado "enviado" sin haberse mandado nunca — evaluación tardía

**Síntoma:** la columna `Recordatorio_inicio_enviado` en `Cursos` queda en `TRUE`, pero nunca
llegó ningún correo a los inscritos ni copia a la cuenta que corre el script.

**Causa raíz:** `enviarRecordatoriosDiarios()` evalúa una vez al día si un curso está dentro de
su ventana de aviso. Si por cualquier motivo (activador no instalado ese día, redeploy a media
mañana, etc.) el curso llega a evaluarse **después** de que su fecha de inicio ya pasó
(`hoy > inicio`), el código marca la columna en `TRUE` para dejar de reevaluarlo — pero nunca
llamó a `enviarCorreoLote()`. Es intencional (evita reintentos infinitos sobre un curso ya
vencido), pero el efecto es que el aviso se pierde en silencio, sin ningún registro visible del
fallo.

**Confirmado en producción (6 ago 2026):** pasó de verdad con el Seminario "Convivencia digital
entre estudiantes" (4 ago 2026, sin `Hora_inicio` capturada) — la columna quedó en `TRUE` pero
no existe ningún correo real enviado para ese curso.

**Corregido (6 ago 2026):** ambos avisos ("1 día antes" en `enviarRecordatoriosDiarios()` y "30
minutos antes" en `enviarRecordatoriosWebinar()`) ya no se resignan la primera vez que se
evalúan tarde. Se les quitó el piso inferior (`diasParaInicio >= 0` / `minutosFaltantes >= 0`):
si el curso ya inició pero no ha terminado (`hoy <= Fecha_fin`), reintentan en cada corrida
subsecuente con el mensaje ajustado a "ya inició"/"ya comenzó" en vez de "empieza en...". Solo
se marca `TRUE` sin enviar cuando el curso ya terminó por completo (`hoy > Fecha_fin`) — ahí sí
ya no hay nada útil que avisar.

**Dónde ya pasó:** `enviarRecordatoriosDiarios()` en `apps-script/formacion-docente.gs`.

## 9. Correo con `to: Session.getEffectiveUser().getEmail()` cae en Recibidos, no en Enviados

**Síntoma:** un recordatorio automático se manda de verdad (el registro de ejecuciones de Apps
Script lo confirma como "Completada", 0% de error, y la columna de la Sheet queda en `TRUE`),
pero no aparece en la carpeta "Enviados" de ninguna cuenta de correo.

**Causa raíz:** `enviarCorreoLote()` (y el mismo patrón en el resto de las automatizaciones de
OTDE, incluido el SGCI viejo de `Correos-institucionales`) manda el correo con
`to: Session.getEffectiveUser().getEmail()` (una copia a la misma cuenta de Google que corre el
script) y los destinatarios reales en `bcc`. Gmail archiva esa copia-a-sí-mismo como correo
**recibido**, no como enviado — es el comportamiento normal de Gmail para un mensaje donde el
remitente y el destinatario visible (`to`) son la misma cuenta, no un bug de código.

**No es un bug — es un comportamiento a conocer.** Si alguien reporta "no veo nada en
Enviados", el correo probablemente sí salió: hay que revisar **Recibidos** de la cuenta de
Google que tiene instalados los activadores del proyecto (`otde.nezahualcoyotl@gmail.com` para
Formación Docente), nunca una cuenta de Outlook/Microsoft — el `replyTo` institucional solo
redirige las *respuestas*, el envío real siempre sale de esa cuenta de Gmail.

**Dónde ya pasó:** confirmado en `apps-script/formacion-docente.gs` (6 ago 2026); mismo patrón
en `mantenimiento.gs`/`asesorias.gs` y en el sistema viejo de `Correos-institucionales`.

## 10. Un fix "corregido" en el repo no está corregido hasta que se redespliega

**Síntoma:** un checkpoint anterior de `docs/BITACORA.md` da por corregido un bug, con commit
y todo, pero el bug sigue pasando en producción semanas después.

**Causa raíz:** el flujo de este proyecto para Apps Script es copiar el `.gs` completo al
editor en vivo y crear una nueva implementación — son 2 pasos manuales separados de "corregir
el código en el repo", y ninguno de los dos ocurre solo. Un "Pendiente para Jorge" anotado en
la bitácora es fácil de perder de vista si nadie vuelve a verificarlo.

**Confirmado en producción (7 ago 2026):** el checkpoint del 6 ago 2026 corrigió 3 bugs de QA
(commit `0d1eba6`) y dejó anotado "Pendiente para Jorge: redesplegar". Al verificar un día
después, ninguno de los dos proyectos (Asesorías, Formación Docente) tenía el fix en el código
desplegado — se había quedado solo en el repo.

**Cómo verificarlo de verdad (no basta con ver la fecha de la implementación activa):** buscar
en el editor de Apps Script en vivo (`Cmd+F`) un string específico que el fix haya
agregado/quitado — por ejemplo `confirmaMantenimiento` (debe existir si el fix de Asesorías
llegó) o `MINUTOS_ANTES_INICIO_MIN` (debe **no** existir si el fix de Formación Docente llegó).
La fecha/número de la implementación activa en "Administrar las implementaciones" no es
suficiente evidencia — puede estar desactualizada por el mismo motivo.

**Dónde ya pasó:** `apps-script/asesorias.gs` y `apps-script/formacion-docente.gs` (6→7 ago
2026). **Nueva ocurrencia (28 ago 2026):** el condicional que hace opcional la casilla de
confirmación de mantenimiento previo para el tipo "Excel básico" (`d.tipoAsesoria.trim() ===
'Banco de Materiales y Chuka' && !d.confirmaMantenimiento`) sí está en el repo, pero producción
lo sigue exigiendo también para "Excel básico" — detectado esta vez no por grep en el editor,
sino con un submit real vía `curl` contra el endpoint desplegado (integration test de todo el
sitio) que devolvió el error de la casilla pese a mandar `tipoAsesoria: 'Excel básico'`. Confirma
que el método del editor (`Cmd+F`) no es la única forma válida de verificar un redeploy — un
submit real de caja negra contra el endpoint público también lo expone, sin necesitar acceso al
editor de Apps Script.

## 11. Regla de ancho compartida (`input { width:100% }`) también estira los checkboxes

**Síntoma:** un `<input type="checkbox">` dentro de `.soporte-form-group` aparece pegado al
borde izquierdo del formulario y su texto (`<span>` o el propio contenido del `<label>`) queda
lejos, a la derecha — como si hubiera un espacio en blanco enorme entre la casilla y su
etiqueta.

**Causa raíz:** `.soporte-form-group input, .soporte-form-group select, .soporte-form-group
textarea { width: 100%; ... }` se pensó para inputs de texto, pero el selector `input` también
alcanza a `type="checkbox"` — lo estira a todo el ancho del contenedor flex, empujando el
`<span>` de al lado hasta el extremo opuesto.

**Fix:** `.soporte-form-group input[type="checkbox"] { width: auto; padding: 0; }`.

**Dónde ya pasó:** encontrado al construir el checklist de "Equipos con falla" en Mantenimiento
(ago 2026) — pero el mismo problema ya existía, sin que nadie lo hubiera notado, en el checkbox
de confirmación de mantenimiento previo de Asesorías (`ase-confirma-mantenimiento`, agregado en
agosto 2026); el fix general lo corrigió también ahí.

## 12. Mensaje de error genérico de CCT que no se limpia al activarse el fallback manual

**Síntoma:** el usuario captura una CCT que no existe en la base; aparece correctamente el
aviso ámbar "CCT no encontrada en nuestra base. Puedes capturar los datos manualmente." y se
revelan los campos manuales — pero si antes hubo un intento de envío fallido con el campo CCT
vacío, el mensaje de error rojo genérico ("Ingresa una CCT válida.") se queda visible al mismo
tiempo, encima del aviso ámbar. Dos mensajes contradictorios sobre el mismo campo a la vez.

**Causa raíz:** el listener `change` del input de CCT que detecta "no encontrada" y activa el
fallback manual nunca tocaba las clases `error`/`visible` del mensaje genérico — solo la
validación completa del formulario (al enviar) las limpiaba. Mismo espíritu que el ítem 6 de
esta lista: cualquier función que corrija el estado de un campo por una vía distinta a que el
usuario lo revalide manualmente debe limpiar `error`/`visible` ahí mismo, no asumir que la
próxima validación lo hará.

**Fix:** en el bloque `if (!cctEncontrada && ...)` de cada listener `change`, agregar
`cctInput.classList.remove('error')` y `document.getElementById('<prefijo>-cct-error')
.classList.remove('visible')` junto con el resto del fallback.

**Dónde ya pasó:** los 6 lugares que comparten el patrón de autocomplete de CCT —
`sopInputCct`/`manInputCct`/`aseInputCct`/`altInputCct` en `otde.html`, el `estado.input`
compartido de `crearCctAutocomplete()` (usado por `cam`/`rst`/`inc`, también en `otde.html`), y
`inputCct` en `formacion-docente.html`. Encontrado con un smoke test real (submit vacío → CCT
inexistente) en `otde.html`, y confirmado por inspección que el mismo patrón, copiado, tenía el
mismo hueco en los otros 5 lugares.

## 13. `const` de nivel superior que lee variables de otro archivo del mismo proyecto Apps Script

**Síntoma:** al probar en vivo el endpoint nuevo `?action=consulta` de `WebApp.gs` (router del
webform de Correo), cualquier folio de los 4 subtipos (`OTDE-ALT-`/`OTDE-CAM-`/`OTDE-2FA-`/
`OTDE-INC-`) devolvía una página de error de Apps Script en vez de JSON:
`ReferenceError: HOJA_ALTA is not defined (línea 36, archivo "WebApp")`.

**Causa raíz:** Apps Script concatena todos los `.gs` de un proyecto en un solo scope global,
pero **no garantiza el orden de evaluación** de los `const`/`let` de nivel superior entre
archivos distintos. `WebApp.gs` tenía un `const MAPA_PREFIJO_HOJA_CONSULTA = { 'OTDE-ALT-':
HOJA_ALTA, ... }` de nivel superior que leía `HOJA_ALTA` (definida como `const` de nivel
superior en `Alta.gs`) — si `WebApp.gs` se evalúa antes que `Alta.gs`, `HOJA_ALTA` todavía no
existe y truena. No pasa con funciones (se hoistean completas), solo con `const`/`let` que se
*ejecutan* al cargar el archivo.

**Fix:** mover el objeto dentro de la función que lo usa (`manejarConsultaCorreo()`) en vez de
dejarlo a nivel de módulo — para cuando `doGet()` se invoca, los `.gs` ya terminaron de
evaluarse todos, así que dentro de una función es seguro leer variables de otro archivo.

**Cómo se detectó:** no por lectura de código — el bug es invisible revisando el archivo aislado
(la sintaxis es válida, el error solo aparece en tiempo de ejecución y depende del orden interno
de concatenación de Apps Script, que no es config ni está documentado). Se encontró probando el
endpoint recién desplegado con `curl` contra la URL real, no asumiendo que "desplegó sin error
de guardado" significaba "funciona".

**Dónde ya pasó:** `Correos-institucionales/webform-2026-2027/WebApp.gs` (único caso hoy — es el
único proyecto de Apps Script del sitio con múltiples archivos `.gs`; `mantenimiento.gs`,
`asesorias.gs` y `soporte-remoto.gs` son cada uno un solo archivo, así que no pueden tener este
problema). Si se agrega código nuevo a `Alta.gs`/`CambioContrasena.gs`/`Reset2FA.gs`/
`Incidencias.gs`/`OnEdit.gs` que se referencie desde `WebApp.gs` (o viceversa), evitar
`const`/`let` de nivel superior que dependan de otro archivo — usarlos solo dentro de funciones.

## 14. El botón ▶️ Ejecutar del editor de Apps Script llama a la función seleccionada **sin
argumentos** — no hay forma de escribirle un parámetro ahí

**Síntoma:** al configurar el token del Panel OTDE (ago 2026, ver `panel-otde.gs` y
`docs/ARCHITECTURE.md §20`), Jorge seleccionó `manConfigurarTokenPanel` en el selector de
funciones del editor y le dio ▶️ Ejecutar — truena `Exception: Invalid argument: value` en la
línea del `setProperty(...)`. El mismo intento en los otros 3 backends (`aseConfigurarTokenPanel`/
`sopConfigurarTokenPanel`/`configurarTokenPanel`) dejó los 4 sin token real configurado
(`PropertiesService` nunca guardó el secreto), así que el Panel fallaba después con
`no_autorizado` en los 4 a la vez — un síntoma que parecía "el secreto no coincide" pero la causa
real era que nunca se había guardado ninguno.

**Causa raíz:** el botón ▶️ Ejecutar (o "Ejecutar función" del menú) siempre llama a la función
tal cual está seleccionada, sin parámetros — es equivalente a invocarla como `miFuncion()`, nunca
`miFuncion('valor')`. Cualquier función de este proyecto que reciba un argumento
(`manActivarModoPrueba(correo)`, `manConfigurarTokenPanel(token)`, y sus equivalentes `ase`/`sop`/
sin prefijo) no se puede correr así — llega `undefined`.

**Fix / cómo correr una función con argumento desde el editor:** envolverla en una función
temporal sin parámetros que sí traiga el valor escrito adentro, y seleccionar/ejecutar *esa*:
```js
function _fijarTokenPanel() {
  manConfigurarTokenPanel('el-secreto-real-aqui');
}
```
Es el mismo patrón ya documentado en los comentarios de cabecera de `manActivarModoPrueba()` y
similares ("Actívalo corriendo `manActivarModoPrueba('tu@correo.com')` una vez desde el editor")
— esa instrucción siempre implicó este paso intermedio, pero nunca se había escrito explícito
hasta que causó un error real.

**Dónde puede volver a pasar:** cualquier función `activarModoPrueba(correo)`/
`configurarTokenPanel(token)`/similar en los 5 backends de trámite (`mantenimiento.gs`,
`asesorias.gs`, `soporte-remoto.gs`, `formacion-docente.gs`, `Correos-institucionales/
webform-2026-2027/`) — todas requieren este envoltorio temporal para correrse desde el editor.

## 15. Selector CSS por ID (`#sop-cct-suggestions`) que solo estilaba un formulario de los 7 que comparten el patrón

**Síntoma:** la lista de sugerencias del autocomplete de CCT se mostraba como una lista sin
estilo, insertada en el flujo normal de la página (sin fondo, sin posición flotante, sin
scroll ni hover) — en vez del dropdown flotante esperado.

**Causa raíz:** el CSS del dropdown de sugerencias (`otde.html`, antes de ago 2026) usaba el
selector por ID `#sop-cct-suggestions` — que por definición solo coincide con **un** elemento,
el `<ul>` de Soporte. Mantenimiento (`#man-cct-suggestions`), Asesorías (`#ase-cct-suggestions`)
y los 4 sub-formularios de Correo (`#alt/cam/rst/inc-cct-suggestions`) usan el mismo patrón de
autocomplete (mismo `.sop-cct-wrapper`, mismo JS) pero con su propio ID prefijado, así que nunca
coincidían con esa regla — bug presente desde que se copió el patrón de Soporte a las demás
tabs, nunca detectado porque visualmente "funciona" (la lista aparece, solo fea).

**Cómo se encontró:** al mover este CSS de `otde.html` a `styles.css` (27 ago 2026, migración
de Asesorías a página propia), se revisó cada selector para no arrastrar acoplamiento oculto.

**Fix:** generalizar el selector a un atributo que combina con cualquier ID que termine en ese
sufijo, sin tocar ningún HTML: `ul[id$="-cct-suggestions"]` (ver `styles.css`). Cubre los 7
formularios con un solo bloque de reglas.

**Dónde puede volver a pasar:** cualquier CSS nuevo escrito contra un ID específico
(`#prefijo-algo`) cuando en realidad el patrón se repite en varios formularios con distinto
prefijo — preferir un selector de clase o de atributo (`[id$="-sufijo"]`) desde el principio si
el mismo bloque de HTML/JS ya se copia a más de una tab/página.

## 16. `.form-container` sin `max-width` — campos de texto estirados a ~850px en pantallas anchas

**Síntoma:** en escritorio, un campo como "RFC con homoclave" (13 caracteres) o "Clave de
Centro de Trabajo" (10 caracteres) se veía como una caja de texto casi del ancho completo de la
pantalla — mucho espacio en blanco dentro del propio input. Reportado por Jorge como "huecos
vacíos y desperdiciados" en un smoketest de UI.

**Causa raíz:** `.soporte-form-group input, select, textarea { width: 100% }` (correcto en sí)
hereda el ancho de su contenedor, `.form-container` — que nunca tuvo `max-width`. El botón que
abre el formulario (`.form-button`) sí estaba limitado a `max-width: 500px`, pero el contenedor
que se despliega debajo no, así que los campos terminaban ocupando ~850px en una pantalla de
1440px.

**Fix:** `max-width: 640px; margin: 0 auto;` en `.form-container` (`styles.css`) — un solo
cambio corrige las 4 páginas de trámite a la vez, sin tocar ningún HTML.

**Dónde puede volver a pasar:** cualquier contenedor de formulario nuevo que reuse
`.form-container`/`.soporte-form-group` sin verificar visualmente en una pantalla ancha (no
solo en el viewport angosto del editor/DevTools por default).

## 17. Validación de correo institucional que solo revisa el sufijo, no el correo completo

**Síntoma:** el campo "Correo institucional" en Cambio de Contraseña / Eliminar Método de
Autenticación / Incidencias (`correo.html`) aceptaba `"@dee.edu.mx"` a secas — sin nombre de
usuario — como válido, y el formulario intentaba enviarlo al backend real.

**Causa raíz:** `validarCorreoInstitucional(input)` usaba `v.endsWith('@dee.edu.mx') ||
v.endsWith('@aulamexiquense.mx')` — revisa el final de la cadena, nunca que exista algo antes
de la arroba.

**Fix:** `/^[^\s@]+@(dee\.edu\.mx|aulamexiquense\.mx)$/.test(v)` — exige una parte local no
vacía además del dominio correcto.

**Dónde ya pasó:** solo `correo.html` tenía este patrón exacto (`.endsWith()` para validar un
correo). Revisar si aparece de nuevo en cualquier campo que valide "correo con dominio
específico" en vez de "correo con formato válido, cuyo dominio además es X".

## 18. RFC validado solo por longitud mínima, sin formato — y sin coincidir con el propio texto de ayuda

**Síntoma:** el campo RFC aceptaba cadenas como `"AAAAAAAAAA"` (10 letras repetidas, sin
ningún formato real) como válidas.

**Causa raíz:** la regla era `v.trim().length >= 10` — comparado con CURP en el mismo
formulario, que sí exige exactamente 18 caracteres. En `formacion-docente.html` el defecto era
más sutil: el regex `/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i` aceptaba también RFCs de 12 caracteres
(prefijo de 3 letras, formato de persona moral/empresa) pese a que el texto de ayuda junto al
campo promete literalmente "13 caracteres (personas físicas)".

**Fix:** en ambos archivos, exigir exactamente 13 caracteres con el formato real de persona
física: `/^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/i` (4 letras + 6 dígitos + 3 alfanuméricos), en cliente
**y** backend (`Alta.gs` en `Correos-institucionales`, `apps-script/formacion-docente.gs`).

**Dónde ya pasó:** `correo.html` (Alta de cuenta) y `formacion-docente.html` — mismo defecto
en dos archivos independientes, ninguno copiado del otro. Si se agrega un campo RFC en algún
otro formulario del sitio, usar el regex de 4 letras, no el de longitud mínima ni el de 3-4.

## 19. Envío secuencial de varios registros: si uno falla a la mitad, los éxitos anteriores se pierden de la vista

**Síntoma:** en `formacion-docente.html`, al registrar varios cursos en una sola solicitud, si
el curso N fallaba (por ejemplo porque el catálogo cacheado en el navegador quedó
desactualizado y ese curso ya no existe/está inactivo en la hoja real), el docente solo veía un
mensaje de error genérico — sin ningún rastro de que los cursos 1..N-1 sí se habían registrado
correctamente, con folio real ya generado.

**Causa raíz:** `enviarFormulario()` hace un `POST` por curso dentro de un `for`, acumulando
resultados en un arreglo local. Si un `POST` falla, el `throw` corta el `for` de inmediato y
salta directo al `catch` — que nunca llegaba a llamar `mostrarConfirmacion(resultados)`, así
que el arreglo con los folios ya obtenidos se descartaba en silencio junto con el resto de la
función.

**Fix:** en el `catch`, si `resultados.length > 0`, llamar a `mostrarConfirmacion(resultados,
{pendientes, mensaje})` en vez de solo mostrar el error — la pantalla de confirmación ahora
distingue "Registro parcial con OTDE" de éxito completo, lista los folios ya obtenidos, nombra
los cursos que quedaron pendientes, y ofrece un botón para volver a la selección de cursos (es
seguro reenviar la selección completa: el backend deduplica por RFC+curso, así que los ya
registrados no se duplican).

**Dónde puede volver a pasar:** cualquier flujo que envíe una **serie** de operaciones al
backend en un `for`/`for...of` con un solo `try/catch` alrededor de todo — si una falla a la
mitad, revisar explícitamente qué le pasa a los resultados ya acumulados antes de dar el fix
por bueno, no asumir que "mostrar el error" es suficiente.

## 20. Correo de confirmación de Asesorías no llegó pese a `status:ok` y folio válido — causa raíz sin diagnosticar

**Síntoma:** al probar Asesorías (integration test, 28 ago 2026, folio `OTDE-ASE-0001`), el
`POST` regresó `{"status":"ok","folio":"OTDE-ASE-0001"}` y el folio quedó consultable por
`?action=consulta` con estatus "Pendiente de validar" — la solicitud sí se guardó en `Solicitudes`
correctamente. El correo de confirmación al solicitante, en cambio, nunca llegó. Los otros 6
flujos probados en la misma sesión (Soporte, Mantenimiento, y los 4 de Correo Institucional) sí
mandaron su correo de confirmación sin problema, con el mismo correo de prueba como destinatario.

**Causa raíz:** no investigada esta sesión. Hipótesis sin confirmar: podría estar relacionado con
el mismo despliegue desincronizado del ítem #10 arriba (`asesorias.gs` local vs. lo realmente
pegado en el editor), o ser un problema aparte específico de `aseNotificarSolicitudRecibida()` (o
el nombre real de esa función en el código desplegado — verificar contra el editor, no asumir que
coincide con el nombre del repo dado el ítem #10). El `try/catch` silencioso que envuelve el envío
de correo en los 3 backends de este repo (documentado como diseño intencional — "no bloquea el
registro si el envío falla") también significa que un error real ahí no deja ningún rastro
visible para el solicitante ni para OTDE.

**Pendiente:** diagnosticar contra el editor de Apps Script real (revisar Ejecuciones/logs del
proyecto "Asesorias - Backend" alrededor de la hora del folio `OTDE-ASE-0001`, 2026-08-28
~21:28 UTC) antes de asumir cuál de las dos hipótesis es la correcta.

## 21. Servidor de pruebas local (`python3 -m http.server`) sirve HTML/JS cacheado tras editar el archivo

**Síntoma:** se edita un `.html` (o su `<script>` inline) y se navega de nuevo a la misma URL en
la misma pestaña de Chrome (incluso con un `navigate` fresco, distinto de solo recargar) — el
comportamiento nuevo no aparece, la página sigue actuando como la versión anterior. Pasó
probando un cambio de UI/UX en `ficha-ceremonias-civicas.html` (30 ago 2026): un fix que sí
estaba guardado en disco no se reflejaba en el navegador tras dos navegaciones seguidas.

**Causa raíz:** `python3 -m http.server` no manda cabeceras `Cache-Control`/`ETag` que le digan
a Chrome que revalide — el navegador puede servir su copia en caché de un archivo aunque el
archivo en disco ya haya cambiado, incluso navegando de nuevo a la misma URL sin refrescar la
pestaña por su cuenta.

**Cómo confirmarlo y evitarlo:** si un cambio de HTML/JS no se refleja pese a estar guardado,
forzar `Cmd+Shift+R` (hard reload, ignora caché) o agregar un parámetro de query nuevo a la URL
(`?v=2`, incrementando cada vez) antes de dar el comportamiento por confirmado o descartado. No
asumir que el código tiene un bug solo porque el navegador no refleja el cambio — descartar
primero el caché.

## 22. Favicon SVG sin respaldo PNG + sin `og:image` — WhatsApp no mostraba ícono ni vista previa al compartir un link

**Síntoma:** Jorge reportó que al compartir por WhatsApp el link de `index.html` sí aparecía un
ícono junto a la vista previa, pero el de cualquier otra página del sitio no.

**Causa raíz:** ninguna de las 26 páginas HTML del sitio tenía `og:image` (ni siquiera las 14
que ya traían el resto del bloque `og:type`/`og:site_name`/`og:title`/`og:description`/`og:url`),
y el único favicon declarado era `favicon.svg` — sin ningún `<link rel="icon">` en PNG/ICO de
respaldo. WhatsApp (como la mayoría de crawlers de redes sociales que arman vistas previas de
links) no rasteriza SVG para la miniatura, solo formatos raster. El ícono que Jorge veía en el
link de `index.html` casi seguro era una vista previa vieja **cacheada por WhatsApp** de antes de
que el sitio se quedara solo con favicon SVG, no evidencia de que ese link siguiera funcionando.

**Fix:** `favicon-192.png` (PNG del mismo logomark NE/ZA) agregado en las 26 páginas junto al
`<link>` del SVG existente, más `images/og-image.png` (512×512, mismo logomark) como `og:image`
en las 26 — completando también el bloque `og:` entero en las 12 páginas que no tenían ninguno.
Detalle completo en `docs/ARCHITECTURE.md §23`.

**Dónde puede volver a pasar:** cualquier página nueva que solo copie el `<link rel="icon"
href="favicon.svg">` sin el PNG de respaldo, o que arme su bloque `og:` sin `og:image` — el
checklist de páginas nuevas (`docs/ARCHITECTURE.md §10`) ya se actualizó para exigir ambos, pero
depende de seguirlo. **No verificado contra una vista previa real de WhatsApp** en esta sesión —
solo se confirmó que los archivos cargan (200) y que las páginas siguen renderizando bien.

## 23. Timeout fijo de 30s se cumplía antes de que el servidor terminara — envío de fotos "fallaba" con la información ya guardada

**Síntoma:** jefes reportaban "el servidor tardó en responder" al enviar la ficha de Ceremonias
Cívicas con varias fotos. Al revisar la Sheet y Drive, algunas de esas fichas **sí se habían
guardado completas** pese al mensaje de error — el usuario no podía confiar en lo que veía en
pantalla.

**Causa raíz:** dos factores combinados. (1) `visSubirFotos_()` en `apps-script/visitas-jefes.gs`
hacía dos llamadas a Drive por foto (`carpeta.createFile()` + `archivo.setSharing()`), en serie
— Apps Script no tiene concurrencia real, así que con hasta 20 fotos el envío completo podía
tardar hasta 68.7s (medido en vivo con un performance test contra el endpoint real). (2)
`fetchJsonConTimeout()` (`js/tramites-shared.js`) usaba el mismo `TIMEOUT_FETCH_MS`=30000 fijo
para *todas* las llamadas del sitio, sin distinguir que este envío en particular podía tardar
mucho más que una consulta normal. El navegador abortaba el `fetch()` a los 30s y mostraba error,
pero el servidor seguía procesando de fondo y terminaba de guardar los datos igual — el aviso de
error era falso en esos casos, no un fallo real.

**Fix:**
1. `visObtenerCarpetaFotos_()` comparte la carpeta de Drive completa ("cualquiera con el link,
   ver") una sola vez por envío en vez de compartir cada foto por separado —
   `visSubirFotos_()` ya no llama `archivo.setSharing()` por foto (los archivos heredan el
   permiso de la carpeta). Bajó el tiempo con 20 fotos de 68.7s a 35.4s, y con 10 fotos de 30.5s
   a 21.5s, verificado con la misma prueba y confirmando con `curl` sin sesión que el link de
   una foto real sigue abriendo.
2. `fetchJsonConTimeout()` ganó un tercer parámetro opcional `timeoutMs` (retrocompatible — las
   demás ~12 llamadas del sitio no lo pasan y siguen en 30s). El envío de la ficha
   (`ficha-ceremonias-civicas.html`) usa `FICHA_TIMEOUT_ENVIO_MS`=120000, con avisos progresivos
   en pantalla para que la espera larga no se sienta congelada.

**Dónde puede volver a pasar:** cualquier flujo nuevo que suba varios archivos a Drive en una
sola petición de Apps Script hereda el mismo riesgo (tiempo lineal por archivo, sin
concurrencia) — revisar si comparte fotos/PDFs por archivo individual cuando podría compartirse
la carpeta contenedora una sola vez, y si el timeout fijo de 30s de `fetchJsonConTimeout()` le
queda corto, pasar un `timeoutMs` mayor en vez de tocar el default global. Detalle completo en
`docs/ARCHITECTURE.md §22`.

## 24. URL de Drive sin escapar en mensaje de Telegram con `parse_mode: 'Markdown'` — envío tumbado en silencio si el link trae un `_` sin parear

**Síntoma:** al configurar notificaciones de Telegram por persona (Marcos/Alejandro/Nancy, sep
2026), un smoke test contra Mantenimiento y Asesorías confirmó `{"status":"ok","folio":"..."}`
y el correo de equipo llegó bien, pero el Telegram **no llegó** — ni al primer intento ni a un
segundo intento con datos distintos. Una llamada directa a la API de Telegram
(`sendMessage?chat_id=...&text=prueba`, sin pasar por Apps Script) con el mismo token/chat_id
funcionó de inmediato, descartando un problema de configuración (Script Properties correctas).

**Causa raíz:** `aseNotificarTelegram()` (`asesorias.gs`) y `manNotificarTelegram()`
(`mantenimiento.gs`) arman el mensaje con `'Oficio: ' + oficioUrl` — a diferencia de todos los
demás campos del mensaje, la URL de Drive del oficio **no** pasa por `aseEscapeMarkdown_()`/
`manEscapeMarkdown_()`. Los ID de archivo de Drive suelen traer `_`, y con un conteo impar
Telegram interpreta eso como una itálica sin cerrar y responde `400 Bad Request` ("can't parse
entities"). Como la llamada usa `muteHttpExceptions: true` y el código nunca revisa
`response.getResponseCode()`, ese error queda completamente invisible — ni un log, ni una
excepción. El folio se guarda bien porque el `appendRow()` ocurre antes; solo el aviso a Telegram
se pierde. El mismo patrón llevaba tiempo en `manNotificarTelegram()` sin que nadie lo notara —
a Alejandro le funcionaba por pura suerte con las URLs que le habían tocado.

**Fix:** envolver también `oficioUrl` con `aseEscapeMarkdown_()`/`manEscapeMarkdown_()` antes de
concatenarlo al mensaje — el link se sigue mostrando y Telegram lo sigue detectando y
convirtiendo en clicable automáticamente (el auto-link de URLs de Telegram opera sobre el texto
ya resuelto, no sobre el markdown crudo), solo deja de romper el parseo. Verificado en vivo tras
redesplegar: Telegram llegó a Alejandro y a Nancy en la siguiente prueba.

**Dónde puede volver a pasar:** cualquier mensaje de Telegram con `parse_mode: 'Markdown'` que
concatene un valor no controlado (URL, nombre de archivo, texto libre) sin pasarlo por el
escapador correspondiente — y, en general, cualquier llamada a `UrlFetchApp.fetch()` con
`muteHttpExceptions: true` que nunca revise el código de respuesta: ese patrón traga cualquier
error de la API remota en silencio, no solo este.

## 25. Función temporal pegada en el editor real de `WebApp.gs`, con `PANEL_TOKEN` hardcodeado y débil

**Síntoma:** verificación pre-difusión de Oficina Virtual (1 sep 2026) comparando byte a byte
(hash SHA-256) el código desplegado en Apps Script contra los `.gs` del repo, en los 4 backends
de trámite. 12 de 13 archivos coincidieron exactamente; solo `WebApp.gs` (proyecto "Webform
Correo 2026-2027 - Backend") tenía 4 líneas extra al final, ausentes del repo:

```js
function _fijarTokenPanel() {
  configurarTokenPanel('1234');
}
```

**Causa raíz:** patrón ya advertido en el ítem 14 de este mismo archivo — una función temporal
usada una sola vez desde el editor (▶️ Ejecutar) para fijar `PANEL_TOKEN` vía
`configurarTokenPanel()` nunca se borró tras usarla. Al revisar las Propiedades del script de
los 3 proyectos que ya tienen `PANEL_TOKEN` configurado (Mantenimiento, Asesorías, Soporte —
Correo lo fija a través de esta misma función pegada), los tres tienen el mismo valor: `1234`.
No es un placeholder de ejemplo — es el secreto real que protege
`?action=pendientes&token=...`, el endpoint que el Panel OTDE (`panel-otde.gs`) usa para leer
las solicitudes abiertas de los 4 trámites (folio, nombre, escuela, sector, zona, estatus).

**Fix:** pendiente — no se tocó esta sesión. No bloquea la difusión de Oficina Virtual (ese
endpoint no es el que se comparte públicamente), pero conviene, cuando haya tiempo: (1) borrar
`_fijarTokenPanel()` del editor de `WebApp.gs`, y (2) regenerar `PANEL_TOKEN` con un valor largo
y aleatorio en los 4 backends + `panel-otde.gs` (mismo secreto compartido entre los 5
proyectos, ver `docs/ARCHITECTURE.md §20`).

**Dónde puede volver a pasar:** cualquier función de un solo uso ejecutada desde el editor de
Apps Script (▶️ Ejecutar) para fijar una Script Property — bórrala del archivo en cuanto la
uses, igual que ya advierte el ítem 14 sobre no seleccionarla directo en el dropdown de
Ejecutar. Un buen momento para cazar este patrón es justo antes de una difusión pública: comparar
hash del código desplegado contra el repo en cada proyecto de Apps Script involucrado (ver
sesión del 1 sep 2026 en `docs/BITACORA.md` para el método).

## 26. Ficha post-visita duplicada hasta 5 veces (datos y fotos) — sin `LockService` ni idempotencia en el backend

**Síntoma:** una semana después de publicar `ficha-ceremonias-civicas.html`, varios jefes
reportaron a Jorge que su información y sus fotos habían quedado duplicadas — en algunos casos
hasta 5 veces — en la Sheet/Drive de Ceremonias Cívicas.

**Causa raíz:** el propio código ya documentaba la pieza que lo explica. El envío de la ficha
usa un timeout de cliente de 120s (`FICHA_TIMEOUT_ENVIO_MS`, agregado el 31 ago 2026 tras el fix
de rendimiento), pero con 20 fotos el servidor podía tardar hasta 68.7s **y seguir guardando de
fondo** aunque el navegador ya hubiera abortado el `fetch()` — el mismo patrón que motivó ese fix
anterior. Cuando eso pasaba, `enviarFicha()` mostraba "El servidor tardó demasiado en responder.
Vuelve a intentarlo en un momento." y reactivaba el botón "Enviar" — el jefe, siguiendo la
instrucción en pantalla, volvía a enviar la misma ficha con las mismas fotos. `visDoPostFicha_()`
no tenía `LockService` (a diferencia de `visDoPostReservar_()`, que sí lo tiene) ni ninguna
verificación de "esto ya se guardó", así que cada reintento repetía `visSubirFotos_()` completo
— nuevos archivos en Drive cada vez, sin ningún control de duplicados. Además, la validación de
campos obligatorios corría *después* de subir las fotos, así que un envío con campos faltantes
también dejaba fotos huérfanas en Drive antes de fallar.

**Fix:** `visDoPostFicha_()` ahora envuelve toda su lógica en `LockService.getScriptLock()`
(mismo patrón que `visDoPostReservar_()`) y, antes de tocar Drive, revisa si la fila ya tiene
`Estatus === 'Realizada'` — si es así, responde `{status:'ya_enviada', ...}` sin volver a subir
nada, y el frontend lo trata como éxito (mismo estilo visual que `status:'ok'`), no como error.
La validación de campos obligatorios se movió antes de la llamada a `visSubirFotos_()`. Sin
cambios en `visDoPostReservar_()` (ya tenía el lock desde su implementación original). Pendiente
de verificar en vivo tras el redeploy: enviar una ficha de prueba, reenviar el mismo folio, y
confirmar que Drive no recibe una segunda tanda de fotos.

**Dónde puede volver a pasar:** cualquier endpoint de `doPost` que acepte reintentos del cliente
(timeout, doble tap, dos pestañas) y haga una operación no idempotente (crear archivos, mandar
correos, incrementar contadores) sin `LockService` + un chequeo de "esto ya se procesó" basado en
una llave estable (aquí, el folio). `visDoPostReservar_()` ya estaba protegido porque su
duplicado obvio (dos reservas de la misma escuela/semana) se pensó desde el diseño original; el
riesgo aquí era menos evidente porque la ficha "solo" actualiza una fila que ya existe, en vez de
crear una nueva — pero actualizar una fila sigue sin ser gratis si antes de eso se suben archivos
a un servicio externo.

## 27. `formatearFecha()` convertía texto libre en `Fecha_inicio` a la fecha falsa "31/12/1969" en vez de mostrarlo tal cual

**Síntoma:** al dar de alta un curso en `Cursos` con `Fecha_inicio` = "Por definir" (texto libre,
sin fecha real capturada aún), el catálogo público (`doGet` de `formacion-docente.gs`) devolvía
`"fecha_inicio":"31/12/1969"` en vez de "Por definir".

**Causa raíz:** `formatearFecha(valor)` hacía `new Date(valor)` y pasaba el resultado directo a
`Utilities.formatDate(...)` dentro de un `try/catch`, asumiendo que una fecha inválida lanzaría
un error capturable. `new Date("Por definir")` sí da un objeto `Invalid Date`, pero
`Utilities.formatDate()` en Apps Script no lanza excepción con un `Invalid Date` — lo trata como
época 0 y lo formatea igual, produciendo "31/12/1969" (medianoche UTC del 1/1/1970 desplazada un
día por el huso `America/Mexico_City`) en silencio. El `catch` nunca se disparaba.

**Fix:** `formatearFecha()` ahora construye la fecha una vez (`const fecha = new Date(valor)`) y
revisa `isNaN(fecha.getTime())` **antes** de llamar a `Utilities.formatDate()` — si no es una
fecha válida, devuelve `String(valor)` tal cual, permitiendo texto libre como "Por definir" en
`Fecha_inicio`/`Fecha_fin` para cursos sin fecha confirmada. El `try/catch` se conserva como
respaldo adicional.

**Dónde puede volver a pasar:** cualquier función que pase el resultado de `new Date(valor)`
directo a `Utilities.formatDate()` (u otra API de fecha de Apps Script) confiando en que un
`Invalid Date` va a lanzar una excepción — no todas las APIs de Apps Script lo hacen. Verificar
con `isNaN(fecha.getTime())` antes de formatear siempre que el valor de entrada pueda ser texto
libre en vez de una fecha real capturada por un `date picker`.

## 28. Avisos de cobertura de Ceremonias Cívicas solo miraban `estatus === 'Realizada'` — una "Reservada" nunca completada era invisible para quien reservaba después

**Síntoma:** Jorge detectó con evidencia real que la escuela "Revolución Mexicana"
(CCT `15DPR0509L`) acumuló 3 reservas en semanas consecutivas por 3 personas distintas — la
primera (31-ago) nunca llegó a llenar la ficha, así que se quedó en estatus "Reservada" para
siempre. Las 2 personas siguientes reservaron la misma escuela sin ver ningún aviso de que ya
tenía actividad reciente.

**Causa raíz (dos causas combinadas):** (1) `visInstalarTriggerValidacion()` nunca se había
instalado en el proyecto real de Apps Script, así que `visMarcarNoRealizadas_()` — que debería
marcar "No realizada" una "Reservada" sin ficha tras `VIS_DIAS_LIMITE_VALIDACION`=3 días — nunca
corrió, y la reserva de la primera persona nunca dejó de contar como "activa" en apariencia. (2)
Aunque el trigger hubiera corrido a tiempo, el hueco de diseño real seguía ahí: todos los avisos
de `ceremonias-civicas.html` (badge del autocomplete, `visRevisarConflicto()`, contador de
cobertura) solo comparaban contra `estatus === 'Realizada'` — una fila "Reservada" de otra
semana, completada o no, era invisible para cualquiera de los tres.

**Fix:** `visRevisarConflicto()` pasó a una cascada de 3 niveles (vencida > pendiente > ya
realizada) que sí considera filas "Reservada" de otras semanas, con un `visEsVencida()` que
calcula la ventana de 3 días **100% en el cliente** (no depende de que el trigger del backend
esté corriendo — defensa en profundidad tras el fallo de arriba). El mismo criterio se
compartió (`visEtiquetaCobertura()`) con el badge del autocomplete y con la caja de estatus
persistente tras seleccionar la escuela. Motivo de revisita pasó de opcional a obligatorio, y se
agregó un checkbox de confirmación explícita — ninguno de los dos es un candado duro, solo
fricción real en vez de una advertencia ignorable. Ver `docs/ARCHITECTURE.md §22`.

**Dónde puede volver a pasar:** cualquier flujo de este sitio que dependa de un trigger diario
instalable (`visInstalarTriggerValidacion()`, `manInstalarTriggerCierre()`,
`sopInstalarTriggerCierre()`, etc.) para que un estatus "avance" solo — si el trigger nunca se
instaló o se cayó, cualquier lógica de aviso que solo mire el estatus "final" (`Realizada`,
`Resuelto`, etc.) sin considerar el estatus intermedio vencido se queda ciega igual que aquí.

## 29. Una función terminada en guion bajo (`visMarcarNoRealizadas_`) no aparece en el desplegable "Seleccionar función" del editor de Apps Script

**Síntoma:** al instalar el trigger diario de arriba (nota 28), Jorge corrió
`visInstalarTriggerValidacion()` sin problema desde el desplegable de funciones del editor, pero
al buscar `visMarcarNoRealizadas_()` para correr la limpieza retroactiva una sola vez, la función
**no aparecía en la lista** — pese a estar guardada en el archivo y no recibir ningún parámetro
(así que no era el caso de la nota #14).

**Causa raíz:** el editor nuevo de Apps Script excluye del desplegable "Seleccionar función" las
funciones cuyo nombre termina en guion bajo — la misma convención de "función privada" que ya
usa todo este proyecto (`visExisteReservaActiva_`, `visDoPostFicha_`,
`visBuscarFilaPorFolio_`, etc.). No es un bug del código, es un comportamiento del editor que
nadie había necesitado ejecutar manualmente hasta ahora — el resto de funciones con guion bajo
de este sitio normalmente solo se llaman desde otro código, nunca directo desde el botón
▶️ Ejecutar.

**Fix:** envolverla en una función temporal sin guion bajo, guardar, y seleccionar/ejecutar esa
en su lugar — mismo mecanismo que la nota #14, aunque la causa raíz es distinta (ahí faltaba un
argumento; aquí falta que el nombre no termine en `_`):
```js
function ejecutarLimpiezaCeremoniasAhora() {
  visMarcarNoRealizadas_();
}
```

**Dónde puede volver a pasar:** cualquier función con guion bajo al final de cualquier backend
de este sitio (todos siguen esta convención para "privado") que alguna vez necesite correrse
manualmente desde el editor en vez de solo ser invocada por otro código.

## 30. Botón "Enviando…" quedaba congelado tras "Volver a elegir cursos" en un envío parcialmente fallido

**Síntoma:** al QA-probar el flujo de doble registro (16 sep 2026), un envío de varios cursos que
fallaba a la mitad (ver también la nota #19, envío secuencial) dejaba visible la opción "Volver a
elegir cursos". Al usarla y volver a intentar el registro, el botón `btn-submit` de
`formacion-docente.html` se quedaba mostrando "Enviando…" y deshabilitado — sin ningún error en
consola, el registro nunca llegaba a completarse ni a fallar visiblemente otra vez.

**Causa raíz:** en `enviarFormulario()` (`formacion-docente.html`), la rama de envío parcial
(algunos cursos sí, otros no) hacía su `return` **antes** de llegar al código que reactivaba
`btn-submit` (`btn.disabled = false; btn.textContent = 'Confirmar registro';`) — ese código vivía
suelto al final de la función, no en un bloque que corriera pasara lo que pasara. Las ramas de
éxito total y error total sí llegaban a reactivarlo por casualidad de dónde estaba su propio
`return`; la parcial no.

**Fix:** la reactivación del botón se movió a un bloque `finally` del `try/catch` de
`enviarFormulario()` — corre en **todos** los caminos (éxito, error total, error parcial),
comentado en el propio código como "en TODOS los caminos, incluido el registro parcial".

**Dónde puede volver a pasar:** cualquier función con varias ramas de salida (éxito/error
total/parcial) que reactive estado de UI (botones, spinners) en unas ramas y no en otras —
revisar que la limpieza esté en las tres, no solo en las dos más obvias de probar.

## 31. Folio `OTDE-CAP-0089` duplicado — dos docentes distintos, generado 1 segundo aparte, sin `LockService` en `doPost`

**Síntoma:** al revisar `Inscripciones` durante el reorden de columnas del Paso 3 (16 sep 2026),
se encontró el folio `OTDE-CAP-0089` repetido en dos filas con RFC/nombre de docente distintos,
con `Fecha_registro` 1 segundo de diferencia (10 sep 2026). Una de esas dos filas (189) era
además la misma fila que ya se sabía sin sus fórmulas VLOOKUP (hallazgo previo del mismo reorden).

**Causa raíz:** `generarFolio()` leía el máximo folio existente y sumaba 1, sin ningún candado —
dos `doPost` casi simultáneos (dos docentes registrándose al mismo tiempo, o el envío secuencial
por curso del propio cliente cruzándose con otro usuario) podían leer el mismo máximo antes de
que el primero terminara de escribir su fila, y ambos calculaban el mismo folio siguiente. El
único mecanismo previo era enviar los registros en serie *desde el cliente* (un curso a la vez),
que no protege contra dos *clientes* distintos escribiendo a la vez.

**Fix:** ya cerrado como efecto colateral del Paso 3 (no fue una corrección dirigida a este bug
específico) — `doPost()` ahora toma `LockService.getScriptLock()` alrededor de todo el registro
(folio + upsert de `Docentes` + inserción en `Inscripciones`), mismo candado que ya usa
"Reordenar columnas de Inscripciones" para no colisionar con un registro a la mitad. **Los datos
del folio duplicado no se tocaron** — queda pendiente que Jorge decida si renumera una de las dos
filas (ver `docs/ROADMAP.md`).

**Dónde puede volver a pasar:** cualquier backend de este sitio que genere un folio secuencial
leyendo "el máximo + 1" sin `LockService` alrededor de la lectura y la escritura — mismo patrón
de riesgo ya corregido aquí que en la nota #26 (Ceremonias Cívicas), aunque la causa específica
ahí era duplicar una operación completa por reintento, no una carrera entre dos folios.

## 32. Mensajes de error del fallback manual de CCT quedaban pegados en rojo al alternar la respuesta de "sin solicitud previa" en `reporte-visita.html`

**Síntoma:** en la prueba de navegador del ajuste "caso urgente sin folio" (17 sep 2026), se
reprodujo este flujo: marcar "Sí" en "¿Atención sin solicitud previa?", capturar una CCT no
encontrada, dejar Zona y Escuela del fallback manual vacíos, validar (correctamente marca error
en esos dos campos), luego cambiar la respuesta a "No" y de vuelta a "Sí" — los mensajes de error
de Zona/Escuela manual **reaparecían en rojo de inmediato**, antes de que el técnico volviera a
tocar nada.

**Causa raíz:** el listener de `change` en `#sin-solicitud` limpiaba los errores de los campos
"felices" del sub-bloque (`urg-cct`, `urg-turno`, `urg-funcion`, `urg-otra-funcion`, `urg-nombre`,
`urg-correo`) al pasar a "No", pero no los del fallback manual (`urg-tipo-cct-manual`,
`urg-sector-manual`, `urg-zona-manual`, `urg-escuela-manual`) — la lista de `limpiarError()` a
llamar se armó pensando en el camino feliz (CCT encontrada), sin considerar que el sub-bloque
completo puede haber quedado marcado con errores del fallback manual desde una validación previa.
Como `validarFormulario()` solo *agrega* la clase de error cuando algo falta (nunca la quita por
sí sola si ya es válido — el resto del formulario sigue el mismo patrón, apoyándose en que el
usuario dispare un evento `change`/`input` real al corregir el campo), esos mensajes viejos
quedaban vivos en el DOM aunque el bloque estuviera oculto, y reaparecían intactos en cuanto el
bloque se volvía a mostrar.

**Fix:** ampliar la lista de campos que se limpian al elegir "No" para incluir también los 4 del
fallback manual (`reporte-visita.html`, listener de `sin-solicitud`):
```js
['urg-cct', 'urg-tipo-cct-manual', 'urg-sector-manual', 'urg-zona-manual', 'urg-escuela-manual',
 'urg-turno', 'urg-funcion', 'urg-otra-funcion', 'urg-nombre', 'urg-correo'].forEach(limpiarError);
```
Verificado en consola: mismo escenario reproducido, `after: []` (sin errores visibles) al volver
a "Sí".

**Dónde puede volver a pasar:** cualquier sub-bloque condicional de este sitio con más de un
"camino" interno (aquí: CCT encontrada vs. fallback manual) cuyo toggle de nivel superior limpie
errores a mano en vez de reutilizar una función que cubra *todos* los campos del sub-bloque, sin
importar por cuál camino interno se llegó a marcarlos.

## 33. Los filtros de "recientes" de los reportes PDF de Ceremonias Cívicas solo tenían límite inferior — una fecha de referencia pasada podía mostrar visitas "del futuro" respecto a ella

**Síntoma:** encontrado con un arnés de pruebas en Node, **antes de llegar a producción**, al
implementar la fecha de referencia (`visPedirFechaReferencia_()`) para
`visGenerarReporteSeguimiento_()`/`visGenerarReporteResumen_()` (`apps-script/visitas-jefes.gs`,
20 sep 2026): con una fecha de referencia pasada (ej. 15/09/2026), una visita `Realizada` con
`Fecha de visita real` posterior a esa fecha (ej. 18/09/2026, mientras la fecha real del sistema
era 20/09/2026) aparecía igual en el reporte — como si, generado "el 15 de septiembre", el
reporte ya supiera de una visita que en ese momento todavía no había pasado.

**Causa raíz:** los tres filtros de ventana ("Realizadas recientes"/"No realizadas recientes" del
reporte de seguimiento, y el filtro de `visGenerarReporteResumen_()`) solo comparaban
`f >= limiteAtras` (límite inferior). Mientras `hoy` estuvo fijo a `new Date()` (diseño original,
antes de esta sesión) esto nunca importaba — nada en la Sheet puede estar fechado en el futuro
respecto al momento real de ejecución. En cuanto `hoy` pasó a ser una fecha de referencia elegible
por el usuario, dejó de ser cierto: cualquier fila fechada entre la fecha de referencia y la fecha
real del sistema quedaba "en el futuro" respecto a la referencia, pero seguía pasando el filtro.

**Fix:** agregar `&& f <= hoy` a los tres filtros afectados (dos en
`visGenerarReporteSeguimiento_()`, uno en `visGenerarReporteResumen_()`). Verificado con 9 casos
en un arnés de Node que simula `SpreadsheetApp`/`Utilities`/`DriveApp`, incluyendo explícitamente
una fila fechada después de la fecha de referencia elegida (debe excluirse) junto a una fila
dentro de la ventana (debe incluirse) y una anterior a la ventana (debe excluirse) — los tres
casos en la misma corrida.

**Dónde puede volver a pasar:** cualquier filtro de "ventana reciente" (`fecha >= limite`) escrito
asumiendo implícitamente que `hoy`/`ahora` es siempre el momento real de ejecución — si ese valor
alguna vez se vuelve parametrizable (una fecha de referencia, un "generar como si fuera tal día"),
el límite inferior deja de ser suficiente por sí solo y hace falta el superior también.

## 34. Botón CTA de los correos de Mantenimiento/Asesorías/Soporte se veía en azul/morado en vez de blanco — el color solo estaba en el `<style>` del `<head>`

**Síntoma:** Jorge reportó (21 sep 2026) que el texto del botón CTA de los correos automatizados
(ej. "Consultar estatus de tu solicitud") se leía en azul/morado/un tono oscuro difícil de
distinguir del fondo, en vez del blanco que el código declaraba.

**Causa raíz:** en `mantenimiento.gs`/`soporte-remoto.gs`/`asesorias.gs`, el botón se construía
como `'<a href="' + opts.ctaHref + '" class="btn">...'`, dependiendo 100% de la regla
`.btn{...color:#ffffff...}` dentro de un bloque `<style>` en el `<head>` del correo, sin ningún
`style=` inline en el propio `<a>`. Varios clientes de correo (Outlook, Gmail, Apple Mail) ignoran
o pisan ese `<style>` con su color de link por default — justo el bug que `formacion-docente.gs`
(`construirCorreoHtml()`) y los 4 archivos de `apps-script/correo/` ya evitaban a propósito
(comentario explícito en `construirCorreoHtml()`: *"Estilos 100% inline... porque los clientes de
correo ignoran `<style>` en el `<head>` con frecuencia"*) — solo estos 3 backends se habían quedado
con el patrón viejo.

**Fix:** agregar el mismo `style="..."` del `.btn` directamente inline sobre el `<a>` (dejando
`class="btn"` como respaldo redundante), idéntico en los 3 archivos:
```js
const cta = opts.ctaHref
  ? '<a href="' + opts.ctaHref + '" class="btn" style="display:inline-block;background-color:#9F2241;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;text-align:center;padding:12px 22px;border-radius:6px;">' + (opts.ctaTexto || '...') + ' &rarr;</a>'
  : '';
```

**Dónde puede volver a pasar:** cualquier correo HTML nuevo que declare color/fondo de un `<a>`
solo dentro de un bloque `<style>` del `<head>` — en correo, a diferencia de una página web, hay
que asumir que el cliente puede ignorar `<style>` por completo y poner lo importante (sobre todo
`color` de texto sobre un fondo de color) también inline.

## 35. `.gs` redesplegado ≠ `.html` publicado — el enlace real del correo abría el catálogo, no el formulario nuevo

**Síntoma:** al probar de punta a punta (sin modo de prueba) el recordatorio de constancia de
conferencias UNETE (21 sep 2026), el correo real llegó bien y la liga firmada tenía el formato
correcto (`formacion-docente.html?subirConstancia=<folio>&t=<firma>`), pero al abrirla en el
sitio en producción se veía el catálogo normal de Formación Docente — nunca la mini-página de
carga de constancia.

**Causa raíz:** Jorge había redesplegado `apps-script/formacion-docente.gs` en Apps Script (así
que el backend ya generaba la liga correcta), pero `formacion-docente.html` — con el manejo de
`?subirConstancia=` y la sección `#paso-subir-constancia` — seguía solo en el working directory
local, sin `git push` a `origin/main`. Backend y frontend de este sitio se despliegan por
caminos completamente independientes (Apps Script vs. GitHub Pages); redesplegar uno no implica
que el otro esté publicado, y no hay ningún aviso automático que lo detecte.

**Fix:** `git add`/`commit`/`push` de `formacion-docente.html` junto con el `.gs` ya
redesplegado (commit `331ee97`). Confirmado con `curl` contra la URL real que el CDN de GitHub
Pages ya servía el código nuevo (`grep -c "subirConstancia"` > 0) antes de reintentar en el
navegador — la caché del navegador, no la del CDN, fue lo que hizo falta invalidar con una
recarga forzada.

**Dónde puede volver a pasar:** cualquier feature que toque un backend en Apps Script y su
página en el sitio a la vez — antes de dar una prueba en vivo por fallida, confirmar por
separado que **ambas** mitades están realmente publicadas (`git status`/`git log` contra
`origin/main` para el `.html`, "Administrar implementaciones" para el `.gs`), no solo una de
las dos.

## 36. Primera vez que un proyecto de Apps Script toca `DriveApp`: redesplegar no re-pide el permiso nuevo

**Síntoma:** en la misma prueba de constancia UNETE, al subir el archivo real la respuesta fue
`Exception: You do not have permission to call DriveApp.getFoldersByName` y, después de
resolver eso, `...DriveApp.createFolder` — pese a que el `.gs` con el código de `DriveApp` ya
estaba redesplegado como nueva versión.

**Causa raíz:** los scopes de OAuth de un proyecto de Apps Script se autorizan una sola vez, la
primera vez que el código de una versión desplegada intenta usar un servicio nuevo — desplegar
una versión nueva **no** vuelve a pedir permisos por sí solo, ni siquiera si esa versión agrega
una llamada a un servicio (aquí, `DriveApp`) que el proyecto nunca había usado antes.

**Fix:** correr una vez, desde el editor de Apps Script (no desde el Web App desplegado), una
función que toque el servicio nuevo — aquí, una envoltura temporal que llamaba a
`obtenerCarpetaConstancias_()` — y aceptar el enlace "Haz clic aquí para otorgar permisos" que
aparece en el registro de ejecución. El permiso queda asociado a la cuenta que autoriza, no a
una versión de despliegue en particular, así que después de aceptarlo el Web App ya publicado
funciona sin volver a desplegar. **Gotcha de tooling encontrado en el camino:** las funciones
cuyo nombre termina en `_` (la convención de "privada" de este repo) no aparecen en el selector
de "Ejecutar" del editor — hace falta una envoltura temporal con nombre sin guion bajo para
poder correrlas manualmente, y quitarla otra vez al terminar.

**Dónde puede volver a pasar:** cualquier `.gs` de este repo al que se le agregue por primera
vez una llamada a un servicio de Google que antes no usaba (`DriveApp`, `CalendarApp`,
`GmailApp` con permisos más amplios, etc.) — antes de dar un redespliegue por listo, probar en
vivo (aunque sea corriendo la función una vez desde el editor) en vez de asumir que "ya se
autorizó cuando se pegó el código".

## 37. Badge "Registro en plataforma externa" y aviso "Este registro es para OTDE" se mostraban con solo tener `Liga_convocatoria`, aunque la inscripción externa no fuera obligatoria

**Síntoma:** revisando en vivo la conferencia "Hablemos de IA" (Categoria=Conferencia,
`Registro_previo_requerido=FALSE`), la tarjeta del catálogo mostraba la etiqueta amarilla
"Registro en plataforma externa" y, al continuar al formulario OTDE, aparecía el aviso "Este
registro es para OTDE. Tu lugar en el curso solo se aparta en la plataforma del curso." — pese
a que el flujo real de esa conferencia es registrarse solo con OTDE; el link guardado en
`Liga_convocatoria` es el link de la conferencia, que se muestra como referencia al terminar el
registro y se manda después en el recordatorio automático, no una plataforma externa donde haya
que apartar lugar.

**Causa raíz:** 4 lugares en `formacion-docente.html` decidían mostrar esas señales con solo
`curso.liga_convocatoria`/`c.liga` (que exista un link), sin revisar
`curso.registro_previo_requerido`/`c.registroPrevio` — la señal correcta de que el registro
externo es en verdad obligatorio. Esto no era un despiste puntual: `docs/DESIGN_SYSTEM.md`
("Patrón: aviso de registro externo") documentaba ese comportamiento como intencional
("condicionadas a si el curso tiene `Liga_convocatoria` ... aquí basta con que exista una liga,
forzada o no"), sin anticipar el caso de un curso con liga informativa pero sin cupo real
externo. La pantalla de confirmación (`mostrarConfirmacion()`) sí distinguía bien los dos casos
desde antes (paso obligatorio vs. "Ver convocatoria →" de referencia) — el bug estaba solo en
las 4 señales previas al envío: badge de la tarjeta (`.cc-externo-tag`), ícono del chip móvil
(`.rs-chip-warn`), nota del panel de escritorio (`.rsb-nota-externo`) y el aviso `#aviso-legal`
del paso 2.

**Fix:** las 4 condiciones ahora exigen `registro_previo_requerido`/`registroPrevio` **y**
`liga_convocatoria`/`liga`, igual que ya lo hacían `cursosConRegistroPrevio()`,
`externoPendiente()` y la rama "paso obligatorio" de `mostrarConfirmacion()`. `docs/DESIGN_SYSTEM.md`
actualizado para reflejar la condición corregida. Se aprovechó la misma sesión para agregar una
nota fija en la confirmación ("Guarda tu folio…") ya que el registro nunca manda correo de
confirmación inmediato — solo los recordatorios automáticos posteriores.

**Dónde puede volver a pasar:** cualquier curso/conferencia futuro donde `Liga_convocatoria` se
use para guardar un link informativo (mostrado al final, mandado por recordatorio) sin que el
registro en esa plataforma sea realmente obligatorio — confirmar que
`Registro_previo_requerido=FALSE` en la hoja `Cursos` para esos casos, y que ninguna señal nueva
de "plataforma externa" se agregue mirando solo si existe una liga.

## 38. `enviarCorreoLote()` mandaba TODOS los destinatarios en un solo BCC — con 119 inscritos, Gmail rechazaba el correo entero y ningún recordatorio salía

**Síntoma:** 22 sep 2026, el recordatorio "empieza en 30 minutos"/"ya comenzó" de la conferencia
UNETE `CNF-2627-001` ("Hablemos de IA: IA ubicua en la educación", 119 inscritos, evento el mismo
día) nunca llegó, pese a que `Hora_inicio` estaba bien capturada y los activadores de tiempo
(8am + cada 15 min) estaban instalados y corriendo sin problema. El registro de ejecuciones
mostraba `enviarRecordatoriosWebinar` como "Fallida" en cada corrida desde que el curso entró a
la ventana de 40 min antes del inicio.

**Causa raíz:** `enviarCorreoLote()` mandaba un único `MailApp.sendEmail()` con los 119 correos
juntos en `bcc` (más el `to` de la propia cuenta = 120 destinatarios). Gmail limita los
destinatarios por mensaje (~50 para una cuenta normal, no de Workspace) y `MailApp.sendEmail`
revienta con `Exception: Límite Excedido: Destinatarios de correo electrónico por mensaje.` —
sin ningún `try/catch` alrededor de esa llamada dentro del bucle de cada curso, la excepción
tumbaba **toda** la ejecución de `enviarRecordatoriosWebinar()`, incluido el recordatorio de
constancia (`enviarRecordatoriosConstancia_()`, aislado en su propio `try/catch` pero llamado
justo *después* del bucle — nunca llegaba a ejecutarse esa corrida). Ningún otro curso de esa
misma ejecución se procesaba tampoco, aunque no tuviera nada que ver con el error.

**Fix (desplegado en producción la misma tarde, verificado con "Ejecutar" manual y en el registro
de ejecuciones):**
1. `enviarCorreoLote()` trocea los destinatarios en lotes de `MAX_DESTINATARIOS_POR_CORREO=45`
   (margen bajo el límite real de 50) y manda un `MailApp.sendEmail()` por lote en vez de uno
   solo con todos.
2. Cada curso dentro de `enviarRecordatoriosDiarios()`/`enviarRecordatoriosWebinar()` quedó
   aislado en su propio `try/catch` — un curso que truene ya no bloquea el resto del recorrido
   ni los bloques aislados que corren después (pendientes de registro externo / constancia).

**Segundo bug encontrado al verificar el fix (desplegado el mismo día, Versión 20 — ver
`docs/BITACORA.md`):** con el troceo y el aislamiento por curso activos, la ejecución de prueba
sí completó, pero reveló que uno de los 119 correos (`vero_130171@hotmail.com`, dato tal cual
está capturado en `Docentes`) hacía que `MailApp.sendEmail` rechazara **el lote completo** donde
caía (`Invalid email`) — los demás lotes de ese mismo curso tampoco se mandaban, porque la
excepción salía sin capturarse de `enviarCorreoLote()`. Fix: `esEmailValido_()` filtra
direcciones con formato inválido antes de trocear (se loguean, no bloquean), y cada lote se manda
dentro de su propio `try/catch` interno a `enviarCorreoLote()`, devolviendo éxito si al menos un
lote se mandó. Verificado en vivo con una corrida manual tras el redeploy.

**Dónde puede volver a pasar:** cualquier `MailApp.sendEmail()`/`GmailApp.sendEmail()` de este
repo que arme el `bcc`/`to`/`cc` a partir de una lista que puede crecer sin límite fijo (un curso
muy popular, una convocatoria masiva) — verificar que trocea por el límite real de destinatarios
por mensaje en vez de asumir que "nunca van a ser tantos". Los demás backends de trámite
(`mantenimiento.gs`, `asesorias.gs`, `soporte-remoto.gs`, `apps-script/correo/`) mandan un correo
por solicitud individual, no en lote — no están expuestos a este mismo patrón, pero vale la pena
tenerlo presente si algún día agregan un aviso masivo.

## 39. La causa de fondo del #38 no era el troceo — era la cuota diaria de `MailApp`, compartida entre todo OTDE

**Síntoma:** ya con el fix de #38 desplegado (troceo + aislamiento por lote), una corrida manual
de verificación seguía sin mandar ningún correo real — los 3 lotes de `CNF-2627-001` fallaban:
2 con `Service invoked too many times for one day: email.` y 1 con el `Invalid email` ya conocido.

**Causa raíz:** `MailApp.getRemainingDailyQuota()` reportó **20** de cuota restante — no 0 — y
aun así un solo lote de 45 destinatarios en `bcc` reventó de inmediato. Esto reveló que la cuota
diaria de Apps Script (~100 para una cuenta no-Workspace) se cuenta **por destinatario
individual**, no por llamada a `sendEmail()` — un supuesto que el propio código llevaba implícito
(`MailApp.getRemainingDailyQuota() < lotes.length`, comparando contra el número de lotes en vez
de destinatarios) y que Jorge también tenía asumido ("CCO se contabiliza como un solo envío").
Esa cuota además la comparten **todas** las automatizaciones de OTDE en
`otde.nezahualcoyotl@gmail.com` (Mantenimiento, Correo, Soporte, etc.), no solo Formación
Docente. Verificado agregando temporalmente una función `chequeoTemporalCuota()` que llamaba a
`MailApp.getRemainingDailyQuota()` y se corrió una vez desde el editor — eliminada después de
confirmar el número (mismo patrón de función temporal que `docs/QA-NOTES.md` #36).

**Fix:** en vez de perseguir un ajuste fino de la cuota de Gmail, se migró el envío completo a la
API de Brevo (300 destinatarios/día gratis, sin dominio propio — Workspace for Education no era
viable a corto plazo porque `dee.edu.mx` ya está en Microsoft 365, decisión fuera del alcance de
OTDE). `enviarPorBrevo_()` nueva (llama `UrlFetchApp.fetch()` a
`https://api.brevo.com/v3/smtp/email`, llave en la Script Property `BREVO_API_KEY`);
`enviarCorreoLote()` y `enviarCorreoIndividual_()` reescritas para usarla; se quitó el chequeo de
`MailApp.getRemainingDailyQuota()`/`RESERVA_CUOTA_CORREO` en `enviarRecordatoriosPendientes_()`/
`enviarRecordatoriosConstancia_()` (ya no aplica — un rechazo de Brevo se cuenta como "pospuesto"
igual que antes, sin necesitar consultar cuota por adelantado). `verificarActivadoresInstalados()`
se dejó a propósito en `MailApp` (correo interno a Jorge, volumen mínimo, y no debe depender del
mismo servicio que está avisando que algo se rompió). **Escrito en el repo, sin pegar/redesplegar
todavía** — ver `docs/ROADMAP.md` ítem 25 para el checklist antes de llevarlo a producción
(remitente verificado en Brevo, redeploy, prueba con modo de prueba activo).

**Dónde puede volver a pasar:** cualquier automatización futura de OTDE que mande correos
masivos (no solo Formación Docente) sigue compartiendo la misma cuota de `MailApp` de esta cuenta
mientras use `MailApp.sendEmail()` — Mantenimiento/Asesorías/Soporte/Correo mandan uno por
solicitud individual hoy, pero si algún día agregan un aviso masivo, considerar el mismo patrón
de Brevo desde el diseño, no después de un incidente en producción.

## 40. Un aviso en lote que salía a medias se marcaba como enviado, y el filtro de correos inválidos no atrapaba el caso real

**Síntoma:** 22 sep 2026, con los fixes de #38/#39 ya en producción, el registro de ejecuciones
mostraba cada 15 min los mismos 3 lotes fallando (2 por cuota agotada, 1 por `Invalid email`)
con la ejecución marcada "Completada" — y el código tenía tres huecos más:

1. `esEmailValido_()` (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) aceptaba `vero_130171@hotmail.com.` — el
   punto final cae dentro de `[^\s@]+`. El lote de 45 donde caía seguía reventando.
2. `enviarCorreoLote()` devolvía `true` si **al menos un** lote salía, y el llamador marcaba
   `Recordatorio_*_enviado=TRUE` — los destinatarios de los lotes fallidos nunca recibían el
   aviso y nadie se enteraba.
3. La cuota se revisaba contra el **número de lotes** (`getRemainingDailyQuota() < lotes.length`),
   no contra destinatarios, y los avisos en lote ignoraban `RESERVA_CUOTA_CORREO` — un aviso grande
   podía dejar sin cuota a Mantenimiento/Correo/etc.

**Fix (Versiones 21 y 22, 22 sep 2026, verificado en el registro de ejecuciones):**
- Regex nueva: el dominio no puede empezar/terminar en punto ni tener `..`, TLD de 2+ letras.
- Revisión de cuota **por lote**, con reserva (`RESERVA_CUOTA_CORREO=30`, costo `lote.length+1`).
- Seguimiento por destinatario (`claveSeguimiento`, Script Property `LOTE_ENVIADOS_*` con huellas
  MD5 cortas): solo devuelve `true` cuando llegó a todos; las corridas siguientes mandan solo a
  los que faltan. Se limpia la propiedad al completar o al resignarse. Tope ~630 destinatarios
  por aviso (9 KB por Script Property): antes de mandar cada lote se revisa que su anotación
  quepa — si no, se detiene ahí, se da por concluido y avisa a Jorge (Versión 23). Mandar un
  lote sin poder anotarlo haría que se reenviara en cada corrida.
- Como ahora un aviso a medias sí se reintenta, el "ya comenzó — conéctate ahora" se corta al
  terminar el evento (`finConferencia_()`, con `Hora_fin`) en vez de a medianoche — si no, podía
  salir de noche para un evento ya concluido.

Simulado en Node con mocks de `MailApp`/`PropertiesService` (133 inscritos + 1 inválido: 45/día
con reserva, sin duplicados, completa al tercer día; lote con error se reintenta solo).

**Dónde puede volver a pasar:** cualquier función que devuelva "éxito" por un envío parcial y
un llamador que marque una bandera irreversible con ese resultado. Si se agrega un aviso masivo
nuevo, pasarle una `claveSeguimiento` propia.

## Regla general al corregir cualquiera de estos patrones

Cuando se encuentra uno de estos bugs en un archivo, **revisar si el mismo
patrón se copió a otros archivos del sitio** antes de dar la corrección por
terminada — ya pasó dos veces (el freeze de fetch en 4 archivos, el
`appendRow([])` en 2 archivos) que un bug "corregido" seguía vivo en un
archivo hermano que nadie revisó.
