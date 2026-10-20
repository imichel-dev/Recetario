// Recetario: interfaz de la aplicación.
import * as C from './calculo.js';
import * as D from './datos.js';
import * as S from './sync.js';

export const VERSION_APP = '1.1.0';

// ---------- Íconos (trazos SVG) ----------
const svg = (cuerpo, tam = 22, trazo = 2.2) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${trazo}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${cuerpo}</svg>`;
const I = {
  volver: svg('<path d="M15 18l-6-6 6-6"/>'),
  editar: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>', 20, 2),
  editarChico: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>', 18, 2),
  ajustes: svg('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>', 22, 2),
  buscar: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  buscarChico: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>', 20),
  mas: svg('<path d="M12 5v14M5 12h14"/>', 26, 2.8),
  masChico: svg('<path d="M12 5v14M5 12h14"/>', 18, 2.6),
  masMedio: svg('<path d="M12 5v14M5 12h14"/>', 22, 2.6),
  abajo: svg('<path d="M6 9l6 6 6-6"/>', 18, 2.6),
  enlace: svg('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>', 16, 2.4),
  enlaceMedio: svg('<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>', 18, 2.2),
  borrar: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 20, 2),
  cerrar: svg('<path d="M6 6l12 12M18 6L6 18"/>', 16, 2.6),
  manija: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
  exportar: svg('<path d="M12 15V3M7 10l5 5 5-5M4 17v3h16v-3"/>', 24, 2),
  importar: svg('<path d="M12 3v12M7 8l5-5 5 5M4 17v3h16v-3"/>', 24, 2),
  exportarChico: svg('<path d="M12 15V3M7 10l5 5 5-5M4 17v3h16v-3"/>', 16, 2.2),
  importarChico: svg('<path d="M12 3v12M7 8l5-5 5 5M4 17v3h16v-3"/>', 16, 2.2),
  nube: svg('<path d="M7 18a5 5 0 01-.9-9.9A6 6 0 0117.7 9 4.5 4.5 0 0117.5 18z"/>', 24, 2),
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Estado ----------
const estado = {
  datos: D.cargar(),
  filtro: 'todas',
  q: '',
  calc: { id: null, modo: 'peso', total: 0, unid: 1, porU: 0, abiertos: {} },
  gen: { id: null, porc: 1 },
  borrador: null,
  borradorInicial: '',
  selectorSub: false,
  error: null,
  pantallaAnterior: null,
  recetaVisible: null,
  formSync: { url: '', clave: '' },
  conectando: false,
  mostrarQR: false,
};

const sync = { estado: 'ok', mensaje: '', enCurso: null, otraVez: false, temporizador: null, renderPendiente: false };

const app = document.getElementById('app');
const mqEscritorio = matchMedia('(min-width: 960px)');
const esEscritorio = () => mqEscritorio.matches;
const recetas = () => estado.datos.recetas;
const porId = () => Object.fromEntries(recetas().map((r) => [r.id, r]));

function persistir() {
  if (!D.guardar(estado.datos)) aviso('No se pudo guardar en este dispositivo.');
  programarSync();
}

// ---------- Navegación ----------
function rutaActual() {
  const partes = location.hash.replace(/^#\/?/, '').split('/');
  return { p: partes[0] || 'lista', id: partes[1] ? decodeURIComponent(partes[1]) : null };
}
function ir(hash) {
  history.pushState({ app: true }, '', hash);
  render();
}
function reemplazar(hash) {
  history.replaceState(history.state, '', hash);
  render();
}
function volver() {
  if (history.state && history.state.app) history.back();
  else reemplazar('#/');
}
window.addEventListener('popstate', () => {
  const dlg = document.getElementById('dialogo');
  if (dlg.open) dlg.close('');
  render();
});

// ---------- Tema ----------
function temaActual() {
  return estado.datos.ajustes.tema || (matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
}
function aplicarTema() {
  const t = temaActual();
  document.documentElement.dataset.tema = t;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'oscuro' ? '#17150F' : '#EFE6D2');
}

// ---------- Avisos y diálogos ----------
let temporizadorAviso;
function aviso(texto) {
  const el = document.getElementById('toast');
  el.textContent = texto;
  el.classList.add('visible');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove('visible'), 2600);
}

function dialogo({ titulo, texto, botones }) {
  const dlg = document.getElementById('dialogo');
  dlg.innerHTML = `<form method="dialog" class="hoja">
    <h2>${esc(titulo)}</h2>${texto ? `<p>${esc(texto)}</p>` : ''}
    <div class="botones">${botones.map((b) => `<button value="${esc(b.valor)}" class="${b.clase || ''}">${esc(b.texto)}</button>`).join('')}</div>
  </form>`;
  return new Promise((resolver) => {
    dlg.addEventListener('close', () => resolver(dlg.returnValue || null), { once: true });
    dlg.returnValue = '';
    dlg.showModal();
  });
}

// ---------- Render general ----------
function hayFocoEnCampo() {
  const a = document.activeElement;
  return a && app.contains(a) && a.matches('input, textarea');
}

function render(conservarScroll = false) {
  const y = window.scrollY;
  const { p, id } = rutaActual();
  const escritorio = esEscritorio();

  if (p === 'vincular') {
    const cfg = D.decodificarVinculo(id || '');
    history.replaceState(history.state, '', '#/ajustes');
    render();
    if (cfg) setTimeout(() => confirmarVinculo(cfg), 50);
    else aviso('El enlace de vinculación no es válido.');
    return;
  }

  // Salir del editor con cambios sin guardar
  if (estado.borrador && p !== 'editar' && p !== 'nueva') {
    if (hayCambios()) {
      const volverAlEditor = estado.borrador.id ? '#/editar/' + encodeURIComponent(estado.borrador.id) : '#/nueva/' + estado.borrador.categoria;
      dialogo({
        titulo: '¿Descartar los cambios?',
        texto: 'Los cambios de esta receta todavía no se guardaron.',
        botones: [
          { texto: 'Seguir editando', valor: 'seguir', clase: 'primario' },
          { texto: 'Descartar cambios', valor: 'descartar', clase: 'peligro' },
        ],
      }).then((r) => {
        if (r === 'descartar') { estado.borrador = null; render(); }
        else { history.pushState({ app: true }, '', volverAlEditor); render(); }
      });
      return;
    }
    estado.borrador = null;
  }

  let principal = null;
  let seleccion = null;
  const mapa = porId();
  estado.recetaVisible = null;

  if (p === 'receta') {
    const r = mapa[id];
    if (!r) return reemplazar('#/');
    seleccion = r.id;
    estado.recetaVisible = r.id;
    principal = r.categoria === 'gen' ? vistaGeneral(r, escritorio) : vistaCalculadora(r, escritorio);
  } else if (p === 'editar' || p === 'nueva') {
    principal = vistaEditor(p, id, escritorio);
    if (principal === null) return reemplazar('#/');
    if (p === 'editar') seleccion = id;
  } else if (p === 'ajustes') {
    principal = vistaAjustes(escritorio);
  } else if (escritorio) {
    // En la PC, sin receta elegida se muestra la primera de la lista.
    const r = filtradas()[0] || recetas()[0];
    if (r) {
      seleccion = r.id;
      estado.recetaVisible = r.id;
      principal = r.categoria === 'gen' ? vistaGeneral(r, true) : vistaCalculadora(r, true);
    } else {
      principal = `<div class="vacio grande">${htmlVacioInicial()}</div>`;
    }
  } else {
    principal = vistaLista();
  }

  const html = escritorio
    ? `<aside class="lateral" aria-label="Recetas">${barraLateral(seleccion)}</aside><section class="principal">${principal}</section>`
    : principal;

  const clave = location.hash + (escritorio ? '|e' : '|m');
  const mismaPantalla = estado.pantallaAnterior === clave;
  estado.pantallaAnterior = clave;
  app.classList.toggle('escritorio', escritorio);
  const scrollLateral = app.querySelector('.lateral')?.scrollTop || 0;
  app.innerHTML = html;
  const lat = app.querySelector('.lateral');
  if (lat) lat.scrollTop = scrollLateral;
  window.scrollTo(0, conservarScroll || mismaPantalla ? y : 0);
  sync.renderPendiente = false;
}

// ---------- Lista ----------
function filtradas() {
  const q = estado.q.trim().toLowerCase();
  return recetas().filter((r) => {
    if (estado.filtro !== 'todas' && r.categoria !== estado.filtro) return false;
    return !q || r.nombre.toLowerCase().includes(q);
  });
}

function htmlVacioInicial() {
  return `Todavía no hay recetas guardadas en este dispositivo.
    <span class="acciones">
      <button class="btn-pastilla" data-accion="importar">Importar archivo .json</button>
      <button class="btn-pastilla primario" data-accion="nueva">Crear receta</button>
    </span>`;
}

function htmlTarjetas(seleccion) {
  const todas = recetas();
  const visibles = filtradas();
  const mapa = porId();
  const tarjetas = visibles.map((r) => {
    let meta, cant, unidad;
    if (r.categoria === 'gen') {
      meta = `General · ${r.items.length} ingredientes`;
      cant = String(r.porciones);
      unidad = r.porciones === 1 ? 'porción' : 'porciones';
    } else {
      const sub = r.ingredientes.find((i) => i.sub && mapa[i.sub]);
      meta = sub ? `Incluye ${sub.nombre}` : `${r.ingredientes.length} ingredientes${r.fijos.length ? ' + ' + r.fijos.join(', ') : ''}`;
      cant = C.corto(r.peso);
      unidad = 'g';
    }
    if (r.notas.trim()) meta += ' · con notas';
    return `<a class="tarjeta" href="#/receta/${encodeURIComponent(r.id)}" data-accion="abrir" data-id="${esc(r.id)}"${r.id === seleccion ? ' aria-current="page"' : ''}>
      <span class="info"><span class="nombre">${esc(r.nombre)}</span><span class="meta">${esc(meta)}</span></span>
      <span class="peso">${esc(cant)}<small>${unidad}</small></span>
    </a>`;
  }).join('');
  let vacio = '';
  if (!todas.length) vacio = `<div class="vacio">${htmlVacioInicial()}</div>`;
  else if (!visibles.length) vacio = `<div class="vacio">${estado.q.trim() ? 'Ninguna receta coincide con la búsqueda.' : 'Todavía no hay recetas en esta categoría.'}</div>`;
  return tarjetas + vacio;
}

function htmlFiltros() {
  return [['todas', 'Todas'], ['pan', 'Panificados'], ['gen', 'Generales']]
    .map(([v, t]) => `<button class="chip" data-accion="filtro" data-valor="${v}" aria-pressed="${estado.filtro === v}">${t}</button>`).join('');
}

function vistaLista() {
  const n = recetas().length;
  const est = estadoSync();
  return `<div class="pantalla lista">
    <header class="lista-cab">
      <div><span class="conteo">${n} ${n === 1 ? 'receta' : 'recetas'}<span data-sync="corto">${est.corto ? ' · ' + esc(est.corto) : ''}</span></span><h1>Recetas</h1></div>
      <button class="btn-redondo" aria-label="Ajustes" data-accion="ir" data-hash="#/ajustes">${I.ajustes}</button>
    </header>
    <div class="filtros" role="group" aria-label="Filtrar por categoría">${htmlFiltros()}</div>
    <div class="recetas" data-region="lista">${htmlTarjetas(null)}</div>
    <div class="pie-lista">
      <label class="buscador">${I.buscar}<input type="search" data-entrada="buscar" placeholder="Buscar receta" aria-label="Buscar receta" value="${esc(estado.q)}" enterkeyhint="search"></label>
      <button class="fab" aria-label="Nueva receta" data-accion="nueva">${I.mas}</button>
    </div>
  </div>`;
}

function barraLateral(seleccion) {
  const n = recetas().length;
  const tema = temaActual();
  const est = estadoSync();
  return `<div class="cab">
      <div><span class="conteo">${n} ${n === 1 ? 'receta' : 'recetas'}</span><h1>Recetas</h1></div>
      <button class="btn-nueva" data-accion="nueva">${I.masChico}Nueva</button>
    </div>
    <label class="buscador">${I.buscarChico}<input type="search" data-entrada="buscar" placeholder="Buscar receta" aria-label="Buscar receta" value="${esc(estado.q)}"></label>
    <div class="filtros" role="group" aria-label="Filtrar por categoría">${htmlFiltros()}</div>
    <nav class="recetas" data-region="lista" aria-label="Lista de recetas">${htmlTarjetas(seleccion)}</nav>
    <div class="pie">
      <div class="selector compacto">
        <button data-accion="tema" data-valor="claro" aria-pressed="${tema === 'claro'}">Claro</button>
        <button data-accion="tema" data-valor="oscuro" aria-pressed="${tema === 'oscuro'}">Oscuro</button>
      </div>
      <div class="dos-acciones">
        <button data-accion="exportar">${I.exportarChico}Exportar</button>
        <button data-accion="importar">${I.importarChico}Importar</button>
      </div>
      <a class="linea-estado" href="#/ajustes" data-accion="ir" data-hash="#/ajustes">
        <span class="punto ${est.clase}" data-sync="punto" aria-hidden="true"></span><span data-sync="largo">${esc(est.lateral)}</span>
      </a>
    </div>`;
}

// ---------- Calculadora ----------
function prepararCalc(r) {
  const c = estado.calc;
  if (c.id !== r.id) {
    estado.calc = { id: r.id, modo: 'peso', total: r.peso, unid: 1, porU: r.peso, abiertos: {} };
  }
  return estado.calc;
}
const totalCalc = (c) => (c.modo === 'unid' ? c.unid * c.porU : c.total);

function cabEscritorio(ceja, titulo, acciones) {
  return `<div class="cab-esc">
    <div class="titulos"><span class="ceja">${esc(ceja)}</span><h2>${esc(titulo)}</h2></div>
    <div class="acciones-cab">${acciones}</div>
  </div>`;
}

function vistaCalculadora(r, escritorio) {
  const c = prepararCalc(r);
  const mapa = porId();
  const total = totalCalc(c);
  const res = C.calcularPan(r, total, mapa);
  const sinDatos = !r.ingredientes.length || res.suma <= 0;

  const panel = `<section class="panel-oliva">
      <div class="segmentos" role="tablist" aria-label="Modo de cálculo">
        <button role="tab" aria-selected="${c.modo === 'peso'}" data-accion="modo" data-valor="peso">Peso total</button>
        <button role="tab" aria-selected="${c.modo === 'unid'}" data-accion="modo" data-valor="unid">Por unidades</button>
      </div>
      ${c.modo === 'peso'
        ? `<label class="campo-total"><span class="etq">Peso total de masa</span>
            <span class="caja"><input inputmode="decimal" data-entrada="total" data-v="total" value="${C.corto(total)}" aria-label="Peso total de masa en gramos"><span class="u">g</span></span>
          </label>`
        : `<div class="unidades">
            <div class="contador"><span class="etq" id="et-unid">Unidades</span>
              <span class="fila"><button class="menos" data-accion="unid" data-paso="-1" aria-label="Menos unidades">−</button>
              <input inputmode="numeric" data-entrada="unid" data-v="unid" value="${c.unid}" aria-labelledby="et-unid">
              <button class="mas" data-accion="unid" data-paso="1" aria-label="Más unidades">+</button></span>
            </div>
            <div class="contador"><span class="etq" id="et-poru">g por unidad</span>
              <span class="fila"><button class="menos" data-accion="poru" data-paso="-10" aria-label="Diez gramos menos">−</button>
              <input inputmode="decimal" data-entrada="poru" data-v="poru" value="${C.corto(c.porU)}" aria-labelledby="et-poru">
              <button class="mas" data-accion="poru" data-paso="10" aria-label="Diez gramos más">+</button></span>
            </div>
          </div>
          <div class="masa-total"><span>Masa total</span><strong data-v="masa">${C.gramos(total)} g</strong></div>`}
    </section>`;

  const ingredientes = res.lineas.map((l, i) => {
    const sub = l.desglose;
    const abierto = !!(sub && c.abiertos[i]);
    const desglose = abierto ? `<div class="desglose">
        ${sub.lineas.map((s, j) => `<div class="linea"><span class="info"><span class="n">${esc(s.nombre)}</span><span class="p">${C.corto(s.pct)} %</span></span>
          <span class="g"><span data-v="sub-${i}-${j}">${C.gramos(s.gramos)}</span><small>g</small></span></div>`).join('')}
        <span class="suma-sub">Suma del ${esc(l.nombre)}: ${C.corto(sub.suma)} %</span>
      </div>` : '';
    return `<div class="ing${sub ? ' es-sub' : ''}${abierto ? ' abierto' : ''}">
      <div class="fila">
        ${sub ? `<button class="btn-desplegar" data-accion="desplegar" data-i="${i}" aria-expanded="${abierto}" aria-label="Ver desglose de ${esc(l.nombre)}">${I.abajo}</button>` : ''}
        <span class="info"><span class="nombre">${esc(l.nombre)}</span><span class="pct">${C.corto(l.pct)} %${sub ? '<span class="sub-etq"> · sub-receta</span>' : ''}</span></span>
        <label class="gramos"><span class="oculto">Gramos de ${esc(l.nombre)}</span>
          <input inputmode="decimal" data-entrada="ing" data-i="${i}" data-v="g-${i}" value="${C.gramos(l.gramos)}" ${l.pct ? '' : 'readonly'}><span class="u">g</span>
        </label>
      </div>${desglose}
    </div>`;
  }).join('');

  const aviso = sinDatos ? '<div class="aviso">Esta receta no tiene ingredientes con porcentaje. Se pueden agregar desde el editor.</div>' : '';
  const suma = sinDatos ? '' : `<div class="suma"><span>Suma de porcentajes</span><strong>${C.corto(res.suma)} %</strong></div>`;
  const harina = res.tieneSub ? `<div class="caja-surf harina-total"><span><span class="t">Harina total</span><br><span class="s">sub-receta + masa final</span></span><strong data-v="harina">${C.gramos(res.harinaTotal)} g</strong></div>` : '';
  const fijos = r.fijos.length ? `<section class="fijos"><span class="t">Además (cantidad fija)</span><span class="fichas">${r.fijos.map((f) => `<span class="ficha">${esc(f)}</span>`).join('')}</span></section>` : '';
  const notas = r.notas.trim() ? `<section class="notas"><h2>Notas</h2><div>${esc(r.notas.trim())}</div></section>` : '';
  const ayuda = sinDatos ? '' : '<p class="ayuda">Cualquier cantidad en gramos se puede editar: el resto se recalcula a partir de ese ingrediente.</p>';
  const hashEditar = `#/editar/${encodeURIComponent(r.id)}`;

  if (escritorio) {
    return `<div class="pantalla calculadora">
      ${cabEscritorio('Panificado', r.nombre, `<button class="btn-pastilla con-icono" data-accion="ir" data-hash="${hashEditar}">${I.editarChico}Editar</button>`)}
      <div class="columnas">
        <div class="col-a">${panel}${harina}${fijos}${notas}</div>
        <div class="col-b">${sinDatos ? '' : '<div class="cab-tabla"><span>Ingrediente</span><span>Gramos</span></div>'}${aviso}${ingredientes}${suma}${ayuda}</div>
      </div>
    </div>`;
  }
  return `<div class="pantalla calculadora">
    <header class="barra">
      <button class="btn-redondo" aria-label="Volver" data-accion="volver">${I.volver}</button>
      <h1>${esc(r.nombre)}</h1>
      <button class="btn-redondo" aria-label="Editar receta" data-accion="ir" data-hash="${hashEditar}">${I.editar}</button>
    </header>
    <div class="contenido">${panel}${aviso}${ingredientes}${suma}${harina}${fijos}${notas}${ayuda}</div>
  </div>`;
}

