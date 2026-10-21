# Tablero de salud de los sistemas — SEPRN / OTDE

Una fila por sistema en uso. Responde "¿qué sistema necesita atención y cuál llevo más tiempo sin
revisar?", no "qué se hizo" (eso va en `docs/BITACORA.md`) ni el detalle de cada pendiente (eso
va en `docs/ROADMAP.md`).

- `/open` lo lee y abre cada sesión con los sistemas en **Rojo** y los de prueba en vivo más vieja.
- `/close` actualiza solo las filas de los sistemas que la sesión tocó o verificó.
- **Regla de rotación** (acordada el 14 oct 2026): una de cada tres sesiones se dedica a cerrar
  pendientes de un sistema distinto al del momento, empezando por el que esté en Rojo o el de
  prueba en vivo más vieja.

**Estados:** **Verde** = funciona y sin pendientes que afecten a quien lo usa. **Amarillo** =
funciona, con pendientes abiertos o algo en paralelo. **Rojo** = falla, o algo está a medias y
afecta a usuarios. **Prueba en vivo** = última vez que Jorge o una prueba contra producción
confirmó que funciona (no la fecha del último cambio de código).

Actualizado: **21 oct 2026**.

## Sistemas en uso

| Sistema | Quién lo usa | Estado | Prueba en vivo | Pendiente principal |
|---|---|---|---|---|
| Oficios (`oficios.html`, `oficios.gs`) | Equipo OTDE | Verde | 21 oct 2026 (primera corrida automática del resumen diario: llegó a Jorge y a Nancy; prueba con formato HTML, v13) | 2D en marcha (v14: formato HTML, Sector/Zona y liga "Cómo llegar" en las comisiones de Jorge, sin verse aún en Telegram). Falta ver el cruce de visitas con comisiones en un día que las tenga. 2C sin prueba con un oficio real (supervisores ya capturados en `Config`). Rehacer capturas 02-06, 10 y 13 de la guía. Siguiente: 2E (ROADMAP 27) |
| Bitácora OTDE (`bitacora.html`, `bitacora.gs`) | Jorge y Nancy | Verde | 6 oct 2026 | Ninguno que afecte a usuarios (Beneficiarios y folios MAN resueltos por Jorge, 15 oct 2026). Llenar `NP_planeacion` en los cursos nuevos al darlos de alta (ROADMAP 27) |
| Formación Docente (`formacion-docente.html`, `formacion-docente.gs`) | Docentes | Amarillo | 14 oct 2026 (calendario en iPhone y computadora) | Android sin probar; borrar las hojas de respaldo; Paso 5 contra Aula Digital (ROADMAP 19 y 28). Los correos casi no salen por cuota: el calendario es el aviso principal (decisión de Jorge). Folio duplicado `OTDE-CAP-0089` resuelto el 15 oct 2026 (→ `OTDE-CAP-0626`). `?action=agendaCursos` para Oficios desde el 20 oct (v29); activadores reinstalados ese día |
| Mantenimiento (`mantenimiento.html`, `reporte-visita.html`, `mantenimiento.gs`) | Escuelas, Alejandro | Amarillo | 25 sep 2026 | `?action=agendaVisitas` para el resumen de Oficios (v28, 20 oct; desde v29, 21 oct, con Sector y Zona). `.gs` del 14 oct desplegado el 15 oct (confirmado con `curl`); columnas por nombre y las dos hojas reordenadas por bloques el 15 oct (versión 27, verificado en vivo, ROADMAP 34); sin prueba con modo de prueba, a propósito: Jorge espera el feedback de los usuarios; la prueba de los fixes del 21 sep (ROADMAP 22) queda para fuera de horario laboral (19 oct). Revisar "Ejecuciones" (ROADMAP 33). v8.5 sigue vivo en paralelo, ya sin activadores (ROADMAP 9) |
| Asesorías (`asesorias.html`, `asesorias.gs`) | Escuelas, Nancy | Amarillo | 25 sep 2026 | `?action=agendaVisitas` para el resumen de Oficios y correo de fecha sin "visita técnica" (v21, 20 oct; desde v22, 21 oct, con Sector y Zona). `.gs` del 14 oct desplegado el 15 oct (columnas confirmadas en el Sheet); columnas por nombre y hoja reordenada por bloques el 15 oct (versión 20, verificado en vivo, ROADMAP 34). Sin prueba de la verificación de mantenimiento (Jorge espera feedback). Sus 2 activadores `onEdit` nunca se habían ejecutado al 15 oct: confirmar con el próximo cierre (ROADMAP 33). Que Nancy llene Fecha de realización y Asistentes al cerrar |
| Soporte remoto (`soporte.html`, `soporte-remoto.gs`) | Escuelas, Alejandro | Verde | 25 sep 2026 | Ninguno que afecte a usuarios. Columnas por nombre y hoja reordenada por bloques el 15 oct (versión 13, verificado en vivo, ROADMAP 34) |
| Correo institucional (`correo.html`, `apps-script/correo/`) | Escuelas, Marcos | Amarillo | 8 oct 2026 (`OTDE-CYR-0002` entregada, uso real) | `.gs` del 14 oct desplegados el 15 oct (columnas de SIGEE confirmadas en las 5 hojas); columnas por nombre y las 5 hojas reordenadas por bloques el 15 oct (versión 28, verificado en vivo, ROADMAP 34), con las notas de Marcos al final. Sin prueba de rechazo ni de fechas de SIGEE: Jorge espera feedback (ROADMAP 33). Tipos "Actualización de datos" y "Baja" sin construir |
| Oficina Virtual (`oficina-virtual.html`) | Escuelas | Verde | 10 ago 2026 (consulta de los 7 prefijos con `curl`) | Ninguno |
| Ceremonias Cívicas (`ceremonias-civicas.html`, `ficha-…`, `visitas-jefes.gs`) | ~20 jefes de la Subdirección | Verde | 19 oct 2026 (Jorge: la fecha ya no se desborda en iPhone) | Ninguno. El panel de cobertura queda público sin clave (decisión de Jorge, 14 oct 2026) |
| Estrategias Nacionales (`estrategias-nacionales.html`, `.gs`) | Programas Educativos | Verde | 19 oct 2026 (Jorge, en su celular: indicador de progreso y tablas) | Correr una vez el menú del resumen con datos reales (ROADMAP 29b). Al cambiar de ciclo: Sheet nueva y `MESES_EN_CICLO` |
| CTE (`cte.html`) | Docentes y directivos | Verde | 21 sep 2026 | Publicar cada sesión nueva cuando llegue |
| Excel fácil (`excel-facil.html`) | Docentes y administrativos | Verde | 6 oct 2026 | Hoja «Escuelas», retos y rutas de menú publicados el 20 oct 2026 (probado en local con Playwright, `curl` en vivo). Falta la lista de detalles de Jorge y revisar los materiales de la asesoría (ROADMAP 32) |
| Crea tu app educativa (`crea-tu-app.html`, `apps-educativas/`) | Docentes (talleres) | Amarillo | 16 oct 2026 (publicado; probado en local con Playwright) | Revisar PDA contra el PDF de la SEP y el contenido de las 3 apps, decidir licencia, validar con la Dra. Galindo (ROADMAP 35) |
| Agenda SEPRN (`agenda-prototipo.html`) | Planeación y todas las oficinas (aún nadie: es prototipo) | Amarillo | 21 oct 2026 (publicado; probado en local con Playwright) | Prototipo sin backend. Esperar la respuesta de Planeación sobre campos, catálogos y corte; después construir la versión real (ROADMAP 37) |
| Protocolos (`protocolos.html`) | Escuelas | Verde | ago 2026 | Ninguno |
| Páginas de área (`academica.html`, `personal.html`…) | Público | Amarillo | — | 4 páginas eliminadas por recrear con contenido validado por la Dra. Galindo |

