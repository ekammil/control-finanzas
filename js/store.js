/* Control de Finanzas — datos y almacenamiento local (funciona sin internet) */
(function () {
  const KEY = 'control-finanzas-v1';
  const App = window.App || (window.App = {});

  App.TIPOS_SOBRE = {
    gasto: { nombre: 'Gasto semanal', desc: 'Recibe una cantidad cada semana. Lo que no gastes se acumula.' },
    limite: { nombre: 'Gasto con tope', desc: 'Se rellena solo hasta el tope de la semana. Lo que sobre puede pasar a otro sobre el lunes.' },
    ahorro: { nombre: 'Ahorro', desc: 'Guarda una cantidad cada semana. Puedes ponerle una meta.' },
    deuda: { nombre: 'Pago con fecha', desc: 'Junta un total antes de una fecha. La cuota semanal se calcula sola.' },
    porIngreso: { nombre: 'Por cada ingreso', desc: 'Aparta una cantidad fija cada vez que registras un ingreso en este espacio.' }
  };

  App.FONDOS = [
    { id: 'aurora', nombre: 'Aurora' },
    { id: 'oceano', nombre: 'Océano' },
    { id: 'brasa', nombre: 'Brasa' },
    { id: 'bosque', nombre: 'Bosque' },
    { id: 'grafito', nombre: 'Grafito' },
    { id: 'negro', nombre: 'Negro' }
  ];

  App.EMOJIS = ['👤', '🏪', '🎰', '💼', '🏠', '🍽️', '🚌', '🎉', '🚗', '🛟', '💳', '📅', '📦', '📈', '🎓', '💊', '🎁', '👕', '📱', '🐶', '✈️', '🏋️', '☕', '🎮', '🧾', '💡', '🛒', '🏦', '💵', '🪙', '💰', '🐷', '⭐', '🔧', '❤️', '📚'];

  App.defaultState = () => ({
    v: 1,
    creado: Date.now(),
    perfil: { nombre: '' },
    ajustes: {
      fondo: 'aurora',
      pin: null,
      vibracion: true,
      cuadreNoche: false,
      ultimoCuadre: '',
      ultimoResumen: '',
      ultimoCierre: '',
      syncUrl: '',
      ultimaSync: 0,
      onboarding: true,
      rango: 'semana'
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
    App.state = App.migrate(s || App.defaultState());
    return App.state;
  };

  App.migrate = (s) => {
    const d = App.defaultState();
    s.ajustes = Object.assign({}, d.ajustes, s.ajustes || {});
    s.perfil = Object.assign({}, d.perfil, s.perfil || {});
    ['cuentas', 'espacios', 'movs', 'recurrentes', 'bandeja', 'borrados'].forEach((k) => { if (!Array.isArray(s[k])) s[k] = []; });
    s.espacios.forEach((e) => { if (!Array.isArray(e.sobres)) e.sobres = []; if (e.enDisponible === undefined) e.enDisponible = true; });
    return s;
  };

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
      reparto = App.repartir(mov.espacio, mov.fecha, true);
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
  App.repartir = (espId, fecha, conPorIngreso) => {
    const esp = App.espacio(espId);
    if (!esp) return null;
    fecha = fecha || U.today();
    const partes = [];
    const pendientes = [];
    const agregar = (sobre, x, nota) => {
      x = U.r2(x);
      if (x <= 0) return;
      App.state.movs.push(App.nuevoMov({ fecha, tipo: 'mover', monto: x, espacio: espId, sobre: '', espacio2: espId, sobre2: sobre.id, nota, origen: 'auto' }));
      partes.push({ sobre: sobre.nombre, monto: x });
    };
    // 1) "Por cada ingreso"
    if (conPorIngreso) {
      esp.sobres.filter((s) => s.tipo === 'porIngreso' && s.cuota > 0).forEach((s) => {
        const c = App.calc(fecha);
        const libre = c.esp[espId].libre;
        const meta = s.meta > 0 ? Math.max(0, s.meta - c.sob[s.id].saldo) : Infinity;
        agregar(s, Math.min(s.cuota, Math.max(0, libre), meta), 'Por ingreso');
      });
    }
    // 2) lo que falta esta semana
    const c = App.calc(fecha);
    let libre = c.esp[espId].libre;
    const lista = esp.sobres.map((s, i) => ({ s, i, st: c.sob[s.id] })).filter((x) => x.st && x.st.falta > 0);
    lista.sort((a, b) => (a.s.tipo === 'deuda' ? 0 : 1) - (b.s.tipo === 'deuda' ? 0 : 1) || a.i - b.i);
    lista.forEach(({ s, st }) => {
      const x = U.r2(Math.min(st.falta, Math.max(0, libre)));
      if (x > 0) { agregar(s, x, 'Reparto de la semana'); libre = U.r2(libre - x); }
      if (x < st.falta) pendientes.push({ sobre: s.nombre, monto: U.r2(st.falta - x) });
    });
    return { partes, pendientes };
  };

  /* Lunes: lo que sobró en sobres con "pasar sobrante a" se mueve al destino */
  App.cierreSemanal = () => {
    const hoy = U.today();
    const ini = U.weekStart(hoy);
    const a = App.state.ajustes;
    if (!a.ultimoCierre) { a.ultimoCierre = ini; App.save(); return []; }
    if (a.ultimoCierre >= ini) return [];
    const domingo = U.addDays(ini, -1);
    const c = App.calc(domingo);
    const hechos = [];
    App.state.espacios.forEach((e) => {
      e.sobres.forEach((s) => {
        if (!s.sobranteA) return;
        const st = c.sob[s.id];
        const destino = e.sobres.find((x) => x.id === s.sobranteA);
        if (!st || !destino || st.saldo <= 0) return;
        App.state.movs.push(App.nuevoMov({ fecha: domingo, tipo: 'mover', monto: st.saldo, espacio: e.id, sobre: s.id, espacio2: e.id, sobre2: destino.id, nota: 'Sobrante de ' + s.nombre, origen: 'auto' }));
        hechos.push({ de: s.nombre, a: destino.nombre, monto: st.saldo });
      });
    });
    a.ultimoCierre = ini;
    App.save();
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
  const sob = (nombre, icono, tipo, cuota, extra) => Object.assign({ id: U.uid(), nombre, icono, tipo, cuota, meta: 0, desde: '', hasta: '', sobranteA: '', disponible: false }, extra || {});
  App.PLANTILLAS = {
    estudiante: {
      nombre: 'Estudiante', desc: 'Comida, transporte, gustos y ahorro.',
      crear: () => {
        const ahorro = sob('Ahorro', '🐷', 'ahorro', 100);
        return {
          cuentas: [{ id: U.uid(), nombre: 'Banco', icono: '🏦' }, { id: U.uid(), nombre: 'Efectivo', icono: '💵' }],
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
        cuentas: [{ id: U.uid(), nombre: 'Banco', icono: '🏦' }, { id: U.uid(), nombre: 'Efectivo', icono: '💵' }],
        espacios: [
          { id: U.uid(), nombre: 'Personal', icono: '👤', enDisponible: true, sobres: [
            sob('Comida', '🍽️', 'limite', 300), sob('Transporte', '🚌', 'limite', 150),
            sob('Ocio', '🎉', 'gasto', 200, { disponible: true }), sob('Ahorro', '🐷', 'ahorro', 150)
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
        cuentas: [{ id: U.uid(), nombre: 'Efectivo', icono: '💵' }],
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
