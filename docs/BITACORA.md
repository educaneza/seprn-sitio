# Bitácora de sesiones — SEPRN Sitio Web

Registro cronológico (más reciente arriba) de qué se hizo en cada sesión de trabajo y por qué.
Complementa, no duplica, a los demás docs:

- **Este archivo** responde "¿qué pasó y cuándo?" — historia, no estado actual ni planes.
- `docs/ROADMAP.md` responde "¿qué falta?" — solo pendientes genuinamente futuros.
- `docs/ARCHITECTURE.md` responde "¿cómo está construido?" — modelo mental vigente, sin fechas.
- `CLAUDE.md` responde "¿cómo trabajo en este proyecto?" — convenciones y guía operativa.

Se actualiza automáticamente al cerrar sesión vía el skill `/close`
(`.claude/skills/close/SKILL.md`) — ver la tabla "Ritual de cierre de sesión" en `CLAUDE.md`
para qué otro documento tocar además de este.

---

## CHECKPOINT — 2026-08-07 · Redeploy de fixes QA pendientes + cierre automático de tickets

| | |
|---|---|
| **Fecha** | 2026-08-07 |
| **Sesión** | Jorge pidió verificar si el "Pendiente para Jorge" del checkpoint anterior (redesplegar `asesorias.gs`/`formacion-docente.gs`) ya estaba resuelto — no lo estaba. Después, a partir de dos preguntas exploratorias sobre migrar a webform el reporte de cierre del técnico (sistema v8.5 de Reportes de Visitas) y el feedback de Asesorías, se acordó que lo que realmente faltaba era el cierre automático del ciclo hacia el solicitante y la Zona/Sector — los otros dos Google Forms se dejaron fuera de alcance. |
| **Verificación del redeploy pendiente** | Confirmado en vivo (no solo por fecha de versión) que ninguno de los 2 fixes había llegado a producción: `confirmaMantenimiento`/`Confirmó Mantenimiento Previo` no existían en el código desplegado de Asesorías (0 resultados), y `const MINUTOS_ANTES_INICIO_MIN = 20;` seguía presente en el de Formación Docente. Se repegó el código actual del repo en ambos editores de Apps Script y se desplegó nueva versión (mismo ID de implementación en los dos, no hizo falta tocar `otde.html`/`formacion-docente.html`). |
| **Cierre automático de Mantenimiento/Asesorías** | Nuevo trigger `onEdit` instalable por proyecto (`manOnEditCierre`/`aseOnEditCierre`, instalado vía `manInstalarTriggerCierre()`/`aseInstalarTriggerCierre()` — no un trigger simple, esos no pueden llamar `MailApp`): al marcar Estatus = `Resuelto` en la hoja `Solicitudes`, notifica por correo al solicitante y a la Zona/Sector (reusando `manBuscarContactoZonaSector`/`aseBuscarContactoZonaSector` ya existentes). La columna `Estatus` pasó de texto libre a dropdown (`Pendiente de validar` · `Validado` · `En atención` · `Resuelto` · `Rechazado`) para que el trigger tenga un valor confiable; se agregó una columna `Notificación de cierre enviada` para evitar reenvíos. `Rechazado` queda en el dropdown sin lógica todavía, deliberadamente. |
| **Prueba de punta a punta** | En los 2 Sheets reales (`Solicitudes_Mantenimiento_2026`, `Solicitudes_Asesorias_2026`, ambos sin datos de producción todavía): fila de prueba + contacto de prueba con correo propio (no un contacto real de Zona/Sector), Estatus → `Resuelto` desde la UI real de Sheets, confirmado en el registro de Ejecuciones de Apps Script (Mantenimiento: 5.44s, Asesorías: 1.437s, ambas "Completada", 0% error) y en la columna de control en `Sí`. Filas de prueba eliminadas después. |
| **Limpieza** | Se eliminó del editor en vivo de Formación Docente la función temporal `enviarAhoraManual_WEB2627001()` que había quedado pegada ahí desde el incidente del checkpoint anterior — no vivía en este repo. |
| **Documentación** | `CLAUDE.md` (cierre automático documentado en Mantenimiento/Asesorías, 3 ítems resueltos en "Pendientes vigentes"), `docs/ARCHITECTURE.md §15` (mecanismo de cierre automático + alcance explícitamente descartado), `docs/QA-NOTES.md` (ítem 10 nuevo: fix en el repo ≠ fix en producción si no se redespliega). |
| **Verificación** | `node --check` sobre `apps-script/mantenimiento.gs` y `apps-script/asesorias.gs` — sin errores. `git diff --stat`: 4 archivos, 405 inserciones/14 eliminaciones (191 en `mantenimiento.gs`, 173 en `asesorias.gs`, 24 en `CLAUDE.md`, 31 en `docs/ARCHITECTURE.md`). |
| **Commits** | Pendiente — ver el de esta actualización de documentación. |

