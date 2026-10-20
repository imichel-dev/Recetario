/**
 * @OnlyCurrentDoc
 *
 * Recetario — servicio de sincronización.
 *
 * Este script vive dentro de una planilla de Google propia y guarda allí las
 * recetas. La app lo llama con una clave; solo tiene permiso sobre esta planilla.
 *
 * Instalación:
 *   1. Reemplazar CLAVE por un texto largo y secreto.
 *   2. Implementar → Nueva implementación → Aplicación web.
 *      Ejecutar como: Yo. Quién tiene acceso: Cualquier usuario.
 *   3. Copiar la URL de la aplicación web y pegarla, junto con la clave,
 *      en la app: Ajustes → Sincronización.
 */

const CLAVE = 'CAMBIAR_POR_UNA_CLAVE_SECRETA';
const HOJA_RECETAS = 'Recetas';
const HOJA_ELIMINADAS = 'Eliminadas';

function doGet() {
  return responder({ ok: true, servicio: 'recetario', version: 1 });
}

function doPost(e) {
  let pedido;
  try {
    pedido = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'formato' });
  }
  if (!pedido || pedido.clave !== CLAVE || CLAVE === 'CAMBIAR_POR_UNA_CLAVE_SECRETA') {
    return responder({ ok: false, error: 'clave' });
  }
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(25000)) return responder({ ok: false, error: 'ocupado' });
  try {
    const actual = leer();
    if (pedido.accion === 'leer') return responder({ ok: true, datos: actual });
    if (pedido.accion === 'sincronizar') {
      const fusion = fusionar(actual, limpiar(pedido.datos));
      if (huella(fusion) !== huella(actual)) escribir(fusion);
      return responder({ ok: true, datos: fusion });
    }
    return responder({ ok: false, error: 'formato' });
  } catch (err) {
    return responder({ ok: false, error: 'interno', detalle: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- Planilla ----------

function hoja(nombre, encabezados) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(nombre);
  if (!h) {
    h = libro.insertSheet(nombre);
    h.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

const hojaRecetas = () => hoja(HOJA_RECETAS, ['id', 'nombre', 'categoría', 'actualizado', 'datos']);
const hojaEliminadas = () => hoja(HOJA_ELIMINADAS, ['id', 'eliminada']);

function texto(v) {
  return v instanceof Date ? v.toISOString() : String(v === null || v === undefined ? '' : v);
}

function leer() {
  const recetas = [];
  const hr = hojaRecetas();
  if (hr.getLastRow() > 1) {
    for (const fila of hr.getRange(2, 1, hr.getLastRow() - 1, 5).getValues()) {
      try {
        const r = JSON.parse(texto(fila[4]));
        if (r && r.id) recetas.push(r);
      } catch (err) { /* fila dañada: se ignora */ }
    }
  }
  const eliminadas = {};
  const he = hojaEliminadas();
  if (he.getLastRow() > 1) {
    for (const fila of he.getRange(2, 1, he.getLastRow() - 1, 2).getValues()) {
      if (fila[0]) eliminadas[texto(fila[0])] = texto(fila[1]);
    }
  }
  return { recetas, eliminadas };
}

function reescribir(h, filas, columnas) {
  if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, columnas).clearContent();
  if (!filas.length) return;
  const rango = h.getRange(2, 1, filas.length, columnas);
  rango.setNumberFormat('@');
  rango.setValues(filas);
}

function escribir(d) {
  reescribir(hojaRecetas(), d.recetas.map((r) => [r.id, r.nombre || '', r.categoria === 'gen' ? 'General' : 'Panificado', r.actualizado || '', JSON.stringify(r)]), 5);
  reescribir(hojaEliminadas(), Object.keys(d.eliminadas).map((id) => [id, d.eliminadas[id]]), 2);
}

// ---------- Fusión (igual que en la app) ----------

function limpiar(d) {
  const recetas = (d && Array.isArray(d.recetas) ? d.recetas : [])
    .filter((r) => r && typeof r.id === 'string' && r.id && typeof r.actualizado === 'string');
  const eliminadas = {};
  if (d && d.eliminadas && typeof d.eliminadas === 'object') {
    for (const id of Object.keys(d.eliminadas)) if (typeof d.eliminadas[id] === 'string') eliminadas[id] = d.eliminadas[id];
  }
  return { recetas, eliminadas };
}

function fusionar(base, otra) {
  const eliminadas = Object.assign({}, base.eliminadas);
  for (const id of Object.keys(otra.eliminadas)) {
    if (!eliminadas[id] || otra.eliminadas[id] > eliminadas[id]) eliminadas[id] = otra.eliminadas[id];
  }
  const mapa = new Map();
  for (const r of base.recetas.concat(otra.recetas)) {
    const previa = mapa.get(r.id);
    if (!previa || (r.actualizado || '') > (previa.actualizado || '')) mapa.set(r.id, r);
  }
  const recetas = Array.from(mapa.values())
    .filter((r) => !(eliminadas[r.id] && eliminadas[r.id] >= (r.actualizado || '')));
  const limite = new Date(Date.now() - 365 * 864e5).toISOString();
  for (const id of Object.keys(eliminadas)) if (eliminadas[id] < limite) delete eliminadas[id];
  return { recetas, eliminadas };
}

function huella(d) {
  return JSON.stringify(d.recetas) + '|' + JSON.stringify(Object.keys(d.eliminadas).sort().map((k) => [k, d.eliminadas[k]]));
}
