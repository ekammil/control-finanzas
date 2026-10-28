/* Control de Finanzas — utilidades */
(function () {
  const U = {};

  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const fmt = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  U.money = (n) => fmt.format(U.r2(n || 0));
  U.money0 = (n) => fmt0.format(Math.round(n || 0));
  U.moneyShort = (n) => {
    const a = Math.abs(n);
    if (a >= 100000) return (n < 0 ? '-' : '') + '$' + (a / 1000).toFixed(0) + 'k';
    if (a >= 10000) return (n < 0 ? '-' : '') + '$' + (a / 1000).toFixed(1) + 'k';
    return U.money0(n);
  };
  U.signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + U.money(Math.abs(n));
  U.r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

  const pad = (n) => String(n).padStart(2, '0');
  U.ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  U.today = () => U.ymd(new Date());
  U.parse = (s) => { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); };
  U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.ymd(d); };
  U.daysBetween = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 86400000);
  U.weekStart = (s) => { const d = U.parse(s); const dow = (d.getDay() + 6) % 7; return U.addDays(s, -dow); }; // lunes
  U.dow = (s) => (U.parse(s).getDay() + 6) % 7; // 0 = lunes

  /* ---------- frecuencias: diario, semanal, quincenal, mensual, semestral, anual ---------- */
  U.FRECS = ['diario', 'semanal', 'quincenal', 'mensual', 'semestral', 'anual'];
  U.FREC_TXT = { diario: 'Diario', semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', semestral: 'Semestral', anual: 'Anual' };
  U.FREC_CADA = { diario: 'cada día', semanal: 'cada semana', quincenal: 'cada quincena', mensual: 'cada mes', semestral: 'cada semestre', anual: 'cada año' };
  U.FREC_ESTE = { diario: 'hoy', semanal: 'esta semana', quincenal: 'esta quincena', mensual: 'este mes', semestral: 'este semestre', anual: 'este año' };
  U.FREC_POR = { diario: '/día', semanal: '/sem', quincenal: '/quincena', mensual: '/mes', semestral: '/semestre', anual: '/año' };
  U.FREC_VECES = { diario: 365, semanal: 365 / 7, quincenal: 24, mensual: 12, semestral: 2, anual: 1 }; // veces por año (semanal exacto: $70 a la semana = $10 al día)
  U.FREC_DIAS = { diario: 1, semanal: 7, quincenal: 15.2, mensual: 30.4, semestral: 182.6, anual: 365.2 };
  U.frec = (f) => (U.FREC_VECES[f] ? f : 'semanal');
  // convierte un monto de una frecuencia a otra (ej. $400 al mes → por día)
  U.convertir = (monto, de, a) => (Number(monto) || 0) * U.FREC_VECES[U.frec(de)] / U.FREC_VECES[U.frec(a)];

  const ultimoDia = (y, m) => new Date(y, m + 1, 0).getDate();
  const fechaYMD = (y, m, d) => { const b = new Date(y, m, 1, 12); return U.ymd(new Date(b.getFullYear(), b.getMonth(), Math.min(d, ultimoDia(b.getFullYear(), b.getMonth())), 12)); };
  U.addMonths = (s, n) => { const d = U.parse(s); return fechaYMD(d.getFullYear(), d.getMonth() + n, d.getDate()); };

  /* Periodo de calendario que contiene la fecha: { ini, fin } (fin = día siguiente al último) */
  U.periodo = (frec, s) => {
    const d = U.parse(s); const y = d.getFullYear(), m = d.getMonth(), dia = d.getDate();
    switch (U.frec(frec)) {
      case 'diario': return { ini: s, fin: U.addDays(s, 1) };
      case 'semanal': { const i = U.weekStart(s); return { ini: i, fin: U.addDays(i, 7) }; }
      case 'quincenal': return dia <= 15 ? { ini: fechaYMD(y, m, 1), fin: fechaYMD(y, m, 16) } : { ini: fechaYMD(y, m, 16), fin: fechaYMD(y, m + 1, 1) };
      case 'mensual': return { ini: fechaYMD(y, m, 1), fin: fechaYMD(y, m + 1, 1) };
      case 'semestral': return m < 6 ? { ini: fechaYMD(y, 0, 1), fin: fechaYMD(y, 6, 1) } : { ini: fechaYMD(y, 6, 1), fin: fechaYMD(y + 1, 0, 1) };
      default: return { ini: fechaYMD(y, 0, 1), fin: fechaYMD(y + 1, 0, 1) };
    }
  };

  /* Cuántos periodos hay desde el que contiene "desde" hasta el que contiene "hasta" (incluidos) */
  U.contarPeriodos = (frec, desde, hasta) => {
    if (hasta < desde) return 0;
    const a = U.parse(desde), b = U.parse(hasta);
    const mes = (d) => d.getFullYear() * 12 + d.getMonth();
    switch (U.frec(frec)) {
      case 'diario': return U.daysBetween(desde, hasta) + 1;
      case 'semanal': return Math.round(U.daysBetween(U.weekStart(desde), U.weekStart(hasta)) / 7) + 1;
      case 'quincenal': { const q = (d) => mes(d) * 2 + (d.getDate() > 15 ? 1 : 0); return q(b) - q(a) + 1; }
      case 'mensual': return mes(b) - mes(a) + 1;
      case 'semestral': { const q = (d) => d.getFullYear() * 2 + (d.getMonth() >= 6 ? 1 : 0); return q(b) - q(a) + 1; }
      default: return b.getFullYear() - a.getFullYear() + 1;
    }
  };

  /* Fechas que se repiten a partir de una fecha ancla: k = 0 es el ancla, k = 1 la siguiente, k = -1 la anterior */
  U.venc = (frec, ancla, k) => {
    const d = U.parse(ancla); const y = d.getFullYear(), m = d.getMonth(), dia = d.getDate();
    switch (U.frec(frec)) {
      case 'diario': return U.addDays(ancla, k);
      case 'semanal': return U.addDays(ancla, 7 * k);
      case 'quincenal': {
        const dias = dia <= 15 ? [dia, dia + 15] : [dia - 15, dia];
        const t = (dia <= 15 ? 0 : 1) + k;
        const half = ((t % 2) + 2) % 2;
        return fechaYMD(y, m + Math.floor(t / 2), dias[half]);
      }
      case 'mensual': return fechaYMD(y, m + k, dia);
      case 'semestral': return fechaYMD(y, m + 6 * k, dia);
      default: return fechaYMD(y, m + 12 * k, dia);
    }
  };
  /* Índice de la primera fecha de la serie que es >= desde */
  U.vencIndice = (frec, ancla, desde) => {
    let k = Math.floor(U.daysBetween(ancla, desde) / U.FREC_DIAS[U.frec(frec)]) - 2;
    while (U.venc(frec, ancla, k) < desde) k++;
    while (U.venc(frec, ancla, k - 1) >= desde) k--;
    return k;
  };
  U.siguienteVenc = (frec, ancla, desde) => U.venc(frec, ancla, U.vencIndice(frec, ancla, desde));

  const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const DIAS_C = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  U.DIAS = DIAS; U.DIAS_C = DIAS_C; U.MESES = MESES;
  U.fechaCorta = (s) => { const d = U.parse(s); return d.getDate() + ' ' + MESES[d.getMonth()]; };
  U.fechaLarga = (s) => { const d = U.parse(s); return DIAS[U.dow(s)] + ' ' + d.getDate() + ' de ' + MESES_L[d.getMonth()]; };
  U.fechaRel = (s) => {
    const t = U.today();
    if (s === t) return 'Hoy';
    if (s === U.addDays(t, -1)) return 'Ayer';
    if (s === U.addDays(t, 1)) return 'Mañana';
    const txt = U.fechaLarga(s);
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };
  U.hora = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  U.sha256 = async (txt) => {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      // Respaldo si no hay crypto.subtle (por ejemplo, sin https)
      let h = 5381; for (let i = 0; i < txt.length; i++) h = ((h << 5) + h + txt.charCodeAt(i)) | 0;
      return 'x' + (h >>> 0).toString(16);
    }
  };

  // Vibración. Android: navigator.vibrate. iPhone (iOS 18+): no tiene vibrate, pero tocar un
  // interruptor nativo (<input switch>) da un "tic" del Taptic Engine; se crea uno invisible y se
  // toca por código. Solo funciona dentro de un toque del usuario (no después de un await).
  const ticIOS = () => {
    const l = document.createElement('label');
    l.setAttribute('aria-hidden', 'true'); l.style.display = 'none';
    const i = document.createElement('input'); i.type = 'checkbox'; i.setAttribute('switch', '');
    l.appendChild(i); document.head.appendChild(l); l.click(); document.head.removeChild(l);
  };
  U.haptic = (tipo) => {
    try {
      if (!window.App || !App.state || App.state.ajustes.vibracion === false) return;
      const doble = tipo === 'alerta';
      if (typeof navigator.vibrate === 'function') { navigator.vibrate(doble ? [18, 70, 18] : tipo === 'suave' ? 8 : 14); return; }
      ticIOS();
      if (doble) setTimeout(() => { try { ticIOS(); } catch (e) { /* nada */ } }, 110);
    } catch (e) { /* nada */ }
  };

  // Sonidos sintetizados (sin archivos, funcionan sin internet). Respetan el modo silencio del iPhone.
  let ctx = null, master = null;
  const audio = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* nada */ }
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.22; master.connect(ctx.destination);
    return ctx;
  };
  // iOS solo deja sonar el audio si se "despierta" dentro de un toque
  const despertar = () => {
    try {
      if (!window.App || !App.state || App.state.ajustes.sonidos === false) return;
      const c = audio(); if (!c) return;
      if (c.state !== 'running') c.resume();
      const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0);
    } catch (e) { /* nada */ }
  };
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, despertar, { passive: true, capture: true }));

  const nota = (t, f, dur, opc) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = (opc && opc.tipo) || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (opc && opc.a) o.frequency.exponentialRampToValueAtTime(opc.a, t + dur);
    const v = (opc && opc.vol) || 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  };
  const SONIDOS = {
    // moneda: dos notas brillantes
    ingreso: (t) => { nota(t, 988, 0.09, { tipo: 'square', vol: 0.18 }); nota(t + 0.075, 1319, 0.42, { tipo: 'square', vol: 0.16 }); nota(t + 0.075, 2637, 0.3, { vol: 0.12 }); },
    // gasto: "tic" suave que baja
    gasto: (t) => { nota(t, 720, 0.12, { tipo: 'triangle', a: 420, vol: 0.55 }); nota(t + 0.05, 360, 0.12, { vol: 0.25 }); },
    // alerta: dos tonos graves
    alerta: (t) => { nota(t, 392, 0.16, { tipo: 'triangle', vol: 0.6 }); nota(t + 0.19, 311, 0.26, { tipo: 'triangle', vol: 0.6 }); },
    // logro: arpegio hacia arriba
    logro: (t) => { [523, 659, 784, 1047].forEach((f, i) => nota(t + i * 0.07, f, 0.32, { vol: 0.35 })); },
    // abrir: subida suave
    abrir: (t) => { nota(t, 523, 0.5, { a: 784, vol: 0.28 }); nota(t + 0.12, 1047, 0.45, { vol: 0.12 }); }
  };
  U.sonido = (tipo) => {
    try {
      if (!window.App || !App.state || App.state.ajustes.sonidos === false) return;
      const c = audio(); if (!c || !SONIDOS[tipo]) return;
      if (c.state !== 'running') c.resume();
      SONIDOS[tipo](c.currentTime + 0.01);
    } catch (e) { /* nada */ }
  };

  U.sinMovimiento = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  U.saludo = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  window.U = U;
})();
