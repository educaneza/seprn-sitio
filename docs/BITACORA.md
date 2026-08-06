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
