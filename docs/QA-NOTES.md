# Notas de QA — bugs reales ya cazados en este proyecto

No es un checklist genérico de "revisa responsive/accesibilidad/contraste".
Es una lista de bugs **concretos** que ya pasaron en este repo, con su causa
raíz, para no reintroducirlos por accidente en un archivo nuevo que use el
mismo patrón. La mayoría se descubrió y corrigió en julio 2026; los ítems 8 y 9 se agregaron el
6 de agosto de 2026 (el 8 sigue pendiente de corregir, el 9 es comportamiento a conocer, no un
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

**Pendiente de corregir:** hacer que el aviso de "1 día antes" reintente en días subsecuentes
mientras el curso no haya iniciado, en vez de resignarse silenciosamente la primera vez que se
evalúa tarde. Aplica también al branch equivalente de `enviarRecordatoriosWebinar()`
(`minutosFaltantes < 0`).

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

## Regla general al corregir cualquiera de estos patrones

Cuando se encuentra uno de estos bugs en un archivo, **revisar si el mismo
patrón se copió a otros archivos del sitio** antes de dar la corrección por
terminada — ya pasó dos veces (el freeze de fetch en 4 archivos, el
`appendRow([])` en 2 archivos) que un bug "corregido" seguía vivo en un
archivo hermano que nadie revisó.
