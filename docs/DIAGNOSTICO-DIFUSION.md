# Diagnóstico: evidencias de actividades y difusión en redes

> Etapa: **solo diagnóstico** (21 oct 2026). No se construye nada hasta tener las respuestas de
> la sección 3. Idea de Jorge; nadie la ha pedido todavía.

## Contexto

Hoy hay dos flujos paralelos:

1. **Actividades de la Dra. Galindo.** Su auxiliar toma las fotos y manda un reporte a un grupo de
   WhatsApp donde están la responsable de Oficina Particular, la responsable de Planeación y el
   community manager. Cada quien toma lo que le sirve para sus propios fines.
2. **Actividades de las áreas.** Cuando una oficina quiere publicar algo en Facebook, le manda a
   Jorge fotos y una descripción breve. Muchas veces la descripción queda corta y no alcanza para
   publicar.

La pregunta del diagnóstico: **¿hay trabajo repetido o información perdida que justifique una
plataforma, o basta con una plantilla?**

## 1. Lectura del reporte de ejemplo (Reunión de Escuelas Multigrado, 21 oct 2026)

El formato de la auxiliar **ya es bueno y consistente**:

| Campo | ¿Lo trae? |
|---|---|
| Actividad | Sí |
| Fecha | Sí |
| Hora | **No** |
| Sede (escuela, turno, CCT, zona, sector, domicilio) | Sí, muy completa |
| Convocados con nombre y cargo | Sí |
| Propósito | Sí |
| Qué pasó (narrativa, mensaje de la Dra., cita textual) | Sí |
| Total de participantes | Sí (aproximado) |
| Quién tomó las fotos | **No** |
| ¿Salen niñas y niños identificables? / consentimiento | **No** |
| Versión corta para redes | **No** (el CM la tiene que redactar) |

Observaciones:
- Hay errores de captura menores ("deTrabajo", dobles espacios), normales al escribir en el
  celular.
- La sede se podría prellenar desde el CCT con `js/cct-db.js` (nombre, sector, zona y municipio).
  El **domicilio y el turno no están** en esa base; habría que agregarlos o seguirlos capturando.
- **Hipótesis a confirmar:** el flujo de la Dra. funciona razonablemente bien; el hueco real está en
  los reportes de las áreas, que no siguen ninguna plantilla.

## 2. Plantilla de criterios mínimos para publicar (borrador)

Derivada del formato de la auxiliar, para que las áreas copien algo que ya funciona. **Validar con
el community manager antes de mandarla a las áreas.**

```
*ACTIVIDAD:* (nombre de la actividad, sin abreviaturas)
*ÁREA QUE LA ORGANIZA:*
*FECHA Y HORA:*
*SEDE:* (escuela y CCT, o nombre y domicilio del lugar)
*PARTICIPARON:* (cargos y nombres de quienes encabezaron; número de asistentes)
*PROPÓSITO:* (para qué se hizo, en una o dos líneas)
*QUÉ SE HIZO / QUÉ SE LOGRÓ:* (3 a 5 líneas: qué pasó, resultado, acuerdo o mensaje principal)
*FOTOS:* (de 3 a 6, horizontales, buena luz; quién las tomó)
*¿SALEN NIÑAS O NIÑOS IDENTIFICABLES?:* Sí / No (si sí, ¿hay consentimiento?)
```

Si una solicitud no trae al menos **actividad, fecha, sede, propósito, qué se hizo y 3 fotos**, se
regresa con la plantilla antes de publicar.

## 3. Guía de entrevista (15 min por persona)

Hacerla en persona o por llamada, no por escrito. Presentarla como "quiero saber cómo te puedo
ahorrar trabajo", no como "voy a cambiar el grupo".

**Preguntas para todas:**
- ¿Qué te quita más tiempo de este proceso?
- Si el grupo desapareciera mañana, ¿qué extrañarías?
- ¿Alguna vez buscaste fotos o datos de una actividad pasada y no los encontraste?

**Auxiliar de la Dra. Galindo:**
- ¿Cuánto tardas en armar cada reporte? ¿Lo escribes en el momento o después?
- ¿Desde dónde lo capturas (celular, computadora)? ¿Guardas una plantilla?
- ¿Qué datos te cuesta conseguir (nombres, cargos, número de asistentes)?
- Si un formulario en el celular te armara el texto para pegarlo en WhatsApp, ¿lo usarías o te
  estorbaría?

**Oficina Particular:**
- ¿Qué guardas de cada reporte y dónde (carpeta, Drive, archivo impreso)?
- ¿Para qué lo usas después (agenda, informes, oficios de agradecimiento)?
- ¿Cada cuánto te piden un recuento de actividades de la Dra.? ¿Cómo lo armas?

**Planeación:**
- ¿Qué datos tomas (tipo de actividad, asistentes, meta a la que abona)?
- ¿Los vuelves a capturar en otro lado (Excel, Word, reporte mensual)?
- ¿Cada cuánto reportas y a quién? ¿Te faltan datos al cierre de mes?

**Community manager:**
- ¿Qué te falta con más frecuencia para poder publicar?
- ¿Cuánto reescribes el texto que te llega? ¿Qué largo prefieres para Facebook?
- ¿Qué criterios de fotos tienes (cantidad, orientación, menores)?
- ¿Cuántas publicaciones de actividades haces por semana? ¿Cuántas se quedan sin publicar?

## 4. Vaciado de respuestas

| Persona | Qué toma del reporte | Dónde lo guarda | Qué repite a mano | Qué le falta | ¿Usaría un formulario? |
|---|---|---|---|---|---|
| Auxiliar | | | | | |
| Oficina Particular | | | | | |
| Planeación | | | | | |
| Community manager | | | | | |
| Jorge (solicitudes de áreas) | | | | | |

## 5. Criterio de decisión

- **Construir una plataforma** solo si al menos **dos de las cuatro personas** del grupo repiten
  trabajo a mano o pierden información. En ese caso, diseñarla para convivir con WhatsApp (que genere
  el texto para pegar en el grupo), no para reemplazarlo, y presentarla antes a la Dra. Galindo.
- **Si no se cumple:** basta con la plantilla de la sección 2 para las áreas. Sin backend ni página
  nueva.
- Si se construye, se reutilizan piezas que ya existen: la ficha de Ceremonias Cívicas
  (`ficha-ceremonias-civicas.html`: fotos comprimidas en el navegador, campos "Para difusión" y
  "Uso interno") y el autocomplete de CCT (`js/cct-db.js`).
