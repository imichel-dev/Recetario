// Comunicación con el servicio de sincronización (script de Google en una planilla propia).

const CLAVE_CFG = 'recetario.sync';

/** Configuración guardada en este dispositivo: { url, clave, ultimo } o null. */
export function config() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CFG) || 'null');
    return c && c.url && c.clave ? c : null;
  } catch (e) {
    return null;
  }
}

export function guardarConfig(c) {
  try {
    if (c) localStorage.setItem(CLAVE_CFG, JSON.stringify(c));
    else localStorage.removeItem(CLAVE_CFG);
  } catch (e) { /* sin almacenamiento */ }
}

export class ErrorSync extends Error {
  constructor(tipo, mensaje) {
    super(mensaje);
    this.tipo = tipo;
  }
}

const MENSAJES = {
  clave: 'La clave no coincide con la del servicio.',
  formato: 'El servicio no entendió el pedido.',
  ocupado: 'El servicio estaba ocupado. Se vuelve a intentar en un momento.',
  interno: 'El servicio tuvo un error interno.',
};

/**
 * Envía un pedido al script. Se usa texto plano para que el navegador
 * no haga la consulta previa de CORS, que Apps Script no responde.
 */
export async function llamar(cfg, cuerpo, espera = 30000) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), espera);
  let resp;
  try {
    resp = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...cuerpo, clave: cfg.clave }),
      redirect: 'follow',
      cache: 'no-store',
      signal: control.signal,
    });
  } catch (e) {
    throw new ErrorSync('red', navigator.onLine ? 'No se pudo conectar con el servicio.' : 'Sin conexión.');
  } finally {
    clearTimeout(t);
  }
  let datos;
  try {
    datos = await resp.json();
  } catch (e) {
    throw new ErrorSync('acceso', 'La dirección no responde como servicio del recetario. Revise que la implementación tenga acceso para «Cualquier usuario».');
  }
  if (!datos || !datos.ok) {
    const tipo = (datos && datos.error) || 'interno';
    throw new ErrorSync(tipo, MENSAJES[tipo] || 'Error desconocido del servicio.');
  }
  return datos;
}

/** Texto relativo para la última sincronización. */
export function haceCuanto(iso) {
  if (!iso) return '';
  const seg = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seg < 60) return 'recién';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`;
  return new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}
