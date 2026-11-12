/* Control de Finanzas — arranque, navegación y acciones */
(function () {
  const App = window.App;
  const $app = () => document.getElementById('app');

  /* ---------------- render ---------------- */
  App.render = () => {
    const S = App.state;
    document.body.dataset.fondo = S.ajustes.fondo || 'aurora';
    if (S.ajustes.fondo === 'planetas') App.cosmos();
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
        cuenta: d.cuenta, moverModo: d.movermodo, tipoInicial: d.tipoinicial, credito: d.credito, conMeta: d.meta
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
    'reg-cuenta': (el) => {
      const h = App.h; h.cuenta = el.dataset.v; h.sub = 'b';
      if (!App.esCredito(App.cuenta(h.cuenta))) h.diferido = false;
      const c1 = App.cuenta(h.cuenta);
      if (h.cuenta2 === h.cuenta && !(c1 && c1.partes)) { const o = App.state.cuentas.find((c) => c.id !== h.cuenta); h.cuenta2 = o ? o.id : ''; }
      if (h.cuenta2 === h.cuenta) h.sub2 = h.sub === 'm' ? 'b' : 'm';
      App.renderHoja();
    },
    'reg-cuenta2': (el) => { const h = App.h; h.cuenta2 = el.dataset.v; h.sub2 = h.cuenta2 === h.cuenta ? (h.sub === 'm' ? 'b' : 'm') : 'b'; App.renderHoja(); },
    'reg-sub': (el) => { const h = App.h; h.sub = el.dataset.v; if (h.cuenta2 === h.cuenta && h.sub2 === h.sub) h.sub2 = h.sub === 'm' ? 'b' : 'm'; App.renderHoja(); },
    'reg-sub2': (el) => { const h = App.h; h.sub2 = el.dataset.v; if (h.cuenta2 === h.cuenta && h.sub2 === h.sub) h.sub = h.sub2 === 'm' ? 'b' : 'm'; App.renderHoja(); },
    'reg-meses': (el) => { App.h.meses = Number(el.dataset.v) || 1; App.renderHoja(); },
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
    'prio-toggle': () => { App.state.ajustes.prioOculto = !App.state.ajustes.prioOculto; App.save(); U.haptic(); if (App.h) App.renderHoja(); App.render(); },
    'aviso-quitar': (el) => { App.quitarAvisos([el.dataset.k]); },
    'avisos-limpiar': () => { App.quitarAvisos((App.quitables || []).slice()); App.toast('Listo, quité los avisos que se podían quitar', 'ok'); },
    'cubrir-de': (el) => { App.h.de = el.dataset.v || ''; App.renderHoja(); },
    'cubrir-ok': () => {
      const h = App.h; const c = App.calc(); const e = App.espacio(h.esp); const s = e && e.sobres.find((x) => x.id === h.id);
      const f = s && App.fuentesCubrir(c, s).find((x) => x.o.id === h.de);
      if (!s || !f) return;
      const pend = App.porCubrir(s, c.sob[s.id]); const monto = U.r2(Math.min(pend, f.saldo));
      if (!(monto > 0.004)) return;
      App.addMov({ tipo: 'mover', monto, espacio: f.e.id, sobre: f.o.id, espacio2: e.id, sobre2: s.id, nota: 'Cubrir lo que me pasé en ' + s.nombre });
      U.haptic();
      const resta = U.r2(pend - monto);
      if (resta > 0.004) { h.de = ''; App.renderHoja(); App.toast('✅ Cubriste ' + U.money(monto) + '. Faltan ' + U.money(resta) + ': elige otro sobre', 'largo'); }
      else { App.cerrarHoja(); App.toast('✅ Cubriste ' + U.money(monto) + ' con ' + f.o.nombre + ' · le quedan ' + U.money(f.saldo - monto), 'ok'); }
      refrescar();
    },
    'notif-activar': () => App.pedirNotifs(),
    'hora-cuadre': (el) => { App.state.ajustes.horaCuadre = Number(el.dataset.v); App.save(); App.programarCuadre(); App.renderHoja(); },
    'cuadre-saltar': () => { App.state.ajustes.ultimoCuadre = U.today(); App.save(); refrescar(); },

    /* avisos */
    'repartir': (el) => {
      const r = App.repartir(el.dataset.id, U.today(), false); App.save(); U.haptic();
      if (r && r.partes.length) U.sonido('logro');
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
    'pagar-sobre': (el) => {
      const s = App.sobre(el.dataset.esp, el.dataset.id); if (!s) return;
      App.abrirHoja('registro', { modo: 'gasto', monto: String(el.dataset.monto || s.cuota || ''), espacio: el.dataset.esp, sobre: s.id, cuenta: App.ultimaCuenta('gasto'), nota: s.nombre, sobrePago: el.dataset.f || '' });
    },
    'pagar-tarjeta': (el) => {
      const ct = App.cuenta(el.dataset.id); if (!ct) return;
      const p = App.pagoTarjeta(ct);
      const origen = App.state.cuentas.find((c) => !App.esCredito(c) && c.icono === '🏦') || App.state.cuentas.find((c) => !App.esCredito(c));
      App.abrirHoja('registro', { modo: 'mover', moverModo: 'cuentas', cuenta: origen ? origen.id : '', cuenta2: ct.id, monto: p && p.monto > 0 ? String(p.monto) : '', nota: 'Pago de tarjeta ' + ct.nombre }, !!App.h);
    },
    'cambio-partes': (el) => {
      App.abrirHoja('registro', { modo: 'mover', moverModo: 'cuentas', cuenta: el.dataset.id, sub: 'b', cuenta2: el.dataset.id, sub2: 'm', nota: 'Cambio' }, !!App.h);
    },
    'pagar-rec': (el) => {
      const r = App.state.recurrentes.find((x) => x.id === el.dataset.id); if (!r) return;
      // un cobro fijo a tarjeta de crédito (como una suscripción) se junta poco a poco hasta pagar la tarjeta
      App.abrirHoja('registro', { modo: 'gasto', monto: String(r.monto), espacio: r.espacio, sobre: r.sobre, cuenta: r.cuenta || App.ultimaCuenta('gasto'), nota: r.nombre, recId: r.id, recFecha: el.dataset.f, diferido: App.esCredito(App.cuenta(r.cuenta)), fecha: el.dataset.f && el.dataset.f <= U.today() ? el.dataset.f : U.today() });
    },

    /* bloqueo */
    'bloquear': () => { App.ui.bloqueado = true; App.ui.pinIn = ''; App.cerrarHoja(true); refrescar(); },
    'pin-tecla': async (el) => {
      const k = el.dataset.k;
      if (App.ui.abriendo) return;
      U.haptic('suave'); // aquí sí: todavía estamos dentro del toque
      if (k === 'del') App.ui.pinIn = App.ui.pinIn.slice(0, -1);
      else if (App.ui.pinIn.length < 4) App.ui.pinIn += k;
      const pintar = () => { const p = document.getElementById('pin-puntos'); if (p) [].forEach.call(p.children, (d, i) => d.classList.toggle('on', i < App.ui.pinIn.length)); else refrescar(); };
      pintar();
      if (App.ui.pinIn.length === 4) {
        const hash = await U.sha256('cdf:' + App.ui.pinIn);
        if (hash === App.state.ajustes.pin) {
          App.ui.pinIn = ''; App.ui.abriendo = true;
          U.sonido('abrir');
          const b = document.querySelector('.bloqueo');
          const abrir = () => { App.ui.abriendo = false; App.ui.bloqueado = false; refrescar(); App.balPendiente(); App.revisarMes(); };
          if (b && !U.sinMovimiento()) { b.classList.add('abriendo'); setTimeout(abrir, 420); } else abrir();
          return;
        }
        App.ui.pinIn = '';
        const p = document.getElementById('pin-puntos');
        if (p) { p.classList.remove('error'); void p.offsetWidth; p.classList.add('error'); setTimeout(pintar, 280); if (navigator.vibrate && App.state.ajustes.vibracion !== false) navigator.vibrate([30, 40, 30]); }
        else refrescar();
      }
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
    'sobre-tipo': (el) => {
      const h = App.h; const antes = h.tipo; h.tipo = el.dataset.v;
      // al cambiar entre gasto y ahorro, convierte la cantidad para que siga teniendo sentido
      if ((antes === 'gasto' || antes === 'limite') && h.tipo === 'ahorro' && num(h.cuota) > 0) h.cuota = String(U.r2(U.convertir(num(h.cuota), h.frecPago, h.frecAporte)));
      if (antes === 'ahorro' && (h.tipo === 'gasto' || h.tipo === 'limite') && num(h.cuota) > 0) h.cuota = String(U.r2(U.convertir(num(h.cuota), h.frecAporte, h.frecPago)));
      if (h.tipo === 'deuda' && !h.desde) h.desde = U.today();
      App.renderHoja();
    },
    'se-conmeta': (el) => {
      const h = App.h; h.conMeta = el.dataset.v === '1';
      if (!h.conMeta) h.hasta = '';
      App.renderHoja();
    },
    'se-porpct': (el) => { App.h.porPct = el.dataset.v === '1'; App.renderHoja(); },
    'se-plazo': (el) => { App.h.hasta = U.addMonths(U.today(), Number(el.dataset.v)); App.renderHoja(); },
    'se-frec-pago': (el) => { App.h.frecPago = el.dataset.v; App.renderHoja(); },
    'se-frec-aporte': (el) => {
      const h = App.h; const antes = U.frec(h.frecAporte || App.state.ajustes.frecIngreso);
      if (h.tipo === 'ahorro' && !h.conMeta && num(h.cuota) > 0) h.cuota = String(U.r2(U.convertir(num(h.cuota), antes, el.dataset.v)));
      if (h.manual && num(h.aporteManual) > 0) h.aporteManual = String(U.r2(U.convertir(num(h.aporteManual), antes, el.dataset.v)));
      h.frecAporte = el.dataset.v; App.renderHoja();
    },
    'aviso-ritmo-no': () => { App.state.ajustes.avisoRitmo = true; App.save(); refrescar(); },
    'aporte-todos': () => {
      const f = App.state.ajustes.frecIngreso; let n = 0;
      App.state.espacios.forEach((e) => e.sobres.forEach((s) => {
        if (s.tipo === 'tarjeta' || s.tipo === 'porIngreso') return;
        const antes = U.frec(s.frecAporte || f); if (antes === f) return;
        // las cantidades fijas se convierten para que sigan siendo lo mismo (ej. $100 a la semana = $14.29 al día)
        if (s.tipo === 'ahorro' && !(s.meta > 0 && s.hasta) && s.cuota > 0) s.cuota = U.r2(U.convertir(s.cuota, antes, f));
        if (App.esManual(s)) s.aporteManual = U.r2(U.convertir(parseFloat(s.aporteManual), antes, f));
        s.frecAporte = f; n++;
      }));
      App.save(); U.haptic(); App.toast(n + (n === 1 ? ' sobre ahora aparta ' : ' sobres ahora apartan ') + U.FREC_CADA[f], 'ok'); App.renderHoja(); refrescar();
    },
    'frec-ingreso': (el) => { App.state.ajustes.frecIngreso = el.dataset.v; App.save(); App.renderHoja(); refrescar(); },
    'cuenta-tipo': (el) => { const h = App.h; h.tipo = el.dataset.v; if (h.tipo === 'credito' && (h.icono === '🏦' || !h.icono)) h.icono = '💳'; if (h.tipo === 'normal' && h.icono === '💳') h.icono = '🏦'; App.renderHoja(); },
    'sobre-guardar': () => {
      const h = App.h; const e = App.espacio(h.esp);
      if (!e) return App.toast('Elige un espacio', 'error');
      if (!String(h.nombre || '').trim()) return App.toast('Ponle un nombre', 'error');
      const esGasto = h.tipo === 'gasto' || h.tipo === 'limite';
      const datos = {
        nombre: h.nombre.trim(), icono: h.icono, tipo: h.tipo, cuota: num(h.cuota), meta: num(h.meta),
        desde: h.tipo === 'deuda' ? (h.desde || U.today()) : '', hasta: h.tipo === 'deuda' || (h.tipo === 'ahorro' && h.conMeta) ? (h.hasta || '') : '',
        sobranteA: h.tipo === 'limite' ? (h.sobranteA || '') : '', disponible: h.tipo !== 'tarjeta' && !!h.disponible,
        frecPago: U.frec(h.frecPago), frecAporte: h.tipo === 'tarjeta' ? (h.frecAporte || '') : U.frec(h.frecAporte || App.state.ajustes.frecIngreso),
        fechaPago: h.tipo === 'gasto' ? (h.fechaPago || '') : '', avisar: Number(h.avisar) || 0,
        aporteManual: (esGasto || h.tipo === 'deuda') && h.manual ? num(h.aporteManual) : '',
        alerta: esGasto ? (h.alerta || '') : '',
        pct: h.tipo === 'porIngreso' && h.porPct ? Math.min(100, num(h.pct)) : 0,
        candado: h.tipo !== 'tarjeta' && !!h.candado
      };
      if (h.tipo === 'porIngreso' && !(datos.pct > 0) && !(datos.cuota > 0)) return App.toast(h.porPct ? 'Escribe el porcentaje' : 'Escribe la cantidad', 'error');
      if (h.tipo === 'deuda' && (!(datos.meta > 0) || !datos.hasta)) return App.toast('Pon el total y la fecha límite', 'error');
      if (h.tipo === 'ahorro' && h.conMeta) {
        if (!(datos.meta > 0) || !datos.hasta) return App.toast('Pon cuánto quieres juntar y para cuándo', 'error');
        if (datos.hasta <= U.today()) return App.toast('Elige una fecha después de hoy', 'error');
        // se guarda también la cantidad calculada (por si la fecha pasa sin completar)
        const lleva = h.id ? Math.max(0, (App.calc().sob[h.id] || {}).saldo || 0) : 0;
        const m = App.calcMeta(datos.meta, lleva, datos.hasta, datos.frecAporte);
        datos.cuota = m ? m.cuota : datos.cuota;
      }
      if (esGasto && !(datos.cuota > 0) && !(datos.aporteManual > 0)) return App.toast('Escribe el monto', 'error');
      let s = h.id ? e.sobres.find((x) => x.id === h.id) : null;
      if (s) Object.assign(s, datos);
      else { s = App.nuevoSobre(datos); e.sobres.push(s); }
      if (s.sobranteA) s.cierre = App.finCicloAnterior(s, U.today());
      App.save(); App.toast('Sobre guardado', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'sobre-borrar': (el) => {
      const h = App.h; const S = App.state; const e = App.espacio(h.esp);
      const st = App.calc().sob[h.id];
      if (h.tipo === 'tarjeta' && st && st.saldo < -0.004) return App.toast('Aún falta juntar ' + U.money(-st.saldo) + ' para la tarjeta', 'error');
      if (!confirmar(el, 'Toca otra vez: su dinero pasará a Libre')) return;
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
      const credito = h.tipo === 'credito';
      const dia = (v) => { const n = parseInt(v, 10); return n >= 1 && n <= 31 ? n : ''; };
      const datos = { nombre: h.nombre.trim(), icono: h.icono, tipo: credito ? 'credito' : 'normal' };
      if (credito) Object.assign(datos, { limite: num(h.limite), diaCorte: dia(h.diaCorte), diaPago: dia(h.diaPago), avisar: Number(h.avisar) || 0, partes: false, limiteUso: num(h.limiteUso) || '', alerta: h.alerta || '' });
      else datos.partes = !!h.partes;
      if (credito && (!datos.diaCorte || !datos.diaPago)) return App.toast('Pon el día de corte y el de pago', 'error');
      const espId = h.esp || (App.espacioPrincipal() || {}).id;
      if (h.id) Object.assign(App.cuenta(h.id), datos);
      else {
        const c = Object.assign({ id: U.uid() }, datos); S.cuentas.push(c);
        const ini = (monto, extra) => S.movs.push(App.nuevoMov(Object.assign({ tipo: 'inicial', monto, cuenta: c.id, espacio: espId, nota: 'Saldo inicial' }, extra || {})));
        if (credito) {
          const debe = num(h.debe);
          if (debe > 0) { App.sobreTarjeta(espId, c.id, true); ini(-debe, { diferido: true, meses: 1, nota: 'Deuda inicial de la tarjeta' }); }
        } else if (datos.partes) {
          if (num(h.saldoB) > 0) ini(num(h.saldoB), { sub: 'b' });
          if (num(h.saldoM) > 0) ini(num(h.saldoM), { sub: 'm' });
        } else if (num(h.saldo) > 0) ini(num(h.saldo));
      }
      App.save(); App.toast(credito ? 'Tarjeta guardada' : 'Cuenta guardada', 'ok'); App.cerrarHoja(false); refrescar();
    },
    'cuenta-borrar': (el) => {
      const h = App.h; const S = App.state; const saldo = App.calc().cuentas[h.id];
      if (Math.abs(saldo) > 0.004) return App.toast(h.tipo === 'credito' ? 'Primero paga lo que debes (' + U.money(-saldo) + ')' : 'Primero traspasa su saldo (' + U.money(saldo) + ') a otra cuenta', 'error');
      if (S.cuentas.length <= 1) return App.toast('Necesitas al menos una cuenta', 'error');
      const c0 = App.calc();
      const pend = S.espacios.some((e) => e.sobres.some((s) => s.tipo === 'tarjeta' && s.cuenta === h.id && c0.sob[s.id].saldo < -0.004));
      if (pend) return App.toast('Aún hay compras de esta tarjeta por juntar', 'error');
      if (!confirmar(el, 'Toca otra vez para eliminar')) return;
      S.cuentas = S.cuentas.filter((c) => c.id !== h.id);
      S.espacios.forEach((e) => {
        e.sobres.filter((s) => s.tipo === 'tarjeta' && s.cuenta === h.id && c0.sob[s.id].saldo > 0.004).forEach((s) => S.movs.push(App.nuevoMov({ tipo: 'mover', monto: c0.sob[s.id].saldo, espacio: e.id, sobre: s.id, espacio2: e.id, sobre2: '', nota: 'Tarjeta eliminada' })));
        e.sobres = e.sobres.filter((s) => !(s.tipo === 'tarjeta' && s.cuenta === h.id));
      });
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
    'fondo': (el) => { App.state.ajustes.fondo = el.dataset.v; App.save(); if (el.dataset.v === 'planetas') App.cosmos(); document.body.dataset.fondo = el.dataset.v; App.renderHoja(); },
    'reg-limite': () => { if (App.h) App.abrirHoja('limite-tarjeta', { id: App.h.cuenta }, true); },
    'lim-chip': (el) => { App.h.limiteUso = el.dataset.v; App.renderHoja(); },
    'lim-guardar': () => {
      const h = App.h; const ct = App.cuenta(h.id); if (!ct) return;
      const v = U.r2(parseFloat(String(h.limiteUso || '').replace(/[^0-9.]/g, '')) || 0);
      ct.limiteUso = v > 0 ? v : ''; ct.alerta = h.alerta || '';
      App.save(); U.haptic(); App.toast(v > 0 ? 'Límite de uso: ' + U.money0(v) : 'Sin límite propio', 'ok');
      App.cerrarHoja(false);
    },
    'al-gen': (el) => { App.state.ajustes[el.dataset.k] = Number(el.dataset.v); App.h[el.dataset.c] = el.dataset.v; App.save(); U.haptic('suave'); App.renderHoja(); },
    'probar-sonidos': () => { U.haptic(); ['gasto', 'ingreso', 'alerta', 'logro'].forEach((t, i) => setTimeout(() => U.sonido(t), i * 650)); },

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
  /* ================= v1.6: dinero real, auto-balanceo, privacidad, caja fuerte, día cero y cierre de mes ================= */
  const svgI = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const OJO = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';
  App.I.eye = svgI(OJO);
  App.I.eyeOff = svgI(OJO + '<path d="M3 3l18 18"/>');

  /* Inicio: solo dos cifras. Dinero real (lo que hay en tus cuentas) = Apartado + Libre para gastar hoy */
  App.heroInicio = (c, graf, d) => {
    const S = App.state; const t = c.tot; const I = App.I;
    // de qué está hecho "Libre": dinero sin sobre + sobres marcados como libres (Ocio)
    let sin = 0; const libres = [];
    S.espacios.forEach((e) => {
      if (!e.enDisponible) return;
      sin += c.esp[e.id].libre;
      e.sobres.forEach((s) => { if (s.disponible && s.tipo !== 'tarjeta') libres.push(s.nombre + ' ' + U.money0(Math.max(0, c.sob[s.id].saldo))); });
    });
    const falta = t.disponible < -0.004;
    const comp = falta ? 'Tus sobres piden más dinero del que hay' : libres.length ? libres.join(' + ') + ' + sin sobre ' + U.money0(sin) : 'Dinero que no está en ningún sobre';
    const tam = (v) => (U.money(v).length > 9 ? ' chico' : '');
    const pct = t.real > 0 ? U.clamp(t.disponible / t.real, 0, 1) * 100 : 0;
    const tarjetas = S.cuentas.filter((ct) => App.esCredito(ct) && c.cuentas[ct.id] < -0.004);
    let h = '<div class="hero"><div class="duo">' +
      '<button class="duo-c' + (graf === 'real' ? ' on' : '') + '" data-a="grafica" data-v="real"><span class="etiqueta">Dinero real</span><span class="grande' + tam(t.real) + '">' + App.montoGrande(t.real) + '</span><small>Lo que hay en tus cuentas</small></button>' +
      '<button class="duo-c' + (graf === 'libre' ? ' on' : '') + '" data-a="grafica" data-v="libre"><span class="etiqueta">' + (falta ? 'Te falta cubrir' : 'Libre para gastar hoy') + '</span><span class="grande' + tam(t.disponible) + (falta ? ' neg' : '') + '">' + App.montoGrande(Math.abs(t.disponible)) + '</span><small>' + U.esc(comp) + '</small></button></div>' +
      '<button class="reparto" data-a="hoja" data-h="apartado" aria-label="Ver en qué está apartado tu dinero"><i class="reparto-barra"><i style="width:' + pct.toFixed(1) + '%"></i></i>' +
      '<span><b>Apartado ' + U.money0(t.apartadoReal) + '</b> · ver ›</span><span>Libre ' + U.money0(Math.max(0, t.disponible)) + '</span></button>';
    if (tarjetas.length) h += '<p class="debes">💳 Debes ' + U.money0(t.deudaTarjeta) + ' en ' + U.esc(tarjetas.map((ct) => ct.nombre).join(' y ')) + ' · ya tienes apartados ' + U.money0(Math.max(0, t.deudaTarjeta - t.porJuntar)) + '. No se resta de tu dinero real.</p>';
    h += '<span class="delta ' + d.dClase + '">' + (d.neto > 0 ? I.arrowUp : d.neto < 0 ? I.arrowDown : '') + '<span class="num">' + U.money(Math.abs(d.neto)) + '</span></span>' +
      '<span class="delta-sub">' + d.nombreRango + ' · ' + d.antes + ': ' + (d.cmp.anterior.neto >= 0 ? '+' : '−') + U.money0(Math.abs(d.cmp.anterior.neto)) + '</span></div>';
    return h;
  };

  /* En qué está apartado el dinero real. La suma de todo siempre da tot.apartadoReal (se prueba en las simulaciones) */
  App.desglose = (c) => {
    const g = { pagos: [], diario: [], guardado: [], negocio: [] };
    App.state.espacios.forEach((e) => {
      const x = c.esp[e.id];
      if (!e.enDisponible) { if (Math.abs(x.real) > 0.004) g.negocio.push({ n: e.icono + ' ' + e.nombre, v: x.real }); return; }
      let tarj = x.deu;
      e.sobres.forEach((s) => {
        const v = c.sob[s.id].saldo;
        if (s.tipo === 'tarjeta') { tarj += v; return; }
        if (s.disponible || !(v > 0.004)) return; // los "libres" (Ocio) ya van en Libre para gastar
        (s.tipo === 'deuda' || s.fechaPago ? g.pagos : s.tipo === 'ahorro' || s.tipo === 'porIngreso' ? g.guardado : g.diario).push({ n: s.icono + ' ' + s.nombre + (s.candado ? ' 🔒' : ''), v });
      });
      if (Math.abs(tarj) > 0.004) g.pagos.unshift({ n: '💳 Para pagar tarjetas', v: U.r2(tarj) });
    });
    return g;
  };
  App.HOJAS.apartado = {
    titulo: 'Tu dinero real',
    render: () => {
      const c = App.calc(); const t = c.tot; const g = App.desglose(c);
      const fila = (o) => '<div class="fila"><div class="txt"><b>' + U.esc(o.n) + '</b></div><div class="der"><b class="num">' + U.money(o.v) + '</b></div></div>';
      const grupo = (titulo, l) => (l.length ? '<div class="etq">' + titulo + ' · ' + U.money(l.reduce((s, o) => s + o.v, 0)) + '</div>' + l.map(fila).join('') : '');
      return '<p class="nota" style="margin-top:0">Tienes <b>' + U.money(t.real) + '</b> en tus cuentas. De eso, <b>' + U.money(t.apartadoReal) + '</b> ya tiene destino y <b>' + U.money(t.disponible) + '</b> está libre para gastar.</p>' +
        grupo('Pagos y deudas', g.pagos) + grupo('Gastos del día a día', g.diario) + grupo('Guardado', g.guardado) + grupo('Negocio', g.negocio) +
        '<p class="nota">Las tarjetas de crédito no cuentan como dinero: lo que debes aparece aquí solo como dinero apartado para pagarlas.</p>';
    }
  };

  /* ---------------- auto-balanceo ----------------
     Si te pasas del presupuesto de un sobre y falta dinero (o un pago vence en 2 días y no alcanza), el faltante sale solo,
     en este orden: 1° Ocio (sobres "libres"), 2° Ahorro, 3° Colchón. Nunca de tarjeta, deudas ni otros gastos. */
  // shortcut: el Colchón se reconoce por nombre o ícono; si alguien lo nombra distinto cuenta como Ahorro. Volverlo opción del sobre si hace falta
  const esColchon = (o) => /colch|emergenc/i.test(o.nombre) || o.icono === '🛟';
  const nivelBal = (o) => (o.tipo === 'ahorro' ? (esColchon(o) ? 3 : 2) : o.disponible && (o.tipo === 'gasto' || o.tipo === 'limite') ? 1 : 0);
  const cuandoTxt = (d) => (d === 0 ? 'hoy' : d === 1 ? 'mañana' : 'en ' + d + ' días');
  const txtBal = (av) => ({
    titulo: 'Moví ' + U.money(av.partes.reduce((s, p) => s + p.monto, 0)) + ' a ' + av.a,
    cuerpo: (av.motivo === 'pago' ? av.a + ' se paga ' + cuandoTxt(av.dias) + ' y le faltaban ' + U.money(av.pedia) + '.' : 'Te pasaste ' + U.money(av.pedia) + ' del presupuesto de ' + av.a + '.') +
      ' Para cubrirlo tomé ' + av.partes.map((p) => U.money(p.monto) + ' de ' + p.de + ' (le quedan ' + U.money(p.queda) + ')').join(' y ') + '.' +
      (av.falta > 0.004 ? ' Todavía faltan ' + U.money(av.falta) + ': ya no había más en Ocio, Ahorro ni Colchón.' : '')
  });
  App.autoCubrir = () => {
    const S = App.state; const a = S.ajustes;
    if (!a.autoCubrir || a.onboarding || !S.cuentas.length) return [];
    const hoy = U.today(); const no = a.balNo || {}; const visto = {}; const avisos = [];
    const pendientes = (c) => {
      const out = [];
      S.espacios.forEach((e) => e.sobres.forEach((s) => {
        const st = c.sob[s.id];
        if (!st || !(s.tipo === 'gasto' || s.tipo === 'limite')) return;
        const M = s.fechaPago ? st.M : st.Mc;
        // solo si te pasaste del presupuesto Y por eso falta dinero de verdad (lo libre quedó en negativo)
        const falta = M > 0 && st.gastadoCiclo > M + 0.004 ? U.r2(st.porCubrir || 0) : 0;
        if (falta > 0.004) out.push({ e, s, falta, clave: st.cIni, motivo: 'pasaste' });
      }));
      App.proximosPagos(c).forEach((p) => {
        if (p.tipo !== 'sobre' || p.dias < 0 || p.dias > 2) return;
        const e = App.espacio(p.r.espacio); const s = e && e.sobres.find((x) => x.id === p.r.sobre); const st = s && c.sob[s.id];
        const falta = st ? U.r2(p.r.monto - st.saldo) : 0;
        if (falta > 0.004) out.push({ e, s, falta, clave: p.fecha, motivo: 'pago', dias: p.dias });
      });
      // lo que deshiciste no se vuelve a mover en ese mismo periodo
      return out.filter((n) => no[n.s.id] !== n.clave && !visto[n.s.id + n.clave]);
    };
    for (let g = 0; g < 30; g++) {
      const c = App.calc(); const n = pendientes(c)[0];
      if (!n) break;
      visto[n.s.id + n.clave] = 1;
      let falta = n.falta; const partes = []; const ids = [];
      n.e.sobres.filter((o) => o.id !== n.s.id && nivelBal(o) > 0 && c.sob[o.id] && c.sob[o.id].saldo > 0.004)
        .sort((x, y) => nivelBal(x) - nivelBal(y) || (x.meta > 0 ? 1 : 0) - (y.meta > 0 ? 1 : 0) || c.sob[y.id].saldo - c.sob[x.id].saldo)
        .forEach((o) => {
          if (!(falta > 0.004)) return;
          const x = U.r2(Math.min(falta, c.sob[o.id].saldo));
          const m = App.nuevoMov({ fecha: hoy, tipo: 'mover', monto: x, espacio: n.e.id, sobre: o.id, espacio2: n.e.id, sobre2: n.s.id, nota: 'Auto-balanceo: ' + n.s.nombre, bal: 1 });
          S.movs.push(m); ids.push(m.id);
          partes.push({ de: o.nombre, monto: x, queda: U.r2(c.sob[o.id].saldo - x) });
          falta = U.r2(falta - x);
        });
      if (partes.length) avisos.push({ id: U.uid(), fecha: hoy, sobre: n.s.id, clave: n.clave, a: n.s.nombre, motivo: n.motivo, dias: n.dias || 0, pedia: n.falta, falta, partes, movs: ids });
    }
    if (avisos.length) {
      a.balAvisos = (a.balAvisos || []).concat(avisos).slice(-8);
      App.save(); U.haptic();
      if (!App.balPendiente()) setTimeout(() => App.toast('🔁 ' + txtBal(avisos[0]).titulo + '. Míralo o deshazlo en la campana 🔔', 'largo'), 1600);
    }
    return avisos;
  };
  // la primera vez que el auto-balanceo actúa se explica con una tarjeta completa
  App.balPendiente = () => {
    const a = App.state.ajustes; const av = (a.balAvisos || []).slice(-1)[0];
    if (a.balVisto || !av || App.ui.bloqueado) return false;
    a.balVisto = true; App.save();
    setTimeout(() => App.abrirHoja('bal', { id: av.id }, !!App.h), 900);
    return true;
  };
  const botonesBal = (av) => '<div class="acciones"><button class="btn-chico blanco" data-a="bal-ok" data-id="' + av.id + '">Entendido</button><button class="btn-chico" data-a="bal-deshacer" data-id="' + av.id + '">↩︎ Deshacer</button></div>';
  App.avisosBal = () => (App.state.ajustes.balAvisos || []).map((av) => { const t = txtBal(av); return '<div class="aviso bal"><div class="ico">🔁</div><div class="txt"><b>' + U.esc(t.titulo) + '</b><p>' + U.esc(t.cuerpo) + '</p>' + botonesBal(av) + '</div></div>'; });
  App.HOJAS.bal = {
    titulo: 'Moví dinero por ti',
    render: (h) => {
      const av = (App.state.ajustes.balAvisos || []).find((x) => x.id === h.id);
      if (!av) return '<p class="nota" style="text-align:center;padding:18px 0">Este movimiento ya se deshizo o se quitó.</p>';
      const t = txtBal(av);
      return '<p style="margin-top:0;font-size:17px"><b>' + U.esc(t.titulo) + '</b></p><p>' + U.esc(t.cuerpo) + '</p>' +
        '<div class="cuadro-bal"><b>¿Qué pasó?</b><p>Esto es el <b>auto-balanceo</b>. Cuando gastas más de lo que tenía un sobre, la app cubre el faltante sola para que tus cuentas sigan cuadrando. No se pierde dinero: solo cambia de sobre.</p>' +
        '<p>Siempre toma en este orden: <b>1° Ocio</b>, <b>2° Ahorro</b> y, solo si no alcanza, <b>3° Colchón</b>. Nunca toca tus deudas ni lo apartado para la tarjeta.</p>' +
        '<p>Cada vez que pase te aviso en la campana 🔔 y lo puedes deshacer con un toque.</p></div>' +
        '<button class="btn" data-a="bal-ok" data-id="' + av.id + '">' + App.I.check + 'Entendido</button>' +
        '<button class="btn sec" data-a="bal-deshacer" data-id="' + av.id + '">↩︎ Deshacer este movimiento</button>' +
        '<button class="link-peligro" data-a="bal-apagar">Apagar el auto-balanceo</button>';
    }
  };
  const quitarBal = (id) => {
    const a = App.state.ajustes;
    a.balAvisos = (a.balAvisos || []).filter((x) => x.id !== id); App.save();
    if (App.h && App.h._hoja === 'bal') App.cerrarHoja(true); else if (App.h) App.renderHoja();
    refrescar();
  };

  /* ---------------- caja fuerte: sobres con candado ---------------- */
  App.HOJAS.candado = {
    titulo: '🔒 Caja fuerte',
    init: (d) => Object.assign({ txt: '' }, d),
    render: (h) => '<p style="margin-top:0">Vas a sacar <b>' + U.money(h.monto) + '</b> de <b>' + U.esc(h.nombre) + '</b>, un sobre que protegiste con candado.</p>' +
      '<p class="nota">Respira. Si de verdad lo necesitas, escribe la palabra <b>Confirmar</b> para seguir.</p>' +
      '<label class="campo"><span>Escribe: Confirmar</span><input data-m="txt" value="' + U.esc(h.txt) + '" autocomplete="off" autocapitalize="off" placeholder="Confirmar" aria-label="Escribe Confirmar"></label>' +
      '<button class="btn" data-a="candado-ok">' + App.I.lock + 'Sacar el dinero</button><button class="btn sec" data-a="volver-hoja">Mejor no</button>'
  };

  /* ---------------- día cero: el día en que empieza tu mes ---------------- */
  App.HOJAS['dia-cero'] = {
    titulo: 'Día en que empieza tu mes',
    init: () => ({ dia: String(App.state.ajustes.diaCero || 1) }),
    render: (h) => '<p class="nota" style="margin-top:0">Si cobras el 15 o el 30, tu mes puede empezar ese día. Los sobres mensuales y el cierre de mes se cuentan desde ahí y no desde el día 1.</p>' +
      '<div class="chips">' + ['1', '15', '30'].map((d) => App.chipHTML(h.dia === d, 'dia-cero', 'data-v="' + d + '"', 'Día ' + d)).join('') + '</div>' +
      '<label class="campo"><span>Otro día (del 1 al 31)</span><input inputmode="numeric" data-m="dia" value="' + U.esc(h.dia) + '"></label>' +
      '<p class="nota">En los meses más cortos se usa su último día.</p>' +
      '<button class="btn" data-a="dia-cero-guardar">' + App.I.check + 'Guardar</button>'
  };

  /* ---------------- cierre de mes: en verde (confeti) o en rojo (aviso con tacto) ---------------- */
  // Compara lo gastado en el mes que terminó contra lo planeado en los sobres de gasto. Devuelve null si no toca o no hay datos.
  App.cierreMes = () => {
    const S = App.state; const a = S.ajustes;
    const ini = U.periodo('mensual', U.today()).ini;
    if (a.ultimoMes === ini) return null;
    const primera = !a.ultimoMes; a.ultimoMes = ini; App.save();
    if (primera) return null;
    const P = U.periodo('mensual', U.addDays(ini, -1));
    // solo cuenta desde que hay movimientos (para no comparar un mes a medias contra el plan completo)
    const desde = S.movs.reduce((u, m) => (m.fecha < u ? m.fecha : u), P.fin);
    let plan = 0, gasto = 0, n = 0; const cuenta = {};
    S.espacios.forEach((e) => {
      if (!e.enDisponible) return;
      cuenta[e.id + '|'] = 1;
      e.sobres.forEach((s) => {
        if (s.tipo !== 'gasto' && s.tipo !== 'limite') return;
        cuenta[s.id] = 1;
        const d = [P.ini, desde, s.creado || ''].sort().pop();
        if (d < P.fin) plan += U.convertir(s.cuota, s.frecPago, 'mensual') * U.daysBetween(d, P.fin) / U.daysBetween(P.ini, P.fin);
      });
    });
    S.movs.forEach((m) => {
      if (m.tipo !== 'gasto' || m.fecha < P.ini || m.fecha >= P.fin) return;
      if (m.sobre ? cuenta[m.sobre] : cuenta[m.espacio + '|']) { gasto += Number(m.monto); n++; }
    });
    if (!(plan > 0) || !n) return null;
    return { ini: P.ini, fin: U.addDays(P.fin, -1), plan: U.r2(plan), gasto: U.r2(gasto), ok: gasto <= plan + 0.004 };
  };
  App.revisarMes = () => {
    const S = App.state;
    if (App.ui.bloqueado || S.ajustes.onboarding || !S.cuentas.length) return;
    const r = App.cierreMes();
    if (r) setTimeout(() => App.abrirHoja('mes', r, !!App.h), 1900);
  };
  App.HOJAS.mes = {
    titulo: (h) => (h.ok ? '¡Mes en verde!' : 'Mes en rojo'),
    render: (h) => {
      const rango = U.fechaCorta(h.ini) + ' – ' + U.fechaCorta(h.fin); const dif = U.r2(Math.abs(h.plan - h.gasto));
      return '<div class="mes-cara">' + (h.ok ? '🎉' : '💛') + '</div>' +
        (h.ok ? '<p style="text-align:center;font-size:17px">Cerraste tu mes (' + rango + ') <b>por debajo de tu presupuesto</b>.</p><p class="nota" style="text-align:center">Gastaste ' + U.money(h.gasto) + ' de los ' + U.money(h.plan) + ' que planeaste. Te sobraron <b>' + U.money(dif) + '</b>. ¡Bien hecho!</p>'
          : '<p style="text-align:center;font-size:17px">Este mes (' + rango + ') <b>te pasaste ' + U.money(dif) + '</b> de tu presupuesto.</p><p class="nota" style="text-align:center">Gastaste ' + U.money(h.gasto) + ' y tu plan era ' + U.money(h.plan) + '. Le pasa a cualquiera, y ya lo sabes: eso es lo importante. Revisa en qué sobres se fue y ajusta el plan del mes que empieza.</p>') +
        '<button class="btn" data-a="cerrar-hoja">' + App.I.check + (h.ok ? '¡A seguir así!' : 'Entendido') + '</button>';
    },
    montar: (h) => {
      if (h.hecho) return;
      h.hecho = true;
      const vib = App.state.ajustes.vibracion !== false && typeof navigator.vibrate === 'function';
      if (h.ok) {
        if (window.confetti && !U.sinMovimiento()) window.confetti({ particleCount: 150, spread: 85, origin: { y: 0.65 }, zIndex: 9999 });
        if (vib) navigator.vibrate([50, 50, 50]); else U.haptic();
        U.sonido('logro');
      } else {
        // temblor + colores apagados 3 segundos (ver html.rojo en styles.css)
        document.documentElement.classList.add('rojo');
        setTimeout(() => document.documentElement.classList.remove('rojo'), 3000);
        if (vib) navigator.vibrate(600); else U.haptic('alerta');
        U.sonido('alerta');
      }
    }
  };

  Object.assign(A, {
    'grafica': (el) => { App.state.ajustes.grafica = el.dataset.v; App.save(); refrescar(); },
    'privado': () => { const a = App.state.ajustes; a.privado = !a.privado; App.save(); U.haptic('suave'); refrescar(); },
    'bal-ok': (el) => quitarBal(el.dataset.id),
    'bal-deshacer': (el) => {
      const a = App.state.ajustes; const av = (a.balAvisos || []).find((x) => x.id === el.dataset.id);
      if (!av) return;
      av.movs.forEach((id) => App.deleteMov(id));
      a.balNo = Object.assign({}, a.balNo, { [av.sobre]: av.clave });
      U.haptic();
      App.toast('Deshecho: el dinero volvió a ' + av.partes.map((p) => p.de).join(' y '), 'ok');
      quitarBal(av.id);
    },
    'bal-apagar': () => { App.state.ajustes.autoCubrir = false; App.save(); App.cerrarHoja(true); App.toast('Auto-balanceo apagado. Se prende en Ajustes → Hábitos', 'largo'); refrescar(); },
    'candado-ok': () => {
      if (String(App.h.txt || '').trim().toLowerCase() !== 'confirmar') return App.toast('Escribe la palabra Confirmar', 'error');
      const id = App.h.sobre;
      App.cerrarHoja(false);
      if (App.h && App.h._hoja === 'registro') { App.h.candadoOk = id; App.guardarRegistro(); }
    },
    'dia-cero': (el) => { App.h.dia = el.dataset.v; App.renderHoja(); },
    'dia-cero-guardar': () => {
      const a = App.state.ajustes; const n = U.clamp(parseInt(App.h.dia, 10) || 1, 1, 31);
      a.diaCero = n; a.ultimoMes = U.periodo('mensual', U.today()).ini; // cambiar el día no dispara un cierre de mes
      App.save(); App.cerrarHoja(true); App.toast('Tu mes empieza el día ' + n, 'ok'); refrescar();
    }
  });
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
      const def = App.HOJAS[App.h._hoja];
      if (def && def.alEscribir) def.alEscribir(App.h, el);
      return;
    }
    if (el.dataset.cuadre && App.h) {
      const clave = el.dataset.cuadre;
      App.h.real[clave] = el.value;
      const s = document.getElementById('dif-' + clave.replace(':', '-'));
      if (s) {
        if (el.value === '') { s.textContent = 'Déjalo vacío si ya cuadra'; s.className = 'num'; return; }
        const dif = App.difCuadre(clave, el.value, App.calc());
        s.textContent = App.textoCuadre(clave, dif);
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
    if (el.dataset.dias && App.h) {
      // "cada N días": 1 = diario, 7 = semanal, lo demás se guarda como dN
      const n = Math.round(Number(String(el.value).replace(/[^\d]/g, '')));
      if (n >= 1 && n <= 365) App.h.frecPago = n === 1 ? 'diario' : n === 7 ? 'semanal' : 'd' + n;
      App.renderHoja(); return;
    }
    if (el.dataset.m && App.h) {
      App.h[el.dataset.m] = el.type === 'checkbox' ? el.checked : el.value;
      if (el.dataset.render || el.tagName === 'SELECT') App.renderHoja();
    }
    if (el.dataset.sw) {
      App.state.ajustes[el.dataset.sw] = el.checked; App.save();
      if (el.checked) { U.haptic(); if (el.dataset.sw === 'sonidos') U.sonido('ingreso'); }
      if (App.h && App.h._hoja === 'alertas') App.renderHoja();
    }
    if (el.dataset.al) {
      const obj = el.dataset.al === 'sobre' ? App.sobre(el.dataset.esp, el.dataset.id) : App.cuenta(el.dataset.id);
      if (obj) { obj.alerta = el.value; App.save(); U.haptic('suave'); if (App.h) App.renderHoja(); }
    }
  });

  /* ---------------- ciclo de vida ---------------- */
  let ocultoDesde = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { ocultoDesde = Date.now(); return; }
    if (App.state.ajustes.pin && ocultoDesde && Date.now() - ocultoDesde > 60000) { App.ui.bloqueado = true; App.ui.pinIn = ''; App.cerrarHoja(true); }
    const hechos = App.cierreSemanal();
    if (hechos.length) App.toast('Sobrantes: ' + hechos.map((x) => x.de + ' → ' + x.a + ' ' + U.money0(x.monto)).join(', '), 'largo');
    despuesDeAbrir();
    if (!App.h) App.render();
    App.sync.auto();
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); App.instalable = e; });

  let anchoPrev = window.innerWidth;
  window.addEventListener('resize', () => { if (Math.abs(window.innerWidth - anchoPrev) > 40 && !App.h) { anchoPrev = window.innerWidth; App.render(); } });

  /* ---------------- bienvenida animada (cada vez que se abre la app) ---------------- */
  App.splash = () => {
    const sp = document.getElementById('splash');
    if (!sp) return;
    if (U.sinMovimiento()) { sp.remove(); return; }
    const S = App.state; const n = (S.perfil.nombre || '').trim().split(' ')[0];
    const sal = document.getElementById('sp-saludo');
    if (sal) sal.textContent = S.ajustes.onboarding || !S.cuentas.length ? 'Tus finanzas en sobres' : U.saludo() + (n ? ', ' + n : '');
    let ido = false;
    const salir = () => {
      if (ido) return; ido = true;
      sp.classList.add('fuera');
      setTimeout(() => sp.remove(), 650);
    };
    sp.addEventListener('pointerdown', salir, { once: true });
    setTimeout(salir, App.ui.bloqueado ? 1100 : 1500);
  };

  // quita avisos por hoy (si siguen pendientes, vuelven mañana); el resumen y el cuadre se dan por vistos
  App.quitarAvisos = (ks) => {
    const a = App.state.ajustes; const hoy = U.today();
    const q = Object.assign({}, a.avisosQuitados || {});
    Object.keys(q).forEach((k) => { if (q[k] !== hoy) delete q[k]; });
    ks.forEach((k) => {
      q[k] = hoy;
      if (k.indexOf('semana-') === 0) a.ultimoResumen = hoy;
      if (k === 'cuadre') a.ultimoCuadre = hoy;
    });
    a.avisosQuitados = q; App.save(); U.haptic();
    if (App.h) App.renderHoja(); App.render();
  };

  /* ---------------- reparto automático ----------------
     Lo libre de cada espacio se aparta solo en lo que les falta a los sobres (al abrir la app y al volver a ella). */
  App.autoRepartir = () => {
    const S = App.state;
    if (S.ajustes.repartirSolo === false || S.ajustes.onboarding || !S.cuentas.length) return 0;
    let total = 0;
    S.espacios.forEach((e) => {
      const x = App.calc().esp[e.id];
      if (!x || !(x.libre > 0.5) || !(x.falta > 0.5)) return;
      const r = App.repartir(e.id, U.today(), false);
      if (r) total += r.partes.reduce((t, p) => t + p.monto, 0);
    });
    if (total > 0.004) { App.save(); }
    return U.r2(total);
  };

  /* ---------------- notificaciones del celular ----------------
     Sin servidor: salen al abrir la app o mientras está abierta. Cada aviso se manda una sola vez. */
  App.horaTxt = (h) => { h = Number(h) || 21; return (h > 12 ? h - 12 : h) + ':00 ' + (h >= 12 ? 'pm' : 'am'); };
  App.notifPermitidas = () => 'Notification' in window && Notification.permission === 'granted';
  const NK = 'cdf-notifs';
  const leerYa = () => { try { return JSON.parse(localStorage.getItem(NK) || '{}'); } catch (e) { return {}; } };
  const notificar = async (id, titulo, cuerpo) => {
    const ya = leerYa(); const hoy = U.today();
    if (ya[id]) return;
    ya[id] = hoy;
    Object.keys(ya).forEach((k) => { if (ya[k] < U.addDays(hoy, -60)) delete ya[k]; });
    try { localStorage.setItem(NK, JSON.stringify(ya)); } catch (e) { return; }
    const op = { body: cuerpo, tag: id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' };
    try { const reg = await navigator.serviceWorker.ready; await reg.showNotification(titulo, op); } catch (e) { try { new Notification(titulo, op); } catch (e2) { /* sin soporte */ } }
  };
  App.revisarNotifs = () => {
    const S = App.state; const a = S.ajustes;
    if (!App.notifPermitidas() || a.onboarding || !S.cuentas.length) return;
    const c = App.calc(); const hoy = U.today();
    if (a.notifPagos !== false) App.proximosPagos(c).forEach((p) => {
      if (p.dias < 0 || p.dias > 2) return;
      const cuando = p.dias === 0 ? 'hoy' : p.dias === 1 ? 'mañana' : 'en 2 días';
      notificar('pago-' + p.r.id + '-' + p.fecha + '-' + p.dias, (p.tipo === 'tarjeta' ? '💳 ' : '📅 ') + p.r.nombre + ': pago ' + cuando, 'Te toca pagar ' + U.money(p.r.monto) + (p.dias ? ' el ' + U.fechaCorta(p.fecha) : '') + '. Toca para ver si ya lo tienes juntado.');
    });
    if (a.notifPasado !== false) App.alertas(c).forEach((al) => {
      if (al.tipo !== 'sobre' || al.nivel !== 'pasado') return;
      const st = c.sob[al.s.id];
      notificar('pasado-' + al.s.id + '-' + (st.cIni || hoy), '⚠️ Te pasaste en ' + al.s.nombre, al.corto + '. Puedes cubrirlo moviendo dinero de otro sobre.');
    });
    if (a.notifCuadre !== false && new Date().getHours() >= (Number(a.horaCuadre) || 21) && a.ultimoCuadre !== hoy)
      notificar('cuadre-' + hoy, '🌙 Hora de tu cuadre', 'Revisa en 1 minuto que tu dinero real coincida con la app.');
    if (a.notifLibre !== false && a.repartirSolo === false) S.espacios.forEach((e) => {
      const x = c.esp[e.id];
      if (x && x.libre > 0.5 && x.falta > 0.5) notificar('libre-' + e.id + '-' + hoy, '✨ Tienes ' + U.money(x.libre) + ' sin repartir', 'En ' + e.nombre + ' a tus sobres les faltan ' + U.money(x.falta) + '.');
    });
  };
  App.pedirNotifs = async () => {
    if (!('Notification' in window)) { App.toast('Primero agrega la app a tu pantalla de inicio y ábrela desde ahí', 'largo'); return; }
    const r = await Notification.requestPermission();
    if (r === 'granted') { App.toast('🔔 Notificaciones activadas', 'ok'); App.revisarNotifs(); }
    else App.toast('No se activaron. Puedes cambiarlo en Ajustes del iPhone → Notificaciones', 'largo');
    if (App.h) App.renderHoja();
  };
  // mientras la app está abierta: revisa cada 15 minutos y justo a la hora del cuadre
  let tCuadre = null;
  App.programarCuadre = () => {
    clearTimeout(tCuadre);
    const h = Number(App.state.ajustes.horaCuadre) || 21; const ahora = new Date(); const meta = new Date(); meta.setHours(h, 0, 5, 0);
    if (meta > ahora) tCuadre = setTimeout(() => { App.revisarNotifs(); if (!App.h) App.render(); }, meta - ahora);
  };
  setInterval(() => { if (!document.hidden) App.revisarNotifs(); }, 15 * 60000);
  const despuesDeAbrir = () => {
    const rep = App.autoRepartir(); App.autoCubrir(); App.balPendiente(); App.revisarMes();
    if (rep > 0) setTimeout(() => App.toast('✨ Aparté ' + U.money(rep) + ' en tus sobres', 'ok'), 900);
    setTimeout(App.revisarNotifs, 2500);
    App.programarCuadre();
  };

  App.iniciar = () => {
    App.load();
    if (App.state.ajustes.pin) App.ui.bloqueado = true;
    if (!App.state.ajustes.onboarding && App.state.cuentas.length) {
      const hechos = App.cierreSemanal();
      if (hechos.length) setTimeout(() => App.toast('Sobrantes: ' + hechos.map((x) => x.de + ' → ' + x.a + ' ' + U.money0(x.monto)).join(', '), 'largo'), 800);
    }
    if (!App.state.ajustes.onboarding && App.state.cuentas.length) despuesDeAbrir();
    App.render();
    App.splash();
    App.persistir();
    App.sync.auto();
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(() => {});
  };

  App.iniciar();
})();
