/* ==========================================================================
   NormaAlerta — Parámetros fiscales y de cotización 2026
   Archivo único con todas las cifras normativas que usan las herramientas.
   Para actualizar a un nuevo ejercicio, se cambia SOLO este archivo.

   Fuentes (revisado 09-oct-2026):
   - Orden PJC/297/2026, de 30 de marzo (BOE 31-03-2026): bases y tipos de
     cotización 2026 (RETA y Régimen General).
   - Ley 35/2006 IRPF y RD 439/2007 RIRPF (escala, mínimos, art. 20, art. 85).
   - RDL 5/2026 (convalidado): deducción IRPF perceptores de SMI.
   - RD 126/2026: SMI 2026 = 1.221 €/mes x 14.
   - Ley 27/2014 LIS art. 29 y DT 44ª (redacción Ley 7/2024): tipos IS.
   - Ley 58/2003 LGT art. 26 y 27 (redacción Ley 11/2021): recargos e intereses.
   - Presupuestos 2023 prorrogados: interés de demora 4,0625 %.
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---------------- RETA (autónomos) ---------------- */
  // Tramos de rendimientos netos mensuales (art. 18 Orden PJC/297/2026)
  const TRAMOS_RETA = [
    { tabla: 'Reducida', num: 'R1', min: 0,       max: 670,     baseMin: 653.59,  baseMax: 718.94 },
    { tabla: 'Reducida', num: 'R2', min: 670,     max: 900,     baseMin: 718.95,  baseMax: 900.00 },
    { tabla: 'Reducida', num: 'R3', min: 900,     max: 1166.70, baseMin: 849.67,  baseMax: 1166.70 },
    { tabla: 'General',  num: '1',  min: 1166.70, max: 1300,    baseMin: 950.98,  baseMax: 1300.00 },
    { tabla: 'General',  num: '2',  min: 1300,    max: 1500,    baseMin: 960.78,  baseMax: 1500.00 },
    { tabla: 'General',  num: '3',  min: 1500,    max: 1700,    baseMin: 960.78,  baseMax: 1700.00 },
    { tabla: 'General',  num: '4',  min: 1700,    max: 1850,    baseMin: 1143.79, baseMax: 1850.00 },
    { tabla: 'General',  num: '5',  min: 1850,    max: 2030,    baseMin: 1209.15, baseMax: 2030.00 },
    { tabla: 'General',  num: '6',  min: 2030,    max: 2330,    baseMin: 1274.51, baseMax: 2330.00 },
    { tabla: 'General',  num: '7',  min: 2330,    max: 2760,    baseMin: 1356.21, baseMax: 2760.00 },
    { tabla: 'General',  num: '8',  min: 2760,    max: 3190,    baseMin: 1437.91, baseMax: 3190.00 },
    { tabla: 'General',  num: '9',  min: 3190,    max: 3620,    baseMin: 1519.61, baseMax: 3620.00 },
    { tabla: 'General',  num: '10', min: 3620,    max: 4050,    baseMin: 1601.31, baseMax: 4050.00 },
    { tabla: 'General',  num: '11', min: 4050,    max: 6000,    baseMin: 1732.03, baseMax: 5101.20 },
    { tabla: 'General',  num: '12', min: 6000,    max: Infinity, baseMin: 1928.10, baseMax: 5101.20 },
  ];

  const RETA = {
    tramos: TRAMOS_RETA,
    // CC 28,30 + CP 1,30 + cese 0,90 + FP 0,10 + MEI 0,90
    tipo: 0.315,
    desglose: { cc: 0.283, cp: 0.013, cese: 0.009, fp: 0.001, mei: 0.009 },
    deduccionGastosGenericos: 0.07,      // persona física
    deduccionGastosGenericosSoc: 0.03,   // societarios / art. 305.2 b) y e) LGSS
    tarifaPlana: 80,                     // €/mes 12 meses (art. 38 ter LETA)
    baseMinSocietario: 1424.40,          // mínima en la regularización 2026
    baseMaxima: 5101.20,
  };

  // Rendimiento computable anual = rendimiento neto + cuotas pagadas, menos 7 % (3 % societarios)
  function rendimientoComputableReta(rdtoNetoAnual, cuotasPagadasAnual, societario) {
    const base = Math.max(0, (rdtoNetoAnual || 0) + (cuotasPagadasAnual || 0));
    const ded = societario ? RETA.deduccionGastosGenericosSoc : RETA.deduccionGastosGenericos;
    return base * (1 - ded);
  }
  function tramoReta(rdtoMensual) {
    const r = Math.max(0, rdtoMensual || 0);
    // Límites del BOE: "más de X y hasta Y" (salvo R3/1 en 1.166,70)
    for (const t of TRAMOS_RETA) {
      if (t.num === 'R3' ? r < t.max : r <= t.max) {
        if (r >= t.min || t.min === 0) return t;
      }
    }
    return TRAMOS_RETA[TRAMOS_RETA.length - 1];
  }
  function cuotaReta(base) { return round2((base || 0) * RETA.tipo); }

  /* ---------------- Régimen General ---------------- */
  const RG = {
    basesMinMensuales: { 1: 1989.30, 2: 1649.70, 3: 1435.20, 4: 1424.40, 5: 1424.40, 6: 1424.40, 7: 1424.40 },
    baseMinDiaria: 47.48,   // grupos 8 a 11
    baseMaxDiaria: 170.04,
    baseMaxima: 5101.20,
    empresa: { cc: 0.236, desempleoIndef: 0.055, desempleoTemp: 0.067, fogasa: 0.002, fp: 0.006, mei: 0.0075, atep: 0.015 },
    trabajador: { cc: 0.047, desempleoIndef: 0.0155, desempleoTemp: 0.016, fp: 0.001, mei: 0.0015 },
    // Cotización adicional de solidaridad (art. 17 Orden) sobre el exceso de la base máxima
    solidaridad: [
      { desde: 5101.20, hasta: 5611.32, tipo: 0.0115, empresa: 0.0096, trabajador: 0.0019 },
      { desde: 5611.32, hasta: 7651.80, tipo: 0.0125, empresa: 0.0104, trabajador: 0.0021 },
      { desde: 7651.80, hasta: Infinity, tipo: 0.0146, empresa: 0.0122, trabajador: 0.0024 },
    ],
  };
  function solidaridadMensual(retribucionMensual) {
    let emp = 0, trab = 0;
    for (const t of RG.solidaridad) {
      if (retribucionMensual > t.desde) {
        const tramo = Math.min(retribucionMensual, t.hasta) - t.desde;
        emp += tramo * t.empresa; trab += tramo * t.trabajador;
      }
    }
    return { empresa: emp, trabajador: trab };
  }

  /* ---------------- SMI ---------------- */
  const SMI = { mensual: 1221, pagas: 14, anual: 17094 };

  /* ---------------- IRPF ---------------- */
  // Escala general (estatal + autonómica tipo, la misma que usa la escala de retenciones art. 85 RIRPF).
  // Cada comunidad tiene su propia escala autonómica: el resultado es orientativo.
  const ESCALA_GENERAL = [
    [12450, 0.19], [20200, 0.24], [35200, 0.30], [60000, 0.37], [300000, 0.45], [Infinity, 0.47],
  ];
  // Escala del ahorro desde 2025 (Ley 7/2024)
  const ESCALA_AHORRO = [
    [6000, 0.19], [50000, 0.21], [200000, 0.23], [300000, 0.27], [Infinity, 0.30],
  ];
  function aplicarEscala(base, escala) {
    let cuota = 0, prev = 0;
    const b = Math.max(0, base || 0);
    for (const [limite, tipo] of escala) {
      if (b <= prev) break;
      cuota += (Math.min(b, limite) - prev) * tipo;
      prev = limite;
    }
    return cuota;
  }
  const MINIMOS = {
    personal: 5550, mayor65: 1150, mayor75: 1400,
    descendientes: [2400, 2700, 4000, 4500], menor3: 2800,
    discapacidad33: 3000, discapacidad65: 9000, asistencia: 3000,
  };
  function minimoPersonalFamiliar(o) {
    o = o || {};
    let m = MINIMOS.personal;
    if (o.edad >= 65) m += MINIMOS.mayor65;
    if (o.edad >= 75) m += MINIMOS.mayor75;
    const hijos = parseInt(o.hijos || 0, 10);
    // Si hay dos progenitores declarando, el mínimo por descendientes se prorratea al 50 %
    const factorHijos = o.hijosCompartidos ? 0.5 : 1;
    for (let i = 0; i < hijos; i++) m += MINIMOS.descendientes[Math.min(i, 3)] * factorHijos;
    m += (parseInt(o.menores3 || 0, 10)) * MINIMOS.menor3 * factorHijos;
    if (o.discapacidad === 33) m += MINIMOS.discapacidad33;
    if (o.discapacidad === 65) m += MINIMOS.discapacidad65 + MINIMOS.asistencia;
    return m;
  }
  // Cuota íntegra = escala(base) − escala(mínimo personal y familiar)
  function cuotaIRPF(baseLiquidable, minimo) {
    return Math.max(0, aplicarEscala(baseLiquidable, ESCALA_GENERAL) - aplicarEscala(Math.min(minimo, Math.max(0, baseLiquidable)), ESCALA_GENERAL));
  }
  function cuotaAhorro(base) { return aplicarEscala(base, ESCALA_AHORRO); }

  // Reducción por obtención de rendimientos del trabajo (art. 20 LIRPF, desde 2024)
  function reduccionTrabajo(rendimientoNeto) {
    const rn = rendimientoNeto;
    if (rn <= 14852) return 7302;
    if (rn <= 17673.52) return Math.max(0, 7302 - 1.75 * (rn - 14852));
    if (rn <= 19747.5) return Math.max(0, 2364.34 - 1.5 * (rn - 17673.52));
    return 0;
  }
  // Deducción RDL 5/2026 para rendimientos del trabajo cercanos al SMI
  function deduccionSMI(rendimientosIntegrosTrabajo) {
    const ri = rendimientosIntegrosTrabajo;
    if (ri <= SMI.anual) return 590.89;
    if (ri >= 20048.45) return 0;
    return Math.max(0, 590.89 - 0.2 * (ri - SMI.anual));
  }

  /* IRPF anual de un asalariado (declaración) */
  function irpfAsalariadoAnual(brutoAnual, cotizacionesAnuales, familia) {
    const rnPrevio = Math.max(0, brutoAnual - cotizacionesAnuales - 2000);
    const red = reduccionTrabajo(brutoAnual - cotizacionesAnuales);
    const base = Math.max(0, rnPrevio - red);
    const cuota = cuotaIRPF(base, minimoPersonalFamiliar(familia));
    return Math.max(0, cuota - deduccionSMI(brutoAnual));
  }
  /* IRPF anual de un autónomo sobre su rendimiento neto (ya descontada cuota SS) */
  function irpfActividadAnual(rendimientoNeto, familia) {
    return cuotaIRPF(Math.max(0, rendimientoNeto), minimoPersonalFamiliar(familia));
  }

  /* Tipo de retención en nómina (procedimiento art. 82-86 RIRPF, simplificado) */
  // Límites excluyentes de retención (art. 81 RIRPF). situacion: 1 = monoparental, 2 = cónyuge sin rentas >1.500 €, 3 = resto
  const LIMITES_RETENCION = {
    1: [null, 17644, 18694],
    2: [17197, 18130, 19262],
    3: [15876, 16342, 16867],
  };
  function tipoRetencionNomina(brutoAnual, cotizacionesAnuales, o) {
    o = o || {};
    const sit = o.situacion || 3;
    const hijos = parseInt(o.hijos || 0, 10);
    const lim = LIMITES_RETENCION[sit][Math.min(hijos, 2)] || LIMITES_RETENCION[3][Math.min(hijos, 2)];
    if (brutoAnual <= lim) return 0;
    const rn = brutoAnual - cotizacionesAnuales;
    const base = Math.max(0, rn - 2000 - reduccionTrabajo(rn));
    const minimo = minimoPersonalFamiliar({ edad: o.edad, hijos, menores3: o.menores3, discapacidad: o.discapacidad, hijosCompartidos: o.hijosCompartidos });
    let cuota = Math.max(0, aplicarEscala(base, ESCALA_GENERAL) - aplicarEscala(Math.min(minimo, base), ESCALA_GENERAL));
    // Límite: la retención no puede superar el 43 % del exceso sobre el límite excluyente
    cuota = Math.min(cuota, 0.43 * (brutoAnual - lim));
    const tipo = brutoAnual > 0 ? cuota / brutoAnual : 0;
    return Math.max(0, Math.round(tipo * 10000) / 10000); // redondeo a 2 decimales en %
  }

  /* ---------------- Impuesto sobre Sociedades ---------------- */
  // Microempresa: INCN < 1 M€ (dos tramos). ERD: INCN < 10 M€.
  const IS = {
    2025: { micro: [0.21, 0.22], erd: 0.24, general: 0.25, nuevaCreacion: 0.15 },
    2026: { micro: [0.19, 0.21], erd: 0.23, general: 0.25, nuevaCreacion: 0.15 },
    2027: { micro: [0.17, 0.20], erd: 0.22, general: 0.25, nuevaCreacion: 0.15 },
    2028: { micro: [0.17, 0.20], erd: 0.21, general: 0.25, nuevaCreacion: 0.15 },
    2029: { micro: [0.17, 0.20], erd: 0.20, general: 0.25, nuevaCreacion: 0.15 },
  };
  function tiposIS(ejercicio) {
    const y = parseInt(ejercicio, 10);
    if (IS[y]) return IS[y];
    return y > 2029 ? IS[2029] : IS[2025];
  }
  function cuotaISMicro(base, ejercicio) {
    const t = tiposIS(ejercicio).micro;
    const b = Math.max(0, base);
    return Math.min(b, 50000) * t[0] + Math.max(0, b - 50000) * t[1];
  }

  /* ---------------- Recargos e intereses (LGT) ---------------- */
  const INTERES_DEMORA = 0.040625;
  const INTERES_LEGAL = 0.0325;
  // Art. 27.2 LGT (Ley 11/2021): 1 % + 1 % por cada mes completo; a partir de 12 meses, 15 % + intereses
  function recargoExtemporaneo(dias) {
    const meses = Math.floor((dias || 0) / 30.4375);
    if (dias > 365) return { pct: 0.15, intereses: true, meses };
    return { pct: Math.min(0.15, 0.01 + 0.01 * meses), intereses: false, meses };
  }

  /* ---------------- Plazos ---------------- */
  const PLAZOS = {
    trimestral: { '1T': '20 de abril', '2T': '20 de julio', '3T': '20 de octubre', '4T': '30 de enero' }, // 303 y 130
    retenciones: { '1T': '20 de abril', '2T': '20 de julio', '3T': '20 de octubre', '4T': '20 de enero' }, // 111 y 115
  };

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  const API = {
    ejercicio: 2026, revisado: '2026-10-09',
    RETA, rendimientoComputableReta, tramoReta, cuotaReta,
    RG, solidaridadMensual, SMI,
    ESCALA_GENERAL, ESCALA_AHORRO, aplicarEscala, MINIMOS, minimoPersonalFamiliar,
    cuotaIRPF, cuotaAhorro, reduccionTrabajo, deduccionSMI,
    irpfAsalariadoAnual, irpfActividadAnual, tipoRetencionNomina, LIMITES_RETENCION,
    IS, tiposIS, cuotaISMicro,
    INTERES_DEMORA, INTERES_LEGAL, recargoExtemporaneo, PLAZOS,
    round2,
  };
  global.NA2026 = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
