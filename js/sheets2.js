/* Control de Finanzas — hojas: espacios, sobres, cuentas, metas, ajustes */
(function () {
  const App = window.App;
  const I = App.I;
  const H = App.HOJAS;
  const chip = (...a) => App.chipHTML(...a);

  const movsDe = (filtro, n) => App.state.movs.filter(filtro).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creado - a.creado)).slice(0, n || 8);
  const listaMovs = (movs) => movs.length ? movs.map((m) => {
    const inf = App.movInfo(m);
    return '<button class="fila" data-a="editar-mov" data-id="' + m.id + '"><div class="ico">' + U.esc(inf.icono) + '</div><div class="txt"><b>' + U.esc(inf.titulo) + '</b><small>' + U.fechaRel(m.fecha) + ' · ' + U.esc(inf.sub) + '</small></div><div class="der"><b class="num ' + inf.clase + '">' + inf.txtMonto + '</b></div></button>';
  }).join('') : '<div class="nota">Sin movimientos todavía.</div>';

  const num = (v) => U.r2(parseFloat(String(v === undefined || v === null ? '' : v).replace(/[^0-9.]/g, '')) || 0);
  const OPC_PCT = ['5', '10', '15', '20', '25', '30', '40', '50'];
  // selector de alerta: '' general · % · 'pasar' · 'no'
  const selAlerta = (v, general, attrs) => {
    v = v === undefined || v === null ? '' : String(v);
    const opc = [['', 'General · ' + general + '%']].concat(OPC_PCT.map((p) => [p, 'Al quedar ' + p + '%']), [['pasar', 'Solo si me paso'], ['no', 'Nunca']]);
    if (v && !opc.some((o) => o[0] === v)) opc.splice(1, 0, [v, 'Al quedar ' + v + '%']);
    return '<select ' + attrs + '>' + opc.map((o) => '<option value="' + o[0] + '" ' + (o[0] === v ? 'selected' : '') + '>' + o[1] + '</option>').join('') + '</select>';
  };
  App.selAlerta = selAlerta;
  const faltaTxt = (st) => (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' ✓');
  // "hoy ya ✓" o "hoy faltan $X" según el aporte de este periodo
  const hoyTxt = (st) => { const cuando = st.frecAporte === 'diario' ? 'hoy' : U.FREC_ESTE[st.frecAporte]; return st.falta > 0 ? cuando + ' faltan ' + U.money0(st.falta) : cuando + ' ya ✓'; };
  const descSobre = (s, st) => {
    if ((s.tipo === 'gasto' || s.tipo === 'limite') && !s.fechaPago && st.M > 0) {
      const pc = App.presupuestoCiclo(s, st);
      return 'Gastado ' + U.money0(st.gastadoCiclo) + ' de ' + U.money0(pc.M) + ' ' + U.FREC_ESTE[U.frec(s.frecPago)] + ' · te quedan ' + U.money0(Math.max(0, pc.M - st.gastadoCiclo));
    }
    if ((s.tipo === 'gasto' || s.tipo === 'limite') && s.fechaPago) return 'Pago de ' + U.money0(st.M) + ' el ' + U.fechaCorta(st.venc) + ' · te falta juntar ' + U.money0(Math.max(0, st.M - Math.max(0, st.saldo)));
    if (s.tipo === 'ahorro' && !(s.meta > 0)) return 'Apartas ' + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + ' · ' + hoyTxt(st);
    if (s.tipo === 'deuda') return 'Llevas ' + U.money0(st.pagado + Math.max(0, st.saldo)) + ' de ' + U.money0(s.meta) + ' · apartas ' + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + ' · ' + hoyTxt(st);
    return descSobreBase(s, st);
  };
  const descSobreBase = (s, st) => {
    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      if (s.fechaPago) return 'Pago de ' + U.money0(st.M) + ' el ' + U.fechaCorta(st.venc) + ' · llevas ' + U.money0(Math.max(0, st.saldo)) + faltaTxt(st);
      const pc = App.presupuestoCiclo(s, st);
      return 'Gastado ' + U.money0(st.gastadoCiclo) + ' de ' + U.money0(pc.M) + ' ' + U.FREC_ESTE[U.frec(s.frecPago)] + (pc.parcial ? ' (empezó el ' + U.fechaCorta(s.creado) + ')' : '') + (st.falta > 0 ? ' · por apartar ' + U.money0(st.falta) : '');
    }
    if (s.tipo === 'deuda') return 'Aporte ' + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' · cubierto ✓');
    if (s.tipo === 'ahorro') {
      const m = s.meta > 0 && s.hasta ? App.calcMeta(s.meta, st.saldo, s.hasta, st.frecAporte) : null;
      if (m) return m.resta <= 0 ? 'Meta ' + U.money0(s.meta) + ' lograda 🎉' : 'Faltan ' + U.money0(m.resta) + ' · ' + U.money(st.cuota) + U.FREC_POR[st.frecAporte] + (U.frec(st.frecAporte) !== 'diario' ? ' (≈ ' + U.money(m.diario) + '/día)' : '') + faltaTxt(st);
      return (s.meta > 0 ? 'Meta ' + U.money0(s.meta) + ' · ' : '') + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + faltaTxt(st);
    }
    if (s.tipo === 'tarjeta') return st.saldo < -0.004 ? 'Falta juntar ' + U.money0(-st.saldo) + (st.venc ? ' · pago ' + U.fechaCorta(st.venc) : '') + (st.falta > 0 ? ' · hoy ' + U.money0(st.falta) : '') : 'Al corriente ✓';
    return App.txtPorIngreso(s) + (s.meta > 0 ? ' · meta ' + U.money0(s.meta) : '');
  };
  App.descSobre = descSobre;

  /* Resumen corto de cómo está configurado un sobre */
  const resumenSobre = (s) => {
    const fA = U.frec(s.frecAporte || App.state.ajustes.frecIngreso);
    if (s.tipo === 'deuda') return 'Pago único · ' + U.money0(s.meta) + (s.hasta ? ' para el ' + U.fechaCorta(s.hasta) : '');
    if (s.tipo === 'porIngreso') return App.txtPorIngreso(s);
    if (s.tipo === 'ahorro') return 'Ahorro · ' + (s.meta > 0 && s.hasta ? 'meta ' + U.money0(s.meta) + ' para el ' + U.fechaCorta(s.hasta) : U.money0(s.cuota) + ' ' + U.FREC_CADA[fA]);
    if (s.tipo === 'tarjeta') return 'Pago de tarjeta · aporte ' + U.FREC_CADA[fA];
    return (s.tipo === 'limite' ? 'Tope ' : '') + U.money0(s.cuota) + ' ' + U.FREC_CADA[U.frec(s.frecPago)] + (s.fechaPago ? ' · paga el ' + U.fechaCorta(U.siguienteVenc(s.frecPago, s.fechaPago, U.today())) : '');
  };
  App.resumenSobre = resumenSobre;

  /* Sobre armado con lo que hay en la hoja de edición (para calcular el aporte en vivo) */
  const sobreDeHoja = (h) => ({
    id: h.id || 'nuevo', nombre: h.nombre, tipo: h.tipo, cuota: num(h.cuota), meta: num(h.meta),
    desde: h.tipo === 'deuda' ? (h.desde || U.today()) : '', hasta: h.tipo === 'deuda' || (h.tipo === 'ahorro' && h.conMeta) ? (h.hasta || '') : '',
    frecPago: U.frec(h.frecPago), frecAporte: h.frecAporte, fechaPago: h.tipo === 'gasto' || h.tipo === 'limite' ? (h.fechaPago || '') : '',
    aporteManual: h.manual ? num(h.aporteManual) : '', creado: h.creado || U.today(), cuenta: h.cuenta
  });
  App.sobreDeHoja = sobreDeHoja;
  const vistaAporte = (h) => {
    const s = sobreDeHoja(h);
    const c = App.calc();
    const p = App.planSobre(s, h.id ? c.L[h.id] : null, U.today());
    const cada = U.FREC_CADA[p.frecAporte];
    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      if (h.manual) return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + '.';
      if (!(s.cuota > 0)) return 'Escribe el monto y aquí verás cuánto apartar.';
      let t = 'Se apartan <b>≈ ' + U.money(p.constante) + '</b> ' + cada + '.';
      if (s.fechaPago) {
        const lleva = h.id && c.sob[h.id] ? Math.max(0, c.sob[h.id].saldo) : 0;
        const ahora = Math.abs(p.cuota - p.constante) > 0.5 ? ' Para llegar a este pago, esta vez se apartan ' + U.money(p.cuota) + ' ' + cada + '.' : '';
        t += '<small>Próximo pago: ' + U.fechaLarga(p.venc) + '. Llevas ' + U.money(lleva) + ' de ' + U.money(s.cuota) + '.' + ahora + '</small>';
      } else if (Math.abs(p.cuota - p.constante) > 0.5 && p.falta > 0) t += '<small>Esta vez: ' + U.money(p.falta) + ', por lo que queda ' + U.FREC_ESTE[s.frecPago] + '.</small>';
      return t;
    }
    if (s.tipo === 'deuda') {
      if (!(s.meta > 0 && s.hasta)) return 'Pon el total y la fecha límite para calcular el aporte.';
      if (h.manual) return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + '.';
      return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + (p.n ? '<small>' + p.n + ' aportes hasta el ' + U.fechaCorta(s.hasta) + '.</small>' : '.');
    }
    if (s.tipo === 'ahorro') {
      if (h.conMeta) {
        if (!(s.meta > 0) || !s.hasta) return 'Escribe cuánto quieres juntar y para cuándo, y aquí te digo cuánto guardar.';
        if (s.hasta <= U.today()) return 'Elige una fecha después de hoy.';
        const lleva = h.id && c.sob[h.id] ? Math.max(0, c.sob[h.id].saldo) : 0;
        const m = App.calcMeta(s.meta, lleva, s.hasta, p.frecAporte);
        return App.textoMeta(m, p.frecAporte, p.cuota, lleva, s.hasta);
      }
      return 'Se apartan <b>' + U.money(num(h.cuota)) + '</b> ' + cada + '.';
    }
    if (s.tipo === 'tarjeta') return p.cuota > 0 ? 'Esta vez: <b>' + U.money(p.cuota) + '</b> ' + cada + (p.venc ? ' para el pago del ' + U.fechaCorta(p.venc) : '') + '.' : 'No hay compras pendientes de juntar.';
    return '';
  };

  /* ---------- Espacio ---------- */
  H.espacio = {
    titulo: (h) => { const e = App.espacio(h.id); return e ? e.icono + ' ' + e.nombre : 'Espacio'; },
    render: (h) => {
      const e = App.espacio(h.id); if (!e) return '';
      const c = App.calc(); const x = c.esp[e.id];
      let y = '<div class="hero" style="margin-top:4px"><div class="etiqueta">Total en ' + U.esc(e.nombre) + '</div><div class="grande" style="font-size:38px">' + App.montoGrande(x.total) + '</div>' +
        '<div class="mini-totales" style="margin-top:8px"><div><span>Libre</span><b class="num ' + (x.libre < -0.004 ? 'neg' : '') + '">' + U.money(x.libre) + '</b></div><div><span>En sobres</span><b class="num">' + U.money(x.enSobres) + '</b></div>' +
        (x.falta > 0 ? '<div><span>Falta apartar</span><b class="num cuidado">' + U.money(x.falta) + '</b></div>' : '') + '</div></div>';
      y += '<div class="dos" style="margin-top:16px">' +
        '<button class="btn sec" style="margin:0" data-a="repartir" data-id="' + e.id + '" ' + (x.libre > 0 && x.falta > 0 ? '' : 'disabled') + '>✨ Repartir</button>' +
        '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="mover" data-esp="' + e.id + '" data-apilar="1">' + I.swap + ' Mover</button></div>';
      y += cuadroMinimo(e, c);
      y += '<div class="seccion" style="margin-top:20px"><div class="seccion-titulo"><h2>Sobres</h2><button data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-apilar="1">Agregar</button></div>' +
        '<p class="nota" style="margin:-4px 0 6px">El número de la derecha es lo que hay ahora en cada sobre. La barra muestra cuánto llevas gastado de lo planeado, o cuánto llevas juntado de tu pago o meta. Toca un sobre para ver todo el detalle.</p>';
      if (!e.sobres.length) y += '<div class="nota">Este espacio no tiene sobres. Agrega uno para organizar tu dinero.</div>';
      e.sobres.forEach((s) => {
        const st = c.sob[s.id];
        const p = s.tipo === 'gasto' || s.tipo === 'limite' ? st.progreso : st.progreso;
        const clase = (s.tipo === 'gasto' || s.tipo === 'limite') ? st.estado : (s.meta > 0 ? 'azul' : st.estado);
        const conBarra = ((s.tipo === 'gasto' || s.tipo === 'limite') && st.cuota > 0) || s.meta > 0 || s.tipo === 'deuda';
        y += '<button class="fila" data-a="hoja" data-h="sobre" data-esp="' + e.id + '" data-id="' + s.id + '" data-apilar="1">' +
          '<div class="ico">' + U.esc(s.icono) + '</div><div class="txt"><b>' + U.esc(s.nombre) + (s.disponible ? ' <small style="display:inline;color:var(--green)">· disponible</small>' : '') + '</b><small style="white-space:normal">' + descSobre(s, st) + '</small>' +
          (conBarra ? App.barraProg(p, clase) : '') + '</div>' +
          '<div class="der"><b class="num ' + (st.saldo < -0.004 ? 'neg' : '') + '">' + U.money(st.saldo) + '</b><small>' + (s.tipo === 'tarjeta' && st.saldo < -0.004 ? 'por juntar' : 'en el sobre') + '</small></div></button>';
      });
      y += '</div><button class="btn sec" data-a="hoja" data-h="espacio-editar" data-id="' + e.id + '" data-apilar="1">' + I.edit + ' Editar espacio</button>';
      return y;
    }
  };

  /* Lo mínimo que tiene que entrar a un espacio para cubrir todos sus sobres, y si lo que te entra alcanza */
  App.minimoEspacio = (e, c) => {
    const fI = U.frec(App.state.ajustes.frecIngreso);
    let base = 0, pct = 0; const por = [];
    e.sobres.forEach((s) => {
      const st = c.sob[s.id]; if (!st) return;
      let d = 0;
      if (s.tipo === 'porIngreso') { if (Number(s.pct) > 0) pct += Number(s.pct); else d = U.convertir(Number(s.cuota) || 0, fI, 'diario'); }
      else if (s.tipo === 'gasto' || s.tipo === 'limite') d = U.convertir(Number(s.cuota) || 0, s.frecPago, 'diario');
      else d = U.convertir(st.constante || 0, st.frecAporte, 'diario');
      if (d > 0.004) { base += d; por.push([s, d]); }
    });
    pct = Math.min(pct, 90);
    const dia = base / (1 - pct / 100);
    // lo que te entró a este espacio en los últimos 30 días (o desde tu primer ingreso, si es más reciente)
    const hoy = U.today(); const desde = U.addDays(hoy, -29);
    const ings = App.state.movs.filter((m) => m.tipo === 'ingreso' && m.espacio === e.id && m.fecha <= hoy);
    const primero = ings.reduce((a, m) => (m.fecha < a ? m.fecha : a), hoy);
    const ini = primero > desde ? primero : desde;
    const dias = U.daysBetween(ini, hoy) + 1;
    const entra = ings.filter((m) => m.fecha >= ini).reduce((t, m) => t + Number(m.monto), 0);
    return { dia, pct, por: por.sort((a, b) => b[1] - a[1]), entraDia: ings.length && dias >= 7 ? entra / dias : null, dias };
  };
  const cuadroMinimo = (e, c) => {
    const m = App.minimoEspacio(e, c);
    if (!(m.dia > 0)) return '';
    const mes = m.dia * 365 / 12;
    let y = '<div class="seccion" style="margin-top:20px"><div class="seccion-titulo"><h2>💡 Lo mínimo que necesitas</h2></div>' +
      '<p class="nota" style="margin:-4px 0 6px">Lo que te tiene que entrar en ' + U.esc(e.nombre) + ' para cubrir todos sus sobres' + (m.pct > 0 ? ' (ya contando el ' + U.r2(m.pct) + '% que se aparta de cada ingreso)' : '') + '.</p>' +
      '<div class="cuadro-sobre" style="margin-top:0">' +
      [['Al día', m.dia], ['A la semana', m.dia * 7], ['A la quincena', mes / 2], ['Al mes', mes]].map(([t, v]) => '<div><span>' + t + '</span><b class="num">' + U.money(v) + '</b></div>').join('') + '</div>';
    if (m.entraDia !== null) {
      const dif = (m.entraDia - m.dia) * 365 / 12;
      y += '<p class="nota ' + (dif < 0 ? 'cuidado' : '') + '" style="margin-top:10px">' + (m.dias >= 30 ? 'En los últimos 30 días' : 'En los últimos ' + m.dias + ' días') + ' te entraron en promedio ' + U.money(m.entraDia) + ' al día (≈ ' + U.money0(m.entraDia * 365 / 12) + ' al mes). ' +
        (dif >= 0 ? '✅ Te alcanza para todo y te sobran ≈ ' + U.money0(dif) + ' al mes.' : '⚠️ No te alcanza: te faltan ≈ ' + U.money0(-dif) + ' al mes (' + U.money0(-dif * 12 / 365) + ' al día).') + '</p>';
    } else y += '<p class="nota" style="margin-top:10px">Cuando registres ingresos en este espacio por al menos una semana, aquí te digo si te alcanza.</p>';
    y += '<details class="nota" style="margin-top:6px"><summary>Ver cuánto pide cada sobre</summary>' +
      m.por.map(([s, d]) => '<div style="display:flex;justify-content:space-between;gap:8px;padding:3px 0"><span>' + U.esc(s.icono) + ' ' + U.esc(s.nombre) + '</span><span class="num">' + U.money0(d * 365 / 12) + '/mes · ' + U.money(d) + '/día</span></div>').join('') +
      (m.pct > 0 ? '<div style="padding:3px 0">+ ' + U.r2(m.pct) + '% de cada ingreso para sobres por ingreso</div>' : '') + '</details></div>';
    return y;
  };

  /* Cuadro con todo lo de un sobre: lo que hay, lo gastado, lo que te queda, cuánto apartas y cuánto falta */
  const cuadroSobre = (s, st) => {
    const f = [];
    const cuando = st.frecAporte === 'diario' ? 'hoy' : U.FREC_ESTE[st.frecAporte];
    const esG = s.tipo === 'gasto' || s.tipo === 'limite';
    const distinto = esG && !App.esManual(s) && st.falta > 0 && Math.abs(st.cuota - st.constante) > 0.5;
    const ap = s.tipo === 'porIngreso' ? App.txtPorIngreso(s) : U.money(distinto ? st.cuota : esG ? st.constante : st.cuota) + U.FREC_POR[st.frecAporte];
    if (s.tipo === 'tarjeta') f.push(['Por juntar', U.money(Math.max(0, -st.saldo)), 'ya juntaste ' + U.money0(Math.max(0, st.compras + st.saldo))]);
    else f.push(['En el sobre', U.money(st.saldo), 'lo que tienes ahí ahora']);
    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      const fP = U.frec(s.frecPago);
      if (s.fechaPago) {
        f.push(['Pago', U.money(st.M), 'el ' + U.fechaCorta(st.venc)]);
        f.push(['Te falta juntar', U.money(Math.max(0, st.M - Math.max(0, st.saldo))), 'para ese pago']);
        f.push(['Pagado', U.money(st.gastadoCiclo), 'en este ciclo']);
      } else {
        const pc = App.presupuestoCiclo(s, st);
        f.push(['Planeado', U.money(pc.M), U.FREC_ESTE[fP]]);
        f.push(['Gastado', U.money(st.gastadoCiclo), U.FREC_ESTE[fP]]);
        const queda = pc.M - st.gastadoCiclo;
        f.push(queda >= 0 ? ['Te queda por gastar', U.money(queda), U.FREC_ESTE[fP]] : ['Te pasaste', U.money(-queda), U.FREC_ESTE[fP]]);
      }
    } else if (s.tipo === 'ahorro' && s.meta > 0) {
      f.push(['Meta', U.money(s.meta), s.hasta ? 'para el ' + U.fechaCorta(s.hasta) : '']);
      f.push(['Te falta', U.money(Math.max(0, s.meta - Math.max(0, st.saldo))), 'para tu meta']);
    } else if (s.tipo === 'deuda') {
      f.push(['Ya pagaste', U.money(st.pagado), 'de ' + U.money0(s.meta)]);
      f.push(['Te falta', U.money(Math.max(0, s.meta - st.pagado - Math.max(0, st.saldo))), s.hasta ? 'para el ' + U.fechaCorta(s.hasta) : '']);
    } else if (s.tipo === 'tarjeta') {
      f.push(['Compras a pagar', U.money(st.compras), st.venc ? 'pago el ' + U.fechaCorta(st.venc) : '']);
    }
    if (s.tipo !== 'porIngreso') {
      f.push(['Apartas', ap, distinto ? 'por ahora (lo normal: ' + U.money(st.constante) + ')' : 'de tus ingresos']);
      f.push(['Falta apartar', U.money(st.falta), st.falta > 0 ? cuando : cuando + ' ya está ✓']);
    } else f.push(['Apartas', ap, '']);
    return '<div class="cuadro-sobre">' + f.map(([t, v, d]) => '<div><span>' + t + '</span><b class="num">' + v + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</div>').join('') + '</div>';
  };

  /* ---------- Sobre (detalle) ---------- */
  H.sobre = {
    titulo: (h) => { const s = App.sobre(h.esp, h.id); return s ? s.icono + ' ' + s.nombre : 'Sobre'; },
    render: (h) => {
      const s = App.sobre(h.esp, h.id); if (!s) return '<div class="vacio-txt">Este sobre ya no existe.</div>';
      const st = App.calc().sob[s.id];
      let y = '<div class="hero" style="margin-top:4px"><div class="etiqueta">' + App.tipoSobre(s.tipo).nombre + '</div><div class="grande" style="font-size:38px">' + App.montoGrande(st.saldo) + '</div>' +
        '<p class="nota" style="margin-top:4px">' + descSobre(s, st) + '</p></div>';
      if ((s.tipo === 'gasto' || s.tipo === 'limite') && st.M > 0) y += App.barraProg(st.progreso, s.fechaPago ? (st.estado === 'pasado' ? 'pasado' : 'azul') : st.estado);
      if (s.tipo === 'tarjeta' && st.compras > 0) y += App.barraProg(st.progreso, 'azul');
      if (s.meta > 0 || s.tipo === 'deuda') {
        const act = s.tipo === 'deuda' ? st.pagado + Math.max(0, st.saldo) : Math.max(0, st.saldo);
        y += App.barraProg(s.meta ? act / s.meta : 0, 'azul') + '<div class="nota">' + U.money(act) + ' de ' + U.money(s.meta) + (s.hasta ? ' · límite ' + U.fechaCorta(s.hasta) : '') + '</div>';
      }
      y += cuadroSobre(s, st);
      const ct = s.tipo === 'tarjeta' ? App.cuenta(s.cuenta) : null;
      y += '<div class="dos" style="margin-top:16px">' +
        (ct ? '<button class="btn sec" style="margin:0" data-a="hoja" data-h="cuenta" data-id="' + ct.id + '" data-apilar="1">💳 Ver tarjeta</button>'
          : '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="gasto" data-esp="' + h.esp + '" data-sobre="' + s.id + '" data-apilar="1">− Gasto</button>') +
        '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="mover" data-esp="' + h.esp + '" data-sobre2="' + s.id + '" data-apilar="1">' + I.swap + ' Mover</button></div>';
      y += '<div class="seccion" style="margin-top:20px"><div class="seccion-titulo"><h2>Últimos movimientos</h2></div>' + listaMovs(movsDe((m) => m.sobre === s.id || m.sobre2 === s.id, 10)) + '</div>';
      y += '<button class="btn sec" data-a="hoja" data-h="sobre-editar" data-esp="' + h.esp + '" data-id="' + s.id + '" data-apilar="1">' + I.edit + ' Editar sobre</button>';
      return y;
    }
  };

  /* ---------- Cuenta (detalle) ---------- */
  H.cuenta = {
    titulo: (h) => { const c = App.cuenta(h.id); return c ? c.icono + ' ' + c.nombre : 'Cuenta'; },
    render: (h) => {
      const ct = App.cuenta(h.id); if (!ct) return '';
      const c = App.calc();
      const saldo = c.cuentas[ct.id];
      let y = '';
      if (App.esCredito(ct)) {
        const debe = Math.max(0, -saldo);
        const lim = num(ct.limite);
        y += '<div class="hero" style="margin-top:4px"><div class="etiqueta">Debes</div><div class="grande" style="font-size:38px">' + App.montoGrande(debe) + '</div>' +
          (saldo > 0.004 ? '<p class="nota">Tienes ' + U.money(saldo) + ' a tu favor.</p>' : '') +
          '<div class="credito-info">' + (lim > 0 ? '<div><span>Crédito disponible</span><b class="num">' + U.money0(Math.max(0, lim - debe)) + '</b></div><div><span>Límite</span><b class="num">' + U.money0(lim) + '</b></div>' : '') +
          (ct.diaCorte ? '<div><span>Corte</span><b>Día ' + ct.diaCorte + '</b></div>' : '') + '</div></div>';
        if (lim > 0) y += App.barraProg(debe / lim, debe / lim > 0.8 ? 'cuidado' : 'azul');
        const p = App.pagoTarjeta(ct, c);
        if (p && p.monto > 0.004) y += '<div class="calc-aporte" style="margin-top:14px">Próximo pago: <b>' + U.money(p.monto) + '</b> el ' + U.fechaCorta(p.fecha) + (p.estimado ? '<small>Aproximado: el corte aún no llega.</small>' : '<small>Para no pagar intereses (lo de tu corte del ' + U.fechaCorta(p.corte) + ').</small>') + '</div>';
        const ts = App.state.espacios.map((e) => App.sobreTarjeta(e.id, ct.id, false)).filter(Boolean);
        ts.forEach((s) => { const st = c.sob[s.id]; if (st && st.saldo < -0.004) y += '<p class="nota">Poco a poco: falta juntar ' + U.money(-st.saldo) + ' · ' + App.textoAporte(s, st) + '.</p>'; });
        y += '<div class="dos" style="margin-top:16px"><button class="btn sec" style="margin:0" data-a="pagar-tarjeta" data-id="' + ct.id + '">' + I.check + ' Pagar tarjeta</button>' +
          '<button class="btn sec" style="margin:0" data-a="hoja" data-h="cuadre" data-apilar="1">' + I.scale + ' Cuadrar</button></div>';
      } else {
        y += '<div class="hero" style="margin-top:4px"><div class="etiqueta">Saldo</div><div class="grande" style="font-size:38px">' + App.montoGrande(saldo) + '</div></div>';
        if (ct.partes && c.partes[ct.id]) {
          const pa = c.partes[ct.id];
          y += '<div class="partes"><div class="fila"><div class="ico">💵</div><div class="txt"><b>Billetes</b></div><div class="der"><b class="num">' + U.money(pa.b) + '</b></div></div>' +
            '<div class="fila"><div class="ico">🪙</div><div class="txt"><b>Monedas</b></div><div class="der"><b class="num">' + U.money(pa.m) + '</b></div></div></div>' +
            '<button class="btn sec" data-a="cambio-partes" data-id="' + ct.id + '">' + I.swap + ' Cambiar billetes ↔ monedas</button>';
        }
        y += '<div class="dos" style="margin-top:16px"><button class="btn sec" style="margin:0" data-a="hoja" data-h="cuadre" data-apilar="1">' + I.scale + ' Cuadrar</button>' +
          '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="mover" data-movermodo="cuentas" data-cuenta="' + ct.id + '" data-apilar="1">' + I.swap + ' Traspasar</button></div>';
      }
      y += '<div class="seccion" style="margin-top:20px"><div class="seccion-titulo"><h2>Últimos movimientos</h2></div>' + listaMovs(movsDe((m) => m.cuenta === ct.id || m.cuenta2 === ct.id, 12)) + '</div>';
      y += '<button class="btn sec" data-a="hoja" data-h="cuenta-editar" data-id="' + ct.id + '" data-apilar="1">' + I.edit + ' Editar cuenta</button>';
      return y;
    }
  };

  /* ---------- Organizar espacios y sobres ---------- */
  H.organizar = {
    titulo: 'Espacios y sobres',
    render: () => {
      let y = '<p class="nota" style="margin-top:0">Un <b>espacio</b> es para qué es el dinero (Personal, tu negocio…). Dentro tiene <b>sobres</b> (Comida, Ocio, Ahorro…).</p>';
      App.state.espacios.forEach((e) => {
        y += '<div class="seccion" style="margin-top:22px"><div class="seccion-titulo"><h2>' + U.esc(e.icono) + ' ' + U.esc(e.nombre) + '</h2><button data-a="hoja" data-h="espacio-editar" data-id="' + e.id + '" data-apilar="1">Editar</button></div>';
        e.sobres.forEach((s, i) => {
          y += '<div class="fila"><div class="ico">' + U.esc(s.icono) + '</div><button class="txt" style="text-align:left" data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-id="' + s.id + '" data-apilar="1"><b>' + U.esc(s.nombre) + '</b><small>' + U.esc(resumenSobre(s)) + '</small></button>' +
            '<button class="icon-btn" style="width:34px;height:34px" data-a="sobre-orden" data-esp="' + e.id + '" data-i="' + i + '" data-d="-1" ' + (i === 0 ? 'disabled style="opacity:.3;width:34px;height:34px"' : '') + ' aria-label="Subir">' + I.up + '</button>' +
            '<button class="icon-btn" style="width:34px;height:34px" data-a="sobre-orden" data-esp="' + e.id + '" data-i="' + i + '" data-d="1" ' + (i === e.sobres.length - 1 ? 'disabled style="opacity:.3;width:34px;height:34px"' : '') + ' aria-label="Bajar">' + I.down + '</button></div>';
        });
        y += '<button class="btn sec" style="height:44px;font-size:15px" data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-apilar="1">' + I.plus + ' Sobre en ' + U.esc(e.nombre) + '</button></div>';
      });
      y += '<button class="btn" data-a="hoja" data-h="espacio-editar" data-apilar="1">' + I.plus + ' Nuevo espacio</button>';
      y += '<p class="nota">El orden importa: al repartir un ingreso, primero se llenan los pagos con fecha más cercana y luego los sobres de arriba hacia abajo.</p>';
      return y;
    }
  };

  const emojiPicker = (actual) => '<div class="etq">Ícono</div><div class="emojis">' + App.EMOJIS.map((em) => '<button class="' + (em === actual ? 'on' : '') + '" data-a="emoji" data-v="' + em + '">' + em + '</button>').join('') + '</div>';

  /* ---------- Editar espacio ---------- */
  H['espacio-editar'] = {
    titulo: (h) => h.id ? 'Editar espacio' : 'Nuevo espacio',
    init: (d) => { const e = d.id ? App.espacio(d.id) : null; return { id: d.id || '', nombre: e ? e.nombre : '', icono: e ? e.icono : '💼', enDisponible: e ? e.enDisponible : false }; },
    render: (h) => {
      let y = '<label class="campo"><span>Nombre</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="Ej. Negocio, Personal, Horno" maxlength="30"></label>';
      y += emojiPicker(h.icono);
      y += '<label class="interruptor"><div class="txt"><b>Cuenta para mi "Disponible"</b><small>Actívalo para tu dinero personal. Para un negocio, normalmente no.</small></div><span class="sw"><input type="checkbox" data-m="enDisponible" ' + (h.enDisponible ? 'checked' : '') + '><i></i></span></label>';
      y += '<button class="btn" data-a="espacio-guardar">' + I.check + 'Guardar</button>';
      if (h.id) y += '<button class="btn peligro" data-a="espacio-borrar">' + I.trash + 'Eliminar espacio</button>';
      return y;
    }
  };

  /* ---------- Editar sobre ---------- */
  H['sobre-editar'] = {
    titulo: (h) => h.id ? (h.conMeta ? 'Editar meta' : 'Editar sobre') : (h.conMeta ? 'Nueva meta' : 'Nuevo sobre'),
    init: (d) => {
      const s = d.id ? App.sobre(d.esp, d.id) : null;
      const b = s ? JSON.parse(JSON.stringify(s)) : App.nuevoSobre({ icono: '⭐', tipo: d.tipoInicial || 'gasto', cuota: '', meta: '' });
      b.manual = App.esManual(b);
      if (b.aporteManual === '' || b.aporteManual === undefined) b.aporteManual = '';
      if (b.tipo !== 'tarjeta' && !b.frecAporte) b.frecAporte = App.state.ajustes.frecIngreso;
      if (b.tipo === 'deuda' && !b.desde) b.desde = U.today();
      if (b.cuota === 0 && !s) b.cuota = '';
      // ahorro con meta y fecha: lo pide al crear una meta desde Metas
      b.conMeta = s ? (s.tipo === 'ahorro' && s.meta > 0 && !!s.hasta) : d.conMeta === '1';
      b.porPct = Number(b.pct) > 0; b.pct = b.pct ? String(b.pct) : '';
      if (b.conMeta && !s) { b.meta = ''; b.hasta = ''; b.icono = '🎯'; }
      return Object.assign(b, { esp: d.esp || (App.espacioPrincipal() || {}).id, id: d.id || '' });
    },
    alEscribir: (h) => { const el = document.getElementById('prev-aporte'); if (el) el.innerHTML = vistaAporte(h); },
    render: (h) => {
      const e = App.espacio(h.esp);
      const fA = U.frec(h.frecAporte || App.state.ajustes.frecIngreso);
      const esGasto = h.tipo === 'gasto' || h.tipo === 'limite';
      let y = '';
      if (!h.id && App.state.espacios.length > 1) y += '<div class="etq" style="margin-top:0">Espacio</div><div class="chips">' + App.state.espacios.map((x) => chip(h.esp === x.id, 'sobre-esp', 'data-v="' + x.id + '"', U.esc(x.icono) + ' ' + U.esc(x.nombre))).join('') + '</div>';
      y += '<label class="campo"><span>Nombre</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="Ej. Comida, Renta, Auto" maxlength="30"></label>';
      if (h.tipo === 'tarjeta') y += '<p class="nota">' + App.TIPO_TARJETA.desc + '</p>';
      else {
        y += '<div class="etq">Tipo</div><div class="chips wrap">' + Object.keys(App.TIPOS_SOBRE).map((k) => chip(h.tipo === k, 'sobre-tipo', 'data-v="' + k + '"', App.TIPOS_SOBRE[k].nombre)).join('') + '</div>';
        y += '<p class="nota">' + App.TIPOS_SOBRE[h.tipo].desc + '</p>';
      }
      if (esGasto) {
        y += '<div class="etq">' + (h.tipo === 'limite' ? '¿Cuánto puedes gastar y cada cuánto?' : h.fechaPago ? '¿Cuánto pagas y cada cuánto?' : '¿Cuánto gastas y cada cuánto?') + '</div>';
        y += '<label class="campo" style="margin-top:0"><span>' + (h.tipo === 'limite' ? 'Tope' : h.fechaPago ? 'Monto del pago' : 'Monto') + '</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"></label>';
        y += App.tabsFrec('se-frec-pago', U.frec(h.frecPago));
        { const nD = U.diasCustom(h.frecPago);
          y += '<label class="campo campo-dias' + (nD ? ' on' : '') + '"><span>📆 O cada cuántos días (ej. 3, 20, 30)</span><input inputmode="numeric" data-dias="1" value="' + (nD || '') + '" placeholder="Escribe los días"></label>'; }
        if (h.tipo === 'limite') {
          // un tope es un máximo para gastar, no un pago con fecha
          y += '<p class="nota">Puedes gastar hasta ' + (num(h.cuota) > 0 ? U.money0(num(h.cuota)) : 'el tope') + ' ' + U.FREC_CADA[U.frec(h.frecPago)] + '. Te aviso si te acercas o te pasas.</p>';
        } else {
          y += '<div class="dos"><label class="campo"><span>Fecha de pago (opcional)</span><input type="date" data-m="fechaPago" data-render="1" value="' + U.esc(h.fechaPago || '') + '"></label>' +
            (h.fechaPago ? '<label class="campo"><span>Avisarme</span><select data-m="avisar">' + [0, 1, 2, 3, 5, 7].map((n) => '<option value="' + n + '" ' + (String(h.avisar) === String(n) ? 'selected' : '') + '>' + (n === 0 ? 'El mismo día' : n + (n === 1 ? ' día antes' : ' días antes')) + '</option>').join('') + '</select></label>' : '<div></div>') + '</div>';
          y += '<p class="nota">' + (h.fechaPago ? 'Se repite ' + U.FREC_CADA[U.frec(h.frecPago)] + ' desde esa fecha. Te aviso antes y se aparta poco a poco para que llegues completo.' : 'Sin fecha: es lo que planeas gastar ' + U.FREC_CADA[U.frec(h.frecPago)] + '. Ponle fecha si es un pago (renta, colegiatura, gym).') + '</p>';
        }
      } else if (h.tipo === 'ahorro') {
        y += '<div class="seg" style="margin-top:14px">' + [['1', '🎯 Meta con fecha'], ['0', '💵 Cantidad fija']].map(([v, t]) => '<button class="' + ((h.conMeta ? '1' : '0') === v ? 'on' : '') + '" data-a="se-conmeta" data-v="' + v + '">' + t + '</button>').join('') + '</div>';
        if (h.conMeta) {
          const hoy = U.today();
          y += '<div class="dos"><label class="campo"><span>¿Cuánto quieres juntar?</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="Ej. 5000"></label>' +
            '<label class="campo"><span>¿Para cuándo?</span><input type="date" data-m="hasta" data-render="1" min="' + U.addDays(hoy, 1) + '" value="' + U.esc(h.hasta || '') + '"></label></div>';
          y += '<div class="chips" style="margin-top:10px">' + [[1, 'En 1 mes'], [3, '3 meses'], [6, '6 meses'], [12, '1 año']].map(([m, t]) => chip(h.hasta === U.addMonths(hoy, m), 'se-plazo', 'data-v="' + m + '"', t)).join('') + '</div>';
          y += '<div class="sub-etq">Cada cuánto apartas</div>' + App.tabsFrec('se-frec-aporte', fA);
          y += '<div class="calc-aporte" id="prev-aporte">' + vistaAporte(h) + '</div>';
          y += '<p class="nota">Se calcula solo y se ajusta cada día: si un día guardas más o menos, se reparte lo que falte entre los días que quedan. La meta aparece en Metas con su barra.</p>';
        } else {
          y += '<div class="etq">¿Cuánto guardar y cada cuánto?</div>';
          y += '<label class="campo" style="margin-top:0"><span>Cantidad</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"></label>';
          y += App.tabsFrec('se-frec-aporte', fA);
          y += '<label class="campo"><span>Meta (opcional)</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="Ej. 10000"><small>Siempre guardas lo mismo. Si quieres que te calcule cuánto guardar para una fecha, elige "Meta con fecha".</small></label>';
          y += '<div class="calc-aporte" id="prev-aporte">' + vistaAporte(h) + '</div>';
        }
      } else if (h.tipo === 'deuda') {
        y += '<label class="campo"><span>Total a juntar</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="$0"></label>';
        y += '<div class="dos"><label class="campo"><span>Desde</span><input type="date" data-m="desde" data-render="1" value="' + U.esc(h.desde || U.today()) + '"></label><label class="campo"><span>Fecha límite</span><input type="date" data-m="hasta" data-render="1" value="' + U.esc(h.hasta || '') + '"></label></div>';
      } else if (h.tipo === 'porIngreso') {
        const pct = !!h.porPct;
        y += '<div class="seg" style="margin-top:14px"><button class="' + (!pct ? 'on' : '') + '" data-a="se-porpct" data-v="0">💵 Cantidad fija</button><button class="' + (pct ? 'on' : '') + '" data-a="se-porpct" data-v="1">％ Porcentaje</button></div>';
        if (pct) y += '<label class="campo"><span>¿Qué porcentaje de cada ingreso?</span><input inputmode="decimal" data-m="pct" value="' + U.esc(h.pct || '') + '" placeholder="Ej. 10"><small>Ej. con 10%, si registras un ingreso de $1,000 se apartan $100.</small></label>';
        else y += '<label class="campo"><span>¿Cuánto apartar cada vez que entra dinero?</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"><small>Se aparta esa cantidad con cada ingreso que registres en este espacio.</small></label>';
        y += '<label class="campo"><span>Meta (opcional)</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="Ej. 10000"><small>Aparece en Metas con su barra de progreso.</small></label>';
      }
      if (esGasto || h.tipo === 'deuda' || h.tipo === 'tarjeta') {
        y += '<div class="etq">Aporte: cada cuánto apartas</div>';
        y += App.tabsFrec('se-frec-aporte', fA, '', h.tipo === 'tarjeta' ? ['diario', 'semanal', 'quincenal', 'mensual'] : null);
        y += '<div class="calc-aporte" id="prev-aporte">' + vistaAporte(h) + '</div>';
        if (h.tipo !== 'tarjeta') {
          y += '<label class="interruptor"><div class="txt"><b>Poner la cantidad a mano</b><small>Si prefieres apartar otra cantidad</small></div><span class="sw"><input type="checkbox" data-m="manual" data-render="1" ' + (h.manual ? 'checked' : '') + '><i></i></span></label>';
          if (h.manual) y += '<label class="campo"><span>Cantidad ' + U.FREC_CADA[fA] + '</span><input inputmode="decimal" data-m="aporteManual" value="' + U.esc(h.aporteManual) + '" placeholder="$0"></label>';
        } else y += '<p class="nota">Si no eliges, usa cada cuánto recibes dinero (Ajustes).</p>';
      }
      if (h.tipo === 'limite' && e) {
        y += '<label class="campo"><span>Al terminar cada periodo, lo que sobre pasa a…</span><select data-m="sobranteA"><option value="">Se queda en el sobre</option>' +
          e.sobres.filter((s) => s.id !== h.id && s.tipo !== 'tarjeta').map((s) => '<option value="' + s.id + '" ' + (h.sobranteA === s.id ? 'selected' : '') + '>' + U.esc(s.icono + ' ' + s.nombre) + '</option>').join('') + '</select></label>';
      }
      if (esGasto) y += '<label class="campo"><span>' + I.bell + ' Avisarme cuando quede poco</span>' + selAlerta(h.alerta, App.state.ajustes.alertaSobre, 'data-m="alerta"') + '<small>' + (h.fechaPago ? 'En pagos con fecha solo te aviso si te pasas.' : 'Te aviso al registrar un gasto y en "Para ti".') + '</small></label>';
      y += emojiPicker(h.icono);
      if (h.tipo !== 'tarjeta') y += '<label class="interruptor"><div class="txt"><b>Cuenta como disponible</b><small>Actívalo si este dinero lo puedes gastar en lo que quieras (como Ocio).</small></div><span class="sw"><input type="checkbox" data-m="disponible" ' + (h.disponible ? 'checked' : '') + '><i></i></span></label>';
      y += '<button class="btn" data-a="sobre-guardar">' + I.check + 'Guardar</button>';
      if (h.id) y += '<button class="btn peligro" data-a="sobre-borrar">' + I.trash + 'Eliminar sobre</button>';
      return y;
    }
  };

  /* ---------- Cuentas ---------- */
  H.cuentas = {
    titulo: 'Cuentas',
    render: () => {
      const c = App.calc();
      let y = '<p class="nota" style="margin-top:0">Las <b>cuentas</b> son dónde está tu dinero: banco, efectivo, apps… y tus tarjetas de crédito.</p>';
      App.state.cuentas.forEach((ct) => {
        const v = c.cuentas[ct.id];
        const sub = App.esCredito(ct) ? 'Tarjeta de crédito' + (v < -0.004 ? ' · debes ' + U.money0(-v) : '') : ct.partes && c.partes[ct.id] ? 'Billetes ' + U.money0(c.partes[ct.id].b) + ' · Monedas ' + U.money0(c.partes[ct.id].m) : '';
        y += '<button class="fila" data-a="hoja" data-h="cuenta-editar" data-id="' + ct.id + '" data-apilar="1"><div class="ico">' + U.esc(ct.icono) + '</div><div class="txt"><b>' + U.esc(ct.nombre) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div><div class="der"><b class="num ' + (v < -0.004 ? 'neg' : '') + '">' + U.money(v) + '</b></div>' + I.chev + '</button>';
      });
      y += '<button class="btn" data-a="hoja" data-h="cuenta-editar" data-apilar="1">' + I.plus + ' Nueva cuenta</button>';
      y += '<button class="btn sec" data-a="hoja" data-h="cuenta-editar" data-credito="1" data-apilar="1">💳 Agregar tarjeta de crédito</button>';
      return y;
    }
  };

  H['cuenta-editar'] = {
    titulo: (h) => h.id ? (h.tipo === 'credito' ? 'Editar tarjeta' : 'Editar cuenta') : (h.tipo === 'credito' ? 'Nueva tarjeta de crédito' : 'Nueva cuenta'),
    init: (d) => {
      const c = d.id ? App.cuenta(d.id) : null;
      const credito = c ? App.esCredito(c) : d.credito === '1';
      return {
        id: d.id || '', tipo: credito ? 'credito' : 'normal', nombre: c ? c.nombre : '', icono: c ? c.icono : (credito ? '💳' : '🏦'),
        partes: c ? !!c.partes : false, limite: c && c.limite ? String(c.limite) : '', diaCorte: c && c.diaCorte ? String(c.diaCorte) : '', diaPago: c && c.diaPago ? String(c.diaPago) : '',
        avisar: c && c.avisar !== undefined ? String(c.avisar) : '3', limiteUso: c && c.limiteUso ? String(c.limiteUso) : '', alerta: c && c.alerta !== undefined ? String(c.alerta) : '', saldo: '', saldoB: '', saldoM: '', debe: '', esp: (App.espacioPrincipal() || {}).id
      };
    },
    render: (h) => {
      const credito = h.tipo === 'credito';
      let y = '';
      if (!h.id) y += '<div class="seg" style="margin-bottom:6px"><button class="' + (!credito ? 'on' : '') + '" data-a="cuenta-tipo" data-v="normal">Cuenta</button><button class="' + (credito ? 'on' : '') + '" data-a="cuenta-tipo" data-v="credito">Tarjeta de crédito</button></div>';
      y += '<label class="campo"><span>' + (credito ? 'Banco o nombre de la tarjeta' : 'Nombre') + '</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="' + (credito ? 'Ej. BBVA, Nu, Banamex' : 'Ej. Banco, Efectivo, Revolut') + '" maxlength="30"></label>';
      if (credito) {
        y += '<div class="dos"><label class="campo"><span>Límite de crédito</span><input inputmode="decimal" data-m="limite" value="' + U.esc(h.limite) + '" placeholder="$0"></label>' +
          (h.id ? '<div></div>' : '<label class="campo"><span>¿Cuánto debes hoy?</span><input inputmode="decimal" data-m="debe" value="' + U.esc(h.debe) + '" placeholder="$0"></label>') + '</div>';
        y += '<div class="dos"><label class="campo"><span>Día de corte</span><input inputmode="numeric" data-m="diaCorte" value="' + U.esc(h.diaCorte) + '" placeholder="1 a 31"></label>' +
          '<label class="campo"><span>Día límite de pago</span><input inputmode="numeric" data-m="diaPago" value="' + U.esc(h.diaPago) + '" placeholder="1 a 31"></label></div>';
        y += '<label class="campo"><span>Avisarme antes del pago</span><select data-m="avisar">' + [0, 1, 2, 3, 5, 7].map((n) => '<option value="' + n + '" ' + (String(h.avisar) === String(n) ? 'selected' : '') + '>' + (n === 0 ? 'El mismo día' : n + (n === 1 ? ' día antes' : ' días antes')) + '</option>').join('') + '</select></label>';
        y += '<label class="campo"><span>Límite de uso (opcional)</span><input inputmode="decimal" data-m="limiteUso" value="' + U.esc(h.limiteUso) + '" placeholder="Ej. 300"><small>Lo máximo que quieres deber en esta tarjeta, aunque el banco te preste más.</small></label>';
        y += '<label class="campo"><span>' + I.bell + ' Avisarme cuando quede poco crédito</span>' + selAlerta(h.alerta, App.state.ajustes.alertaTarjeta, 'data-m="alerta"') + '</label>';
        y += '<p class="nota">Lo que compres con ella sale de tu sobre al momento, o si eliges "Pagar poco a poco", se aparta de tus ingresos ' + U.FREC_CADA[App.state.ajustes.frecIngreso] + ' hasta la fecha de pago.' + (!h.id ? ' Lo que ya debes se junta poco a poco.' : '') + '</p>';
      } else {
        y += '<label class="interruptor"><div class="txt"><b>Separar billetes y monedas</b><small>Para efectivo: ves cuánto tienes de cada uno</small></div><span class="sw"><input type="checkbox" data-m="partes" data-render="1" ' + (h.partes ? 'checked' : '') + '><i></i></span></label>';
        if (!h.id) {
          if (h.partes) y += '<div class="dos"><label class="campo"><span>💵 Billetes hoy</span><input inputmode="decimal" data-m="saldoB" value="' + U.esc(h.saldoB) + '" placeholder="$0"></label><label class="campo"><span>🪙 Monedas hoy</span><input inputmode="decimal" data-m="saldoM" value="' + U.esc(h.saldoM) + '" placeholder="$0"></label></div>';
          else y += '<label class="campo"><span>¿Cuánto tienes hoy ahí?</span><input inputmode="decimal" data-m="saldo" value="' + U.esc(h.saldo) + '" placeholder="$0"></label>';
        }
      }
      if (!h.id && App.state.espacios.length > 1) y += '<div class="etq">' + (credito ? 'La deuda es de' : 'Ese dinero es de') + '</div><div class="chips">' + App.state.espacios.map((e) => chip(h.esp === e.id, 'cuenta-esp', 'data-v="' + e.id + '"', U.esc(e.icono) + ' ' + U.esc(e.nombre))).join('') + '</div>';
      y += emojiPicker(h.icono);
      y += '<button class="btn" data-a="cuenta-guardar">' + I.check + 'Guardar</button>';
      if (h.id) y += '<button class="btn peligro" data-a="cuenta-borrar">' + I.trash + (credito ? 'Eliminar tarjeta' : 'Eliminar cuenta') + '</button>';
      return y;
    }
  };

  /* ---------- Cada cuánto recibes dinero ---------- */
  H['frec-ingreso'] = {
    titulo: 'Cada cuánto recibes dinero',
    render: () => {
      const f = App.state.ajustes.frecIngreso;
      let y = '<p class="nota" style="margin-top:0">Cada vez que registras un ingreso, se aparta lo que tus sobres necesitan hasta tu siguiente cobro. También es el aporte de los sobres nuevos y de lo que juntas para tu tarjeta.</p>' +
        App.tabsFrec('frec-ingreso', f, '', ['diario', 'semanal', 'quincenal', 'mensual']);
      // sobres que apartan con otro ritmo distinto a cuando cobras
      const otros = [];
      App.state.espacios.forEach((e) => e.sobres.forEach((s) => { if (s.tipo !== 'tarjeta' && s.tipo !== 'porIngreso' && U.frec(s.frecAporte || f) !== f) otros.push(s); }));
      if (otros.length) {
        y += '<p class="nota">' + otros.length + (otros.length === 1 ? ' sobre aparta' : ' sobres apartan') + ' con otro ritmo (' + otros.slice(0, 4).map((s) => U.esc(s.nombre) + ': ' + U.FREC_TXT[U.frec(s.frecAporte)].toLowerCase()).join(', ') + (otros.length > 4 ? '…' : '') + '). Lo más fácil es que todos aparten igual que como cobras.</p>';
        y += '<button class="btn sec" data-a="aporte-todos">Que todos aparten ' + U.FREC_CADA[f] + '</button>';
      } else y += '<p class="nota">Todos tus sobres apartan ' + U.FREC_CADA[f] + ' ✓</p>';
      return y;
    }
  };

  /* ---------- Pagos recurrentes ---------- */
  H.recurrente = {
    titulo: (h) => h.id ? 'Pago programado' : 'Nuevo pago programado',
    init: (d) => {
      const r = d.id ? App.state.recurrentes.find((x) => x.id === d.id) : null;
      const esp = App.espacioPrincipal();
      return Object.assign({ id: '', nombre: '', monto: '', frecuencia: 'mensual', dia: String(new Date().getDate()), diaSemana: '0', avisar: '3', espacio: esp ? esp.id : '', sobre: '', cuenta: App.ultimaCuenta('gasto') }, r ? JSON.parse(JSON.stringify(r)) : {}, { id: d.id || '' });
    },
    render: (h) => {
      let y = '<label class="campo"><span>Nombre</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="Ej. Colegiatura, Tarjeta de crédito, Renta" maxlength="40"></label>';
      y += '<label class="campo"><span>Monto</span><input inputmode="decimal" data-m="monto" value="' + U.esc(h.monto) + '" placeholder="$0"></label>';
      y += '<div class="etq">Se repite</div><div class="seg">' + [['mensual', 'Cada mes'], ['quincenal', 'Quincena'], ['semanal', 'Cada semana']].map(([k, t]) => '<button class="' + (h.frecuencia === k ? 'on' : '') + '" data-a="rec-frec" data-v="' + k + '">' + t + '</button>').join('') + '</div>';
      if (h.frecuencia === 'mensual') y += '<label class="campo"><span>Día del mes</span><input inputmode="numeric" data-m="dia" value="' + U.esc(h.dia) + '" placeholder="1 a 31"></label>';
      if (h.frecuencia === 'quincenal') y += '<p class="nota">Los días 15 y último de cada mes.</p>';
      if (h.frecuencia === 'semanal') y += '<label class="campo"><span>Día</span><select data-m="diaSemana">' + U.DIAS.map((d, i) => '<option value="' + i + '" ' + (String(h.diaSemana) === String(i) ? 'selected' : '') + '>' + d + '</option>').join('') + '</select></label>';
      y += '<label class="campo"><span>Avisarme antes</span><select data-m="avisar">' + [0, 1, 2, 3, 5, 7].map((n) => '<option value="' + n + '" ' + (String(h.avisar) === String(n) ? 'selected' : '') + '>' + (n === 0 ? 'El mismo día' : n + (n === 1 ? ' día' : ' días') + ' antes') + '</option>').join('') + '</select></label>';
      const e = App.espacio(h.espacio);
      if (App.state.espacios.length > 1) y += '<div class="etq">Espacio</div><div class="chips">' + App.state.espacios.map((x) => chip(h.espacio === x.id, 'rec-esp', 'data-v="' + x.id + '"', U.esc(x.icono) + ' ' + U.esc(x.nombre))).join('') + '</div>';
      y += '<div class="etq">Sale del sobre</div><div class="chips">' + (e ? e.sobres.filter((s) => s.tipo !== 'porIngreso').map((s) => chip(h.sobre === s.id, 'rec-sobre', 'data-v="' + s.id + '"', U.esc(s.icono) + ' ' + U.esc(s.nombre))).join('') : '') + chip(!h.sobre, 'rec-sobre', 'data-v=""', 'Sin sobre') + '</div>';
      y += '<div class="etq">Se paga con</div><div class="chips">' + App.state.cuentas.map((c) => chip(h.cuenta === c.id, 'rec-cuenta', 'data-v="' + c.id + '"', U.esc(c.icono) + ' ' + U.esc(c.nombre))).join('') + '</div>';
      y += '<button class="btn" data-a="rec-guardar">' + I.check + 'Guardar</button>';
      if (h.id) y += '<button class="btn peligro" data-a="rec-borrar">' + I.trash + 'Eliminar</button>';
      return y;
    }
  };

  /* ---------- Nueva meta ---------- */
  H['nueva-meta'] = {
    titulo: 'Nueva meta',
    render: () => {
      let y = '<p class="nota" style="margin-top:0">Una meta es un sobre de ahorro con un objetivo. ¿Qué tipo quieres?</p>';
      [['ahorro', '🎯', 'Ahorrar para algo', 'Ej. viaje, celular, auto. Pones cuánto y para cuándo, y te digo cuánto guardar.'],
        ['deuda', '📅', 'Pagar algo en una fecha', 'Ej. una deuda o colegiatura. El aporte se calcula solo.'],
        ['porIngreso', '📈', 'Por cada ingreso', 'Ej. reinvertir en tu negocio cada vez que cobras.']].forEach(([t, ic, ti, de]) => {
        y += '<button class="fila" data-a="hoja" data-h="sobre-editar" data-tipoinicial="' + t + '"' + (t === 'ahorro' ? ' data-meta="1"' : '') + ' data-apilar="1"><div class="ico">' + ic + '</div><div class="txt"><b>' + ti + '</b><small style="white-space:normal">' + de + '</small></div>' + I.chev + '</button>';
      });
      return y;
    }
  };

  /* ---------- Límite de uso de una tarjeta (desde Registrar) ---------- */
  H['limite-tarjeta'] = {
    titulo: 'Límite de uso',
    init: (d) => { const ct = App.cuenta(d.id) || {}; return { id: d.id, limiteUso: ct.limiteUso ? String(ct.limiteUso) : '', alerta: ct.alerta !== undefined ? String(ct.alerta) : '' }; },
    render: (h) => {
      const ct = App.cuenta(h.id); if (!ct) return '';
      const x = App.usoTarjeta(ct);
      let y = '<p class="nota" style="margin-top:0">' + U.esc(ct.icono + ' ' + ct.nombre) + ': debes <b class="num">' + U.money(x.debe) + '</b>' + (Number(ct.limite) > 0 ? ' de ' + U.money0(ct.limite) + ' que te presta el banco' : '') + '.</p>';
      y += '<label class="campo"><span>¿Hasta cuánto quieres deber?</span><input inputmode="decimal" data-m="limiteUso" value="' + U.esc(h.limiteUso) + '" placeholder="Sin límite propio"><small>Déjalo vacío para usar solo el límite del banco.</small></label>';
      if (Number(ct.limite) > 0) y += '<div class="chips">' + [0.3, 0.5, 0.8].map((f) => { const v = String(Math.round(ct.limite * f)); return chip(h.limiteUso === v, 'lim-chip', 'data-v="' + v + '"', Math.round(f * 100) + '% · ' + U.money0(v)); }).join('') + '</div>';
      y += '<label class="campo"><span>' + I.bell + ' Avisarme cuando quede poco</span>' + selAlerta(h.alerta, App.state.ajustes.alertaTarjeta, 'data-m="alerta"') + '</label>';
      y += '<button class="btn" data-a="lim-guardar">' + I.check + 'Guardar</button>';
      return y;
    }
  };

  /* ---------- Alertas ---------- */
  /* Campanita: los mismos avisos de "Para ti" y las notificaciones del celular */
  H.avisos = {
    titulo: 'Notificaciones',
    render: () => {
      const a = App.state.ajustes; const c = App.calc();
      const avisos = App.avisos(c);
      let y = avisos.length ? avisos.join('') : '<div class="nota" style="text-align:center;padding:18px 0">🔔 Todo en orden. No tienes avisos por ahora.</div>';
      y += '<div class="etq" style="margin-top:22px">Notificaciones del celular</div>';
      const soporta = 'Notification' in window;
      if (!soporta) y += '<p class="nota">En iPhone primero agrega la app a tu pantalla de inicio (Compartir → Agregar a inicio) y ábrela desde ahí. Necesitas iOS 16.4 o más nuevo.</p>';
      else if (Notification.permission === 'denied') y += '<p class="nota cuidado">Las notificaciones están bloqueadas. Actívalas en Ajustes del iPhone → Notificaciones → esta app.</p>';
      else if (Notification.permission !== 'granted') y += '<button class="btn" data-a="notif-activar">🔔 Activar notificaciones</button>';
      const sw = (k, t, sub) => '<label class="interruptor"><div class="txt"><b>' + t + '</b><small>' + sub + '</small></div><span class="sw"><input type="checkbox" data-sw="' + k + '" ' + (a[k] !== false ? 'checked' : '') + '><i></i></span></label>';
      if (soporta && Notification.permission === 'granted') {
        y += sw('notifPagos', '💳 Pagos que se acercan', 'Tarjeta, renta, suscripciones: 2 días antes, 1 día antes y el mismo día') +
          sw('notifCuadre', '🌙 Recordatorio de cuadre', 'Si a esa hora no has cuadrado tu dinero') +
          sw('notifPasado', '⚠️ Te pasaste de un sobre', 'Una vez por sobre, cuando te pasas de lo planeado') +
          sw('notifLibre', '✨ Dinero sin repartir', 'Si hay dinero libre y a tus sobres les falta (cuando no se reparte solo)');
      }
      y += '<div class="etq">Hora del cuadre</div><div class="chips">' + [20, 21, 22].map((hr) => chip(Number(a.horaCuadre || 21) === hr, 'hora-cuadre', 'data-v="' + hr + '"', App.horaTxt(hr))).join('') + '</div>';
      y += '<p class="nota">Sin servidor, las notificaciones salen cuando abres la app o mientras la tienes abierta (aunque estés en otra pantalla). No se repiten: cada aviso llega una sola vez.</p>';
      return y;
    }
  };

  H.alertas = {
    titulo: 'Alertas',
    init: () => ({ sobreP: String(App.state.ajustes.alertaSobre), tarjetaP: String(App.state.ajustes.alertaTarjeta) }),
    alEscribir: (h, el) => {
      const k = el.dataset.m === 'sobreP' ? 'alertaSobre' : el.dataset.m === 'tarjetaP' ? 'alertaTarjeta' : '';
      const n = parseInt(el.value, 10);
      if (k && n >= 1 && n <= 95) { App.state.ajustes[k] = n; App.save(); }
    },
    render: (h) => {
      const S = App.state; const a = S.ajustes; const c = App.calc();
      const sw = (k, t, sub) => '<label class="interruptor"><div class="txt"><b>' + t + '</b><small>' + sub + '</small></div><span class="sw"><input type="checkbox" data-sw="' + k + '" ' + (a[k] !== false ? 'checked' : '') + '><i></i></span></label>';
      let y = sw('alertas', 'Avisarme antes de quedarme sin dinero', 'Al registrar un gasto y en "Para ti"');
      if (a.alertas === false) return y + sw('sonidos', 'Sonidos', 'Al gastar, al recibir dinero y en alertas') + sw('vibracion', 'Vibración', 'Al guardar y en alertas');
      const bloque = (titulo, k, campo, desc) => '<div class="etq">' + titulo + '</div><div class="chips">' + ['10', '20', '30', '50'].map((p) => chip(String(a[k]) === p, 'al-gen', 'data-k="' + k + '" data-c="' + campo + '" data-v="' + p + '"', p + '%')).join('') + '</div>' +
        '<label class="campo"><span>O escribe tu %</span><input inputmode="numeric" data-m="' + campo + '" value="' + U.esc(h[campo]) + '" placeholder="20" maxlength="2"><small>' + desc + '</small></label>';
      y += bloque('Sobres: avisar cuando quede', 'alertaSobre', 'sobreP', 'Ej. con 20%, si tu sobre es de $500 a la semana te aviso cuando queden $100. Si te pasas, siempre te aviso.');
      if (S.cuentas.some(App.esCredito)) y += bloque('Tarjetas: avisar cuando quede de crédito', 'alertaTarjeta', 'tarjetaP', 'Cuenta tu límite de uso si lo pusiste; si no, el del banco.');
      const sobres = [];
      S.espacios.forEach((e) => e.sobres.forEach((s) => { if (s.tipo === 'gasto' || s.tipo === 'limite') sobres.push([e, s]); }));
      if (sobres.length) {
        y += '<div class="etq">Cada sobre</div><div class="lista-al">';
        sobres.forEach(([e, s]) => {
          const st = c.sob[s.id];
          y += '<div class="fila-al"><div class="txt"><b>' + U.esc(s.icono + ' ' + s.nombre) + '</b><small>' + (st && st.M > 0 ? U.money0(st.M) + ' ' + U.FREC_POR[U.frec(s.frecPago)] + (s.fechaPago ? ' · pago con fecha' : '') : 'Sin monto') + '</small></div>' + selAlerta(s.alerta, a.alertaSobre, 'data-al="sobre" data-esp="' + e.id + '" data-id="' + s.id + '"') + '</div>';
        });
        y += '</div>';
      }
      const tarjetas = S.cuentas.filter(App.esCredito);
      if (tarjetas.length) {
        y += '<div class="etq">Cada tarjeta</div><div class="lista-al">';
        tarjetas.forEach((ct) => {
          const x = App.usoTarjeta(ct, c);
          y += '<div class="fila-al"><div class="txt"><b>' + U.esc(ct.icono + ' ' + ct.nombre) + '</b><small>' + (x.L > 0 ? 'Quedan ' + U.money0(x.disp) + ' de ' + U.money0(x.L) + (x.propio ? ' (tu límite)' : '') : 'Sin límite') + '</small></div>' + selAlerta(ct.alerta, a.alertaTarjeta, 'data-al="cuenta" data-id="' + ct.id + '"') + '</div>';
        });
        y += '</div><p class="nota">Para poner un límite de uso: Cuentas → tu tarjeta, o al registrar un gasto con ella.</p>';
      }
      y += '<div class="etq">Sonido y vibración</div>' + sw('sonidos', 'Sonidos', 'Al gastar, al recibir dinero y en alertas. Respeta el modo silencio.') + sw('vibracion', 'Vibración', 'Al guardar y en alertas. En iPhone necesita iOS 18 o más nuevo.');
      y += '<button class="btn sec" data-a="probar-sonidos">🔊 Probar sonidos</button>';
      return y;
    }
  };

  /* ---------- Perfil, fondo ---------- */
  H.perfil = {
    titulo: 'Nombre',
    init: () => ({ nombre: App.state.perfil.nombre || '' }),
    render: (h) => '<label class="campo"><span>¿Cómo te llamas?</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" maxlength="30"></label><button class="btn" data-a="perfil-guardar">' + I.check + 'Guardar</button>'
  };
  H.fondo = {
    titulo: 'Fondo',
    render: () => {
      const actual = App.state.ajustes.fondo;
      const prev = { aurora: 'radial-gradient(circle at 20% 20%,#5b3cc4,transparent 60%),radial-gradient(circle at 80% 40%,#1f6fd1,transparent 60%),#000', oceano: 'radial-gradient(circle at 20% 20%,#0d6e8a,transparent 60%),radial-gradient(circle at 80% 40%,#1d4fbf,transparent 60%),#000', brasa: 'radial-gradient(circle at 20% 20%,#b5402a,transparent 60%),radial-gradient(circle at 80% 40%,#c77a1e,transparent 60%),#000', bosque: 'radial-gradient(circle at 20% 20%,#1f7a4f,transparent 60%),radial-gradient(circle at 80% 40%,#3c6e2a,transparent 60%),#000', grafito: 'radial-gradient(circle at 20% 20%,#4a4d57,transparent 60%),radial-gradient(circle at 80% 40%,#2f3440,transparent 60%),#000', negro: '#000', planetas: 'radial-gradient(circle at 78% 26%,#7fc4ff 0,#2a6fd6 13%,#0d2f6e 22%,transparent 23%),radial-gradient(circle at 30% 70%,#e0b98a 0,#9c6b3c 8%,transparent 9%),radial-gradient(1px 1px at 20% 30%,#fff,transparent),radial-gradient(1px 1px at 60% 80%,#fff,transparent),radial-gradient(1px 1px at 45% 15%,#fff,transparent),radial-gradient(1px 1px at 85% 60%,#fff,transparent),radial-gradient(ellipse at 70% 10%,#14254d,#000 70%)' };
      return '<p class="nota" style="margin-top:0">Cada sección mueve el fondo un poco para que se sienta distinta. En <b>Planetas</b>, cada sección tiene su propio planeta.</p><div class="dos" style="gap:12px;margin-top:12px">' +
        App.FONDOS.map((f) => '<button data-a="fondo" data-v="' + f.id + '" style="height:110px;border-radius:18px;background:' + prev[f.id] + ';border:2px solid ' + (f.id === actual ? '#fff' : 'rgba(255,255,255,.1)') + ';display:flex;align-items:flex-end;padding:10px;font-weight:600">' + f.nombre + (f.nuevo ? ' <small class="pill-nuevo">Nuevo</small>' : '') + '</button>').join('') + '</div>';
    }
  };

  /* ---------- Código ---------- */
  H.pin = {
    titulo: 'Bloqueo con código',
    init: () => ({ paso: App.state.ajustes.pin ? 'activo' : 'nuevo', p1: '', p2: '' }),
    render: (h) => {
      if (h.paso === 'activo') return '<p class="nota" style="margin-top:0">La app pide tu código de 4 números al abrirla y después de un minuto en segundo plano.</p>' +
        '<button class="btn sec" data-a="pin-cambiar">Cambiar código</button><button class="btn peligro" data-a="pin-quitar">Quitar bloqueo</button>';
      const actual = h.paso === 'nuevo' ? h.p1 : h.p2;
      return '<p style="text-align:center;color:var(--text-2)">' + (h.paso === 'nuevo' ? 'Escribe un código de 4 números' : 'Escríbelo otra vez') + '</p>' +
        '<div class="bloqueo" style="position:static;background:none;padding:0"><div class="puntos">' + [0, 1, 2, 3].map((i) => '<i class="' + (i < actual.length ? 'on' : '') + '"></i>').join('') + '</div></div>' +
        '<div class="teclado">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k) => k ? '<button data-a="pin-set" data-k="' + k + '">' + (k === 'del' ? I.del : k) + '</button>' : '<span></span>').join('') + '</div>' +
        '<p class="nota" style="text-align:center">Si lo olvidas, tendrás que borrar los datos de la app. Guarda una copia de seguridad.</p>';
    }
  };

  /* ---------- Copia de seguridad ---------- */
  H.respaldo = {
    titulo: 'Copia de seguridad',
    render: () => '<p class="nota" style="margin-top:0">Guarda un archivo con todos tus datos (en Archivos, iCloud, Drive o mándatelo por WhatsApp). Si cambias de teléfono o borras la app, lo recuperas con "Importar".</p>' +
      '<button class="btn" data-a="exportar">' + I.download + ' Guardar copia</button>' +
      '<button class="btn sec" data-a="importar">' + I.upload + ' Importar copia</button>' +
      '<p class="nota">Importar reemplaza los datos actuales de este teléfono.</p>'
  };

  /* ---------- Google Sheets ---------- */
  H.sync = {
    titulo: 'Respaldo en Google Sheets',
    init: () => ({ url: App.state.ajustes.syncUrl || '' }),
    render: (h) => {
      const a = App.state.ajustes;
      let y = '<p class="nota" style="margin-top:0">Opcional. Cada vez que tengas internet, la app copia tus movimientos a una hoja de Google tuya. También recibe los pagos de Apple Pay en la Bandeja.</p>';
      y += '<label class="campo"><span>Enlace de tu aplicación web de Google</span><input data-m="url" value="' + U.esc(h.url) + '" placeholder="https://script.google.com/macros/s/…/exec" autocapitalize="off" autocorrect="off"></label>';
      y += '<button class="btn" data-a="sync-guardar">' + I.check + (a.syncUrl ? 'Guardar y sincronizar' : 'Conectar') + '</button>';
      if (a.syncUrl) y += '<button class="btn sec" data-a="sync-quitar">Desconectar</button><p class="nota">' + (a.ultimaSync ? 'Última sincronización: ' + U.fechaRel(U.ymd(new Date(a.ultimaSync))) + ' ' + U.hora(a.ultimaSync) : 'Aún no se ha sincronizado.') + (App.sync && App.sync.pendientes() ? ' · ' + App.sync.pendientes() + ' pendientes' : '') + '</p>';
      y += '<div class="seccion"><div class="seccion-titulo"><h2>Cómo conectarla (10 minutos, en computadora)</h2></div><ol class="pasos">' +
        '<li>Crea una hoja nueva en <b>sheets.google.com</b>.</li>' +
        '<li>Ve a <b>Extensiones → Apps Script</b>.</li>' +
        '<li>Borra lo que haya y pega el código de <b>respaldo</b> (botón de abajo para copiarlo).</li>' +
        '<li>Toca <b>Implementar → Nueva implementación</b>, tipo <b>Aplicación web</b>, "Ejecutar como: yo" y "Quién tiene acceso: <b>Cualquier usuario</b>".</li>' +
        '<li>Autoriza los permisos y copia el enlace que termina en <b>/exec</b>.</li>' +
        '<li>Pégalo arriba y toca <b>Conectar</b>.</li></ol>' +
        '<button class="btn sec" data-a="copiar-script">Copiar código de respaldo</button>' +
        '<p class="nota">No compartas ese enlace: quien lo tenga puede escribir en tu hoja.</p></div>';
      return y;
    }
  };

  /* ---------- Instalar ---------- */
  H.instalar = {
    titulo: 'Instalar en tu teléfono',
    render: () => '<div class="seccion" style="margin-top:0"><div class="seccion-titulo"><h2>iPhone</h2></div><ol class="pasos">' +
      '<li>Abre esta página en <b>Safari</b>.</li><li>Toca el botón <b>Compartir</b> (cuadro con flecha hacia arriba).</li>' +
      '<li>Elige <b>Agregar a pantalla de inicio</b> y toca <b>Agregar</b>.</li><li>Ábrela siempre desde el ícono. Funciona sin internet.</li></ol></div>' +
      '<div class="seccion"><div class="seccion-titulo"><h2>Android</h2></div><ol class="pasos">' +
      '<li>Abre esta página en <b>Chrome</b>.</li><li>Toca el menú <b>⋮</b> y elige <b>Instalar app</b> (o "Agregar a pantalla principal").</li><li>Ábrela desde el ícono.</li></ol></div>' +
      '<p class="nota">Importante: los datos se guardan en la app instalada. Si la abres desde el navegador, verás otros datos. Usa siempre el ícono.</p>' +
      (App.instalable ? '<button class="btn" data-a="instalar-ya">' + I.download + ' Instalar ahora</button>' : '')
  };

  /* ---------- Atajos (gasto rápido y Apple Pay) ---------- */
  H.atajo = {
    titulo: 'Atajos del iPhone',
    render: () => {
      const url = App.state.ajustes.syncUrl;
      if (!url) return '<p class="nota" style="margin-top:0">Para usar atajos (gasto rápido desde el Centro de control y Apple Pay automático), primero conecta el <b>Respaldo en Google Sheets</b>.</p><button class="btn" data-a="hoja" data-h="sync" data-apilar="1">Conectar Google Sheets</button>';
      const sobres = [];
      App.state.espacios.forEach((e) => e.sobres.forEach((x) => { if (x.tipo !== 'porIngreso' && x.tipo !== 'tarjeta') sobres.push(x.nombre); }));
      sobres.push('Sin sobre');
      const cuentas = [];
      App.state.cuentas.forEach((c) => { if (c.partes) { cuentas.push(c.nombre + ' (billetes)'); cuentas.push(c.nombre + ' (monedas)'); } else cuentas.push(c.nombre); });
      return '<p class="nota" style="margin-top:0">Los atajos guardan cada gasto en tu iPhone (aunque no tengas señal) y lo mandan a tu hoja cuando hay internet. Al abrir la app, los gastos con sobre se registran solos y los de Apple Pay te aparecen en <b>Para ti</b>.</p>' +
        '<div class="etq">Tu enlace</div><code class="url">' + U.esc(url) + '</code><button class="btn sec" data-a="copiar" data-v="' + U.esc(url) + '">Copiar enlace</button>' +
        '<div class="etq">Sobres para el atajo (escríbelos igual)</div><code class="url">' + U.esc(sobres.join('\n')).replace(/\n/g, '<br>') + '</code><button class="btn sec" data-a="copiar" data-v="' + U.esc(sobres.join('\n')) + '">Copiar sobres</button>' +
        '<div class="etq">Cuentas para el atajo</div><code class="url">' + U.esc(cuentas.join('\n')).replace(/\n/g, '<br>') + '</code><button class="btn sec" data-a="copiar" data-v="' + U.esc(cuentas.join('\n')) + '">Copiar cuentas</button>' +
        '<p class="nota">No compartas tu enlace: quien lo tenga puede escribir en tu hoja.</p>';
    }
  };

  /* ---------- Resumen semanal ---------- */
  H.resumen = {
    titulo: 'Tu semana pasada',
    render: () => {
      const ini = U.addDays(U.weekStart(U.today()), -7);
      const r = App.resumenSemana(ini);
      let y = '<p class="nota" style="margin-top:0">' + U.fechaCorta(r.ini) + ' – ' + U.fechaCorta(r.fin) + '</p>';
      y += '<div class="mini-totales" style="margin-top:6px"><div><span>Ingresos</span><b class="num pos">' + U.money0(r.flujo.ing) + '</b></div><div><span>Gastos</span><b class="num">' + U.money0(r.flujo.gas) + '</b></div><div><span>Ahorraste</span><b class="num">' + U.money0(r.ahorrado) + '</b></div></div>';
      y += '<p style="margin-top:16px;font-size:17px">' + (r.flujo.neto >= 0 ? '👍 Te quedaron ' + U.money0(r.flujo.neto) + ' más de lo que gastaste.' : '👀 Gastaste ' + U.money0(-r.flujo.neto) + ' más de lo que entró.') + '</p>';
      if (r.top.length) y += '<div class="seccion"><div class="seccion-titulo"><h2>En qué gastaste más</h2></div>' + r.top.map((o) => '<div class="fila"><div class="ico">' + U.esc(o.s.icono) + '</div><div class="txt"><b>' + U.esc(o.s.nombre) + '</b><small>' + (o.planeado ? 'de ' + U.money0(o.planeado) + ' planeados' : '') + '</small></div><div class="der"><b class="num ' + (o.x.estado === 'pasado' ? 'neg' : '') + '">' + U.money(o.x.gastadoSemana) + '</b></div></div>').join('') + '</div>';
      y += '<p class="nota">' + (r.pasados.length ? 'Te pasaste en: ' + r.pasados.map((o) => o.s.nombre).join(', ') + '.' : 'Ningún sobre en rojo. ¡Bien!') + ' ' + (r.total - r.pasados.length) + ' de ' + r.total + ' sobres en verde o amarillo.</p>';
      y += '<button class="btn" data-a="resumen-ok">Listo</button>';
      return y;
    }
  };

  /* ---------- Borrar todo ---------- */
  H.borrar = {
    titulo: 'Borrar todos mis datos',
    init: () => ({ txt: '' }),
    render: (h) => '<p class="nota" style="margin-top:0">Esto borra cuentas, sobres y movimientos de este teléfono. No se puede deshacer. Guarda antes una copia de seguridad.</p>' +
      '<button class="btn sec" data-a="exportar">' + I.download + ' Guardar copia primero</button>' +
      '<label class="campo"><span>Escribe BORRAR para confirmar</span><input data-m="txt" value="' + U.esc(h.txt) + '" autocapitalize="characters"></label>' +
      '<button class="btn peligro" data-a="borrar-todo">' + I.trash + ' Borrar todo</button>'
  };
})();
