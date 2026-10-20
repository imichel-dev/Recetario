// Datos del recetario: formato, guardado en el dispositivo, importación y exportación.
//
// Formato de una receta:
//   Panificado: { id, nombre, categoria: 'pan', peso, ingredientes: [{ nombre, pct, sub }], fijos: [texto], notas, actualizado }
//     - `sub` es el id de otra receta usada como ingrediente (o null).
//   General:    { id, nombre, categoria: 'gen', porciones, items: [{ nombre, cant, unidad }], pasos: [texto], notas, actualizado }
//     - `cant` null significa "sin cantidad" (a gusto).

const CLAVE = 'recetario.v1';
export const VERSION_DATOS = 1;

export function nuevoId() {
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function vacio() {
  return { version: VERSION_DATOS, recetas: [], eliminadas: {}, ajustes: { tema: null } };
}

/** Normaliza el registro de recetas eliminadas: { id: fecha ISO }. */
export function normalizarEliminadas(e) {
  const r = {};
  if (e && typeof e === 'object') {
    for (const [id, f] of Object.entries(e)) if (id && typeof f === 'string') r[id] = f;
  }
  return r;
}

export function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return vacio();
    const d = JSON.parse(crudo);
    return {
      version: VERSION_DATOS,
      recetas: Array.isArray(d.recetas) ? d.recetas.map(normalizar).filter(Boolean) : [],
      eliminadas: normalizarEliminadas(d.eliminadas),
      ajustes: { tema: null, ...(d.ajustes || {}) },
    };
  } catch (e) {
    console.error('No se pudieron leer los datos guardados', e);
    return vacio();
  }
}

export function guardar(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch (e) {
    console.error('No se pudieron guardar los datos', e);
    return false;
  }
}

/** Pide al navegador que no borre los datos si falta espacio. */
export async function pedirAlmacenamientoPersistente() {
  try {
    if (navigator.storage && navigator.storage.persist) await navigator.storage.persist();
  } catch (e) { /* no disponible */ }
}

const texto = (v) => (v === null || v === undefined ? '' : String(v));
const numero = (v, def = 0) => { const n = Number(v); return isFinite(n) ? n : def; };

/** Asegura que una receta tenga todos sus campos con el tipo correcto. */
export function normalizar(r) {
  if (!r || typeof r !== 'object') return null;
  const base = {
    id: texto(r.id) || nuevoId(),
    nombre: texto(r.nombre).trim() || 'Sin nombre',
    categoria: r.categoria === 'gen' ? 'gen' : 'pan',
    notas: texto(r.notas),
    actualizado: texto(r.actualizado) || new Date().toISOString(),
  };
  if (base.categoria === 'gen') {
    return {
      ...base,
      porciones: Math.max(1, Math.round(numero(r.porciones, 1)) || 1),
      items: (Array.isArray(r.items) ? r.items : []).map((i) => ({
        nombre: texto(i && i.nombre),
        cant: i && i.cant !== null && i.cant !== undefined && i.cant !== '' ? numero(i.cant) : null,
        unidad: texto(i && i.unidad),
      })),
      pasos: (Array.isArray(r.pasos) ? r.pasos : []).map(texto).filter((p) => p.trim()),
    };
  }
  return {
    ...base,
    peso: numero(r.peso),
    ingredientes: (Array.isArray(r.ingredientes) ? r.ingredientes : []).map((i) => ({
      nombre: texto(i && i.nombre),
      pct: numero(i && i.pct),
      sub: i && i.sub ? texto(i.sub) : null,
    })),
    fijos: (Array.isArray(r.fijos) ? r.fijos : []).map(texto).filter((f) => f.trim()),
  };
}

// ---------- Importación ----------

/** ¿Es el formato de la app anterior (porcentaje panadero)? */
function esFormatoAnterior(lista) {
  return Array.isArray(lista) && lista.length > 0 && lista.every((x) => x && Array.isArray(x.ingredients));
}

/**
 * Convierte el JSON de la app anterior:
 * [{ name, weight, note, order, ingredients: [{ name, percentage, order }] }]
 * - Un ingrediente con el mismo nombre que otra receta pasa a ser sub-receta.
 * - Una nota corta de una sola línea que empieza con un número ("1 huevo") pasa a ingrediente fijo.
 */
export function convertirFormatoAnterior(lista) {
  const ordenadas = [...lista].sort((a, b) => numero(a.order) - numero(b.order));
  const recetas = ordenadas.map((x) => ({
    id: nuevoId(),
    nombre: texto(x.name).trim() || 'Sin nombre',
    categoria: 'pan',
    peso: numero(x.weight),
    ingredientes: [...(x.ingredients || [])]
      .sort((a, b) => numero(a.order) - numero(b.order))
      .map((i) => ({ nombre: texto(i.name).trim(), pct: numero(i.percentage), sub: null })),
    fijos: [],
    notas: texto(x.note),
    actualizado: texto(x.updatedAt) || new Date().toISOString(),
  }));

  const porNombre = new Map(recetas.map((r) => [r.nombre.toLowerCase(), r]));
  for (const r of recetas) {
    for (const ing of r.ingredientes) {
      const otra = porNombre.get(ing.nombre.toLowerCase());
      if (otra && otra.id !== r.id) ing.sub = otra.id;
    }
    const nota = r.notas.trim();
    if (nota && !nota.includes('\n') && nota.length <= 30 && /^\d/.test(nota)) {
      r.fijos.push(nota);
      r.notas = '';
    }
  }
  return recetas;
}

