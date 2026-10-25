/* Control de Finanzas — bienvenida con preguntas para armar sobres a la medida */
(function () {
  const App = window.App;

  App.PERFILES = {
    estudiante: { nombre: 'Estudiante', icono: '🎓', desc: 'Escuela, transporte, comida y tus gustos.' },
    diario: { nombre: 'Con empleo', icono: '💼', desc: 'Tienes un empleo y quieres llevar el control de tu dinero.' },
    negocio: { nombre: 'Con negocio', icono: '🏪', desc: 'Tu dinero personal separado del de tu negocio.' },
    cero: { nombre: 'Desde cero', icono: '✏️', desc: 'Sin preguntas. Tú armas tus sobres después.' }
  };

  // sobre sugerido: clave, nombre, ícono, tipo, cantidad (por su frecuencia de pago; en ahorro, por semana), orden, extra
  const sb = (key, nombre, icono, tipo, cuota, orden, extra) => Object.assign({ key, nombre, icono, tipo, cuota, orden, meta: 0, hasta: '', disponible: false, frecPago: 'semanal', conFecha: false }, extra || {});
  const MES = { frecPago: 'mensual' };
  const MESF = { frecPago: 'mensual', conFecha: true };
  const siNo = (sobres) => [{ v: 'si', t: 'Sí', sobres }, { v: 'no', t: 'No', sobres: [] }];

  App.PREGUNTAS = [
    { id: 'ingreso', titulo: '¿Cada cuánto recibes dinero?', ayuda: 'Sueldo, ventas, lo que te dan… Con esto se calcula cuánto apartar cada vez.', def: 'semanal', opciones: [
      { v: 'diario', t: 'Cada día', sobres: [] }, { v: 'semanal', t: 'Cada semana', sobres: [] },
      { v: 'quincenal', t: 'Cada quincena', sobres: [] }, { v: 'mensual', t: 'Cada mes', sobres: [] }, { v: 'varia', t: 'Varía', sobres: [] }
    ] },
    { id: 'mov', titulo: '¿Cómo te mueves normalmente?', multi: true, otro: { icono: '🚏', tipo: 'gasto', ph: 'Ej. Metro, Bici rentada' }, opciones: [
      { v: 'publico', t: '🚌 Transporte público', sobres: [sb('transporte', 'Transporte', '🚌', 'limite', 150, 30)] },
      { v: 'auto', t: '🚗 Auto o moto', sobres: [sb('gasolina', 'Gasolina', '⛽', 'gasto', 300, 31)] },
      { v: 'apps', t: '🚕 Apps de viaje o taxi', sobres: [sb('viajes', 'Viajes en app', '🚕', 'gasto', 100, 32)] },
      { v: 'pie', t: '🚶 Caminando o en bici', sobres: [] }
    ] },
    { id: 'comida', titulo: '¿En qué gastas de comida?', multi: true, otro: { icono: '🍴', tipo: 'gasto', ph: 'Ej. Cafetería, Comida rápida' }, opciones: [
      { v: 'fuera', t: '🍽️ Comer fuera o en la escuela/trabajo', sobres: [sb('comida', 'Comida', '🍽️', 'limite', 300, 20)] },
      { v: 'super', t: '🛒 Despensa o súper', sobres: [sb('despensa', 'Despensa', '🛒', 'gasto', 400, 21)] },
      { v: 'antojos', t: '☕ Antojos y snacks', sobres: [sb('antojos', 'Antojos', '☕', 'limite', 100, 40)] },
      { v: 'nada', t: 'Casi nada', sobres: [], excluye: true }
    ] },
    { id: 'escuela', perfiles: ['estudiante'], titulo: 'En la escuela, ¿en qué gastas?', multi: true, otro: { icono: '📚', tipo: 'gasto', ph: 'Ej. Uniforme, Libros' }, opciones: [
      { v: 'materiales', t: '📚 Materiales y proyectos', sobres: [sb('proyectos', 'Proyectos escolares', '📚', 'gasto', 300, 25, MES)] },
      { v: 'copias', t: '🖨️ Copias e impresiones', sobres: [sb('copias', 'Copias e impresiones', '🖨️', 'limite', 30, 26)] },
      { v: 'colegiatura', t: '🎓 Colegiatura o inscripción', sobres: [sb('colegiatura', 'Colegiatura', '🎓', 'gasto', 1200, 9, MESF)] },
      { v: 'eventos', t: '🎟️ Salidas o eventos escolares', sobres: [sb('eventos', 'Eventos escolares', '🎟️', 'gasto', 300, 41, MES)] },
      { v: 'nada', t: 'En nada', sobres: [], excluye: true }
    ] },
    { id: 'trabajo', perfiles: ['diario'], titulo: 'Por tu trabajo, ¿gastas en…?', multi: true, otro: { icono: '💼', tipo: 'gasto', ph: 'Ej. Celular, Comidas del trabajo' }, opciones: [
      { v: 'ropa', t: '👔 Ropa o uniforme', sobres: [sb('ropatrabajo', 'Ropa de trabajo', '👔', 'gasto', 300, 27, MES)] },
      { v: 'herramientas', t: '🔧 Herramientas o equipo', sobres: [sb('herramientas', 'Herramientas', '🔧', 'gasto', 400, 28, MES)] },
      { v: 'nada', t: 'En nada', sobres: [], excluye: true }
    ] },
    { id: 'vivienda', titulo: '¿Pagas renta o hipoteca?', opciones: siNo([sb('renta', 'Renta', '🏠', 'gasto', 2800, 5, MESF)]) },
    { id: 'servicios', titulo: '¿Pagas servicios como luz, agua, internet o celular?', opciones: siNo([sb('servicios', 'Servicios', '💡', 'gasto', 600, 6, MESF)]) },
    { id: 'subs', titulo: '¿Pagas suscripciones (música, series, apps)?', opciones: siNo([sb('suscripciones', 'Suscripciones', '📺', 'gasto', 300, 7, MESF)]) },
    { id: 'deuda', titulo: '¿Tienes alguna deuda o compra a plazos?', ayuda: 'Después pones cuánto debes y para cuándo.', opciones: siNo([sb('deuda', 'Deuda', '📅', 'deuda', 0, 1)]) },
    { id: 'extra', titulo: '¿En qué más gastas seguido?', multi: true, otro: { icono: '⭐', tipo: 'gasto', ph: 'Ej. Lavandería, Barbería' }, opciones: [
      { v: 'gym', t: '🏋️ Gym o deporte', sobres: [sb('gym', 'Gym', '🏋️', 'gasto', 400, 50, MESF)] },
      { v: 'mascota', t: '🐶 Mascota', sobres: [sb('mascota', 'Mascota', '🐶', 'gasto', 400, 51, MES)] },
      { v: 'ropa', t: '👕 Ropa y cuidado personal', sobres: [sb('ropa', 'Ropa y cuidado personal', '👕', 'gasto', 400, 52, MES)] },
      { v: 'salud', t: '💊 Salud y medicinas', sobres: [sb('salud', 'Salud', '💊', 'gasto', 200, 53, MES)] },
      { v: 'familia', t: '❤️ Apoyo a mi familia', sobres: [sb('familia', 'Apoyo a mi familia', '❤️', 'gasto', 800, 8, MES)] },
      { v: 'regalos', t: '🎁 Regalos y fechas especiales', sobres: [sb('regalos', 'Regalos', '🎁', 'ahorro', 50, 54)] }
    ] },
    { id: 'ocio', titulo: '¿Quieres un sobre para tus gustos y salidas?', ayuda: 'Es dinero que puedes gastar en lo que quieras.', def: 'si', opciones: siNo([sb('ocio', 'Ocio', '🎉', 'gasto', 200, 45, { disponible: true })]) },
    { id: 'ahorro', titulo: '¿Para qué quieres ahorrar?', multi: true, def: ['emergencias'], otro: { icono: '🎯', tipo: 'ahorro', ph: 'Ej. Viaje, Celular' }, opciones: [
      { v: 'emergencias', t: '🛟 Emergencias', sobres: [sb('colchon', 'Colchón', '🛟', 'ahorro', 100, 60)] },
      { v: 'meta', t: '🎯 Una meta (auto, viaje, celular…)', sobres: [sb('meta', 'Mi meta', '🎯', 'ahorro', 150, 61, { meta: 5000 })] },
      { v: 'imprevistos', t: '🧾 Gastos inesperados', sobres: [sb('imprevistos', 'Imprevistos', '🧾', 'gasto', 50, 44)] },
      { v: 'nada', t: 'Por ahora no', sobres: [], excluye: true }
    ] },
    /* negocio */
    { id: 'negtipo', grupo: 'negocio', titulo: '¿Qué tipo de negocio es?', opciones: [
      { v: 'productos', t: '🛍️ Vendo productos', sobres: [sb('mercancia', 'Mercancía', '📦', 'gasto', 300, 20)] },
      { v: 'comida', t: '🌮 Vendo comida', sobres: [sb('insumos', 'Insumos', '🥬', 'gasto', 400, 20), sb('gas', 'Gas y combustible', '🔥', 'gasto', 100, 22)] },
      { v: 'servicio', t: '🛠️ Doy un servicio', sobres: [sb('materiales', 'Materiales', '🧰', 'gasto', 150, 20)] },
      { v: 'maquinas', t: '🎰 Máquinas o renta de equipo', sobres: [sb('mercancia', 'Mercancía', '📦', 'gasto', 250, 20), sb('mantenimiento', 'Mantenimiento', '🔧', 'gasto', 200, 23, MES)] },
      { v: 'otro', t: '💼 Otro', sobres: [sb('gastosneg', 'Gastos del negocio', '💼', 'gasto', 200, 20)] }
    ] },
    { id: 'negrenta', grupo: 'negocio', titulo: '¿Pagas renta por el local o el lugar?', opciones: siNo([sb('rentaneg', 'Renta del local', '🏠', 'gasto', 1500, 5, MESF)]) },
    { id: 'negreinv', grupo: 'negocio', titulo: '¿Quieres reinvertir una parte de cada venta o corte?', ayuda: 'Se aparta sola cada vez que registres un ingreso del negocio.', def: 'si', opciones: siNo([sb('reinversion', 'Reinversión', '📈', 'porIngreso', 100, 60)]) },
    { id: 'negextra', grupo: 'negocio', titulo: '¿El negocio gasta en…?', multi: true, otro: { icono: '🧾', tipo: 'gasto', ph: 'Ej. Bolsas, Refacciones' }, opciones: [
      { v: 'envios', t: '🚚 Transporte o envíos', sobres: [sb('envios', 'Envíos', '🚚', 'gasto', 100, 30)] },
      { v: 'ayudantes', t: '👥 Pago a ayudantes', sobres: [sb('ayudantes', 'Ayudantes', '👥', 'gasto', 300, 10)] },
      { v: 'publicidad', t: '📣 Publicidad', sobres: [sb('publicidad', 'Publicidad', '📣', 'gasto', 200, 40, MES)] },
      { v: 'servicios', t: '💡 Luz, agua o internet', sobres: [sb('servneg', 'Servicios del negocio', '💡', 'gasto', 400, 6, MESF)] },
      { v: 'impuestos', t: '🧾 Apartar para impuestos', sobres: [sb('impuestos', 'Impuestos', '🧾', 'porIngreso', 50, 61)] }
    ] }
  ];

  App.OPC_CUENTAS = [
    { v: 'efectivo', t: '💵 Efectivo', nombre: 'Efectivo', icono: '💵', partes: true, desc: 'Billetes y monedas que traes contigo.' },
    { v: 'banco', t: '🏦 Banco o tarjeta de débito', nombre: 'Banco', icono: '🏦', desc: 'Cuenta de un banco con sucursales: BBVA, Banorte, Santander…' },
    { v: 'digital', t: '📱 App o cuenta digital', nombre: 'Cuenta digital', icono: '📱', desc: 'Apps o bancos solo en el celular: Mercado Pago, Revolut, Nu, Spin…' },
    { v: 'ahorro', t: '💰 Cuenta de ahorro', nombre: 'Ahorro', icono: '💰', desc: 'Donde guardas dinero que no tocas, a veces con rendimiento.' },
    { v: 'credito', t: '💳 Tarjeta de crédito', nombre: 'Tarjeta de crédito', icono: '💳', tipo: 'credito', desc: 'Dinero que te presta el banco y pagas después.' }
  ];

  const nuevoOb = () => ({ paso: 0, nombre: '', perfil: '', resp: {}, custom: {}, otro: '', otroTxt: '', negNombre: '', cuentas: ['efectivo', 'banco'], cuentasExtra: [], borrador: [], saldos: {}, tc: {}, negParte: '', acomodo: {}, destino: {} });
  App.ui.ob = nuevoOb();
  App.nuevoOb = nuevoOb;

  const tieneSobres = () => App.state.espacios.some((e) => e.sobres.some((s) => s.tipo !== 'porIngreso'));
  const pasos = (ob) => {
    const p = ['inicio', 'nombre', 'perfil'];
    if (ob.perfil && ob.perfil !== 'cero') p.push('personal');
    if (ob.perfil === 'negocio') p.push('negocio');
    p.push('cuentas');
    if (ob.perfil && ob.perfil !== 'cero') p.push('revisar');
    p.push('saldos');
    if (ob.perfil && ob.perfil !== 'cero') p.push('acomodar');
    return p;
  };
  const pasoActual = (ob) => pasos(ob)[ob.paso] || 'inicio';

  const aplica = (q, ob, grupo) => (q.grupo || 'personal') === grupo && (!q.perfiles || q.perfiles.includes(ob.perfil));
  const preguntasDe = (ob, grupo) => App.PREGUNTAS.filter((q) => aplica(q, ob, grupo));

  const respuesta = (ob, q) => {
    if (ob.resp[q.id] === undefined) ob.resp[q.id] = q.multi ? (q.def || []).slice() : (q.def || '');
    return ob.resp[q.id];
  };
  const frecIngreso = (ob) => { const r = ob.resp.ingreso; return r && r !== 'varia' ? U.frec(r) : 'semanal'; };
  const num = (v) => U.r2(parseFloat(String(v === undefined || v === null ? '' : v).replace(/[^0-9.]/g, '')) || 0);
  const redondo = (x) => Math.max(1, Math.round(x));

  /* arma la lista de sobres con lo que contestó */
  App.armarSobres = (ob) => {
    const lista = [];
    const ya = {};
    const fA = frecIngreso(ob);
    const agregar = (s, grupo) => {
      const esp = grupo === 'negocio' ? 'n' : 'p';
      const k = esp + ':' + s.key;
      if (ya[k]) return;
      ya[k] = true;
      const cuota = s.tipo === 'ahorro' && s.cuota > 0 ? redondo(U.convertir(s.cuota, 'semanal', fA)) : s.cuota;
      lista.push(Object.assign({}, s, { esp, incluir: true, cuota: cuota ? String(cuota) : '', meta: s.meta ? String(s.meta) : '', frecAporte: fA, fechaPago: '' }));
    };
    App.PREGUNTAS.forEach((q) => {
      const grupo = q.grupo || 'personal';
      if (!aplica(q, ob, grupo)) return;
      if (grupo === 'negocio' && ob.perfil !== 'negocio') return;
      const r = respuesta(ob, q);
      const elegidas = q.multi ? r : [r];
      q.opciones.forEach((o) => { if (elegidas.includes(o.v)) o.sobres.forEach((s) => agregar(s, grupo)); });
      (ob.custom[q.id] || []).forEach((o, i) => {
        if (!elegidas.includes(o.v)) return;
        agregar(sb('x-' + q.id + '-' + o.v, o.t, q.otro.icono, q.otro.tipo, 0, 70 + i, { custom: true, frecPago: q.otro.tipo === 'ahorro' ? 'semanal' : 'mensual' }), grupo);
      });
    });
    lista.sort((a, b) => (a.esp === b.esp ? 0 : a.esp === 'p' ? -1 : 1) || a.orden - b.orden);
    return lista;
  };

  const opcionesCuentas = (ob) => App.OPC_CUENTAS.concat(ob.cuentasExtra || []);

  /* crea cuentas, espacios y sobres */
  App.crearDesdeCuestionario = (ob) => {
    const s = App.defaultState();
    s.perfil.nombre = ob.nombre.trim();
    s.ajustes.frecIngreso = frecIngreso(ob);
    App.state = s;
    const elegidas = opcionesCuentas(ob).filter((c) => ob.cuentas.includes(c.v));
    s.cuentas = (elegidas.length ? elegidas : [App.OPC_CUENTAS[0]]).map((c) => {
      const ct = { id: U.uid(), nombre: c.nombre, icono: c.icono, tipo: c.tipo || 'normal' };
      if (c.partes) ct.partes = true;
      if (ct.tipo === 'credito') Object.assign(ct, { limite: 0, diaCorte: '', diaPago: '', avisar: 3, clave: c.v });
      return ct;
    });
    const personal = { id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [] };
    s.espacios = [personal];
    let negocio = null;
    if (ob.perfil === 'negocio') {
      const tipo = ob.resp.negtipo;
      negocio = { id: U.uid(), nombre: (ob.negNombre || '').trim() || 'Mi negocio', icono: { maquinas: '🎰', comida: '🌮', servicio: '🛠️' }[tipo] || '🏪', enDisponible: false, sobres: [] };
      s.espacios.push(negocio);
    }
    ob.borrador.filter((b) => b.incluir && String(b.nombre || '').trim()).forEach((b) => {
      const esp = b.esp === 'n' && negocio ? negocio : personal;
      const esGasto = b.tipo === 'gasto' || b.tipo === 'limite';
      esp.sobres.push(App.nuevoSobre({
        nombre: b.nombre.trim(), icono: b.icono, tipo: b.tipo, cuota: b.tipo === 'deuda' ? 0 : num(b.cuota),
        meta: num(b.meta), desde: b.tipo === 'deuda' ? U.today() : '', hasta: b.tipo === 'deuda' ? (b.hasta || '') : '',
        disponible: !!b.disponible, frecPago: U.frec(b.frecPago), frecAporte: U.frec(b.frecAporte), fechaPago: esGasto ? (b.fechaPago || '') : ''
      }));
    });
    // lo que sobre de comida o antojos pasa al primer ahorro al terminar la semana
    s.espacios.forEach((e) => {
      const ahorro = e.sobres.find((x) => x.tipo === 'ahorro');
      if (ahorro) e.sobres.forEach((x) => { if (x.tipo === 'limite' && /comida|antojos/i.test(x.nombre)) { x.sobranteA = ahorro.id; x.cierre = App.finCicloAnterior(x, U.today()); } });
    });
    s.ajustes.ultimoCierre = U.weekStart(U.today());
    s.ajustes.ultimoResumen = U.weekStart(U.today());
    App.save();
  };

  /* ---------- pantallas ---------- */
  const chipOb = (on, attrs, txt, clase) => '<button class="chip ' + (on ? 'on ' : '') + (clase || '') + '" data-a="ob-resp" ' + attrs + '>' + txt + '</button>';
  const filaOtro = (ob, id, ph) => ob.otro === id
    ? '<div class="otro-fila"><input data-in="ob-otro" value="' + U.esc(ob.otroTxt) + '" placeholder="' + ph + '" maxlength="30" enterkeyhint="done"><button data-a="ob-otro-ok">Agregar</button></div>'
    : '';
  const bloquePregunta = (ob, q) => {
    const r = respuesta(ob, q);
    let h = '<div class="pregunta"><b>' + U.esc(q.titulo) + '</b>' + (q.ayuda ? '<small>' + U.esc(q.ayuda) + '</small>' : '') + '<div class="chips wrap">';
    q.opciones.forEach((o) => {
      const on = q.multi ? r.includes(o.v) : r === o.v;
      h += chipOb(on, 'data-q="' + q.id + '" data-v="' + o.v + '"', U.esc(o.t));
    });
    if (q.otro) {
      (ob.custom[q.id] || []).forEach((o) => { h += chipOb(r.includes(o.v), 'data-q="' + q.id + '" data-v="' + o.v + '"', q.otro.icono + ' ' + U.esc(o.t)); });
      h += '<button class="chip otro" data-a="ob-otro" data-q="' + q.id + '">＋ Otro</button>';
    }
    h += '</div>' + (q.otro ? filaOtro(ob, q.id, q.otro.ph || 'Escribe cuál') : '');
    return h + '</div>';
  };
  const botones = (sig, txt) => '<div class="espaciador"></div><button class="btn" data-a="' + (sig || 'ob-sig') + '">' + (txt || 'Continuar') + '</button><button class="btn sec" data-a="ob-atras">Atrás</button>';

  /* texto del aporte de un sobre del borrador */
  const calcBorrador = (b) => {
    const fA = U.frec(b.frecAporte);
    if (b.tipo === 'porIngreso') return '';
    if (b.tipo === 'deuda') {
      if (!(num(b.meta) > 0 && b.hasta)) return 'Pon cuánto debes y para cuándo.';
      const n = Math.max(1, U.contarPeriodos(fA, U.today(), b.hasta));
      return 'Se apartan <b>' + U.money(Math.ceil(num(b.meta) / n * 100) / 100) + '</b> ' + U.FREC_CADA[fA] + '.';
    }
    if (b.tipo === 'ahorro') return num(b.cuota) > 0 ? 'Se apartan <b>' + U.money(num(b.cuota)) + '</b> ' + U.FREC_CADA[fA] + '.' : 'Pon cuánto quieres guardar.';
    if (!(num(b.cuota) > 0)) return 'Pon cuánto es para calcular el aporte.';
    return 'Se apartan <b>≈ ' + U.money(U.convertir(num(b.cuota), b.frecPago, fA)) + '</b> ' + U.FREC_CADA[fA] + '.';
  };

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
      h += '<h1>¿Dónde tienes tu dinero?</h1><p>Cada lugar será una cuenta. En efectivo puedes llevar billetes y monedas por separado.</p><div class="chips wrap" style="margin-top:12px">';
      h = h.replace(/<div class="chips wrap" style="margin-top:12px">$/, '<div style="margin-top:8px">');
      opcionesCuentas(ob).forEach((c) => {
        const on = ob.cuentas.includes(c.v);
        h += '<button class="opcion ' + (on ? 'on' : '') + '" data-a="ob-cuenta" data-v="' + c.v + '"><div class="ico">' + U.esc(c.icono) + '</div><div style="flex:1"><b>' + U.esc(c.t.replace(c.icono, '').trim()) + '</b><small>' + U.esc(c.desc || '') + '</small></div><span class="marca">' + (on ? '✓' : '') + '</span></button>';
      });
      h += '<div class="chips wrap" style="margin-top:12px"><button class="chip otro" data-a="ob-otro" data-q="cuentas">＋ Otra cuenta</button></div></div>' + filaOtro(ob, 'cuentas', 'Ej. Banco Azteca, Hey Banco');
      h += botones(ob.perfil === 'cero' ? 'ob-crear' : 'ob-sig');
    } else if (paso === 'revisar') {
      h += '<h1>Tus sobres</h1><p>Esto es lo que te propongo. Ajusta cuánto es, cada cuánto lo pagas y cada cuánto apartas.</p>';
      let grupoActual = '';
      ob.borrador.forEach((b, i) => {
        const g = b.esp === 'n' ? ((ob.negNombre || '').trim() || 'Mi negocio') : 'Personal';
        if (g !== grupoActual) { grupoActual = g; h += '<div class="etq" style="margin-top:22px">' + U.esc(g) + '</div>'; }
        h += '<div class="rev ' + (b.incluir ? '' : 'off') + '"><div class="rev-cab"><span class="rev-ico">' + b.icono + '</span>' +
          '<input class="rev-nombre" data-ob="' + i + '|nombre" value="' + U.esc(b.nombre) + '" maxlength="30">' +
          '<label class="sw"><input type="checkbox" data-ob-inc="' + i + '" ' + (b.incluir ? 'checked' : '') + '><i></i></label></div>';
        if (b.incluir) {
          const esGasto = b.tipo === 'gasto' || b.tipo === 'limite';
          if (b.tipo === 'deuda') {
            h += '<div class="dos"><label class="campo"><span>¿Cuánto debes?</span><input inputmode="decimal" data-ob="' + i + '|meta" value="' + U.esc(b.meta) + '" placeholder="$0"></label>' +
              '<label class="campo"><span>¿Para cuándo?</span><input type="date" data-ob="' + i + '|hasta" data-obr="1" value="' + U.esc(b.hasta) + '"></label></div>';
          } else if (b.tipo === 'porIngreso') {
            h += '<div class="dos"><label class="campo"><span>Por cada ingreso</span><input inputmode="decimal" data-ob="' + i + '|cuota" value="' + U.esc(b.cuota) + '"></label><div></div></div>';
          } else if (b.tipo === 'ahorro') {
            h += '<div class="dos"><label class="campo"><span>¿Cuánto guardar?</span><input inputmode="decimal" data-ob="' + i + '|cuota" value="' + U.esc(b.cuota) + '" placeholder="$0"></label>' +
              (b.key === 'meta' || b.custom ? '<label class="campo"><span>¿Cuánto quieres juntar?</span><input inputmode="decimal" data-ob="' + i + '|meta" value="' + U.esc(b.meta) + '" placeholder="Opcional"></label>' : '<div></div>') + '</div>';
          } else {
            const conFecha = ['quincenal', 'mensual', 'semestral', 'anual'].includes(U.frec(b.frecPago));
            h += '<div class="dos"><label class="campo"><span>' + (b.tipo === 'limite' ? 'Tope' : '¿Cuánto es?') + '</span><input inputmode="decimal" data-ob="' + i + '|cuota" value="' + U.esc(b.cuota) + '" placeholder="$0"></label>' +
              (conFecha ? '<label class="campo"><span>Próximo pago (opcional)</span><input type="date" data-ob="' + i + '|fechaPago" value="' + U.esc(b.fechaPago) + '"></label>' : '<div></div>') + '</div>';
            h += '<div class="sub-etq">Cada cuánto lo pagas o gastas</div>' + App.tabsFrec('ob-frec-pago', U.frec(b.frecPago), 'data-i="' + i + '"');
          }
          if (esGasto || b.tipo === 'ahorro' || b.tipo === 'deuda') {
            h += '<div class="sub-etq">Cada cuánto apartas</div>' + App.tabsFrec('ob-frec-aporte', U.frec(b.frecAporte), 'data-i="' + i + '"');
            h += '<div class="calc-aporte" id="ob-calc-' + i + '">' + calcBorrador(b) + '</div>';
          }
        }
        h += '</div>';
      });
      if (!ob.borrador.length) h += '<p class="nota">No elegiste nada que necesite sobre. Puedes crearlos después en Ajustes.</p>';
      h += '<p class="nota">El aporte empieza en "' + U.FREC_TXT[frecIngreso(ob)].toLowerCase() + '" porque así recibes dinero. Todo se puede cambiar después en Ajustes → Espacios y sobres.</p>' + botones('ob-crear', 'Crear mis sobres');
    } else if (paso === 'saldos') {
      h += '<h1>¿Cuánto tienes hoy?</h1><p>Escribe lo que tienes en cada cuenta. Si no tienes algo, déjalo vacío.</p>';
      const campo = (clave, titulo, ph) => '<label class="campo"><span>' + titulo + '</span><input inputmode="decimal" data-in="ob-saldo" data-id="' + clave + '" value="' + U.esc(ob.saldos[clave] || '') + '" placeholder="' + (ph || '$0.00') + '"></label>';
      App.state.cuentas.forEach((c) => {
        if (c.partes) h += '<div class="dos">' + campo(c.id + ':b', '💵 ' + U.esc(c.nombre) + ': billetes') + campo(c.id + ':m', '🪙 ' + U.esc(c.nombre) + ': monedas') + '</div>';
        else if (App.esCredito(c)) {
          const t = ob.tc[c.id] || (ob.tc[c.id] = { nombre: '', limite: '', debe: '', diaCorte: '', diaPago: '' });
          const tc = (k, titulo, ph, modo) => '<label class="campo"><span>' + titulo + '</span><input inputmode="' + (modo || 'decimal') + '" data-in="ob-tc" data-id="' + c.id + '" data-k="' + k + '" value="' + U.esc(t[k]) + '" placeholder="' + ph + '"></label>';
          h += '<div class="etq" style="margin-top:22px">💳 Tarjeta de crédito</div>' +
            '<label class="campo" style="margin-top:0"><span>Banco o nombre</span><input data-in="ob-tc" data-id="' + c.id + '" data-k="nombre" value="' + U.esc(t.nombre) + '" placeholder="Ej. BBVA, Nu, Banamex" maxlength="30"></label>' +
            '<div class="dos">' + tc('limite', 'Límite de crédito', '$0') + tc('debe', '¿Cuánto debes hoy?', '$0') + '</div>' +
            '<div class="dos">' + tc('diaCorte', 'Día de corte', '1 a 31', 'numeric') + tc('diaPago', 'Día límite de pago', '1 a 31', 'numeric') + '</div>' +
            '<p class="nota">Lo que ya debes se junta poco a poco de tus ingresos hasta tu fecha de pago.</p>';
        } else h += campo(c.id, U.esc(c.icono) + ' ' + U.esc(c.nombre));
      });
      const neg = App.state.espacios.find((e) => !e.enDisponible);
      if (neg) h += '<label class="campo" style="margin-top:22px"><span>De todo eso, ¿cuánto es de ' + U.esc(neg.nombre) + '?</span><input inputmode="decimal" data-in="ob-neg-parte" value="' + U.esc(ob.negParte) + '" placeholder="$0.00"><small>Ese dinero quedará separado del tuyo.</small></label>';
      h += '<div class="espaciador"></div><button class="btn" data-a="ob-saldos">' + (pasos(ob).includes('acomodar') && tieneSobres() ? 'Continuar' : 'Listo') + '</button>';
      if (ob.perfil !== 'cero' || App.state.espacios[0].sobres.length) h += '<button class="btn sec" data-a="ob-atras">Atrás</button>';
    } else if (paso === 'acomodar') {
      h += pantallaAcomodo(ob);
    }
    return h + '</div>';
  };

  /* ---------- acomodar el dinero que ya tiene ---------- */
  const iniciarAcomodo = (ob) => {
    const c = App.calc();
    ob.acomodo = {}; ob.destino = {};
    App.state.espacios.forEach((e) => {
      let libre = Math.max(0, c.esp[e.id].libre);
      App.propuestaAcomodo(e.id, c).forEach((x) => {
        const v = Math.min(x.necesita, Math.floor(libre));
        ob.acomodo[x.s.id] = v > 0 ? String(v) : '';
        libre -= Math.max(0, v);
      });
      ob.destino[e.id] = '';
    });
  };
  const sumaEsp = (ob, e) => e.sobres.reduce((t, s) => t + num(ob.acomodo[s.id]), 0);
  const lineaSobra = (ob, e, c) => {
    const libre = c.esp[e.id].libre;
    const resto = U.r2(libre - sumaEsp(ob, e));
    return resto < -0.004 ? '<span class="neg">Te pasas por ' + U.money(-resto) + '</span>' : 'Sobran <b class="num">' + U.money(resto) + '</b>';
  };
  const pantallaAcomodo = (ob) => {
    const c = App.calc();
    let h = '<h1>Acomoda tu dinero</h1><p>Te propongo cuánto poner en cada sobre para que todo quede en su lugar. Cambia lo que quieras.</p>';
    App.state.espacios.forEach((e) => {
      const lista = App.propuestaAcomodo(e.id, c);
      if (!lista.length) return;
      const libre = c.esp[e.id].libre;
      const necesita = lista.reduce((t, x) => t + x.necesita, 0);
      h += '<div class="seccion acomodo"><div class="seccion-titulo"><h2>' + U.esc(e.icono + ' ' + e.nombre) + '</h2><span class="num" style="color:var(--text-2);font-size:14px">Tienes ' + U.money(libre) + '</span></div>';
      lista.forEach((x) => {
        h += '<div class="fila"><div class="ico">' + U.esc(x.s.icono) + '</div><div class="txt"><b>' + U.esc(x.s.nombre) + '</b><small>' + U.esc(x.motivo) + (x.necesita > 0 ? ' · sugerido ' + U.money0(x.necesita) : '') + '</small></div>' +
          '<div class="der"><input inputmode="decimal" data-in="ob-ac" data-id="' + x.s.id + '" data-esp="' + e.id + '" value="' + U.esc(ob.acomodo[x.s.id] || '') + '" placeholder="$0"></div></div>';
      });
      if (necesita > libre + 0.5) h += '<p class="nota cuidado">No alcanza para todo: faltan ' + U.money(necesita - libre) + '. Se completa con tus próximos ingresos.</p>';
      const destinos = e.sobres.filter((s) => s.tipo === 'ahorro' || s.disponible);
      h += '<div class="etq">Lo que sobre va a</div><div class="chips wrap">' +
        '<button class="chip ' + (!ob.destino[e.id] ? 'on' : '') + '" data-a="ob-destino" data-esp="' + e.id + '" data-v="">✨ Libre</button>' +
        destinos.map((s) => '<button class="chip ' + (ob.destino[e.id] === s.id ? 'on' : '') + '" data-a="ob-destino" data-esp="' + e.id + '" data-v="' + s.id + '">' + U.esc(s.icono + ' ' + s.nombre) + '</button>').join('') + '</div>';
      h += '<p class="nota" id="ac-sobra-' + e.id + '" style="font-size:15px">' + lineaSobra(ob, e, c) + '</p></div>';
    });
    h += '<div class="espaciador"></div><button class="btn" data-a="ob-fin">Acomodar mi dinero</button><button class="btn sec" data-a="ob-fin-sin">Ahora no, lo dejo libre</button><button class="btn sec" data-a="ob-atras">Atrás</button>';
    return h;
  };

  /* ---------- acciones ---------- */
  const ir = (delta) => { const ob = App.ui.ob; ob.paso = Math.max(0, Math.min(pasos(ob).length - 1, ob.paso + delta)); App.render(); window.scrollTo(0, 0); };
  const quedarse = () => { const y = window.scrollY; App.render(); window.scrollTo(0, y); };
  const quitarMovsOb = () => { App.state.movs = App.state.movs.filter((m) => !m.ob); };
  const terminar = () => {
    const S = App.state;
    S.movs.forEach((m) => { delete m.ob; });
    S.ajustes.onboarding = false;
    App.save(); App.persistir();
    App.ui.ob = nuevoOb();
    App.ui.pantalla = 'inicio'; App.render(); window.scrollTo(0, 0);
    App.toast('¡Listo! Toca + para registrar tu primer gasto', 'largo');
  };
  const agregarOtro = () => {
    const ob = App.ui.ob;
    const txt = String(ob.otroTxt || '').trim();
    if (!txt) { ob.otro = ''; quedarse(); return; }
    const v = 'x' + Date.now().toString(36);
    if (ob.otro === 'cuentas') {
      ob.cuentasExtra.push({ v, t: '🏦 ' + txt, nombre: txt, icono: '🏦', desc: 'Cuenta que agregaste.' });
      ob.cuentas.push(v);
    } else {
      const q = App.PREGUNTAS.find((x) => x.id === ob.otro);
      if (q) {
        (ob.custom[q.id] = ob.custom[q.id] || []).push({ v, t: txt });
        const r = respuesta(ob, q).filter((x) => { const o = q.opciones.find((p) => p.v === x); return !(o && o.excluye); });
        r.push(v); ob.resp[q.id] = r;
      }
    }
    ob.otro = ''; ob.otroTxt = '';
    quedarse();
  };

  App.accionesExtra = {
    'ob-sig': () => {
      const ob = App.ui.ob;
      if (ob.otro && String(ob.otroTxt || '').trim()) agregarOtro();
      const siguiente = pasos(ob)[ob.paso + 1];
      if (siguiente === 'revisar') ob.borrador = App.armarSobres(ob);
      ir(1);
    },
    'ob-atras': () => {
      const ob = App.ui.ob;
      if (pasoActual(ob) === 'acomodar') quitarMovsOb();
      ir(-1);
    },
    'ob-perfil': (el) => { const ob = App.ui.ob; if (ob.perfil !== el.dataset.v) { ob.resp = {}; ob.custom = {}; } ob.perfil = el.dataset.v; App.render(); },
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
      quedarse();
    },
    'ob-otro': (el) => {
      const ob = App.ui.ob; ob.otro = el.dataset.q; ob.otroTxt = '';
      quedarse();
      const inp = document.querySelector('[data-in="ob-otro"]'); if (inp) inp.focus();
    },
    'ob-otro-ok': () => agregarOtro(),
    'ob-cuenta': (el) => {
      const ob = App.ui.ob; const v = el.dataset.v;
      ob.cuentas = ob.cuentas.includes(v) ? ob.cuentas.filter((x) => x !== v) : ob.cuentas.concat([v]);
      if (!ob.cuentas.filter((x) => x !== 'credito').length) ob.cuentas = ob.cuentas.includes('efectivo') ? ob.cuentas : ['efectivo'].concat(ob.cuentas);
      App.render();
    },
    'ob-frec-pago': (el) => {
      const b = App.ui.ob.borrador[Number(el.dataset.i)]; if (!b) return;
      if (num(b.cuota) > 0 && U.frec(b.frecPago) !== el.dataset.v) b.cuota = String(redondo(U.convertir(num(b.cuota), b.frecPago, el.dataset.v)));
      b.frecPago = el.dataset.v;
      if (!['quincenal', 'mensual', 'semestral', 'anual'].includes(b.frecPago)) b.fechaPago = '';
      quedarse();
    },
    'ob-frec-aporte': (el) => {
      const b = App.ui.ob.borrador[Number(el.dataset.i)]; if (!b) return;
      if (b.tipo === 'ahorro' && num(b.cuota) > 0) b.cuota = String(redondo(U.convertir(num(b.cuota), b.frecAporte, el.dataset.v)));
      b.frecAporte = el.dataset.v; quedarse();
    },
    'ob-crear': () => {
      const ob = App.ui.ob;
      if (ob.otro && String(ob.otroTxt || '').trim()) agregarOtro();
      App.crearDesdeCuestionario(ob); ob.saldos = {}; ob.tc = {}; ir(1);
    },
    'ob-saldos': () => {
      const S = App.state; const ob = App.ui.ob;
      quitarMovsOb();
      const personal = S.espacios[0];
      // tarjetas de crédito: datos y lo que ya se debe
      for (const c of S.cuentas.filter((x) => App.esCredito(x))) {
        const t = ob.tc[c.id] || {};
        const dc = parseInt(t.diaCorte, 10), dp = parseInt(t.diaPago, 10);
        if (!(dc >= 1 && dc <= 31 && dp >= 1 && dp <= 31)) return App.toast('Pon el día de corte y el de pago de tu tarjeta', 'error');
        Object.assign(c, { nombre: String(t.nombre || '').trim() || 'Tarjeta de crédito', limite: num(t.limite), diaCorte: dc, diaPago: dp });
      }
      S.cuentas.forEach((c) => {
        const ini = (monto, extra) => S.movs.push(App.nuevoMov(Object.assign({ tipo: 'inicial', monto, cuenta: c.id, espacio: personal.id, nota: 'Saldo inicial', ob: true }, extra || {})));
        if (App.esCredito(c)) {
          const debe = num((ob.tc[c.id] || {}).debe);
          if (debe > 0) { App.sobreTarjeta(personal.id, c.id, true); ini(-debe, { diferido: true, meses: 1, nota: 'Deuda inicial de la tarjeta' }); }
        } else if (c.partes) {
          if (num(ob.saldos[c.id + ':b']) > 0) ini(num(ob.saldos[c.id + ':b']), { sub: 'b' });
          if (num(ob.saldos[c.id + ':m']) > 0) ini(num(ob.saldos[c.id + ':m']), { sub: 'm' });
        } else if (num(ob.saldos[c.id]) > 0) ini(num(ob.saldos[c.id]));
      });
      const neg = S.espacios.find((e) => !e.enDisponible);
      const parte = num(ob.negParte);
      if (neg && parte > 0) S.movs.push(App.nuevoMov({ tipo: 'mover', monto: parte, espacio: personal.id, sobre: '', espacio2: neg.id, sobre2: '', nota: 'Dinero inicial del negocio', ob: true }));
      App.save();
      if (pasos(ob).includes('acomodar') && tieneSobres()) { iniciarAcomodo(ob); ir(1); }
      else terminar();
    },
    'ob-destino': (el) => {
      const ob = App.ui.ob; ob.destino[el.dataset.esp] = el.dataset.v; quedarse();
    },
    'ob-fin': () => {
      const S = App.state; const ob = App.ui.ob; const c = App.calc();
      for (const e of S.espacios) {
        if (sumaEsp(ob, e) > c.esp[e.id].libre + 0.004) return App.toast('En ' + e.nombre + ' pusiste más de lo que tienes', 'error');
      }
      S.espacios.forEach((e) => {
        let puesto = 0;
        e.sobres.forEach((s) => {
          const v = num(ob.acomodo[s.id]);
          if (v > 0) { S.movs.push(App.nuevoMov({ tipo: 'mover', monto: v, espacio: e.id, sobre: '', espacio2: e.id, sobre2: s.id, nota: 'Acomodo inicial', origen: 'auto' })); puesto += v; }
        });
        const resto = U.r2(c.esp[e.id].libre - puesto);
        const dest = ob.destino[e.id] && e.sobres.find((s) => s.id === ob.destino[e.id]);
        if (dest && resto > 0.004) S.movs.push(App.nuevoMov({ tipo: 'mover', monto: resto, espacio: e.id, sobre: '', espacio2: e.id, sobre2: dest.id, nota: 'Acomodo inicial', origen: 'auto' }));
      });
      U.haptic();
      terminar();
    },
    'ob-fin-sin': () => terminar()
  };

  /* entradas de texto de la bienvenida */
  App.inputExtra = (el, evento) => {
    const ob = App.ui.ob;
    if (el.dataset.ob) {
      const [i, campo] = el.dataset.ob.split('|');
      const b = ob.borrador[Number(i)];
      if (b) {
        b[campo] = el.value;
        const calc = document.getElementById('ob-calc-' + i);
        if (calc) calc.innerHTML = calcBorrador(b);
      }
      return true;
    }
    if (el.dataset.obInc !== undefined) {
      if (evento === 'change' && ob.borrador[Number(el.dataset.obInc)]) { ob.borrador[Number(el.dataset.obInc)].incluir = el.checked; quedarse(); }
      return true;
    }
    const k = el.dataset.in;
    if (k === 'ob-nombre') { ob.nombre = el.value; return true; }
    if (k === 'ob-neg-nombre') { ob.negNombre = el.value; return true; }
    if (k === 'ob-saldo') { ob.saldos[el.dataset.id] = el.value; return true; }
    if (k === 'ob-neg-parte') { ob.negParte = el.value; return true; }
    if (k === 'ob-otro') { ob.otroTxt = el.value; return true; }
    if (k === 'ob-tc') { (ob.tc[el.dataset.id] = ob.tc[el.dataset.id] || {})[el.dataset.k] = el.value; return true; }
    if (k === 'ob-ac') {
      ob.acomodo[el.dataset.id] = el.value;
      const e = App.espacio(el.dataset.esp);
      const linea = document.getElementById('ac-sobra-' + el.dataset.esp);
      if (e && linea) linea.innerHTML = lineaSobra(ob, e, App.calc());
      return true;
    }
    return false;
  };

  /* Enter en "Otro" agrega la opción */
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target && ev.target.dataset && ev.target.dataset.in === 'ob-otro') { ev.preventDefault(); agregarOtro(); }
  });
})();
