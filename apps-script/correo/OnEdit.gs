/**
 * Un solo trigger onEdit para todo el proyecto — enruta por el
 * nombre de la hoja editada a la función de revisión de ese tipo
 * (cada una vive en su propio archivo: Alta.gs, CambioContrasena.gs,
 * Reset2FA.gs, Incidencias.gs). Más simple de instalar/mantener que
 * un trigger por hoja.
 *
 * Cada función de revisión repite el mismo cuidado que el proyecto
 * viejo (OnEditTrigger.gs): no usa e.value porque solo existe en
 * ediciones de una sola celda — si el dato llega por pegado/arrastre
 * de varias celdas a la vez, e.value viene undefined y el disparo se
 * pierde en silencio. Cada una lee el valor real de la celda y
 * revisa si su columna de disparo cae dentro del rango editado, sin
 * importar su tamaño.
 */
function onEditWebform(e) {
  if (!e || !e.range) return;

  const nombreHoja = e.range.getSheet().getName();

  switch (nombreHoja) {
    case HOJA_ALTA:
      altaRevisarEdicion(e);
      break;
    case HOJA_CAMBIO:
      cambioRevisarEdicion(e);
      break;
    case HOJA_RESET:
      resetRevisarEdicion(e);
      break;
    case HOJA_INCIDENCIAS:
      incidenciaRevisarEdicion(e);
      break;
  }
}

/**
 * Ejecutar UNA SOLA VEZ para instalar el activador limpiamente.
 */
function recrearTriggerWebform() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'onEditWebform') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  ScriptApp.newTrigger('onEditWebform')
    .forSpreadsheet(ss)
    .onEdit()
    .create();

  Logger.log('✅ Trigger onEditWebform instalado correctamente');
}
