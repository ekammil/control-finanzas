/* Control de Finanzas — cálculos (saldos, sobres, periodos, gráficas) */
(function () {
  const App = window.App;

  const ordenar = (movs) => movs.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.creado - b.creado));
  const c2 = (x) => Math.max(0, Math.ceil(x * 100 - 1e-6) / 100);

  /* Motor: aplica movimientos uno por uno sobre un estado de saldos */
  function motor() {
    const S = App.state;
    const cuentas = {}; const partes = {};
    S.cuentas.forEach((c) => { cuentas[c.id] = 0; if (c.partes) partes[c.id] = { b: 0, m: 0 }; });
    const esp = {}; S.espacios.forEach((e) => { esp[e.id] = 0; });
    const sob = {}; const sobEsp = {}; const tarjetaDe = {};
    S.espacios.forEach((e) => e.sobres.forEach((s) => {
      sob[s.id] = 0; sobEsp[s.id] = e.id;
      if (s.tipo === 'tarjeta') tarjetaDe[e.id + '|' + s.cuenta] = s.id;
    }));
    const exc = {}; // lo que cada sobre se pasó y salió de lo libre (sin cubrir todavía)
    const libreDe = (eid) => esp[eid] - Object.keys(sob).reduce((t2, k) => t2 + (sobEsp[k] === eid ? sob[k] : 0), 0);
    const valido = (espId, sobreId) => sobreId && sob[sobreId] !== undefined && sobEsp[sobreId] === espId;
    const parte = (id, sub, v) => { if (partes[id]) partes[id][sub === 'm' ? 'm' : 'b'] += v; };

    function aplicar(m, w) {
      const v = Number(m.monto) || 0;
      const t = m.tipo;
      if (t === 'gasto' || t === 'ingreso' || t === 'inicial' || t === 'ajuste') {
        const delta = (t === 'gasto' ? -1 : 1) * v;
        if (cuentas[m.cuenta] !== undefined) { cuentas[m.cuenta] += delta; parte(m.cuenta, m.sub, delta); }
        if (esp[m.espacio] !== undefined) esp[m.espacio] += delta;
        const tId = m.diferido && delta < 0 ? tarjetaDe[m.espacio + '|' + m.cuenta] : null;
        if (tId) {
          // compra (o deuda) a pagar poco a poco: no sale de ningún sobre, se junta después
          sob[tId] += delta;
          if (w) { w.dif(tId, m, -delta); if (t === 'gasto') w.gasto(m, 0, true); w.saldo(tId, m.fecha, sob[tId]); }
        } else if (t === 'gasto' && valido(m.espacio, m.sobre)) {
          const de = Math.min(Math.max(sob[m.sobre], 0), v);
          sob[m.sobre] -= de;
          if (v - de > 0.004) exc[m.sobre] = (exc[m.sobre] || 0) + v - de; // lo que se pasó sale de lo libre
          if (w) { w.gasto(m, v - de, false); w.saldo(m.sobre, m.fecha, sob[m.sobre]); }
        } else if (t === 'gasto') {
          if (w) w.gasto(m, 0, false);
        }
        // si con este dinero lo libre ya no está en negativo, lo que te pasaste ya quedó cubierto
        if (delta > 0 && esp[m.espacio] !== undefined && libreDe(m.espacio) >= -0.004) Object.keys(exc).forEach((k) => { if (sobEsp[k] === m.espacio) exc[k] = 0; });
        if (t === 'ingreso' && w) w.ingreso(m);
        return;
      }
      if (t === 'traspaso') {
        if (cuentas[m.cuenta] !== undefined) { cuentas[m.cuenta] -= v; parte(m.cuenta, m.sub, -v); }
        if (cuentas[m.cuenta2] !== undefined) { cuentas[m.cuenta2] += v; parte(m.cuenta2, m.sub2, v); }
        return;
      }
      if (t === 'mover') {
        const libreAntes = (exc[m.sobre2] || 0) > 0.004 && esp[m.espacio2] !== undefined ? libreDe(m.espacio2) : 0;
        if (esp[m.espacio] !== undefined) esp[m.espacio] -= v;
        if (esp[m.espacio2] !== undefined) esp[m.espacio2] += v;
        if (valido(m.espacio, m.sobre)) {
          const s = App.sobre(m.espacio, m.sobre);
          const sale = s && s.tipo === 'tarjeta' ? v : Math.min(Math.max(sob[m.sobre], 0), v);
          sob[m.sobre] -= sale;
          // lo que sacas a mano de un pago con fecha se tiene que volver a juntar antes del pago
          if (w && sale > 0.004 && m.origen !== 'auto') w.retiro(m.sobre, m, sale);
          if (w) w.saldo(m.sobre, m.fecha, sob[m.sobre]);
        }
        if (valido(m.espacio2, m.sobre2)) {
          // si a este sobre ya te pasaste y eso dejó lo libre en negativo, lo que muevas desde otro sobre
          // (u otro espacio) primero cubre ese exceso; lo que quede sí entra al sobre
          let cubre = 0;
          if ((exc[m.sobre2] || 0) > 0.004 && (valido(m.espacio, m.sobre) || m.espacio !== m.espacio2)) {
            cubre = Math.max(0, Math.min(v, exc[m.sobre2], -libreAntes));
            exc[m.sobre2] -= cubre;
          }
          sob[m.sobre2] += v - cubre;
          if (w) { if (v - cubre > 0.004) w.apartado(m.sobre2, m, v - cubre); if (cubre > 0.004) w.cubre(m.sobre2, m, cubre); w.saldo(m.sobre2, m.fecha, sob[m.sobre2]); }
        }
      }
    }
    return { cuentas, partes, esp, sob, sobEsp, aplicar, exc };
  }

  const esTarj = (s) => s && s.tipo === 'tarjeta';
  const valorSobre = (s, v) => (esTarj(s) ? v : Math.max(0, v));

  /* Disponible = libre + sobres marcados "disponible", solo en espacios que cuentan para disponible */
  function resumir(E) {
    const S = App.state;
    let total = 0, disponible = 0, ahorro = 0, deudaTarjeta = 0, porJuntar = 0;
    S.cuentas.forEach((c) => {
      const v = E.cuentas[c.id] || 0;
      total += v;
      if (App.esCredito(c) && v < 0) deudaTarjeta -= v;
    });
    S.espacios.forEach((e) => {
      let noDisp = 0;
      e.sobres.forEach((s) => {
        const v = valorSobre(s, E.sob[s.id] || 0);
        if (s.tipo === 'ahorro' || s.tipo === 'porIngreso') ahorro += v;
        if (esTarj(s) && v < 0) porJuntar -= v;
        if (!s.disponible) noDisp += v;
      });
      if (e.enDisponible) disponible += (E.esp[e.id] || 0) - noDisp;
    });
    // lo que falta juntar de la tarjeta no se resta de "Apartado": se muestra aparte como deuda
    return { total: U.r2(total), disponible: U.r2(disponible), ahorro: U.r2(ahorro), apartado: U.r2(total - disponible - ahorro + porJuntar), deudaTarjeta: U.r2(deudaTarjeta), porJuntar: U.r2(porJuntar) };
  }

  /* ---------- libro por sobre: qué pasó y cuándo ---------- */
  const sumar = (L, campo, desde, hasta) => {
    if (!L) return 0;
    let t = 0;
    for (let i = 0; i < L.ev.length; i++) { const e = L.ev[i]; if (e.f >= desde && e.f < hasta && e[campo]) t += e[campo]; }
    return t;
  };
  const saldoAntesDe = (L, fecha) => {
    if (!L) return 0;
    let v = 0;
    for (let i = 0; i < L.sal.length; i++) { if (L.sal[i][0] < fecha) v = L.sal[i][1]; else break; }
    return v;
  };
  const saldoFinal = (L) => (L && L.sal.length ? L.sal[L.sal.length - 1][1] : 0);
  const esManual = (s) => s.aporteManual !== '' && s.aporteManual !== null && s.aporteManual !== undefined && !isNaN(parseFloat(s.aporteManual));
  App.esManual = esManual;

  /* Ciclo de pago actual de un sobre de gasto: del día siguiente al pago anterior hasta el próximo pago */
  App.cicloSobre = (s, ref) => {
    const fP = U.frec(s.frecPago);
    if (s.fechaPago) {
      // el primer pago es la fecha que pusiste: no hay pagos antes de ella
      const k = Math.max(U.vencIndice(fP, s.fechaPago, ref), U.vencIndice(fP, s.fechaPago, s.fechaPago));
      const venc = U.venc(fP, s.fechaPago, k);
      return { ini: U.addDays(U.venc(fP, s.fechaPago, k - 1), 1), fin: U.addDays(venc, 1), venc };
    }
    const c = U.periodo(fP, ref);
    return { ini: c.ini, fin: c.fin, venc: U.addDays(c.fin, -1) };
  };
  /* Último día del ciclo que ya terminó antes de "hoy" */
  App.finCicloAnterior = (s, hoy) => U.addDays(App.cicloSobre(s, hoy).ini, -1);

  /* Plan de un sobre: cuánto apartar en este periodo de aporte y cuánto falta */
  App.planSobre = (s, L, ref) => {
    const fA = U.frec(s.frecAporte || App.state.ajustes.frecIngreso);
    const P = U.periodo(fA, ref);
    const o = { frecAporte: fA, cuota: 0, falta: 0, cubierto: 0, venc: '', cIni: '', cFin: '', M: 0, T: 0, constante: 0, gastadoCiclo: 0, ventana: P, pagado: 0, compras: 0 };
    const cub = (a, b) => sumar(L, 'ap', a, b) + sumar(L, 'ex', a, b) - (s.fechaPago && (s.tipo === 'gasto' || s.tipo === 'limite') ? sumar(L, 'rt', a, b) : 0);
    const manual = esManual(s) ? Math.max(0, parseFloat(s.aporteManual)) : null;

    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      const fP = U.frec(s.frecPago);
      const M = Number(s.cuota) || 0;
      const ciclo = App.cicloSobre(s, ref);
      o.M = M; o.cIni = ciclo.ini; o.cFin = ciclo.venc; o.venc = ciclo.venc;
      o.gastadoCiclo = sumar(L, 'g', ciclo.ini, ciclo.fin);
      o.constante = U.convertir(M, fP, fA);
      // un sobre nuevo (sin fecha de pago) solo necesita la parte que queda de su primer periodo
      const prorrateo = (ini, fin) => (!s.fechaPago && s.creado && s.creado > ini && s.creado < fin ? U.daysBetween(s.creado, fin) / U.daysBetween(ini, fin) : 1);
      // presupuesto de este ciclo: completo, salvo el primero si el sobre se creó a la mitad
      o.Mc = U.r2(M * prorrateo(ciclo.ini, ciclo.fin));
      if (manual !== null) {
        o.cuota = manual; o.ventana = P; o.T = M;
      } else if (U.FREC_DIAS[fA] >= U.FREC_DIAS[fP] - 0.01) {
        // cada aporte cubre uno o varios pagos completos
        let k = 0;
        if (s.fechaPago) {
          // solo pagos desde la fecha que pusiste (y desde que existe el sobre): los de antes ya no tocan
          const inicio = [P.ini, s.fechaPago, s.creado || ''].sort().pop();
          let i = U.vencIndice(fP, s.fechaPago, inicio);
          while (U.venc(fP, s.fechaPago, i) < P.fin && k < 400) { k++; i++; }
        } else {
          // gastos sin fecha: se aparta por adelantado cada periodo que empieza dentro de este aporte
          let d = U.periodo(fP, P.ini);
          if (d.ini < P.ini) d = U.periodo(fP, d.fin);
          for (let g = 0; g < 400 && d.ini < P.fin; g++) { k++; d = U.periodo(fP, d.fin); }
        }
        // con fecha: solo los pagos que caen en este periodo (si no cae ninguno, no se aparta para no juntar doble)
        let T = M * (s.fechaPago ? k : Math.max(1, k)) * prorrateo(P.ini, P.fin);
        if (s.tipo === 'limite') T = Math.max(0, T - Math.max(0, saldoAntesDe(L, P.ini)));
        o.T = T; o.cuota = c2(T); o.ventana = P;
      } else {
        // varios aportes por cada pago: se reparte lo que falta entre los aportes que quedan
        const pI = P.ini > ciclo.ini ? P.ini : ciclo.ini;
        const pF = P.fin < ciclo.fin ? P.fin : ciclo.fin;
        let T = M * prorrateo(ciclo.ini, ciclo.fin);
        if (s.tipo === 'limite') T = Math.max(0, T - Math.max(0, saldoAntesDe(L, ciclo.ini)));
        const antes = cub(ciclo.ini, pI);
        const n = Math.max(1, U.contarPeriodos(fA, pI, ciclo.venc));
        o.T = T; o.cuota = c2(Math.max(0, T - antes) / n); o.ventana = { ini: pI, fin: pF };
      }
    } else if (s.tipo === 'ahorro') {
      let cuota = Number(s.cuota) || 0;
      if (s.meta > 0 && s.hasta && s.hasta >= P.ini) {
        const resta = s.meta - Math.max(0, saldoAntesDe(L, P.ini));
        cuota = c2(Math.max(0, resta) / Math.max(1, U.contarPeriodos(fA, P.ini, s.hasta)));
        o.venc = s.hasta;
      }
      o.cuota = cuota; o.constante = cuota;
      o.cubierto = sumar(L, 'ap', P.ini, P.fin);
      o.falta = cuota - o.cubierto;
      if (s.meta > 0) o.falta = Math.min(o.falta, s.meta - saldoFinal(L));
      o.falta = U.r2(Math.max(0, o.falta));
      return o;
    } else if (s.tipo === 'deuda') {
      o.pagado = sumar(L, 'pg', '0000-00-00', '9999-12-31');
      if (s.hasta && s.meta > 0) {
        o.venc = s.hasta;
        if (s.desde && s.desde >= P.fin) o.cuota = 0;
        else {
          const pI = s.desde && s.desde > P.ini ? s.desde : P.ini;
          const n = pI > s.hasta ? 0 : U.contarPeriodos(fA, pI, s.hasta);
          const resta = Math.max(0, s.meta - sumar(L, 'pg', '0000-00-00', P.ini) - Math.max(0, saldoAntesDe(L, P.ini)));
          o.cuota = n > 0 ? c2(resta / n) : 0;
          o.n = n;
        }
      }
      if (manual !== null) o.cuota = manual;
      o.constante = o.cuota;
    } else if (s.tipo === 'tarjeta') {
      const compras = L ? L.ev.filter((e) => e.dif) : [];
      const plan = [];
      compras.forEach((e) => App.cuotasTarjeta(s.cuenta, e.f, e.dif, e.meses).forEach((x) => plan.push(x)));
      plan.sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
      const total = compras.reduce((t, e) => t + e.dif, 0);
      const antes = compras.filter((e) => e.f < P.ini).reduce((t, e) => t + e.dif, 0);
      const juntado = saldoAntesDe(L, P.ini) + antes;
      let R = 0, cuota = 0;
      plan.forEach((x) => {
        R += x.a;
        if (R - juntado > 0.004) {
          if (!o.venc) o.venc = x.f;
          const n = x.f < P.ini ? 1 : Math.max(1, U.contarPeriodos(fA, P.ini, x.f));
          cuota = Math.max(cuota, (R - juntado) / n);
        }
      });
      o.cuota = c2(Math.min(cuota, Math.max(0, total - juntado)));
      o.constante = o.cuota; o.compras = U.r2(total);
      o.cubierto = sumar(L, 'ap', P.ini, P.fin);
      o.falta = U.r2(Math.max(0, Math.min(o.cuota - o.cubierto, -saldoFinal(L))));
      return o;
    } else {
      o.cuota = Number(s.cuota) || 0; o.constante = o.cuota;
      return o;
    }
    o.cubierto = cub(o.ventana.ini, o.ventana.fin);
    o.falta = U.r2(Math.max(0, o.cuota - o.cubierto));
    return o;
  };

  /* ---------- Lo que un sobre necesita de aquí a tu próximo cobro ----------
     El dinero que entra hoy tiene que alcanzar hasta que vuelvas a cobrar: se aparta lo que falta de
     este periodo y lo de los periodos que empiecen antes de tu siguiente cobro. Así no importa
     qué día de la semana o del mes cobres, ni cada cuánto apartes en cada sobre. */
  App.finHorizonte = (fecha) => {
    const f = U.frec(App.state.ajustes.frecIngreso);
    if (f === 'diario') return U.addDays(fecha, 1);
    if (f === 'semanal') return U.addDays(fecha, 7);
    const ultimoDelMes = U.addDays(fecha, 1).slice(8) === '01';
    if (f === 'quincenal') {
      // la quincena se cobra el 15 y el último día del mes
      const dia = Number(fecha.slice(8));
      if (dia < 15) return fecha.slice(0, 8) + '15';
      if (!ultimoDelMes) return U.addDays(U.addMonths(fecha.slice(0, 8) + '01', 1), -1);
      return U.addDays(fecha, 15);
    }
    const meses = { mensual: 1, semestral: 6, anual: 12 }[f];
    // si cobras el último día del mes, el siguiente cobro también es el último día
    if (ultimoDelMes) return U.addDays(U.addMonths(U.addDays(fecha, 1), meses), -1);
    return U.addMonths(fecha, meses);
  };
  // Devuelve { total, por: [[fecha del periodo, monto], ...] }
  App.necesidad = (s, L, fecha, fin) => {
    const r = { total: 0, por: [] };
    if (s.tipo === 'porIngreso') return r;
    L = L || { ev: [], sal: [] };
    fin = fin || App.finHorizonte(fecha);
    const fA = U.frec(s.frecAporte || App.state.ajustes.frecIngreso);
    const Lv = { ev: L.ev.slice(), sal: L.sal.slice() };
    let saldo = saldoFinal(L), ref = fecha;
    for (let g = 0; g < 400; g++) {
      const p = App.planSobre(s, Lv, ref);
      const x = U.r2(Math.max(0, p.falta));
      if (x > 0) { r.total += x; r.por.push([ref, x]); Lv.ev.push({ f: ref, ap: x }); saldo += x; }
      const sig = U.periodo(fA, ref).fin;
      if (sig >= fin) break;
      // al empezar el siguiente periodo: de un "gasto con tope" solo queda lo que no le toca gastar en este
      if (s.tipo === 'limite') {
        const queda = p.Mc !== undefined ? Math.max(0, p.Mc - p.gastadoCiclo) : 0;
        saldo = Math.max(0, saldo - queda);
      }
      Lv.sal.push([U.addDays(sig, -1), saldo]);
      ref = sig;
    }
    r.total = U.r2(r.total);
    return r;
  };
  // reparte un monto entre las partes de una necesidad (primero lo más cercano); lo que sobre cuenta para hoy
  App.porDe = (por, monto, hoy) => {
    const out = []; let resta = U.r2(monto);
    por.forEach(([f, x]) => { const v = U.r2(Math.min(x, resta)); if (v > 0) { out.push([f, v]); resta = U.r2(resta - v); } });
    if (resta > 0) { if (out.length && out[0][0] === hoy) out[0][1] = U.r2(out[0][1] + resta); else out.unshift([hoy, resta]); }
    return out.length > 1 || (out.length === 1 && out[0][0] !== hoy) ? out : null;
  };
  App.porValido = (m, v) => {
    if (!Array.isArray(m.por) || !m.por.length) return null;
    const t = m.por.reduce((a, p) => a + (Number(p[1]) || 0), 0);
    return Math.abs(t - v) < 0.02 ? m.por : null;
  };

  /* "Por cada ingreso": una cantidad fija o un porcentaje de lo que entra */
  App.montoPorIngreso = (s, ingreso) => (Number(s.pct) > 0 ? U.r2((Number(ingreso) || 0) * Number(s.pct) / 100) : Number(s.cuota) || 0);
  App.txtPorIngreso = (s) => (Number(s.pct) > 0 ? s.pct + '% de cada ingreso' : U.money0(s.cuota) + ' por cada ingreso');

  /* Texto corto del aporte: "$13.15 cada día" */
  App.textoAporte = (s, st) => {
    if (s.tipo === 'porIngreso') return App.txtPorIngreso(s);
    const f = st ? st.frecAporte : U.frec(s.frecAporte || App.state.ajustes.frecIngreso);
    const v = st ? (s.tipo === 'gasto' || s.tipo === 'limite' ? (App.esManual(s) ? st.cuota : st.constante) : st.cuota) : 0;
    // si en este periodo se aparta distinto de lo normal (primer pago cerca, semana empezada), se dice
    if (st && (s.tipo === 'gasto' || s.tipo === 'limite') && !App.esManual(s) && st.falta > 0 && Math.abs(st.cuota - st.constante) > 0.5) {
      return U.money(st.cuota) + ' ' + U.FREC_CADA[f] + ' por ahora (lo normal: ' + U.money(v) + ')';
    }
    return U.money(v) + ' ' + U.FREC_CADA[f];
  };

  /* Estado completo a una fecha (por defecto hoy) */
  App.calc = (ref) => {
    const S = App.state;
    ref = ref || U.today();
    const ini = U.weekStart(ref);
    const fin = U.addDays(ini, 7);
    const E = motor();
    const L = {};
    const st = {};
    S.espacios.forEach((e) => e.sobres.forEach((s) => {
      L[s.id] = { ev: [], sal: [] };
      st[s.id] = { saldoAntes: 0, gastadoSemana: 0, apartadoSemana: 0, excesoSemana: 0 };
    }));
    const espSemana = {}; S.espacios.forEach((e) => { espSemana[e.id] = { gastado: 0, ingresado: 0 }; });
    let fase = 'antes';
    const w = {
      gasto(m, exceso, diferido) {
        const x = st[m.sobre];
        const v = Number(m.monto);
        // lo de tarjeta a pagar poco a poco no cuenta contra el presupuesto de la semana
        if (fase === 'semana' && espSemana[m.espacio] && !diferido) espSemana[m.espacio].gastado += v;
        if (!x || diferido) return;
        if (fase === 'semana') { x.gastadoSemana += v; x.excesoSemana += exceso; }
        const s = App.sobre(m.espacio, m.sobre);
        const ev = { f: m.fecha, g: v, ex: exceso };
        if (s && s.tipo === 'deuda' && (!s.desde || m.fecha >= s.desde)) ev.pg = v;
        L[m.sobre].ev.push(ev);
      },
      ingreso(m) { if (fase === 'semana' && espSemana[m.espacio]) espSemana[m.espacio].ingresado += Number(m.monto); },
      apartado(sobreId, m, v) {
        if (fase === 'semana' && st[sobreId]) st[sobreId].apartadoSemana += v;
        if (!L[sobreId]) return;
        // un reparto puede adelantar dinero de periodos siguientes: cada parte cuenta para su periodo
        const por = App.porValido(m, v);
        if (por) por.forEach((p) => L[sobreId].ev.push({ f: p[0], ap: p[1] }));
        else L[sobreId].ev.push({ f: m.fecha, ap: v });
      },
      retiro(sobreId, m, v) { if (L[sobreId]) L[sobreId].ev.push({ f: m.fecha, rt: v }); },
      cubre(sobreId, m, v) { if (st[sobreId]) st[sobreId].cubiertoSemana = (st[sobreId].cubiertoSemana || 0) + v; },
      dif(sobreId, m, v) { if (L[sobreId]) L[sobreId].ev.push({ f: m.fecha, dif: v, meses: m.meses || 1 }); },
      saldo(sobreId, f, v) {
        const l = L[sobreId]; if (!l) return;
        const u = l.sal[l.sal.length - 1];
        if (u && u[0] === f) u[1] = v; else l.sal.push([f, v]);
      }
    };
    const movs = ordenar(S.movs.filter((m) => m.fecha <= ref));
    let i = 0;
    for (; i < movs.length && movs[i].fecha < ini; i++) E.aplicar(movs[i], w);
    Object.keys(st).forEach((k) => { st[k].saldoAntes = E.sob[k]; });
    fase = 'semana';
    for (; i < movs.length; i++) E.aplicar(movs[i], w);

    const sobOut = {};
    const espOut = {};
    S.espacios.forEach((e) => {
      let enSobres = 0, presupuesto = 0, falta = 0;
      e.sobres.forEach((s) => {
        const x = st[s.id];
        const saldo = U.r2(E.sob[s.id]);
        enSobres += valorSobre(s, saldo);
        const p = App.planSobre(s, L[s.id], ref);
        let estado = 'ok', progreso = 0;
        if (s.tipo === 'gasto' || s.tipo === 'limite') {
          if (s.fechaPago) {
            progreso = p.M > 0 ? (Math.max(0, saldo) + p.gastadoCiclo) / p.M : 0;
            estado = p.M > 0 && p.gastadoCiclo > p.M + 0.005 ? 'pasado' : p.falta > 0 ? 'cuidado' : 'ok';
          } else {
            progreso = p.Mc > 0 ? p.gastadoCiclo / p.Mc : (p.gastadoCiclo > 0 ? 1.01 : 0);
            estado = p.gastadoCiclo > p.Mc + 0.005 ? 'pasado' : progreso >= 0.8 ? 'cuidado' : 'ok';
            presupuesto += U.convertir(p.M, s.frecPago, 'semanal');
          }
        } else if (s.tipo === 'deuda') {
          progreso = s.meta > 0 ? (p.pagado + Math.max(0, saldo)) / s.meta : 0;
          estado = p.falta > 0 ? 'cuidado' : 'ok';
        } else if (s.tipo === 'tarjeta') {
          progreso = p.compras > 0 ? 1 - Math.max(0, -saldo) / p.compras : 1;
          estado = p.falta > 0 ? 'cuidado' : 'ok';
        } else {
          progreso = s.meta > 0 ? Math.max(0, saldo) / s.meta : 0;
          estado = p.falta > 0 ? 'cuidado' : 'ok';
        }
        falta += p.falta;
        sobOut[s.id] = Object.assign(p, {
          saldo, saldoAntes: U.r2(x.saldoAntes), gastadoSemana: U.r2(x.gastadoSemana), apartadoSemana: U.r2(x.apartadoSemana),
          excesoSemana: U.r2(x.excesoSemana), pagado: U.r2(p.pagado), cuota: U.r2(p.cuota), gastadoCiclo: U.r2(p.gastadoCiclo), estado, progreso
        });
      });
      const total = U.r2(E.esp[e.id]);
      espOut[e.id] = {
        total, enSobres: U.r2(enSobres), libre: U.r2(total - enSobres),
        gastadoSemana: U.r2(espSemana[e.id].gastado), ingresadoSemana: U.r2(espSemana[e.id].ingresado),
        presupuesto: U.r2(presupuesto), falta: U.r2(falta)
      };
      // lo que cada sobre se pasó y todavía no se cubre (sale de lo libre en negativo)
      e.sobres.forEach((s) => { if (sobOut[s.id]) sobOut[s.id].porCubrir = U.r2(Math.min(E.exc[s.id] || 0, Math.max(0, -espOut[e.id].libre))); });
    });
    const cuentas = {}; S.cuentas.forEach((c) => { cuentas[c.id] = U.r2(E.cuentas[c.id]); });
    const partes = {}; Object.keys(E.partes).forEach((k) => { partes[k] = { b: U.r2(E.partes[k].b), m: U.r2(E.partes[k].m) }; });
    return { ref, ini, fin, cuentas, partes, esp: espOut, sob: sobOut, tot: resumir(E), L };
  };

  /* Serie del dinero disponible para la gráfica */
  App.serie = (rango) => {
    const S = App.state;
    const hoy = U.today();
    const dias = rango === 'mes' ? 30 : rango === 'semana' ? 7 : 1;
    const desde = U.addDays(hoy, -(dias - 1));
    const E = motor();
    const movs = ordenar(S.movs.filter((m) => m.fecha <= hoy));
    let i = 0;
    for (; i < movs.length && movs[i].fecha < desde; i++) E.aplicar(movs[i]);
    const puntos = [{ x: 0, v: resumir(E).disponible, label: 'inicio' }];
    if (rango === 'hoy') {
      const minuto = (m) => (m && m.fecha === hoy ? Math.floor(m.creado / 60000) : -1);
      for (; i < movs.length; i++) {
        E.aplicar(movs[i]);
        // un solo punto por minuto: un ingreso y su reparto no dibujan picos
        if (i + 1 < movs.length && minuto(movs[i + 1]) === minuto(movs[i])) continue;
        const d = new Date(movs[i].creado);
        const frac = movs[i].fecha === hoy ? (d.getHours() * 60 + d.getMinutes()) / 1440 : 0;
        puntos.push({ x: frac, v: resumir(E).disponible });
      }
      const n = new Date();
      puntos.push({ x: (n.getHours() * 60 + n.getMinutes()) / 1440, v: resumir(E).disponible, label: 'ahora' });
      return { puntos, max: 1 };
    }
    for (let d = 0; d < dias; d++) {
      const f = U.addDays(desde, d);
      for (; i < movs.length && movs[i].fecha <= f; i++) E.aplicar(movs[i]);
      puntos.push({ x: d + 1, v: resumir(E).disponible, label: f });
    }
    return { puntos, max: dias };
  };

  /* Ingresos y gastos netos en un rango (solo espacios que cuentan para disponible) */
  App.flujo = (desde, hasta) => {
    const S = App.state;
    const ok = {}; S.espacios.forEach((e) => { ok[e.id] = e.enDisponible; });
    let ing = 0, gas = 0;
    S.movs.forEach((m) => {
      if (m.fecha < desde || m.fecha > hasta || !ok[m.espacio]) return;
      if (m.tipo === 'ingreso') ing += Number(m.monto);
      if (m.tipo === 'gasto') gas += Number(m.monto);
    });
    return { ing: U.r2(ing), gas: U.r2(gas), neto: U.r2(ing - gas) };
  };

  App.comparar = (rango) => {
    const hoy = U.today();
    const dias = rango === 'mes' ? 30 : rango === 'semana' ? 7 : 1;
    const a = App.flujo(U.addDays(hoy, -(dias - 1)), hoy);
    const b = App.flujo(U.addDays(hoy, -(2 * dias - 1)), U.addDays(hoy, -dias));
    return { actual: a, anterior: b };
  };

  /* Barras de la semana (lunes a domingo) */
  App.barrasSemana = () => {
    const ini = U.weekStart(U.today());
    const out = [];
    for (let d = 0; d < 7; d++) {
      const f = U.addDays(ini, d);
      out.push(Object.assign({ fecha: f }, App.flujo(f, f)));
    }
    return out;
  };

  /* Resumen de una semana ya terminada */
  App.resumenSemana = (ini) => {
    const fin = U.addDays(ini, 6);
    const c = App.calc(fin);
    const S = App.state;
    const f = App.flujo(ini, fin);
    const sobres = [];
    S.espacios.forEach((e) => e.sobres.forEach((s) => {
      const x = c.sob[s.id];
      if ((s.tipo === 'gasto' || s.tipo === 'limite') && (x.gastadoSemana > 0 || x.M > 0)) {
        const planeado = !s.fechaPago && U.frec(s.frecPago) === 'semanal' ? x.Mc : 0;
        sobres.push({ s, e, x, planeado });
      }
    }));
    const top = sobres.filter((o) => o.x.gastadoSemana > 0).sort((a, b) => b.x.gastadoSemana - a.x.gastadoSemana).slice(0, 3);
    const pasados = sobres.filter((o) => o.x.estado === 'pasado');
    let ahorrado = 0;
    S.espacios.forEach((e) => e.sobres.forEach((s) => { if (s.tipo === 'ahorro' || s.tipo === 'porIngreso') ahorrado += c.sob[s.id].apartadoSemana; }));
    return { ini, fin, flujo: f, top, pasados, total: sobres.length, ahorrado: U.r2(ahorrado) };
  };

  /* Pagos recurrentes: siguiente fecha */
  App.siguienteFecha = (r, desde) => {
    desde = desde || U.today();
    const d = U.parse(desde);
    if (r.frecuencia === 'semanal') {
      const delta = ((Number(r.diaSemana) || 0) - U.dow(desde) + 7) % 7;
      return U.addDays(desde, delta);
    }
    const ultimoDia = (y, mo) => new Date(y, mo + 1, 0).getDate();
    const candidatos = [];
    for (let k = 0; k < 3; k++) {
      const y = d.getFullYear(), mo = d.getMonth() + k;
      const fecha = (dia) => { const yy = new Date(y, mo, 1).getFullYear(), mm = new Date(y, mo, 1).getMonth(); return U.ymd(new Date(yy, mm, Math.min(dia, ultimoDia(yy, mm)), 12)); };
      if (r.frecuencia === 'quincenal') { candidatos.push(fecha(15)); candidatos.push(fecha(31)); }
      else candidatos.push(fecha(Number(r.dia) || 1));
    }
    return candidatos.filter((f) => f >= desde).sort()[0];
  };

  /* Todo lo que tiene fecha de pago: pagos programados, sobres con fecha, pagos únicos y tarjetas */
  App.proximosPagos = (c) => {
    const S = App.state;
    const hoy = U.today();
    c = c || App.calc();
    const out = [];
    const conRec = {};
    S.recurrentes.forEach((r) => {
      let f = App.siguienteFecha(r, hoy);
      if (r.pagado && r.pagado === f) f = App.siguienteFecha(r, U.addDays(f, 1));
      if (r.sobre) conRec[r.sobre] = true;
      out.push({ tipo: 'rec', r, fecha: f, dias: U.daysBetween(hoy, f) });
    });
    S.espacios.forEach((e) => e.sobres.forEach((s) => {
      const st = c.sob[s.id];
      if ((s.tipo === 'gasto' || s.tipo === 'limite') && s.fechaPago && !conRec[s.id] && s.cuota > 0) {
        let f = U.siguienteVenc(s.frecPago, s.fechaPago, hoy);
        if (s.pagado && s.pagado === f) f = U.siguienteVenc(s.frecPago, s.fechaPago, U.addDays(f, 1));
        out.push({ tipo: 'sobre', r: { id: s.id, nombre: s.nombre, monto: s.cuota, avisar: s.avisar, sobre: s.id, espacio: e.id, frec: s.frecPago }, fecha: f, dias: U.daysBetween(hoy, f) });
      }
      if (s.tipo === 'deuda' && s.hasta && s.hasta >= hoy && !conRec[s.id]) {
        const resta = U.r2(s.meta - (st ? st.pagado : 0));
        if (resta > 0.004) out.push({ tipo: 'deuda', r: { id: s.id, nombre: s.nombre, monto: resta, avisar: 5, sobre: s.id, espacio: e.id }, fecha: s.hasta, dias: U.daysBetween(hoy, s.hasta) });
      }
    }));
    S.cuentas.forEach((ct) => {
      if (!App.esCredito(ct)) return;
      const p = App.pagoTarjeta(ct, c);
      if (!p || p.monto < 0.005) return;
      out.push({ tipo: 'tarjeta', r: { id: ct.id, nombre: 'Tarjeta ' + ct.nombre, monto: p.monto, avisar: ct.avisar === undefined || ct.avisar === '' ? 3 : ct.avisar, cuenta: ct.id, estimado: p.estimado }, fecha: p.fecha, dias: U.daysBetween(hoy, p.fecha) });
    });
    return out.sort((a, b) => a.dias - b.dias);
  };

  /* Cuánto pagar de la tarjeta en su próxima fecha de pago (lo del último corte, sin meses que aún no tocan) */
  App.pagoTarjeta = (ct, c) => {
    const S = App.state;
    const hoy = U.today();
    c = c || App.calc();
    const debe = U.r2(Math.max(0, -(c.cuentas[ct.id] || 0)));
    const dc = parseInt(ct.diaCorte, 10) || 0;
    let fecha = App.proximoPagoTarjeta(ct, hoy);
    if (!fecha || !dc) return fecha ? { fecha, monto: debe, total: debe, estimado: true } : null;
    for (let intento = 0; intento < 2; intento++) {
      const fp = U.parse(fecha);
      const dp = parseInt(ct.diaPago, 10) || 0;
      const mesCorte = dp > dc ? fp.getMonth() : fp.getMonth() - 1;
      const ultimo = new Date(fp.getFullYear(), mesCorte + 1, 0).getDate();
      const corte = U.ymd(new Date(fp.getFullYear(), mesCorte, Math.min(dc, ultimo), 12));
      const yaCorto = corte < hoy;
      const hasta = yaCorto ? corte : hoy;
      let pagos = 0, msiDespues = 0;
      S.movs.forEach((m) => {
        if (yaCorto && m.fecha > corte && m.fecha <= hoy && ((m.tipo === 'traspaso' && m.cuenta2 === ct.id) || (m.tipo === 'ingreso' && m.cuenta === ct.id))) pagos += Number(m.monto);
        if (m.tipo === 'gasto' && m.cuenta === ct.id && m.diferido && (parseInt(m.meses, 10) || 1) > 1 && m.fecha <= hasta) {
          App.cuotasTarjeta(ct.id, m.fecha, Number(m.monto), m.meses).forEach((x) => { if (x.f > fecha) msiDespues += x.a; });
        }
      });
      if (!yaCorto) return { fecha, corte, monto: U.r2(Math.max(0, debe - msiDespues)), total: debe, estimado: true };
      const alCorte = Math.max(0, -(App.calc(corte).cuentas[ct.id] || 0));
      const monto = U.r2(Math.max(0, alCorte - msiDespues - pagos));
      if (monto > 0.004 || intento === 1) return { fecha, corte, monto: monto > 0.004 ? monto : debe, total: debe, estimado: !(monto > 0.004) };
      fecha = App.proximoPagoTarjeta(ct, U.addDays(fecha, 1));
    }
    return null;
  };

  /* Propuesta para acomodar el dinero de un espacio en sus sobres (al empezar) */
  /* Presupuesto de este ciclo en palabras: "$250 esta semana" (o la parte que queda si el sobre es nuevo) */
  App.presupuestoCiclo = (s, st) => {
    const fP = U.frec(s.frecPago);
    const M = s.fechaPago ? st.M : (st.Mc !== undefined ? st.Mc : st.M);
    const parcial = !s.fechaPago && st.Mc !== undefined && st.Mc < st.M - 0.005;
    return { M, parcial, txt: U.money(M) + ' ' + U.FREC_ESTE[fP] + (parcial ? ' (cuenta desde el ' + U.fechaCorta(s.creado) + ')' : '') };
  };

  /* Cuándo vuelves a cobrar, en palabras */
  App.textoCobro = (fin, hoy) => {
    hoy = hoy || U.today();
    const d = U.daysBetween(hoy, fin);
    return d <= 1 ? 'mañana' : d < 7 ? 'el ' + U.DIAS[U.dow(fin)] : 'el ' + U.fechaCorta(fin);
  };

  /* Propuesta para acomodar el dinero que ya tienes: lo que cada sobre necesita hasta tu próximo cobro */
  App.propuestaAcomodo = (espId, c) => {
    const e = App.espacio(espId); if (!e) return [];
    c = c || App.calc();
    const hoy = U.today();
    const fin = App.finHorizonte(hoy);
    const lista = [];
    e.sobres.forEach((s, i) => {
      const st = c.sob[s.id]; if (!st || s.tipo === 'porIngreso') return;
      const n = App.necesidad(s, c.L[s.id], hoy, fin);
      let necesita = n.total; const partes = [];
      const fA = st.frecAporte;
      if (s.tipo === 'gasto' || s.tipo === 'limite') {
        const fP = U.frec(s.frecPago);
        if (s.fechaPago) {
          // si el pago está cerca, propone también lo que ya debería llevar juntado
          const dias = U.daysBetween(st.cIni, st.venc) + 1;
          const llevan = U.clamp(U.daysBetween(st.cIni, hoy) + 1, 1, dias);
          necesita = Math.max(necesita, st.M * llevan / dias - Math.max(0, st.saldo));
          partes.push('Pago de ' + U.money0(st.M) + ' el ' + U.fechaCorta(st.venc));
          if (st.saldo > 0.5) partes.push('llevas ' + U.money0(st.saldo));
        } else {
          const base = (s.tipo === 'limite' ? 'Tope de ' : '') + U.money0(st.M) + ' ' + U.FREC_CADA[fP];
          const p = App.presupuestoCiclo(s, st);
          if (fA === 'diario' && fP !== 'diario') partes.push(base + ' (' + U.money(st.constante) + ' al día)');
          else {
            partes.push(base);
            if (p.parcial) {
              const quedan = U.daysBetween(hoy, st.cFin) + 1;
              partes.push(U.FREC_ESTE[fP] + ' ya va empezada (' + (quedan === 1 ? 'queda 1 día' : 'quedan ' + quedan + ' días') + '): ' + U.money0(st.Mc));
            }
            if (fA !== fP) partes.push('se apartan ' + U.money(st.constante) + ' ' + U.FREC_CADA[fA]);
          }
        }
      } else if (s.tipo === 'deuda' && s.hasta && s.meta > 0) {
        const desde = s.desde || hoy;
        const dias = Math.max(1, U.daysBetween(desde, s.hasta) + 1);
        const llevan = U.clamp(U.daysBetween(desde, hoy) + 1, 1, dias);
        necesita = Math.max(necesita, s.meta * llevan / dias - st.pagado - Math.max(0, st.saldo));
        partes.push('Debes ' + U.money0(s.meta - st.pagado) + ' para el ' + U.fechaCorta(s.hasta));
      } else if (s.tipo === 'tarjeta') {
        partes.push(st.venc ? 'Pago de tarjeta el ' + U.fechaCorta(st.venc) : 'Pago de tarjeta');
      } else if (s.tipo === 'ahorro') {
        const m = s.meta > 0 && s.hasta ? App.calcMeta(s.meta, st.saldo, s.hasta, fA) : null;
        if (m) partes.push('Meta ' + U.money0(s.meta) + ' para el ' + U.fechaCorta(s.hasta) + ' · ' + U.money(m.diario) + ' al día');
        else partes.push('Ahorras ' + U.money(st.cuota) + ' ' + U.FREC_CADA[fA]);
      }
      necesita = Math.ceil(Math.max(0, necesita) - 0.001);
      if (s.tipo === 'ahorro' && s.meta > 0) necesita = Math.min(necesita, Math.max(0, Math.ceil(s.meta - st.saldo)));
      const urge = s.tipo === 'deuda' || s.tipo === 'tarjeta' || !!s.fechaPago;
      lista.push({ s, i, necesita, motivo: partes.join(' · '), urge, venc: st.venc || '9999', por: n.por });
    });
    lista.sort((a, b) => (a.urge === b.urge ? 0 : a.urge ? -1 : 1) || (a.urge ? a.venc.localeCompare(b.venc) : 0) || a.i - b.i);
    return lista;
  };
  /* ---------------- Metas con fecha ----------------
     Cuánto guardar para juntar "meta" el día "hasta": se reparte lo que falta entre los días
     (y los aportes) que quedan. Como se calcula con lo que llevas, cada día se ajusta solo. */
  App.calcMeta = (meta, llevas, hasta, frec, ref) => {
    ref = ref || U.today();
    meta = Number(meta) || 0;
    if (!(meta > 0) || !hasta || hasta < ref) return null;
    const resta = U.r2(Math.max(0, meta - Math.max(0, Number(llevas) || 0)));
    const dias = U.daysBetween(ref, hasta) + 1;
    const n = Math.max(1, U.contarPeriodos(frec, ref, hasta));
    const arriba = (x) => Math.ceil(x * 100 - 1e-6) / 100;
    return { resta, dias, n, cuota: arriba(resta / n), diario: arriba(resta / dias) };
  };
  App.fechaMeta = (f) => U.fechaLarga(f) + (U.parse(f).getFullYear() !== new Date().getFullYear() ? ' de ' + U.parse(f).getFullYear() : '');
  App.textoMeta = (m, frec, cuota, lleva, hasta) => {
    const f = U.frec(frec);
    if (m.resta <= 0) return '¡Ya juntaste tu meta! 🎉';
    const t = 'Guarda <b>' + U.money(cuota > 0 ? cuota : m.cuota) + '</b> ' + U.FREC_CADA[f] + '.';
    const det = [];
    if (f !== 'diario') det.push('Son ≈ ' + U.money(m.diario) + ' al día');
    det.push((m.dias === 1 ? 'Queda 1 día' : 'Quedan ' + m.dias + ' días') + ', hasta el ' + App.fechaMeta(hasta));
    if (lleva > 0) det.push('llevas ' + U.money(lleva) + ' y faltan ' + U.money(m.resta));
    return t + '<small>' + det.join(' · ') + '.</small>';
  };

  /* ---------------- Alertas de sobres y tarjetas ----------------
     alerta (por sobre o tarjeta): '' = usar la general · número = avisar con ese % restante ·
     'pasar' = solo cuando me pase · 'no' = nunca */
  App.umbral = (v, general) => {
    if (v === 'no') return null;
    if (v === 'pasar') return 0;
    if (v === '' || v === undefined || v === null) return Number(general) || 0;
    return Number(v) || 0;
  };
  App.OPC_ALERTA = [['', 'Usar la general'], ['10', 'Al 10%'], ['20', 'Al 20%'], ['30', 'Al 30%'], ['50', 'Al 50%'], ['pasar', 'Solo si me paso'], ['no', 'Nunca']];

  App.alertaSobre = (s, st) => {
    const a = App.state.ajustes;
    if (a.alertas === false || !s || !st || !(s.tipo === 'gasto' || s.tipo === 'limite')) return null;
    const u = App.umbral(s.alerta, a.alertaSobre);
    const M = s.fechaPago ? st.M : st.Mc;
    if (u === null || !(M > 0)) return null;
    const restante = U.r2(M - st.gastadoCiclo);
    const pct = restante / M * 100;
    const cuando = U.FREC_ESTE[U.frec(s.frecPago)];
    if (restante < -0.004) return { nivel: 'pasado', restante, pct, texto: s.nombre + ': te pasaste ' + U.money(-restante) + ' ' + cuando, corto: 'Te pasaste ' + U.money(-restante) + ' de ' + U.money(M) + ' ' + cuando };
    // los pagos con fecha (renta, gym) solo avisan si te pasas: al pagarlos se usa el 100%
    if (s.fechaPago || !(u > 0) || pct > u + 1e-9) return null;
    return { nivel: 'poco', restante, pct, texto: s.nombre + ': te queda' + (restante === 1 ? '' : 'n') + ' ' + U.money(restante) + ' (' + Math.round(pct) + '%) ' + cuando, corto: 'Te queda ' + U.money(restante) + ' de ' + U.money(M) + ' ' + cuando + ' (' + Math.round(pct) + '%)' };
  };

  // Hasta dónde quieres usar la tarjeta: tu límite de uso (si lo pusiste) o el del banco
  App.limiteTarjeta = (ct) => {
    const l = [Number(ct.limiteUso) || 0, Number(ct.limite) || 0].filter((x) => x > 0);
    return l.length ? Math.min.apply(null, l) : 0;
  };
  App.usoTarjeta = (ct, c, extra) => {
    const debe = U.r2(Math.max(0, -((c || App.calc()).cuentas[ct.id] || 0)) + (extra || 0));
    const L = App.limiteTarjeta(ct);
    const propio = Number(ct.limiteUso) > 0 && (!(Number(ct.limite) > 0) || Number(ct.limiteUso) < Number(ct.limite));
    return { debe, L, propio, disp: U.r2(L - debe), pct: L > 0 ? (L - debe) / L * 100 : 100 };
  };
  App.alertaTarjeta = (ct, c) => {
    const a = App.state.ajustes;
    if (a.alertas === false || !App.esCredito(ct)) return null;
    const u = App.umbral(ct.alerta, a.alertaTarjeta);
    const x = App.usoTarjeta(ct, c);
    if (u === null || !(x.L > 0)) return null;
    const de = x.propio ? 'de tu límite de uso' : 'de crédito';
    if (x.disp < -0.004) return Object.assign(x, { nivel: 'pasado', texto: ct.nombre + ': te pasaste ' + U.money(-x.disp) + ' ' + (x.propio ? 'de tu límite de uso' : 'del límite') });
    if (!(u > 0) || x.pct > u + 1e-9) return null;
    return Object.assign(x, { nivel: 'poco', texto: ct.nombre + ': te queda' + (x.disp === 1 ? '' : 'n') + ' ' + U.money(x.disp) + ' ' + de + ' (' + Math.round(x.pct) + '%)' });
  };
  // Todas las alertas activas (para "Para ti")
  App.alertas = (c) => {
    const out = [];
    App.state.espacios.forEach((e) => e.sobres.forEach((s) => { const al = App.alertaSobre(s, c.sob[s.id]); if (al) out.push(Object.assign(al, { tipo: 'sobre', s, e })); }));
    App.state.cuentas.forEach((ct) => { const al = App.alertaTarjeta(ct, c); if (al) out.push(Object.assign(al, { tipo: 'tarjeta', ct })); });
    out.sort((a, b) => (a.nivel === b.nivel ? a.pct - b.pct : a.nivel === 'pasado' ? -1 : 1));
    return out;
  };
})();
