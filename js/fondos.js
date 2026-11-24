/* Control de Finanzas — fondos vivos: Cielo, Mar, Luciérnagas, Lluvia, Nieve, Aurora boreal y Ciudad
   Todo se mueve con transform/opacity (lo hace la GPU) y no hay nada pesado.
   Se arma solo cuando se elige el fondo y se quita al cambiar. */
(function () {
  const App = window.App;
  const VIVOS = ['cielo', 'mar', 'luciernagas', 'lluvia', 'nieve', 'boreal', 'ciudad'];
  const r = (a, b) => a + Math.random() * (b - a);
  const n = (k, f) => { let s = ''; for (let i = 0; i < k; i++) s += f(i); return s; };

  /* Cielo continuo: los colores, el sol, la luna y las estrellas siguen la hora real (se actualiza cada minuto) */
  const PUNTOS = [ // hora, [arriba, medio, abajo]
    [0, ['#01030c', '#08102c', '#14204a']], [5, ['#0a1030', '#2a2a6a', '#6a4a7a']], [6.5, ['#28487e', '#d9806a', '#ffc88a']],
    [8, ['#2a6cb8', '#4a90d4', '#2a5a90']], [12, ['#1b5aa6', '#2f7cc6', '#164070']], [16.5, ['#1f5ea8', '#3a80c0', '#1c4a7c']],
    [18.5, ['#1c1f5e', '#7a3a7c', '#d9704a']], [20, ['#0a1030', '#241a54', '#4a2a5a']], [21.5, ['#01030c', '#08102c', '#14204a']], [24, ['#01030c', '#08102c', '#14204a']]
  ];
  const hex = (c) => [1, 3, 5].map((i) => parseInt(c.substr(i, 2), 16));
  const mezcla = (a, b, t) => { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',') + ')'; };
  const horaDec = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; };
  const cielo = () => {
    const estrellas = n(52, () => '<i class="est" style="left:' + r(0, 100).toFixed(1) + '%;top:' + r(0, 58).toFixed(1) + '%;width:' + r(1, 2.4).toFixed(1) + 'px;height:' + r(1, 2.4).toFixed(1) + 'px;animation-delay:' + r(0, 5).toFixed(1) + 's"></i>');
    const nubes = n(6, (i) => {
      const w = r(55, 95), top = r(4, 58), dur = r(70, 140);
      return '<i class="nube" style="width:' + w.toFixed(0) + 'vw;height:' + (w * 0.28).toFixed(0) + 'vw;top:' + top.toFixed(0) + '%;--o:' + r(0.22, 0.45).toFixed(2) + ';animation-duration:' + dur.toFixed(0) + 's;animation-delay:-' + (i * dur / 6 + r(0, 10)).toFixed(0) + 's"></i>';
    });
    return { clase: 'cielo', html: '<div class="estrellas-c">' + estrellas + '</div><i class="sol"></i><i class="luna-c"></i>' + nubes };
  };
  const cieloActualizar = () => {
    const el = document.querySelector('.vivo.cielo'); if (!el) return;
    const h = horaDec();
    let i = 0; while (i < PUNTOS.length - 2 && h >= PUNTOS[i + 1][0]) i++;
    const A = PUNTOS[i], B = PUNTOS[i + 1], t = (h - A[0]) / (B[0] - A[0]);
    const c = [0, 1, 2].map((k) => mezcla(A[1][k], B[1][k], t));
    el.style.background = 'linear-gradient(180deg,' + c[0] + ' 0%,' + c[1] + ' 46%,' + c[2] + ' 100%)';
    const alt = Math.sin(Math.PI * (h - 6) / 12);            // altura del sol: >0 de día
    const luz = Math.max(0, Math.min(1, (alt + 0.15) / 0.45)); // 0 = noche cerrada, 1 = día
    el.style.setProperty('--luz', luz.toFixed(3));
    const sol = el.querySelector('.sol'), luna = el.querySelector('.luna-c');
    const sv = h > 5.4 && h < 18.8;
    sol.style.opacity = sv ? Math.min(1, Math.max(0, Math.min(h - 5.4, 18.8 - h) / 0.8)).toFixed(2) : 0;
    const f = Math.min(1, Math.max(0, (h - 6) / 12));
    sol.style.left = (8 + f * 78).toFixed(1) + '%'; sol.style.top = (62 - Math.max(0, Math.sin(Math.PI * f)) * 52).toFixed(1) + '%';
    sol.dataset.baja = alt < 0.3 ? '1' : '';
    const hn = h >= 18 ? h - 18 : h + 6; const g = Math.min(1, Math.max(0, hn / 12));
    luna.style.left = (8 + g * 78).toFixed(1) + '%'; luna.style.top = (56 - Math.max(0, Math.sin(Math.PI * g)) * 46).toFixed(1) + '%';
    luna.style.opacity = (1 - luz).toFixed(2);
    el.querySelector('.estrellas-c').style.opacity = Math.max(0, 1 - luz * 1.6).toFixed(2);
  };
  setInterval(() => { if (!document.hidden) cieloActualizar(); }, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) cieloActualizar(); });

  const ola = (cls, color, alto) => '<svg class="ola ' + cls + '" viewBox="0 0 1200 120" preserveAspectRatio="none" style="height:' + alto + 'px"><path fill="' + color + '" d="M0 60 C 100 20 200 20 300 60 S 500 100 600 60 S 800 20 900 60 S 1100 100 1200 60 V120 H0 Z"/></svg>';
  const mar = () => ({
    clase: 'mar',
    html: '<i class="rayo r1"></i><i class="rayo r2"></i><i class="rayo r3"></i>' +
      n(14, () => '<i class="burb" style="left:' + r(2, 96).toFixed(1) + '%;width:' + r(4, 13).toFixed(0) + 'px;height:' + r(4, 13).toFixed(0) + 'px;animation-duration:' + r(9, 20).toFixed(1) + 's;animation-delay:-' + r(0, 20).toFixed(1) + 's"></i>') +
      '<div class="olas">' + ola('o3', 'rgba(14,116,144,.34)', 230) + ola('o2', 'rgba(8,145,178,.28)', 180) + ola('o1', 'rgba(103,232,249,.16)', 130) + '</div>'
  });

  const arboles = (color, cls) => '<svg class="arb ' + cls + '" viewBox="0 0 400 160" preserveAspectRatio="none"><path fill="' + color + '" d="M0 160 V110 L18 40 L36 105 L50 70 L66 118 L88 20 L110 112 L128 64 L146 120 L170 34 L194 118 L212 80 L232 122 L258 14 L284 116 L304 66 L322 120 L346 46 L370 112 L386 78 L400 108 V160 Z"/></svg>';
  const luciernagas = () => ({
    clase: 'luciernagas',
    html: '<i class="lunita"></i>' + arboles('#050d0b', 'atras') + arboles('#02070a', 'frente') +
      n(26, () => {
        const dx = r(-18, 18).toFixed(1), dy = r(-14, 14).toFixed(1);
        return '<i class="lu" style="left:' + r(3, 97).toFixed(1) + '%;top:' + r(30, 92).toFixed(1) + '%;--dx:' + dx + 'vw;--dy:' + dy + 'vh;animation-duration:' + r(9, 20).toFixed(1) + 's,' + r(2.2, 5.5).toFixed(1) + 's;animation-delay:-' + r(0, 15).toFixed(1) + 's,-' + r(0, 5).toFixed(1) + 's"></i>';
      })
  });

  const lluvia = () => ({
    clase: 'lluvia',
    html: '<i class="relampago"></i>' + n(4, (i) => '<i class="nube oscura" style="width:' + r(80, 120).toFixed(0) + 'vw;height:' + r(22, 34).toFixed(0) + 'vw;top:' + (i * 7 - 6) + '%;--o:.5;animation-duration:' + r(60, 110).toFixed(0) + 's;animation-delay:-' + r(0, 60).toFixed(0) + 's"></i>') +
      n(70, () => '<i class="gota" style="left:' + r(-5, 105).toFixed(1) + '%;height:' + r(12, 26).toFixed(0) + 'px;animation-duration:' + r(0.55, 1.1).toFixed(2) + 's;animation-delay:-' + r(0, 1.2).toFixed(2) + 's;opacity:' + r(0.25, 0.6).toFixed(2) + '"></i>')
  });
  const nieve = () => ({
    clase: 'nieve',
    html: n(55, () => { const t = r(2, 6.5); return '<i class="copo" style="left:' + r(-3, 100).toFixed(1) + '%;width:' + t.toFixed(1) + 'px;height:' + t.toFixed(1) + 'px;--sx:' + r(-30, 30).toFixed(0) + 'px;animation-duration:' + r(8, 20).toFixed(1) + 's;animation-delay:-' + r(0, 20).toFixed(1) + 's;opacity:' + r(0.4, 0.95).toFixed(2) + '"></i>'; }) + '<i class="suelo-nieve"></i>'
  });
  const boreal = () => ({
    clase: 'boreal',
    html: n(60, () => '<i class="est" style="left:' + r(0, 100).toFixed(1) + '%;top:' + r(0, 70).toFixed(1) + '%;width:' + r(1, 2.2).toFixed(1) + 'px;height:' + r(1, 2.2).toFixed(1) + 'px;animation-delay:' + r(0, 5).toFixed(1) + 's"></i>') +
      '<i class="banda b1"></i><i class="banda b2"></i><i class="banda b3"></i>'
  });
  const ciudad = () => {
    const edif = (k, color, alto, op) => { let x = '<div class="edificios ' + k + '">'; for (let i = 0; i < 12; i++) x += '<i style="height:' + r(alto[0], alto[1]).toFixed(0) + 'vh;flex:' + r(0.7, 1.5).toFixed(2) + ';background-color:' + color + ';--v:' + (op ? r(0.4, 0.95).toFixed(2) : 0) + ';animation-delay:-' + r(0, 8).toFixed(1) + 's"></i>'; return x + '</div>'; };
    return { clase: 'ciudad', html: n(40, () => '<i class="est" style="left:' + r(0, 100).toFixed(1) + '%;top:' + r(0, 40).toFixed(1) + '%;width:1.6px;height:1.6px;animation-delay:' + r(0, 5).toFixed(1) + 's"></i>') + '<i class="luna-ci"></i>' + edif('atras', '#150f33', [16, 34], 0) + edif('frente', '#07050f', [10, 26], 1) };
  };

  /* Pone el fondo vivo que toca (o quita el que había) */
  App.fondoVivo = (id) => {
    const bg = document.querySelector('.bg');
    if (!bg) return;
    const hay = bg.querySelector('.vivo');
    if (!VIVOS.includes(id)) { if (hay) hay.remove(); return; }
    if (hay && hay.dataset.k === id) { if (id === 'cielo') cieloActualizar(); return; }
    if (hay) hay.remove();
    const f = { cielo, mar, luciernagas, lluvia, nieve, boreal, ciudad }[id]();
    const d = document.createElement('div');
    d.className = 'vivo ' + f.clase; d.dataset.k = id; d.setAttribute('aria-hidden', 'true');
    d.innerHTML = f.html;
    bg.appendChild(d);
    if (id === 'cielo') cieloActualizar();
  };
  App.FONDOS_VIVOS = VIVOS;
})();
