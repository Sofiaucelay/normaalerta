/* ==========================================================================
   NormaAlerta — Motor del calendario fiscal personalizado
   Revisado: 23-nov-2026

   Reglas de plazos (fuentes):
   - Modelos 303, 130, 131: 1-20 abr/jul/oct; 4T del 1 al 30 de enero
     (art. 71.4 RIVA; art. 109 RIRPF; Orden HAC 2024 modelo 303; instrucciones 130/131).
   - Modelos 111, 115: 1-20 abr/jul/oct/ene (art. 108 RIRPF).
   - 349 trimestral: 1-20 abr/jul/oct; 4T hasta el 30 de enero (art. 81 RIVA).
   - 390: 1-30 enero. 180, 184, 190: 1-31 enero. 347: mes de febrero.
   - 100 (Renta): hasta el 30 de junio. 200: 25 días naturales tras los 6 meses
     siguientes al cierre (1-25 julio si el ejercicio coincide con el año natural).
   - 202: 1-20 abril, octubre y diciembre (art. 40 LIS).
   - Si el último día es inhábil, el plazo pasa al siguiente día hábil. La AEAT
     considera inhábiles sábados, domingos, festivos nacionales y los festivos
     autonómicos o locales del municipio de su Departamento de Informática (Madrid).
     (Calendario del contribuyente 2026, apartado de domiciliación.)
   - Domiciliación: termina el tercer día hábil anterior al último día de presentación.
     Regla contrastada con todas las fechas del calendario del contribuyente 2026.
   - Cambio de base RETA: 6 ventanas (art. 308 LGSS; art. 45 RD 2064/1995).
   ========================================================================== */
