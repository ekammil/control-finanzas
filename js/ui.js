/* Control de Finanzas — íconos, gráficas y piezas de interfaz */
(function () {
  const App = window.App;
  const svg = (p, extra) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" ' + (extra || '') + '>' + p + '</svg>';
  App.I = {
    home: svg('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>'),
    list: svg('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'),
    target: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.4"'),
    x: svg('<path d="M18 6 6 18M6 6l12 12"/>', 'stroke-width="2.4"'),
    back: svg('<path d="M15 18l-6-6 6-6"/>', 'stroke-width="2.4"'),
    chev: svg('<path d="M9 18l6-6-6-6"/>', 'class="chev" stroke-width="2.2"'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    swap: svg('<path d="M7 4 3 8l4 4"/><path d="M3 8h14"/><path d="m17 20 4-4-4-4"/><path d="M21 16H7"/>'),
    scale: svg('<path d="M12 3v18M5 21h14"/><path d="M5 7h14"/><path d="m5 7-3 7a3.5 3.5 0 0 0 6 0z"/><path d="m19 7-3 7a3.5 3.5 0 0 0 6 0z"/>'),
    lock: svg('<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    cloud: svg('<path d="M17.5 19H7a5 5 0 1 1 1.1-9.9A6 6 0 0 1 19.5 11 4 4 0 0 1 17.5 19z"/>'),
    download: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
    upload: svg('<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>'),
    bell: svg('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>'),
    cal: svg('<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>'),
    trash: svg('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    phone: svg('<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M11 18.5h2"/>'),
    palette: svg('<circle cx="13.5" cy="6.5" r="1.2"/><circle cx="17.5" cy="10.5" r="1.2"/><circle cx="8.5" cy="7.5" r="1.2"/><circle cx="6.5" cy="12.5" r="1.2"/><path d="M12 2a10 10 0 0 0 0 20c1 0 1.7-.8 1.7-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.7 1.7-1.7h2a5.5 5.5 0 0 0 5.4-5.4C22 6 17.5 2 12 2z"/>'),
    user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
    layers: svg('<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>'),
    wallet: svg('<path d="M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-4a2 2 0 0 0 0 4h4v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/>'),
    vibe: svg('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M3 8v8M21 8v8"/>'),
    moon: svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    apple: svg('<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/><path d="M6 15h4"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    sync: svg('<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/>'),
    check: svg('<path d="M20 6 9 17l-5-5"/>', 'stroke-width="2.6"'),
    del: svg('<path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><path d="m18 9-6 6M12 9l6 6"/>'),
    arrowUp: svg('<path d="M12 19V5M5 12l7-7 7 7"/>', 'stroke-width="2.4"'),
    arrowDown: svg('<path d="M12 5v14M19 12l-7 7-7-7"/>', 'stroke-width="2.4"'),
    up: svg('<path d="m18 15-6-6-6 6"/>', 'stroke-width="2.4"'),
    down: svg('<path d="m6 9 6 6 6-6"/>', 'stroke-width="2.4"'),
    inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>')
  };

  /* monto grande con centavos tenues */
  App.montoGrande = (n) => {
    const s = U.money(n);
    const i = s.lastIndexOf('.');
    return '<span class="num">' + U.esc(s.slice(0, i)) + '<span class="cent">' + U.esc(s.slice(i)) + '</span></span>';
  };

  /* anillo de progreso alrededor de un ícono */
  App.anillo = (p, estado) => {
    const r = 21, c = 2 * Math.PI * r;
    const v = U.clamp(p || 0, 0, 1);
    const color = estado === 'pasado' ? 'var(--red)' : estado === 'cuidado' ? 'var(--amber)' : 'var(--green)';
    return '<svg class="anillo" viewBox="0 0 46 46"><circle cx="23" cy="23" r="' + r + '" stroke="rgba(255,255,255,.08)" stroke-width="2.5" fill="none"/>' +
      (v > 0 ? '<circle cx="23" cy="23" r="' + r + '" stroke="' + color + '" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="' + (c * v).toFixed(1) + ' ' + c.toFixed(1) + '"/>' : '') + '</svg>';
  };

  /* Pestañas de frecuencia: Diario · Semanal · Quincenal / Mensual · Semestral · Anual */
  App.tabsFrec = (accion, actual, attrs, opciones) => '<div class="tabs-frec' + ((opciones || U.FRECS).length === 4 ? ' cuatro' : '') + '">' +
    (opciones || U.FRECS).map((f) => '<button type="button" class="' + (f === actual ? 'on' : '') + '" data-a="' + accion + '" data-v="' + f + '" ' + (attrs || '') + '>' + U.FREC_TXT[f] + '</button>').join('') + '</div>';

  App.barraProg = (p, clase) => '<div class="barra-prog"><i class="' + (clase || '') + '" style="width:' + (U.clamp(p || 0, 0, 1) * 100).toFixed(1) + '%"></i></div>';

  /* Gráfica de línea suave del disponible */
  App.graficaSVG = (serie, ancho) => {
    const W = Math.round(ancho || 400), H = 150, PX = 22, PT = 16, PB = 20;
    const pts = serie.puntos;
    if (!pts.length) return '';
    let min = Infinity, max = -Infinity;
    pts.forEach((p) => { min = Math.min(min, p.v); max = Math.max(max, p.v); });
    // rango mínimo para que cambios pequeños no parezcan caídas enormes
    let absMax = 0; pts.forEach((p) => { absMax = Math.max(absMax, Math.abs(p.v)); });
    const span = Math.max(max - min, absMax * 0.3, 150);
    const mid = (max + min) / 2; min = mid - span / 2; max = mid + span / 2;
    const pad = span * 0.12; min -= pad; max += pad;
    const X = (x) => PX + (x / (serie.max || 1)) * (W - 2 * PX);
    const Y = (v) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
    const P = pts.map((p) => [X(p.x), Y(p.v)]);
    // curva suave (monótona) entre puntos
    let d = 'M' + P[0][0].toFixed(1) + ',' + P[0][1].toFixed(1);
    for (let i = 1; i < P.length; i++) {
      const [x0, y0] = P[i - 1], [x1, y1] = P[i];
      if (serie.max === 1) { d += 'H' + x1.toFixed(1) + 'V' + y1.toFixed(1); continue; } // "hoy": escalones
      const cx = (x0 + x1) / 2;
      d += 'C' + cx.toFixed(1) + ',' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ',' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1);
    }
    const sube = pts[pts.length - 1].v >= pts[0].v;
    const col = sube ? '#3ddc97' : '#ff6b6b';
    const last = P[P.length - 1];
    const area = d + 'L' + last[0].toFixed(1) + ',' + H + 'L' + P[0][0].toFixed(1) + ',' + H + 'Z';
    const y0 = Y(pts[0].v).toFixed(1);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '">' +
      '<defs><linearGradient id="gArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + col + '" stop-opacity=".28"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></linearGradient></defs>' +
      '<line x1="' + PX + '" x2="' + (W - PX) + '" y1="' + y0 + '" y2="' + y0 + '" stroke="rgba(255,255,255,.18)" stroke-dasharray="2 5" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + area + '" fill="url(#gArea)"/>' +
      '<path class="linea" d="' + d + '" stroke="' + col + '" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="9" fill="' + col + '" opacity=".18"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4" fill="' + col + '"/>' +
      '</svg>';
  };

  /* Barras de ingresos vs gastos de la semana */
  App.barrasHTML = () => {
    const b = App.barrasSemana();
    const hoy = U.today();
    let max = 1;
    b.forEach((d) => { max = Math.max(max, d.ing, d.gas); });
    const c = App.calc();
    let presupuestoDia = 0;
    App.state.espacios.forEach((e) => { if (e.enDisponible) presupuestoDia += c.esp[e.id].presupuesto / 7; });
    const h = (v) => Math.max(3, (v / max) * 64).toFixed(1) + 'px';
    return '<div class="barras">' + b.map((d, i) => {
      const futuro = d.fecha > hoy;
      const alto = presupuestoDia > 0 && d.gas > presupuestoDia * 1.5;
      return '<div class="barra' + (d.fecha === hoy ? ' hoy' : '') + '" style="' + (futuro ? 'opacity:.35' : '') + '">' +
        '<div class="par"><i class="in" style="height:' + h(d.ing) + '"></i><i class="out' + (alto ? ' alto' : '') + '" style="height:' + h(d.gas) + '"></i></div>' +
        '<span>' + U.DIAS_C[i] + '</span></div>';
    }).join('') + '</div>';
  };

  App.toast = (txt, tipo) => {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.className = 'toast ' + (tipo || '');
    t.innerHTML = U.esc(txt).replace(/\n/g, '<br>');
    requestAnimationFrame(() => t.classList.add('on'));
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('on'), tipo === 'largo' ? 5200 : 2800);
  };

  /* Descripción corta de un movimiento */
  App.movInfo = (m) => {
    const esp = App.espacio(m.espacio), esp2 = App.espacio(m.espacio2);
    const sob = esp ? esp.sobres.find((s) => s.id === m.sobre) : null;
    const sob2 = esp2 ? esp2.sobres.find((s) => s.id === m.sobre2) : null;
    const cta = App.cuenta(m.cuenta), cta2 = App.cuenta(m.cuenta2);
    const nCta = cta ? App.nombreCuenta(m.cuenta, m.sub) : '—';
    let icono = '•', titulo = '', sub = '', signo = 0, clase = '';
    if (m.tipo === 'gasto') {
      icono = sob ? sob.icono : '🧾';
      titulo = m.nota || (sob ? sob.nombre : 'Gasto');
      sub = (m.nota ? (sob ? sob.nombre : 'Sin sobre') + ' · ' : '') + nCta + (m.diferido ? ' · a pagar poco a poco' : ''); signo = -1;
    } else if (m.tipo === 'ingreso') {
      icono = '💰'; titulo = m.nota || 'Ingreso'; sub = (App.state.espacios.length > 1 && esp ? esp.nombre + ' · ' : '') + nCta; signo = 1; clase = 'pos';
    } else if (m.tipo === 'inicial') {
      icono = cta ? cta.icono : '🏁'; titulo = m.monto < 0 ? (m.nota || 'Deuda inicial') : 'Saldo inicial'; sub = nCta; signo = m.monto < 0 ? -1 : 1;
    } else if (m.tipo === 'ajuste') {
      icono = '⚖️'; titulo = m.nota || 'Ajuste'; sub = nCta; signo = m.monto >= 0 ? 1 : -1; clase = m.monto >= 0 ? 'pos' : 'neg';
    } else if (m.tipo === 'traspaso') {
      const n2 = cta2 ? App.nombreCuenta(m.cuenta2, m.sub2) : '—';
      if (App.esCredito(cta2)) { icono = '💳'; titulo = 'Pago de tarjeta ' + cta2.nombre; sub = 'Desde ' + nCta + (m.nota && !/^Pago de tarjeta/.test(m.nota) ? ' · ' + m.nota : ''); }
      else if (cta && cta2 && cta.id === cta2.id) { icono = '🪙'; titulo = App.subTxt(m.sub) + ' → ' + App.subTxt(m.sub2).toLowerCase(); sub = cta.nombre + (m.nota ? ' · ' + m.nota : ''); }
      else { icono = '↔️'; titulo = nCta + ' → ' + n2; sub = m.nota || 'Traspaso entre cuentas'; }
    } else if (m.tipo === 'mover') {
      icono = sob2 ? sob2.icono : '↔️';
      const de = (esp && esp2 && esp.id !== esp2.id ? esp.nombre + ' ' : '') + (sob ? sob.nombre : 'Libre');
      const a = (esp && esp2 && esp.id !== esp2.id ? esp2.nombre + ' ' : '') + (sob2 ? sob2.nombre : 'Libre');
      titulo = de + ' → ' + a; sub = m.origen === 'auto' ? (m.nota || 'Reparto automático') : (m.nota || 'Movido');
    }
    const monto = Math.abs(Number(m.monto));
    const txtMonto = signo > 0 ? '+' + U.money(monto) : signo < 0 ? '−' + U.money(monto) : U.money(monto);
    return { icono, titulo, sub, txtMonto, clase };
  };
})();
