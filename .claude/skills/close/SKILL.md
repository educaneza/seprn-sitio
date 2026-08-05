---
name: close
description: Cierra una sesión de trabajo en seprn-sitio — actualiza solo los documentos que el trabajo de la sesión volvió obsoletos (docs/BITACORA.md siempre; docs/ARCHITECTURE.md, docs/ROADMAP.md, README.md, CLAUDE.md o docs/QA-NOTES.md según aplique), verifica nombres/rutas/funciones contra el código con grep antes de escribirlos, y propone el commit de cierre sin comitear solo. Úsalo cuando el usuario pida "cerrar sesión", "cerremos" o similar en este proyecto.
user-invocable: true
---

Este skill automatiza el "Ritual de cierre de sesión" documentado en `CLAUDE.md`. Antes de
nada, lee `CLAUDE.md` completo si no está ya en contexto — la tabla de qué documento actualizar
según qué cambió vive en su sección **"Ritual de cierre de sesión"**, es la fuente de verdad, y
puede evolucionar con el tiempo. Este skill describe el *proceso*, no duplica esa tabla como
una copia congelada.

Adaptado del patrón `/close` de otro proyecto (`aulia`), no copiado literal — los nombres de
archivo, la ruta de grep y el formato de commit de abajo son los reales de **este** repo.

## 1. Reconstruir qué cambió en esta sesión

No confíes en la memoria conversacional (puede estar comprimida/truncada). Reconstruye desde
el estado real del repo:

```bash
git log --oneline -15
git diff HEAD~N --stat   # N = commits de esta sesión, o usa git status/diff si aún no se comiteó
git status
git diff
```

Arma una lista concreta de qué se hizo: features/tabs nuevas o cambiadas, bugs corregidos,
decisiones de arquitectura tomadas, cosas descartadas y por qué.

## 2. Decidir qué documento(s) tocar

Aplica la tabla de `CLAUDE.md` §"Ritual de cierre de sesión" a esa lista, con una pregunta
concreta de sí/no por documento candidato — por ejemplo: "¿cambió la arquitectura de un
backend o un flujo técnico nuevo? → `docs/ARCHITECTURE.md`". **No tocar todos los documentos
por costumbre** — solo los que el trabajo de esta sesión realmente volvió obsoletos.

`docs/BITACORA.md` es la única excepción: se actualiza siempre, es el registro de qué pasó.

## 3. Verificar antes de escribir, nunca de memoria

Antes de citar en cualquier doc un nombre de función, columna de Sheet, constante, endpoint,
tab o archivo, confírmalo contra el código real:

```bash
grep -rn "<nombre>" *.html js/ apps-script/
```

Si el grep no lo confirma, no se escribe. Esto es lo que evitó, en la auditoría del 5 ago 2026,
que este mismo proyecto siguiera con contradicciones como `docs/ROADMAP.md` marcando un
feature como desplegado en una línea y como pendiente 460 líneas después.

## 4. Actualizar `docs/BITACORA.md` (siempre)

- Nuevo checkpoint insertado **arriba** del anterior (orden cronológico inverso), justo después
  del encabezado del archivo y antes del checkpoint más reciente que ya existía.
- Título: `## CHECKPOINT — <fecha ISO> · <resumen de una línea>`
- Sigue el formato tabla de los checkpoints existentes como plantilla exacta (Fecha, Sesión,
  un renglón por bloque de trabajo significativo — qué y por qué, no una lista pelona de
  commits —, Verificación con números reales, Commits) — no reinventar la estructura.
- Si hay un número que citar (líneas cambiadas, funciones agregadas, etc.), verifícalo con
  `git diff --stat` o `wc -l`, no lo aproximes de memoria.

## 5. Actualizar los demás documentos aplicables

Mismo criterio de "solo lo que quedó obsoleto", respetando el tono/nivel de detalle que ya
tiene cada archivo, sin inventar secciones estructurales nuevas que no encajen con su
convención existente (ej. `docs/ARCHITECTURE.md` usa secciones numeradas `## N. Título`;
`CLAUDE.md` usa `## \`archivo.html\` — Descripción`).

## 6. Proponer el commit de cierre — nunca comitear sin que se pida

Revisa el patrón real de commits de cierre ya usado en este repo antes de asumir un formato:

```bash
git log --oneline --all | grep -i "cerrar\|sesión"
```

(Ejemplos reales encontrados el 5 ago 2026: `Cierre de sesión: documentación al día con
trabajo de junio 2026`, `Actualizar documentación: cierre de sesión 24 jun 2026` — no hay
numeración de sesión tipo "Sesión N", a diferencia de otros proyectos.)

Redacta el mensaje siguiendo ese mismo patrón, muéstralo al usuario, y **espera confirmación
explícita** antes de comitear — igual que cualquier otro commit en este proyecto (ver
protocolo de git ya establecido). Nunca hagas `git push` sin que se pida por separado.

## Lo que este skill NO hace

- No comitea ni pushea sin que el usuario lo pida explícitamente.
- No actualiza documentos que el trabajo de la sesión no volvió obsoletos.
- No inventa números (líneas, conteos, fechas) — todo se verifica contra el estado real
  (`git diff --stat`, `wc -l`, `grep`) antes de escribirse en cualquier doc.
- No reestructura `docs/ARCHITECTURE.md`/`CLAUDE.md` — solo agrega/edita secciones existentes o
  agrega una sección nueva siguiendo la convención ya establecida de cada archivo.