(function (global) {
  'use strict';

  // Festivos nacionales + Comunidad de Madrid.
  // 2026: Decreto Comunidad de Madrid para 2026. 2027: Resolución DG Trabajo 8-10-2026 (BOE 13-10-2026)
  // y Decreto 82/2026 de la Comunidad de Madrid (BOCM 1-10-2026). 2028: solo festivos nacionales fijos conocidos.
  // Las fiestas locales del municipio de Madrid de 2027 no están publicadas a la fecha de revisión.
  const FESTIVOS = new Set([
    '2026-01-01', '2026-01-06', '2026-03-19', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-02',
    '2026-08-15', '2026-10-12', '2026-11-02', '2026-12-07', '2026-12-08', '2026-12-25',
    '2027-01-01', '2027-01-06', '2027-03-19', '2027-03-25', '2027-03-26', '2027-05-01', '2027-08-16',
    '2027-10-12', '2027-11-01', '2027-12-06', '2027-12-08', '2027-12-25',
    '2028-01-01', '2028-01-06',
  ]);
  const ULTIMO_DIA_CON_FESTIVOS = '2028-02-29';

  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  function D(y, m, d) { return new Date(Date.UTC(y, m - 1, d)); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function addDias(d, n) { return new Date(d.getTime() + n * 86400000); }
  function ultimoDiaMes(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function esInhabil(d) { const w = d.getUTCDay(); return w === 0 || w === 6 || FESTIVOS.has(iso(d)); }
  function siguienteHabil(d) { while (esInhabil(d)) d = addDias(d, 1); return d; }
  function domiciliacionHasta(fin) {
    let d = fin, n = 0;
    while (n < 3) { d = addDias(d, -1); if (!esInhabil(d)) n++; }
    return d;
  }
  function vence(y, m, d) { return siguienteHabil(D(y, m, d)); }
  function fechaLarga(d) { return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; }
  function fechaCorta(d) { return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; }

  /* Perfil:
     forma: 'autonomo' | 'sociedad' | 'cb'
     irpf: 'ed' | 'modulos'            (autónomo)
     ret70: bool                        (profesional con ≥70 % de ingresos con retención el año anterior)
     iva: 'general' | 'simplificado' | 'recargo' | 'exento'
     retenciones111: bool              (empleados o profesionales a los que retienes)
     alquiler115: bool                 (pagas alquiler de local con retención)
     intracom: bool                    (entregas o servicios intracomunitarios, o adquisiciones)
     terceros347: bool                 (operaciones > 3.005,06 € con algún cliente o proveedor)
     reta: bool                        (cotizas en el RETA)
     pagos202: bool                    (sociedad cuyo último IS salió con cuota a ingresar)
     mercantil: bool                   (recordatorios del Registro Mercantil)
  */
  function obligacionesTrimestrales(p) {
    const o = [];
    const ivaTrim = (p.iva === 'general' || p.iva === 'simplificado');
    if (ivaTrim) o.push({ modelo: '303', nombre: 'IVA trimestral', pago: true, cat: 'iva' });
    if (p.forma === 'autonomo') {
      if (p.irpf === 'modulos') o.push({ modelo: '131', nombre: 'Pago fraccionado IRPF (módulos)', pago: true, cat: 'irpf' });
      else if (!p.ret70) o.push({ modelo: '130', nombre: 'Pago fraccionado IRPF (estimación directa)', pago: true, cat: 'irpf' });
    }
    if (p.retenciones111) o.push({ modelo: '111', nombre: 'Retenciones de trabajadores y profesionales', pago: true, cat: 'ret', retencion: true });
    if (p.alquiler115) o.push({ modelo: '115', nombre: 'Retenciones del alquiler de tu local', pago: true, cat: 'ret', retencion: true });
    if (p.intracom) o.push({ modelo: '349', nombre: 'Operaciones intracomunitarias (declaración informativa)', pago: false, cat: 'info' });
    return o;
  }

  function generar(p, desde, hasta) {
    const ev = [];
    const add = (fecha, item) => { if (fecha >= desde && fecha <= hasta) ev.push(Object.assign({ fecha }, item)); };
    const trimestrales = obligacionesTrimestrales(p);
    const y0 = desde.getUTCFullYear(), y1 = hasta.getUTCFullYear() + 1;

    for (let y = y0 - 1; y <= y1; y++) {
      // Trimestres 1T-3T del año y
      [[1, 4], [2, 7], [3, 10]].forEach(([t, mes]) => {
        const fin = vence(y, mes, 20);
        trimestrales.forEach(ob => add(fin, {
          modelo: ob.modelo, titulo: `Modelo ${ob.modelo} · ${t}T ${y}`, detalle: ob.nombre, cat: ob.cat,
          plazo: `Del 1 al ${fechaCorta(fin)}`, domiciliacion: ob.pago ? domiciliacionHasta(fin) : null,
        }));
      });
      // 4T del año y-1, que se presenta en enero de y
      const fin4T = vence(y, 1, 30), fin4TRet = vence(y, 1, 20);
      trimestrales.forEach(ob => {
        const fin = ob.retencion ? fin4TRet : fin4T;
        add(fin, {
          modelo: ob.modelo, titulo: `Modelo ${ob.modelo} · 4T ${y - 1}`, detalle: ob.nombre, cat: ob.cat,
          plazo: `Del 1 de enero al ${fechaCorta(fin)}`, domiciliacion: ob.pago ? domiciliacionHasta(fin) : null,
        });
      });

      // Resúmenes anuales (enero de y, ejercicio y-1)
      if (p.iva === 'general') add(fin4T, { modelo: '390', titulo: `Modelo 390 · Resumen anual IVA ${y - 1}`, detalle: 'Declaración resumen anual del IVA', cat: 'iva', plazo: `Del 1 de enero al ${fechaCorta(fin4T)}`, domiciliacion: null });
      const fin31 = vence(y, 1, 31);
      if (p.retenciones111) add(fin31, { modelo: '190', titulo: `Modelo 190 · Resumen anual retenciones ${y - 1}`, detalle: 'Resumen anual del modelo 111', cat: 'info', plazo: `Del 1 de enero al ${fechaCorta(fin31)}`, domiciliacion: null });
      if (p.alquiler115) add(fin31, { modelo: '180', titulo: `Modelo 180 · Resumen anual alquileres ${y - 1}`, detalle: 'Resumen anual del modelo 115', cat: 'info', plazo: `Del 1 de enero al ${fechaCorta(fin31)}`, domiciliacion: null });
      if (p.forma === 'cb') add(fin31, { modelo: '184', titulo: `Modelo 184 · Entidades en atribución de rentas ${y - 1}`, detalle: 'Declaración informativa anual de la comunidad de bienes o sociedad civil', cat: 'info', plazo: `Del 1 de enero al ${fechaCorta(fin31)}`, domiciliacion: null });
      if (p.terceros347) { const f = vence(y, 2, ultimoDiaMes(y, 2)); add(f, { modelo: '347', titulo: `Modelo 347 · Operaciones con terceros ${y - 1}`, detalle: 'Clientes o proveedores con más de 3.005,06 € en el año', cat: 'info', plazo: `Del 1 de febrero al ${fechaCorta(f)}`, domiciliacion: null }); }

      // Renta (personas físicas: autónomo o comuneros)
      if (p.forma === 'autonomo' || p.forma === 'cb') {
        const f = vence(y, 6, 30);
        add(f, { modelo: '100', titulo: `Declaración de la Renta ${y - 1}`, detalle: p.forma === 'cb' ? 'Cada comunero declara su parte del rendimiento' : 'Modelo 100 · la campaña empieza en abril (la fecha exacta la fija la orden anual)', cat: 'irpf', plazo: `Hasta el ${fechaCorta(f)}`, domiciliacion: domiciliacionHasta(f) });
      }

      if (p.forma === 'sociedad') {
        const f200 = vence(y, 7, 25);
        add(f200, { modelo: '200', titulo: `Modelo 200 · Impuesto sobre Sociedades ${y - 1}`, detalle: 'Si tu ejercicio coincide con el año natural', cat: 'is', plazo: `Del 1 al ${fechaCorta(f200)}`, domiciliacion: domiciliacionHasta(f200) });
        if (p.pagos202) [[4, '1P'], [10, '2P'], [12, '3P']].forEach(([mes, per]) => {
          const f = vence(y, mes, 20);
          add(f, { modelo: '202', titulo: `Modelo 202 · Pago fraccionado ${per} ${y}`, detalle: 'Pago fraccionado del Impuesto sobre Sociedades', cat: 'is', plazo: `Del 1 al ${fechaCorta(f)}`, domiciliacion: domiciliacionHasta(f) });
        });
        if (p.mercantil) {
          add(D(y, 3, 31), { modelo: 'RM', titulo: `Formular las cuentas anuales ${y - 1}`, detalle: 'El órgano de administración tiene 3 meses desde el cierre (art. 253 LSC)', cat: 'mercantil', plazo: 'Fecha máxima', domiciliacion: null });
          add(D(y, 4, 30), { modelo: 'RM', titulo: `Legalizar los libros ${y - 1}`, detalle: 'Libro diario, inventarios y cuentas anuales, actas… en el Registro Mercantil (4 meses desde el cierre)', cat: 'mercantil', plazo: 'Fecha máxima', domiciliacion: null });
          add(D(y, 6, 30), { modelo: 'RM', titulo: `Aprobar las cuentas anuales ${y - 1} en junta`, detalle: 'Dentro de los 6 meses siguientes al cierre (art. 164 LSC)', cat: 'mercantil', plazo: 'Fecha máxima', domiciliacion: null });
          add(D(y, 7, 30), { modelo: 'RM', titulo: `Depositar las cuentas anuales ${y - 1}`, detalle: 'Un mes desde la aprobación (art. 279 LSC). La fecha supone que las aprobaste el 30 de junio', cat: 'mercantil', plazo: 'Fecha máxima', domiciliacion: null });
        }
      }

      // Cambios de régimen para el año siguiente (hasta el 31 de diciembre)
      if (p.forma === 'autonomo' || p.forma === 'cb') {
        add(D(y, 12, 31), { modelo: '036', titulo: `Renunciar o volver a módulos, estimación directa simplificada o IVA simplificado para ${y + 1}`, detalle: 'Solo si quieres cambiar de régimen. La renuncia a módulos te vincula 3 años', cat: 'censal', plazo: `Hasta el ${fechaCorta(D(y, 12, 31))}`, domiciliacion: null });
      }

      // Seguridad Social
      if (p.reta) [[2, 'marzo'], [4, 'mayo'], [6, 'julio'], [8, 'septiembre'], [10, 'noviembre'], [12, 'enero de ' + (y + 1)]].forEach(([mes, efecto]) => {
        const f = D(y, mes, ultimoDiaMes(y, mes));
        add(f, { modelo: 'RETA', titulo: 'Último día para cambiar tu base de cotización', detalle: `Si lo pides hasta hoy, el cambio se aplica desde el 1 de ${efecto}`, cat: 'ss', plazo: 'Por Import@ss', domiciliacion: null });
      });
    }
    ev.sort((a, b) => a.fecha - b.fecha || String(a.modelo).localeCompare(String(b.modelo)));
    return ev;
  }

  function avisos(p) {
    const a = [];
    if (p.grande) a.push('Si eres gran empresa (más de 6.010.121,04 € de volumen de operaciones), estás en el REDEME o en el SII, tus modelos 303, 111 y 115 son mensuales y este calendario trimestral no te sirve tal cual.');
    if (p.iva === 'simplificado') a.push('En régimen simplificado del IVA no presentas el modelo 390, pero tienes que rellenar en el 303 del cuarto trimestre el apartado de exonerados del resumen anual.');
    if (p.iva === 'recargo') a.push('En recargo de equivalencia no presentas el 303 ni el 390 por tus ventas, salvo casos concretos (por ejemplo, compras a otros países de la UE o inversión del sujeto pasivo). El recargo te lo cobra tu proveedor.');
    if (p.iva === 'exento') a.push('Con actividad exenta de IVA no presentas 303 ni 390 por esa actividad. Ojo: si contratas servicios a empresas de fuera de España (publicidad, software…) puede que tengas que presentar el 303 y el 349.');
    if (p.forma === 'autonomo' && p.irpf !== 'modulos' && p.ret70) a.push('No presentas el 130 porque en el año anterior al menos el 70 % de tus ingresos profesionales llevaron retención (art. 109 RIRPF). Si este año baja de ese porcentaje, el año que viene tendrás que presentarlo.');
    if (p.forma === 'cb') a.push('En una comunidad de bienes o sociedad civil, cada comunero presenta su propio pago fraccionado (130 o 131) y su Renta. La entidad presenta el IVA y el modelo 184.');
    if (p.intracom) a.push('El 349 es trimestral solo si tus entregas de bienes y servicios a otros países de la UE no superan 50.000 € ni en el trimestre ni en los cuatro anteriores. Si los superas, pasa a ser mensual.');
    if (p.forma === 'sociedad' && !p.pagos202) a.push('Sin modelo 202: no hay que presentarlo si tu último Impuesto sobre Sociedades no dejó cuota a ingresar o es tu primer ejercicio, salvo que tu cifra de negocios supere 6 millones de euros.');
    return a;
  }

  /* Exportación a calendario (.ics, RFC 5545) */
  function icsEscape(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }
  function icsDate(d) { return iso(d).replace(/-/g, ''); }
  function plegar(linea) {
    // RFC 5545: líneas de máximo 75 octetos; la continuación empieza con un espacio
    const enc = (typeof TextEncoder !== 'undefined') ? new TextEncoder() : null;
    const bytes = c => enc ? enc.encode(c).length : (c.charCodeAt(0) < 128 ? 1 : 3);
    const out = []; let cur = '', n = 0, lim = 75;
    for (const ch of linea) {
      const b = bytes(ch);
      if (n + b > lim) { out.push(cur); cur = ' '; n = 1; lim = 75; }
      cur += ch; n += b;
    }
    out.push(cur); return out.join('\r\n');
  }
  function aICS(eventos, ahora) {
    const stamp = (ahora || new Date()).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NormaAlerta//Calendario fiscal//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Calendario fiscal NormaAlerta'];
    eventos.forEach((e, i) => {
      const desc = [e.detalle, e.plazo, e.domiciliacion ? `Si domicilias el pago: hasta el ${fechaLarga(e.domiciliacion)}` : '', 'Calculado por NormaAlerta. Comprueba siempre el calendario oficial de la AEAT.'].filter(Boolean).join('\n');
      L.push('BEGIN:VEVENT',
        `UID:${icsDate(e.fecha)}-${String(e.modelo).toLowerCase()}-${i}@normaalerta.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${icsDate(e.fecha)}`,
        `DTEND;VALUE=DATE:${icsDate(addDias(e.fecha, 1))}`,
        plegar(`SUMMARY:${icsEscape('⏰ ' + e.titulo)}`),
        plegar(`DESCRIPTION:${icsEscape(desc)}`),
        'TRANSP:TRANSPARENT',
        'BEGIN:VALARM', 'ACTION:DISPLAY', plegar(`DESCRIPTION:${icsEscape(e.titulo)}`), 'TRIGGER:-P5D', 'END:VALARM',
        'END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.join('\r\n') + '\r\n';
  }

  const API = { FESTIVOS, ULTIMO_DIA_CON_FESTIVOS, D, iso, esInhabil, siguienteHabil, domiciliacionHasta, vence, generar, avisos, aICS, fechaLarga, fechaCorta };
  global.NACal = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
