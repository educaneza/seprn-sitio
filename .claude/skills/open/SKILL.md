---
name: open
description: Abre una sesión de trabajo en seprn-sitio. Primero revisa las sesiones vinculadas (cuenta de gh, git local contra origin/main, últimos despliegues de GitHub Pages) y después lee solo el checkpoint más reciente de docs/BITACORA.md y los ítems de ROADMAP que cite. Termina con un informe corto y espera instrucciones. Úsalo cuando el usuario escriba /open, "abramos sesión" o similar en este proyecto.
user-invocable: true
---

# /open — Apertura de sesión de seprn-sitio

Complemento de `/close` (`.claude/skills/close/SKILL.md`): `/close` deja escrito en
`docs/BITACORA.md` qué pasó y qué falta (fila **Pendiente** del checkpoint), y `/open` lo retoma.
Las convenciones viven en `CLAUDE.md`, que es la fuente de verdad. Si este archivo y `CLAUDE.md`
se contradicen, gana `CLAUDE.md`.

Adaptado del patrón `/open` de otro proyecto (`barber-saas`), no copiado literal. Aquí no hay
Vercel, Supabase, `MASTER_PLAN.md` ni `CURRENT_CONTEXT.md`.

## 0. Sesiones vinculadas (antes de leer nada)

Jorge trabaja también en otros proyectos (Aulia: cuenta `auliamx`; barber-saas:
`albertobonillat-collab`) desde la misma Mac, así que la sesión global de `gh` puede haber quedado
en otra cuenta. Se revisa cada punto y se reporta en una tabla al final. Si un comando falla por
red o falta de login, se reporta y se sigue: esto no bloquea la apertura.

1. **GitHub (`gh`)**: este repo usa la cuenta `educaneza` (CLAUDE.md, regla 5). El push va por SSH
   (alias `github-educaneza`), así que `gh` solo se necesita para los despliegues. Con otra cuenta,
   `gh run list` sí funciona (el repo es público), pero `gh run cancel` y cualquier otra escritura
   fallan.
   ```
   gh auth status --active --hostname github.com
   ```
   Si la cuenta activa no es `educaneza`:
   ```
   gh auth switch --hostname github.com --user educaneza
   ```
   Avisa a Jorge de que el cambio es global: afecta a las otras terminales (Aulia, barber-saas)
   hasta que vuelva a cambiarla.
2. **Git local**: solo se revisa, no se cambia.
   - `git remote get-url origin` debe ser `git@github-educaneza:educaneza/seprn-sitio.git`.
   - `git config user.email` debe ser `otde.nezahualcoyotl@gmail.com`. Si es otro, **no lo
     corrijas**: avisa.
   - `git fetch origin`, `git status -sb` y compara `git log --oneline -3 origin/main` contra
     `git log --oneline -3 main`. Reporta si `main` va adelante, atrás o divergida. Si está
     divergida, recuerda el patrón `publish-*` de CLAUDE.md (sección "Deploy"). No hagas pull ni
     push.
3. **GitHub Pages**:
   ```
   gh run list -R educaneza/seprn-sitio -L 3
   ```
   Avisa si alguno terminó en `failure` o lleva más de 10 min en `queued` (CLAUDE.md, regla 5).
   No lo canceles ni redespliegues sin que Jorge lo pida.
4. **Peso del sitio** (rápido): `git ls-files -z | xargs -0 du -ch | tail -1`. Solo avisa si pasa
   del umbral de aviso de `docs/ROADMAP.md` ítem 10 (800 MB publicados).

## 1–3. Lectura mínima

1. `CLAUDE.md` ya se carga solo al iniciar: no lo releas completo.
2. Lee **solo** el checkpoint más reciente de `docs/BITACORA.md`: desde el primer
   `## CHECKPOINT` hasta el `---` siguiente. Si esa fecha tiene varios checkpoints ("(cont.)",
   "(cont. 2)"), lee todos los de esa fecha y nada más.
   ```
   grep -n "^## CHECKPOINT" docs/BITACORA.md | head -5
   ```
3. De la fila **Pendiente** del checkpoint y de "Pendientes vigentes" de `CLAUDE.md`, abre en
   `docs/ROADMAP.md` solo los ítems que se citen por número. Nunca cargues todo `docs/`.
4. Lee `docs/TABLERO-SALUD.md` (es corto). De ahí salen los sistemas en Rojo y los de
   **prueba en vivo más vieja**: los que se pueden estar olvidando mientras se trabaja en otro.

## 4. Informe y espera

Muestra en el chat, en lenguaje llano y breve:

- **Sesiones:** tabla `servicio | estado | acción tomada` (gh, git local, GitHub Pages, peso).
- **Dónde estamos:** fecha y título del último checkpoint y qué quedó publicado.
- **Pendientes de Jorge:** los de la fila Pendiente y los de "Pendientes vigentes" que dependen de
  él (pruebas en vivo, decisiones, redespliegues de Apps Script). **Resalta los que tengan una
  fecha ya vencida** respecto a hoy.
- **Salud de los sistemas:** los que estén en Rojo y los 2-3 de prueba en vivo más vieja, con su
  pendiente principal (de `docs/TABLERO-SALUD.md`). Si toca sesión de rotación (una de cada tres,
  ver la regla en el tablero), propón uno de esos en vez del "Siguiente".
- **Propuesta:** el "Siguiente" del último checkpoint.

Después **para y espera** a que Jorge diga qué se hace.

## Lo que este skill NO hace

- No escribe en `docs/`, `CLAUDE.md`, `README.md` ni en la memoria. Eso es trabajo de `/close`.
- No hace pull, push, commit ni cambia la config de git.
- No pega ni redespliega Apps Script, ni cancela o relanza runs de GitHub Pages.
- No empieza a trabajar en ninguna tarea por su cuenta.
