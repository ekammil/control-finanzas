/* Control de Finanzas — respaldo opcional en Google Sheets y Bandeja de Apple Pay */
(function () {
  const App = window.App;
  let corriendo = false;
  let timer = null;
  let corriendoOtraVez = false;
  const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

  /* Registra un gasto o ingreso que llegó de un atajo con sobre y cuenta. Devuelve un texto corto o null si hay que revisarlo a mano. */
  App.registrarAtajo = (it) => {
    const S = App.state;
    const monto = U.r2(Math.abs(parseFloat(String(it.monto).replace(/[^0-9.]/g, '')) || 0));
    const tipo = norm(it.tipo) === 'ingreso' ? 'ingreso' : 'gasto';
    if (!(monto > 0) || (!it.sobre && tipo === 'gasto')) return null;
    let esp = App.espacioPrincipal(), sobre = null;
    if (tipo === 'gasto' && norm(it.sobre) !== 'sin sobre') {
      for (const e of S.espacios) { const s = e.sobres.find((x) => norm(x.nombre) === norm(it.sobre)); if (s) { esp = e; sobre = s; break; } }
      if (!sobre) return null;
    }
    if (tipo === 'ingreso' && it.sobre) { const e = S.espacios.find((x) => norm(x.nombre) === norm(it.sobre)); if (e) esp = e; }
    // cuenta: "Efectivo (monedas)" usa las monedas del efectivo
    const txt = norm(it.cuenta);
    const sub = /moneda/.test(txt) ? 'm' : 'b';
    const base = txt.replace(/\(.*\)/, '').trim();
    let cta = S.cuentas.find((c) => norm(c.nombre) === base) || S.cuentas.find((c) => base && (norm(c.nombre).includes(base) || base.includes(norm(c.nombre))));
    if (!cta && /moneda/.test(txt)) cta = S.cuentas.find((c) => c.partes);
    if (!cta) return null;
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(String(it.fecha)) ? String(it.fecha) : U.today();
    App.addMov({ id: String(it.id), tipo, monto, espacio: esp.id, sobre: sobre ? sobre.id : '', cuenta: cta.id, sub: cta.partes ? sub : '', nota: String(it.nota || it.comercio || '').trim(), fecha, origen: 'atajo' }, { reparto: tipo === 'ingreso', noSave: true });
    return (tipo === 'ingreso' ? '+' : '') + U.money0(monto) + ' ' + (sobre ? sobre.nombre : tipo === 'ingreso' ? 'ingreso' : 'sin sobre');
  };

  const nombreDe = (m) => {
    const e = App.espacio(m.espacio), e2 = App.espacio(m.espacio2);
    const s = e ? e.sobres.find((x) => x.id === m.sobre) : null;
    const s2 = e2 ? e2.sobres.find((x) => x.id === m.sobre2) : null;
    const c = App.cuenta(m.cuenta), c2 = App.cuenta(m.cuenta2);
    return {
      id: m.id, fecha: m.fecha, tipo: m.tipo, monto: m.monto, nota: (m.nota || '') + (m.diferido ? ' (tarjeta, a pagar poco a poco)' : ''), origen: m.origen || '',
      espacio: e ? e.nombre : '', sobre: s ? s.nombre : '', cuenta: c ? App.nombreCuenta(c.id, m.sub) : '',
      espacio2: e2 ? e2.nombre : '', sobre2: s2 ? s2.nombre : '', cuenta2: c2 ? App.nombreCuenta(c2.id, m.sub2) : '', creado: m.creado
    };
  };

  App.sync = {
    pendientes: () => App.state.movs.filter((m) => !m.sync).length + (App.state.borrados || []).length,

    auto: () => {
      if (!App.state || !App.state.ajustes.syncUrl || !navigator.onLine) return;
      clearTimeout(timer);
      timer = setTimeout(() => App.sync.run(false), 400);
    },

    run: async (avisar) => {
      const S = App.state;
      const url = S.ajustes.syncUrl;
      if (!url || corriendo) return false;
      if (!navigator.onLine) { if (avisar) App.toast('Sin internet. Se sincroniza cuando vuelva la señal.'); return false; }
      corriendo = true;
      try {
        // 1) mandar movimientos nuevos o cambiados
        const movs = S.movs.filter((m) => !m.sync).slice(0, 400);
        const borrados = (S.borrados || []).slice();
        const bandejaOk = (S.bandejaOk || []).slice();
        if (movs.length || borrados.length || bandejaOk.length) {
          const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ accion: 'app_sync', movs: movs.map(nombreDe), borrados, bandejaOk }) });
          const j = await r.json();
          if (!j.ok) throw new Error(j.mensaje || 'La hoja respondió con un error');
          const recibidos = new Set(j.recibidos || movs.map((m) => m.id));
          S.movs.forEach((m) => { if (recibidos.has(m.id)) m.sync = true; });
          S.borrados = (S.borrados || []).filter((id) => !borrados.includes(id));
          S.bandejaOk = (S.bandejaOk || []).filter((id) => !bandejaOk.includes(id));
        }
        // 2) traer pagos de Apple Pay
        const r2 = await fetch(url + (url.includes('?') ? '&' : '?') + 'accion=bandeja');
        const j2 = await r2.json();
        let nuevos = 0;
        const registrados = [];
        if (j2.ok && Array.isArray(j2.items)) {
          const ya = new Set(S.movs.map((m) => m.id).concat(S.bandeja.map((b) => b.id), S.bandejaOk || []));
          j2.items.forEach((it) => {
            if (!it.id || ya.has(String(it.id))) return;
            // del atajo "Gasto rápido": ya trae sobre y cuenta, se registra solo
            const r = App.registrarAtajo(it);
            if (r) { registrados.push(r); S.bandejaOk = (S.bandejaOk || []).concat([String(it.id)]); return; }
            S.bandeja.push({ id: String(it.id), monto: U.r2(parseFloat(String(it.monto).replace(/[^0-9.]/g, '')) || 0), comercio: it.comercio || it.nota || (it.sobre ? 'Sobre ' + it.sobre : ''), tarjeta: it.tarjeta || it.cuenta || '', fecha: it.fecha || U.today() });
            nuevos++;
          });
        }
        S.ajustes.ultimaSync = Date.now();
        localStorage.setItem('control-finanzas-v1', JSON.stringify(S));
        if ((nuevos || registrados.length) && !App.h) App.render();
        if (registrados.length) App.toast('Desde tus atajos: ' + registrados.join(', '), 'largo');
        else if (avisar) App.toast('Sincronizado' + (nuevos ? ' · ' + nuevos + ' pago(s) nuevos de Apple Pay' : ''), 'ok');
        if (registrados.length && !corriendoOtraVez) { corriendoOtraVez = true; setTimeout(() => { corriendoOtraVez = false; App.sync.run(false); }, 300); }
        return true;
      } catch (e) {
        if (avisar) App.toast('No se pudo sincronizar: ' + (e.message || 'revisa el enlace'), 'error');
        return false;
      } finally {
        corriendo = false;
      }
    }
  };

  window.addEventListener('online', () => App.sync.auto());
})();