/** Lee el contenido de un archivo .json y devuelve las recetas que trae. */
export function leerImportacion(textoArchivo) {
  let d;
  try {
    d = JSON.parse(textoArchivo);
  } catch (e) {
    throw new Error('El archivo no es un JSON válido.');
  }
  let recetas;
  if (esFormatoAnterior(d)) recetas = convertirFormatoAnterior(d);
  else if (d && Array.isArray(d.recetas)) recetas = d.recetas.map(normalizar).filter(Boolean);
  else if (Array.isArray(d) && d.every((x) => x && (x.ingredientes || x.items))) recetas = d.map(normalizar).filter(Boolean);
  else throw new Error('El archivo no contiene recetas en un formato conocido.');
  if (!recetas.length) throw new Error('El archivo no contiene recetas.');
  return recetas;
}

/**
 * Une recetas importadas con las existentes.
 * modo 'combinar': las que tienen el mismo nombre se actualizan, el resto se agrega.
 * modo 'reemplazar': quedan solo las importadas.
 */
export function unirImportacion(existentes, importadas, modo) {
  if (modo === 'reemplazar') {
    const ahora = new Date().toISOString();
    return importadas.map((r) => ({ ...r, actualizado: ahora }));
  }
  const porNombre = new Map(existentes.map((r) => [r.nombre.toLowerCase(), r]));
  const cambioId = new Map();
  for (const r of importadas) {
    const previa = porNombre.get(r.nombre.toLowerCase());
    cambioId.set(r.id, previa ? previa.id : r.id);
  }
  const resultado = existentes.map((r) => ({ ...r }));
  const ahora = new Date().toISOString();
  for (const r of importadas) {
    const id = cambioId.get(r.id);
    const copia = { ...r, id, actualizado: ahora };
    if (copia.categoria === 'pan') {
      copia.ingredientes = copia.ingredientes.map((i) => ({ ...i, sub: i.sub ? (cambioId.get(i.sub) || i.sub) : null }));
    }
    const pos = resultado.findIndex((x) => x.id === id);
    if (pos >= 0) resultado[pos] = copia;
    else resultado.push(copia);
  }
  return resultado;
}

/** Texto del archivo de respaldo. */
export function exportar(datos) {
  return JSON.stringify({
    app: 'recetario',
    version: VERSION_DATOS,
    exportado: new Date().toISOString(),
    recetas: datos.recetas,
  }, null, 2);
}

// ---------- Sincronización ----------

/**
 * Fusiona dos copias de las recetas. Para cada receta queda la versión
 * modificada más recientemente; una receta eliminada después de su última
 * modificación no aparece. El orden sigue a `base` y agrega al final las
 * recetas que solo están en `otra`.
 * (La misma función está copiada en el script de Google.)
 */
export function fusionar(base, otra) {
  const eliminadas = { ...normalizarEliminadas(base.eliminadas) };
  for (const [id, f] of Object.entries(normalizarEliminadas(otra.eliminadas))) {
    if (!eliminadas[id] || f > eliminadas[id]) eliminadas[id] = f;
  }
  const mapa = new Map();
  for (const r of [...(base.recetas || []), ...(otra.recetas || [])]) {
    if (!r || !r.id) continue;
    const previa = mapa.get(r.id);
    if (!previa) mapa.set(r.id, r);
    else if ((r.actualizado || '') > (previa.actualizado || '')) mapa.set(r.id, r); // Map conserva la posición original
  }
  const recetas = [...mapa.values()]
    .filter((r) => !(eliminadas[r.id] && eliminadas[r.id] >= (r.actualizado || '')));
  // Borra registros de eliminación de más de un año.
  const limite = new Date(Date.now() - 365 * 864e5).toISOString();
  for (const [id, f] of Object.entries(eliminadas)) if (f < limite) delete eliminadas[id];
  return { recetas, eliminadas };
}

/** Texto comparable de un conjunto de recetas (para saber si algo cambió). */
export function huella(d) {
  const orden = (o) => (o && typeof o === 'object' && !Array.isArray(o)
    ? Object.keys(o).sort().reduce((a, k) => { a[k] = orden(o[k]); return a; }, {})
    : Array.isArray(o) ? o.map(orden) : o);
  return JSON.stringify(orden({ recetas: d.recetas || [], eliminadas: d.eliminadas || {} }));
}

/** Enlace de vinculación: guarda dirección y clave en el fragmento de la URL. */
export function codificarVinculo(cfg) {
  const json = JSON.stringify({ u: cfg.url, k: cfg.clave });
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodificarVinculo(token) {
  try {
    const b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    const d = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (typeof d.u === 'string' && /^(https:\/\/|http:\/\/localhost[:/])/.test(d.u) && typeof d.k === 'string' && d.k) return { url: d.u, clave: d.k };
  } catch (e) { /* enlace inválido */ }
  return null;
}
