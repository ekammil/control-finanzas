/* Control de Finanzas — cálculos (saldos, sobres, semana, gráficas) */
(function () {
  const App = window.App;

  const ordenar = (movs) => movs.slice().sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : a.creado - b.creado));

  /* Motor: aplica movimientos uno por uno sobre un estado de saldos */
  function motor() {
    const S = App.state;
    const cuentas = {}; S.cuentas.forEach((c) => { cuentas[c.id] = 0; });
    const esp = {}; S.espacios.forEach((e) => { esp[e.id] = 0; });
    const sob = {}; const sobEsp = {};
    S.espacios.forEach((e) => e.sobres.forEach((s) => { sob[s.id] = 0; sobEsp[s.id] = e.id; }));
    const valido = (espId, sobreId) => sobreId && sob[sobreId] !== undefined && sobEsp[sobreId] === espId;

    function aplicar(m, w) {
      const v = Number(m.monto) || 0;
      const t = m.tipo;
      if (t === 'gasto' || t === 'ingreso' || t === 'inicial' || t === 'ajuste') {
        const signo = t === 'gasto' ? -1 : 1;
        if (cuentas[m.cuenta] !== undefined) cuentas[m.cuenta] += signo * v;
        if (esp[m.espacio] !== undefined) esp[m.espacio] += signo * v;
        if (t === 'gasto' && valido(m.espacio, m.sobre)) {
          const de = Math.min(Math.max(sob[m.sobre], 0), v);
          sob[m.sobre] -= de;
          w && w.gasto(m, v - de);
        } else if (t === 'gasto') {
          w && w.gasto(m, 0);
        }
        if (t === 'ingreso') w && w.ingreso(m);
        return;
      }
      if (t === 'traspaso') {
        if (cuentas[m.cuenta] !== undefined) cuentas[m.cuenta] -= v;
        if (cuentas[m.cuenta2] !== undefined) cuentas[m.cuenta2] += v;
        return;
      }
      if (t === 'mover') {
        if (esp[m.espacio] !== undefined) esp[m.espacio] -= v;
        if (esp[m.espacio2] !== undefined) esp[m.espacio2] += v;
        if (valido(m.espacio, m.sobre)) sob[m.sobre] -= Math.min(Math.max(sob[m.sobre], 0), v);
        if (valido(m.espacio2, m.sobre2)) { sob[m.sobre2] += v; w && w.apartado(m.sobre2, v); }
      }
    }
    return { cuentas, esp, sob, sobEsp, aplicar };
  }

  /* Disponible = libre + sobres marcados "disponible", solo en espacios que cuentan para disponible */
  function resumir(E) {
    const S = App.state;
    let total = 0, disponible = 0, ahorro = 0;
    S.cuentas.forEach((c) => { total += E.cuentas[c.id] || 0; });
    S.espacios.forEach((e) => {
      let noDisp = 0;
      e.sobres.forEach((s) => {
        const v = Math.max(0, E.sob[s.id] || 0);
        if (s.tipo === 'ahorro' || s.tipo === 'porIngreso') ahorro += v;
        if (!s.disponible) noDisp += v;
      });
      if (e.enDisponible) disponible += (E.esp[e.id] || 0) - noDisp;
    });
    return { total: U.r2(total), disponible: U.r2(disponible), ahorro: U.r2(ahorro), apartado: U.r2(total - disponible - ahorro) };
  }

  /* Estado completo a una fecha (por defecto hoy) */
  App.calc = (ref) => {
    const S = App.state;
    ref = ref || U.today();
    const ini = U.weekStart(ref);
    const fin = U.addDays(ini, 7);
    const E = motor();
    const st = {};
    S.espacios.forEach((e) => e.sobres.forEach((s) => {
      st[s.id] = { saldoAntes: 0, gastadoSemana: 0, apartadoSemana: 0, excesoSemana: 0, pagado: 0, pagadoAntes: 0 };
    }));
    const espSemana = {}; S.espacios.forEach((e) => { espSemana[e.id] = { gastado: 0, ingresado: 0 }; });
    let fase = 'antes';
    const w = {
      gasto(m, exceso) {
        const x = st[m.sobre];
        if (fase === 'semana') {
          if (espSemana[m.espacio]) espSemana[m.espacio].gastado += Number(m.monto);
          if (x) { x.gastadoSemana += Number(m.monto); x.excesoSemana += exceso; }
        }
        if (x) {
          const s = App.sobre(m.espacio, m.sobre);
          if (s && s.tipo === 'deuda' && (!s.desde || m.fecha >= s.desde)) {
            x.pagado += Number(m.monto);
            if (fase === 'antes') x.pagadoAntes += Number(m.monto);
          }
        }
      },
      ingreso(m) { if (fase === 'semana' && espSemana[m.espacio]) espSemana[m.espacio].ingresado += Number(m.monto); },
      apartado(sobreId, v) { if (fase === 'semana' && st[sobreId]) st[sobreId].apartadoSemana += v; }
    };
    const movs = ordenar(S.movs.filter((m) => m.fecha <= ref));
    let i = 0;
    for (; i < movs.length && movs[i].fecha < ini; i++) E.aplicar(movs[i], w);
    Object.keys(st).forEach((k) => { st[k].saldoAntes = E.sob[k]; });
    fase = 'semana';
    for (; i < movs.length; i++) E.aplicar(movs[i], w);

    // cuotas y lo que falta
    const sobOut = {};
    const espOut = {};
    S.espacios.forEach((e) => {
      let enSobres = 0;
      e.sobres.forEach((s) => {
        const x = st[s.id];
        const saldo = U.r2(E.sob[s.id]);
        enSobres += Math.max(0, saldo);
        let cuota = Number(s.cuota) || 0;
        let falta = 0;
        let semanas = null;
        const cubierto = x.apartadoSemana + x.excesoSemana;
        if (s.tipo === 'gasto') falta = cuota - cubierto;
        else if (s.tipo === 'limite') falta = cuota - Math.max(0, x.saldoAntes) - cubierto;
        else if (s.tipo === 'ahorro') {
          falta = cuota - x.apartadoSemana;
          if (s.meta > 0) falta = Math.min(falta, s.meta - saldo);
        } else if (s.tipo === 'deuda') {
          if (s.hasta && s.meta > 0) {
            const desde = s.desde && s.desde > ini ? s.desde : ini;
            if (s.desde && s.desde >= fin) { cuota = 0; }
            else {
              semanas = desde > s.hasta ? 0 : Math.floor(U.daysBetween(desde, s.hasta) / 7) + 1;
              const resta = Math.max(0, s.meta - x.pagadoAntes - Math.max(0, x.saldoAntes));
              cuota = semanas > 0 ? Math.ceil((resta / semanas) * 100) / 100 : 0;
            }
            falta = cuota - cubierto;
          }
        }
        falta = U.r2(Math.max(0, falta));
        // estado de color
        let estado = '';
        let progreso = 0;
        if (s.tipo === 'gasto' || s.tipo === 'limite') {
          progreso = cuota > 0 ? x.gastadoSemana / cuota : (x.gastadoSemana > 0 ? 1.01 : 0);
          estado = progreso > 1.001 ? 'pasado' : progreso >= 0.8 ? 'cuidado' : 'ok';
        } else if (s.tipo === 'deuda') {
          progreso = s.meta > 0 ? (x.pagado + Math.max(0, saldo)) / s.meta : 0;
          estado = falta > 0 ? 'cuidado' : 'ok';
        } else {
          progreso = s.meta > 0 ? Math.max(0, saldo) / s.meta : 0;
          estado = falta > 0 ? 'cuidado' : 'ok';
        }
        sobOut[s.id] = {
          saldo, saldoAntes: U.r2(x.saldoAntes), gastadoSemana: U.r2(x.gastadoSemana), apartadoSemana: U.r2(x.apartadoSemana),
          excesoSemana: U.r2(x.excesoSemana), pagado: U.r2(x.pagado), cuota: U.r2(cuota), falta, semanas, estado, progreso
        };
      });
      const total = U.r2(E.esp[e.id]);
      espOut[e.id] = {
        total, enSobres: U.r2(enSobres), libre: U.r2(total - enSobres),
        gastadoSemana: U.r2(espSemana[e.id].gastado), ingresadoSemana: U.r2(espSemana[e.id].ingresado),
        presupuesto: U.r2(e.sobres.filter((s) => s.tipo === 'gasto' || s.tipo === 'limite').reduce((a, s) => a + (sobOut[s.id].cuota || 0), 0)),
        falta: U.r2(e.sobres.reduce((a, s) => a + sobOut[s.id].falta, 0))
      };
    });
    const cuentas = {}; S.cuentas.forEach((c) => { cuentas[c.id] = U.r2(E.cuentas[c.id]); });
    return { ref, ini, fin, cuentas, esp: espOut, sob: sobOut, tot: resumir(E) };
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
      for (; i < movs.length; i++) {
        E.aplicar(movs[i]);
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
      if ((s.tipo === 'gasto' || s.tipo === 'limite') && (x.gastadoSemana > 0 || x.cuota > 0)) sobres.push({ s, e, x });
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

  App.proximosPagos = () => {
    const hoy = U.today();
    return App.state.recurrentes.map((r) => {
      let f = App.siguienteFecha(r, hoy);
      if (r.pagado && r.pagado === f) f = App.siguienteFecha(r, U.addDays(f, 1));
      const dias = U.daysBetween(hoy, f);
      return { r, fecha: f, dias };
    }).sort((a, b) => a.dias - b.dias);
  };
})();
