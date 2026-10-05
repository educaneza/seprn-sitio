// Helpers compartidos por las páginas de trámite (otde.html y las páginas propias
// de cada trámite: asesorias.html, y las que sigan — mantenimiento.html, soporte.html,
// correo.html). Nace el 27 ago 2026 al migrar Asesorías a página propia: se detectó que
// ya dependía de manLeerArchivoBase64()/MAN_TAMANO_MAX_BYTES definidos dentro del bloque
// de Mantenimiento en otde.html — se extraen aquí con nombres genéricos para que la
// dependencia sea explícita en vez de accidental. Ver docs/ARCHITECTURE.md.

// Repuebla un <select> de Función/Cargo según el tipo de CCT (escuela | supervision |
// jefatura | subdireccion — ver otdeOpcionesFuncion en js/cct-db.js), compartida por los
// formularios que preguntan Función (Correo/Alta, Mantenimiento, Asesorías, Soporte).
// Conserva la selección previa si sigue siendo válida en la nueva lista.
function otdePoblarFuncion(selectId, tipo) {
    var select = document.getElementById(selectId);
    if (!select) return;
    var valorPrevio = select.value;
    var opciones = otdeOpcionesFuncion(tipo);
    select.innerHTML = '<option value="">— Selecciona una opción —</option>';
    opciones.forEach(function(op) {
        var o = document.createElement('option');
        o.textContent = op;
        select.appendChild(o);
    });
    select.value = opciones.indexOf(valorPrevio) !== -1 ? valorPrevio : '';
}

// Normaliza mayúsculas/minúsculas de campos como Nombre y Escuela manual. Los
// solicitantes escriben en cualquier combinación (todo mayúsculas, todo minúsculas,
// mezclado); esto lo homologa a "Cada Palabra Así" para que la hoja de datos se vea
// consistente sin importar cómo lo tecleen.
function toTitleCase(str) {
    return str.trim().replace(/\s+/g, ' ').toLowerCase()
        .split(' ')
        .map(function(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : w; })
        .join(' ');
}

// Fetch + parseo JSON con timeout: si Apps Script no responde en TIMEOUT_FETCH_MS
// (ni en encabezados ni en el cuerpo de la respuesta), aborta en vez de dejar el
// botón congelado indefinidamente. El .json() va DENTRO del try — fetch() se resuelve
// al llegar los encabezados, pero el cuerpo puede tardar (o colgarse) por separado; si
// el timeout se cancelara al resolver fetch(), esa segunda espera quedaría sin
// protección. Ver docs/QA-NOTES.md #1.
// Tercer parámetro opcional `timeoutMs`: para llamadas con costo variable conocido
// (ej. subir varias fotos) que necesitan más margen que el default — ver
// FICHA_TIMEOUT_ENVIO_MS en ficha-ceremonias-civicas.html.
const TIMEOUT_FETCH_MS = 30000;
async function fetchJsonConTimeout(url, options, timeoutMs) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs || TIMEOUT_FETCH_MS);
    try {
        const r = await fetch(url, options ? Object.assign({}, options, { signal: ctrl.signal }) : { signal: ctrl.signal });
        return await r.json();
    } finally {
        clearTimeout(t);
    }
}

// Límite de tamaño para adjuntos de oficio (Mantenimiento, Asesorías).
const TAMANO_MAX_ARCHIVO_BYTES = 5 * 1024 * 1024;

// Lee un archivo adjunto (oficio) como base64, sin el prefijo "data:...;base64,".
function leerArchivoBase64(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function() {
            var resultado = reader.result;
            var base64 = resultado.substring(resultado.indexOf(',') + 1);
            resolve(base64);
        };
        reader.onerror = function() { reject(reader.error); };
        reader.readAsDataURL(file);
    });
}

// ── "Que se note que sigue trabajando" (oct 2026) ──
// Nace porque al enviar una ficha con fotos el jefe veía la página quieta por
// medio minuto y pensaba que se había trabado: los avisos de progreso se escribían
// en un .soporte-submit-msg, que está oculto mientras no tenga clase ok/error.
// Dos piezas reutilizables para cualquier formulario de trámite:
//   botonOcupado(btn, 'Enviando…') / botonLibre(btn) — spinner dentro del botón.
//   mostrarProgreso(el, {texto, detalle, paso, total}) / ocultarProgreso(el) —
//   caja de estado visible con spinner, texto vivo y barra (con avance real si se
//   pasan paso/total; animada indefinida si no). Estilos en styles.css.
function botonOcupado(btn, texto) {
    if (!btn) return;
    if (!btn.dataset.etiquetaOriginal) btn.dataset.etiquetaOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('ocupado');
    btn.setAttribute('aria-busy', 'true');
    btn.innerHTML = '<span class="btn-spinner" aria-hidden="true"></span><span></span>';
    btn.lastChild.textContent = texto || 'Procesando…';
}