---

## CHECKPOINT — 2026-08-06 · Corrección de los 3 bugs de QA encontrados en la sesión anterior

| | |
|---|---|
| **Fecha** | 2026-08-06 |
| **Sesión** | Continuación del mismo día: Jorge pidió una lista de pendientes priorizada y, a partir de ahí, corregir los 2 bugs de Asesorías y el bug de recordatorios de Formación Docente encontrados en la ronda de QA de la sesión anterior (ver checkpoint de abajo). |
| **Asesorías — checkbox sin viajar al backend** | El checkbox de confirmación de mantenimiento previo se validaba en el cliente pero nunca se incluía en el `datos` enviado a `asesorias.gs`, así que el Sheet nunca quedaba con evidencia de la confirmación. Se agregó la columna `Confirmó Mantenimiento Previo` (col. R) a `ENCABEZADOS_ASE_SOLICITUDES`, con auto-completado de encabezado en la hoja ya desplegada (mismo patrón que `obtenerHojaCursos()` en `formacion-docente.gs`, sin migración manual), validación server-side en `aseValidarCampos()`, y el envío real del campo desde `otde.html`. |
| **Asesorías — error del checkbox no se limpiaba** | Se agregó un listener `change` en `ase-confirma-mantenimiento` que quita la clase `visible` del mensaje de error en cuanto se marca, igual que el resto de los campos del formulario. |
| **Formación Docente — recordatorio marcado "enviado" sin mandarse** | `enviarRecordatoriosDiarios()` y `enviarRecordatoriosWebinar()` tenían un piso inferior en su ventana de evaluación (`diasParaInicio >= 0` / `minutosFaltantes >= 0`) que marcaba la columna de recordatorio en `TRUE` sin enviar nada si el curso ya había iniciado al momento de evaluarse. Se quitó ese piso: ahora reintentan en cada corrida subsecuente con el texto ajustado a "ya inició"/"ya comenzó" mientras el curso no haya terminado (`hoy <= Fecha_fin`); solo se resignan sin enviar cuando el curso ya concluyó por completo. Se eliminó la constante `MINUTOS_ANTES_INICIO_MIN`, que quedó sin uso. |
| **Documentación** | `CLAUDE.md` (tachados los 3 pendientes ya resueltos en "Pendientes vigentes"), `docs/QA-NOTES.md` (ítem 8 marcado como corregido), `docs/ROADMAP.md` (corregida la nota desactualizada que aún marcaba los 3 backends de ago 2026 como pendientes de desplegar — ya lo estaban desde el checkpoint anterior). |
| **Verificación** | `node --check` sobre `apps-script/asesorias.gs`, `apps-script/formacion-docente.gs`, y sobre los 2 bloques `<script>` extraídos de `otde.html` — sin errores. `git show --stat` del commit confirma 5 archivos, 91 inserciones/46 eliminaciones. |
| **Commits** | `0d1eba6` (fix de los 3 bugs), más el de esta actualización de documentación (ver `git log`). |
| **Pendiente para Jorge** | Re-desplegar `asesorias.gs` y `formacion-docente.gs` en Apps Script (Administrar implementaciones → Nueva versión) para que ambos fixes lleguen a producción — el repo ya tiene el código correcto, los proyectos en vivo siguen con la versión anterior. |

---

## CHECKPOINT — 2026-08-06 · Despliegue de 3 backends, QA pre-producción e incidente de recordatorio en vivo

