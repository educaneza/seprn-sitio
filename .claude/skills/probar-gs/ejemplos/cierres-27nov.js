// Ejemplo y prueba de regresión de /probar-gs: los cambios del 27 nov 2026.
//   node .claude/skills/probar-gs/ejemplos/cierres-27nov.js
// Datos INVENTADOS (el repo es público). Para datos reales, ver SKILL.md: van al scratchpad.
'use strict';
const path = require('path');
const { crearEntorno, hoja, esperar } = require('../simulador.js');
const REPO = path.resolve(__dirname, '../../../..');
const gs = f => path.join(REPO, 'apps-script', f);

// ── 1. Mantenimiento: fecha programada escrita en texto ──
{
  const env = crearEntorno();
  env.cargar(gs('mantenimiento.gs'));
  const f = t => { const d = env.correr('manFechaProgramadaComoDate_(' + JSON.stringify(t) + ')'); return d ? d.toISOString().slice(0, 10) : null; };
  esperar(f('24 DE NOV 2026') === '2026-11-24', 'MAN: "24 DE NOV 2026" se entiende');
  esperar(f('23 oct 26') === '2026-10-23', 'MAN: "23 oct 26" se entiende');
  esperar(f('05 de nov de 2026') === '2026-11-05', 'MAN: "05 de nov de 2026" se entiende');
  esperar(f('Por definir') === null, 'MAN: "Por definir" no es fecha');
  esperar(f('31 de nov de 2026') === null, 'MAN: "31 de nov" no existe');
}

// ── 1b. Mantenimiento: ?action=agendaVisitas ve la visita capturada como texto ──
{
  const S = ['Folio', 'CCT', 'Escuela', 'Sector', 'Zona', 'Estatus', 'Técnico asignado', 'Fecha programada de visita'];
  const env = crearEntorno({
    hojas: { Solicitudes: hoja('Solicitudes', [S,
      ['OTDE-MAN-0911', '15DPR9011A', 'Escuela A', 'III', '12', 'En atención', 'Técnico', '24 DE NOV 2026'],  // texto
      ['OTDE-MAN-0912', '15DPR9012B', 'Escuela B', 'III', '12', 'Validado', 'Técnico', '25/11/2026'],         // fecha real
      ['OTDE-MAN-0913', '15DPR9013C', 'Escuela C', 'III', '12', 'Rechazado', '', '26 de nov de 2026']]) },
    props: { PANEL_TOKEN: 'tok' }
  });
  env.hojas.Solicitudes.filas[2][7] = new Date(2026, 10, 25, 12); // la fila 0912 sí es fecha en la hoja
  env.cargar(gs('mantenimiento.gs'));
  const r = env.doGet({ action: 'agendaVisitas', token: 'tok', desde: '2026-11-01', hasta: '2026-11-30' });
  const folios = r.items.map(x => x.folio + '@' + x.fecha).join(' ');
  esperar(/0911@2026-11-24/.test(folios) && /0912@2026-11-25/.test(folios), 'MAN agendaVisitas: entra la de texto y la de fecha real (' + folios + ')');
  esperar(!/0913/.test(folios), 'MAN agendaVisitas: la Rechazada no sale');
}

// ── 2. Mantenimiento: menú "Cerrar las que ya tienen reporte" ──
{
  const S = ['Folio', 'Correo', 'CCT', 'Escuela', 'Sector', 'Zona', 'Tipo de solicitante', 'Estatus', 'Notificación de cierre enviada'];
  const R = ['Folio', 'Fecha de atención', '¿Requiere segunda visita?'];
  const env = crearEntorno({
    hojas: {
      Solicitudes: hoja('Solicitudes', [S,
        ['OTDE-MAN-0901', 'a@x.mx', '15DPR9001A', 'Escuela A', 'I', '1', 'escuela', 'En atención', ''],
        ['OTDE-MAN-0902', 'b@x.mx', '15DPR9002B', 'Escuela B', 'I', '1', 'escuela', 'En atención', ''],
        ['OTDE-MAN-0903', 'c@x.mx', '15DPR9003C', 'Escuela C', 'I', '1', 'escuela', 'Rechazado', 'Sí'],
        ['OTDE-MAN-0904', 'd@x.mx', '15DPR9004D', 'Escuela D', 'I', '1', 'escuela', 'Validado', '']]),
      'Reportes de visita': hoja('Reportes de visita', [R,
        ['OTDE-MAN-0901', '24/11/2026', 'No'],
        ['OTDE-MAN-0902', '25/11/2026', 'Sí'],   // pide segunda visita: no se cierra
        ['OTDE-MAN-0903', '22/10/2026', 'No']],  // Rechazada: no se toca
      { fechas: ['Fecha de atención'] }),
      Contactos_Zona_Sector: hoja('Contactos_Zona_Sector', [['Nivel', 'Sector', 'Zona', 'Nombre', 'Correo']])
    }
  });
  env.cargar(gs('mantenimiento.gs'));
  env.correr('manCerrarConReporte()');
  const est = Object.fromEntries(env.filas('Solicitudes').map(r => [r.Folio, r.Estatus]));
  esperar(est['OTDE-MAN-0901'] === 'Resuelto', 'MAN: con reporte y sin segunda visita → Resuelto');
  esperar(est['OTDE-MAN-0902'] === 'En atención', 'MAN: con segunda visita → sigue abierta');
  esperar(est['OTDE-MAN-0903'] === 'Rechazado' && est['OTDE-MAN-0904'] === 'Validado', 'MAN: Rechazada y sin reporte, intactas');
  esperar(env.correos.length === 1 && /resuelta/.test(env.correos[0].subject), 'MAN: un solo correo de cierre');
}

