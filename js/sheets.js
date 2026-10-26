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
  const etqCuenta = (ct, monto) => U.esc(ct.icono) + ' ' + U.esc(ct.nombre) + (App.esCredito(ct) ? ' <small>crédito</small>' : '') + (monto !== undefined ? ' <small class="num">' + U.money0(monto) + '</small>' : '');
  const segPartes = (accion, actual) => '<div class="seg" style="margin-top:8px"><button class="' + (actual !== 'm' ? 'on' : '') + '" data-a="' + accion + '" data-v="b">💵 Billetes</button><button class="' + (actual === 'm' ? 'on' : '') + '" data-a="' + accion + '" data-v="m">🪙 Monedas</button></div>';

  /* =============== REGISTRAR (gasto / ingreso / mover) =============== */
  App.HOJAS.registro = {
    titulo: (h) => h.editId ? 'Editar' : h.modo === 'gasto' ? 'Nuevo gasto' : h.modo === 'ingreso' ? 'Nuevo ingreso' : 'Mover dinero',
    init: (d) => {
      const S = App.state;
      const esp = App.espacioPrincipal();
      const h = Object.assign({
        modo: 'gasto', monto: '', espacio: esp ? esp.id : '', sobre: '', cuenta: App.ultimaCuenta(d.modo || 'gasto'), nota: '', fecha: U.today(),
        reparto: true, editId: '', bandejaId: '', recId: '', recFecha: '', sobrePago: '', origen: 'app',
        moverModo: 'espacios', cuenta2: '', espacio2: esp ? esp.id : '', sobre2: '', deSobre: '',
        sub: 'b', sub2: 'b', diferido: false, meses: 1
      }, d);
      if (d.editId) {
        const m = S.movs.find((x) => x.id === d.editId);
        if (m) Object.assign(h, { modo: m.tipo, monto: String(m.monto), espacio: m.espacio, sobre: m.sobre, cuenta: m.cuenta, nota: m.nota, fecha: m.fecha, origen: m.origen, sub: m.sub || 'b', diferido: !!m.diferido, meses: m.meses || 1 });
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

      if (h.modo === 'gasto') { App._cReg = c; x += '<div class="info-reg" id="info-reg">' + App.infoReg(h, c) + '</div>'; }
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
          if (e) e.sobres.filter((s) => s.tipo !== 'porIngreso' && s.tipo !== 'tarjeta').forEach((s) => {
            const st = c.sob[s.id];
            x += chip(h.sobre === s.id, 'reg-sobre', 'data-v="' + s.id + '"', U.esc(s.icono) + ' ' + U.esc(s.nombre) + ' <small class="num">' + U.money0(st ? st.saldo : 0) + '</small>');
          });
          x += chip(!h.sobre, 'reg-sobre', 'data-v=""', '🧾 Sin sobre <small class="num">' + U.money0(c.esp[h.espacio] ? c.esp[h.espacio].libre : 0) + '</small>') + '</div>';
        }
        x += '<div class="etq">' + (h.modo === 'gasto' ? 'Pagado con' : 'Entró a') + '</div><div class="chips">' +
          S.cuentas.map((ct) => chip(h.cuenta === ct.id, 'reg-cuenta', 'data-v="' + ct.id + '"', etqCuenta(ct))).join('') + '</div>';
        const cta = App.cuenta(h.cuenta);
        if (cta && cta.partes) x += segPartes('reg-sub', h.sub);
        if (h.modo === 'gasto' && App.esCredito(cta)) {
          x += '<label class="interruptor" style="border:0;padding-bottom:0"><div class="txt"><b>Pagar poco a poco</b><small>' + (h.diferido ? 'Tu sobre no baja ahora: se aparta de tus ingresos ' + U.FREC_CADA[App.state.ajustes.frecIngreso] : 'Si no, sale de tu sobre en este momento') + '</small></div><span class="sw"><input type="checkbox" data-m="diferido" data-render="1" ' + (h.diferido ? 'checked' : '') + '><i></i></span></label>';
          if (h.diferido) {
            x += '<div class="seg" style="margin-top:8px">' + [[1, 'Próximo pago'], [3, '3 meses'], [6, '6 meses'], [12, '12 meses']].map(([n, t]) => '<button class="' + (Number(h.meses) === n ? 'on' : '') + '" data-a="reg-meses" data-v="' + n + '">' + t + '</button>').join('') + '</div>';
            const plan = App.cuotasTarjeta(cta.id, h.fecha, App.montoNum(h) || 0, h.meses);
            const ult = plan[plan.length - 1];
            x += '<p class="nota" id="nota-dif">' + (App.montoNum(h) > 0 ? (plan.length > 1 ? plan.length + ' pagos de ' + U.money(plan[0].a) + ', del ' + U.fechaCorta(plan[0].f) + ' al ' + U.fechaCorta(ult.f) + '.' : 'Se paga el ' + U.fechaLarga(plan[0].f) + '.') + ' Se aparta poco a poco hasta esa fecha.' : 'Escribe el monto.') + '</p>';
          }
        }
        if (h.modo === 'ingreso' && !h.editId) {
          x += '<label class="interruptor" style="border:0;padding-bottom:0"><div class="txt"><b>Repartir en mis sobres</b><small>Llena lo que les falta esta semana</small></div><span class="sw"><input type="checkbox" data-m="reparto" ' + (h.reparto ? 'checked' : '') + '><i></i></span></label>';
        }
      } else {
        // mover dinero
        x += '<div class="seg" style="margin-top:6px">' + [['espacios', 'Entre sobres'], ['cuentas', 'Entre cuentas']].map(([k, t]) => '<button class="' + (h.moverModo === k ? 'on' : '') + '" data-a="reg-mover-modo" data-v="' + k + '">' + t + '</button>').join('') + '</div>';
        if (h.moverModo === 'cuentas') {
          const c1 = App.cuenta(h.cuenta), c2c = App.cuenta(h.cuenta2);
          x += '<div class="etq">De</div><div class="chips">' + S.cuentas.map((ct) => chip(h.cuenta === ct.id, 'reg-cuenta', 'data-v="' + ct.id + '"', etqCuenta(ct, c.cuentas[ct.id]))).join('') + '</div>';
          if (c1 && c1.partes) x += segPartes('reg-sub', h.sub);
          x += '<div class="etq">A</div><div class="chips">' + S.cuentas.filter((ct) => ct.id !== h.cuenta || ct.partes).map((ct) => chip(h.cuenta2 === ct.id, 'reg-cuenta2', 'data-v="' + ct.id + '"', etqCuenta(ct))).join('') + '</div>';
          if (c2c && c2c.partes) x += segPartes('reg-sub2', h.sub2);
          x += '<p class="nota">' + (App.esCredito(c2c) ? 'Pagar la tarjeta no cambia tu Disponible: ese dinero ya estaba contado.' : h.cuenta === h.cuenta2 ? 'Cambiar billetes por monedas (o al revés). Tu total no cambia.' : 'Por ejemplo: depositar efectivo al banco. No cuenta como gasto ni ingreso.') + '</p>';
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

  // Línea en vivo al registrar un gasto: cuánto te queda en el sobre y en la tarjeta
  App.infoReg = (h, c) => {
    c = c || App._cReg || App.calc(h.fecha);
    const monto = h.editId ? 0 : App.montoNum(h);
    const out = [];
    const s = App.sobre(h.espacio, h.sobre); const st = s ? c.sob[s.id] : null;
    if (s && st && (s.tipo === 'gasto' || s.tipo === 'limite') && st.M > 0 && !s.fechaPago && !h.diferido) {
      const rest = U.r2(st.M - st.gastadoCiclo); const desp = U.r2(rest - monto);
      const cuando = U.FREC_ESTE[U.frec(s.frecPago)];
      let t;
      if (rest < -0.004) t = '<b class="neg">Ya te pasaste ' + U.money(-rest) + '</b> de ' + U.money(st.M) + ' ' + cuando;
      else if (monto > 0 && desp < -0.004) t = '<b class="neg">Con esto te pasas ' + U.money(-desp) + '</b> de ' + U.money(st.M) + ' ' + cuando;
      else if (monto > 0) t = 'Te quedarán <b class="num">' + U.money(desp) + '</b> de ' + U.money(st.M) + ' ' + cuando;
      else t = 'Te quedan <b class="num">' + U.money(rest) + '</b> de ' + U.money(st.M) + ' ' + cuando;
      const pct = st.M > 0 ? Math.max(0, Math.min(1, (monto > 0 ? desp : rest) / st.M)) : 0;
      out.push('<div class="ir-fila"><span class="ir-ico">' + U.esc(s.icono) + '</span><div class="ir-txt">' + t + '<i class="ir-barra"><i style="transform:scaleX(' + pct.toFixed(3) + ')" class="' + (pct <= 0.2 ? 'bajo' : '') + '"></i></i></div></div>');
    }
    const ct = App.cuenta(h.cuenta);
    if (App.esCredito(ct)) {
      const x = App.usoTarjeta(ct, c, monto);
      let t;
      if (!(x.L > 0)) t = 'Pon un límite de uso para saber cuánto te queda';
      else {
        const de = x.propio ? 'de tu límite de uso (' + U.money0(x.L) + ')' : 'de crédito';
        if (x.disp < -0.004) t = '<b class="neg">' + (monto > 0 ? 'Con esto te pasas ' : 'Te pasaste ') + U.money(-x.disp) + '</b> ' + (x.propio ? 'de tu límite de uso (' + U.money0(x.L) + ')' : 'del límite de crédito');
        else t = (monto > 0 ? 'Te quedarán ' : 'Te quedan ') + '<b class="num">' + U.money(x.disp) + '</b> ' + de;
      }
      const pct = x.L > 0 ? Math.max(0, Math.min(1, x.disp / x.L)) : 0;
      out.push('<div class="ir-fila"><span class="ir-ico">💳</span><div class="ir-txt">' + t + (x.L > 0 ? '<i class="ir-barra"><i style="transform:scaleX(' + pct.toFixed(3) + ')" class="' + (pct <= 0.2 ? 'bajo' : '') + '"></i></i>' : '') +
        '<button class="link" data-a="reg-limite">' + (Number(ct.limiteUso) > 0 ? 'Cambiar límite de uso' : 'Poner límite de uso') + '</button></div></div>');
    }
    return out.join('');
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
    if (h.diferido && document.getElementById('nota-dif')) App.renderHoja();
    else { const ir = document.getElementById('info-reg'); if (ir) ir.innerHTML = App.infoReg(h); }
  };

  App.guardarRegistro = () => {
    const h = App.h; const S = App.state;
    const monto = App.montoNum(h);
    if (!(monto > 0)) return App.toast('Escribe un monto', 'error');
    let sonido = '';
    if (h.modo === 'mover') {
      if (h.moverModo === 'cuentas') {
        const c1 = App.cuenta(h.cuenta), c2c = App.cuenta(h.cuenta2);
        if (!c1 || !c2c || (h.cuenta === h.cuenta2 && (!c1.partes || h.sub === h.sub2))) return App.toast('Elige dos cuentas distintas', 'error');
        App.addMov({ tipo: 'traspaso', monto, cuenta: h.cuenta, cuenta2: h.cuenta2, sub: c1.partes ? h.sub : '', sub2: c2c.partes ? h.sub2 : '', nota: h.nota, fecha: h.fecha });
        App.toast(App.nombreCuenta(h.cuenta, h.sub) + ' → ' + App.nombreCuenta(h.cuenta2, h.sub2) + ': ' + U.money(monto), 'ok');
      } else {
        if (h.espacio === h.espacio2 && h.deSobre === h.sobre2) return App.toast('El origen y el destino son iguales', 'error');
        App.addMov({ tipo: 'mover', monto, espacio: h.espacio, sobre: h.deSobre, espacio2: h.espacio2, sobre2: h.sobre2, nota: h.nota, fecha: h.fecha });
        App.toast('Dinero movido: ' + U.money(monto), 'ok');
      }
    } else {
      if (!h.cuenta) return App.toast('Elige una cuenta', 'error');
      if (!h.espacio) return App.toast('Elige un espacio', 'error');
      const cta = App.cuenta(h.cuenta);
      const diferido = h.modo === 'gasto' && App.esCredito(cta) && !!h.diferido;
      const datos = { tipo: h.modo, monto, espacio: h.espacio, sobre: h.modo === 'gasto' ? h.sobre : '', cuenta: h.cuenta, sub: cta && cta.partes ? (h.sub || 'b') : '', nota: (h.nota || '').trim(), fecha: h.fecha, diferido, meses: diferido ? Number(h.meses) || 1 : 0 };
      if (diferido) App.sobreTarjeta(h.espacio, h.cuenta, true);
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
        if (h.sobrePago) { const sp = App.sobre(h.espacio, h.sobre); if (sp) sp.pagado = h.sobrePago; }
        App.save();
        if (h.modo === 'gasto') {
          const c = App.calc(h.fecha);
          const s = App.sobre(h.espacio, h.sobre);
          let base;
          if (diferido) {
            const t = App.sobreTarjeta(h.espacio, h.cuenta, false);
            const st = t ? c.sob[t.id] : null;
            base = 'A pagar poco a poco' + (st ? ' · ' + App.textoAporte(t, st) + (st.venc ? ' hasta el ' + U.fechaCorta(st.venc) : '') : '');
          } else if (s) base = 'Guardado · ' + s.nombre + ': quedan ' + U.money(c.sob[s.id].saldo);
          else base = 'Gasto guardado · Libre: ' + U.money(c.esp[h.espacio].libre);
          // alertas: te pasaste o te queda poco (en el sobre y en la tarjeta)
          const als = [s && !diferido ? App.alertaSobre(s, c.sob[s.id]) : null, App.alertaTarjeta(cta, c)].filter(Boolean);
          if (als.length) {
            const pasado = als.some((al) => al.nivel === 'pasado');
            App.toast(als.map((al) => al.texto).join('\n') + (diferido ? '\n' + base : ''), (pasado ? 'error' : 'aviso') + ' largo');
            sonido = 'alerta';
          } else { App.toast(base, diferido ? 'largo' : 'ok'); sonido = 'gasto'; }
        } else {
          const rep = r.reparto;
          let t = 'Ingreso guardado';
          if (rep && rep.partes.length) t += '\nRepartido: ' + rep.partes.map((p) => p.sobre + ' ' + U.money0(p.monto)).join(', ');
          App.toast(t, rep && rep.partes.length ? 'largo' : 'ok');
          sonido = 'ingreso';
        }
      }
    }
    if (sonido) U.sonido(sonido);
    U.haptic(sonido === 'alerta' ? 'alerta' : '');
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
  // claves: "id" (cuenta normal o tarjeta) o "id:b" / "id:m" (billetes / monedas)
  const esperadoCuadre = (clave, c) => {
    const [id, sub] = clave.split(':');
    if (sub) return c.partes[id] ? c.partes[id][sub] : 0;
    const ct = App.cuenta(id);
    return App.esCredito(ct) ? -c.cuentas[id] : c.cuentas[id];
  };
  // diferencia en el saldo de la cuenta (positivo = tienes más / debes menos)
  App.difCuadre = (clave, valor, c) => {
    const [id, sub] = clave.split(':');
    const real = parseFloat(valor) || 0;
    const esp = esperadoCuadre(clave, c);
    return U.r2(!sub && App.esCredito(App.cuenta(id)) ? esp - real : real - esp);
  };
  App.textoCuadre = (clave, dif) => {
    const credito = !clave.includes(':') && App.esCredito(App.cuenta(clave));
    if (Math.abs(dif) < 0.005) return '✓ Cuadra';
    if (credito) return dif > 0 ? 'Debes ' + U.money(dif) + ' menos' : 'Debes ' + U.money(-dif) + ' más';
    return dif > 0 ? 'Tienes ' + U.money(dif) + ' de más' : 'Te faltan ' + U.money(-dif);
  };
  App.HOJAS.cuadre = {
    titulo: 'Cuadre',
    init: () => ({ real: {} }),
    render: (h) => {
      const c = App.calc();
      let x = '<p class="nota" style="margin-top:0">Escribe cuánto tienes de verdad en cada cuenta. Si algo no cuadra, la app hace el ajuste por ti.</p>';
      const campo = (clave, titulo) => {
        const esperado = esperadoCuadre(clave, c);
        const v = h.real[clave];
        const tiene = v !== undefined && v !== '';
        const dif = tiene ? App.difCuadre(clave, v, c) : 0;
        return '<label class="campo"><span>' + titulo + ' · la app dice <b class="num">' + U.money(esperado) + '</b></span>' +
          '<input inputmode="decimal" data-cuadre="' + clave + '" value="' + U.esc(v || '') + '" placeholder="' + U.money(esperado) + '">' +
          '<small id="dif-' + clave.replace(':', '-') + '" class="num ' + (dif > 0 ? 'pos' : dif < 0 ? 'neg' : '') + '">' + (tiene ? App.textoCuadre(clave, dif) : 'Déjalo vacío si ya cuadra') + '</small></label>';
      };
      App.state.cuentas.forEach((ct) => {
        if (ct.partes) { x += campo(ct.id + ':b', U.esc(ct.icono) + ' ' + U.esc(ct.nombre) + ' · billetes'); x += campo(ct.id + ':m', '🪙 ' + U.esc(ct.nombre) + ' · monedas'); }
        else if (App.esCredito(ct)) x += campo(ct.id, U.esc(ct.icono) + ' ' + U.esc(ct.nombre) + ' · cuánto debes');
        else x += campo(ct.id, U.esc(ct.icono) + ' ' + U.esc(ct.nombre));
      });
      x += '<button class="btn" data-a="cuadre-guardar">' + I.check + 'Guardar cuadre</button>';
      x += '<p class="nota">Los ajustes salen o entran a lo "Libre" de ' + U.esc((App.espacioPrincipal() || {}).nombre || 'tu espacio principal') + '. No tocan tus sobres.</p>';
      return x;
    }
  };

  App.guardarCuadre = () => {
    const h = App.h; const c = App.calc(); const esp = App.espacioPrincipal();
    let n = 0, total = 0;
    Object.keys(h.real).forEach((clave) => {
      const v = h.real[clave];
      if (v === undefined || v === '') return;
      const [id, sub] = clave.split(':');
      if (!App.cuenta(id)) return;
      const dif = App.difCuadre(clave, v, c);
      if (Math.abs(dif) < 0.005) return;
      App.state.movs.push(App.nuevoMov({ tipo: 'ajuste', monto: dif, cuenta: id, sub: sub || '', espacio: esp ? esp.id : '', nota: 'Cuadre' }));
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