| | |
|---|---|
| **Fecha** | 2026-08-06 |
| **Sesión** | Continuación del mismo día: primero Jorge pidió desplegar los 3 backends nuevos que seguían con placeholder `PENDIENTE_DE_DESPLEGAR` (Mantenimiento, Asesorías, Correo), después acotar Telegram a solo notificaciones urgentes y poblar `Contactos_Zona_Sector` con datos reales. Antes de sacarlo a producción, pidió una ronda de QA completa (perspectiva de usuario real + perspectiva de administrador, con énfasis en si el contenido capturado realmente simplifica procesos). Ya cerrando, surgió un incidente urgente: un recordatorio de webinar de Formación Docente marcado como "enviado" pero invisible para Jorge. |
| **Despliegue de los 3 backends** | Mantenimiento (`Solicitudes_Mantenimiento_2026`), Asesorías (`Solicitudes_Asesorias_2026`) y Correo (`Solicitudes_Correo_2026_2027`, único despliegue que enruta Alta/Cambio/Reset2FA/Incidencias por `datos.tipo`) desplegados con URL real en `otde.html`. Telegram acotado a solo lo urgente (Reset2FA/Incidencias sin condición, Cambio de Contraseña solo `@dee.edu.mx`, Alta sin Telegram) — decisión explícita de Jorge, no placeholder. `Contactos_Zona_Sector` poblada en Mantenimiento y Asesorías (88 filas: 75 por Zona + 13 de respaldo por Sector) a partir de `OTDE_Base_Contactos_v2.xlsx` que Jorge proporcionó. |
| **QA pre-producción** | Mantenimiento y Correo (los 4 sub-formularios: Alta, Cambio de Contraseña, Reset 2FA, Incidencias) probados de punta a punta con interceptor de `fetch()` — CCT autocomplete + fallback manual, Title Case, la regla de dominio Director(a)+Cuenta de oficina→`@dee.edu.mx`, payloads reales verificados contra la validación de cada `.gs`: todo correcto. Asesorías: 2 bugs reales encontrados (checkbox de confirmación de asesoría previa no viaja en el payload; su mensaje de error no se limpia al marcarlo) — ver `CLAUDE.md` §Pendientes vigentes. Revisión de administrador: las columnas de cada Sheet sí simplifican procesos reales (`GenerarResumenSIGEE.gs` para Alta, ruteo automático por Zona/Sector), pero Mantenimiento/Asesorías no le avisan al solicitante cuando su ticket se resuelve — pendiente de decisión con Jorge. |
| **Incidente: recordatorio de webinar invisible** | Jorge reportó que un recordatorio de hoy (webinar "Crecer en un mundo digital...", 13:00 hrs) aparecía como enviado en la Sheet pero no encontraba el correo en su bandeja de Enviados. Causa raíz: `enviarCorreoLote()` manda `to: Session.getEffectiveUser().getEmail()` con los inscritos en `bcc` — Gmail archiva esa copia como Recibida, no Enviada (comportamiento sistémico de todas las automatizaciones de OTDE, confirmado también en el SGCI viejo) — ver `docs/QA-NOTES.md #9`. Hallazgo adicional real: el aviso de ESE webinar específico sí se mandó a las 9:52 a.m., pero con la plantilla vieja (sin el rediseño HTML de esta mañana), porque el código nuevo no se guardó hasta las 10:30 a.m. — el activador de las 12:39 p.m. (ya con el código nuevo) se lo saltó por encontrar la columna ya en `TRUE`. Se corrigió a mano: se limpió el flag en la Sheet y se corrió una función temporal (`enviarAhoraManual_WEB2627001`, pegada solo en el editor de Apps Script del proyecto en vivo, no en este repo) que mandó "ya inició, conéctate" con el diseño nuevo a los 15 inscritos reales — 14 entregados, 1 rebote por buzón lleno del destinatario (ajeno al sistema). Se confirmó además una instancia real en producción del bug de "recordatorio marcado sin haberse mandado" — ver `docs/QA-NOTES.md #8` — en el Seminario "Convivencia digital entre estudiantes". |
| **Verificación** | Revisión directa en Gmail (`otde.nezahualcoyotl@gmail.com`, con `in:anywhere` para incluir Recibidos/Spam) del correo real de las 9:52 a.m. y del correo manual de la 1:12 p.m.; registro de ejecuciones de Apps Script (`Mis ejecuciones`) para confirmar hora y estado de los activadores automáticos; hoja `Cursos` revisada directamente para las columnas `Recordatorio_*_enviado`. |
| **Commits** | `a5766b7` (despliegue de los 3 backends en `otde.html`), más el de esta consolidación de documentación (ver `git log`). |

---

## CHECKPOINT — 2026-08-06 · Smoke test de Formación Docente + rediseño de recordatorios automáticos

