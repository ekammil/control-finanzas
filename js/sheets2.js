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

  const descSobre = (s, st) => {
    if (s.tipo === 'gasto' || s.tipo === 'limite') {
      return 'Gastado ' + U.money0(st.gastadoSemana) + ' de ' + U.money0(st.cuota) + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : '');
    }
    if (s.tipo === 'deuda') return 'Cuota ' + U.money0(st.cuota) + '/sem' + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' · cubierta ✓');
    if (s.tipo === 'ahorro') return (s.meta > 0 ? 'Meta ' + U.money0(s.meta) + ' · ' : '') + U.money0(s.cuota) + '/sem' + (st.falta > 0 ? ' · faltan ' + U.money0(st.falta) : ' ✓');
    return U.money0(s.cuota) + ' por cada ingreso' + (s.meta > 0 ? ' · meta ' + U.money0(s.meta) : '');
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
      let y = '<div class="hero" style="margin-top:4px"><div class="etiqueta">' + App.TIPOS_SOBRE[s.tipo].nombre + '</div><div class="grande" style="font-size:38px">' + App.montoGrande(st.saldo) + '</div>' +
        '<p class="nota" style="margin-top:4px">' + descSobre(s, st) + '</p></div>';
      if ((s.tipo === 'gasto' || s.tipo === 'limite') && st.cuota > 0) y += App.barraProg(st.progreso, st.estado);
      if (s.meta > 0 || s.tipo === 'deuda') {
        const act = s.tipo === 'deuda' ? st.pagado + Math.max(0, st.saldo) : Math.max(0, st.saldo);
        y += App.barraProg(s.meta ? act / s.meta : 0, 'azul') + '<div class="nota">' + U.money(act) + ' de ' + U.money(s.meta) + (s.hasta ? ' · límite ' + U.fechaCorta(s.hasta) : '') + '</div>';
      }
      y += '<div class="dos" style="margin-top:16px">' +
        '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="gasto" data-esp="' + h.esp + '" data-sobre="' + s.id + '" data-apilar="1">− Gasto</button>' +
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
      const saldo = App.calc().cuentas[ct.id];
      let y = '<div class="hero" style="margin-top:4px"><div class="etiqueta">Saldo</div><div class="grande" style="font-size:38px">' + App.montoGrande(saldo) + '</div></div>';
      y += '<div class="dos" style="margin-top:16px"><button class="btn sec" style="margin:0" data-a="hoja" data-h="cuadre" data-apilar="1">' + I.scale + ' Cuadrar</button>' +
        '<button class="btn sec" style="margin:0" data-a="hoja" data-h="registro" data-modo="mover" data-movermodo="cuentas" data-cuenta="' + ct.id + '" data-apilar="1">' + I.swap + ' Traspasar</button></div>';
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
          y += '<div class="fila"><div class="ico">' + U.esc(s.icono) + '</div><button class="txt" style="text-align:left" data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-id="' + s.id + '" data-apilar="1"><b>' + U.esc(s.nombre) + '</b><small>' + App.TIPOS_SOBRE[s.tipo].nombre + ' · ' + (s.tipo === 'deuda' ? 'meta ' + U.money0(s.meta) : U.money0(s.cuota) + (s.tipo === 'porIngreso' ? ' por ingreso' : '/sem')) + '</small></button>' +
            '<button class="icon-btn" style="width:34px;height:34px" data-a="sobre-orden" data-esp="' + e.id + '" data-i="' + i + '" data-d="-1" ' + (i === 0 ? 'disabled style="opacity:.3;width:34px;height:34px"' : '') + ' aria-label="Subir">' + I.up + '</button>' +
            '<button class="icon-btn" style="width:34px;height:34px" data-a="sobre-orden" data-esp="' + e.id + '" data-i="' + i + '" data-d="1" ' + (i === e.sobres.length - 1 ? 'disabled style="opacity:.3;width:34px;height:34px"' : '') + ' aria-label="Bajar">' + I.down + '</button></div>';
        });
        y += '<button class="btn sec" style="height:44px;font-size:15px" data-a="hoja" data-h="sobre-editar" data-esp="' + e.id + '" data-apilar="1">' + I.plus + ' Sobre en ' + U.esc(e.nombre) + '</button></div>';
      });
      y += '<button class="btn" data-a="hoja" data-h="espacio-editar" data-apilar="1">' + I.plus + ' Nuevo espacio</button>';
      y += '<p class="nota">El orden importa: al repartir un ingreso, primero se llenan los pagos con fecha y luego los sobres de arriba hacia abajo.</p>';
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
      return Object.assign({ esp: d.esp || (App.espacioPrincipal() || {}).id, id: d.id || '' },
        s ? JSON.parse(JSON.stringify(s)) : { nombre: '', icono: '⭐', tipo: d.tipoInicial || 'gasto', cuota: '', meta: '', desde: '', hasta: '', sobranteA: '', disponible: false });
    },
    render: (h) => {
      const e = App.espacio(h.esp);
      let y = '';
      if (!h.id && App.state.espacios.length > 1) y += '<div class="etq" style="margin-top:0">Espacio</div><div class="chips">' + App.state.espacios.map((x) => chip(h.esp === x.id, 'sobre-esp', 'data-v="' + x.id + '"', U.esc(x.icono) + ' ' + U.esc(x.nombre))).join('') + '</div>';
      y += '<label class="campo"><span>Nombre</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="Ej. Comida, Ocio, Auto" maxlength="30"></label>';
      y += '<div class="etq">Tipo</div><div class="chips wrap">' + Object.keys(App.TIPOS_SOBRE).map((k) => chip(h.tipo === k, 'sobre-tipo', 'data-v="' + k + '"', App.TIPOS_SOBRE[k].nombre)).join('') + '</div>';
      y += '<p class="nota">' + App.TIPOS_SOBRE[h.tipo].desc + '</p>';
      if (h.tipo === 'deuda') {
        y += '<label class="campo"><span>Total a juntar</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="$0"></label>';
        y += '<div class="dos"><label class="campo"><span>Desde</span><input type="date" data-m="desde" value="' + U.esc(h.desde || U.today()) + '"></label><label class="campo"><span>Fecha límite</span><input type="date" data-m="hasta" value="' + U.esc(h.hasta || '') + '"></label></div>';
        y += '<small class="nota">La cuota de cada semana se calcula sola con lo que falta y las semanas que quedan.</small>';
      } else {
        const et = h.tipo === 'porIngreso' ? 'Cantidad por cada ingreso' : h.tipo === 'limite' ? 'Tope por semana' : 'Cantidad por semana';
        y += '<label class="campo"><span>' + et + '</span><input inputmode="decimal" data-m="cuota" value="' + U.esc(h.cuota || '') + '" placeholder="$0"></label>';
        if (h.tipo === 'ahorro' || h.tipo === 'porIngreso') y += '<label class="campo"><span>Meta (opcional)</span><input inputmode="decimal" data-m="meta" value="' + U.esc(h.meta || '') + '" placeholder="Ej. 10000"><small>Aparece en Metas con su barra de progreso.</small></label>';
      }
      if (h.tipo === 'limite' && e) {
        y += '<label class="campo"><span>Lo que sobre el lunes pasa a…</span><select data-m="sobranteA"><option value="">Se queda en el sobre</option>' +
          e.sobres.filter((s) => s.id !== h.id).map((s) => '<option value="' + s.id + '" ' + (h.sobranteA === s.id ? 'selected' : '') + '>' + U.esc(s.icono + ' ' + s.nombre) + '</option>').join('') + '</select></label>';
      }
      y += emojiPicker(h.icono);
      y += '<label class="interruptor"><div class="txt"><b>Cuenta como disponible</b><small>Actívalo si este dinero lo puedes gastar en lo que quieras (como Ocio).</small></div><span class="sw"><input type="checkbox" data-m="disponible" ' + (h.disponible ? 'checked' : '') + '><i></i></span></label>';
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
      let y = '<p class="nota" style="margin-top:0">Las <b>cuentas</b> son dónde está tu dinero: banco, efectivo, monedas, apps…</p>';
      App.state.cuentas.forEach((ct) => {
        y += '<button class="fila" data-a="hoja" data-h="cuenta-editar" data-id="' + ct.id + '" data-apilar="1"><div class="ico">' + U.esc(ct.icono) + '</div><div class="txt"><b>' + U.esc(ct.nombre) + '</b></div><div class="der"><b class="num">' + U.money(c.cuentas[ct.id]) + '</b></div>' + I.chev + '</button>';
      });
      y += '<button class="btn" data-a="hoja" data-h="cuenta-editar" data-apilar="1">' + I.plus + ' Nueva cuenta</button>';
      return y;
    }
  };

  H['cuenta-editar'] = {
    titulo: (h) => h.id ? 'Editar cuenta' : 'Nueva cuenta',
    init: (d) => { const c = d.id ? App.cuenta(d.id) : null; return { id: d.id || '', nombre: c ? c.nombre : '', icono: c ? c.icono : '🏦', saldo: '', esp: (App.espacioPrincipal() || {}).id }; },
    render: (h) => {
      let y = '<label class="campo"><span>Nombre</span><input data-m="nombre" value="' + U.esc(h.nombre) + '" placeholder="Ej. Banco, Efectivo, Tarjeta" maxlength="30"></label>';
      if (!h.id) {
        y += '<label class="campo"><span>¿Cuánto tienes hoy ahí?</span><input inputmode="decimal" data-m="saldo" value="' + U.esc(h.saldo) + '" placeholder="$0"></label>';
        if (App.state.espacios.length > 1) y += '<div class="etq">Ese dinero es de</div><div class="chips">' + App.state.espacios.map((e) => chip(h.esp === e.id, 'cuenta-esp', 'data-v="' + e.id + '"', U.esc(e.icono) + ' ' + U.esc(e.nombre))).join('') + '</div>';
      }
      y += emojiPicker(h.icono);
      y += '<button class="btn" data-a="cuenta-guardar">' + I.check + 'Guardar</button>';
      if (h.id) y += '<button class="btn peligro" data-a="cuenta-borrar">' + I.trash + 'Eliminar cuenta</button>';
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
      [['ahorro', '🐷', 'Ahorrar para algo', 'Ej. auto, viaje, celular. Guardas una cantidad cada semana.'],
        ['deuda', '📅', 'Juntar para una fecha', 'Ej. una deuda o colegiatura. La cuota se calcula sola.'],
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

  /* ---------- Atajo de Apple Pay ---------- */
  H.atajo = {
    titulo: 'Atajo de Apple Pay',
    render: () => {
      const url = App.state.ajustes.syncUrl;
      if (!url) return '<p class="nota" style="margin-top:0">Para que tus pagos con Apple Pay lleguen solos a la app, primero conecta el <b>Respaldo en Google Sheets</b>.</p><button class="btn" data-a="hoja" data-h="sync" data-apilar="1">Conectar Google Sheets</button>';
      return '<p class="nota" style="margin-top:0">Cada vez que pagues con Apple Pay, el iPhone manda el monto y el comercio a tu hoja. Al abrir la app con internet, el pago aparece en <b>Para ti</b> y solo eliges el sobre.</p>' +
        '<ol class="pasos"><li>Abre <b>Atajos</b> → pestaña <b>Automatización</b> → <b>+</b> → <b>Transacción</b>.</li>' +
        '<li>Elige tus tarjetas, deja "Cualquier categoría" y "Cualquier comercio", y marca <b>Ejecutar inmediatamente</b>.</li>' +
        '<li>Toca <b>Nueva automatización en blanco</b> y agrega <b>Obtener contenido de URL</b>.</li>' +
        '<li>En URL pega tu enlace (abajo). Toca la flecha ›: Método <b>POST</b>, Cuerpo de solicitud <b>JSON</b>.</li>' +
        '<li>Agrega 4 campos de texto: <b>accion</b> = bandeja · <b>monto</b> = Transacción → Cantidad · <b>comercio</b> = Transacción → Comercio · <b>tarjeta</b> = Transacción → Tarjeta o pase.</li>' +
        '<li>Listo. Sin preguntas al pagar: nunca se pierde un pago.</li></ol>' +
        '<code class="url">' + U.esc(url) + '</code><button class="btn sec" data-a="copiar" data-v="' + U.esc(url) + '">Copiar enlace</button>' +
        '<p class="nota">Si pagas sin señal, el iPhone no puede mandarlo. Para eso, revisa tu Cuadre de la noche.</p>';
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
      if (r.top.length) y += '<div class="seccion"><div class="seccion-titulo"><h2>En qué gastaste más</h2></div>' + r.top.map((o) => '<div class="fila"><div class="ico">' + U.esc(o.s.icono) + '</div><div class="txt"><b>' + U.esc(o.s.nombre) + '</b><small>' + (o.x.cuota ? 'de ' + U.money0(o.x.cuota) + ' planeados' : '') + '</small></div><div class="der"><b class="num ' + (o.x.estado === 'pasado' ? 'neg' : '') + '">' + U.money(o.x.gastadoSemana) + '</b></div></div>').join('') + '</div>';
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
