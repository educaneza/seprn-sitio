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

Actualizado: **14 oct 2026**.

## Sistemas en uso

| Sistema | Quién lo usa | Estado | Prueba en vivo | Pendiente principal |
|---|---|---|---|---|
| Oficios (`oficios.html`, `oficios.gs`) | Equipo OTDE | Verde | 14 oct 2026 | Rehacer capturas 02-06, 10 y 13 de la guía. Siguiente de la Fase 2: recordatorios, 2C o 2E (ROADMAP 27) |
| Bitácora OTDE (`bitacora.html`, `bitacora.gs`) | Jorge y Nancy | Amarillo | 6 oct 2026 | Cifras de Beneficiarios en BIT-0006 a 0009; llenar `NP_planeacion` en los cursos nuevos (ROADMAP 27) |
| Formación Docente (`formacion-docente.html`, `formacion-docente.gs`) | Docentes | Amarillo | 14 oct 2026 (calendario en iPhone y computadora) | Android sin probar; folio duplicado `OTDE-CAP-0089`; borrar respaldos y la fila `PRUEBA-QA-002`; Paso 5 contra Aula Digital (ROADMAP 19 y 28). Los correos casi no salen por cuota: el calendario es el aviso principal (decisión de Jorge) |
| Mantenimiento (`mantenimiento.html`, `reporte-visita.html`, `mantenimiento.gs`) | Escuelas, Alejandro | Amarillo | 25 sep 2026 | v8.5 sigue vivo en paralelo; decidir su retiro (ROADMAP 9) |
| Asesorías (`asesorias.html`, `asesorias.gs`) | Escuelas, Nancy | Verde | 25 sep 2026 | Que Nancy llene Fecha de realización y Asistentes al cerrar, para que llegue a la Bitácora |
| Soporte remoto (`soporte.html`, `soporte-remoto.gs`) | Escuelas, Alejandro | Verde | 25 sep 2026 | Ninguno que afecte a usuarios (modo de prueba de correo escrito pero sin desplegar) |
| Correo institucional (`correo.html`, `apps-script/correo/`) | Escuelas, Marcos | Amarillo | 25 sep 2026 | Quitar 2 activadores del proyecto viejo (ver abajo); prueba de punta a punta del tipo combinado `OTDE-CYR`; tipos "Actualización de datos" y "Baja" sin construir |
| Oficina Virtual (`oficina-virtual.html`) | Escuelas | Verde | 10 ago 2026 (consulta de los 7 prefijos con `curl`) | Ninguno |
| Ceremonias Cívicas (`ceremonias-civicas.html`, `ficha-…`, `visitas-jefes.gs`) | ~20 jefes de la Subdirección | Verde | 14 oct 2026 (las 4 mejoras del 20 sep) | Ninguno. El panel de cobertura queda público sin clave (decisión de Jorge, 14 oct 2026) |
| Estrategias Nacionales (`estrategias-nacionales.html`, `.gs`) | Programas Educativos | Verde | 29 sep 2026 | Al cambiar de ciclo: Sheet nueva y `MESES_EN_CICLO` |
| CTE (`cte.html`) | Docentes y directivos | Verde | 21 sep 2026 | Publicar cada sesión nueva cuando llegue |
| Excel fácil (`excel-facil.html`) | Docentes y administrativos | Verde | 6 oct 2026 | Ninguno |
| Protocolos (`protocolos.html`) | Escuelas | Verde | ago 2026 | Ninguno |
| Páginas de área (`academica.html`, `personal.html`…) | Público | Amarillo | — | 4 páginas eliminadas por recrear con contenido validado por la Dra. Galindo |

## Sistemas viejos, sin uso o por apagar

| Sistema | Estado | Decisión |
|---|---|---|
| Form viejo de Correo (repo `Correos-institucionales`, proyecto "Envío automatico") | Casi apagado | El Form ya no acepta respuestas (833 en total). Faltan en manos de Jorge: borrar los activadores `resumenSemanal` (manda a Marcos un resumen de lunes repetido; corrió el 12 oct) y `onFormSubmit`. `onEditTrigger` se queda por si Marcos cierra a mano una solicitud vieja. Revisado el 14 oct 2026 |
| Panel OTDE (`panel-otde.gs`) | Por apagar | Nunca se usó; Oficios ya muestra las solicitudes de Mantenimiento y Asesorías. Corre 48 veces al día (hasta 35 s cada vez) y gasta del tope diario de tiempo de activadores que comparten todos los sistemas de la cuenta. Jorge: menú "Panel OTDE → Desinstalar actualización automática". El código se queda |
| v8.5 (Reportes de Visitas, solo en Apps Script) | En revisión | Su Form de campo ("Rehabilitación de Aulas de Medios — Reporte de Visita Técnica") ya no acepta respuestas (18 en total): los técnicos solo usan `reporte-visita.html`. Solo queda el reporte mensual: falta que Jorge confirme si la Bitácora OTDE ya lo reemplaza (ROADMAP 9) |
| `asistencia.html` + `conferencia-ia.gs` | Retirado | Sin uso desde el evento de jun 2026 (backend en 403). Se puede rehacer desde el historial de git |
| `cursos-coeee-2026.gs` | Congelado | Archivo histórico de Verano 2026; no recibe nada |

## Limpieza pendiente de la cuenta de Apps Script

"Mis activadores" (script.google.com → Mis activadores) muestra decenas de activadores "Al enviar
el formulario" de Forms viejos sin proyecto visible (revisado el 14 oct 2026). No estorban a los
sistemas, pero hacen difícil ver qué corre de verdad. Barrido pendiente, sin prisa.