| | |
|---|---|
| **Fecha** | 2026-08-06 |
| **Sesión** | Jorge pidió un smoke test completo del Centro de Formación Docente y verificar que los recordatorios automáticos funcionaran de verdad, con calificación argumentada (8.5/10) y plan de mejora. A partir de ahí pidió ajustar los tiempos de los recordatorios, rediseñar el correo, agregar redes sociales y proteger las respuestas hacia su cuenta institucional — y desplegar todo a producción en la misma sesión. |
| **Smoke test** | Flujo completo probado en producción vía navegador (catálogo dinámico, selección multi-curso, paso de registro previo externo, validación de formulario, autocomplete de CCT + fallback manual, layout móvil) sin disparar el `doPost` real. Recordatorios verificados de forma solo-lectura en Apps Script (`Mis activadores`/`Mis ejecuciones`): ambos triggers instalados y corriendo con 0% de tasa de error. 2 bugs reales encontrados: error de CCT que no se limpiaba al seleccionar una sugerencia válida, y el aviso "empieza en 2 días" se perdía en silencio si la cuota de correo se agotaba justo ese día — ver `docs/QA-NOTES.md #6`. |
| **Tiempos de recordatorio reescritos** | Regla nueva acordada con Jorge: "empieza en 1 día" para cursos de varios días (+ fallback en cursos de un solo día sin `Hora_inicio`), "vas a la mitad" sin cambios (30+ días), "empieza en 30 minutos" (ventana 20-40 min) para cualquier curso con `Hora_inicio` capturada — evaluado con un disparador nuevo cada 15 min (antes cada hora). `instalarRecordatoriosAutomaticos()` ahora borra y recrea los activadores en cada corrida en vez de solo agregar si faltan, para que el cambio de intervalo se aplique de verdad. Se agregó `verificarActivadoresInstalados()`: alerta a Jorge por correo (máx. 1x/día) si algún activador desaparece. |
| **Correo rediseñado** | `construirCorreoHtml()` nuevo: plantilla HTML con paleta institucional, chip de categoría, caja de detalle del curso, botón CTA, y 3 íconos de redes sociales en el footer (Facebook `facebook.com/SubNeza`, YouTube y Canal de WhatsApp institucionales — mismas URLs reales del sitio). Bug real encontrado en la propia revisión visual: faltaba `<meta charset="utf-8">`, los acentos se corrompían — ver `docs/QA-NOTES.md #7`. `enviarCorreoLote()` ahora manda `replyTo: otde.nezahualcoyotl@dee.edu.mx` — Jorge reportó que un "Responder" le llegaba a su Gmail; se confirmó en el propio deployment que esa cuenta institucional es un *alias* de su Gmail real, de ahí el bug. |
| **Despliegue a producción** | Proyecto de Apps Script renombrado ("Proyecto sin título" → "Formacion Docente - Backend (formacion-docente.gs)"), código pegado y Versión 8 desplegada (mismo ID de implementación, no hizo falta tocar `APPS_SCRIPT_URL` en `formacion-docente.html`), y menú "OTDE Formación → Instalar recordatorios automáticos" corrido de nuevo desde la hoja real — confirmado por el propio mensaje del sistema y por `Mis activadores` (trigger de 15 min recreado bajo el proyecto ya renombrado). |
| **Verificación** | `node --check` sobre `apps-script/formacion-docente.gs` (copiado a `.js`) y sobre el `<script>` extraído de `formacion-docente.html`, sin errores. Los 3 correos (empieza en 1 día / vas a la mitad / 30 minutos) generados desde la función real `construirCorreoHtml()` y revisados visualmente en el navegador (escritorio, móvil, con y sin liga) antes de desplegar. |
| **Commits** | Pendiente — ver propuesta de commit de cierre abajo. |

---

## CHECKPOINT — 2026-08-05 · Auditoría de cimientos + 3 webforms nuevos (Correo Alta, Mantenimiento, Asesorías)