/** Actualiza los números de la calculadora sin redibujar (para no perder el foco). */
function refrescarCalc() {
  const r = porId()[estado.recetaVisible];
  if (!r || r.categoria !== 'pan') return;
  const c = estado.calc;
  const total = totalCalc(c);
  const res = C.calcularPan(r, total, porId());
  const poner = (clave, valor) => {
    const el = app.querySelector(`[data-v="${clave}"]`);
    if (!el || el === document.activeElement) return;
    if (el.tagName === 'INPUT') el.value = valor; else el.textContent = valor;
  };
  poner('total', C.corto(total));
  poner('unid', String(c.unid));
  poner('poru', C.corto(c.porU));
  poner('masa', C.gramos(total) + ' g');
  poner('harina', C.gramos(res.harinaTotal) + ' g');
  res.lineas.forEach((l, i) => {
    poner('g-' + i, C.gramos(l.gramos));
    if (l.desglose) l.desglose.lineas.forEach((s, j) => poner(`sub-${i}-${j}`, C.gramos(s.gramos)));
  });
}

// ---------- Receta general ----------
function vistaGeneral(r, escritorio) {
  if (estado.gen.id !== r.id) estado.gen = { id: r.id, porc: r.porciones };
  const res = C.calcularGeneral(r, estado.gen.porc);
  const porciones = `<section class="panel-oliva porciones">
      <span><span class="t">Porciones</span><br><span class="s">Receta base: ${r.porciones} ${r.porciones === 1 ? 'porción' : 'porciones'}</span></span>
      <span class="ctrl">
        <button class="menos" data-accion="porc" data-paso="-1" aria-label="Menos porciones">−</button>
        <output aria-live="polite">${estado.gen.porc}</output>
        <button class="mas" data-accion="porc" data-paso="1" aria-label="Más porciones">+</button>
      </span>
    </section>`;
  const ingredientes = `<h2 class="subtitulo">Ingredientes</h2>
    ${res.items.length ? `<div class="tabla">${res.items.map((it) => `<div class="fila"><span class="n">${esc(it.nombre)}</span><span class="q${it.sinCantidad ? ' tenue' : ''}">${esc(it.texto)}</span></div>`).join('')}</div>`
      : '<div class="vacio">Sin ingredientes cargados.</div>'}`;
  const pasos = `<h2 class="subtitulo">Pasos</h2>
    ${r.pasos.length ? `<ol class="pasos">${r.pasos.map((p, i) => `<li><span class="num">${i + 1}</span><span>${esc(p)}</span></li>`).join('')}</ol>`
      : '<div class="vacio">Sin pasos cargados.</div>'}`;
  const notas = r.notas.trim() ? `<section class="notas calida"><h2>Notas</h2><div>${esc(r.notas.trim())}</div></section>` : '';
  const hashEditar = `#/editar/${encodeURIComponent(r.id)}`;

  if (escritorio) {
    return `<div class="pantalla general">
      ${cabEscritorio('General', r.nombre, `<button class="btn-pastilla con-icono" data-accion="ir" data-hash="${hashEditar}">${I.editarChico}Editar</button>`)}
      <div class="columnas">
        <div class="col-a">${porciones}${ingredientes}</div>
        <div class="col-b">${pasos}${notas}</div>
      </div>
    </div>`;
  }
  return `<div class="pantalla general">
    <header class="barra">
      <button class="btn-redondo" aria-label="Volver" data-accion="volver">${I.volver}</button>
      <h1>${esc(r.nombre)}</h1>
      <button class="btn-redondo" aria-label="Editar receta" data-accion="ir" data-hash="${hashEditar}">${I.editar}</button>
    </header>
    <div class="contenido">${porciones}${ingredientes}${pasos}${notas}</div>
  </div>`;
}

