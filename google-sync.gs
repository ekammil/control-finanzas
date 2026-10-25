/**
 * Control de Finanzas — respaldo en Google Sheets + Bandeja de Apple Pay
 *
 * Cómo usarlo:
 * 1. Crea una hoja nueva en sheets.google.com
 * 2. Extensiones → Apps Script. Borra todo y pega este código. Guarda.
 * 3. Implementar → Nueva implementación → tipo "Aplicación web"
 *    Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario
 * 4. Autoriza y copia el enlace que termina en /exec
 * 5. Pégalo en la app: Ajustes → Respaldo en Google Sheets
 *
 * No compartas el enlace: quien lo tenga puede escribir en tu hoja.
 */

const HOJA_MOVS = 'Movimientos';
const HOJA_BANDEJA = 'Bandeja';
const COLS_MOVS = ['Id', 'Fecha', 'Tipo', 'Monto', 'Espacio', 'Sobre', 'Cuenta', 'Hacia espacio', 'Hacia sobre', 'Hacia cuenta', 'Nota', 'Origen', 'Creado', 'Actualizado'];
const COLS_BANDEJA = ['Id', 'Fecha', 'Monto', 'Comercio', 'Tarjeta', 'Estado', 'Recibido', 'Sobre', 'Cuenta', 'Nota', 'Tipo'];

function libro_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function hoja_(nombre, cols) {
  const ss = libro_();
  let h = ss.getSheetByName(nombre);
  if (!h) {
    h = ss.insertSheet(nombre);
    h.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

function responder_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function hoyTxt_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd'); }

function leerMonto_(v) {
  if (typeof v === 'number') return Math.abs(v);
  let s = String(v || '').replace(/[^\d.,]/g, '');
  if (s.indexOf('.') === -1 && /,\d{1,2}$/.test(s)) s = s.replace(',', '.'); else s = s.replace(/,/g, '');
  return Math.abs(parseFloat(s)) || 0;
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    if (p.accion === 'bandeja') {
      const h = hoja_(HOJA_BANDEJA, COLS_BANDEJA);
      const v = h.getDataRange().getValues();
      const items = [];
      for (let i = 1; i < v.length; i++) {
        if (String(v[i][5]) !== 'nuevo') continue;
        const f = v[i][1] instanceof Date ? Utilities.formatDate(v[i][1], Session.getScriptTimeZone(), 'yyyy-MM-dd') : String(v[i][1]);
        items.push({ id: String(v[i][0]), fecha: f, monto: Number(v[i][2]) || 0, comercio: String(v[i][3] || ''), tarjeta: String(v[i][4] || ''),
          sobre: String(v[i][7] || ''), cuenta: String(v[i][8] || ''), nota: String(v[i][9] || ''), tipo: String(v[i][10] || '') });
      }
      return responder_({ ok: true, items: items });
    }
    return responder_({ ok: true, app: 'control-finanzas', mensaje: 'Conectado' });
  } catch (err) {
    return responder_({ ok: false, mensaje: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Atajos: un pago (accion "bandeja") o varios guardados sin señal (accion "lote", una línea por pago)
    if (d.accion === 'bandeja' || d.accion === 'lote') {
      const h = hoja_(HOJA_BANDEJA, COLS_BANDEJA);
      let lista = [];
      if (d.accion === 'bandeja') lista = [d];
      else if (Array.isArray(d.items)) lista = d.items;
      else String(d.texto || '').split(/\r?\n/).forEach(function (linea) {
        linea = linea.trim(); if (!linea) return;
        try { lista.push(JSON.parse(linea)); } catch (x) { /* línea dañada: se ignora */ }
      });
      const ya = {};
      const v = h.getDataRange().getValues();
      for (let i = 1; i < v.length; i++) ya[String(v[i][0])] = true;
      const filas = [];
      let total = 0;
      lista.forEach(function (it) {
        const monto = leerMonto_(it.monto);
        if (!(monto > 0)) return;
        const id = String(it.id || ('ap-' + Utilities.getUuid().slice(0, 8)));
        if (ya[id]) return;
        ya[id] = true;
        filas.push([id, it.fecha || hoyTxt_(), monto, String(it.comercio || ''), String(it.tarjeta || ''), 'nuevo', new Date(),
          String(it.sobre || ''), String(it.cuenta || ''), String(it.nota || ''), String(it.tipo || '')]);
        total += monto;
      });
      if (filas.length) h.getRange(h.getLastRow() + 1, 1, filas.length, COLS_BANDEJA.length).setValues(filas);
      return responder_({ ok: true, estado: 'listo', recibidos: filas.length, mensaje: filas.length ? 'Enviado: ' + filas.length + ' gasto(s), $' + total.toFixed(2) : 'Nada nuevo' });
    }

    // La app manda sus movimientos
    if (d.accion === 'app_sync') {
      const h = hoja_(HOJA_MOVS, COLS_MOVS);
      const datos = h.getDataRange().getValues();
      const fila = {};
      for (let i = 1; i < datos.length; i++) fila[String(datos[i][0])] = i + 1;
      const nuevos = [];
      const recibidos = [];
      (d.movs || []).forEach(function (m) {
        const valores = [String(m.id), m.fecha, m.tipo, Number(m.monto) || 0, m.espacio || '', m.sobre || '', m.cuenta || '',
          m.espacio2 || '', m.sobre2 || '', m.cuenta2 || '', m.nota || '', m.origen || '', m.creado ? new Date(m.creado) : '', new Date()];
        if (fila[m.id]) h.getRange(fila[m.id], 1, 1, valores.length).setValues([valores]);
        else nuevos.push(valores);
        recibidos.push(String(m.id));
      });
      if (nuevos.length) h.getRange(h.getLastRow() + 1, 1, nuevos.length, COLS_MOVS.length).setValues(nuevos);
      // borrados (de abajo hacia arriba)
      const borrar = (d.borrados || []).map(function (id) { return fila[id]; }).filter(Boolean).sort(function (a, b) { return b - a; });
      borrar.forEach(function (r) { h.deleteRow(r); });
      // pagos de la bandeja ya registrados
      if ((d.bandejaOk || []).length) {
        const hb = hoja_(HOJA_BANDEJA, COLS_BANDEJA);
        const vb = hb.getDataRange().getValues();
        const ok = {}; d.bandejaOk.forEach(function (id) { ok[id] = true; });
        for (let i = 1; i < vb.length; i++) if (ok[String(vb[i][0])]) hb.getRange(i + 1, 6).setValue('registrado');
      }
      return responder_({ ok: true, recibidos: recibidos });
    }
    return responder_({ ok: false, mensaje: 'Acción desconocida' });
  } catch (err) {
    return responder_({ ok: false, mensaje: String(err) });
  } finally {
    lock.releaseLock();
  }
}
