/* Control de Finanzas — respaldo opcional en Google Sheets y Bandeja de Apple Pay */
(function () {
  const App = window.App;
  let corriendo = false;
  let timer = null;

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
        if (j2.ok && Array.isArray(j2.items)) {
          const ya = new Set(S.movs.map((m) => m.id).concat(S.bandeja.map((b) => b.id), S.bandejaOk || []));
          j2.items.forEach((it) => {
            if (!it.id || ya.has(it.id)) return;
            S.bandeja.push({ id: String(it.id), monto: U.r2(it.monto), comercio: it.comercio || '', tarjeta: it.tarjeta || '', fecha: it.fecha || U.today() });
            nuevos++;
          });
        }
        S.ajustes.ultimaSync = Date.now();
        localStorage.setItem('control-finanzas-v1', JSON.stringify(S));
        if (nuevos && !App.h) App.render();
        if (avisar) App.toast('Sincronizado' + (nuevos ? ' · ' + nuevos + ' pago(s) nuevos de Apple Pay' : ''), 'ok');
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