// ---------- Editor ----------
function crearBorrador(r, categoria) {
  const b = {
    id: r ? r.id : null, nombre: r ? r.nombre : '', categoria: r ? r.categoria : categoria,
    peso: '', ingredientes: [], fijos: [], fijoTxt: '', porciones: '1', items: [], pasos: [], notas: r ? r.notas : '',
  };
  if (r && r.categoria === 'pan') {
    b.peso = C.corto(r.peso);
    b.ingredientes = r.ingredientes.map((i) => ({ nombre: i.nombre, pct: C.corto(i.pct), sub: i.sub }));
    b.fijos = [...r.fijos];
  }
  if (r && r.categoria === 'gen') {
    b.porciones = String(r.porciones);
    b.items = r.items.map((i) => ({ nombre: i.nombre, cant: i.cant === null ? '' : C.corto(i.cant), unidad: i.unidad }));
    b.pasos = [...r.pasos];
  }
  if (!b.ingredientes.length) b.ingredientes = [{ nombre: 'Harina', pct: '100', sub: null }];
  if (!b.items.length) b.items = [{ nombre: '', cant: '', unidad: '' }];
  if (!b.pasos.length) b.pasos = [''];
  return b;
}
const huellaBorrador = (b) => JSON.stringify({ ...b, fijoTxt: undefined });
const hayCambios = () => estado.borrador && huellaBorrador(estado.borrador) !== estado.borradorInicial;