// ── 3. Ticket de salida → Asesorías ──
{
  const T = ['Fecha', 'Sesión', 'Nombre', 'Correo', 'CCT'];
  const tickets = [T].concat(Array.from({ length: 4 }, (_, i) => ['26/11/2026 13:4' + i + ':00', '2026-11-26', 'Docente ' + i, 'd' + i + '@x.mx', '15DPR9100Z']));
  const tkt = crearEntorno({ hojas: { Tickets: hoja('Tickets', tickets, { fechas: ['Fecha'] }) }, props: { PANEL_TOKEN: 'tok' } });
  tkt.cargar(gs('ticket-asesoria.gs'));
  const conteo = tkt.doGet({ action: 'ticketsPorCct', token: 'tok', desde: '2026-11-01', hasta: '2026-11-30' });
  esperar(conteo.status === 'ok' && conteo.items[0].tickets === 4, 'TKT: cuenta 4 tickets por CCT y sesión');
  esperar(!JSON.stringify(conteo).includes('@'), 'TKT: no saca correos ni nombres');
  esperar(tkt.doGet({ action: 'ticketsPorCct', token: 'mal', desde: '2026-11-01', hasta: '2026-11-30' }).status === 'no_autorizado', 'TKT: token malo → no_autorizado');

  const A = ['Folio', 'Tipo de Asesoría', 'Correo', 'CCT', 'Escuela', 'Sector', 'Zona', 'Tipo de solicitante', 'Estatus',
    'Fecha programada de visita', 'Fecha de realización', 'Asistentes', 'Notificación de cierre enviada'];
  const ase = crearEntorno({
    hojas: { Solicitudes: hoja('Solicitudes', [A,
      ['OTDE-ASE-0901', 'Banco de Materiales y Chuka', 'e@x.mx', '15DPR9100Z', 'Escuela Z', 'VII', '38', 'escuela', 'Validado', '26/11/2026', '', '', ''],
      ['OTDE-ASE-0902', 'Excel básico', 'f@x.mx', '15DPR9100Z', 'Escuela Z', 'VII', '38', 'escuela', 'Validado', '26/11/2026', '', '', ''],
      ['OTDE-ASE-0903', 'Banco de Materiales y Chuka', 'g@x.mx', '15DPR9200Y', 'Escuela Y', 'VII', '38', 'escuela', 'Validado', '19/01/2099', '', '', '']],
      { fechas: ['Fecha programada de visita', 'Fecha de realización'] }) },
    props: { PANEL_TOKEN: 'tok', TELEGRAM_BOT_TOKEN: 'b', TELEGRAM_CHAT_ID: 'c' },
    fetch: url => /ticketsPorCct/.test(url) ? conteo : { status: 'error' }
  });
  ase.cargar(gs('asesorias.gs'));
  ase.correr('aseCerrarConTicketsMenu()');
  const f = Object.fromEntries(ase.filas('Solicitudes').map(r => [r.Folio, r]));
  esperar(f['OTDE-ASE-0901'].Estatus === 'Resuelto' && f['OTDE-ASE-0901'].Asistentes === 4, 'ASE: BM+Chuka con tickets → Resuelto, Asistentes = 4');
  esperar(f['OTDE-ASE-0902'].Estatus === 'Validado', 'ASE: Excel básico no se cierra con tickets');
  esperar(f['OTDE-ASE-0903'].Estatus === 'Validado', 'ASE: fecha futura no se cierra');
  esperar(ase.correos.length === 1 && ase.telegram.length === 1, 'ASE: un correo de cierre y un Telegram a Nancy');
}