function botonLibre(btn) {
    if (!btn) return;
    btn.disabled = false;
    btn.classList.remove('ocupado');
    btn.removeAttribute('aria-busy');
    if (btn.dataset.etiquetaOriginal) {
        btn.innerHTML = btn.dataset.etiquetaOriginal;
        delete btn.dataset.etiquetaOriginal;
    }
}

function mostrarProgreso(el, opciones) {
    if (!el) return;
    var o = opciones || {};
    if (!el.classList.contains('estado-progreso')) {
        el.className = 'estado-progreso';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML =
            '<div class="ep-fila"><span class="ep-spinner" aria-hidden="true"></span>' +
            '<div class="ep-textos"><p class="ep-texto"></p><p class="ep-detalle"></p></div></div>' +
            '<div class="ep-barra" aria-hidden="true"><span></span></div>';
    }
    el.querySelector('.ep-texto').textContent = o.texto || 'Procesando…';
    var detalle = el.querySelector('.ep-detalle');
    detalle.textContent = o.detalle || '';
    detalle.style.display = o.detalle ? '' : 'none';
    var barra = el.querySelector('.ep-barra');
    var relleno = barra.firstChild;
    if (o.total) {
        barra.classList.remove('indefinida');
        relleno.style.width = Math.max(4, Math.round((o.paso / o.total) * 100)) + '%';
    } else {
        barra.classList.add('indefinida');
        relleno.style.width = '';
    }
}

// Solo cambia el texto secundario (ej. contador de segundos) sin redibujar la caja.
function detalleProgreso(el, texto) {
    var d = el && el.querySelector('.ep-detalle');
    if (!d) return;
    d.textContent = texto || '';
    d.style.display = texto ? '' : 'none';
}

function ocultarProgreso(el, claseBase) {
    if (!el) return;
    el.className = claseBase || 'soporte-submit-msg';
    el.removeAttribute('role');
    el.removeAttribute('aria-live');
    el.innerHTML = '';
}

// Atajo para un envío completo (oct 2026, al extender esto a los trámites de OTDE):
// botón ocupado + caja de progreso + contador de segundos + avisos si tarda.
//   var espera = esperaConProgreso(btn, msg, { boton: 'Enviando…', texto: 'Enviando tu solicitud…' });
//   espera.etapa('Subiendo tu oficio…');      // cambia el texto principal
//   ... await fetch ...
//   espera.fin();   // llamarlo ANTES de escribir el ok/error en `msg` (lo limpia);
//                   // es idempotente: volver a llamarlo en un finally no borra el resultado.
function esperaConProgreso(btn, msg, opciones) {
    var o = opciones || {};
    var base = o.detalle || 'Suele tardar unos segundos. No cierres esta página.';
    var inicio = Date.now();
    var terminado = false;
    botonOcupado(btn, o.boton || 'Enviando…');
    mostrarProgreso(msg, { texto: o.texto || 'Enviando…', detalle: base });
    var reloj = setInterval(function () {
        var s = Math.round((Date.now() - inicio) / 1000);
        var texto = base;
        if (s >= 25) texto = 'Está tardando más de lo usual; seguimos esperando la respuesta del servidor. No cierres esta página ni vuelvas a enviar.';
        else if (s >= 10) texto = 'Seguimos trabajando, ya casi. No cierres esta página.';
        if (s >= 3) detalleProgreso(msg, texto + ' (' + s + ' s)');
    }, 1000);
    return {
        etapa: function (texto) {
            if (terminado) return;
            var t = msg && msg.querySelector('.ep-texto');
            if (t) t.textContent = texto;
        },
        fin: function () {
            clearInterval(reloj);
            if (!terminado) {
                terminado = true;
                ocultarProgreso(msg, o.claseBase);
            }
            botonLibre(btn);
        }
    };
}