function vistaEditor(p, id, escritorio) {
  const mapa = porId();
  if (!estado.borrador || (p === 'editar' && estado.borrador.id !== id) || (p === 'nueva' && estado.borrador.id)) {
    if (p === 'editar' && !mapa[id]) return null;
    estado.borrador = crearBorrador(p === 'editar' ? mapa[id] : null, id === 'gen' ? 'gen' : 'pan');
    estado.borradorInicial = huellaBorrador(estado.borrador);
    estado.selectorSub = false;
    estado.error = null;
  }
  const b = estado.borrador;
  const err = estado.error;
  const msj = (campo) => (err && err.campo === campo ? `<span class="msj-error">${esc(err.texto)}</span>` : '');

  const nombre = `<label class="campo"><span class="etq">Nombre</span>
      <input class="entrada${err && err.campo === 'nombre' ? ' error' : ''}" data-entrada="ed" data-campo="nombre" value="${esc(b.nombre)}" placeholder="Nombre de la receta">
      ${msj('nombre')}
    </label>`;
  const categoria = `<div class="campo"><span class="etq">Categoría</span>
      <div class="selector">
        <button data-accion="categoria" data-valor="pan" aria-pressed="${b.categoria === 'pan'}">Panificado</button>
        <button data-accion="categoria" data-valor="gen" aria-pressed="${b.categoria === 'gen'}">General</button>
      </div>
    </div>`;
  const notas = `<label class="campo"><span class="etq">Notas</span>
      <textarea class="area" data-entrada="ed" data-campo="notas" placeholder="Opcional">${esc(b.notas)}</textarea>
    </label>`;
  const eliminar = b.id ? '<button class="btn-eliminar" data-accion="eliminar">Eliminar receta</button>' : '';

  let colA = '';
  let colB = '';
  if (b.categoria === 'pan') {
    const suma = b.ingredientes.reduce((a, i) => a + C.aNumero(i.pct), 0);
    const bloqueadas = C.noUsablesComoSub(b.id || '__nueva__', recetas());
    const usadas = new Set(b.ingredientes.map((i) => i.sub).filter(Boolean));
    const opciones = recetas().filter((r) => r.categoria === 'pan' && !bloqueadas.has(r.id) && !usadas.has(r.id));
    const peso = `<label class="campo"><span class="etq">Peso base de masa</span>
        <span class="caja-num"><input inputmode="decimal" data-entrada="ed" data-campo="peso" value="${esc(b.peso)}" placeholder="0"><span class="u">g</span></span>
        ${msj('peso')}
      </label>`;
    const ingredientes = `<section class="campo">
        <div class="cab-sec"><span class="etq-sec" style="padding:0">Ingredientes</span><span class="suma-ed">Suma <strong data-v="suma-ed">${C.corto(suma)} %</strong></span></div>
        <div class="bloque">
          <div data-lista="ingredientes">
          ${b.ingredientes.map((x, i) => `<div class="fila-ed" data-fila="${i}">
            <span class="manija" data-manija="ingredientes" aria-hidden="true" title="Arrastrar para reordenar">${I.manija}</span>
            ${x.sub && mapa[x.sub]
              ? `<span class="sub-ed"><span class="ico">${I.enlace}</span><span class="txt"><span>${esc(mapa[x.sub].nombre)}</span><span>Sub-receta</span></span></span>`
              : `<input class="nom" data-entrada="ed-ing" data-i="${i}" data-campo="nombre" value="${esc(x.nombre)}" placeholder="Ingrediente" aria-label="Nombre del ingrediente">`}
            <span class="pct-ed"><input inputmode="decimal" data-entrada="ed-ing" data-i="${i}" data-campo="pct" value="${esc(x.pct)}" aria-label="Porcentaje de ${esc(x.nombre || 'ingrediente')}"><span>%</span></span>
            <button class="btn-borrar" data-accion="ing-borrar" data-i="${i}" aria-label="Eliminar ${esc(x.nombre || 'ingrediente')}">${I.borrar}</button>
          </div>`).join('')}
          </div>
          <div class="dos-botones">
            <button class="btn-agregar" data-accion="ing-agregar">${I.masChico}Ingrediente</button>
            <button class="btn-agregar" data-accion="sub-selector" aria-expanded="${estado.selectorSub}">${I.enlaceMedio}Sub-receta</button>
          </div>
          ${estado.selectorSub ? `<div class="selector-sub"><span class="t">Elegir la receta que se usa como ingrediente</span>
            <span class="fichas">${opciones.length ? opciones.map((r) => `<button data-accion="sub-elegir" data-id="${esc(r.id)}">${esc(r.nombre)}</button>`).join('') : '<span class="t">No hay otras recetas de panificado disponibles.</span>'}</span>
          </div>` : ''}
        </div>
        ${msj('ingredientes')}
        <span class="nota-campo">La harina, o la sub-receta base, va al 100 %. Se reordena arrastrando desde la manija.</span>
      </section>`;
    const fijos = `<section class="campo">
        <span class="etq-sec">Ingredientes fijos <span class="tenue">(fuera del porcentaje)</span></span>
        ${b.fijos.length ? `<span class="fichas">${b.fijos.map((f, i) => `<span class="ficha-fija">${esc(f)}<button data-accion="fijo-borrar" data-i="${i}" aria-label="Quitar ${esc(f)}">${I.cerrar}</button></span>`).join('')}</span>` : ''}
        <div class="fila-agregar">
          <input class="entrada" data-entrada="ed" data-campo="fijoTxt" value="${esc(b.fijoTxt)}" placeholder="Ej.: 1 huevo" aria-label="Nuevo ingrediente fijo" enterkeyhint="done">
          <button class="btn-mas-redondo" data-accion="fijo-agregar" aria-label="Agregar ingrediente fijo">${I.masMedio}</button>
        </div>
      </section>`;
    if (escritorio) { colA = nombre + categoria + peso + fijos + notas + eliminar; colB = ingredientes; }
    else colA = nombre + categoria + peso + ingredientes + fijos + notas + eliminar;
  } else {
    const porciones = `<label class="campo"><span class="etq">Rinde (porciones)</span>
        <span class="caja-num chica"><input inputmode="numeric" data-entrada="ed" data-campo="porciones" value="${esc(b.porciones)}"></span>
      </label>`;
    const items = `<section class="campo">
        <span class="etq-sec">Ingredientes</span>
        <div class="bloque">
          <div data-lista="items">
          ${b.items.map((x, i) => `<div class="fila-ed" data-fila="${i}">
            <span class="manija" data-manija="items" aria-hidden="true" title="Arrastrar para reordenar">${I.manija}</span>
            <input class="nom" data-entrada="ed-item" data-i="${i}" data-campo="nombre" value="${esc(x.nombre)}" placeholder="Ingrediente" aria-label="Ingrediente">
            <input class="mini cant" inputmode="decimal" data-entrada="ed-item" data-i="${i}" data-campo="cant" value="${esc(x.cant)}" placeholder="cant." aria-label="Cantidad">
            <input class="mini unidad" data-entrada="ed-item" data-i="${i}" data-campo="unidad" value="${esc(x.unidad)}" placeholder="unidad" aria-label="Unidad">
            <button class="btn-borrar" data-accion="item-borrar" data-i="${i}" aria-label="Eliminar ${esc(x.nombre || 'ingrediente')}">${I.borrar}</button>
          </div>`).join('')}
          </div>
          <button class="btn-agregar" data-accion="item-agregar">${I.masChico}Ingrediente</button>
        </div>
        <span class="nota-campo">Sin cantidad, el ingrediente se muestra como “a gusto” o con la unidad escrita.</span>
      </section>`;
    const pasos = `<section class="campo">
        <span class="etq-sec">Pasos</span>
        ${b.pasos.map((x, i) => `<div class="paso-ed"><span class="num">${i + 1}</span>
          <textarea data-entrada="ed-paso" data-i="${i}" placeholder="Describir el paso" aria-label="Paso ${i + 1}">${esc(x)}</textarea>
          <button class="btn-borrar" data-accion="paso-borrar" data-i="${i}" aria-label="Eliminar paso ${i + 1}">${I.borrar}</button>
        </div>`).join('')}
        <button class="btn-paso" data-accion="paso-agregar">${I.masChico}Paso</button>
      </section>`;
    if (escritorio) { colA = nombre + categoria + porciones + notas + eliminar; colB = items + pasos; }
    else colA = nombre + categoria + porciones + items + pasos + notas + eliminar;
  }

  const titulo = b.id ? 'Editar receta' : 'Nueva receta';
  if (escritorio) {
    return `<div class="pantalla editor">
      <div class="cab-esc"><h2>${titulo}</h2>
        <div class="acciones-cab"><button class="btn-pastilla" data-accion="cancelar">Cancelar</button><button class="btn-pastilla primario" data-accion="guardar">Guardar</button></div>
      </div>
      <div class="columnas editor-cols"><div class="col-a">${colA}</div><div class="col-b">${colB}</div></div>
    </div>`;
  }
  return `<div class="pantalla editor">
    <header class="barra con-linea">
      <button class="btn-pastilla" data-accion="cancelar">Cancelar</button>
      <span class="titulo-centro">${titulo}</span>
      <button class="btn-pastilla primario" data-accion="guardar">Guardar</button>
    </header>
    <div class="contenido">${colA}</div>
  </div>`;
}

