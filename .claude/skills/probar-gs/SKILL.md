---
name: probar-gs
description: Prueba un cambio a un backend de Apps Script (apps-script/*.gs) en Node, sin red, con un simulador de SpreadsheetApp, UrlFetchApp, MailApp, PropertiesService y los demás servicios; con datos inventados o con filas reales de la hoja bajadas al scratchpad. Úsalo antes de publicar con desplegar.sh cualquier cambio de lógica (cierres, endpoints, cruces entre proyectos, fechas), o cuando Jorge escriba /probar-gs.
---

# /probar-gs — Probar un `.gs` en Node antes de publicarlo

Probar contra producción escribe de verdad (CLAUDE.md: `doPost` guarda en Sheets y manda
Telegram y correos). Este skill corre el `.gs` del repo en Node con servicios falsos:
**nada sale a la red**, y al final se ve qué se escribió, qué correos y Telegram habrían salido
y qué URLs se habrían pedido.

Archivos:
- `simulador.js`: `crearEntorno()`, `hoja()`, `esperar()`. Comentarios al inicio del archivo.
- `ejemplos/cierres-27nov.js`: ejemplo completo y prueba de regresión (fechas en texto de
  Mantenimiento, cierre con reporte, conteo de tickets, cierre de Asesorías con tickets).
  Correrlo también sirve para confirmar que un cambio no rompió eso:
  `node .claude/skills/probar-gs/ejemplos/cierres-27nov.js`

## 1. Qué probar

Leer el diff y anotar, antes de escribir la prueba, **qué debe pasar y qué NO debe pasar**:
qué filas cambian, cuáles se quedan igual (Rechazadas, Resueltas, otro tipo, fechas futuras),
cuántos correos y Telegram salen y a quién. Los casos que no deben moverse son los que cazan
los errores.

## 2. Datos

**Por defecto, inventados** (folios `OTDE-XXX-09NN`, CCT `15DPR9NNNX`, correos `@x.mx`). Solo
hacen falta las columnas que lee la función, con los encabezados exactos de `ENCABEZADOS_*`
(los backends leen por nombre).

**Datos reales**, cuando el caso depende de cómo está capturada la hoja (como el bug de las
fechas del 27 nov):
1. Bajarlos con el conector de Google Sheets (`get_values`) y guardarlos como JSON **solo en el
   scratchpad**. Nunca en el repo: traen nombres, correos y teléfonos, y el repo es público.
2. **Fechas: comprobar en la hoja real qué columnas son fecha y cuáles son texto.** `get_values`
   devuelve todo como texto con formato; con `get_spreadsheet` + `includeGridData` y el campo
   `effectiveValue`, `numberValue` = fecha real y `stringValue` = texto. Pasar a
   `hoja(nombre, filas, { fechas: [...] })` solo las columnas que de verdad son fecha. Si una
   columna mezcla las dos cosas, dejarla como texto y convertir a mano las celdas que sí lo son.
   Convertir todo "por si acaso" esconde justo el tipo de bug que se busca.

## 3. Escribir la prueba

En el scratchpad (o en `ejemplos/` si usa datos inventados y vale la pena conservarla):

```js
const { crearEntorno, hoja, esperar } = require('<repo>/.claude/skills/probar-gs/simulador.js');
const env = crearEntorno({
  hojas: { Solicitudes: hoja('Solicitudes', filas, { fechas: ['Fecha programada de visita'] }) },
  props: { PANEL_TOKEN: 'tok', TELEGRAM_BOT_TOKEN: 'b', TELEGRAM_CHAT_ID: 'c' },
  fetch: (url) => /action=agendaVisitas/.test(url) ? { status: 'ok', items: [] } : { status: 'error' },
  ui: { alert: 'YES', prompt: '' }
});
env.cargar('<repo>/apps-script/asesorias.gs');   // varios archivos de un proyecto: cargar(a, b, c)
env.correr('aseCerrarConTicketsMenu()');           // o env.doGet({...}) / env.doPost({...})
esperar(env.filas('Solicitudes')[0].Estatus === 'Resuelto', 'se cierra');
console.log(env.resumen(), env.correos.map(c => c.to + ' · ' + c.subject), env.alertas);
```

- **Dos proyectos que se hablan** (Asesorías ↔ Ticket, Bitácora ↔ los trámites): un entorno
  por proyecto; correr el endpoint en uno con `doGet()` y pasar su respuesta como `fetch` del
  otro. Así se prueba el contrato de verdad, no una respuesta escrita a mano.
- **Proyecto de varios archivos** (`correo/`, `membrete/`): cargar todos los que lista
  `apps-script/proyectos-clasp.json` para ese proyecto, en ese orden.
- `env.escrituras` trae cada `setValue`/`appendRow` con su encabezado; `env.telegram` los
  `payload` (revisar que un `_` sin pareja no tumbe el Markdown, `docs/QA-NOTES.md #24`).

## 4. Correr e informar

`node <prueba>.js`. Informar a Jorge en llano: qué casos se probaron, cuáles pasaron, qué
correos y Telegram habrían salido, y **qué quedó sin probar** (ver límites). Un fallo se
investiga hasta saber si es del código o de la simulación antes de corregir nada.

## Límites (decirlos siempre que apliquen)

- No hay formato de celdas, fórmulas, filtros, protecciones, validaciones ni `onEdit`
  automático: un `setValue()` del script no dispara triggers aquí **ni en Apps Script**, así que
  si el código depende de un `onEdit`, llamar la función a mano.
- Drive, Docs y PDF son stubs: el `.docx`, los PDF y las fotos no se generan.
- No mide tiempo de ejecución ni cuotas (`MailApp` siempre tiene cuota).
- La zona horaria es la real (`America/Mexico_City` vía `Intl`), pero `new Date()` usa la de la
  Mac; para fechas límite, correr con `TZ=America/Mexico_City node ...`.
- Pasar en Node no sustituye la prueba en vivo: después de publicar, confirmar con `curl` GET
  (solo lectura) y, cuando toque, con el modo de prueba del backend.

## Trampas del simulador

- El contexto usa el mismo `Date` que `hoja()`. Si se agrega otro global de tipo (`Array`,
  `Object`), que sea el mismo de Node; si no, `instanceof` falla en silencio y el `.gs` trata
  una fecha como texto.
- `appendRow([])` truena a propósito, como en Apps Script.
- `getRange('A1')` (notación A1) no está soportado; los backends usan números.
- Un `UrlFetchApp.fetch` sin handler `fetch` truena con la URL: es la señal de que el código
  pide algo que la prueba no previó.
