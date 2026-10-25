/* Control de Finanzas — hojas inferiores: marco, registrar, editar, cuadre */
(function () {
  const App = window.App;
  const I = App.I;
  App.HOJAS = {};
  App.pila = [];

  App.abrirHoja = (tipo, datos, apilar) => {
    const def = App.HOJAS[tipo];
    if (!def) return;
    const nuevo = Object.assign({}, def.init ? def.init(datos || {}) : (datos || {}), { _hoja: tipo });
    if (apilar && App.h) App.pila.push(App.h); else App.pila = [];
    App.h = nuevo;
    let velo = document.querySelector('.velo');
    let hoja = document.querySelector('.hoja');
    if (!hoja) {
      velo = document.createElement('div'); velo.className = 'velo'; velo.dataset.a = 'cerrar-hoja';
      hoja = document.createElement('div'); hoja.className = 'hoja'; hoja.setAttribute('role', 'dialog');
      hoja.innerHTML = '<div class="asa"></div><div class="cab"><h3></h3><button class="cerrar" data-a="cerrar-hoja" aria-label="Cerrar">' + I.x + '</button></div><div class="cuerpo"></div>';
      document.body.appendChild(velo); document.body.appendChild(hoja);
      App.gestosHoja(hoja);
      requestAnimationFrame(() => { requestAnimationFrame(() => { velo.classList.add('on'); hoja.classList.add('on'); }); });
    }
    App.renderHoja(true);
  };

  App.renderHoja = (arriba) => {
    const hoja = document.querySelector('.hoja');
    if (!hoja || !App.h) return;
    const def = App.HOJAS[App.h._hoja];
    const cuerpo = hoja.querySelector('.cuerpo');
    const y = cuerpo.scrollTop;
    const titulo = typeof def.titulo === 'function' ? def.titulo(App.h) : def.titulo;
    hoja.querySelector('h3').innerHTML = (App.pila.length ? '<button class="cerrar" data-a="volver-hoja" style="display:inline-grid;vertical-align:middle;margin-right:10px">' + I.back + '</button>' : '') + U.esc(titulo || '');
    cuerpo.innerHTML = def.render(App.h);
    cuerpo.scrollTop = arriba ? 0 : y;
    if (def.montar) def.montar(App.h, cuerpo);
  };

  App.cerrarHoja = (todo) => {
    if (!todo && App.pila.length) { App.h = App.pila.pop(); App.renderHoja(true); return; }
    App.pila = [];
    App.h = null;
    const velo = document.querySelector('.velo');
    const hoja = document.querySelector('.hoja');
    if (hoja) { hoja.classList.remove('on'); velo && velo.classList.remove('on'); setTimeout(() => { hoja.remove(); velo && velo.remove(); }, 320); }
  };

  /* deslizar hacia abajo para cerrar */
  App.gestosHoja = (hoja) => {
    let y0 = null, dy = 0;
    hoja.addEventListener('touchstart', (e) => {
      const cuerpo = hoja.querySelector('.cuerpo');
      const enCab = e.target.closest('.asa, .cab');
      if (!enCab && cuerpo.scrollTop > 0) { y0 = null; return; }
      if (e.target.closest('.teclado, input, select, textarea, .chips')) { y0 = null; return; }
      y0 = e.touches[0].clientY; dy = 0;
    }, { passive: true });
    hoja.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0) { hoja.style.transition = 'none'; hoja.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    hoja.addEventListener('touchend', () => {
      if (y0 === null) return;
      hoja.style.transition = ''; hoja.style.transform = '';
      if (dy > 110) App.cerrarHoja(true);
      y0 = null;
    });
  };

  const chip = (on, accion, attrs, contenido, extraClase) => '<button class="chip ' + (on ? 'on ' : '') + (extraClase || '') + '" data-a="' + accion + '" ' + attrs + '>' + contenido + '</button>';
  App.chipHTML = chip;

  /* =============== REGISTRAR (gasto / ingreso / mover) =============== */
  App.HOJAS.registro = {
    titulo: (h) => h.editId ? 'Editar' : h.modo === 'gasto' ? 'Nuevo gasto' : h.modo === 'ingreso' ? 'Nuevo ingreso' : 'Mover dinero',
    init: (d) => {
      const S = App.state;
      const esp = App.espacioPrincipal();
      const h = Object.assign({
        modo: 'gasto', monto: '', espacio: esp ? esp.id : '', sobre: '', cuenta: App.ultimaCuenta(d.modo || 'gasto'), nota: '', fecha: U.today(),
        reparto: true, editId: '', bandejaId: '', recId: '', recFecha: '', origen: 'app',
        moverModo: 'espacios', cuenta2: '', espacio2: esp ? esp.id : '', sobre2: '', deSobre: ''
      }, d);
      if (d.editId) {
        const m = S.movs.find((x) => x.id === d.editId);
        if (m) Object.assign(h, { modo: m.tipo, monto: String(m.monto), espacio: m.espacio, sobre: m.sobre, cuenta: m.cuenta, nota: m.nota, fecha: m.fecha, origen: m.origen });
      }
      if (h.modo === 'mover' && !h.cuenta2) { const o = S.cuentas.find((c) => c.id !== h.cuenta); h.cuenta2 = o ? o.id : ''; }
      return h;
    },
    render: (h) => {
      const S = App.state;
      const c = App.calc(h.fecha);
      let x = '';
      if (!h.editId) {
        x += '<div class="seg">' + [['gasto', 'Gasto'], ['ingreso', 'Ingreso'], ['mover', 'Mover']].map(([k, t]) => '<button class="' + (h.modo === k ? 'on' : '') + '" data-a="reg-modo" data-v="' + k + '">' + t + '</button>').join('') + '</div>';
      }
      x += '<div class="monto"><div class="v num ' + h.modo + '" id="monto-v">' + App.montoTxt(h) + '</div></div>';
      x += '<div class="nota-fila"><input data-m="nota" value="' + U.esc(h.nota) + '" placeholder="' + (h.modo === 'gasto' ? 'Agregar nota (ej. Tacos)' : h.modo === 'ingreso' ? 'Agregar nota (ej. Pago del trabajo)' : 'Agregar nota') + '" maxlength="60" aria-label="Nota">' +
        '<label class="fecha-pill">' + (h.fecha === U.today() ? 'Hoy' : U.fechaCorta(h.fecha)) + '<input type="date" data-m="fecha" data-render="1" value="' + h.fecha + '" max="' + U.addDays(U.today(), 31) + '" aria-label="Fecha"></label></div>';

      if (h.modo === 'gasto' || h.modo === 'ingreso') {
        const rap = h.editId ? [] : App.frecuentes(h.modo);
        if (rap.length) {
          x += '<div class="etq">Rápidos</div><div class="chips">' + rap.map((m, i) => {
            const sob = App.sobre(m.espacio, m.sobre); const cta = App.cuenta(m.cuenta);
            const on = String(m.monto) === h.monto && m.sobre === h.sobre && m.cuenta === h.cuenta;
            return chip(on, 'reg-rapido', 'data-i="' + i + '"', (sob ? U.esc(sob.icono) + ' ' : '') + '<span class="num">' + U.money0(m.monto) + '</span> <small>' + U.esc(m.nota || (sob ? sob.nombre : '')) + (cta ? ' · ' + U.esc(cta.nombre) : '') + '</small>', 'rapido');
          }).join('') + '</div>';
        }
        if (S.espacios.length > 1) {
          x += '<div class="etq">Espacio</div><div class="chips">' + S.espacios.map((e) => chip(h.espacio === e.id, 'reg-esp', 'data-v="' + e.id + '"', U.esc(e.icono) + ' ' + U.esc(e.nombre))).join('') + '</div>';
        }
        if (h.modo === 'gasto') {
          const e = App.espacio(h.espacio);
          x += '<div class="etq">Sobre</div><div class="chips">';
          if (e) e.sobres.filter((s) => s.tipo !== 'porIngreso').forEach((s) => {
            const st = c.sob[s.id];
            x += chip(h.sobre === s.id, 'reg-sobre', 'data-v="' + s.id + '"', U.esc(s.icono) + ' ' + U.esc(s.nombre) + ' <small class="num">' + U.money0(st ? st.saldo : 0) + '</small>');
          });
          x += chip(!h.sobre, 'reg-sobre', 'data-v=""', '🧾 Sin sobre <small class="num">' + U.money0(c.esp[h.espacio] ? c.esp[h.espacio].libre : 0) + '</small>') + '</div>';
        }
        x += '<div class="etq">' + (h.modo === 'gasto' ? 'Pagado con' : 'Entró a') + '</div><div class="chips">' +
          S.cuentas.map((ct) => chip(h.cuenta === ct.id, 'reg-cuenta', 'data-v="' + ct.id + '"', U.esc(ct.icono) + ' ' + U.esc(ct.nombre))).join('') + '</div>';
        if (h.modo === 'ingreso' && !h.editId) {
          x += '<label class="interruptor" style="border:0;padding-bottom:0"><div class="txt"><b>Repartir en mis sobres</b><small>Llena lo que les falta esta semana</small></div><span class="sw"><input type="checkbox" data-m="reparto" ' + (h.reparto ? 'checked' : '') + '><i></i></span></label>';
        }
      } else {
        // mover dinero
        x += '<div class="seg" style="margin-top:6px">' + [['espacios', 'Entre sobres'], ['cuentas', 'Entre cuentas']].map(([k, t]) => '<button class="' + (h.moverModo === k ? 'on' : '') + '" data-a="reg-mover-modo" data-v="' + k + '">' + t + '</button>').join('') + '</div>';
        if (h.moverModo === 'cuentas') {
          x += '<div class="etq">De</div><div class="chips">' + S.cuentas.map((ct) => chip(h.cuenta === ct.id, 'reg-cuenta', 'data-v="' + ct.id + '"', U.esc(ct.icono) + ' ' + U.esc(ct.nombre) + ' <small class="num">' + U.money0(c.cuentas[ct.id]) + '</small>')).join('') + '</div>';
          x += '<div class="etq">A</div><div class="chips">' + S.cuentas.filter((ct) => ct.id !== h.cuenta).map((ct) => chip(h.cuenta2 === ct.id, 'reg-cuenta2', 'data-v="' + ct.id + '"', U.esc(ct.icono) + ' ' + U.esc(ct.nombre))).join('') + '</div>';
          x += '<p class="nota">Por ejemplo: depositar efectivo al banco. No cuenta como gasto ni ingreso.</p>';
        } else {
          const lado = (espKey, sobKey, accionEsp, accionSob, etiqueta) => {
            let y = '<div class="etq">' + etiqueta + '</div>';
            if (S.espacios.length > 1) y += '<div class="chips">' + S.espacios.map((e) => chip(h[espKey] === e.id, accionEsp, 'data-v="' + e.id + '"', U.esc(e.icono) + ' ' + U.esc(e.nombre))).join('') + '</div><div style="height:8px"></div>';
            const e = App.espacio(h[espKey]);
            y += '<div class="chips">' + chip(!h[sobKey], accionSob, 'data-v=""', '✨ Libre <small class="num">' + U.money0(c.esp[h[espKey]] ? c.esp[h[espKey]].libre : 0) + '</small>');
            if (e) e.sobres.forEach((s) => { y += chip(h[sobKey] === s.id, accionSob, 'data-v="' + s.id + '"', U.esc(s.icono) + ' ' + U.esc(s.nombre) + ' <small class="num">' + U.money0(c.sob[s.id] ? c.sob[s.id].saldo : 0) + '</small>'); });
            return y + '</div>';
          };
          x += lado('espacio', 'deSobre', 'reg-esp', 'reg-desobre', 'De');
          x += lado('espacio2', 'sobre2', 'reg-esp2', 'reg-sobre2', 'A');
        }
      }
      if (h.editId) x += '<button class="link-peligro" data-a="mov-borrar" data-id="' + h.editId + '">Eliminar movimiento</button>';
      x += '<div class="pie-hoja">' + App.tecladoHTML();
      x += '<button class="btn" data-a="reg-guardar" id="btn-guardar" ' + (App.montoNum(h) > 0 ? '' : 'disabled') + '>' + I.check + (h.editId ? 'Guardar cambios' : 'Guardar') + '</button></div>';
      return x;
    }
  };

  App.tecladoHTML = () => '<div class="teclado">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'].map((k) => '<button data-a="tecla" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Borrar' : k) + '">' + (k === 'del' ? I.del : k) + '</button>').join('') + '</div>';
  App.montoNum = (h) => U.r2(parseFloat(h.monto || '0') || 0);
  App.montoTxt = (h) => {
    if (!h.monto) return '<span style="opacity:.35">$0</span><span class="cursor"></span>';
    const [ent, dec] = h.monto.split('.');
    const e = new Intl.NumberFormat('es-MX').format(Number(ent || 0));
    return '$' + e + (dec !== undefined ? '.' + dec : '') + '<span class="cursor"></span>';
  };

  App.tecla = (k) => {
    const h = App.h; if (!h) return;
    let m = h.monto || '';
    if (k === 'del') m = m.slice(0, -1);
    else if (k === '.') { if (!m.includes('.')) m = (m || '0') + '.'; }
    else {
      if (m.includes('.') && m.split('.')[1].length >= 2) return;
      if (m.replace('.', '').length >= 9) return;
      m = m === '0' ? k : m + k;
    }
    h.monto = m;
    const v = document.getElementById('monto-v');
    if (v) v.innerHTML = App.montoTxt(h);
    const b = document.getElementById('btn-guardar');
    if (b) b.disabled = !(App.montoNum(h) > 0);
  };

  App.guardarRegistro = () => {
    const h = App.h; const S = App.state;
    const monto = App.montoNum(h);
    if (!(monto > 0)) return App.toast('Escribe un monto', 'error');
    if (h.modo === 'mover') {
      if (h.moverModo === 'cuentas') {
        if (!h.cuenta || !h.cuenta2 || h.cuenta === h.cuenta2) return App.toast('Elige dos cuentas distintas', 'error');
        App.addMov({ tipo: 'traspaso', monto, cuenta: h.cuenta, cuenta2: h.cuenta2, nota: h.nota, fecha: h.fecha });
        App.toast(App.cuenta(h.cuenta).nombre + ' → ' + App.cuenta(h.cuenta2).nombre + ': ' + U.money(monto), 'ok');
      } else {
        if (h.espacio === h.espacio2 && h.deSobre === h.sobre2) return App.toast('El origen y el destino son iguales', 'error');
        App.addMov({ tipo: 'mover', monto, espacio: h.espacio, sobre: h.deSobre, espacio2: h.espacio2, sobre2: h.sobre2, nota: h.nota, fecha: h.fecha });
        App.toast('Dinero movido: ' + U.money(monto), 'ok');
      }
    } else {
      if (!h.cuenta) return App.toast('Elige una cuenta', 'error');
      if (!h.espacio) return App.toast('Elige un espacio', 'error');
      const datos = { tipo: h.modo, monto, espacio: h.espacio, sobre: h.modo === 'gasto' ? h.sobre : '', cuenta: h.cuenta, nota: (h.nota || '').trim(), fecha: h.fecha };
      if (h.editId) {
        App.updateMov(h.editId, datos);
        App.toast('Cambios guardados', 'ok');
      } else {
        if (h.bandejaId) { datos.id = h.bandejaId; datos.origen = 'applepay'; }
        const r = App.addMov(datos, { reparto: h.modo === 'ingreso' ? h.reparto : false });
        if (h.bandejaId) {
          S.bandeja = S.bandeja.filter((b) => b.id !== h.bandejaId);
          S.bandejaOk = (S.bandejaOk || []).concat([h.bandejaId]);
        }
        if (h.recId) { const rec = S.recurrentes.find((x) => x.id === h.recId); if (rec) rec.pagado = h.recFecha; }
        App.save();
        if (h.modo === 'gasto') {
          const c = App.calc(h.fecha);
          const s = App.sobre(h.espacio, h.sobre);
          if (s) {
            const st = c.sob[s.id];
            if ((s.tipo === 'gasto' || s.tipo === 'limite') && st.cuota > 0 && st.gastadoSemana > st.cuota) App.toast(s.nombre + ': te pasaste ' + U.money(st.gastadoSemana - st.cuota) + ' esta semana', 'error');
            else App.toast('Guardado · ' + s.nombre + ': quedan ' + U.money(st.saldo), 'ok');
          } else App.toast('Gasto guardado · Libre: ' + U.money(c.esp[h.espacio].libre), 'ok');
        } else {
          const rep = r.reparto;
          let t = 'Ingreso guardado';
          if (rep && rep.partes.length) t += '\nRepartido: ' + rep.partes.map((p) => p.sobre + ' ' + U.money0(p.monto)).join(', ');
          App.toast(t, rep && rep.partes.length ? 'largo' : 'ok');
        }
      }
    }
    U.haptic();
    App.cerrarHoja(true);
    App.render();
  };

  /* =============== EDITAR otros movimientos =============== */
  App.HOJAS.mov = {
    titulo: 'Movimiento',
    init: (d) => { const m = App.state.movs.find((x) => x.id === d.id) || {}; return { id: d.id, monto: String(Math.abs(m.monto || 0)), signo: m.monto < 0 ? -1 : 1, nota: m.nota || '', fecha: m.fecha || U.today() }; },
    render: (h) => {
      const m = App.state.movs.find((x) => x.id === h.id);
      if (!m) return '<div class="vacio-txt">Este movimiento ya no existe.</div>';
      const inf = App.movInfo(m);
      let x = '<div class="fila" style="border:0"><div class="ico">' + U.esc(inf.icono) + '</div><div class="txt"><b>' + U.esc(inf.titulo) + '</b><small>' + U.esc(inf.sub) + '</small></div></div>';
      x += '<label class="campo"><span>Monto</span><input inputmode="decimal" data-m="monto" value="' + U.esc(h.monto) + '"></label>';
      if (m.tipo === 'ajuste') x += '<div class="seg" style="margin-top:10px"><button class="' + (h.signo > 0 ? 'on' : '') + '" data-a="mov-signo" data-v="1">Suma</button><button class="' + (h.signo < 0 ? 'on' : '') + '" data-a="mov-signo" data-v="-1">Resta</button></div>';
      x += '<div class="dos"><label class="campo"><span>Nota</span><input data-m="nota" value="' + U.esc(h.nota) + '"></label><label class="campo"><span>Fecha</span><input type="date" data-m="fecha" value="' + h.fecha + '"></label></div>';
      if (m.origen === 'auto') x += '<p class="nota">Este movimiento lo hizo la app al repartir. Si lo borras, el dinero regresa a "Libre".</p>';
      x += '<button class="btn" data-a="mov-guardar">' + I.check + 'Guardar cambios</button><button class="btn peligro" data-a="mov-borrar" data-id="' + m.id + '">' + I.trash + 'Eliminar</button>';
      return x;
    }
  };

  /* =============== CUADRE =============== */
  App.HOJAS.cuadre = {
    titulo: 'Cuadre',
    init: () => ({ real: {} }),
    render: (h) => {
      const c = App.calc();
      let x = '<p class="nota" style="margin-top:0">Escribe cuánto tienes de verdad en cada cuenta. Si algo no cuadra, la app hace el ajuste por ti.</p>';
      let difTotal = 0;
      App.state.cuentas.forEach((ct) => {
        const esperado = c.cuentas[ct.id];
        const v = h.real[ct.id];
        const tiene = v !== undefined && v !== '';
        const dif = tiene ? U.r2((parseFloat(v) || 0) - esperado) : 0;
        difTotal += dif;
        x += '<label class="campo"><span>' + U.esc(ct.icono) + ' ' + U.esc(ct.nombre) + ' · la app dice <b class="num">' + U.money(esperado) + '</b></span>' +
          '<input inputmode="decimal" data-cuadre="' + ct.id + '" value="' + U.esc(v || '') + '" placeholder="' + U.money(esperado) + '">' +
          '<small id="dif-' + ct.id + '" class="num ' + (dif > 0 ? 'pos' : dif < 0 ? 'neg' : '') + '">' + (tiene ? (Math.abs(dif) < 0.005 ? '✓ Cuadra' : (dif > 0 ? 'Tienes ' + U.money(dif) + ' de más' : 'Te faltan ' + U.money(-dif))) : 'Déjalo vacío si ya cuadra') + '</small></label>';
      });
      x += '<button class="btn" data-a="cuadre-guardar">' + I.check + 'Guardar cuadre</button>';
      x += '<p class="nota">Los ajustes salen o entran a lo "Libre" de ' + U.esc((App.espacioPrincipal() || {}).nombre || 'tu espacio principal') + '. No tocan tus sobres.</p>';
      return x;
    }
  };

  App.guardarCuadre = () => {
    const h = App.h; const c = App.calc(); const esp = App.espacioPrincipal();
    let n = 0, total = 0;
    App.state.cuentas.forEach((ct) => {
      const v = h.real[ct.id];
      if (v === undefined || v === '') return;
      const dif = U.r2((parseFloat(v) || 0) - c.cuentas[ct.id]);
      if (Math.abs(dif) < 0.005) return;
      App.state.movs.push(App.nuevoMov({ tipo: 'ajuste', monto: dif, cuenta: ct.id, espacio: esp ? esp.id : '', nota: 'Cuadre' }));
      n++; total += dif;
    });
    App.state.ajustes.ultimoCuadre = U.today();
    App.save();
    U.haptic();
    App.toast(n ? 'Ajusté ' + n + ' cuenta(s): ' + U.signed(U.r2(total)) : 'Todo cuadra ✨', 'ok');
    App.cerrarHoja(true);
    App.render();
  };
})();
