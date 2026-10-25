/* Control de Finanzas — bienvenida con preguntas para armar sobres a la medida */
(function () {
  const App = window.App;

  App.PERFILES = {
    estudiante: { nombre: 'Estudiante', icono: '🎓', desc: 'Escuela, transporte, comida y tus gustos.' },
    diario: { nombre: 'Trabajador', icono: '💼', desc: 'Trabajas para alguien y quieres ordenar tus gastos y ahorrar.' },
    negocio: { nombre: 'Con negocio', icono: '🏪', desc: 'Tu dinero personal separado del de tu negocio.' },
    cero: { nombre: 'Desde cero', icono: '✏️', desc: 'Sin preguntas. Tú armas tus sobres después.' }
  };

  // sobre sugerido: clave, nombre, ícono, tipo, cantidad, orden, extra
  const sb = (key, nombre, icono, tipo, cuota, orden, extra) => Object.assign({ key, nombre, icono, tipo, cuota, orden, meta: 0, hasta: '', disponible: false }, extra || {});
  const siNo = (sobres) => [{ v: 'si', t: 'Sí', sobres }, { v: 'no', t: 'No', sobres: [] }];

  App.PREGUNTAS = [
    { id: 'mov', titulo: '¿Cómo te mueves normalmente?', multi: true, opciones: [
      { v: 'publico', t: '🚌 Transporte público', sobres: [sb('transporte', 'Transporte', '🚌', 'limite', 150, 30)] },
      { v: 'auto', t: '🚗 Auto o moto', sobres: [sb('gasolina', 'Gasolina', '⛽', 'gasto', 300, 31)] },
      { v: 'apps', t: '🚕 Apps de viaje o taxi', sobres: [sb('viajes', 'Viajes en app', '🚕', 'gasto', 100, 32)] },
      { v: 'pie', t: '🚶 Caminando o en bici', sobres: [] }
    ] },
    { id: 'comida', titulo: '¿En qué gastas de comida?', multi: true, opciones: [
      { v: 'fuera', t: '🍽️ Comer fuera o en la escuela/trabajo', sobres: [sb('comida', 'Comida', '🍽️', 'limite', 300, 20)] },
      { v: 'super', t: '🛒 Despensa o súper', sobres: [sb('despensa', 'Despensa', '🛒', 'gasto', 400, 21)] },
      { v: 'antojos', t: '☕ Antojos y snacks', sobres: [sb('antojos', 'Antojos', '☕', 'limite', 100, 40)] },
      { v: 'nada', t: 'Casi nada', sobres: [], excluye: true }
    ] },
    { id: 'escuela', perfiles: ['estudiante'], titulo: 'En la escuela, ¿en qué gastas?', multi: true, opciones: [
      { v: 'materiales', t: '📚 Materiales y proyectos', sobres: [sb('proyectos', 'Proyectos escolares', '📚', 'gasto', 100, 25)] },
      { v: 'copias', t: '🖨️ Copias e impresiones', sobres: [sb('copias', 'Copias e impresiones', '🖨️', 'limite', 30, 26)] },
      { v: 'colegiatura', t: '🎓 Colegiatura o inscripción', sobres: [sb('colegiatura', 'Colegiatura', '🎓', 'gasto', 300, 9)] },
      { v: 'eventos', t: '🎟️ Salidas o eventos escolares', sobres: [sb('eventos', 'Eventos escolares', '🎟️', 'gasto', 80, 41)] },
      { v: 'nada', t: 'En nada', sobres: [], excluye: true }
    ] },
    { id: 'trabajo', perfiles: ['diario'], titulo: 'Por tu trabajo, ¿gastas en…?', multi: true, opciones: [
      { v: 'ropa', t: '👔 Ropa o uniforme', sobres: [sb('ropatrabajo', 'Ropa de trabajo', '👔', 'gasto', 80, 27)] },
      { v: 'herramientas', t: '🔧 Herramientas o equipo', sobres: [sb('herramientas', 'Herramientas', '🔧', 'gasto', 100, 28)] },
      { v: 'nada', t: 'En nada', sobres: [], excluye: true }
    ] },
    { id: 'vivienda', titulo: '¿Pagas renta o hipoteca?', opciones: siNo([sb('renta', 'Renta', '🏠', 'gasto', 700, 5)]) },
    { id: 'servicios', titulo: '¿Pagas servicios como luz, agua, internet o celular?', opciones: siNo([sb('servicios', 'Servicios', '💡', 'gasto', 150, 6)]) },
    { id: 'subs', titulo: '¿Pagas suscripciones (música, series, apps)?', opciones: siNo([sb('suscripciones', 'Suscripciones', '📺', 'gasto', 80, 7)]) },
    { id: 'deuda', titulo: '¿Tienes alguna deuda o compra a plazos?', ayuda: 'Después pones cuánto debes y para cuándo.', opciones: siNo([sb('deuda', 'Deuda', '💳', 'deuda', 0, 1)]) },
    { id: 'extra', titulo: '¿En qué más gastas seguido?', multi: true, opciones: [
      { v: 'gym', t: '🏋️ Gym o deporte', sobres: [sb('gym', 'Gym', '🏋️', 'gasto', 100, 50)] },
      { v: 'mascota', t: '🐶 Mascota', sobres: [sb('mascota', 'Mascota', '🐶', 'gasto', 100, 51)] },
      { v: 'ropa', t: '👕 Ropa y cuidado personal', sobres: [sb('ropa', 'Ropa y cuidado personal', '👕', 'gasto', 100, 52)] },
      { v: 'salud', t: '💊 Salud y medicinas', sobres: [sb('salud', 'Salud', '💊', 'gasto', 50, 53)] },
      { v: 'familia', t: '❤️ Apoyo a mi familia', sobres: [sb('familia', 'Apoyo a mi familia', '❤️', 'gasto', 200, 8)] },
      { v: 'regalos', t: '🎁 Regalos y fechas especiales', sobres: [sb('regalos', 'Regalos', '🎁', 'ahorro', 50, 54)] }
    ] },
    { id: 'ocio', titulo: '¿Quieres un sobre para tus gustos y salidas?', ayuda: 'Es dinero que puedes gastar en lo que quieras.', def: 'si', opciones: siNo([sb('ocio', 'Ocio', '🎉', 'gasto', 200, 45, { disponible: true })]) },
    { id: 'ahorro', titulo: '¿Para qué quieres ahorrar?', multi: true, def: ['emergencias'], opciones: [
      { v: 'emergencias', t: '🛟 Emergencias', sobres: [sb('colchon', 'Colchón', '🛟', 'ahorro', 100, 60)] },
      { v: 'meta', t: '⭐ Una meta (auto, viaje, celular…)', sobres: [sb('meta', 'Mi meta', '⭐', 'ahorro', 150, 61, { meta: 5000 })] },
      { v: 'imprevistos', t: '🧾 Gastos inesperados', sobres: [sb('imprevistos', 'Imprevistos', '🧾', 'gasto', 50, 44)] },
      { v: 'nada', t: 'Por ahora no', sobres: [], excluye: true }
    ] },
    /* negocio */
    { id: 'negtipo', grupo: 'negocio', titulo: '¿Qué tipo de negocio es?', opciones: [
      { v: 'productos', t: '🛍️ Vendo productos', sobres: [sb('mercancia', 'Mercancía', '📦', 'gasto', 300, 20)] },
      { v: 'comida', t: '🌮 Vendo comida', sobres: [sb('insumos', 'Insumos', '🥬', 'gasto', 400, 20), sb('gas', 'Gas y combustible', '🔥', 'gasto', 100, 22)] },
      { v: 'servicio', t: '🛠️ Doy un servicio', sobres: [sb('materiales', 'Materiales', '🧰', 'gasto', 150, 20)] },
      { v: 'maquinas', t: '🎰 Máquinas o renta de equipo', sobres: [sb('mercancia', 'Mercancía', '📦', 'gasto', 250, 20), sb('mantenimiento', 'Mantenimiento', '🔧', 'gasto', 50, 23)] },
      { v: 'otro', t: '💼 Otro', sobres: [sb('gastosneg', 'Gastos del negocio', '💼', 'gasto', 200, 20)] }
    ] },
    { id: 'negrenta', grupo: 'negocio', titulo: '¿Pagas renta por el local o el lugar?', opciones: siNo([sb('rentaneg', 'Renta del local', '🏠', 'gasto', 100, 5)]) },
    { id: 'negreinv', grupo: 'negocio', titulo: '¿Quieres reinvertir una parte de cada venta o corte?', ayuda: 'Se aparta sola cada vez que registres un ingreso del negocio.', def: 'si', opciones: siNo([sb('reinversion', 'Reinversión', '📈', 'porIngreso', 100, 60)]) },
    { id: 'negextra', grupo: 'negocio', titulo: '¿El negocio gasta en…?', multi: true, opciones: [
      { v: 'envios', t: '🚚 Transporte o envíos', sobres: [sb('envios', 'Envíos', '🚚', 'gasto', 100, 30)] },
      { v: 'ayudantes', t: '👥 Pago a ayudantes', sobres: [sb('ayudantes', 'Ayudantes', '👥', 'gasto', 300, 10)] },
      { v: 'publicidad', t: '📣 Publicidad', sobres: [sb('publicidad', 'Publicidad', '📣', 'gasto', 50, 40)] },
      { v: 'servicios', t: '💡 Luz, agua o internet', sobres: [sb('servneg', 'Servicios del negocio', '💡', 'gasto', 100, 6)] },
      { v: 'impuestos', t: '🧾 Apartar para impuestos', sobres: [sb('impuestos', 'Impuestos', '🧾', 'porIngreso', 50, 61)] }
    ] }
  ];

  App.OPC_CUENTAS = [
    { v: 'efectivo', t: '💵 Efectivo', nombre: 'Efectivo', icono: '💵' },
    { v: 'banco', t: '🏦 Banco o tarjeta de débito', nombre: 'Banco', icono: '🏦' },
    { v: 'monedas', t: '🪙 Monedas', nombre: 'Monedas', icono: '🪙' },
    { v: 'digital', t: '📱 App o cuenta digital', nombre: 'Cuenta digital', icono: '📱' },
    { v: 'ahorro', t: '🐷 Cuenta de ahorro', nombre: 'Ahorro', icono: '🐷' }
  ];

  const nuevoOb = () => ({ paso: 0, nombre: '', perfil: '', resp: {}, negNombre: '', cuentas: ['efectivo', 'banco'], borrador: [], saldos: {}, negParte: '' });
  App.ui.ob = nuevoOb();
  App.nuevoOb = nuevoOb;

  const pasos = (ob) => {
    const p = ['inicio', 'nombre', 'perfil'];
    if (ob.perfil && ob.perfil !== 'cero') p.push('personal');
    if (ob.perfil === 'negocio') p.push('negocio');
    p.push('cuentas');
    if (ob.perfil && ob.perfil !== 'cero') p.push('revisar');
    p.push('saldos');
    return p;
  };
  const pasoActual = (ob) => pasos(ob)[ob.paso] || 'inicio';

  const aplica = (q, ob, grupo) => (q.grupo || 'personal') === grupo && (!q.perfiles || q.perfiles.includes(ob.perfil));
  const preguntasDe = (ob, grupo) => App.PREGUNTAS.filter((q) => aplica(q, ob, grupo));

  const respuesta = (ob, q) => {
    if (ob.resp[q.id] === undefined) ob.resp[q.id] = q.multi ? (q.def || []).slice() : (q.def || '');
    return ob.resp[q.id];
  };

  /* arma la lista de sobres con lo que contestó */
  App.armarSobres = (ob) => {
    const lista = [];
    const ya = {};
    App.PREGUNTAS.forEach((q) => {
      const grupo = q.grupo || 'personal';
      if (!aplica(q, ob, grupo)) return;
      if (grupo === 'negocio' && ob.perfil !== 'negocio') return;
      const r = respuesta(ob, q);
      const elegidas = q.multi ? r : [r];
      q.opciones.forEach((o) => {
        if (!elegidas.includes(o.v)) return;
        o.sobres.forEach((s) => {
          const esp = grupo === 'negocio' ? 'n' : 'p';
          const k = esp + ':' + s.key;
          if (ya[k]) return;
          ya[k] = true;
          lista.push(Object.assign({}, s, { esp, incluir: true, cuota: String(s.cuota), meta: s.meta ? String(s.meta) : '' }));
        });
      });
    });
    lista.sort((a, b) => (a.esp === b.esp ? 0 : a.esp === 'p' ? -1 : 1) || a.orden - b.orden);
    return lista;
  };

  /* crea cuentas, espacios y sobres */
  App.crearDesdeCuestionario = (ob) => {
    const s = App.defaultState();
    s.perfil.nombre = ob.nombre.trim();
    const elegidas = App.OPC_CUENTAS.filter((c) => ob.cuentas.includes(c.v));
    s.cuentas = (elegidas.length ? elegidas : [App.OPC_CUENTAS[0]]).map((c) => ({ id: U.uid(), nombre: c.nombre, icono: c.icono }));
    const personal = { id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [] };
    s.espacios = [personal];
    let negocio = null;
    if (ob.perfil === 'negocio') {
      const tipo = ob.resp.negtipo;
      negocio = { id: U.uid(), nombre: (ob.negNombre || '').trim() || 'Mi negocio', icono: { maquinas: '🎰', comida: '🌮', servicio: '🛠️' }[tipo] || '🏪', enDisponible: false, sobres: [] };
      s.espacios.push(negocio);
    }
    const num = (v) => U.r2(parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0);
    ob.borrador.filter((b) => b.incluir && String(b.nombre || '').trim()).forEach((b) => {
      const esp = b.esp === 'n' && negocio ? negocio : personal;
      esp.sobres.push({
        id: U.uid(), nombre: b.nombre.trim(), icono: b.icono, tipo: b.tipo, cuota: b.tipo === 'deuda' ? 0 : num(b.cuota),
        meta: num(b.meta), desde: b.tipo === 'deuda' ? U.today() : '', hasta: b.tipo === 'deuda' ? (b.hasta || '') : '',
        sobranteA: '', disponible: !!b.disponible
      });
    });
    // lo que sobre de comida o antojos pasa al primer ahorro el lunes
    s.espacios.forEach((e) => {
      const ahorro = e.sobres.find((x) => x.tipo === 'ahorro');
      if (ahorro) e.sobres.forEach((x) => { if (x.tipo === 'limite' && /comida|antojos/i.test(x.nombre)) x.sobranteA = ahorro.id; });
    });
    s.ajustes.ultimoCierre = U.weekStart(U.today());
    s.ajustes.ultimoResumen = U.weekStart(U.today());
    App.state = s;
    App.save();
  };

  /* ---------- pantallas ---------- */
  const chip = (on, attrs, txt) => '<button class="chip ' + (on ? 'on' : '') + '" data-a="ob-resp" ' + attrs + '>' + txt + '</button>';
  const bloquePregunta = (ob, q) => {
    const r = respuesta(ob, q);
    let h = '<div class="pregunta"><b>' + U.esc(q.titulo) + '</b>' + (q.ayuda ? '<small>' + U.esc(q.ayuda) + '</small>' : '') + '<div class="chips wrap">';
    q.opciones.forEach((o) => {
      const on = q.multi ? r.includes(o.v) : r === o.v;
      h += chip(on, 'data-q="' + q.id + '" data-v="' + o.v + '"', U.esc(o.t));
    });
    return h + '</div></div>';
  };
  const botones = (sig, txt) => '<div class="espaciador"></div><button class="btn" data-a="' + (sig || 'ob-sig') + '">' + (txt || 'Continuar') + '</button><button class="btn sec" data-a="ob-atras">Atrás</button>';

  App.pantallaBienvenida = () => {
    const ob = App.ui.ob;
    const paso = pasoActual(ob);
    let h = '<div class="bienvenida">';
    if (paso === 'inicio') {
      h += '<img class="logo" src="icons/icon-192.png" alt=""><h1>Control de<br>Finanzas</h1>' +
        '<p>Registra en segundos, sabe cuánto tienes disponible y organiza tu dinero en sobres. Funciona sin internet y tus datos se quedan en tu teléfono.</p>' +
        '<div class="espaciador"></div><button class="btn" data-a="ob-sig">Empezar</button><button class="btn sec" data-a="importar">Tengo una copia de seguridad</button>';
    } else if (paso === 'nombre') {
      h += '<h1>¿Cómo te llamas?</h1><p>Solo para saludarte.</p>' +
        '<label class="campo"><input data-in="ob-nombre" value="' + U.esc(ob.nombre) + '" placeholder="Tu nombre" autocomplete="given-name"></label>' + botones();
    } else if (paso === 'perfil') {
      h += '<h1>¿Qué te describe mejor?</h1><p>Con unas preguntas armamos tus sobres a tu medida.</p>';
      Object.keys(App.PERFILES).forEach((k) => {
        const p = App.PERFILES[k];
        h += '<button class="opcion ' + (ob.perfil === k ? 'on' : '') + '" data-a="ob-perfil" data-v="' + k + '"><div class="ico">' + p.icono + '</div><div><b>' + p.nombre + '</b><small>' + p.desc + '</small></div></button>';
      });
      h += '<div class="espaciador"></div><button class="btn" data-a="ob-sig" ' + (ob.perfil ? '' : 'disabled') + '>Continuar</button><button class="btn sec" data-a="ob-atras">Atrás</button>';
    } else if (paso === 'personal') {
      h += '<h1>' + (ob.perfil === 'negocio' ? 'Primero, tu dinero personal' : 'Cuéntame de tus gastos') + '</h1><p>Toca lo que aplique. Puedes elegir varias.</p>';
      preguntasDe(ob, 'personal').forEach((q) => { h += bloquePregunta(ob, q); });
      h += botones();
    } else if (paso === 'negocio') {
      h += '<h1>Tu negocio</h1><p>Así separamos su dinero del tuyo.</p>' +
        '<label class="campo"><span>¿Cómo se llama?</span><input data-in="ob-neg-nombre" value="' + U.esc(ob.negNombre) + '" placeholder="Ej. La tiendita, Mi máquina"></label>';
      preguntasDe(ob, 'negocio').forEach((q) => { h += bloquePregunta(ob, q); });
      h += botones();
    } else if (paso === 'cuentas') {
      h += '<h1>¿Dónde tienes tu dinero?</h1><p>Cada lugar será una cuenta. Después puedes cambiarles el nombre.</p><div class="chips wrap" style="margin-top:12px">';
      App.OPC_CUENTAS.forEach((c) => { h += '<button class="chip ' + (ob.cuentas.includes(c.v) ? 'on' : '') + '" data-a="ob-cuenta" data-v="' + c.v + '">' + c.t + '</button>'; });
      h += '</div>' + botones(ob.perfil === 'cero' ? 'ob-crear' : 'ob-sig');
    } else if (paso === 'revisar') {
      h += '<h1>Tus sobres</h1><p>Esto es lo que te propongo. Quita los que no quieras y ajusta cuánto apartar.</p>';
      let grupoActual = '';
      ob.borrador.forEach((b, i) => {
        const g = b.esp === 'n' ? ((ob.negNombre || '').trim() || 'Mi negocio') : 'Personal';
        if (g !== grupoActual) { grupoActual = g; h += '<div class="etq" style="margin-top:22px">' + U.esc(g) + '</div>'; }
        h += '<div class="rev ' + (b.incluir ? '' : 'off') + '"><div class="rev-cab"><span class="rev-ico">' + b.icono + '</span>' +
          '<input class="rev-nombre" data-ob="' + i + '|nombre" value="' + U.esc(b.nombre) + '" maxlength="30">' +
          '<span class="sw"><input type="checkbox" data-ob-inc="' + i + '" ' + (b.incluir ? 'checked' : '') + '><i></i></span></div>';
        if (b.incluir) {
          if (b.tipo === 'deuda') {
            h += '<div class="dos"><label class="campo"><span>¿Cuánto debes?</span><input inputmode="decimal" data-ob="' + i + '|meta" value="' + U.esc(b.meta) + '" placeholder="$0"></label>' +
              '<label class="campo"><span>¿Para cuándo?</span><input type="date" data-ob="' + i + '|hasta" value="' + U.esc(b.hasta) + '"></label></div>';
          } else {
            const et = b.tipo === 'porIngreso' ? 'por cada ingreso' : b.tipo === 'limite' ? 'tope por semana' : 'por semana';
            h += '<div class="dos"><label class="campo"><span>' + et + '</span><input inputmode="decimal" data-ob="' + i + '|cuota" value="' + U.esc(b.cuota) + '"></label>' +
              (b.key === 'meta' ? '<label class="campo"><span>¿Cuánto quieres juntar?</span><input inputmode="decimal" data-ob="' + i + '|meta" value="' + U.esc(b.meta) + '"></label>' : '<div></div>') + '</div>';
          }
        }
        h += '</div>';
      });
      if (!ob.borrador.length) h += '<p class="nota">No elegiste nada que necesite sobre. Puedes crearlos después en Ajustes.</p>';
      h += '<p class="nota">Puedes cambiar todo después en Ajustes → Espacios y sobres.</p>' + botones('ob-crear', 'Crear mis sobres');
    } else if (paso === 'saldos') {
      h += '<h1>¿Cuánto tienes hoy?</h1><p>Escribe lo que tienes en cada cuenta. Si no tienes algo, déjalo vacío.</p>';
      App.state.cuentas.forEach((c) => {
        h += '<label class="campo"><span>' + U.esc(c.icono) + ' ' + U.esc(c.nombre) + '</span><input inputmode="decimal" data-in="ob-saldo" data-id="' + c.id + '" value="' + U.esc(ob.saldos[c.id] || '') + '" placeholder="$0.00"></label>';
      });
      const neg = App.state.espacios.find((e) => !e.enDisponible);
      if (neg) h += '<label class="campo" style="margin-top:22px"><span>De todo eso, ¿cuánto es de ' + U.esc(neg.nombre) + '?</span><input inputmode="decimal" data-in="ob-neg-parte" value="' + U.esc(ob.negParte) + '" placeholder="$0.00"><small>Ese dinero quedará separado del tuyo.</small></label>';
      h += '<div class="espaciador"></div><button class="btn" data-a="ob-fin">Listo</button>';
    }
    return h + '</div>';
  };

  /* ---------- acciones ---------- */
  const ir = (delta) => { const ob = App.ui.ob; ob.paso = Math.max(0, Math.min(pasos(ob).length - 1, ob.paso + delta)); App.render(); window.scrollTo(0, 0); };
  App.accionesExtra = {
    'ob-sig': () => {
      const ob = App.ui.ob;
      const siguiente = pasos(ob)[ob.paso + 1];
      if (siguiente === 'revisar') ob.borrador = App.armarSobres(ob);
      ir(1);
    },
    'ob-atras': () => ir(-1),
    'ob-perfil': (el) => { const ob = App.ui.ob; if (ob.perfil !== el.dataset.v) { ob.resp = {}; } ob.perfil = el.dataset.v; if (ob.perfil === 'negocio' && !ob.cuentas.includes('monedas')) ob.cuentas.push('monedas'); App.render(); },
    'ob-resp': (el) => {
      const ob = App.ui.ob;
      const q = App.PREGUNTAS.find((x) => x.id === el.dataset.q); if (!q) return;
      const v = el.dataset.v;
      if (!q.multi) { ob.resp[q.id] = v; }
      else {
        const opc = q.opciones.find((o) => o.v === v);
        let r = respuesta(ob, q).slice();
        if (r.includes(v)) r = r.filter((x) => x !== v);
        else if (opc && opc.excluye) r = [v];
        else { r = r.filter((x) => { const o = q.opciones.find((p) => p.v === x); return !(o && o.excluye); }); r.push(v); }
        ob.resp[q.id] = r;
      }
      const y = window.scrollY; App.render(); window.scrollTo(0, y);
    },
    'ob-cuenta': (el) => {
      const ob = App.ui.ob; const v = el.dataset.v;
      ob.cuentas = ob.cuentas.includes(v) ? ob.cuentas.filter((x) => x !== v) : ob.cuentas.concat([v]);
      if (!ob.cuentas.length) ob.cuentas = [v];
      App.render();
    },
    'ob-crear': () => { App.crearDesdeCuestionario(App.ui.ob); ir(1); },
    'ob-fin': () => {
      const S = App.state; const ob = App.ui.ob;
      const personal = S.espacios[0];
      const num = (v) => U.r2(parseFloat(String(v || '').replace(/[^0-9.]/g, '')) || 0);
      S.cuentas.forEach((c) => { const v = num(ob.saldos[c.id]); if (v > 0) S.movs.push(App.nuevoMov({ tipo: 'inicial', monto: v, cuenta: c.id, espacio: personal.id, nota: 'Saldo inicial' })); });
      const neg = S.espacios.find((e) => !e.enDisponible);
      const parte = num(ob.negParte);
      if (neg && parte > 0) S.movs.push(App.nuevoMov({ tipo: 'mover', monto: parte, espacio: personal.id, sobre: '', espacio2: neg.id, sobre2: '', nota: 'Dinero inicial del negocio' }));
      S.ajustes.onboarding = false;
      App.save(); App.persistir();
      App.ui.ob = nuevoOb();
      App.ui.pantalla = 'inicio'; App.render();
      App.toast('¡Listo! Toca + para registrar tu primer gasto', 'largo');
    }
  };

  /* entradas de texto de la bienvenida */
  App.inputExtra = (el, evento) => {
    const ob = App.ui.ob;
    if (el.dataset.ob) {
      const [i, campo] = el.dataset.ob.split('|');
      if (ob.borrador[Number(i)]) ob.borrador[Number(i)][campo] = el.value;
      return true;
    }
    if (el.dataset.obInc !== undefined) {
      if (evento === 'change' && ob.borrador[Number(el.dataset.obInc)]) { ob.borrador[Number(el.dataset.obInc)].incluir = el.checked; const y = window.scrollY; App.render(); window.scrollTo(0, y); }
      return true;
    }
    const k = el.dataset.in;
    if (k === 'ob-nombre') { ob.nombre = el.value; return true; }
    if (k === 'ob-neg-nombre') { ob.negNombre = el.value; return true; }
    if (k === 'ob-saldo') { ob.saldos[el.dataset.id] = el.value; return true; }
    if (k === 'ob-neg-parte') { ob.negParte = el.value; return true; }
    return false;
  };
})();