| | |
|---|---|
| **Fecha** | 2026-08-05 |
| **Sesión** | Sesión larga: primero se construyeron 3 entregables nuevos siguiendo el mismo patrón (webform + Apps Script propio + Sheet con folio + Telegram), después Jorge pidió una auditoría completa de estructura/documentación al notar que `otde.html` y `CLAUDE.md` habían crecido como bitácora en vez de como referencia. |
| **Correo Institucional** | Webform de Alta de cuenta con dominio auto-derivado por CCT (`otdeDominioParaCCT()`, regla verificada en vivo contra SIGEE — el sistema real de CoEEE) + Cambio de Contraseña/Reset 2FA/Incidencias migrados del Google Form viejo. Backend nuevo y paralelo en `Correos-institucionales/webform-2026-2027/` (repo aparte); el sistema en vivo no se tocó. Ver `docs/ARCHITECTURE.md §16`. |
| **Mantenimiento** | Nueva tab con webform que complementa el oficio (sigue siendo obligatorio) con captura digital + oficio adjunto a Drive. `apps-script/mantenimiento.gs`. Ver `docs/ARCHITECTURE.md §15`. |
| **Asesorías** | Nueva tab (no existía como trámite) — mismo patrón, más selector de tipo de asesoría y casilla de confirmación de mantenimiento previo. `apps-script/asesorias.gs`. Ver `docs/ARCHITECTURE.md §15`. |
| **Auditoría/consolidación** | `.gitignore` agregado (no existía); comentarios `SERVICIO N` de `otde.html` corregidos (estaban mal numerados, 2 tabs sin marcador); contradicción interna en `docs/ROADMAP.md` sobre Formación Docente eliminada; `docs/ROADMAP.md`/`docs/ARCHITECTURE.md` reconciliados en favicon/`aria-current`; 3 secciones fechadas por separado de `otde.html` en `CLAUDE.md` consolidadas en una sola; este archivo (`docs/BITACORA.md`) creado, separando la bitácora cronológica de `docs/ROADMAP.md` (que queda solo para lo futuro); skill `/close` creado, adaptado del patrón de `aulia/.claude/skills/close/SKILL.md`. |
| **Verificación** | `otde.html`: `node --check` sobre el `<script>` extraído + `grep` de IDs duplicados, sin hallazgos. `docs/ROADMAP.md`/`docs/ARCHITECTURE.md` releídos completos para confirmar que ya no se contradicen. |
| **Commits** | `f9c0290` (`.gitignore`), `bdcd3c2` (3 webforms), más los de esta consolidación (ver `git log`). |

---

## CHECKPOINT — 2026-07-13 · Retiro de Jornada Verano 2026

Cerró el periodo de inscripciones a la Jornada de Capacitación Verano 2026: se eliminó el
banner en `otde.html` y se borraron `jornada-verano-2026.html` e
`instructivo-jornada-verano-2026.html` — ya nadie debe llegar a ese wizard. El backend
`apps-script/formacion-docente.gs` sigue vivo (también sirve a `formacion-docente.html`); solo
se perdió la parte específica de esas 2 páginas. Commit: `88c7e2e`.

## CHECKPOINT — 2026-07-07 · Centro de Formación Docente: deploy + rediseño premium + cutover

Desplegado en producción: Spreadsheet real `Formacion_Docente_2026_2027`,
`apps-script/formacion-docente.gs` con URL real. Arquitectura relacional en Sheets
(`Docentes`/`Cursos`/`Inscripciones`, no una hoja por curso). Cutover de Jornada Verano 2026 a
este mismo backend. Recordatorios automáticos por correo. Prueba social real de inscritos.
Rediseño visual premium (Inter/Inter Tight, tarjetas pastel, panel lateral sticky) — ver
`docs/DESIGN_SYSTEM.md`. Smoke test + 5 bugs reales corregidos — ver `docs/QA-NOTES.md`.
Commit: `6c2d08c`.

## CHECKPOINT — 2026-07-01 · Instalador de Office + Soporte Técnico Remoto potenciado

Pestaña "Licencias Office" en `otde.html` (instalador validado por CCT + guía paso a paso).
Formulario "Solicitar Soporte Técnico Remoto" con autocompletado de CCT y fallback manual.
Backend nuevo `apps-script/soporte-remoto.gs` con notificación por bot de Telegram. Referencia
cruzada entre ambas pestañas. Mismo día: `jornada-verano-2026.html` (wizard 3 pasos) e
`instructivo-jornada-verano-2026.html` (guía imprimible) — ambos retirados el 13 jul 2026, ver
checkpoint arriba.

## CHECKPOINT — 2026-06-16 · Rediseño visual élite

Hero oscuro midnight `#0C1A2E` full-bleed, strip de métricas animadas, sistema de diseño con
clases reutilizables (`.section-header`, `.metrics-strip`, `.btn-primary-dark`). Cierre del
evento Charla IA con función `reenviarConfirmacionListaEspera()` para post-evento.

## CHECKPOINT — junio 2026 · Fase 1 Quick Wins + Sistema de Registro de Eventos

Quick wins: Google Fonts no bloqueante, contraste hero WCAG AA, `aria-current` + favicon en
todas las páginas, cobertura mobile responsiva, acordeón CTE semántico. Sistema de Registro de
Eventos para la Conferencia IA 2026: formulario con autocompletado CCT, Apps Script con folios
y cupos por sector, check-in por PIN/QR (`asistencia.html`), manual interno
(`docs/manual-sistema-registro.html`).

---

*Checkpoints anteriores a junio 2026 no se reconstruyeron retroactivamente — ver `git log` si
hace falta ese historial.*
