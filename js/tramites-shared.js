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