function guardarBorrador() {
  const b = estado.borrador;
  if (!b) return;
  const nombre = b.nombre.trim();
  if (!nombre) return mostrarError('nombre', 'La receta necesita un nombre.');
  const id = b.id || D.nuevoId();
  let r;
  if (b.categoria === 'pan') {
    const peso = C.aNumero(b.peso);
    const ingredientes = b.ingredientes
      .filter((i) => i.nombre.trim() || i.sub)
      .map((i) => ({ nombre: i.nombre.trim(), pct: C.aNumero(i.pct), sub: i.sub || null }));
    if (!ingredientes.some((i) => i.pct > 0)) return mostrarError('ingredientes', 'Falta al menos un ingrediente con porcentaje.');
    if (peso <= 0) return mostrarError('peso', 'El peso base debe ser mayor a 0.');
    const fijos = [...b.fijos];
    if (b.fijoTxt.trim()) fijos.push(b.fijoTxt.trim());
    r = { id, nombre, categoria: 'pan', peso, ingredientes, fijos, notas: b.notas };
  } else {
    r = {
      id, nombre, categoria: 'gen',
      porciones: Math.max(1, Math.round(C.aNumero(b.porciones)) || 1),
      items: b.items.filter((i) => i.nombre.trim()).map((i) => ({
        nombre: i.nombre.trim(), cant: String(i.cant).trim() === '' ? null : C.aNumero(i.cant), unidad: i.unidad.trim(),
      })),
      pasos: b.pasos.map((p) => p.trim()).filter(Boolean),
      notas: b.notas,
    };
  }
  r = D.normalizar({ ...r, actualizado: new Date().toISOString() });
  const lista = recetas();
  const pos = lista.findIndex((x) => x.id === id);
  if (pos >= 0) lista[pos] = r; else lista.push(r);
  persistir();
  const eraNueva = !b.id;
  estado.borrador = null;
  estado.calc.id = null;
  estado.gen.id = null;
  aviso('Receta guardada');
  if (!eraNueva && history.state && history.state.app) history.back();
  else reemplazar('#/receta/' + encodeURIComponent(id));
}

function mostrarError(campo, texto) {
  estado.error = { campo, texto };
  render(true);
  const el = app.querySelector(campo === 'nombre' ? '[data-campo="nombre"]' : campo === 'peso' ? '[data-campo="peso"]' : '[data-lista="ingredientes"]');
  if (el) el.scrollIntoView({ block: 'center' });
}

async function eliminarReceta() {
  const b = estado.borrador;
  const usadaEn = recetas().filter((r) => r.categoria === 'pan' && r.ingredientes.some((i) => i.sub === b.id));
  const resp = await dialogo({
    titulo: `¿Eliminar “${b.nombre || 'esta receta'}”?`,
    texto: usadaEn.length
      ? `Se usa como sub-receta en: ${usadaEn.map((r) => r.nombre).join(', ')}. Allí quedará como un ingrediente común. Esta acción no se puede deshacer.`
      : 'Esta acción no se puede deshacer.',
    botones: [{ texto: 'Eliminar', valor: 'si', clase: 'peligro' }, { texto: 'Cancelar', valor: 'no' }],
  });
  if (resp !== 'si') return;
  const ahora = new Date().toISOString();
  estado.datos.recetas = recetas()
    .filter((r) => r.id !== b.id)
    .map((r) => (r.categoria === 'pan' && r.ingredientes.some((i) => i.sub === b.id)
      ? { ...r, actualizado: ahora, ingredientes: r.ingredientes.map((i) => (i.sub === b.id ? { ...i, sub: null } : i)) }
      : r));
  estado.datos.eliminadas[b.id] = ahora;
  persistir();
  estado.borrador = null;
  aviso('Receta eliminada');
  reemplazar('#/');
}

// ---------- Ajustes ----------
function vistaAjustes(escritorio) {
  const tema = temaActual();
  const sinConexion = 'serviceWorker' in navigator && !!navigator.serviceWorker.controller;
  const n = recetas().length;
  const contenido = `
    <section class="seccion"><h2>Apariencia</h2>
      <div class="selector grande">
        <button data-accion="tema" data-valor="claro" aria-pressed="${tema === 'claro'}">Claro</button>
        <button data-accion="tema" data-valor="oscuro" aria-pressed="${tema === 'oscuro'}">Oscuro</button>
      </div>
    </section>
    ${seccionSync()}
    <section class="seccion"><h2>Datos</h2>
      <button class="opcion" data-accion="exportar">${I.exportar}<span class="txt"><span>Exportar recetas</span><span>Descarga un archivo .json de respaldo</span></span></button>
      <button class="opcion" data-accion="importar">${I.importar}<span class="txt"><span>Importar recetas</span><span>Desde un archivo .json (también el de la app anterior)</span></span></button>
    </section>
    <section class="estado">
      <span class="punto${sinConexion ? '' : ' apagado'}" aria-hidden="true"></span>
      <span class="txt"><span>${sinConexion ? 'Disponible sin conexión' : 'Uso sin conexión no activo todavía'}</span>
      <span>${n} ${n === 1 ? 'receta guardada' : 'recetas guardadas'} en este dispositivo</span></span>
    </section>
    <p class="version">Recetario ${VERSION_APP}</p>`;
  if (escritorio) {
    return `<div class="pantalla ajustes">
      <div class="cab-esc"><h2>Ajustes</h2></div>
      <div class="ajustes-cuerpo">${contenido}</div>
    </div>`;
  }
  return `<div class="pantalla ajustes">
    <header class="barra">
      <button class="btn-redondo" aria-label="Volver" data-accion="volver">${I.volver}</button>
      <h1>Ajustes</h1>
    </header>
    <div class="contenido">${contenido}</div>
  </div>`;
}

