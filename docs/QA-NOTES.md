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

## Regla general al corregir cualquiera de estos patrones

Cuando se encuentra uno de estos bugs en un archivo, **revisar si el mismo
patrón se copió a otros archivos del sitio** antes de dar la corrección por
terminada — ya pasó dos veces (el freeze de fetch en 4 archivos, el
`appendRow([])` en 2 archivos) que un bug "corregido" seguía vivo en un
archivo hermano que nadie revisó.