## Sistemas viejos, sin uso o por apagar

| Sistema | Estado | Decisión |
|---|---|---|
| Form viejo de Correo (repo `Correos-institucionales`, proyecto "Envío automatico") | Apagado | 14 oct 2026: el Form ya no aceptaba respuestas (833 en total) y Jorge borró los activadores `resumenSemanal` y `onFormSubmit`. Queda solo `onEditTrigger`, por si Marcos cierra a mano una solicitud vieja |
| Panel OTDE (`panel-otde.gs`) | Apagado | 14 oct 2026: Jorge desinstaló su actualización automática (corría 48 veces al día sin que nadie lo usara). El código y el Sheet se quedan; se reactiva con "Instalar actualización automática" |
| v8.5 (Reportes de Visitas, solo en Apps Script) | En revisión | Su Form de campo ya no acepta respuestas (18 en total) y el 15 oct 2026 se borraron sus activadores. Su histórico no se migra (Jorge: se arranca de cero). Solo queda el reporte mensual: falta que Jorge confirme si la Bitácora OTDE ya lo reemplaza (ROADMAP 9) |
| `asistencia.html` + `conferencia-ia.gs` | Retirado | Sin uso desde el evento de jun 2026 (backend en 403). Se puede rehacer desde el historial de git |
| `cursos-coeee-2026.gs` | Congelado | Archivo histórico de Verano 2026; no recibe nada |

## Activadores de la cuenta de Apps Script

Limpiados el 15 oct 2026: se borraron ~318 activadores sin proyecto visible (Forms viejos, casi
todos sin ejecutarse nunca o inhabilitados), el de "Proyecto sin título" y los de "OTDE Reportes"
(v8.5). En "Mis activadores" quedan 13, todos de sistemas en uso: Formación Docente (3),
Mantenimiento (2), Asesorías (2), Soporte (1), Correo (2), Ceremonias Cívicas (1), Oficios (1) y
el `onEditTrigger` del Form viejo de Correo. Un activador nuevo que no sea de esta lista merece
una mirada.
