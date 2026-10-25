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

  // Vibración: Android usa vibrate; iPhone (iOS 18+) usa el truco del interruptor nativo
  U.haptic = () => {
    try {
      if (!window.App || !App.state || App.state.ajustes.vibracion === false) return;
      if (navigator.vibrate) { navigator.vibrate(12); return; }
      const l = document.getElementById('haptic-label');
      if (l) l.click();
    } catch (e) { /* nada */ }
  };

  U.saludo = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  window.U = U;
})();
