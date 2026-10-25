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
  const faltaTxt = (st) => (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' ✓');
  const descSobre = (s, st) => {
    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      if (s.fechaPago) return 'Pago de ' + U.money0(st.M) + ' el ' + U.fechaCorta(st.venc) + ' · llevas ' + U.money0(Math.max(0, st.saldo)) + faltaTxt(st);
      return 'Gastado ' + U.money0(st.gastadoCiclo) + ' de ' + U.money0(st.M) + ' ' + U.FREC_ESTE[U.frec(s.frecPago)] + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : '');
    }
    if (s.tipo === 'deuda') return 'Aporte ' + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' · cubierto ✓');
    if (s.tipo === 'ahorro') return (s.meta > 0 ? 'Meta ' + U.money0(s.meta) + ' · ' : '') + U.money0(st.cuota) + U.FREC_POR[st.frecAporte] + faltaTxt(st);
    if (s.tipo === 'tarjeta') return st.saldo < -0.004 ? 'Falta juntar ' + U.money0(-st.saldo) + (st.venc ? ' · pago ' + U.fechaCorta(st.venc) : '') + (st.falta > 0 ? ' · hoy ' + U.money0(st.falta) : '') : 'Al corriente ✓';
    return U.money0(s.cuota) + ' por cada ingreso' + (s.meta > 0 ? ' · meta ' + U.money0(s.meta) : '');
  };
  App.descSobre = descSobre;

  /* Resumen corto de cómo está configurado un sobre */
  const resumenSobre = (s) => {
    const fA = U.frec(s.frecAporte || App.state.ajustes.frecIngreso);
    if (s.tipo === 'deuda') return 'Pago único · ' + U.money0(s.meta) + (s.hasta ? ' para el ' + U.fechaCorta(s.hasta) : '');
    if (s.tipo === 'porIngreso') return U.money0(s.cuota) + ' por ingreso';
    if (s.tipo === 'ahorro') return 'Ahorro · ' + (s.meta > 0 && s.hasta ? 'meta ' + U.money0(s.meta) + ' para el ' + U.fechaCorta(s.hasta) : U.money0(s.cuota) + ' ' + U.FREC_CADA[fA]);
    if (s.tipo === 'tarjeta') return 'Pago de tarjeta · aporte ' + U.FREC_CADA[fA];
    return (s.tipo === 'limite' ? 'Tope ' : '') + U.money0(s.cuota) + ' ' + U.FREC_CADA[U.frec(s.frecPago)] + (s.fechaPago ? ' · paga el ' + U.fechaCorta(U.siguienteVenc(s.frecPago, s.fechaPago, U.today())) : '');
  };
  App.resumenSobre = resumenSobre;

  /* Sobre armado con lo que hay en la hoja de edición (para calcular el aporte en vivo) */
  const sobreDeHoja = (h) => ({
    id: h.id || 'nuevo', nombre: h.nombre, tipo: h.tipo, cuota: num(h.cuota), meta: num(h.meta),
    desde: h.tipo === 'deuda' ? (h.desde || U.today()) : '', hasta: h.tipo === 'deuda' || h.tipo === 'ahorro' ? (h.hasta || '') : '',
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
        t += '<small>Próximo pago: ' + U.fechaLarga(p.venc) + '. Llevas ' + U.money(lleva) + ' de ' + U.money(s.cuota) + '.' + (p.falta > 0 ? ' Por ahora faltan ' + U.money(p.falta) + '.' : '') + '</small>';
      } else if (Math.abs(p.cuota - p.constante) > 0.5 && p.falta > 0) t += '<small>Esta vez: ' + U.money(p.falta) + ', por lo que queda ' + U.FREC_ESTE[s.frecPago] + '.</small>';
      return t;
    }
    if (s.tipo === 'deuda') {
      if (!(s.meta > 0 && s.hasta)) return 'Pon el total y la fecha límite para calcular el aporte.';
      if (h.manual) return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + '.';
      return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + (p.n ? '<small>' + p.n + ' aportes hasta el ' + U.fechaCorta(s.hasta) + '.</small>' : '.');
    }
    if (s.tipo === 'ahorro') {
      if (s.meta > 0 && s.hasta) return 'Se apartan <b>' + U.money(p.cuota) + '</b> ' + cada + ' para juntar ' + U.money0(s.meta) + ' el ' + U.fechaCorta(s.hasta) + '.';
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
      y += '<div class="seccion" style="margin-top:20px"><div class="seccion-titulo"><h2>Sobres</h2><button data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-apilar="1">Agregar</button></div>';
      if (!e.sobres.length) y += '<div class="nota">Este espacio no tiene sobres. Agrega uno para organizar tu dinero.</div>';
      e.sobres.forEach((s) => {
        const st = c.sob[s.id];
        const p = s.tipo === 'gasto' || s.tipo === 'limite' ? st.progreso : st.progreso;
        const clase = (s.tipo === 'gasto' || s.tipo === 'limite') ? st.estado : (s.meta > 0 ? 'azul' : st.estado);
        const conBarra = ((s.tipo === 'gasto' || s.tipo === 'limite') && st.cuota > 0) || s.meta > 0 || s.tipo === 'deuda';
        y += '<button class="fila" data-a="hoja" data-h="sobre" data-esp="' + e.id + '" data-id="' + s.id + '" data-apilar="1">' +
          '<div class="ico">' + U.esc(s.icono) + '</div><div class="txt"><b>' + U.esc(s.nombre) + (s.disponible ? ' <small style="display:inline;color:var(--green)">· disponible</small>' : '') + '</b><small>' + descSobre(s, st) + '</small>' +
          (conBarra ? App.barraProg(p, clase) : '') + '</div>' +
          '<div class="der"><b class="num">' + U.money(st.saldo) + '</b></div></button>';
      });
      y += '</div><button class="btn sec" data-a="hoja" data-h="espacio-editar" data-id="' + e.id + '" data-apilar="1">' + I.edit + ' Editar espacio</button>';
      return y;
    }
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
      if (s.tipo !== 'porIngreso') y += '<div class="calc-aporte" style="margin-top:14px">Aporte: <b>' + App.textoAporte(s, st) + '</b>' + (st.falta > 0 ? '<small>Para ' + (st.frecAporte === 'diario' ? 'hoy' : U.FREC_ESTE[st.frecAporte]) + ' faltan ' + U.money(st.falta) + '.</small>' : '') + '</div>';
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
    titulo: (h) => h.id ? 'Editar sobre' : 'Nuevo sobre',
    init: (d) => {
      const s = d.id ? App.sobre(d.esp, d.id) : null;
      const b = s ? JSON.parse(JSON.stringify(s)) : App.nuevoSobre({ icono: '⭐', tipo: d.tipoInicial || 'gasto', cuota: '', meta: '' });
      b.manual = App.esManual(b);
      if (b.aporteManual === '' || b.aporteManual === undefined) b.aporteManual = '';
      if (b.tipo !== 'tarjeta' && !b.frecAporte) b.frecAporte = App.state.ajustes.frecIngreso;
      if (b.tipo === 'deuda' && !b.desde) b.desde = U.today();
      if (b.cuota === 0 && !s) b.cuota = '';
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
        y += '<div class="etq">¿Cuánto y cada cuánto lo pagas o gastas?</div>';
        y += '<label class="campo" style="margin-top:0"><span>' + (h.tipo === 'limite' ? 'Tope' : 'Monto') + '</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"></label>';
        y += App.tabsFrec('se-frec-pago', U.frec(h.frecPago));
        y += '<div class="dos"><label class="campo"><span>Fecha de pago (opcional)</span><input type="date" data-m="fechaPago" data-render="1" value="' + U.esc(h.fechaPago || '') + '"></label>' +
          (h.fechaPago ? '<label class="campo"><span>Avisarme</span><select data-m="avisar">' + [0, 1, 2, 3, 5, 7].map((n) => '<option value="' + n + '" ' + (String(h.avisar) === String(n) ? 'selected' : '') + '>' + (n === 0 ? 'El mismo día' : n + (n === 1 ? ' día antes' : ' días antes')) + '</option>').join('') + '</select></label>' : '<div></div>') + '</div>';
        y += '<p class="nota">' + (h.fechaPago ? 'Se repite ' + U.FREC_CADA[U.frec(h.frecPago)] + ' desde esa fecha. Te aviso antes y se aparta poco a poco para que llegues completo.' : 'Sin fecha: es lo que planeas gastar ' + U.FREC_CADA[U.frec(h.frecPago)] + '. Ponle fecha si es un pago (renta, colegiatura, gym).') + '</p>';
      } else if (h.tipo === 'ahorro') {
        y += '<div class="etq">¿Cuánto guardar y cada cuánto?</div>';
        y += '<label class="campo" style="margin-top:0"><span>Cantidad</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"' + (num(h.meta) > 0 && h.hasta ? ' disabled' : '') + '></label>';
        y += App.tabsFrec('se-frec-aporte', fA);
        y += '<div class="dos"><label class="campo"><span>Meta (opcional)</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="Ej. 10000"></label>' +
          '<label class="campo"><span>¿Para cuándo? (opcional)</span><input type="date" data-m="hasta" data-render="1" value="' + U.esc(h.hasta || '') + '"></label></div>';
        y += '<div class="calc-aporte" id="prev-aporte">' + vistaAporte(h) + '</div>';
        y += '<p class="nota">Con meta y fecha, la cantidad se calcula sola. La meta aparece en Metas con su barra.</p>';
      } else if (h.tipo === 'deuda') {
        y += '<label class="campo"><span>Total a juntar</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="$0"></label>';
        y += '<div class="dos"><label class="campo"><span>Desde</span><input type="date" data-m="desde" data-render="1" value="' + U.esc(h.desde || U.today()) + '"></label><label class="campo"><span>Fecha límite</span><input type="date" data-m="hasta" data-render="1" value="' + U.esc(h.hasta || '') + '"></label></div>';
      } else if (h.tipo === 'porIngreso') {
        y += '<label class="campo"><span>Cantidad por cada ingreso</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota) + '" placeholder="$0"></label>';
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
        avisar: c && c.avisar !== undefined ? String(c.avisar) : '3', saldo: '', saldoB: '', saldoM: '', debe: '', esp: (App.espacioPrincipal() || {}).id
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
    render: () => '<p class="nota" style="margin-top:0">Se usa como aporte de los sobres nuevos y para juntar poco a poco lo de tu tarjeta de crédito.</p>' +
      App.tabsFrec('frec-ingreso', App.state.ajustes.frecIngreso, '', ['diario', 'semanal', 'quincenal', 'mensual']) +
      '<p class="nota">No cambia los sobres que ya tienes. Cada uno tiene su propio aporte en Espacios y sobres.</p>'
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
      [['ahorro', '🎯', 'Ahorrar para algo', 'Ej. auto, viaje, celular. Guardas una cantidad cada cierto tiempo.'],
        ['deuda', '📅', 'Juntar para una fecha', 'Ej. una deuda o colegiatura. El aporte se calcula solo.'],
        ['porIngreso', '📈', 'Por cada ingreso', 'Ej. reinvertir en tu negocio cada vez que cobras.']].forEach(([t, ic, ti, de]) => {
        y += '<button class="fila" data-a="hoja" data-h="sobre-editar" data-tipoinicial="' + t + '" data-apilar="1"><div class="ico">' + ic + '</div><div class="txt"><b>' + ti + '</b><small style="white-space:normal">' + de + '</small></div>' + I.chev + '</button>';
      });
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
      const prev = { aurora: 'radial-gradient(circle at 20% 20%,#5b3cc4,transparent 60%),radial-gradient(circle at 80% 40%,#1f6fd1,transparent 60%),#000', oceano: 'radial-gradient(circle at 20% 20%,#0d6e8a,transparent 60%),radial-gradient(circle at 80% 40%,#1d4fbf,transparent 60%),#000', brasa: 'radial-gradient(circle at 20% 20%,#b5402a,transparent 60%),radial-gradient(circle at 80% 40%,#c77a1e,transparent 60%),#000', bosque: 'radial-gradient(circle at 20% 20%,#1f7a4f,transparent 60%),radial-gradient(circle at 80% 40%,#3c6e2a,transparent 60%),#000', grafito: 'radial-gradient(circle at 20% 20%,#4a4d57,transparent 60%),radial-gradient(circle at 80% 40%,#2f3440,transparent 60%),#000', negro: '#000' };
      return '<p class="nota" style="margin-top:0">Cada sección mueve el fondo un poco para que se sienta distinta.</p><div class="dos" style="gap:12px;margin-top:12px">' +
        App.FONDOS.map((f) => '<button data-a="fondo" data-v="' + f.id + '" style="height:110px;border-radius:18px;background:' + prev[f.id] + ';border:2px solid ' + (f.id === actual ? '#fff' : 'rgba(255,255,255,.1)') + ';display:flex;align-items:flex-end;padding:10px;font-weight:600">' + f.nombre + '</button>').join('') + '</div>';
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
