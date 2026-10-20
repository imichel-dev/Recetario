// Cálculos del recetario. Funciones puras: no tocan la pantalla ni el almacenamiento.

/** Convierte texto del usuario en número. Acepta coma o punto decimal. */
export function aNumero(texto) {
  if (typeof texto === 'number') return isFinite(texto) ? texto : 0;
  const limpio = String(texto ?? '').trim().replace(/\s/g, '').replace(',', '.');
  const v = parseFloat(limpio);
  return isFinite(v) ? v : 0;
}

/** Gramos con un decimal fijo: 2416,9 */
export function gramos(n) {
  return (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');
}

/** Número corto: sin ",0" final. 1,5 · 100 · 570,5 */
export function corto(n) {
  return String(Math.round(n * 10) / 10).replace('.', ',');
}

export function sumaPorcentajes(receta) {
  return (receta.ingredientes || []).reduce((a, i) => a + (Number(i.pct) || 0), 0);
}

const esHarina = (nombre) => /^harina/i.test(String(nombre).trim());

/**
 * Calcula una receta de panificado para un peso total de masa.
 * Devuelve cada ingrediente con sus gramos y, si es una sub-receta,
 * su desglose. `recetasPorId` permite resolver sub-recetas.
 */
export function calcularPan(receta, total, recetasPorId, visitadas = new Set()) {
  const suma = sumaPorcentajes(receta);
  const base = suma > 0 ? (total * 100) / suma : 0;
  const yaVisitadas = new Set(visitadas).add(receta.id);
  let harinaTotal = 0;
  let tieneSub = false;

  const lineas = (receta.ingredientes || []).map((ing) => {
    const g = (base * (Number(ing.pct) || 0)) / 100;
    const subReceta = ing.sub && !yaVisitadas.has(ing.sub) ? recetasPorId[ing.sub] : null;
    let desglose = null;
    if (subReceta && subReceta.categoria === 'pan') {
      tieneSub = true;
      desglose = calcularPan(subReceta, g, recetasPorId, yaVisitadas);
      harinaTotal += desglose.harinaTotal;
    } else if (esHarina(ing.nombre)) {
      harinaTotal += g;
    }
    return { nombre: ing.nombre, pct: Number(ing.pct) || 0, gramos: g, desglose };
  });

  return { suma, base, lineas, harinaTotal, tieneSub };
}

/** Peso total que corresponde a fijar `g` gramos de un ingrediente con `pct` %. */
export function totalDesdeIngrediente(g, pct, suma) {
  if (!pct) return null;
  return (g * suma) / pct;
}

/** Agrega plural simple a una unidad: puñado → puñados, taza → tazas. */
export function plural(unidad, cantidad) {
  if (!unidad || cantidad === 1 || unidad.length <= 3 || unidad.includes('.') || /s$/i.test(unidad)) return unidad;
  return /[aeiou]$/i.test(unidad) ? unidad + 's' : unidad + 'es';
}

/** Escala una receta general a otra cantidad de porciones. */
export function calcularGeneral(receta, porciones) {
  const base = receta.porciones || 1;
  const factor = porciones / base;
  const items = (receta.items || []).map((it) => {
    if (it.cant === null || it.cant === undefined || it.cant === '') {
      return { nombre: it.nombre, texto: it.unidad || 'a gusto', sinCantidad: !it.unidad };
    }
    const v = it.cant * factor;
    return { nombre: it.nombre, texto: corto(v) + (it.unidad ? ' ' + plural(it.unidad, v) : ''), sinCantidad: false };
  });
  return { factor, items };
}

/** IDs de las recetas que no pueden usarse como sub-receta de `id` (evita ciclos). */
export function noUsablesComoSub(id, recetas) {
  const bloqueadas = new Set([id]);
  let cambio = true;
  while (cambio) {
    cambio = false;
    for (const r of recetas) {
      if (bloqueadas.has(r.id) || r.categoria !== 'pan') continue;
      if ((r.ingredientes || []).some((i) => i.sub && bloqueadas.has(i.sub))) {
        bloqueadas.add(r.id);
        cambio = true;
      }
    }
  }
  return bloqueadas;
}
