// Boletería del Metropolitano de Techo: tribuna → bloque → silla → boleta con la vista.
// Las zonas salen de máscaras renderizadas en el 3D con la misma cámara de cada foto (zonas/*.png):
// cada zona es un color plano; aquí se lee el color bajo el mouse y se tiñe solo esa zona.
import { TRIBUNAS, BLOQUES_AGOTADOS, PALCO, MONEDA } from './datos.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = $('[data-escenario]'), cuadro = $('[data-cuadro]'), siguiente = $('[data-siguiente]'), video = $('[data-video]');
const capaZona = $('[data-zona]'), capaAgotado = $('[data-agotado]'), etiqueta = $('[data-etiqueta]');
const panel = $('[data-panel]'), rejilla = $('[data-rejilla]'), lista = $('[data-lista]');
const boleta = $('[data-boleta]'), velo = $('[data-velo]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const W = 1344, H = 756;
const RESALTE = [217, 164, 65], GRIS = [128, 128, 128];

// ---------- disponibilidad de ejemplo (determinística: siempre las mismas sillas vendidas)
const azar = (txt) => { let h = 2166136261; for (const c of txt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
let bloques = {};
const precioBloque = (b) => { const p = TRIBUNAS[b.tribuna].precio; return p[Math.min(b.bandeja, p.length - 1)]; };
const vendida = (b, f, n) => {
  if (BLOQUES_AGOTADOS.includes(b.id)) return true;
  const base = TRIBUNAS[b.tribuna].agotado + (azar(b.id) - 0.5) * 0.35;
  return azar(`${b.id}·${f}·${n}`) < Math.min(0.95, Math.max(0.04, base - f * 0.004));
};
function prepararBloques(mapa) {
  for (const b of mapa) {
    let total = 0, libres = 0;
    b.filas.forEach((n, i) => { for (let k = 1; k <= n; k++) { total++; if (!vendida(b, i + 1, k)) libres++; } });
    bloques[b.id] = { ...b, total, libres, precio: precioBloque(b) };
  }
}
const resumenTribuna = (t) => {
  const bs = Object.values(bloques).filter(b => b.tribuna === t);
  return { libres: bs.reduce((a, b) => a + b.libres, 0), desde: Math.min(...TRIBUNAS[t].precio) };
};
const nombreBandeja = (b) => TRIBUNAS[b.tribuna].precio.length > 1 ? (b.bandeja ? 'Bandeja alta' : 'Bandeja baja') : 'Bandeja única';

// ---------- máscaras de zonas
const cacheVistas = {};
const cargarImagen = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
async function cargarVista(nombre) {
  if (cacheVistas[nombre]) return cacheVistas[nombre];
  const [zonas, img] = await Promise.all([fetch(`zonas/mascara-${nombre}.json`).then(r => r.json()), cargarImagen(`zonas/mascara-${nombre}.png`)]);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, idx = new Uint8Array(W * H).fill(255);
  const pal = zonas.map(z => [1, 3, 5].map(i => parseInt(z.color.slice(i, i + 2), 16)));
  const suma = zonas.map(() => [0, 0, 0]);
  for (let p = 0; p < W * H; p++) {
    const r = d[p * 4], gg = d[p * 4 + 1], b = d[p * 4 + 2];
    if (r + gg + b < 120) continue;
    let mejor = -1, dist = 6000;
    for (let k = 0; k < pal.length; k++) {
      const dr = r - pal[k][0], dg = gg - pal[k][1], db = b - pal[k][2], e = dr * dr + dg * dg + db * db;
      if (e < dist) { dist = e; mejor = k; }
    }
    if (mejor >= 0) { idx[p] = mejor; const s = suma[mejor]; s[0] += p % W; s[1] += (p / W) | 0; s[2]++; }
  }
  zonas.forEach((z, k) => { const s = suma[k]; z.cx = s[2] ? s[0] / s[2] / W : 0.5; z.cy = s[2] ? s[1] / s[2] / H : 0.5; });
  return (cacheVistas[nombre] = { zonas, idx });
}
function pintar(canvas, vista, elegir, rgb) {
  const g = canvas.getContext('2d'), im = g.createImageData(W, H), d = im.data;
  if (vista) for (let p = 0; p < W * H; p++) {
    const k = vista.idx[p];
    if (k !== 255 && elegir(vista.zonas[k])) { d[p * 4] = rgb[0]; d[p * 4 + 1] = rgb[1]; d[p * 4 + 2] = rgb[2]; d[p * 4 + 3] = 255; }
  }
  g.putImageData(im, 0, 0);
}

// ---------- estado
const estado = { vista: 'general', tribuna: null, bloque: null, fila: null, numero: null, vip: false, ocupado: false };
let vista = null, encima = null;

function textos() {
  const intro = $('.intro');
  const poner = () => {
    if (estado.vista === 'general') {
      $('[data-ante]').textContent = '01 — Metropolitano de Techo';
      $('[data-titulo]').textContent = 'Escoge tu silla, mira la cancha';
      $('[data-bajada]').textContent = 'Pasa por encima de una tribuna para ver su precio. Haz clic y bajas hasta ella.';
    } else {
      const t = TRIBUNAS[estado.tribuna], r = resumenTribuna(estado.tribuna);
      $('[data-ante]').textContent = `02 — ${t.techo ? 'Con techo' : 'Sin techo'} · Desde ${MONEDA(r.desde)}`;
      $('[data-titulo]').textContent = t.nombre;
      $('[data-bajada]').textContent = `${t.texto} Escoge un bloque.`;
    }
  };
  if (reduce) return poner();
  intro.classList.add('cambiando');
  setTimeout(() => { poner(); intro.classList.remove('cambiando'); }, 200);
}
function pasos() {
  const actual = estado.vista === 'general' ? 1 : estado.numero ? 4 : estado.bloque ? 3 : 2;
  document.querySelectorAll('[data-paso]').forEach(li => {
    const n = +li.dataset.paso;
    li.toggleAttribute('aria-current', n === actual); if (n === actual) li.setAttribute('aria-current', 'step');
    li.classList.toggle('hecho', n < actual);
  });
}
function hash() {
  const partes = [estado.tribuna, estado.bloque, estado.numero && `${estado.fila}-${estado.numero}`, estado.vip && 'vip'].filter(Boolean);
  history.replaceState(null, '', partes.length ? '#' + partes.join('/') : location.pathname);
}

function pintarLista() {
  lista.replaceChildren();
  const item = (nombre, dato, alHacer, apretado, deshabilitado) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="nombre"></span><span class="dato"></span>`;
    b.querySelector('.nombre').textContent = nombre;
    b.querySelector('.dato').innerHTML = '';
    b.querySelector('.dato').append(dato, ' ', Object.assign(document.createElement('span'), { className: 'flecha', textContent: '→' }));
    b.setAttribute('aria-pressed', String(!!apretado)); b.disabled = !!deshabilitado;
    b.addEventListener('click', alHacer); lista.append(b);
  };
  if (estado.vista === 'general') {
    for (const id of ['occidental-norte', 'occidental-sur', 'norte', 'oriental']) {
      const t = TRIBUNAS[id], r = resumenTribuna(id);
      item(t.nombre, `Desde ${MONEDA(r.desde)} · ${r.libres.toLocaleString('es-CO')} libres`, () => irATribuna(id));
    }
  } else {
    const bs = Object.values(bloques).filter(b => b.tribuna === estado.tribuna).sort((a, b) => a.id.localeCompare(b.id, 'es', { numeric: true }));
    for (const b of bs) item(`Bloque ${b.id}`, b.libres ? `${MONEDA(b.precio)} · ${b.libres} libres` : 'Agotado', () => abrirBloque(b.id), b.id === estado.bloque, !b.libres);
  }
}

// ---------- mouse sobre el escenario
function zonaEn(e) {
  if (!vista) return null;
  const r = esc.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
  if (x < 0 || y < 0 || x >= W || y >= H) return null;
  const k = vista.idx[y * W + x];
  return k === 255 ? null : vista.zonas[k];
}
function mostrarEtiqueta(z, e) {
  const r = esc.getBoundingClientRect();
  let ante, nombre, precio, libres, agotada = false;
  if (estado.vista === 'general') {
    const t = TRIBUNAS[z.id], s = resumenTribuna(z.id);
    ante = t.techo ? 'Con techo' : 'Sin techo'; nombre = t.nombre; precio = `Desde ${MONEDA(s.desde)}`; libres = `${s.libres.toLocaleString('es-CO')} libres`;
  } else {
    const b = bloques[z.id]; if (!b) return;
    ante = `${TRIBUNAS[b.tribuna].nombre} · ${nombreBandeja(b)}`; nombre = `Bloque ${b.id}`;
    precio = MONEDA(b.precio); agotada = !b.libres; libres = agotada ? 'Agotado' : `${b.libres} libres`;
  }
  $('[data-e-ante]').textContent = ante; $('[data-e-nombre]').textContent = nombre;
  $('[data-e-precio]').textContent = precio; $('[data-e-libres]').textContent = libres;
  etiqueta.classList.toggle('agotada', agotada);
  etiqueta.hidden = false;
  const w = etiqueta.offsetWidth, h = etiqueta.offsetHeight;
  let x = e.clientX - r.left + 18, y = e.clientY - r.top + 18;
  if (x + w > r.width - 8) x = e.clientX - r.left - w - 18;
  if (y + h > r.height - 8) y = e.clientY - r.top - h - 18;
  etiqueta.style.setProperty('--ex', x + 'px'); etiqueta.style.setProperty('--ey', y + 'px');
}
const zonaAgotada = (z) => estado.vista !== 'general' && bloques[z.id] && !bloques[z.id].libres;
let pendiente = false, ultimo = null;
esc.addEventListener('pointermove', (e) => { ultimo = e; if (!pendiente) { pendiente = true; requestAnimationFrame(revisar); } }, { passive: true });
esc.addEventListener('pointerleave', () => { encima = null; capaZona.classList.remove('activa'); etiqueta.hidden = true; esc.classList.remove('encima'); });
function revisar() {
  pendiente = false;
  if (estado.ocupado || !ultimo || ultimo.target.closest('[data-panel], .volver')) { etiqueta.hidden = true; capaZona.classList.remove('activa'); return; }
  const z = zonaEn(ultimo);
  if (!z) { encima = null; capaZona.classList.remove('activa'); etiqueta.hidden = true; esc.classList.remove('encima'); return; }
  if (z !== encima) {
    encima = z;
    pintar(capaZona, vista, (q) => q === z && !zonaAgotada(q), RESALTE);
    capaZona.classList.toggle('activa', !zonaAgotada(z));
  }
  esc.classList.toggle('encima', !zonaAgotada(z));
  mostrarEtiqueta(z, ultimo);
}
esc.addEventListener('click', (e) => {
  if (estado.ocupado || e.target.closest('[data-panel], .volver')) return;
  const z = zonaEn(e); if (!z) return;
  if (estado.vista === 'general') irATribuna(z.id);
  else if (!zonaAgotada(z)) abrirBloque(z.id);
});

// ---------- vistas
async function usarVista(nombre) {
  vista = await cargarVista(nombre);
  pintar(capaAgotado, vista, (z) => zonaAgotada(z), GRIS);
  encima = null; capaZona.classList.remove('activa');
}
const cargarEn = (img, src) => new Promise((ok) => { img.onload = img.onerror = () => ok(); img.src = src; });

async function irATribuna(id, { animar = true } = {}) {
  if (estado.ocupado || !TRIBUNAS[id]) return;
  const t = TRIBUNAS[id], desde = vista;
  estado.ocupado = true; esc.classList.add('ocupado'); etiqueta.hidden = true; cerrarPanel(false);
  const listo = Promise.all([cargarImagen(t.foto), cargarVista(t.mascara)]);
  if (animar && !reduce && t.video) {
    // la bajada real: el primer cuadro del video es la vista general y el último, la foto de la tribuna
    video.src = t.video; video.hidden = false; video.currentTime = 0;
    try {
      await video.play();
      await new Promise((ok) => video.addEventListener('ended', ok, { once: true }));
    } catch { /* si el navegador no deja reproducir, pasa directo */ }
    await listo; await cargarEn(cuadro, t.foto);
    video.hidden = true; video.removeAttribute('src'); video.load();
  } else if (animar && !reduce && desde) {
    // sin video todavía: acercamiento a la tribuna y fundido a su foto
    const z = desde.zonas.find(q => q.id === id);
    cuadro.style.setProperty('--ox', (z ? z.cx * 100 : 50) + '%'); cuadro.style.setProperty('--oy', (z ? z.cy * 100 : 50) + '%');
    const zoom = cuadro.animate([{ transform: 'scale(1)' }, { transform: 'scale(2.6)' }], { duration: 1100, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    await listo; await cargarEn(siguiente, t.foto); siguiente.hidden = false;
    const fundido = siguiente.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 650, delay: 450, easing: 'cubic-bezier(0,0,.2,1)', fill: 'forwards' });
    await Promise.all([zoom.finished, fundido.finished]);
    await cargarEn(cuadro, t.foto); zoom.cancel(); fundido.cancel(); siguiente.hidden = true;
  } else {
    await listo; await cargarEn(cuadro, t.foto);
  }
  cuadro.alt = `Tribuna ${t.nombre} vista desde el aire.`;
  Object.assign(estado, { vista: 'tribuna', tribuna: id, bloque: null, fila: null, numero: null, vip: false });
  await usarVista(t.mascara);
  $('[data-volver]').hidden = false;
  estado.ocupado = false; esc.classList.remove('ocupado');
  textos(); pasos(); pintarLista(); hash();
}

async function irAGeneral() {
  if (estado.ocupado || estado.vista === 'general') return;
  estado.ocupado = true; esc.classList.add('ocupado'); cerrarPanel(false); etiqueta.hidden = true;
  await cargarEn(siguiente, 'media/vista-general.jpg'); siguiente.hidden = false;
  if (!reduce) await siguiente.animate([{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards' }).finished;
  await cargarEn(cuadro, 'media/vista-general.jpg'); siguiente.getAnimations().forEach(a => a.cancel()); siguiente.hidden = true;
  cuadro.alt = 'El Metropolitano de Techo visto desde arriba.';
  Object.assign(estado, { vista: 'general', tribuna: null, bloque: null, fila: null, numero: null, vip: false });
  await usarVista('k0-tribunas');
  $('[data-volver]').hidden = true;
  estado.ocupado = false; esc.classList.remove('ocupado');
  textos(); pasos(); pintarLista(); hash();
}
$('[data-volver]').addEventListener('click', irAGeneral);
document.querySelectorAll('[data-ir="general"]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); cerrarBoleta(); irAGeneral(); }));

// ---------- bloque y sillas
function abrirBloque(id) {
  const b = bloques[id]; if (!b || !b.libres) return;
  etiqueta.hidden = true; capaZona.classList.remove('activa'); encima = null;
  estado.bloque = id; estado.fila = estado.numero = null;
  $('[data-p-ante]').textContent = `${TRIBUNAS[b.tribuna].nombre} · ${nombreBandeja(b)} · ${MONEDA(b.precio)}`;
  $('[data-p-titulo]').textContent = `Bloque ${b.id}`;
  $('[data-p-estado]').textContent = `${b.libres} sillas libres de ${b.total}. Escoge una.`;
  const max = Math.max(...b.filas), ancho = (matchMedia('(max-width: 900px)').matches ? innerWidth - 44 : Math.min(440, esc.clientWidth * 0.46) - 44) - 30;
  const s = Math.max(matchMedia('(pointer: coarse)').matches ? 13 : 7, Math.min(20, Math.floor((ancho - (max - 1) * 3) / max)));
  rejilla.style.setProperty('--s', s + 'px');
  rejilla.replaceChildren();
  for (let f = b.filas.length; f >= 1; f--) {
    const fila = document.createElement('div'); fila.className = 'fila';
    fila.append(Object.assign(document.createElement('span'), { className: 'fila-n', textContent: f }));
    for (let n = 1; n <= b.filas[f - 1]; n++) {
      const btn = document.createElement('button');
      btn.className = 'silla'; btn.dataset.f = f; btn.dataset.n = n;
      const v = vendida(b, f, n); btn.disabled = v;
      btn.setAttribute('aria-label', `Fila ${f}, silla ${n}${v ? ', vendida' : ''}`);
      btn.setAttribute('aria-pressed', 'false');
      fila.append(btn);
    }
    rejilla.append(fila);
  }
  panel.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('abierto')));
  $('[data-p-titulo]').setAttribute('tabindex', '-1'); setTimeout(() => $('[data-p-titulo]').focus({ preventScroll: true }), 50);
  pasos(); pintarLista(); hash();
}
function cerrarPanel(actualizar = true) {
  if (panel.hidden) return;
  panel.classList.remove('abierto');
  setTimeout(() => { if (!panel.classList.contains('abierto')) panel.hidden = true; }, 330);
  if (actualizar) { estado.bloque = estado.fila = estado.numero = null; pasos(); pintarLista(); hash(); }
}
$('[data-cerrar-panel]').addEventListener('click', () => cerrarPanel());
const datoSilla = (btn) => { const b = bloques[estado.bloque]; return `Fila ${btn.dataset.f} · Silla ${btn.dataset.n} · ${MONEDA(b.precio)}`; };
rejilla.addEventListener('pointerover', (e) => { const btn = e.target.closest('.silla'); if (btn && !btn.disabled) $('[data-p-estado]').textContent = datoSilla(btn); });
rejilla.addEventListener('focusin', (e) => { const btn = e.target.closest('.silla'); if (btn) $('[data-p-estado]').textContent = datoSilla(btn); });
rejilla.addEventListener('click', (e) => {
  const btn = e.target.closest('.silla'); if (!btn || btn.disabled) return;
  rejilla.querySelectorAll('[aria-pressed="true"]').forEach(x => x.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', 'true');
  estado.fila = +btn.dataset.f; estado.numero = +btn.dataset.n; estado.vip = false;
  abrirBoleta(btn);
});

// ---------- boleta
let volverA = null;
function llenarBoleta() {
  const b = bloques[estado.bloque], t = TRIBUNAS[b.tribuna];
  const foto = $('[data-b-foto]'), campos = $('[data-b-campos]'), acciones = $('[data-b-acciones]');
  boleta.classList.toggle('vip', estado.vip);
  foto.classList.remove('lista-img');
  const campo = (dt, dd) => { const d = document.createElement('div'); d.append(Object.assign(document.createElement('dt'), { textContent: dt }), Object.assign(document.createElement('dd'), { textContent: dd })); return d; };
  const boton = (texto, clase, alHacer, href) => {
    const el = document.createElement(href ? 'a' : 'button'); el.className = 'boton ' + clase;
    el.append(texto, ' '); if (clase === 'boton-dorado') el.append(Object.assign(document.createElement('span'), { className: 'flecha', textContent: '→' }));
    if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener'; } else el.addEventListener('click', alHacer);
    return el;
  };
  if (!estado.vip) {
    foto.src = t.vista; foto.alt = `Vista de referencia desde la tribuna ${t.nombre}.`;
    $('[data-b-chip]').textContent = 'Tu vista';
    $('[data-b-ante]').textContent = `${t.nombre} · ${nombreBandeja(b)}`;
    $('[data-b-titulo]').textContent = `Bloque ${b.id}`;
    campos.replaceChildren(campo('Fila', estado.fila), campo('Silla', estado.numero), campo('Puerta', t.puerta.replace('Puerta ', '')));
    $('[data-b-precio]').textContent = MONEDA(b.precio);
    acciones.replaceChildren(
      boton(`Mejorar a palco VIP · +${MONEDA(PALCO.precio - b.precio)}`, 'boton-dorado', () => { estado.vip = true; llenarBoleta(); hash(); pasos(); }),
      boton('Mantener mi silla y comprar', 'boton-claro', null, 'https://boletas.interbogota.com'),
    );
  } else {
    foto.src = PALCO.foto; foto.alt = 'Vista desde el palco VIP de la Occidental Norte.';
    $('[data-b-chip]').textContent = 'Tu vista desde el palco';
    $('[data-b-ante]').textContent = PALCO.nivel;
    $('[data-b-titulo]').textContent = PALCO.nombre;
    campos.replaceChildren(campo('Sillas', PALCO.sillas), campo('Entrada', PALCO.entrada));
    $('[data-b-precio]').textContent = MONEDA(PALCO.precio);
    acciones.replaceChildren(
      boton('Comprar el palco', 'boton-dorado', null, 'https://boletas.interbogota.com'),
      boton(`Volver a mi silla · ${b.id}, fila ${estado.fila}, silla ${estado.numero}`, 'boton-claro', () => { estado.vip = false; llenarBoleta(); hash(); }),
    );
  }
  const revelar = () => requestAnimationFrame(() => requestAnimationFrame(() => foto.classList.add('lista-img')));
  if (foto.complete && foto.naturalWidth) revelar(); else foto.onload = revelar;
}
function abrirBoleta(origen) {
  volverA = origen || document.activeElement;
  llenarBoleta();
  velo.hidden = boleta.hidden = false;
  requestAnimationFrame(() => requestAnimationFrame(() => { velo.classList.add('visible'); boleta.classList.add('visible'); }));
  setTimeout(() => $('[data-cerrar-boleta]').focus({ preventScroll: true }), 60);
  pasos(); hash();
}
function cerrarBoleta() {
  if (boleta.hidden) return;
  velo.classList.remove('visible'); boleta.classList.remove('visible');
  setTimeout(() => { velo.hidden = boleta.hidden = true; }, 330);
  estado.numero = estado.fila = null; estado.vip = false;
  rejilla.querySelectorAll('[aria-pressed="true"]').forEach(x => x.setAttribute('aria-pressed', 'false'));
  pasos(); hash();
  volverA?.focus?.({ preventScroll: true });
}
$('[data-cerrar-boleta]').addEventListener('click', cerrarBoleta);
velo.addEventListener('click', cerrarBoleta);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { if (!boleta.hidden) cerrarBoleta(); else if (!panel.hidden) cerrarPanel(); return; }
  if (e.key === 'Tab' && !boleta.hidden) {
    const foc = [...boleta.querySelectorAll('button, a[href]')]; const a = foc[0], z = foc[foc.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  }
});

// ---------- arranque (restaura el estado desde la URL: #oriental/OR-105/6-10/vip)
const mapa = await fetch('zonas/mapa-sillas.json').then(r => r.json());
prepararBloques(mapa);
await usarVista('k0-tribunas');
pintarLista(); pasos();
const [t0, b0, s0, v0] = decodeURIComponent(location.hash.slice(1)).split('/');
if (TRIBUNAS[t0]) {
  await irATribuna(t0, { animar: false });
  if (bloques[b0]?.tribuna === t0) {
    abrirBloque(b0);
    const [f, n] = (s0 || '').split('-').map(Number);
    const btn = rejilla.querySelector(`[data-f="${f}"][data-n="${n}"]`);
    if (btn && !btn.disabled) { btn.setAttribute('aria-pressed', 'true'); estado.fila = f; estado.numero = n; estado.vip = v0 === 'vip'; abrirBoleta(btn); }
  }
}
// precarga suave del video y de las fotos de las tribunas
window.requestIdleCallback?.(() => { Object.values(TRIBUNAS).forEach(t => cargarImagen(t.foto).catch(() => {})); });
window.boletas = { estado, bloques, irATribuna, abrirBloque };
