/* Control de Finanzas — pantallas principales */
(function () {
  const App = window.App;
  const I = App.I;
  App.ui = App.ui || { pantalla: 'inicio', filtro: 'todo', filtroEsp: '', buscar: '', verRepartos: false, limiteDias: 30 };

  /* ---------------- INICIO ---------------- */
  App.pantallaInicio = () => {
    const S = App.state;
    const c = App.calc();
    const rango = S.ajustes.rango || 'semana';
    const serie = App.serie(rango);
    const cmp = App.comparar(rango);
    const neto = cmp.actual.neto;
    const nombreRango = { hoy: 'hoy', semana: 'últimos 7 días', mes: 'últimos 30 días' }[rango];
    const antes = { hoy: 'ayer', semana: 'los 7 anteriores', mes: 'los 30 anteriores' }[rango];
    const dClase = neto > 0 ? 'up' : neto < 0 ? 'down' : 'flat';
    const nombre = S.perfil.nombre ? ', <b>' + U.esc(S.perfil.nombre) + '</b>' : '';
    const ancho = Math.min(window.innerWidth || 400, 560);

    const avisos = App.avisos(c);
    let h = '<div class="pantalla">';
    h += '<div class="top"><div class="saludo">' + U.saludo() + nombre + '</div>' +
      '<div style="display:flex;gap:8px">' +
      (S.ajustes.pin ? '<button class="icon-btn" data-a="bloquear" aria-label="Bloquear">' + I.lock + '</button>' : '') +
      '<button class="icon-btn campana" data-a="hoja" data-h="avisos" aria-label="Notificaciones">' + I.bell + (App.nAvisos ? '<i class="punto">' + (App.nAvisos > 9 ? '9+' : App.nAvisos) + '</i>' : '') + '</button>' +
      '<button class="icon-btn" data-a="hoja" data-h="cuadre" aria-label="Cuadrar">' + I.scale + '</button></div></div>';

    h += '<div class="hero"><div class="etiqueta">Disponible</div>' +
      '<div class="grande">' + App.montoGrande(c.tot.disponible) + '</div>' +
      '<span class="delta ' + dClase + '">' + (neto > 0 ? I.arrowUp : neto < 0 ? I.arrowDown : '') + '<span class="num">' + U.money(Math.abs(neto)) + '</span></span>' +
      '<span class="delta-sub">' + nombreRango + ' · ' + antes + ': ' + (cmp.anterior.neto >= 0 ? '+' : '−') + U.money0(Math.abs(cmp.anterior.neto)) + '</span>' +
      '<div class="mini-totales">' +
      '<div><span>Ahorrado</span><b class="num">' + U.moneyShort(c.tot.ahorro) + '</b></div>' +
      '<div><span>Apartado</span><b class="num">' + U.moneyShort(c.tot.apartado) + '</b></div>' +
      // lo que aún falta juntar para la tarjeta (lo ya juntado está en su sobre): así Disponible + Ahorrado + Apartado − esto = Total
      (c.tot.porJuntar > 0.004 ? '<div><span>Tarjeta por juntar</span><b class="num neg">−' + U.moneyShort(c.tot.porJuntar) + '</b></div>' : '') +
      '<div><span>Total</span><b class="num">' + U.moneyShort(c.tot.total) + '</b></div>' +
      '</div></div>';

    h += '<div class="grafica">' + App.graficaSVG(serie, ancho) + '</div>';
    h += '<div class="rangos">' + ['hoy', 'semana', 'mes'].map((r) => '<button class="' + (r === rango ? 'on' : '') + '" data-a="rango" data-r="' + r + '">' + { hoy: 'Hoy', semana: 'Semana', mes: 'Mes' }[r] + '</button>').join('') + '</div>';

    // avisos
    if (avisos.length) h += '<div class="seccion"><div class="seccion-titulo"><h2>Para ti</h2></div>' + avisos.join('') + '</div>';

    // semana
    const sem = App.flujo(c.ini, U.addDays(c.ini, 6));
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Esta semana</h2><span class="num" style="color:var(--text-2);font-size:13px">' + U.fechaCorta(c.ini) + ' – ' + U.fechaCorta(U.addDays(c.ini, 6)) + '</span></div>' +
      App.barrasHTML() +
      '<div class="leyenda"><span><i style="background:var(--green)"></i>Ingresos <b class="num" style="color:var(--text)">' + U.money0(sem.ing) + '</b></span>' +
      '<span><i style="background:rgba(255,255,255,.55)"></i>Gastos <b class="num" style="color:var(--text)">' + U.money0(sem.gas) + '</b></span></div></div>';

    // espacios
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Espacios</h2><button data-a="hoja" data-h="mover">' + 'Mover dinero' + '</button></div>';
    if (!S.espacios.length) h += '<div class="vacio-txt">Aún no tienes espacios.</div>';
    S.espacios.forEach((e) => {
      const x = c.esp[e.id];
      const p = x.presupuesto > 0 ? x.gastadoSemana / x.presupuesto : 0;
      const est = p > 1.001 ? 'pasado' : p >= 0.8 ? 'cuidado' : 'ok';
      const pasados = e.sobres.filter((s) => c.sob[s.id].estado === 'pasado' && (s.tipo === 'gasto' || s.tipo === 'limite')).length;
      h += '<button class="fila" data-a="hoja" data-h="espacio" data-id="' + e.id + '">' +
        '<div class="ico">' + U.esc(e.icono || '📁') + App.anillo(p, est) + '</div>' +
        '<div class="txt"><b>' + U.esc(e.nombre) + '</b><small>' +
        (x.presupuesto > 0 ? 'Gastado ' + U.money0(x.gastadoSemana) + ' de ' + U.money0(x.presupuesto) : e.sobres.length + ' sobres') +
        (pasados ? ' · <span class="pasado">' + pasados + ' en rojo</span>' : '') + '</small></div>' +
        '<div class="der"><b class="num">' + U.money(x.total) + '</b><small class="num ' + (x.libre < -0.004 ? 'neg' : '') + '">Libre ' + U.money(x.libre) + '</small></div></button>';
    });
    h += '</div>';

    // cuentas
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Cuentas</h2><button data-a="hoja" data-h="cuadre">Cuadrar</button></div>';
    S.cuentas.forEach((ct) => {
      const v = c.cuentas[ct.id];
      let sub = '';
      if (App.esCredito(ct)) { const pp = App.pagoTarjeta(ct, c); sub = v < -0.004 ? (pp && pp.monto > 0.004 ? 'Pagar ' + U.money0(pp.monto) + ' el ' + U.fechaCorta(pp.fecha) : 'Lo que debes') : 'Tarjeta de crédito'; }
      else if (ct.partes && c.partes[ct.id]) sub = 'Billetes ' + U.money0(c.partes[ct.id].b) + ' · Monedas ' + U.money0(c.partes[ct.id].m);
      h += '<button class="fila" data-a="hoja" data-h="cuenta" data-id="' + ct.id + '">' +
        '<div class="ico">' + U.esc(ct.icono || '💳') + '</div>' +
        '<div class="txt"><b>' + U.esc(ct.nombre) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' +
        '<div class="der"><b class="num ' + (v < -0.004 ? 'neg' : '') + '">' + U.money(v) + '</b></div></button>';
    });
    h += '</div></div>';
    return h;
  };

  /* Avisos inteligentes del inicio */
  App.avisos = (c) => {
    // avisos que se pueden quitar (los de pagos, tarjeta y límites de sobre no)
    const quitados = App.state.ajustes.avisosQuitados || {};
    App.quitables = [];
    const quitable = (k, html) => {
      if (quitados[k] === U.today()) return;
      App.quitables.push(k);
      out.push(html.replace('<div class="txt">', '<button class="aviso-x" data-a="aviso-quitar" data-k="' + k + '" aria-label="Quitar">✕</button><div class="txt">'));
    };
    const S = App.state;
    const out = [];
    const prio = []; // importantes: pagos, tarjeta y límites de sobre (no se quitan, solo se esconden)
    const hoy = U.today();
    // bandeja de Apple Pay
    S.bandeja.forEach((b) => {
      out.push('<div class="aviso"><div class="ico">' + I.inbox + '</div><div class="txt"><b>Pago con tarjeta: ' + U.money(b.monto) + '</b><p>' + U.esc(b.comercio || 'Sin comercio') + ' · ' + U.fechaRel(b.fecha || hoy) + '</p>' +
        '<div class="acciones"><button class="btn-chico blanco" data-a="bandeja" data-id="' + b.id + '">Elegir sobre</button><button class="btn-chico" data-a="bandeja-descartar" data-id="' + b.id + '">Descartar</button></div></div></div>');
    });
    // alertas: sobres o tarjetas en las que te pasaste o te queda poco
    App.alertas(c).slice(0, 4).forEach((al) => {
      const ver = al.tipo === 'sobre' ? 'data-h="sobre" data-esp="' + al.e.id + '" data-id="' + al.s.id + '"' : 'data-h="cuenta" data-id="' + al.ct.id + '"';
      if (al.tipo === 'sobre' && al.nivel === 'pasado' && !(App.porCubrir(al.s, c.sob[al.s.id]) > 0.004)) return; // ya lo cubriste
      const titulo = al.tipo === 'sobre' ? U.esc(al.s.icono + ' ' + al.s.nombre) : '💳 ' + U.esc(al.ct.nombre);
      const det = al.tipo === 'sobre' ? al.corto : al.nivel === 'pasado' ? 'Te pasaste ' + U.money(-al.disp) + ' ' + (al.propio ? 'de tu límite de uso (' + U.money0(al.L) + ')' : 'del límite (' + U.money0(al.L) + ')') : 'Te queda' + (al.disp === 1 ? '' : 'n') + ' ' + U.money(al.disp) + ' de ' + U.money0(al.L) + (al.propio ? ' (tu límite de uso)' : ' de crédito') + ' · ' + Math.round(al.pct) + '%';
      prio.push('<div class="aviso al-' + al.nivel + '"><div class="ico">' + (al.nivel === 'pasado' ? '🚨' : '⚠️') + '</div><div class="txt"><b>' + titulo + (al.nivel === 'pasado' ? ' · te pasaste' : ' · queda poco') + '</b><p>' + det + '</p>' +
        '<i class="ir-barra"><i style="transform:scaleX(' + Math.max(0, Math.min(1, al.pct / 100)).toFixed(3) + ')" class="bajo"></i></i>' +
        '<div class="acciones">' + (al.tipo === 'sobre' && App.porCubrir(al.s, c.sob[al.s.id]) > 0.004 ? '<button class="btn-chico blanco" data-a="hoja" data-h="cubrir" data-esp="' + al.e.id + '" data-id="' + al.s.id + '">Cubrir con…</button><button class="btn-chico" data-a="hoja" ' + ver + '>Ver</button>' : '<button class="btn-chico blanco" data-a="hoja" ' + ver + '>Ver</button><button class="btn-chico" data-a="hoja" data-h="alertas">Ajustar alertas</button>') + '</div></div></div>');
    });
    // resumen semanal (lunes o primer día que abras la semana)
    const ini = U.weekStart(hoy);
    if (S.ajustes.ultimoResumen && S.ajustes.ultimoResumen < ini && S.movs.length) {
      const r = App.resumenSemana(U.addDays(ini, -7));
      quitable('semana-' + ini, '<div class="aviso"><div class="ico">📊</div><div class="txt"><b>Tu semana pasada</b><p>Gastaste ' + U.money0(r.flujo.gas) + ' e ingresaste ' + U.money0(r.flujo.ing) + '.' + (r.pasados.length ? ' ' + r.pasados.length + ' sobre(s) en rojo.' : ' Ningún sobre en rojo. 👏') + '</p>' +
        '<div class="acciones"><button class="btn-chico blanco" data-a="hoja" data-h="resumen">Ver resumen</button><button class="btn-chico" data-a="resumen-ok">Listo</button></div></div></div>');
    }
    // pagos próximos
    App.proximosPagos(c).forEach((p) => {
      const av = Number(p.r.avisar);
      if (p.dias > (isNaN(av) ? 3 : av)) return;
      const st = p.r.sobre ? c.sob[p.r.sobre] : null;
      const tiene = st ? st.saldo : null;
      const cuando = p.dias === 0 ? 'hoy' : p.dias === 1 ? 'mañana' : 'en ' + p.dias + ' días';
      let estado = '';
      if (p.tipo === 'tarjeta') estado = p.r.estimado ? 'Aproximado, el corte aún no llega.' : 'Para no pagar intereses.';
      else if (tiene !== null) estado = tiene >= p.r.monto - 0.004 ? '<span class="ok">Ya lo tienes apartado.</span>' : '<span class="cuidado">Llevas ' + U.money(Math.max(0, tiene)) + ' apartado.</span>';
      const boton = p.tipo === 'rec' ? '<button class="btn-chico blanco" data-a="pagar-rec" data-id="' + p.r.id + '" data-f="' + p.fecha + '">Registrar pago</button>'
        : p.tipo === 'tarjeta' ? '<button class="btn-chico blanco" data-a="pagar-tarjeta" data-id="' + p.r.cuenta + '">Pagar tarjeta</button>'
          : '<button class="btn-chico blanco" data-a="pagar-sobre" data-esp="' + p.r.espacio + '" data-id="' + p.r.id + '" data-f="' + (p.tipo === 'sobre' ? p.fecha : '') + '" data-monto="' + p.r.monto + '">Registrar pago</button>';
      prio.push('<div class="aviso"><div class="ico">' + (p.tipo === 'tarjeta' ? '💳' : I.cal) + '</div><div class="txt"><b>' + U.esc(p.r.nombre) + ' · ' + U.money(p.r.monto) + '</b><p>Se paga ' + cuando + ' (' + U.fechaCorta(p.fecha) + '). ' + estado + '</p>' +
        '<div class="acciones">' + boton + '</div></div></div>');
    });
    // dinero libre sin repartir
    S.espacios.forEach((e) => {
      const x = c.esp[e.id];
      if (x.libre > 0.5 && x.falta > 0.5) {
        quitable('libre-' + e.id, '<div class="aviso"><div class="ico">✨</div><div class="txt"><b>Tienes ' + U.money(x.libre) + ' libres en ' + U.esc(e.nombre) + '</b><p>A tus sobres les faltan ' + U.money(x.falta) + ' por ahora.</p>' +
          '<div class="acciones"><button class="btn-chico blanco" data-a="repartir" data-id="' + e.id + '">Repartir</button></div></div></div>');
      } else if (x.libre < -0.5) {
        quitable('neg-' + e.id, '<div class="aviso"><div class="ico">⚠️</div><div class="txt"><b>' + U.esc(e.nombre) + ': libre en ' + U.money(x.libre) + '</b><p>Gastaste más de lo que había en este espacio. Pasa dinero desde otro sobre o espacio con Mover, o se cubre solo con tu siguiente ingreso.</p>' +
          '<div class="acciones"><button class="btn-chico blanco" data-a="hoja" data-h="registro" data-modo="mover" data-esp="' + e.id + '">Mover dinero</button></div></div></div>');
      }
    });
    // sobres que apartan con otro ritmo distinto a cuando cobras (ej. cobras diario y apartan cada semana)
    if (!S.ajustes.avisoRitmo) {
      const f = S.ajustes.frecIngreso; let n = 0;
      S.espacios.forEach((e) => e.sobres.forEach((s) => { if (s.tipo !== 'tarjeta' && s.tipo !== 'porIngreso' && U.frec(s.frecAporte || f) !== f) n++; }));
      if (n >= 2) quitable('ritmo', '<div class="aviso"><div class="ico">🔁</div><div class="txt"><b>Cobras ' + U.FREC_CADA[f] + ', pero ' + n + ' sobres apartan con otro ritmo</b><p>Si apartan igual que como cobras, cada ingreso se reparte parejo y no te quedas sin dinero un día.</p>' +
        '<div class="acciones"><button class="btn-chico blanco" data-a="hoja" data-h="frec-ingreso">Revisar</button><button class="btn-chico" data-a="aviso-ritmo-no">Así está bien</button></div></div></div>');
    }
    // cuadre de la noche
    if (S.ajustes.cuadreNoche && new Date().getHours() >= (Number(S.ajustes.horaCuadre) || 21) && S.ajustes.ultimoCuadre !== hoy) {
      quitable('cuadre', '<div class="aviso"><div class="ico">🌙</div><div class="txt"><b>Cuadre de la noche</b><p>Revisa en 1 minuto que tu dinero real coincida.</p>' +
        '<div class="acciones"><button class="btn-chico blanco" data-a="hoja" data-h="cuadre">Cuadrar</button><button class="btn-chico" data-a="cuadre-saltar">Hoy no</button></div></div></div>');
    }
    App.nAvisos = prio.length + out.length;
    if (prio.length) {
      const oculto = !!S.ajustes.prioOculto;
      out.unshift('<div class="prio' + (oculto ? ' oculto' : '') + '"><button class="prio-tab" data-a="prio-toggle"><b>⭐ Importantes</b><i class="prio-n">' + prio.length + '</i><span>' + (oculto ? 'Ver ›' : 'Esconder ⌃') + '</span></button>' + (oculto ? '' : prio.join('')) + '</div>');
    }
    return out;
  };

  /* ---------------- MOVIMIENTOS ---------------- */
  App.pantallaMovs = () => {
    const S = App.state;
    const ui = App.ui;
    let movs = S.movs.slice().sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : b.creado - a.creado));
    if (!ui.verRepartos) movs = movs.filter((m) => !(m.tipo === 'mover' && m.origen === 'auto'));
    if (ui.filtro === 'gastos') movs = movs.filter((m) => m.tipo === 'gasto');
    if (ui.filtro === 'ingresos') movs = movs.filter((m) => m.tipo === 'ingreso');
    if (ui.filtro === 'movidos') movs = movs.filter((m) => m.tipo === 'mover' || m.tipo === 'traspaso' || m.tipo === 'ajuste' || m.tipo === 'inicial');
    if (ui.filtroEsp) movs = movs.filter((m) => m.espacio === ui.filtroEsp || m.espacio2 === ui.filtroEsp);
    const q = (ui.buscar || '').trim().toLowerCase();
    if (q) movs = movs.filter((m) => { const inf = App.movInfo(m); return (inf.titulo + ' ' + inf.sub + ' ' + m.monto).toLowerCase().includes(q); });
    const limite = U.addDays(U.today(), -ui.limiteDias);
    const total = movs.length;
    const visibles = movs.filter((m) => m.fecha >= limite);

    let h = '<div class="pantalla"><div class="top"><h1>Movimientos</h1></div>';
    h += '<label class="buscar">' + I.search + '<input type="search" placeholder="Buscar" value="' + U.esc(ui.buscar) + '" data-in="buscar"></label>';
    h += '<div class="chips" style="margin-top:12px">' +
      [['todo', 'Todo'], ['gastos', 'Gastos'], ['ingresos', 'Ingresos'], ['movidos', 'Movimientos internos']].map(([k, t]) => '<button class="chip ' + (ui.filtro === k ? 'on' : '') + '" data-a="filtro" data-v="' + k + '">' + t + '</button>').join('') +
      (S.espacios.length > 1 ? S.espacios.map((e) => '<button class="chip ' + (ui.filtroEsp === e.id ? 'on' : '') + '" data-a="filtro-esp" data-v="' + e.id + '">' + U.esc(e.icono) + ' ' + U.esc(e.nombre) + '</button>').join('') : '') +
      '<button class="chip ' + (ui.verRepartos ? 'on' : '') + '" data-a="ver-repartos">Repartos</button></div>';

    if (!visibles.length) h += '<div class="vacio-txt">' + (total ? 'No hay movimientos en los últimos ' + ui.limiteDias + ' días.' : 'Aquí aparecerán tus gastos e ingresos.<br>Toca <b>+</b> para registrar el primero.') + '</div>';
    let diaActual = '';
    let bloque = '';
    const cerrarDia = () => { if (bloque) h += bloque + '</div>'; bloque = ''; };
    const gastoDia = {};
    visibles.forEach((m) => { if (m.tipo === 'gasto') gastoDia[m.fecha] = (gastoDia[m.fecha] || 0) + Number(m.monto); });
    visibles.forEach((m) => {
      if (m.fecha !== diaActual) {
        cerrarDia();
        diaActual = m.fecha;
        bloque = '<div class="dia"><div class="dia-cab"><span>' + U.fechaRel(m.fecha) + '</span><span class="num">' + (gastoDia[m.fecha] ? '−' + U.money(gastoDia[m.fecha]) : '') + '</span></div>';
      }
      const inf = App.movInfo(m);
      bloque += '<button class="fila" data-a="editar-mov" data-id="' + m.id + '"><div class="ico">' + U.esc(inf.icono) + '</div>' +
        '<div class="txt"><b>' + U.esc(inf.titulo) + '</b><small>' + U.esc(inf.sub) + (m.origen === 'applepay' ? ' · Apple Pay' : '') + '</small></div>' +
        '<div class="der"><b class="num ' + inf.clase + '">' + inf.txtMonto + '</b><small>' + U.hora(m.creado) + '</small></div></button>';
    });
    cerrarDia();
    if (movs.length > visibles.length) h += '<button class="btn sec" data-a="mas-movs">Ver más antiguos</button>';
    h += '</div>';
    return h;
  };

  /* ---------------- METAS ---------------- */
  App.pantallaMetas = () => {
    const S = App.state;
    const c = App.calc();
    let h = '<div class="pantalla"><div class="top"><h1>Metas</h1><button class="icon-btn" data-a="hoja" data-h="nueva-meta" aria-label="Nueva meta">' + I.plus + '</button></div>';
    const metas = [];
    S.espacios.forEach((e) => e.sobres.forEach((s) => { if (s.meta > 0 || s.tipo === 'deuda') metas.push({ e, s, x: c.sob[s.id] }); }));
    if (!metas.length) h += '<div class="vacio-txt">Crea una meta para ver cuánto te falta y cuándo la lograrás.</div>';
    metas.forEach(({ e, s, x }) => {
      let actual, objetivo, sub, pie1, pie2, clase = '';
      if (s.tipo === 'deuda') {
        actual = x.pagado + Math.max(0, x.saldo); objetivo = s.meta;
        sub = 'Pago único · ' + U.esc(e.nombre);
        pie1 = 'Pagado ' + U.money0(x.pagado) + ' · Apartado ' + U.money0(x.saldo);
        pie2 = s.hasta ? 'Límite ' + U.fechaCorta(s.hasta) : '';
        clase = x.falta > 0 ? 'cuidado' : '';
      } else {
        actual = Math.max(0, x.saldo); objetivo = s.meta;
        sub = App.tipoSobre(s.tipo).nombre + ' · ' + U.esc(e.nombre);
        const resta = Math.max(0, objetivo - actual);
        const ritmo = s.tipo === 'porIngreso' ? 0 : Number(x.cuota) || 0;
        const ritmoSem = U.convertir(ritmo, x.frecAporte, 'semanal');
        if (resta <= 0) pie1 = '¡Meta lograda! 🎉';
        else if (s.hasta && s.hasta >= U.today()) {
          const m = App.calcMeta(objetivo, actual, s.hasta, x.frecAporte);
          pie1 = 'Faltan ' + U.money0(resta) + ' · ' + (U.frec(x.frecAporte) !== 'diario' && m ? '≈ ' + U.money(m.diario) + '/día · ' : '') + 'para el ' + U.fechaCorta(s.hasta);
        } else if (s.hasta) pie1 = 'Faltan ' + U.money0(resta) + ' · la fecha ya pasó';
        else if (ritmoSem > 0) {
          const sem = Math.ceil(resta / ritmoSem);
          pie1 = 'Faltan ' + U.money0(resta) + ' · ~' + (sem > 104 ? Math.round(sem / 52) + ' años' : sem > 8 ? Math.round(sem / 4.33) + ' meses' : sem + ' semanas');
        } else pie1 = 'Faltan ' + U.money0(resta);
        pie2 = ritmo > 0 ? U.money0(ritmo) + U.FREC_POR[x.frecAporte] : s.tipo === 'porIngreso' ? App.txtPorIngreso(s) : '';
        clase = 'azul';
      }
      const p = objetivo > 0 ? actual / objetivo : 0;
      h += '<button class="meta" style="display:block;width:100%;text-align:left" data-a="hoja" data-h="sobre" data-esp="' + e.id + '" data-id="' + s.id + '">' +
        '<div class="cab"><div class="ico">' + U.esc(s.icono) + '</div><div class="txt"><b>' + U.esc(s.nombre) + '</b><small>' + sub + '</small></div>' + I.chev + '</div>' +
        '<div class="cifras"><b class="num">' + U.money(actual) + '</b><span class="num">de ' + U.money0(objetivo) + ' · ' + Math.round(p * 100) + '%</span></div>' +
        App.barraProg(p, clase) +
        '<div class="pie"><span>' + pie1 + '</span><span>' + (pie2 || '') + '</span></div></button>';
    });

    // pagos programados
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Próximos pagos</h2><button data-a="hoja" data-h="recurrente">Agregar</button></div>';
    const prox = App.proximosPagos(c);
    if (!prox.length) h += '<div class="nota">Ponle fecha de pago a tus sobres (renta, colegiatura, gym…) o agrega una tarjeta de crédito, y la app te avisará antes de cada pago.</div>';
    prox.forEach((p) => {
      const cuando = p.dias === 0 ? 'Hoy' : p.dias === 1 ? 'Mañana' : U.fechaCorta(p.fecha);
      const frec = p.tipo === 'rec' ? ({ mensual: 'Cada mes', quincenal: 'Cada quincena', semanal: 'Cada semana' }[p.r.frecuencia] || '') : p.tipo === 'sobre' ? U.FREC_TXT[U.frec(p.r.frec)] : p.tipo === 'deuda' ? 'Pago único' : 'Tarjeta' + (p.r.estimado ? ' · aprox.' : '');
      const attrs = p.tipo === 'rec' ? 'data-h="recurrente" data-id="' + p.r.id + '"' : p.tipo === 'tarjeta' ? 'data-h="cuenta" data-id="' + p.r.cuenta + '"' : 'data-h="sobre" data-esp="' + p.r.espacio + '" data-id="' + p.r.id + '"';
      h += '<button class="fila" data-a="hoja" ' + attrs + '><div class="ico">' + (p.tipo === 'tarjeta' ? '💳' : I.cal.replace('<svg', '<svg style="width:19px;height:19px"')) + '</div>' +
        '<div class="txt"><b>' + U.esc(p.r.nombre) + '</b><small>' + frec + ' · ' + cuando + '</small></div><div class="der"><b class="num">' + U.money(p.r.monto) + '</b></div></button>';
    });
    h += '</div></div>';
    return h;
  };

  /* ---------------- AJUSTES ---------------- */
  App.pantallaAjustes = () => {
    const S = App.state;
    const a = S.ajustes;
    const fila = (accion, ico, titulo, sub, extra) => '<button class="fila" data-a="' + accion + '" ' + (extra || '') + '><div class="ico">' + ico + '</div><div class="txt"><b>' + titulo + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>' + I.chev + '</button>';
    const sw = (k, titulo, sub) => '<label class="interruptor"><div class="txt"><b>' + titulo + '</b><small>' + sub + '</small></div><span class="sw"><input type="checkbox" data-sw="' + k + '" ' + (a[k] ? 'checked' : '') + '><i></i></span></label>';
    let h = '<div class="pantalla lista-aj"><div class="top"><h1>Ajustes</h1></div>';
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Tú</h2></div>' +
      fila('hoja', I.user, 'Nombre', U.esc(S.perfil.nombre || 'Sin nombre'), 'data-h="perfil"') +
      fila('hoja', I.palette, 'Fondo', App.FONDOS.find((f) => f.id === a.fondo).nombre, 'data-h="fondo"') + '</div>';
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Organización</h2></div>' +
      fila('hoja', I.layers, 'Espacios y sobres', S.espacios.length + ' espacios · ' + S.espacios.reduce((n, e) => n + e.sobres.length, 0) + ' sobres', 'data-h="organizar"') +
      fila('hoja', I.wallet, 'Cuentas', S.cuentas.map((c) => c.nombre).join(', ') || 'Ninguna', 'data-h="cuentas"') +
      fila('hoja', I.cal, 'Cada cuánto recibes dinero', U.FREC_TXT[a.frecIngreso] || 'Semanal', 'data-h="frec-ingreso"') +
      fila('ir', I.target, 'Próximos pagos', 'Fechas de pago y avisos', 'data-p="metas"') + '</div>';
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Hábitos</h2></div>' +
      sw('cuadreNoche', 'Cuadre de la noche', 'Desde las ' + App.horaTxt(a.horaCuadre) + ' te sugiere revisar tu dinero real') +
      sw('repartirSolo', 'Repartir solo', 'Lo que te entre y lo que quede libre se aparta solo en tus sobres') +
      fila('hoja', I.bell, 'Notificaciones', App.notifPermitidas() ? 'Activadas' : 'Avisos en el celular', 'data-h="avisos"') +
      fila('hoja', I.bell, 'Alertas', a.alertas === false ? 'Desactivadas' : 'Sobres al ' + a.alertaSobre + '% · tarjetas al ' + a.alertaTarjeta + '%', 'data-h="alertas"') +
      sw('sonidos', 'Sonidos', 'Al gastar, al recibir dinero y en alertas') +
      sw('vibracion', 'Vibración', 'Al guardar y en alertas') + '</div>';
    h += '<div class="seccion"><div class="seccion-titulo"><h2>Seguridad y respaldo</h2></div>' +
      fila('hoja', I.lock, 'Bloqueo con código', a.pin ? 'Activado' : 'Desactivado', 'data-h="pin"') +
      fila('hoja', I.download, 'Copia de seguridad', 'Guardar o recuperar tus datos en un archivo', 'data-h="respaldo"') +
      fila('hoja', I.cloud, 'Respaldo en Google Sheets', a.syncUrl ? '<span class="ok-check"></span>Conectado' + (a.ultimaSync ? ' · ' + U.hora(a.ultimaSync) : '') : 'Opcional', 'data-h="sync"') + '</div>';
    h += '<div class="seccion"><div class="seccion-titulo"><h2>App</h2></div>' +
      fila('hoja', I.phone, 'Instalar en tu teléfono', 'iPhone y Android', 'data-h="instalar"') +
      fila('hoja', I.apple, 'Atajos del iPhone', 'Gasto rápido y Apple Pay', 'data-h="atajo"') + '</div>';
    h += '<div class="seccion"><button class="btn peligro" data-a="hoja" data-h="borrar">Borrar todos mis datos</button>' +
      '<p class="nota" style="text-align:center">Control de Finanzas · v1.4 · Tus datos viven en este teléfono.</p></div>';
    h += '</div>';
    return h;
  };

  /* ---------------- NAVEGACIÓN ---------------- */
  App.navHTML = () => {
    const p = App.ui.pantalla;
    const b = (id, ico, t) => '<button class="' + (p === id ? 'on' : '') + '" data-a="ir" data-p="' + id + '" aria-label="' + t + '">' + ico + '</button>';
    return '<nav class="nav"><div class="nav-in">' + b('inicio', I.home, 'Inicio') + b('movs', I.list, 'Movimientos') +
      '<button class="fab" data-a="hoja" data-h="registro" aria-label="Registrar">' + I.plus + '</button>' +
      b('metas', I.target, 'Metas') + b('ajustes', I.gear, 'Ajustes') + '</div></nav>';
  };

  /* ---------------- BIENVENIDA ---------------- */
  App.ui.ob = { paso: 0, nombre: '', plantilla: 'estudiante', saldos: {} };
  App.pantallaBienvenida = () => {
    const ob = App.ui.ob;
    let h = '<div class="bienvenida">';
    if (ob.paso === 0) {
      h += '<img class="logo" src="icons/icon-192.png" alt=""><h1>Control de<br>Finanzas</h1>' +
        '<p>Registra en segundos, sabe cuánto tienes disponible y organiza tu dinero en sobres. Funciona sin internet y tus datos se quedan en tu teléfono.</p>' +
        '<div class="espaciador"></div>' +
        '<button class="btn" data-a="ob-sig">Empezar</button>' +
        '<button class="btn sec" data-a="importar">Tengo una copia de seguridad</button>';
    } else if (ob.paso === 1) {
      h += '<h1>¿Cómo te llamas?</h1><p>Solo para saludarte.</p>' +
        '<label class="campo"><input data-in="ob-nombre" value="' + U.esc(ob.nombre) + '" placeholder="Tu nombre" autocomplete="given-name"></label>' +
        '<div class="espaciador"></div><button class="btn" data-a="ob-sig">Continuar</button><button class="btn sec" data-a="ob-atras">Atrás</button>';
    } else if (ob.paso === 2) {
      h += '<h1>¿Cómo quieres empezar?</h1><p>Después puedes cambiar todo: sobres, cantidades, espacios y cuentas.</p>';
      Object.keys(App.PLANTILLAS).forEach((k) => {
        const p = App.PLANTILLAS[k];
        h += '<button class="opcion ' + (ob.plantilla === k ? 'on' : '') + '" data-a="ob-plantilla" data-v="' + k + '"><div class="ico">' + { estudiante: '🎓', negocio: '🏪', cero: '✏️' }[k] + '</div><div><b>' + p.nombre + '</b><small>' + p.desc + '</small></div></button>';
      });
      h += '<div class="espaciador"></div><button class="btn" data-a="ob-sig">Continuar</button><button class="btn sec" data-a="ob-atras">Atrás</button>';
    } else if (ob.paso === 3) {
      h += '<h1>¿Cuánto tienes hoy?</h1><p>Escribe lo que tienes en cada cuenta. Si no tienes algo, déjalo vacío.</p>';
      App.state.cuentas.forEach((c) => {
        h += '<label class="campo"><span>' + U.esc(c.icono) + ' ' + U.esc(c.nombre) + '</span><input inputmode="decimal" data-in="ob-saldo" data-id="' + c.id + '" value="' + U.esc(ob.saldos[c.id] || '') + '" placeholder="$0.00"></label>';
      });
      h += '<div class="espaciador"></div><button class="btn" data-a="ob-fin">Listo</button>';
    }
    h += '</div>';
    return h;
  };

  /* ---------------- BLOQUEO ---------------- */
  App.ui.pinIn = '';
  App.pantallaBloqueo = () => {
    const n = App.ui.pinIn.length;
    let h = '<div class="bloqueo"><img class="logo" src="icons/icon-192.png" alt=""><h2>Escribe tu código</h2>' +
      '<div class="puntos" id="pin-puntos">' + [0, 1, 2, 3].map((i) => '<i class="' + (i < n ? 'on' : '') + '"></i>').join('') + '</div><div class="teclado">';
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].forEach((k) => {
      if (!k) h += '<button class="vacio" disabled></button>';
      else h += '<button data-a="pin-tecla" data-k="' + k + '">' + (k === 'del' ? App.I.del : k) + '</button>';
    });
    h += '</div></div>';
    return h;
  };
})();