function seccionSync() {
  const cfg = S.config();
  if (!cfg) {
    const f = estado.formSync;
    return `<section class="seccion"><h2>Sincronización</h2>
      <div class="caja-sync">
        <p class="txt-sync">Para ver las mismas recetas en el teléfono y en la PC. La forma más simple es escanear el código de vinculación que muestra un dispositivo ya conectado. También se pueden cargar los datos del servicio a mano.</p>
        <label class="campo"><span class="etq">Dirección del servicio</span>
          <input class="entrada chica" id="sync-url" data-entrada="cfg" data-campo="url" value="${esc(f.url)}" placeholder="https://script.google.com/macros/s/…/exec" autocomplete="off" spellcheck="false"></label>
        <label class="campo"><span class="etq">Clave</span>
          <input class="entrada chica" id="sync-clave" type="password" data-entrada="cfg" data-campo="clave" value="${esc(f.clave)}" autocomplete="off"></label>
        <button class="btn-pastilla primario ancho" data-accion="sync-conectar" ${estado.conectando ? 'disabled' : ''}>${estado.conectando ? 'Conectando…' : 'Conectar'}</button>
      </div>
    </section>`;
  }
  const est = estadoSync();
  let qr = '';
  if (estado.mostrarQR && window.qrcode) {
    const enlace = enlaceVinculo(cfg);
    const q = window.qrcode(0, 'M');
    q.addData(enlace);
    q.make();
    qr = `<div class="qr">
      <div class="qr-img">${q.createSvgTag({ cellSize: 4, margin: 3, scalable: true, alt: 'Código de vinculación' })}</div>
      <p>Abra la cámara del otro dispositivo y apunte a este código. Al abrir el enlace, la app pide confirmar la conexión. El enlace incluye la clave: no lo comparta.</p>
      <button class="btn-pastilla" data-accion="copiar-vinculo">Copiar enlace</button>
      <input class="oculto entrada chica" id="vinculo-texto" value="${esc(enlace)}" readonly tabindex="-1" aria-hidden="true">
    </div>`;
  }
  return `<section class="seccion"><h2>Sincronización</h2>
    <div class="caja-sync">
      <div class="estado-sync"><span class="punto ${est.clase}" data-sync="punto" aria-hidden="true"></span>
        <span class="txt"><span data-sync="largo">${esc(est.largo)}</span><span>Las recetas se guardan en su planilla de Google.</span></span></div>
      <div class="acciones-sync">
        <button class="btn-pastilla" data-accion="sync-ahora">Sincronizar ahora</button>
        <button class="btn-pastilla" data-accion="sync-qr" aria-expanded="${estado.mostrarQR}">${estado.mostrarQR ? 'Ocultar código' : 'Vincular otro dispositivo'}</button>
      </div>
      ${qr}
      <button class="btn-texto" data-accion="sync-desconectar">Desconectar este dispositivo</button>
    </div>
  </section>`;
}

const enlaceVinculo = (cfg) => location.origin + location.pathname + '#/vincular/' + D.codificarVinculo(cfg);

function cargarLibreriaQR() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((ok, mal) => {
    const s = document.createElement('script');
    s.src = 'js/lib/qrcode.js';
    s.onload = ok;
    s.onerror = mal;
    document.head.appendChild(s);
  });
}

