// ============================================================
// SEPRN · OTDE — Generador de resumen para Alta en SIGEE
// ============================================================
// Puerto de apps-script/GenerarResumenSIGEE.gs (sistema viejo, Google
// Form) a la hoja "Alta" consolidada del webform 2026-2027. Mismo
// propósito: arma un resumen campo-por-campo, en el orden que pide
// SIGEE en su formulario de "Alta de cuenta"
// (http://189.206.211.185/sigid/enlace/nueva.php), a partir de la fila
// activa en la hoja "Alta" — para copiar/pegar rápido en vez de ir y
// venir entre el Sheet y SIGEE columna por columna.
//
// No sustituye a SIGEE ni le manda datos automáticamente — solo lee lo
// que el docente ya capturó en el webform y lo presenta listo para
// copiar.
//
// A diferencia del sistema viejo, aquí ya no hace falta un alias por
// tipo de dominio: el webform nuevo unificó "Alta dee" + "Alta
// aulamexiquense" en una sola hoja "Alta" con columnas fijas y
// consistentes (ver Alta.gs), así que cada campo tiene un único
// encabezado real — se resuelve con indexOfHeader (Config.gs), que ya
// tolera acentos/mayúsculas/espacios.
//
// Después de crear el ticket en SIGEE, anota el NP que te muestre (ej.
// "#62") en la columna "NP SIGEE" de esta misma fila de "Alta" — es la
// única forma de encontrar después, sin adivinar, la cuenta ya creada
// en "Mis solicitudes" de SIGEE.
// ============================================================

const CAMPOS_SIGEE_ALTA = [
  { etiqueta: 'CCT', columna: 'CCT' },
  { etiqueta: 'Tipo de cuenta (Personal / Oficina)', columna: 'Tipo de Cuenta' },
  { etiqueta: 'Nombre (s)', columna: 'Nombre' },
  { etiqueta: 'Apellido paterno', columna: 'Apellido Paterno' },
  { etiqueta: 'Apellido materno', columna: 'Apellido Materno' },
  { etiqueta: 'RFC', columna: 'RFC' },
  { etiqueta: 'CURP', columna: 'CURP' },
  { etiqueta: 'Función', columna: 'Función' }
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('OTDE Correos')
    .addItem('Generar resumen para SIGEE (fila activa)', 'generarResumenSIGEE')
    .addToUi();
}

function generarResumenSIGEE() {
  const ui = SpreadsheetApp.getUi();
  const hoja = SpreadsheetApp.getActiveSheet();
  const nombreHoja = hoja.getName();

  if (nombreHoja !== HOJA_ALTA) {
    ui.alert('Esta hoja no es de Alta de cuenta. El resumen para SIGEE solo aplica a la hoja "' + HOJA_ALTA + '".');
    return;
  }

  const fila = SpreadsheetApp.getActiveRange().getRow();
  if (fila === 1) {
    ui.alert('Selecciona una fila con datos, no el encabezado.');
    return;
  }

  const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0]
    .map(h => (h || '').toString().trim());
  const valores = hoja.getRange(fila, 1, 1, hoja.getLastColumn()).getValues()[0];

  const leerCampo = (columna) => {
    const idx = indexOfHeader(headers, columna);
    if (idx === -1) return '(no encontrado — revisar encabezado)';
    const valor = (valores[idx] || '').toString().trim();
    return valor || '(vacío)';
  };

  const texto = CAMPOS_SIGEE_ALTA
    .map(campo => campo.etiqueta + ': ' + leerCampo(campo.columna))
    .join('\n');

  mostrarDialogoResumenSIGEE(texto, nombreHoja, fila);
}

function mostrarDialogoResumenSIGEE(texto, nombreHoja, fila) {
  const textoEscapado = texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = HtmlService.createHtmlOutput(`
    <div style="font-family:Arial,Helvetica,sans-serif;padding:4px 2px;">
      <p style="font-size:13px;color:#333;margin:0 0 10px 0;">
        <strong>${nombreHoja}</strong> — fila ${fila}. Copia este resumen y llénalo campo por
        campo en el formulario de Alta de SIGEE.
      </p>
      <textarea id="resumen" readonly rows="10" style="width:100%;box-sizing:border-box;font-family:monospace;font-size:13px;padding:8px;border:1px solid #d6d1ca;border-radius:6px;">${textoEscapado}</textarea>
      <p style="font-size:12px;color:#9F2241;font-weight:bold;margin:10px 0 0 0;">
        No olvides anotar aquí el NP que te dé SIGEE en la columna "NP SIGEE" de esta fila.
      </p>
    </div>
    <script>
      const ta = document.getElementById('resumen');
      ta.focus();
      ta.select();
    </script>
  `)
    .setWidth(420)
    .setHeight(380);

  SpreadsheetApp.getUi().showModalDialog(html, 'Resumen para SIGEE — ' + nombreHoja);
}
