/* Control de Finanzas — botón y gesto de "atrás" (Android)
   Antes, atrás cerraba la app. Ahora "atrás" deshace lo último que abriste, en este orden:
     hoja dentro de hoja → hoja → pestaña (vuelve al Inicio) → y solo desde el Inicio sale de la app.
   Cada "capa" abierta (pestaña ≠ Inicio, hoja, hojas apiladas) guarda una entrada en el historial del
   navegador; atrás quita la última y la app cierra la capa que corresponde. */
(function () {
  const App = window.App;
  if (!App || !window.history || !history.pushState) return;

  let prof = 0;          // entradas que hemos puesto encima de la base
  let ignorar = false;   // el próximo popstate lo provocamos nosotros (history.go)

  const capas = () => {
    let n = 0;
    if (App.ui && App.ui.pantalla && App.ui.pantalla !== 'inicio' && !App.ui.bloqueado) n++;
    if (App.h) n += 1 + (App.pila ? App.pila.length : 0);
    return n;
  };

  /* iguala el historial con lo que hay abierto */
  const sincronizar = () => {
    const n = capas();
    while (prof < n) { prof++; try { history.pushState({ cdf: 1, d: prof }, ''); } catch (e) { prof--; return; } }
    if (prof > n) { const k = prof - n; prof = n; ignorar = true; setTimeout(() => { ignorar = false; }, 600); history.go(-k); }
  };

  /* un paso hacia atrás dentro de la app */
  const atrasUno = () => {
    if (App.h) { App.cerrarHoja(false); return true; }
    if (App.ui.pantalla !== 'inicio') { App.ui.pantalla = 'inicio'; window.scrollTo(0, 0); App.render(); return true; }
    return false;
  };

  window.addEventListener('popstate', (e) => {
    const d = e.state && typeof e.state.d === 'number' ? e.state.d : 0;
    if (ignorar) { ignorar = false; prof = d; return; }
    let quitar = prof - d; prof = d;
    if (quitar < 1) quitar = 1;
    for (let i = 0; i < quitar; i++) if (!atrasUno()) break;
    sincronizar();
  });

  try { history.replaceState({ cdf: 1, d: 0 }, ''); } catch (e) { /* sin historial */ }

  /* después de cualquier cambio de pantalla u hoja, se vuelve a igualar */
  const envolver = (nombre) => {
    const orig = App[nombre];
    if (typeof orig !== 'function') return;
    App[nombre] = function () { const r = orig.apply(this, arguments); sincronizar(); return r; };
  };
  ['render', 'abrirHoja', 'cerrarHoja'].forEach(envolver);
  sincronizar();
})();
