/* Control de Finanzas — datos y almacenamiento local (funciona sin internet) */
(function () {
  const KEY = 'control-finanzas-v1';
  const App = window.App || (window.App = {});

  App.TIPOS_SOBRE = {
    gasto: { nombre: 'Gasto', desc: 'Lo que gastas o pagas cada cierto tiempo (comida, renta, gym). Con fecha de pago, se junta completo para ese día. Lo que no gastes se queda en el sobre.' },
    limite: { nombre: 'Gasto con tope', desc: 'Un máximo para gastar en cada periodo (ej. $250 a la semana de transporte). Lo que sobre cuenta para el siguiente o pasa a otro sobre.' },
    ahorro: { nombre: 'Ahorro', desc: 'Guarda una cantidad cada cierto tiempo. Puedes ponerle una meta y una fecha.' },
    deuda: { nombre: 'Pago único', desc: 'Junta un total antes de una fecha (una deuda, una compra a plazos). El aporte se calcula solo.' },
    porIngreso: { nombre: 'Por cada ingreso', desc: 'Cada vez que registras un ingreso en este espacio, aparta una cantidad fija o un porcentaje (ej. 10% para impuestos).' }
  };
  // "tarjeta" es un sobre interno: junta poco a poco lo que debes de compras a pagar después
  App.TIPO_TARJETA = { nombre: 'Pago de tarjeta', desc: 'Junta poco a poco lo de tus compras con tarjeta de crédito que elegiste pagar después.' };
  App.tipoSobre = (t) => App.TIPOS_SOBRE[t] || (t === 'tarjeta' ? App.TIPO_TARJETA : App.TIPOS_SOBRE.gasto);

  App.FONDOS = [
    { id: 'aurora', nombre: 'Aurora' },
    { id: 'oceano', nombre: 'Océano' },
    { id: 'brasa', nombre: 'Brasa' },
    { id: 'bosque', nombre: 'Bosque' },
    { id: 'grafito', nombre: 'Grafito' },
    { id: 'negro', nombre: 'Negro' },
    { id: 'planetas', nombre: 'Planetas', nuevo: true }
  ];

  App.EMOJIS = ['👤', '🏪', '🎰', '💼', '🏠', '🍽️', '🚌', '🎉', '🚗', '🛟', '💳', '📅', '📦', '📈', '🎓', '💊', '🎁', '👕', '📱', '🐶', '✈️', '🏋️', '☕', '🎮', '🧾', '💡', '🛒', '🏦', '💵', '🪙', '💰', '🎯', '⭐', '🔧', '❤️', '📚',
    '🍔', '🌮', '🍕', '🥗', '🍎', '🥩', '🍺', '🍷', '🧃', '🍰', '⛽', '🚕', '🚇', '🛵', '🚲', '🅿️', '🛠️', '🧰', '🧹', '🧺', '🛋️', '🔌', '💧', '🔥', '📶', '🌐', '💻', '🖥️', '🎧', '📺', '🎬', '🎵', '📷', '🕹️', '⚽', '🏀', '🎾', '🧘', '💪', '💇', '💅', '🧴', '🪥', '🦷', '🩺', '🏥', '👶', '🧸', '🐱', '🐾', '🌱', '🌸', '🎂', '🎈', '💍', '👗', '👟', '🕶️', '⌚', '🎒', '✏️', '📝', '🏫', '🏢', '🧑‍💻', '🤝', '📣', '🚚', '📮', '🏷️', '🧮', '💸', '💲', '🏧', '📊', '📉', '🔒', '🛡️', '⚖️', '🏖️', '🏕️', '🗺️', '🎟️', '🙏', '⛪', '🎄', '🌙', '☀️', '⚡', '🔔', '📆', '⏰', '🚨', '✅', '🌟', '💎', '🏆', '🍀'];

  App.defaultState = () => ({
    v: 2,
    creado: Date.now(),
    perfil: { nombre: '' },
    ajustes: {
      fondo: 'aurora',
      pin: null,
      vibracion: true,
      cuadreNoche: false,
      horaCuadre: 21,
      repartirSolo: true,
      notifPagos: true,
      notifCuadre: true,
      notifPasado: true,
      notifLibre: true,
      ultimoCuadre: '',
      ultimoResumen: '',
      ultimoCierre: '',
      syncUrl: '',
      ultimaSync: 0,
      onboarding: true,
      rango: 'semana',
      frecIngreso: 'semanal',
      alertas: true,
      alertaSobre: 20,
      alertaTarjeta: 20,
      sonidos: true
    },
    cuentas: [],
    espacios: [],
    movs: [],
    recurrentes: [],
    bandeja: [],
    borrados: []
  });

  App.load = () => {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; }
    // antes de actualizar datos viejos, guarda una copia intacta por si acaso
    if (s && (s.v || 1) < 2 && Array.isArray(s.cuentas) && s.cuentas.length) {
      try { localStorage.setItem(KEY + '-copia-v1', JSON.stringify(s)); } catch (e) { /* nada */ }
    }
    App.state = App.migrate(s || App.defaultState());
    if (s && (s.v || 1) < 2) App.save();
    return App.state;
  };

  App.migrate = (s) => {
    const d = App.defaultState();
    const vieja = (s.v || 1) < 2;
    s.ajustes = Object.assign({}, d.ajustes, s.ajustes || {});
    s.perfil = Object.assign({}, d.perfil, s.perfil || {});
    ['cuentas', 'espacios', 'movs', 'recurrentes', 'bandeja', 'borrados'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    s.ajustes.frecIngreso = U.frec(s.ajustes.frecIngreso);
    s.espacios.forEach((e) => {
      if (!Array.isArray(e.sobres)) e.sobres = [];
      if (e.enDisponible === undefined) e.enDisponible = true;
      e.sobres.forEach((x) => {
        if (!x.frecPago) x.frecPago = 'semanal';
        if (x.frecAporte === undefined) x.frecAporte = x.tipo === 'tarjeta' ? '' : 'semanal';
        if (x.fechaPago === undefined) x.fechaPago = '';
        if (x.avisar === undefined || x.avisar === '') x.avisar = 2;
        if (x.aporteManual === undefined) x.aporteManual = '';
        if (x.creado === undefined) x.creado = '';
        // el sobrante de la semana pasada ya se movió con la versión anterior
        if (x.sobranteA && !x.cierre && s.ajustes.ultimoCierre) x.cierre = U.addDays(s.ajustes.ultimoCierre, -1);
      });
    });
    s.cuentas.forEach((c) => { if (!c.tipo) c.tipo = 'normal'; });
    if (vieja) {
      // Efectivo ahora tiene billetes y monedas adentro; la cuenta "Monedas" se junta ahí
      const ef = s.cuentas.find((c) => c.tipo === 'normal' && /^efectivo$/i.test(String(c.nombre).trim()));
      if (ef) {
        ef.partes = true;
        const mon = s.cuentas.find((c) => c !== ef && c.tipo === 'normal' && /^monedas$/i.test(String(c.nombre).trim()));
        if (mon) {
          s.movs.forEach((m) => {
            let cambio = false;
            if (m.cuenta === ef.id && !m.sub) m.sub = 'b';
            if (m.cuenta2 === ef.id && !m.sub2) m.sub2 = 'b';
            if (m.cuenta === mon.id) { m.cuenta = ef.id; m.sub = 'm'; cambio = true; }
            if (m.cuenta2 === mon.id) { m.cuenta2 = ef.id; m.sub2 = 'm'; cambio = true; }
            if (cambio) m.sync = false;
          });
          s.recurrentes.forEach((r) => { if (r.cuenta === mon.id) r.cuenta = ef.id; });
          s.cuentas = s.cuentas.filter((c) => c !== mon);
        }
      }
    }
    s.v = 2;
    return s;
  };

  /* ---------- cuentas ---------- */
  App.esCredito = (c) => !!c && c.tipo === 'credito';
  App.subTxt = (sub) => (sub === 'm' ? 'Monedas' : 'Billetes');
  App.nombreCuenta = (id, sub) => {
    const c = App.cuenta(id);
    if (!c) return '—';
    return c.partes ? c.nombre + ' (' + App.subTxt(sub).toLowerCase() + ')' : c.nombre;
  };
  const diaDelMes = (y, m, dia) => { const b = new Date(y, m, 1, 12); const Y = b.getFullYear(), M = b.getMonth(); return U.ymd(new Date(Y, M, Math.min(dia, new Date(Y, M + 1, 0).getDate()), 12)); };
  /* Corte y pago que le tocan a una compra hecha en "desde" */
  App.fechaCorteYPago = (c, desde) => {
    const dc = U.clamp(parseInt(c.diaCorte, 10) || 0, 0, 31), dp = U.clamp(parseInt(c.diaPago, 10) || 0, 0, 31);
    if (!dc || !dp) return null;
    const d = U.parse(desde); const y = d.getFullYear(); let m = d.getMonth();
    let corte = diaDelMes(y, m, dc);
    if (corte < desde) { m += 1; corte = diaDelMes(y, m, dc); }
    return { corte, pago: dp > dc ? diaDelMes(y, m, dp) : diaDelMes(y, m + 1, dp) };
  };
  /* Siguiente día de pago de la tarjeta (hoy o después) */
  App.proximoPagoTarjeta = (c, desde) => {
    const dp = U.clamp(parseInt(c.diaPago, 10) || 0, 0, 31);
    if (!dp) return '';
    desde = desde || U.today();
    const d = U.parse(desde);
    const a = diaDelMes(d.getFullYear(), d.getMonth(), dp);
    return a >= desde ? a : diaDelMes(d.getFullYear(), d.getMonth() + 1, dp);
  };
  /* Calendario de pagos de una compra a pagar poco a poco: [{ f, a }] */
  App.cuotasTarjeta = (cuentaId, fecha, monto, meses) => {
    const c = App.cuenta(cuentaId) || {};
    const n = Math.max(1, parseInt(meses, 10) || 1);
    const fp = App.fechaCorteYPago(c, fecha);
    const primero = fp ? fp.pago : U.addDays(fecha, 30);
    const out = [];
    let resto = U.r2(monto);
    for (let i = 0; i < n; i++) {
      const a = i === n - 1 ? resto : U.r2(Math.floor((monto / n) * 100) / 100);
      out.push({ f: i === 0 ? primero : U.addMonths(primero, i), a });
      resto = U.r2(resto - a);
    }
    return out;
  };
  /* El sobre que junta lo de una tarjeta en un espacio (lo crea si no existe) */
  App.sobreTarjeta = (espId, cuentaId, crear) => {
    const e = App.espacio(espId); const c = App.cuenta(cuentaId);
    if (!e || !c) return null;
    let s = e.sobres.find((x) => x.tipo === 'tarjeta' && x.cuenta === cuentaId);
    if (!s && crear) {
      s = App.nuevoSobre({ nombre: 'Pagar ' + c.nombre, icono: '💳', tipo: 'tarjeta', cuenta: cuentaId, frecAporte: '' });
      e.sobres.unshift(s);
    }
    return s;
  };
  App.nuevoSobre = (x) => Object.assign({
    id: U.uid(), nombre: '', icono: '⭐', tipo: 'gasto', cuota: 0, meta: 0, desde: '', hasta: '', sobranteA: '', disponible: false,
    frecPago: 'semanal', frecAporte: (App.state && App.state.ajustes.frecIngreso) || 'semanal', fechaPago: '', avisar: 2, aporteManual: '', creado: U.today()
  }, x || {});

  let saveTimer = null;
  App.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(App.state)); } catch (e) {
      App.toast && App.toast('No se pudo guardar en el teléfono. Revisa el espacio libre.', 'error');
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { App.sync && App.sync.auto(); }, 1500);
  };

  App.persistir = async () => {
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* nada */ }
  };

  /* ---------- búsqueda ---------- */
  App.cuenta = (id) => App.state.cuentas.find((c) => c.id === id);
  App.espacio = (id) => App.state.espacios.find((e) => e.id === id);
  App.sobre = (espId, sobreId) => { const e = App.espacio(espId); return e ? e.sobres.find((s) => s.id === sobreId) : null; };
  App.espacioPrincipal = () => App.state.espacios.find((e) => e.enDisponible) || App.state.espacios[0];

  /* ---------- movimientos ---------- */
  // tipos: gasto, ingreso, inicial, ajuste (monto con signo), mover (espacio/sobre -> espacio2/sobre2), traspaso (cuenta -> cuenta2)
  App.nuevoMov = (m) => Object.assign({
    id: U.uid(), creado: Date.now(), fecha: U.today(), tipo: 'gasto', monto: 0,
    cuenta: '', cuenta2: '', espacio: '', sobre: '', espacio2: '', sobre2: '', nota: '', origen: 'app', sync: false
  }, m);

  App.addMov = (m, opts) => {
    opts = opts || {};
    const mov = App.nuevoMov(m);
    mov.monto = U.r2(mov.monto);
    App.state.movs.push(mov);
    let reparto = null;
    if (mov.tipo === 'ingreso' && opts.reparto !== false && mov.espacio) {
      reparto = App.repartir(mov.espacio, mov.fecha, true, mov.monto);
    }
    if (!opts.noSave) App.save();
    return { mov, reparto };
  };

  App.updateMov = (id, cambios) => {
    const m = App.state.movs.find((x) => x.id === id);
    if (!m) return;
    Object.assign(m, cambios, { sync: false });
    m.monto = U.r2(m.monto);
    App.save();
  };

  App.deleteMov = (id) => {
    const i = App.state.movs.findIndex((x) => x.id === id);
    if (i < 0) return;
    App.state.movs.splice(i, 1);
    App.state.borrados.push(id);
    App.save();
  };

  /* Reparte lo libre de un espacio en sus sobres (primero pagos con fecha, luego en el orden de la lista) */
  App.repartir = (espId, fecha, conPorIngreso, ingreso) => {
    const esp = App.espacio(espId);
    if (!esp) return null;
    fecha = fecha || U.today();
    const partes = [];
    const pendientes = [];
    const agregar = (sobre, x, nota, por) => {
      x = U.r2(x);
      if (x <= 0) return;
      const m = App.nuevoMov({ fecha, tipo: 'mover', monto: x, espacio: espId, sobre: '', espacio2: espId, sobre2: sobre.id, nota, origen: 'auto' });
      const p = por ? App.porDe(por, x, fecha) : null;
      if (p) m.por = p;
      App.state.movs.push(m);
      partes.push({ sobre: sobre.nombre, monto: x });
    };
    // 1) "Por cada ingreso"
    if (conPorIngreso) {
      esp.sobres.filter((s) => s.tipo === 'porIngreso' && (s.cuota > 0 || s.pct > 0)).forEach((s) => {
        const c = App.calc(fecha);
        const libre = c.esp[espId].libre;
        const meta = s.meta > 0 ? Math.max(0, s.meta - c.sob[s.id].saldo) : Infinity;
        agregar(s, Math.min(App.montoPorIngreso(s, ingreso), Math.max(0, libre), meta), 'Por ingreso');
      });
    }
    // 2) lo que les falta hasta tu próximo cobro (primero lo que tiene fecha más cercana)
    const c = App.calc(fecha);
    let libre = c.esp[espId].libre;
    // hasta el próximo cobro: se cuenta desde tu último ingreso (si repartes otro día, no se adelanta de más)
    const ult = App.state.movs.reduce((u, m) => (m.tipo === 'ingreso' && m.espacio === espId && m.fecha <= fecha && m.fecha > u ? m.fecha : u), '');
    let fin = ult ? App.finHorizonte(ult) : '';
    if (!fin || fin <= fecha) fin = App.finHorizonte(fecha);
    const lista = esp.sobres.map((s, i) => ({ s, i, st: c.sob[s.id] })).filter((x) => x.st).map((x) => { const n = App.necesidad(x.s, c.L[x.s.id], fecha, fin); return Object.assign(x, { falta: n.total, por: n.por }); }).filter((x) => x.falta > 0);
    const urge = (x) => (x.s.tipo === 'deuda' || x.s.tipo === 'tarjeta' || x.s.fechaPago ? 0 : 1);
    lista.sort((a, b) => urge(a) - urge(b) || (urge(a) === 0 ? String(a.st.venc || '9').localeCompare(String(b.st.venc || '9')) : 0) || a.i - b.i);
    lista.forEach(({ s, falta, por }) => {
      const x = U.r2(Math.min(falta, Math.max(0, libre)));
      if (x > 0) { agregar(s, x, 'Reparto', por); libre = U.r2(libre - x); }
      if (x < falta) pendientes.push({ sobre: s.nombre, monto: U.r2(falta - x) });
    });
    return { partes, pendientes };
  };

  /* Al terminar cada periodo: lo que sobró en sobres con "pasar sobrante a" se mueve al destino */
  App.cierreSemanal = () => {
    const hoy = U.today();
    const a = App.state.ajustes;
    const hechos = [];
    let cambio = false;
    App.state.espacios.forEach((e) => {
      e.sobres.forEach((s) => {
        if (!s.sobranteA) return;
        const destino = e.sobres.find((x) => x.id === s.sobranteA);
        if (!destino) return;
        const fin = App.finCicloAnterior(s, hoy);
        if (!s.cierre) { s.cierre = fin; cambio = true; return; }
        if (s.cierre >= fin) return;
        const st = App.calc(fin).sob[s.id];
        // lo que ya se apartó para el periodo que sigue no es sobrante: se queda
        const adelantado = App.state.movs.reduce((t, m) => {
          if (m.tipo !== 'mover' || m.sobre2 !== s.id || m.fecha > fin) return t;
          const por = App.porValido(m, Number(m.monto));
          return t + (por ? por.filter((p) => p[0] > fin).reduce((a, p) => a + p[1], 0) : 0);
        }, 0);
        const sobra = st ? U.r2(st.saldo - adelantado) : 0;
        if (sobra > 0.004) {
          App.state.movs.push(App.nuevoMov({ fecha: fin, tipo: 'mover', monto: sobra, espacio: e.id, sobre: s.id, espacio2: e.id, sobre2: destino.id, nota: 'Sobrante de ' + s.nombre, origen: 'auto' }));
          hechos.push({ de: s.nombre, a: destino.nombre, monto: sobra });
        }
        s.cierre = fin; cambio = true;
      });
    });
    const ini = U.weekStart(hoy);
    if (a.ultimoCierre !== ini) { a.ultimoCierre = ini; cambio = true; }
    if (cambio) App.save();
    return hechos;
  };

  /* Memoria: combinaciones que más repites */
  App.frecuentes = (tipo) => {
    const cont = {};
    const movs = App.state.movs.filter((m) => m.tipo === tipo && m.origen !== 'auto').slice(-250);
    movs.forEach((m) => {
      const k = [m.monto, m.espacio, m.sobre, m.cuenta, (m.nota || '').trim().toLowerCase()].join('|');
      if (!cont[k]) cont[k] = { n: 0, m, ult: 0 };
      cont[k].n++; cont[k].ult = Math.max(cont[k].ult, m.creado);
    });
    return Object.values(cont).filter((x) => x.n >= 2).sort((a, b) => b.n - a.n || b.ult - a.ult).slice(0, 6).map((x) => x.m);
  };

  App.ultimaCuenta = (tipo) => {
    for (let i = App.state.movs.length - 1; i >= 0; i--) {
      const m = App.state.movs[i];
      if (m.tipo === tipo && m.cuenta && App.cuenta(m.cuenta)) return m.cuenta;
    }
    return App.state.cuentas[0] ? App.state.cuentas[0].id : '';
  };

  /* ---------- plantillas para empezar ---------- */
  const sob = (nombre, icono, tipo, cuota, extra) => App.nuevoSobre(Object.assign({ nombre, icono, tipo, cuota, frecAporte: 'semanal' }, extra || {}));
  App.PLANTILLAS = {
    estudiante: {
      nombre: 'Estudiante', desc: 'Comida, transporte, gustos y ahorro.',
      crear: () => {
        const ahorro = sob('Ahorro', '💰', 'ahorro', 100);
        return {
          cuentas: [{ id: U.uid(), nombre: 'Banco', icono: '🏦', tipo: 'normal' }, { id: U.uid(), nombre: 'Efectivo', icono: '💵', tipo: 'normal', partes: true }],
          espacios: [{ id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [
            sob('Comida', '🍽️', 'limite', 300, { sobranteA: ahorro.id }),
            sob('Transporte', '🚌', 'limite', 150),
            sob('Ocio', '🎉', 'gasto', 200, { disponible: true }),
            sob('Imprevistos', '🧾', 'gasto', 50),
            ahorro
          ] }]
        };
      }
    },
    negocio: {
      nombre: 'Con negocio', desc: 'Tu dinero personal separado del de tu negocio.',
      crear: () => ({
        cuentas: [{ id: U.uid(), nombre: 'Banco', icono: '🏦', tipo: 'normal' }, { id: U.uid(), nombre: 'Efectivo', icono: '💵', tipo: 'normal', partes: true }],
        espacios: [
          { id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [
            sob('Comida', '🍽️', 'limite', 300), sob('Transporte', '🚌', 'limite', 150),
            sob('Ocio', '🎉', 'gasto', 200, { disponible: true }), sob('Ahorro', '💰', 'ahorro', 150)
          ] },
          { id: U.uid(), nombre: 'Negocio', icono: '🏪', enDisponible: false, sobres: [
            sob('Mercancía', '📦', 'gasto', 300), sob('Renta', '🏠', 'gasto', 100),
            sob('Reinversión', '📈', 'porIngreso', 100)
          ] }
        ]
      })
    },
    cero: {
      nombre: 'Desde cero', desc: 'Solo una cuenta y un espacio. Tú armas tus sobres.',
      crear: () => ({
        cuentas: [{ id: U.uid(), nombre: 'Efectivo', icono: '💵', tipo: 'normal', partes: true }],
        espacios: [{ id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [] }]
      })
    }
  };

  App.aplicarPlantilla = (key, nombre) => {
    const p = App.PLANTILLAS[key].crear();
    const s = App.defaultState();
    s.perfil.nombre = nombre || '';
    s.cuentas = p.cuentas;
    s.espacios = p.espacios;
    s.ajustes.ultimoCierre = U.weekStart(U.today());
    s.ajustes.ultimoResumen = U.weekStart(U.today());
    App.state = s;
    App.save();
  };

  /* ---------- copia de seguridad ---------- */
  App.exportar = () => JSON.stringify({ app: 'control-finanzas', exportado: new Date().toISOString(), estado: App.state });
  App.importar = (texto) => {
    const obj = JSON.parse(texto);
    const est = obj && obj.estado ? obj.estado : obj;
    if (!est || !Array.isArray(est.cuentas) || !Array.isArray(est.espacios)) throw new Error('El archivo no es una copia de Control de Finanzas.');
    const pinActual = App.state && App.state.ajustes ? App.state.ajustes.pin : null;
    App.state = App.migrate(est);
    if (!App.state.ajustes.pin && pinActual) App.state.ajustes.pin = pinActual;
    App.state.ajustes.onboarding = false;
    if (!App.state.ajustes.ultimoCierre) App.state.ajustes.ultimoCierre = U.weekStart(U.today());
    App.save();
  };
})();