function exportarRecetas() {
  const blob = new Blob([D.exportar(estado.datos)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `recetario-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  aviso('Archivo de respaldo descargado');
}

async function importarArchivo(archivo) {
  let nuevas;
  try {
    nuevas = D.leerImportacion(await archivo.text());
  } catch (e) {
    await dialogo({ titulo: 'No se pudo importar', texto: e.message, botones: [{ texto: 'Aceptar', valor: 'ok', clase: 'primario' }] });
    return;
  }
  let modo = 'combinar';
  if (recetas().length) {
    modo = await dialogo({
      titulo: `Importar ${nuevas.length} ${nuevas.length === 1 ? 'receta' : 'recetas'}`,
      texto: `Ya hay ${recetas().length} guardadas. Al combinar, las que tienen el mismo nombre se actualizan y el resto se agrega.`,
      botones: [
        { texto: 'Combinar', valor: 'combinar', clase: 'primario' },
        { texto: 'Reemplazar todas', valor: 'reemplazar', clase: 'peligro' },
        { texto: 'Cancelar', valor: 'cancelar' },
      ],
    });
    if (modo !== 'combinar' && modo !== 'reemplazar') return;
  }
  const antes = recetas();
  estado.datos.recetas = D.unirImportacion(antes, nuevas, modo);
  if (modo === 'reemplazar') {
    const ahora = new Date().toISOString();
    const quedan = new Set(estado.datos.recetas.map((r) => r.id));
    for (const r of antes) if (!quedan.has(r.id)) estado.datos.eliminadas[r.id] = ahora;
  }
  estado.calc.id = null;
  estado.gen.id = null;
  persistir();
  D.pedirAlmacenamientoPersistente();
  aviso(`Se importaron ${nuevas.length} ${nuevas.length === 1 ? 'receta' : 'recetas'}`);
  render(true);
}

// ---------- Sincronización ----------
function estadoSync() {
  const cfg = S.config();
  if (!cfg) return { clase: 'apagado', corto: '', largo: 'Sincronización desactivada', lateral: 'Configurar sincronización' };
  const ultimo = S.haceCuanto(cfg.ultimo);
  switch (sync.estado) {
    case 'sincronizando': return { clase: 'activo', corto: 'sincronizando…', largo: 'Sincronizando…', lateral: 'Sincronizando…' };
    case 'error': return { clase: 'error', corto: 'error al sincronizar', largo: sync.mensaje || 'No se pudo sincronizar.', lateral: 'Error al sincronizar' };
    case 'sin-red': return { clase: 'apagado', corto: 'sin conexión', largo: 'Sin conexión. Los cambios quedan guardados aquí y se envían al volver la red.', lateral: 'Sin conexión' };
    default: return cfg.ultimo
      ? { clase: 'ok', corto: 'sincronizado', largo: `Sincronizado ${ultimo}`, lateral: `Sincronizado ${ultimo}` }
      : { clase: 'activo', corto: 'conectando…', largo: 'Conectando…', lateral: 'Conectando…' };
  }
}

function mostrarEstadoSync() {
  const est = estadoSync();
  app.querySelectorAll('[data-sync="corto"]').forEach((el) => { el.textContent = est.corto ? ' · ' + est.corto : ''; });
  app.querySelectorAll('[data-sync="largo"]').forEach((el) => {
    el.textContent = el.closest('.lateral') ? est.lateral : est.largo;
  });
  app.querySelectorAll('[data-sync="punto"]').forEach((el) => { el.className = 'punto ' + est.clase; });
}

function ponerEstadoSync(e, mensaje = '') {
  sync.estado = e;
  sync.mensaje = mensaje;
  mostrarEstadoSync();
}

function programarSync() {
  if (!S.config()) return;
  clearTimeout(sync.temporizador);
  sync.temporizador = setTimeout(() => sincronizar(), 1500);
}

function redibujarTrasSync() {
  if (hayFocoEnCampo() || document.getElementById('dialogo').open) { sync.renderPendiente = true; return; }
  render(true);
}

async function sincronizar() {
  const cfg = S.config();
  if (!cfg) return;
  if (sync.enCurso) { sync.otraVez = true; return sync.enCurso; }
  if (!navigator.onLine) { ponerEstadoSync('sin-red'); return; }
  ponerEstadoSync('sincronizando');
  sync.enCurso = (async () => {
    try {
      const enviado = { recetas: recetas(), eliminadas: estado.datos.eliminadas };
      const huellaEnviada = D.huella(enviado);
      const r = await S.llamar(cfg, { accion: 'sincronizar', datos: enviado });
      const actual = { recetas: recetas(), eliminadas: estado.datos.eliminadas };
      if (D.huella(actual) !== huellaEnviada) sync.otraVez = true; // hubo cambios durante el envío
      const remoto = { recetas: (r.datos.recetas || []).map(D.normalizar).filter(Boolean), eliminadas: r.datos.eliminadas };
      const fusion = D.fusionar(remoto, actual);
      const cfgActual = S.config();
      if (!cfgActual || cfgActual.url !== cfg.url) return; // se desconectó mientras tanto
      if (D.huella(fusion) !== D.huella(actual)) {
        estado.datos.recetas = fusion.recetas;
        estado.datos.eliminadas = fusion.eliminadas;
        D.guardar(estado.datos);
        redibujarTrasSync();
      }
      S.guardarConfig({ ...cfgActual, ultimo: new Date().toISOString() });
      ponerEstadoSync('ok');
    } catch (e) {
      if (e.tipo === 'red' || e.tipo === 'ocupado') ponerEstadoSync(navigator.onLine ? 'error' : 'sin-red', e.message);
      else ponerEstadoSync('error', e.message || 'No se pudo sincronizar.');
    } finally {
      sync.enCurso = null;
      if (sync.otraVez) { sync.otraVez = false; setTimeout(sincronizar, 400); }
    }
  })();
  return sync.enCurso;
}

async function confirmarVinculo(cfg) {
  const actual = S.config();
  if (actual && actual.url === cfg.url && actual.clave === cfg.clave) {
    aviso('Este dispositivo ya está conectado.');
    return;
  }
  const r = await dialogo({
    titulo: '¿Conectar este dispositivo?',
    texto: 'Las recetas de este dispositivo se sincronizarán con su planilla de Google.',
    botones: [{ texto: 'Conectar', valor: 'si', clase: 'primario' }, { texto: 'Cancelar', valor: 'no' }],
  });
  if (r === 'si') conectar(cfg);
}

async function conectar(cfg) {
  cfg = { url: cfg.url.trim(), clave: cfg.clave.trim() };
  if (!/^(https:\/\/script\.google(usercontent)?\.com\/|http:\/\/localhost[:/])/.test(cfg.url)) {
    await dialogo({ titulo: 'Dirección no válida', texto: 'La dirección debe ser la de la aplicación web del script (empieza con https://script.google.com/).', botones: [{ texto: 'Aceptar', valor: 'ok', clase: 'primario' }] });
    return;
  }
  if (!cfg.clave) {
    await dialogo({ titulo: 'Falta la clave', texto: 'Escriba la clave configurada en el script.', botones: [{ texto: 'Aceptar', valor: 'ok', clase: 'primario' }] });
    return;
  }
  estado.conectando = true;
  render(true);
  let remoto;
  try {
    const r = await S.llamar(cfg, { accion: 'leer' });
    remoto = { recetas: (r.datos.recetas || []).map(D.normalizar).filter(Boolean), eliminadas: D.normalizarEliminadas(r.datos.eliminadas) };
  } catch (e) {
    estado.conectando = false;
    render(true);
    await dialogo({ titulo: 'No se pudo conectar', texto: e.message, botones: [{ texto: 'Aceptar', valor: 'ok', clase: 'primario' }] });
    return;
  }
  estado.conectando = false;
  const locales = recetas();
  if (remoto.recetas.length && locales.length) {
    const resp = await dialogo({
      titulo: 'Hay recetas en los dos lados',
      texto: `La planilla tiene ${remoto.recetas.length} y este dispositivo ${locales.length}. «Combinar» une las dos listas; si una receta tiene el mismo nombre en ambos lados, queda la de este dispositivo.`,
      botones: [
        { texto: 'Combinar', valor: 'combinar', clase: 'primario' },
        { texto: 'Usar solo las de la planilla', valor: 'planilla' },
        { texto: 'Cancelar', valor: 'cancelar' },
      ],
    });
    if (resp !== 'combinar' && resp !== 'planilla') { render(true); return; }
    if (resp === 'planilla') {
      estado.datos.recetas = remoto.recetas;
    } else {
      estado.datos.recetas = D.unirImportacion(remoto.recetas, locales, 'combinar');
    }
    estado.datos.eliminadas = remoto.eliminadas;
  } else if (remoto.recetas.length) {
    estado.datos.recetas = remoto.recetas;
    estado.datos.eliminadas = remoto.eliminadas;
  }
  D.guardar(estado.datos);
  S.guardarConfig({ ...cfg, ultimo: null });
  estado.formSync = { url: '', clave: '' };
  estado.calc.id = null;
  estado.gen.id = null;
  sync.estado = 'ok';
  render(true);
  await sincronizar();
  if (sync.estado === 'ok') aviso('Dispositivo conectado');
  render(true);
}

async function desconectar() {
  const r = await dialogo({
    titulo: '¿Desconectar este dispositivo?',
    texto: 'Las recetas quedan guardadas aquí, pero los cambios dejan de enviarse a la planilla y a los demás dispositivos.',
    botones: [{ texto: 'Desconectar', valor: 'si', clase: 'peligro' }, { texto: 'Cancelar', valor: 'no' }],
  });
  if (r !== 'si') return;
  S.guardarConfig(null);
  estado.mostrarQR = false;
  aviso('Sincronización desactivada');
  render(true);
}

// ---------- Arrastrar para reordenar ----------
function iniciarArrastre(manija, e) {
  const tipo = manija.dataset.manija;
  const contenedor = manija.closest('[data-lista]');
  const filas = [...contenedor.querySelectorAll(':scope > .fila-ed')];
  const fila = manija.closest('.fila-ed');
  const desde = filas.indexOf(fila);
  const rects = filas.map((f) => f.getBoundingClientRect());
  const alto = rects[desde].height;
  const y0 = e.clientY;
  let hasta = desde;
  fila.classList.add('arrastrando');
  manija.setPointerCapture(e.pointerId);

  const mover = (ev) => {
    const dy = ev.clientY - y0;
    fila.style.transform = `translateY(${dy}px)`;
    const centro = rects[desde].top + alto / 2 + dy;
    hasta = 0;
    filas.forEach((f, k) => { if (k !== desde && rects[k].top + rects[k].height / 2 < centro) hasta++; });
    filas.forEach((f, k) => {
      if (k === desde) return;
      let d = 0;
      if (desde < hasta && k > desde && k <= hasta) d = -alto;
      if (desde > hasta && k >= hasta && k < desde) d = alto;
      f.style.transform = d ? `translateY(${d}px)` : '';
    });
  };
  const terminar = () => {
    manija.removeEventListener('pointermove', mover);
    manija.removeEventListener('pointerup', terminar);
    manija.removeEventListener('pointercancel', terminar);
    if (hasta !== desde) {
      const arr = estado.borrador[tipo];
      const [el] = arr.splice(desde, 1);
      arr.splice(hasta, 0, el);
    }
    render(true);
  };
  manija.addEventListener('pointermove', mover);
  manija.addEventListener('pointerup', terminar);
  manija.addEventListener('pointercancel', terminar);
}

// ---------- Eventos ----------
const entradaArchivo = document.getElementById('archivo');
entradaArchivo.addEventListener('change', () => {
  const f = entradaArchivo.files[0];
  entradaArchivo.value = '';
  if (f) importarArchivo(f);
});

function enfocar(selector) {
  requestAnimationFrame(() => { const el = app.querySelector(selector); if (el) el.focus(); });
}

const acciones = {
  ir: (el, e) => { e.preventDefault(); ir(el.dataset.hash); },
  volver: () => volver(),
  abrir: (el, e) => { e.preventDefault(); ir('#/receta/' + encodeURIComponent(el.dataset.id)); },
  filtro: (el) => { estado.filtro = el.dataset.valor; render(true); },
  nueva: () => ir('#/nueva/' + (estado.filtro === 'gen' ? 'gen' : 'pan')),
  importar: () => entradaArchivo.click(),
  exportar: () => exportarRecetas(),
  tema: (el) => { estado.datos.ajustes.tema = el.dataset.valor; D.guardar(estado.datos); aplicarTema(); render(true); },

  modo: (el) => {
    const c = estado.calc;
    const nuevo = el.dataset.valor;
    if (nuevo === c.modo) return;
    if (nuevo === 'unid') { c.porU = Math.round((c.total / Math.max(1, c.unid)) * 10) / 10; }
    else { c.total = c.unid * c.porU; }
    c.modo = nuevo;
    render(true);
  },
  unid: (el) => { const c = estado.calc; c.unid = Math.max(1, Math.round(c.unid) + Number(el.dataset.paso)); refrescarCalc(); },
  poru: (el) => { const c = estado.calc; c.porU = Math.max(0, Math.round((c.porU + Number(el.dataset.paso)) * 10) / 10); refrescarCalc(); },
  desplegar: (el) => { const a = estado.calc.abiertos; a[el.dataset.i] = !a[el.dataset.i]; render(true); },
  porc: (el) => { estado.gen.porc = Math.max(1, estado.gen.porc + Number(el.dataset.paso)); render(true); },

  cancelar: () => volver(),
  guardar: () => guardarBorrador(),
  eliminar: () => eliminarReceta(),
  categoria: (el) => { estado.borrador.categoria = el.dataset.valor; estado.error = null; render(true); },
  'ing-agregar': () => {
    estado.borrador.ingredientes.push({ nombre: '', pct: '', sub: null });
    render(true);
    enfocar(`[data-entrada="ed-ing"][data-i="${estado.borrador.ingredientes.length - 1}"][data-campo="nombre"]`);
  },
  'ing-borrar': (el) => { estado.borrador.ingredientes.splice(Number(el.dataset.i), 1); render(true); },
  'sub-selector': () => { estado.selectorSub = !estado.selectorSub; render(true); },
  'sub-elegir': (el) => {
    const r = porId()[el.dataset.id];
    estado.borrador.ingredientes.push({ nombre: r.nombre, pct: '', sub: r.id });
    estado.selectorSub = false;
    render(true);
    enfocar(`[data-entrada="ed-ing"][data-i="${estado.borrador.ingredientes.length - 1}"][data-campo="pct"]`);
  },
  'fijo-agregar': () => {
    const b = estado.borrador;
    if (b.fijoTxt.trim()) { b.fijos.push(b.fijoTxt.trim()); b.fijoTxt = ''; }
    render(true);
    enfocar('[data-campo="fijoTxt"]');
  },
  'fijo-borrar': (el) => { estado.borrador.fijos.splice(Number(el.dataset.i), 1); render(true); },
  'item-agregar': () => {
    estado.borrador.items.push({ nombre: '', cant: '', unidad: '' });
    render(true);
    enfocar(`[data-entrada="ed-item"][data-i="${estado.borrador.items.length - 1}"][data-campo="nombre"]`);
  },
  'item-borrar': (el) => { estado.borrador.items.splice(Number(el.dataset.i), 1); render(true); },
  'paso-agregar': () => {
    estado.borrador.pasos.push('');
    render(true);
    enfocar(`[data-entrada="ed-paso"][data-i="${estado.borrador.pasos.length - 1}"]`);
  },
  'paso-borrar': (el) => { estado.borrador.pasos.splice(Number(el.dataset.i), 1); render(true); },

  'sync-conectar': () => conectar({ ...estado.formSync }),
  'sync-ahora': () => sincronizar(),
  'sync-desconectar': () => desconectar(),
  'sync-qr': async () => {
    if (!estado.mostrarQR) {
      try { await cargarLibreriaQR(); } catch (e) { aviso('No se pudo generar el código.'); return; }
    }
    estado.mostrarQR = !estado.mostrarQR;
    render(true);
  },
  'copiar-vinculo': async () => {
    const campo = document.getElementById('vinculo-texto');
    try {
      await navigator.clipboard.writeText(campo.value);
      aviso('Enlace copiado');
    } catch (e) {
      campo.classList.remove('oculto');
      campo.select();
      aviso('Seleccione y copie el enlace');
    }
  },
};

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-accion]');
  if (!el || !app.contains(el)) return;
  const f = acciones[el.dataset.accion];
  if (f) f(el, e);
});

const entradas = {
  buscar: (el) => {
    estado.q = el.value;
    // Redibuja solo la lista para no cerrar el teclado
    const region = app.querySelector('[data-region="lista"]');
    if (region) region.innerHTML = htmlTarjetas(esEscritorio() ? estado.recetaVisible : null);
  },
  total: (el) => { estado.calc.total = C.aNumero(el.value); refrescarCalc(); },
  unid: (el) => { estado.calc.unid = Math.max(0, Math.round(C.aNumero(el.value))); refrescarCalc(); },
  poru: (el) => { estado.calc.porU = C.aNumero(el.value); refrescarCalc(); },
  ing: (el) => {
    const r = porId()[estado.recetaVisible];
    if (!r) return;
    const ing = r.ingredientes[Number(el.dataset.i)];
    const nuevoTotal = C.totalDesdeIngrediente(C.aNumero(el.value), ing.pct, C.sumaPorcentajes(r));
    if (nuevoTotal === null) return;
    const c = estado.calc;
    if (c.modo === 'unid') c.porU = c.unid > 0 ? nuevoTotal / c.unid : nuevoTotal;
    else c.total = nuevoTotal;
    refrescarCalc();
  },
  ed: (el) => {
    estado.borrador[el.dataset.campo] = el.value;
    if (estado.error && estado.error.campo === el.dataset.campo) {
      estado.error = null;
      el.classList.remove('error');
      const msj = el.closest('.campo')?.querySelector('.msj-error');
      if (msj) msj.remove();
    }
  },
  'ed-ing': (el) => {
    estado.borrador.ingredientes[Number(el.dataset.i)][el.dataset.campo] = el.value;
    const suma = estado.borrador.ingredientes.reduce((a, i) => a + C.aNumero(i.pct), 0);
    const s = app.querySelector('[data-v="suma-ed"]');
    if (s) s.textContent = C.corto(suma) + ' %';
  },
  'ed-item': (el) => { estado.borrador.items[Number(el.dataset.i)][el.dataset.campo] = el.value; },
  'ed-paso': (el) => { estado.borrador.pasos[Number(el.dataset.i)] = el.value; },
  cfg: (el) => { estado.formSync[el.dataset.campo] = el.value; },
};

app.addEventListener('input', (e) => {
  const el = e.target.closest('[data-entrada]');
  if (!el) return;
  const f = entradas[el.dataset.entrada];
  if (f) f(el);
});

// Al tocar un número, se selecciona entero para reemplazarlo con un solo gesto.
app.addEventListener('focusin', (e) => {
  const el = e.target;
  if (el.matches('input[inputmode]')) setTimeout(() => { try { el.select(); } catch (_) {} }, 0);
});
app.addEventListener('focusout', (e) => {
  if (e.target.matches('[data-entrada="total"], [data-entrada="unid"], [data-entrada="poru"], [data-entrada="ing"]')) {
    setTimeout(refrescarCalc, 0);
  }
  if (sync.renderPendiente) setTimeout(() => { if (sync.renderPendiente && !hayFocoEnCampo()) render(true); }, 0);
});

app.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('[data-campo="fijoTxt"]')) { e.preventDefault(); acciones['fijo-agregar'](); }
  else if (e.key === 'Enter' && e.target.matches('input[inputmode]')) e.target.blur();
});

app.addEventListener('pointerdown', (e) => {
  const m = e.target.closest('[data-manija]');
  if (m && estado.borrador) { e.preventDefault(); iniciarArrastre(m, e); }
});

document.getElementById('dialogo').addEventListener('close', () => {
  if (sync.renderPendiente) setTimeout(() => { if (sync.renderPendiente && !hayFocoEnCampo()) render(true); }, 0);
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (!estado.datos.ajustes.tema) aplicarTema();
});
mqEscritorio.addEventListener('change', () => render(true));

window.addEventListener('online', () => sincronizar());
window.addEventListener('offline', () => { if (S.config()) ponerEstadoSync('sin-red'); });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const cfg = S.config();
  if (cfg && (!cfg.ultimo || Date.now() - new Date(cfg.ultimo).getTime() > 30000)) sincronizar();
});
setInterval(() => {
  if (document.visibilityState === 'visible') {
    if (S.config()) sincronizar();
  }
}, 5 * 60 * 1000);
setInterval(mostrarEstadoSync, 60 * 1000); // actualiza "hace X min"

// ---------- Inicio ----------
aplicarTema();
render();
if (S.config()) sincronizar();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (rutaActual().p === 'ajustes') render(true);
  });
}
if (recetas().length) D.pedirAlmacenamientoPersistente();
