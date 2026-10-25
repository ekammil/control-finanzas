/* Control de Finanzas — arranque, navegación y acciones */
(function () {
  const App = window.App;
  const $app = () => document.getElementById('app');

  /* ---------------- render ---------------- */
  App.render = () => {
    const S = App.state;
    document.body.dataset.fondo = S.ajustes.fondo || 'aurora';
    if (App.ui.bloqueado) { document.body.dataset.pantalla = 'ajustes'; $app().innerHTML = App.pantallaBloqueo(); return; }
    if (S.ajustes.onboarding || !S.cuentas.length) { document.body.dataset.pantalla = 'inicio'; $app().innerHTML = App.pantallaBienvenida(); return; }
    const p = App.ui.pantalla;
    document.body.dataset.pantalla = p;
    const html = p === 'movs' ? App.pantallaMovs() : p === 'metas' ? App.pantallaMetas() : p === 'ajustes' ? App.pantallaAjustes() : App.pantallaInicio();
    $app().innerHTML = html + App.navHTML();
    if (App.h) App.renderHoja();
  };

  const refrescar = () => { App.render(); };

  /* ---------------- helpers ---------------- */
  const limpio = (o) => { const r = {}; Object.keys(o).forEach((k) => { if (o[k] !== undefined && o[k] !== null) r[k] = o[k]; }); return r; };
  const confirmar = (el, txt) => {
    if (el.dataset.confirm === '1') return true;
    el.dataset.confirm = '1';
    el.innerHTML = txt || 'Toca otra vez para confirmar';
    setTimeout(() => { if (el.isConnected) { el.dataset.confirm = ''; App.renderHoja(); } }, 3500);
    return false;
  };
  const num = (v) => U.r2(parseFloat(String(v || '').replace(/[^0-9.\-]/g, '')) || 0);

  App.copiarTexto = async (t) => {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  };

  App.descargar = async () => {
    const txt = App.exportar();
    const nombre = 'control-finanzas-' + U.today() + '.json';
    try {
      const file = new File([txt], nombre, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Copia de Control de Finanzas' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };

  App.elegirArchivo = () => {
    let inp = document.getElementById('archivo-import');
    if (!inp) {
      inp = document.createElement('input'); inp.type = 'file'; inp.id = 'archivo-import'; inp.accept = '.json,application/json,text/plain'; inp.style.display = 'none';
      inp.addEventListener('change', () => {
        const f = inp.files && inp.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          try { App.importar(String(rd.result)); App.ui.pantalla = 'inicio'; App.cerrarHoja(true); App.cierreSemanal(); App.render(); App.toast('Copia importada', 'ok'); }
          catch (e) { App.toast(e.message || 'No se pudo leer el archivo', 'error'); }
          inp.value = '';
        };
        rd.readAsText(f);
      });
      document.body.appendChild(inp);
    }
    inp.click();
  };

  const adivinarCuenta = (tarjeta) => {
    const t = (tarjeta || '').toLowerCase();
    const c = App.state.cuentas.find((x) => t && t.includes(x.nombre.toLowerCase())) || App.state.cuentas.find((x) => x.icono === '🏦' || /banco|débito|debito|tarjeta/i.test(x.nombre));
    return c ? c.id : App.ultimaCuenta('gasto');
  };

  /* ---------------- acciones ---------------- */
  const A = {
    'ir': (el) => { App.ui.pantalla = el.dataset.p; App.cerrarHoja(true); window.scrollTo(0, 0); refrescar(); },
    'hoja': (el) => {
      const d = el.dataset;
      const datos = limpio({
        id: d.id, esp: d.esp, modo: d.modo, espacio: d.esp, espacio2: d.esp, sobre: d.sobre, sobre2: d.sobre2,
        cuenta: d.cuenta, moverModo: d.movermodo, tipoInicial: d.tipoinicial
      });
      if (d.h === 'registro' && datos.modo === 'mover') {
        datos.moverModo = datos.moverModo || 'espacios';
        if (datos.sobre && !datos.sobre2) { datos.deSobre = datos.sobre; delete datos.sobre; }
      }
      App.abrirHoja(d.h, datos, d.apilar === '1');
    },
    'cerrar-hoja': () => App.cerrarHoja(true),
    'volver-hoja': () => App.cerrarHoja(false),
    'rango': (el) => { App.state.ajustes.rango = el.dataset.r; App.save(); refrescar(); },
    'filtro': (el) => { App.ui.filtro = App.ui.filtro === el.dataset.v && el.dataset.v !== 'todo' ? 'todo' : el.dataset.v; refrescar(); },
    'filtro-esp': (el) => { App.ui.filtroEsp = App.ui.filtroEsp === el.dataset.v ? '' : el.dataset.v; refrescar(); },
    'ver-repartos': () => { App.ui.verRepartos = !App.ui.verRepartos; refrescar(); },
    'mas-movs': () => { App.ui.limiteDias += 60; refrescar(); },
    'editar-mov': (el) => {
      const m = App.state.movs.find((x) => x.id === el.dataset.id); if (!m) return;
      const apilar = !!App.h;
      if (m.tipo === 'gasto' || m.tipo === 'ingreso') App.abrirHoja('registro', { editId: m.id }, apilar);
      else App.abrirHoja('mov', { id: m.id }, apilar);
    },

    /* registro */
    'tecla': (el) => App.tecla(el.dataset.k),
    'reg-modo': (el) => { const h = App.h; h.modo = el.dataset.v; if (h.modo === 'mover' && !h.cuenta2) { const o = App.state.cuentas.find((c) => c.id !== h.cuenta); h.cuenta2 = o ? o.id : ''; } App.renderHoja(); },
    'reg-rapido': (el) => {
      const m = App.frecuentes(App.h.modo)[Number(el.dataset.i)]; if (!m) return;
      Object.assign(App.h, { monto: String(m.monto), espacio: m.espacio, sobre: m.sobre, cuenta: m.cuenta, nota: m.nota || '' });
      App.renderHoja();
    },
    'reg-esp': (el) => { App.h.espacio = el.dataset.v; App.h.sobre = ''; App.h.deSobre = ''; App.renderHoja(); },
    'reg-esp2': (el) => { App.h.espacio2 = el.dataset.v; App.h.sobre2 = ''; App.renderHoja(); },
    'reg-sobre': (el) => { App.h.sobre = el.dataset.v; App.renderHoja(); },
    'reg-desobre': (el) => { App.h.deSobre = el.dataset.v; App.renderHoja(); },
    'reg-sobre2': (el) => { App.h.sobre2 = el.dataset.v; App.renderHoja(); },
    'reg-cuenta': (el) => { const h = App.h; h.cuenta = el.dataset.v; if (h.cuenta2 === h.cuenta) { const o = App.state.cuentas.find((c) => c.id !== h.cuenta); h.cuenta2 = o ? o.id : ''; } App.renderHoja(); },
    'reg-cuenta2': (el) => { App.h.cuenta2 = el.dataset.v; App.renderHoja(); },
    'reg-mover-modo': (el) => { App.h.moverModo = el.dataset.v; App.renderHoja(); },
    'reg-guardar': () => App.guardarRegistro(),
    'mov-borrar': (el) => {
      if (!confirmar(el, 'Toca otra vez para eliminar')) return;
      App.deleteMov(el.dataset.id); U.haptic(); App.toast('Movimiento eliminado', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'mov-signo': (el) => { App.h.signo = Number(el.dataset.v); App.renderHoja(); },
    'mov-guardar': () => {
      const h = App.h; const m = App.state.movs.find((x) => x.id === h.id); if (!m) return;
      const v = num(h.monto); if (!(v > 0)) return App.toast('Escribe un monto', 'error');
      App.updateMov(h.id, { monto: m.tipo === 'ajuste' ? v * h.signo : v, nota: h.nota, fecha: h.fecha || m.fecha });
      App.toast('Cambios guardados', 'ok'); App.cerrarHoja(false); refrescar();
    },

    /* cuadre */
    'cuadre-guardar': () => App.guardarCuadre(),
    'cuadre-saltar': () => { App.state.ajustes.ultimoCuadre = U.today(); App.save(); refrescar(); },

    /* avisos */
    'repartir': (el) => {
      const r = App.repartir(el.dataset.id, U.today(), false); App.save(); U.haptic();
      App.toast(r && r.partes.length ? 'Repartido: ' + r.partes.map((p) => p.sobre + ' ' + U.money0(p.monto)).join(', ') : 'No había nada que repartir', r && r.partes.length ? 'largo' : '');
      refrescar();
    },
    'bandeja': (el) => {
      const b = App.state.bandeja.find((x) => x.id === el.dataset.id); if (!b) return;
      App.abrirHoja('registro', { modo: 'gasto', monto: String(b.monto), nota: b.comercio, cuenta: adivinarCuenta(b.tarjeta), fecha: b.fecha || U.today(), bandejaId: b.id });
    },
    'bandeja-descartar': (el) => {
      const S = App.state; S.bandeja = S.bandeja.filter((x) => x.id !== el.dataset.id); S.bandejaOk = (S.bandejaOk || []).concat([el.dataset.id]); App.save(); refrescar();
    },
    'resumen-ok': () => { App.state.ajustes.ultimoResumen = U.weekStart(U.today()); App.save(); App.cerrarHoja(true); refrescar(); },
    'pagar-rec': (el) => {
      const r = App.state.recurrentes.find((x) => x.id === el.dataset.id); if (!r) return;
      App.abrirHoja('registro', { modo: 'gasto', monto: String(r.monto), espacio: r.espacio, sobre: r.sobre, cuenta: r.cuenta || App.ultimaCuenta('gasto'), nota: r.nombre, recId: r.id, recFecha: el.dataset.f });
    },

    /* bloqueo */
    'bloquear': () => { App.ui.bloqueado = true; App.ui.pinIn = ''; App.cerrarHoja(true); refrescar(); },
    'pin-tecla': async (el) => {
      const k = el.dataset.k;
      if (k === 'del') App.ui.pinIn = App.ui.pinIn.slice(0, -1);
      else if (App.ui.pinIn.length < 4) App.ui.pinIn += k;
      if (App.ui.pinIn.length === 4) {
        const hash = await U.sha256('cdf:' + App.ui.pinIn);
        if (hash === App.state.ajustes.pin) { App.ui.bloqueado = false; App.ui.pinIn = ''; U.haptic(); refrescar(); return; }
        App.ui.pinIn = ''; refrescar();
        const p = document.getElementById('pin-puntos'); if (p) { p.classList.add('error'); if (navigator.vibrate) navigator.vibrate([30, 40, 30]); }
        return;
      }
      refrescar();
    },
    'pin-set': async (el) => {
      const h = App.h; const k = el.dataset.k; const campo = h.paso === 'nuevo' ? 'p1' : 'p2';
      if (k === 'del') h[campo] = h[campo].slice(0, -1); else if (h[campo].length < 4) h[campo] += k;
      if (h[campo].length === 4) {
        if (h.paso === 'nuevo') { h.paso = 'repetir'; }
        else if (h.p1 === h.p2) {
          App.state.ajustes.pin = await U.sha256('cdf:' + h.p1); App.save(); U.haptic();
          App.toast('Bloqueo activado', 'ok'); App.cerrarHoja(true); refrescar(); return;
        } else { h.paso = 'nuevo'; h.p1 = ''; h.p2 = ''; App.toast('No coinciden. Intenta de nuevo', 'error'); }
      }
      App.renderHoja();
    },
    'pin-cambiar': () => { Object.assign(App.h, { paso: 'nuevo', p1: '', p2: '' }); App.renderHoja(); },
    'pin-quitar': (el) => { if (!confirmar(el, 'Toca otra vez para quitarlo')) return; App.state.ajustes.pin = null; App.save(); App.toast('Bloqueo desactivado', 'ok'); App.cerrarHoja(true); refrescar(); },

    /* bienvenida */
    'ob-sig': () => {
      const ob = App.ui.ob;
      if (ob.paso === 2) { App.aplicarPlantilla(ob.plantilla, ob.nombre.trim()); ob.saldos = {}; }
      ob.paso++; refrescar(); window.scrollTo(0, 0);
    },
    'ob-atras': () => { App.ui.ob.paso = Math.max(0, App.ui.ob.paso - 1); refrescar(); },
    'ob-plantilla': (el) => { App.ui.ob.plantilla = el.dataset.v; refrescar(); },
    'ob-fin': () => {
      const S = App.state; const esp = App.espacioPrincipal(); const ob = App.ui.ob;
      S.cuentas.forEach((c) => { const v = num(ob.saldos[c.id]); if (v > 0) S.movs.push(App.nuevoMov({ tipo: 'inicial', monto: v, cuenta: c.id, espacio: esp.id, nota: 'Saldo inicial' })); });
      S.ajustes.onboarding = false; App.save(); App.persistir();
      App.ui.pantalla = 'inicio'; refrescar();
      App.toast('¡Listo! Toca + para registrar tu primer gasto', 'largo');
    },
    'importar': () => App.elegirArchivo(),
    'exportar': () => App.descargar(),

    /* edición */
    'emoji': (el) => { App.h.icono = el.dataset.v; App.renderHoja(); },
    'espacio-guardar': () => {
      const h = App.h; const S = App.state;
      if (!h.nombre.trim()) return App.toast('Ponle un nombre', 'error');
      if (h.id) Object.assign(App.espacio(h.id), { nombre: h.nombre.trim(), icono: h.icono, enDisponible: !!h.enDisponible });
      else S.espacios.push({ id: U.uid(), nombre: h.nombre.trim(), icono: h.icono, enDisponible: !!h.enDisponible, sobres: [] });
      App.save(); App.toast('Espacio guardado', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'espacio-borrar': (el) => {
      const h = App.h; const S = App.state; const total = App.calc().esp[h.id].total;
      if (Math.abs(total) > 0.004) return App.toast('Primero mueve su dinero (' + U.money(total) + ') a otro espacio', 'error');
      if (S.espacios.length <= 1) return App.toast('Necesitas al menos un espacio', 'error');
      if (!confirmar(el, 'Toca otra vez para eliminar')) return;
      S.espacios = S.espacios.filter((e) => e.id !== h.id);
      App.save(); App.toast('Espacio eliminado', 'ok'); App.cerrarHoja(true); refrescar();
    },
    'sobre-esp': (el) => { App.h.esp = el.dataset.v; App.renderHoja(); },
    'sobre-tipo': (el) => { App.h.tipo = el.dataset.v; App.renderHoja(); },
    'sobre-guardar': () => {
      const h = App.h; const e = App.espacio(h.esp);
      if (!e) return App.toast('Elige un espacio', 'error');
      if (!String(h.nombre || '').trim()) return App.toast('Ponle un nombre', 'error');
      const datos = { nombre: h.nombre.trim(), icono: h.icono, tipo: h.tipo, cuota: num(h.cuota), meta: num(h.meta), desde: h.tipo === 'deuda' ? (h.desde || U.today()) : '', hasta: h.tipo === 'deuda' ? h.hasta : '', sobranteA: h.tipo === 'limite' ? (h.sobranteA || '') : '', disponible: !!h.disponible };
      if (h.tipo === 'deuda' && (!(datos.meta > 0) || !datos.hasta)) return App.toast('Pon el total y la fecha límite', 'error');
      if (h.tipo !== 'deuda' && !(datos.cuota >= 0)) return App.toast('Revisa la cantidad', 'error');
      if (h.id) Object.assign(e.sobres.find((s) => s.id === h.id), datos);
      else e.sobres.push(Object.assign({ id: U.uid() }, datos));
      App.save(); App.toast('Sobre guardado', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'sobre-borrar': (el) => {
      const h = App.h; const S = App.state; const e = App.espacio(h.esp);
      if (!confirmar(el, 'Toca otra vez: su dinero pasará a Libre')) return;
      const st = App.calc().sob[h.id];
      if (st && st.saldo > 0) S.movs.push(App.nuevoMov({ tipo: 'mover', monto: st.saldo, espacio: e.id, sobre: h.id, espacio2: e.id, sobre2: '', nota: 'Sobre eliminado' }));
      e.sobres = e.sobres.filter((s) => s.id !== h.id);
      e.sobres.forEach((s) => { if (s.sobranteA === h.id) s.sobranteA = ''; });
      S.recurrentes.forEach((r) => { if (r.sobre === h.id) r.sobre = ''; });
      App.save(); App.toast('Sobre eliminado', 'ok'); App.cerrarHoja(false); if (App.h && App.h._hoja === 'sobre') App.cerrarHoja(false); refrescar();
    },
    'sobre-orden': (el) => {
      const e = App.espacio(el.dataset.esp); const i = Number(el.dataset.i); const j = i + Number(el.dataset.d);
      if (!e || j < 0 || j >= e.sobres.length) return;
      const t = e.sobres[i]; e.sobres[i] = e.sobres[j]; e.sobres[j] = t; App.save(); App.renderHoja();
    },
    'cuenta-esp': (el) => { App.h.esp = el.dataset.v; App.renderHoja(); },
    'cuenta-guardar': () => {
      const h = App.h; const S = App.state;
      if (!h.nombre.trim()) return App.toast('Ponle un nombre', 'error');
      if (h.id) Object.assign(App.cuenta(h.id), { nombre: h.nombre.trim(), icono: h.icono });
      else {
        const c = { id: U.uid(), nombre: h.nombre.trim(), icono: h.icono }; S.cuentas.push(c);
        const v = num(h.saldo); if (v > 0) S.movs.push(App.nuevoMov({ tipo: 'inicial', monto: v, cuenta: c.id, espacio: h.esp || (App.espacioPrincipal() || {}).id, nota: 'Saldo inicial' }));
      }
      App.save(); App.toast('Cuenta guardada', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'cuenta-borrar': (el) => {
      const h = App.h; const S = App.state; const saldo = App.calc().cuentas[h.id];
      if (Math.abs(saldo) > 0.004) return App.toast('Primero traspasa su saldo (' + U.money(saldo) + ') a otra cuenta', 'error');
      if (S.cuentas.length <= 1) return App.toast('Necesitas al menos una cuenta', 'error');
      if (!confirmar(el, 'Toca otra vez para eliminar')) return;
      S.cuentas = S.cuentas.filter((c) => c.id !== h.id);
      App.save(); App.toast('Cuenta eliminada', 'ok'); App.cerrarHoja(true); refrescar();
    },
    'rec-frec': (el) => { App.h.frecuencia = el.dataset.v; App.renderHoja(); },
    'rec-esp': (el) => { App.h.espacio = el.dataset.v; App.h.sobre = ''; App.renderHoja(); },
    'rec-sobre': (el) => { App.h.sobre = el.dataset.v; App.renderHoja(); },
    'rec-cuenta': (el) => { App.h.cuenta = el.dataset.v; App.renderHoja(); },
    'rec-guardar': () => {
      const h = App.h; const S = App.state;
      if (!String(h.nombre || '').trim()) return App.toast('Ponle un nombre', 'error');
      const monto = num(h.monto); if (!(monto > 0)) return App.toast('Escribe el monto', 'error');
      const dia = U.clamp(parseInt(h.dia, 10) || 1, 1, 31);
      const datos = { nombre: h.nombre.trim(), monto, frecuencia: h.frecuencia, dia, diaSemana: Number(h.diaSemana) || 0, avisar: Number(h.avisar), espacio: h.espacio, sobre: h.sobre, cuenta: h.cuenta };
      if (h.id) Object.assign(S.recurrentes.find((r) => r.id === h.id), datos); else S.recurrentes.push(Object.assign({ id: U.uid(), pagado: '' }, datos));
      App.save(); App.toast('Pago programado guardado', 'ok'); App.cerrarHoja(true); refrescar();
    },
    'rec-borrar': (el) => {
      if (!confirmar(el, 'Toca otra vez para eliminar')) return;
      App.state.recurrentes = App.state.recurrentes.filter((r) => r.id !== App.h.id); App.save(); App.cerrarHoja(true); refrescar();
    },
    'perfil-guardar': () => { App.state.perfil.nombre = App.h.nombre.trim(); App.save(); App.cerrarHoja(true); refrescar(); },
    'fondo': (el) => { App.state.ajustes.fondo = el.dataset.v; App.save(); document.body.dataset.fondo = el.dataset.v; App.renderHoja(); },

    /* google */
    'sync-guardar': async () => {
      const url = String(App.h.url || '').trim();
      if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return App.toast('El enlace debe empezar con https://script.google.com/', 'error');
      App.state.ajustes.syncUrl = url; App.save();
      App.toast('Conectando…');
      const ok = await App.sync.run(true);
      if (ok) { App.cerrarHoja(true); }
      refrescar();
    },
    'sync-quitar': () => { App.state.ajustes.syncUrl = ''; App.save(); App.cerrarHoja(true); refrescar(); },
    'copiar-script': async () => {
      try {
        const t = await (await fetch('google-sync.gs')).text();
        App.toast(await App.copiarTexto(t) ? 'Código copiado. Pégalo en Apps Script' : 'No se pudo copiar', 'ok');
      } catch (e) { App.toast('No se pudo cargar el código. Abre la app con internet una vez.', 'error'); }
    },
    'copiar': async (el) => { App.toast(await App.copiarTexto(el.dataset.v) ? 'Copiado' : 'No se pudo copiar', 'ok'); },
    'instalar-ya': async () => { if (App.instalable) { App.instalable.prompt(); App.instalable = null; App.cerrarHoja(true); } },
    'borrar-todo': (el) => {
      if (String(App.h.txt).trim().toUpperCase() !== 'BORRAR') return App.toast('Escribe BORRAR para confirmar', 'error');
      if (!confirmar(el, 'Última oportunidad: toca otra vez')) return;
      localStorage.removeItem('control-finanzas-v1');
      App.state = App.defaultState(); App.ui.ob = App.nuevoOb ? App.nuevoOb() : { paso: 0 };
      App.cerrarHoja(true); App.ui.pantalla = 'inicio'; refrescar();
    }
  };
  Object.assign(A, App.accionesExtra || {});
  App.acciones = A;

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled) return;
    const f = A[el.dataset.a];
    if (f) { ev.preventDefault(); f(el, ev); }
  });

  /* entradas de texto */
  document.addEventListener('input', (ev) => {
    const el = ev.target;
    if (!App.h && App.inputExtra && App.inputExtra(el, 'input')) return;
    if (el.dataset.m && App.h) {
      App.h[el.dataset.m] = el.type === 'checkbox' ? el.checked : el.value;
      return;
    }
    if (el.dataset.cuadre && App.h) {
      App.h.real[el.dataset.cuadre] = el.value;
      const c = App.calc(); const id = el.dataset.cuadre; const s = document.getElementById('dif-' + id);
      if (s) {
        if (el.value === '') { s.textContent = 'Déjalo vacío si ya cuadra'; s.className = 'num'; return; }
        const dif = U.r2((parseFloat(el.value) || 0) - c.cuentas[id]);
        s.textContent = Math.abs(dif) < 0.005 ? '✓ Cuadra' : dif > 0 ? 'Tienes ' + U.money(dif) + ' de más' : 'Te faltan ' + U.money(-dif);
        s.className = 'num ' + (dif > 0.004 ? 'pos' : dif < -0.004 ? 'neg' : 'pos');
      }
      return;
    }
    const k = el.dataset.in;
    if (k === 'buscar') { App.ui.buscar = el.value; const pos = el.selectionStart; refrescar(); const n = document.querySelector('[data-in="buscar"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) { /* nada */ } } }
    if (k === 'ob-nombre') App.ui.ob.nombre = el.value;
    if (k === 'ob-saldo') App.ui.ob.saldos[el.dataset.id] = el.value;
  });
  document.addEventListener('change', (ev) => {
    const el = ev.target;
    if (!App.h && App.inputExtra && App.inputExtra(el, 'change')) return;
    if (el.dataset.m && App.h) {
      App.h[el.dataset.m] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.render || el.tagName === 'SELECT') App.renderHoja();
    }
    if (el.dataset.sw) { App.state.ajustes[el.dataset.sw] = el.checked; App.save(); if (el.checked) U.haptic(); }
  });

  /* ---------------- ciclo de vida ---------------- */
  let ocultoDesde = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ocultoDesde = Date.now(); return; }
    if (App.state.ajustes.pin && ocultoDesde && Date.now() - ocultoDesde > 60000) { App.ui.bloqueado = true; App.ui.pinIn = ''; App.cerrarHoja(true); }
    const hechos = App.cierreSemanal();
    if (hechos.length) App.toast('Lunes: ' + hechos.map((x) => x.de + ' → ' + x.a + ' ' + U.money0(x.monto)).join(', '), 'largo');
    if (!App.h) App.render();
    App.sync.auto();
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.instalable = e; });

  let anchoPrev = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - anchoPrev) > 40 && !App.h) { anchoPrev = window.innerWidth; App.render(); } });

  App.iniciar = () => {
    App.load();
    if (App.state.ajustes.pin) App.ui.bloqueado = true;
    if (!App.state.ajustes.onboarding && App.state.cuentas.length) {
      const hechos = App.cierreSemanal();
      if (hechos.length) setTimeout(() => App.toast('Lunes: ' + hechos.map((x) => x.de + ' → ' + x.a + ' ' + U.money0(x.monto)).join(', '), 'largo'), 800);
    }
    App.render();
    App.persistir();
    App.sync.auto();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  };

  App.iniciar();
})();
