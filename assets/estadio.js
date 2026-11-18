// Estadio Metropolitano de Techo en three.js — paso 1 del método: el estadio en código.
// Cada silla es una instancia de un solo InstancedMesh y sabe su tribuna, bloque, fila y número.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CANCHA, PASTO, FRANJA, SEGMENTOS, TRIBUNAS, TORRES, ALTO_TORRE, BANCOS, ANEXOS, GIRO_NORTE,
  SIN_ARBOLES, CAMARAS,
} from './datos.js';

// ---------- utilidades de coordenadas (x local, y local, altura) → three (X, Y arriba, Z = -y)
const P = (x, y, h = 0) => new THREE.Vector3(x, h, -y);
const D = (x, y) => new THREE.Vector3(x, 0, -y); // dirección horizontal
const ARRIBA = new THREE.Vector3(0, 1, 0);
const azar = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

// ---------- escena
const lienzo = document.getElementById('lienzo');
const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(40, 1, 0.3, 60000);
const controles = new OrbitControls(camara, lienzo);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.maxPolarAngle = Math.PI * 0.495;
controles.minDistance = 4;
controles.maxDistance = 1400;

// Cielo y sol de media tarde, entrando desde el occidente (detrás de las tribunas techadas).
const cielo = new Sky();
cielo.scale.setScalar(45000);
const u = cielo.material.uniforms;
u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
const dirSol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 24), THREE.MathUtils.degToRad(-115));
u.sunPosition.value.copy(dirSol);
escena.add(cielo);

const pmrem = new THREE.PMREMGenerator(renderer);
{
  const e = new THREE.Scene(); const c = new Sky(); c.scale.setScalar(3000);
  Object.assign(c.material.uniforms.sunPosition.value, dirSol);
  ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'].forEach(k => (c.material.uniforms[k].value = u[k].value));
  e.add(c);
  escena.environment = pmrem.fromScene(e, 0.04).texture;
  escena.environmentIntensity = 0.55;
}

const sol = new THREE.DirectionalLight(0xfff1dc, 3.1);
sol.position.copy(dirSol).multiplyScalar(300);
sol.castShadow = true;
sol.shadow.mapSize.set(4096, 4096);
Object.assign(sol.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 700 });
sol.shadow.bias = -0.0004;
sol.shadow.normalBias = 0.04;
escena.add(sol, sol.target);
escena.add(new THREE.HemisphereLight(0xcfe3ff, 0x4a5a3a, 0.55));
escena.fog = new THREE.Fog(0xb9c8d6, 900, 26000);

// ---------- materiales
const M = {
  concreto: new THREE.MeshStandardMaterial({ color: 0xb7b2a8, roughness: 0.92 }),
  concretoOscuro: new THREE.MeshStandardMaterial({ color: 0x8e8a83, roughness: 0.95 }),
  escalera: new THREE.MeshStandardMaterial({ color: 0xe7c321, roughness: 0.7 }),
  acero: new THREE.MeshStandardMaterial({ color: 0xd9dcdd, roughness: 0.45, metalness: 0.6 }),
  aceroOscuro: new THREE.MeshStandardMaterial({ color: 0x6d7275, roughness: 0.5, metalness: 0.5 }),
  vidrio: new THREE.MeshPhysicalMaterial({ color: 0x2a3a44, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.55, envMapIntensity: 1.6 }),
  blanco: new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.6 }),
  sintetico: new THREE.MeshStandardMaterial({ color: 0x1c2a22, roughness: 0.95 }),
  baranda: new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.4, metalness: 0.7 }),
  amarillo: new THREE.MeshStandardMaterial({ color: 0xe9bf1a, roughness: 0.45, metalness: 0.3 }),
  malla: new THREE.MeshStandardMaterial({ color: 0x1d2420, roughness: 0.6, metalness: 0.4, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }),
  lona: new THREE.MeshStandardMaterial({ color: 0xf4f4f1, roughness: 0.75, side: THREE.DoubleSide }),
  concretoTecho: new THREE.MeshStandardMaterial({ color: 0xdcd9d2, roughness: 0.85 }),
  pantalla: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, roughness: 0.25, metalness: 0.2 }),
  torre: new THREE.MeshStandardMaterial({ color: 0xd9dbd8, roughness: 0.5, metalness: 0.5 }),
};

// ---------- texturas dibujadas
function texturaCanvas(w, h, dibujar, repetir) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  dibujar(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}

function texturaPasto() {
  const ppm = 18, W = (PASTO.x1 - PASTO.x0) * ppm, H = (PASTO.y1 - PASTO.y0) * ppm;
  return texturaCanvas(W, H, (g) => {
    const X = (x) => (x - PASTO.x0) * ppm, Y = (y) => (PASTO.y1 - y) * ppm;
    // franjas de corte a lo ancho (como en el satélite)
    const franjas = 18, alto = (PASTO.y1 - PASTO.y0) / franjas;
    for (let i = 0; i < franjas; i++) {
      g.fillStyle = i % 2 ? '#3d7a2e' : '#346c27';
      g.fillRect(0, i * alto * ppm, W, alto * ppm + 1);
    }
    // grano
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n * 1.2; d[i + 2] += n * 0.6; }
    g.putImageData(img, 0, 0);
    // líneas
    g.strokeStyle = 'rgba(245,245,240,.92)'; g.fillStyle = 'rgba(245,245,240,.92)';
    g.lineWidth = 0.12 * ppm;
    const a = CANCHA.ancho / 2, l = CANCHA.largo / 2, cx = CANCHA.cx, cy = CANCHA.cy;
    const rect = (x0, y0, x1, y1) => g.strokeRect(X(cx + x0), Y(cy + y1), (x1 - x0) * ppm, (y1 - y0) * ppm);
    rect(-a, -l, a, l);
    g.beginPath(); g.moveTo(X(cx - a), Y(cy)); g.lineTo(X(cx + a), Y(cy)); g.stroke();
    g.beginPath(); g.arc(X(cx), Y(cy), 9.15 * ppm, 0, Math.PI * 2); g.stroke();
    const punto = (x, y) => { g.beginPath(); g.arc(X(x), Y(y), 0.2 * ppm, 0, Math.PI * 2); g.fill(); };
    punto(cx, cy);
    for (const s of [1, -1]) {
      rect(-20.16, s > 0 ? l - 16.5 : -l, 20.16, s > 0 ? l : -l + 16.5);
      rect(-9.16, s > 0 ? l - 5.5 : -l, 9.16, s > 0 ? l : -l + 5.5);
      punto(cx, cy + s * (l - 11));
      // medialuna del área
      g.save(); g.beginPath(); g.rect(0, s > 0 ? Y(cy + l - 16.5) : 0, W, s > 0 ? H : Y(cy - l + 16.5)); g.clip();
      g.beginPath(); g.arc(X(cx), Y(cy + s * (l - 11)), 9.15 * ppm, 0, Math.PI * 2); g.stroke(); g.restore();
      for (const e of [-1, 1]) { g.beginPath(); g.arc(X(cx + e * a), Y(cy + s * l), 1 * ppm, 0, Math.PI * 2); g.stroke(); }
    }
  });
}

function texturaLamina(color) {
  // lámina corrugada: ondas finas a lo largo de la caída del techo
  return texturaCanvas(64, 512, (g, w, h) => {
    const c = new THREE.Color(color);
    for (let x = 0; x < w; x++) {
      const k = 0.82 + 0.18 * Math.sin((x / w) * Math.PI * 2 * 4);
      g.fillStyle = `rgb(${(c.r * 255 * k) | 0},${(c.g * 255 * k) | 0},${(c.b * 255 * k) | 0})`;
      g.fillRect(x, 0, 1, h);
    }
    g.globalAlpha = 0.08; g.fillStyle = '#000';
    for (let i = 0; i < 40; i++) g.fillRect(0, Math.random() * h, w, Math.random() * 6);
  }, true);
}

function texturaValla() {
  return texturaCanvas(2048, 64, (g, w, h) => {
    g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = '700 40px "Owners", "Hanken Grotesk", sans-serif'; g.textBaseline = 'middle';
    const textos = ['INTERNACIONAL DE BOGOTÁ', 'BOLETAS EN INTERBOGOTA.COM', 'INTER BOGOTÁ'];
    let x = 30, i = 0;
    while (x < w) { const t = textos[i++ % textos.length]; g.fillText(t, x, h / 2 + 2); x += g.measureText(t).width + 90; }
  }, true);
}

// ---------- suelo satelital + árboles
const cargador = new THREE.TextureLoader();
const LADO_SUELO = 520;
const suelo = new THREE.Mesh(
  new THREE.PlaneGeometry(LADO_SUELO, LADO_SUELO),
  new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 1 }),
);
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
escena.add(suelo);
// tierra más allá del satélite, para que no se vea el borde desde lejos
const tierra = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 1 }));
tierra.rotation.x = -Math.PI / 2; tierra.position.y = -1.5; escena.add(tierra);

cargador.load('assets/suelo.jpg', (t) => {
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  suelo.material.map = t; suelo.material.needsUpdate = true;
  sembrarArboles(t.image);
});

function sembrarArboles(img) {
  const N = LADO_SUELO, c = document.createElement('canvas'); c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, N, N);
  const d = g.getImageData(0, 0, N, N).data;
  const fuera = (x, y) => SIN_ARBOLES.some(z => x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1);
  const puntos = [];
  const paso = 4.2;
  for (let y = -N / 2 + 4; y < N / 2 - 4; y += paso) {
    for (let x = -N / 2 + 4; x < N / 2 - 4; x += paso) {
      const jx = x + (azar() - 0.5) * paso, jy = y + (azar() - 0.5) * paso;
      if (fuera(jx, jy)) continue;
      const i = Math.floor(N / 2 - jy) * N + Math.floor(jx + N / 2);
      const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], l = (r + gg + b) / 3;
      // copa de árbol: verde oscuro y con textura (las copas tienen sombra interna, los techos no)
      const i2 = i + 2 * N, r2 = d[i2 * 4], g2 = d[i2 * 4 + 1], b2 = d[i2 * 4 + 2];
      const var_ = Math.abs(r + gg + b - r2 - g2 - b2);
      if (gg > r * 1.12 && gg > b * 1.18 && l < 70 && l > 12 && var_ > 6) puntos.push([jx, jy, l]);
    }
  }
  const copa = new THREE.IcosahedronGeometry(1, 1);
  const tronco = new THREE.CylinderGeometry(0.12, 0.2, 1, 6); tronco.translate(0, 0.5, 0);
  const mCopa = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });
  const mTronco = new THREE.MeshStandardMaterial({ color: 0x4b3a2a, roughness: 1 });
  const copas = new THREE.InstancedMesh(copa, mCopa, puntos.length * 3);
  const troncos = new THREE.InstancedMesh(tronco, mTronco, puntos.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), col = new THREE.Color();
  puntos.forEach(([x, y, l], k) => {
    const alto = 5 + azar() * 5 + (70 - l) * 0.05, radio = 1.9 + azar() * 1.4;
    q.setFromAxisAngle(ARRIBA, azar() * 6.28);
    s.set(radio, radio * (0.8 + azar() * 0.35), radio);
    col.setHSL(0.22 + azar() * 0.08, 0.32 + azar() * 0.18, 0.13 + azar() * 0.08);
    for (let j = 0; j < 3; j++) {
      const a = azar() * 6.28, r = j ? radio * (0.45 + azar() * 0.25) : 0, k3 = j ? 0.62 + azar() * 0.2 : 1;
      s.set(radio * k3, radio * k3 * (0.75 + azar() * 0.3), radio * k3);
      m.compose(P(x + Math.cos(a) * r, y + Math.sin(a) * r, alto - radio * 0.4 + (j ? radio * 0.35 : 0)), q, s);
      copas.setMatrixAt(k * 3 + j, m); copas.setColorAt(k * 3 + j, col.clone().offsetHSL(0, 0, (azar() - 0.5) * 0.04));
    }
    s.set(1, alto - radio * 0.6, 1); m.compose(P(x, y, 0), q, s); troncos.setMatrixAt(k, m);
  });
  copas.castShadow = copas.receiveShadow = true; troncos.castShadow = true;
  escena.add(copas, troncos);
  estado.arboles = puntos.length; pintarEstado();
}

// ---------- cancha
function plano(x0, x1, y0, y1, h, mat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), mat);
  m.rotation.x = -Math.PI / 2; m.position.copy(P((x0 + x1) / 2, (y0 + y1) / 2, h)); m.receiveShadow = true;
  escena.add(m); return m;
}
plano(-49, 45, -63, 62, 0.1, M.concretoOscuro);
plano(FRANJA.x0, FRANJA.x1, FRANJA.y0, FRANJA.y1, 0.16, M.sintetico);
plano(PASTO.x0, PASTO.x1, PASTO.y0, PASTO.y1, 0.2, new THREE.MeshStandardMaterial({ map: texturaPasto(), roughness: 0.88 }));

function arco(y) {
  const s = Math.sign(y), g = new THREE.Group(), r = 0.06;
  const palo = (a, b) => {
    const v = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, v.length(), 10), M.blanco);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(ARRIBA, v.normalize()); m.castShadow = true; g.add(m);
  };
  const w = 7.32 / 2, h = 2.44, f = 2;
  palo(P(-w, y, 0), P(-w, y, h)); palo(P(w, y, 0), P(w, y, h)); palo(P(-w, y, h), P(w, y, h));
  palo(P(-w, y + s * f, 0), P(-w, y + s * f, h * 0.8)); palo(P(w, y + s * f, 0), P(w, y + s * f, h * 0.8));
  const red = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 1 });
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(2 * w, h * 0.8), red); fondo.position.copy(P(0, y + s * f, h * 0.4)); g.add(fondo);
  const techoRed = new THREE.Mesh(new THREE.PlaneGeometry(2 * w, f), red); techoRed.rotation.x = -Math.PI / 2; techoRed.position.copy(P(0, y + s * f / 2, h * 0.9)); g.add(techoRed);
  escena.add(g);
}
arco(CANCHA.largo / 2); arco(-CANCHA.largo / 2);

// vallas publicitarias
{
  const mat = new THREE.MeshStandardMaterial({ map: texturaValla(), roughness: 0.6 });
  const valla = (a, b) => {
    const v = b.clone().sub(a), L = v.length(), t = mat.map.clone(); t.repeat.set(L / 32, 1); t.needsUpdate = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(L, 0.9, 0.12), [M.concretoOscuro, M.concretoOscuro, M.concretoOscuro, M.concretoOscuro, new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 })]);
    m.position.copy(a).add(b).multiplyScalar(0.5).setY(0.45);
    m.rotation.y = -Math.atan2(-(b.z - a.z), b.x - a.x);
    m.castShadow = true; escena.add(m);
  };
  // en las fotos no hay vallas; quedan listas para la versión con marca del Inter
  if (location.search.includes('vallas')) { valla(P(38.5, -50), P(38.5, 50)); valla(P(-26, 56.5), P(26, 56.5)); }
}

// bancos y túneles curvos frente a la Occidental (fotos IMG_9178, IMG_9180)
{
  const claro = new THREE.MeshPhysicalMaterial({ color: 0xe3ebe8, roughness: 0.15, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const blanco = new THREE.MeshStandardMaterial({ color: 0xf6f6f4, roughness: 0.5, side: THREE.DoubleSide });
  const sillaBanco = new THREE.MeshStandardMaterial({ color: 0xf0c419, roughness: 0.45 });
  for (const b of BANCOS) {
    const g = new THREE.Group();
    const casco = new THREE.CylinderGeometry(1.3, 1.3, b.largo, 28, 1, true, Math.PI * 0.72, Math.PI * 0.78);
    casco.rotateX(Math.PI / 2); casco.scale(1, 1.55, 1);
    const m = new THREE.Mesh(casco, b.tipo === 'blanco' ? blanco : claro); m.castShadow = b.tipo === 'blanco'; g.add(m);
    const piso = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, b.largo), M.sintetico); piso.position.y = 0.05; g.add(piso);
    if (b.tipo === 'claro') {
      const n = Math.floor(b.largo / 0.55);
      const filaSillas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), sillaBanco, n);
      const mm = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { mm.makeTranslation(-0.6, 0.5, -b.largo / 2 + 0.3 + i * 0.55); filaSillas.setMatrixAt(i, mm); }
      g.add(filaSillas);
    }
    g.position.copy(P(-41.6, b.y)); escena.add(g);
  }
}

// ---------- tribunas
const silla = (() => {
  const asiento = new THREE.BoxGeometry(0.44, 0.07, 0.4); asiento.translate(0, 0.43, -0.02);
  const espaldar = new THREE.BoxGeometry(0.44, 0.4, 0.06); espaldar.rotateX(-0.14); espaldar.translate(0, 0.68, 0.19);
  const pata = new THREE.BoxGeometry(0.08, 0.4, 0.08); pata.translate(0, 0.2, 0.05);
  return mergeGeometries([asiento, espaldar, pata]);
})();

const sillas = []; // {seg, tribuna, bandeja, bloque, fila, numero, pos, normal}
const piezasConcreto = [], piezasEscalera = [], piezasBaranda = [], piezasAmarillo = [], piezasMalla = [], piezasTecho = [], piezasPalco = [];

function marco(seg) {
  const A = new THREE.Vector2(...seg.A), B = new THREE.Vector2(...seg.B);
  const uu = B.clone().sub(A), L = uu.length(); uu.normalize();
  const n = new THREE.Vector2(-uu.y, uu.x);
  const medio = A.clone().add(B).multiplyScalar(0.5);
  if (n.dot(medio) < 0) n.negate();
  // punto local (s a lo largo, d hacia atrás, h altura) → mundo
  const enMundo = (s, d, h) => P(A.x + uu.x * s + n.x * d, A.y + uu.y * s + n.y * d, h);
  return { A, B, u: uu, n, L, enMundo, u3: D(uu.x, uu.y), n3: D(n.x, n.y) };
}

function perfil(seg) {
  // filas con (d inicio de la huella, altura de la huella), y el contorno del graderío
  const filas = []; let d = 0, h = seg.base;
  seg.bandejas.forEach((b, ib) => {
    if (b.salto) { d += b.salto; }
    if (b.subida) { h += b.subida; }
    for (let i = 0; i < b.filas; i++) { h += b.contra; filas.push({ d, h, huella: b.huella, bandeja: ib, fila: i + 1 }); d += b.huella; }
  });
  return { filas, fondo: d, alto: h, atras: d + 2.25 };
}

function extruirPerfil(seg, mf, pf, s0, s1, mat, lista) {
  const forma = new THREE.Shape();
  forma.moveTo(0, 0); forma.lineTo(0, seg.base);
  let dPrev = 0, hPrev = seg.base;
  for (const f of pf.filas) {
    if (f.d > dPrev + 1e-3) { forma.lineTo(f.d, hPrev); } // pasillo de bandeja
    forma.lineTo(f.d, f.h); forma.lineTo(f.d + f.huella, f.h);
    dPrev = f.d + f.huella; hPrev = f.h;
  }
  // pasillo de remate de 2 m y muro bajo al fondo (la baranda amarilla va encima)
  forma.lineTo(pf.fondo + 2, pf.alto); forma.lineTo(pf.fondo + 2, pf.alto + 0.35);
  forma.lineTo(pf.atras, pf.alto + 0.35); forma.lineTo(pf.atras, 0);
  forma.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(forma, { depth: s1 - s0, bevelEnabled: false, curveSegments: 1 });
  // ejes: forma.x → n, forma.y → arriba, extrusión → u
  const m4 = new THREE.Matrix4().makeBasis(mf.n3, ARRIBA, mf.u3);
  let origen = mf.enMundo(s0, 0, 0);
  if (m4.determinant() < 0) { m4.makeBasis(mf.n3, ARRIBA, mf.u3.clone().negate()); origen = mf.enMundo(s1, 0, 0); }
  m4.setPosition(origen);
  geo.applyMatrix4(m4);
  lista.push(geo);
  return geo;
}

function caja(lista, centro, tam, quat) {
  const g = new THREE.BoxGeometry(tam.x, tam.y, tam.z);
  g.applyMatrix4(new THREE.Matrix4().compose(centro, quat, new THREE.Vector3(1, 1, 1)));
  lista.push(g);
}

function baranda(mf, q, d, h, L) {
  for (const k of [0.5, 1.05]) caja(piezasAmarillo, mf.enMundo(L / 2, d, h + k), new THREE.Vector3(L, 0.07, 0.07), q);
  for (let s = 0; s <= L + 0.01; s += 1.8) caja(piezasAmarillo, mf.enMundo(Math.min(s, L), d, h + 0.55), new THREE.Vector3(0.06, 1.1, 0.06), q);
}

function construirSegmento(seg) {
  const mf = marco(seg), pf = perfil(seg);
  extruirPerfil(seg, mf, pf, 0, mf.L, M.concreto, piezasConcreto);
  // orientación con +Z local hacia atrás (n) y +X a lo largo (u)
  const base = new THREE.Matrix4().makeBasis(mf.u3, ARRIBA, mf.n3);
  const qSeg = new THREE.Quaternion().setFromRotationMatrix(base.determinant() > 0 ? base : new THREE.Matrix4().makeBasis(mf.u3.clone().negate(), ARRIBA, mf.n3));

  // escaleras pintadas en cada pasillo
  const anchoPasillo = 1.4;
  for (const p of seg.pasillos) {
    for (const f of pf.filas) {
      // dos peldaños por fila, pintados en huella y contrahuella (desde la cancha se ven las franjas amarillas)
      const c = (pf.filas[pf.filas.indexOf(f) - 1]?.h ?? seg.base);
      const r = f.h - c;
      // peldaño intermedio, apoyado en la huella de la fila anterior
      caja(piezasEscalera, mf.enMundo(p, f.d - f.huella / 4, c + r / 4), new THREE.Vector3(anchoPasillo, r / 2, f.huella / 2), qSeg);
      // pintura sobre la huella y la mitad alta de la contrahuella
      caja(piezasEscalera, mf.enMundo(p, f.d + f.huella / 2 - 0.01, f.h - r / 4 + 0.01), new THREE.Vector3(anchoPasillo, r / 2 + 0.02, f.huella + 0.02), qSeg);
    }
    // baranda central del pasillo
    const f0 = pf.filas[0], f1 = pf.filas[pf.filas.length - 1];
    const a = mf.enMundo(p, f0.d, f0.h + 1.0), b = mf.enMundo(p, f1.d + f1.huella, f1.h + 1.0);
    const v = b.clone().sub(a), g = new THREE.CylinderGeometry(0.03, 0.03, v.length(), 6);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(ARRIBA, v.normalize()), new THREE.Vector3(1, 1, 1)));
    piezasBaranda.push(g);
  }
  // frente: malla oscura en las tribunas abiertas, baranda amarilla en las techadas (como en las fotos)
  if (seg.techo) baranda(mf, qSeg, -0.1, seg.base, mf.L);
  else {
    caja(piezasMalla, mf.enMundo(mf.L / 2, -0.25, seg.base + 1.25), new THREE.Vector3(mf.L, 2.5, 0.02), qSeg);
    for (let s = 0; s <= mf.L; s += 3) caja(piezasBaranda, mf.enMundo(s, -0.25, seg.base + 1.25), new THREE.Vector3(0.08, 2.5, 0.08), qSeg);
  }
  if (seg.barandaAtras) baranda(mf, qSeg, pf.atras - 0.15, pf.alto + 0.35, mf.L);

  // sillas: bloques entre pasillos
  const cortes = [0, ...seg.pasillos.map(p => [p - anchoPasillo / 2, p + anchoPasillo / 2]).flat(), mf.L];
  const bloques = [];
  for (let i = 0; i < cortes.length; i += 2) if (cortes[i + 1] - cortes[i] > 1.4) bloques.push([cortes[i] + 0.3, cortes[i + 1] - 0.3]);
  for (const f of pf.filas) {
    bloques.forEach(([s0, s1], ib) => {
      const n = Math.floor((s1 - s0) / 0.5), sobra = (s1 - s0) - n * 0.5;
      for (let k = 0; k < n; k++) {
        const s = s0 + sobra / 2 + 0.25 + k * 0.5;
        sillas.push({
          seg: seg.id, tribuna: seg.tribuna, bandeja: f.bandeja, bloque: ib + 1, fila: f.fila, numero: k + 1,
          s, filaSeg: pf.filas.indexOf(f), filasSeg: pf.filas.length, L: mf.L,
          pos: mf.enMundo(s, f.d + f.huella * 0.42, f.h), q: qSeg,
        });
      }
    });
  }

  // edificio detrás + palcos + techo
  let dAtras = pf.atras;
  if (seg.edificio) {
    const fondo = seg.edificio.fondo;
    caja(piezasConcreto, mf.enMundo(mf.L / 2, dAtras + fondo / 2, pf.alto / 2 + 0.55), new THREE.Vector3(mf.L, pf.alto + 1.1, fondo), qSeg);
  }
  if (seg.palco) {
    const { fondo, alto, cajas } = seg.palco, h0 = pf.alto + 1.1;
    const piso = new THREE.Mesh(new THREE.BoxGeometry(mf.L, 0.3, fondo), M.concretoOscuro);
    piso.position.copy(mf.enMundo(mf.L / 2, dAtras + fondo / 2, h0 + 0.15)); piso.quaternion.copy(qSeg);
    const vidrio = new THREE.Mesh(new THREE.BoxGeometry(mf.L - 1, alto - 0.4, fondo - 0.4), M.vidrio);
    vidrio.position.copy(mf.enMundo(mf.L / 2, dAtras + fondo / 2, h0 + 0.3 + (alto - 0.4) / 2)); vidrio.quaternion.copy(qSeg);
    const losa = new THREE.Mesh(new THREE.BoxGeometry(mf.L, 0.35, fondo + 0.6), M.concretoOscuro);
    losa.position.copy(mf.enMundo(mf.L / 2, dAtras + fondo / 2 - 0.3, h0 + alto)); losa.quaternion.copy(qSeg);
    [piso, losa].forEach(o => { o.castShadow = o.receiveShadow = true; escena.add(o); });
    escena.add(vidrio);
    for (let i = 0; i <= cajas; i++) {
      const sDiv = 0.5 + (mf.L - 1) * i / cajas;
      caja(piezasBaranda, mf.enMundo(sDiv, dAtras + 0.25, h0 + alto / 2), new THREE.Vector3(0.12, alto - 0.3, 0.12), qSeg);
      // división entre palcos y muro del fondo
      caja(piezasPalco, mf.enMundo(sDiv, dAtras + fondo / 2 + 0.3, h0 + 0.3 + (alto - 0.6) / 2), new THREE.Vector3(0.12, alto - 0.6, fondo - 0.8), qSeg);
    }
    caja(piezasPalco, mf.enMundo(mf.L / 2, dAtras + fondo - 0.1, h0 + alto / 2), new THREE.Vector3(mf.L, alto, 0.2), qSeg);
    // dos filas de sillas de cuero por palco, mirando a la cancha
    const ancho = (mf.L - 1) / cajas, sillasPalco = [];
    for (let k = 0; k < cajas; k++) for (let fila = 0; fila < 2; fila++) for (let j = 0; j < 4; j++) {
      const sx = 0.5 + ancho * k + ancho * (j + 0.5) / 4;
      sillasPalco.push(mf.enMundo(sx, dAtras + 1.4 + fila * 1.3, h0 + 0.3 + fila * 0.35));
    }
    const geoSillon = new THREE.BoxGeometry(0.62, 0.9, 0.62); geoSillon.translate(0, 0.45, 0);
    const sillones = new THREE.InstancedMesh(geoSillon, new THREE.MeshStandardMaterial({ color: 0x1b1b1d, roughness: 0.55 }), sillasPalco.length);
    sillasPalco.forEach((pp, k) => sillones.setMatrixAt(k, new THREE.Matrix4().compose(pp, qSeg, new THREE.Vector3(1, 1, 1))));
    sillones.castShadow = true; escena.add(sillones);
    estado.palcos = cajas;
    palcoInfo = { mf, dAtras, h0, alto, cajas, L: mf.L };
  }
  if (seg.techo) {
    const t = seg.techo, d0 = t.desde, d1 = pf.atras + (seg.edificio ? seg.edificio.fondo : 0);
    const prof = d1 - d0, largo = mf.L + 2;
    const pendiente = Math.atan2(t.fondo - t.frente, prof), largoCaida = Math.hypot(prof, t.fondo - t.frente);
    const qTecho = qSeg.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -pendiente));
    const enTecho = (geo, s, dLocal, abajo) => {
      // dLocal: 0 = frente del techo; abajo: metros bajo la cara de la losa
      geo.translate(0, -abajo, dLocal - largoCaida / 2);
      geo.applyMatrix4(new THREE.Matrix4().compose(mf.enMundo(s, (d0 + d1) / 2, (t.frente + t.fondo) / 2), qTecho, new THREE.Vector3(1, 1, 1)));
      return geo;
    };
    if (t.tipo === 'concreto') {
      // losa en voladizo con nervios por debajo y un canto grueso al frente (fotos IMG_9176 y video)
      piezasTecho.push(enTecho(new THREE.BoxGeometry(largo, 0.4, largoCaida), mf.L / 2, largoCaida / 2, 0));
      for (let s = -1 + t.nervios / 2; s < mf.L + 1; s += t.nervios) {
        piezasTecho.push(enTecho(new THREE.BoxGeometry(0.28, 0.85, largoCaida - 0.4), s, largoCaida / 2 + 0.2, 0.6));
      }
      piezasTecho.push(enTecho(new THREE.BoxGeometry(largo, 1.15, 0.45), mf.L / 2, 0.22, 0.38));
      for (let s = 0; s <= mf.L; s += t.nervios * 2) caja(piezasConcreto, mf.enMundo(s, d1 - 0.5, t.fondo / 2), new THREE.Vector3(0.6, t.fondo, 0.6), qSeg);
    } else {
      // lona blanca tensada en vanos, festoneada al frente, con mástiles atrás (video, cuadro 2)
      const vanos = t.vanos, nx = 10, nd = 12, pos = [], idx = [];
      for (let v = 0; v < vanos; v++) {
        const sA = -1 + largo * v / vanos, sB = -1 + largo * (v + 1) / vanos, base = pos.length / 3;
        for (let j = 0; j <= nd; j++) for (let i = 0; i <= nx; i++) {
          const a = i / nx, dn = j / nd, sv = sA + (sB - sA) * a, dd = d0 + prof * dn;
          const comba = Math.sin(Math.PI * a) * (1.5 * (1 - dn) + 0.35);
          const p = mf.enMundo(sv, dd, t.frente + (t.fondo - t.frente) * dn - comba + Math.sin(Math.PI * dn) * 0.6);
          pos.push(p.x, p.y, p.z);
        }
        for (let j = 0; j < nd; j++) for (let i = 0; i < nx; i++) {
          const k = base + j * (nx + 1) + i; idx.push(k, k + 1, k + nx + 1, k + 1, k + nx + 2, k + nx + 1);
        }
        const m0 = mf.enMundo(sA, d1 - 0.4, 0), mt = mf.enMundo(sA, d1 - 0.4, t.fondo + 4);
        const mastil = new THREE.CylinderGeometry(0.22, 0.3, t.fondo + 4, 8); mastil.translate(m0.x, (t.fondo + 4) / 2, m0.z); piezasBaranda.push(mastil);
        const f = mf.enMundo(sA, d0, t.frente + 0.3), v3 = f.clone().sub(mt);
        const cable = new THREE.CylinderGeometry(0.03, 0.03, v3.length(), 4);
        cable.applyMatrix4(new THREE.Matrix4().compose(mt.clone().add(f).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(ARRIBA, v3.normalize()), new THREE.Vector3(1, 1, 1)));
        piezasBaranda.push(cable);
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const lona = new THREE.Mesh(g, M.lona); lona.castShadow = lona.receiveShadow = true; escena.add(lona);
    }
    // muro trasero: cierra la tribuna desde el piso hasta la lámina
    caja(piezasConcreto, mf.enMundo(mf.L / 2, d1 + 0.15, t.fondo / 2), new THREE.Vector3(mf.L, t.fondo, 0.3), qSeg);
  }
  return { mf, pf };
}

let palcoInfo = null;
const estado = { sillas: 0, arboles: 0, palcos: 0 };
SEGMENTOS.forEach(construirSegmento);

function unir(lista, mat, sombra = true) {
  const g = mergeGeometries(lista.map(x => x.index ? x.toNonIndexed() : x)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; escena.add(m); return m;
}
unir(piezasConcreto, M.concreto);
unir(piezasEscalera, M.escalera, false);
unir(piezasBaranda, M.acero);
unir(piezasAmarillo, M.amarillo);
unir(piezasMalla, M.malla, false);
unir(piezasTecho, M.concretoTecho);
unir(piezasPalco, new THREE.MeshStandardMaterial({ color: 0xe8e4dc, roughness: 0.8 }));

// anexos
for (const a of ANEXOS) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(a.x1 - a.x0, a.alto, a.y1 - a.y0), [M.concreto, M.concreto, new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.6 }), M.concreto, M.concreto, M.concreto]);
  m.position.copy(P((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2, a.alto / 2)); m.castShadow = m.receiveShadow = true; escena.add(m);
}

// ---------- sillas en un solo InstancedMesh
const COLORES = {
  real: {
    'norte': ['#d8cba6', '#cdbf99'], 'oriental': ['#d8cba6', '#cdbf99'],
    'occidental-norte': [['#d9606a', '#e07a83'], ['#e8c11c', '#dcb415']], 'occidental-sur': ['#ecc41c', '#ddb515'],
    letra: ['#b3413b', '#a63a33'],
  },
  inter: { todos: ['#141414', '#1d1d1d'], acento: '#f1f0ec', letra: ['#f1f0ec', '#e8e6df'] },
};
// máscara de letras dibujada en un lienzo: una celda por silla (0,5 m) y por fila
const mascaras = {};
function mascara(seg, texto, filas) {
  const k = seg.id + texto; if (mascaras[k]) return mascaras[k];
  const L = Math.hypot(seg.B[0] - seg.A[0], seg.B[1] - seg.A[1]);
  const W = Math.ceil(L / 0.5), H = filas, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = esquema === 'inter' ? `700 ${H * 1.25}px Owners, "Arial Narrow", sans-serif` : `700 ${H * 0.95}px Georgia, "Times New Roman", serif`;
  const x0 = seg.letras.desde / 0.5, x1 = seg.letras.hasta / 0.5, ancho = g.measureText(texto).width;
  // letras separadas y estiradas a lo ancho de los bloques del centro
  const paso = (x1 - x0) / texto.length;
  [...texto].forEach((l, i) => {
    g.save(); g.translate(x0 + paso * (i + 0.5), H * 0.5); g.scale(Math.min(1.6, (paso * 0.8) / (ancho / texto.length)), 1); g.fillText(l, 0, 0); g.restore();
  });
  const d = g.getImageData(0, 0, W, H).data;
  return (mascaras[k] = (s, fila) => { const x = Math.floor(s / 0.5), y = H - 1 - fila; return d[(y * W + x) * 4 + 3] > 110; });
}
const matSilla = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, metalness: 0.05 });
const malla = new THREE.InstancedMesh(silla, matSilla, sillas.length);
malla.castShadow = true; malla.receiveShadow = true;
{
  const m = new THREE.Matrix4(), uno = new THREE.Vector3(1, 1, 1);
  sillas.forEach((s, i) => { m.compose(s.pos, s.q, uno); malla.setMatrixAt(i, m); });
}
escena.add(malla);
estado.sillas = sillas.length;
const colorBase = new Float32Array(sillas.length * 3);
let esquema = 'real';
function pintarSillas() {
  const c = new THREE.Color();
  sillas.forEach((s, i) => {
    const seg = SEGMENTOS.find(x => x.id === s.seg);
    const enLetra = seg.letras && mascara(seg, seg.letras[esquema], s.filasSeg)(s.s, s.filaSeg);
    if (enLetra) { const p = COLORES[esquema].letra; c.set(azar() < 0.5 ? p[0] : p[1]); }
    else if (esquema === 'real') {
      let p = COLORES.real[s.tribuna]; if (Array.isArray(p[0])) p = p[Math.min(s.bandeja, p.length - 1)];
      c.set(azar() < 0.5 ? p[0] : p[1]);
    } else {
      // negro con blancos sueltos, como el rojo con azules del ejemplo
      c.set(azar() < 0.07 ? COLORES.inter.acento : (azar() < 0.5 ? COLORES.inter.todos[0] : COLORES.inter.todos[1]));
    }
    c.toArray(colorBase, i * 3); malla.setColorAt(i, c);
  });
  malla.instanceColor.needsUpdate = true;
  M.escalera.color.set(esquema === 'real' ? 0xe7c321 : 0xd9d6cf);
  M.amarillo.color.set(esquema === 'real' ? 0xe9bf1a : 0x1a1a1a);
}
pintarSillas();

// ---------- torres de luz
function cabezaLuces(ancho, alto, filas, cols) {
  const cabeza = new THREE.Group();
  const marco = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, 0.35), M.torre); cabeza.add(marco);
  const focos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.26, 0.3, 0.45, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.3, roughness: 0.2 }), filas * cols);
  const m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < cols; i++) for (let j = 0; j < filas; j++) { m.makeTranslation(-ancho / 2 + ancho * (i + 0.5) / cols, -alto / 2 + alto * (j + 0.5) / filas, 0.35); focos.setMatrixAt(k++, m); }
  cabeza.add(focos); cabeza.traverse(o => (o.castShadow = true));
  return cabeza;
}
for (const t of TORRES) {
  const g = new THREE.Group();
  if (t.tipo === 'doble') {
    // torre doble de la esquina noreste: dos columnas, plataforma, pantalla abajo y luces arriba
    const H = 40;
    for (const x of [-3.4, 3.4]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, H, 12), M.torre); col.position.set(x, H / 2, 0); col.castShadow = true; g.add(col);
    }
    for (const [h, alto] of [[5.6, 0.4], [12, 0.4], [24, 0.35], [H - 4.6, 0.4]]) {
      const v = new THREE.Mesh(new THREE.BoxGeometry(7.6, alto, 0.5), M.torre); v.position.y = h; v.castShadow = true; g.add(v);
    }
    const plataforma = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.2, 2.2), M.aceroOscuro); plataforma.position.set(0, 24, 0.6); g.add(plataforma);
    const pantalla = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.8, 0.6), M.pantalla); pantalla.position.set(0, 8.8, 0.7); pantalla.castShadow = true; g.add(pantalla);
    const cab = cabezaLuces(9, 5.2, 4, 7); cab.position.set(0, H - 1.4, 0.3); cab.rotation.x = -0.28; g.add(cab);
  } else {
    const fuste = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.6, ALTO_TORRE, 12), M.torre);
    fuste.position.y = ALTO_TORRE / 2; fuste.castShadow = true; g.add(fuste);
    const cab = cabezaLuces(5.4, 4.2, 4, 5); cab.position.set(0, ALTO_TORRE + 1.6, 0.4); cab.rotation.x = -0.32; g.add(cab);
  }
  const hacia = P(0, 0, 0).sub(P(t.x, t.y, 0)); g.rotation.y = Math.atan2(hacia.x, hacia.z);
  g.position.copy(P(t.x, t.y, 0)); escena.add(g);
}

// ---------- cerros orientales y ciudad alrededor
{
  // dirección del oriente geográfico en coordenadas locales (la cancha está girada 19,3°)
  const giro = THREE.MathUtils.degToRad(19.3);
  const este = new THREE.Vector2(Math.cos(giro), Math.sin(giro)), norte = new THREE.Vector2(-Math.sin(giro), Math.cos(giro));
  const pos = [], idx = [], N = 220, perfiles = [0, 0.55, 1, 0.75, 0];
  const dist = [8200, 9800, 11200, 12600, 15500];
  const cresta = (t) => 760 + 260 * Math.sin(t * 7.1) + 140 * Math.sin(t * 17.3 + 1) + 70 * Math.sin(t * 41 + 2) + 35 * Math.sin(t * 97);
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = -26000 + 52000 * t;
    for (let j = 0; j < dist.length; j++) {
      const p = este.clone().multiplyScalar(dist[j] + 400 * Math.sin(t * 9)).add(norte.clone().multiplyScalar(a));
      const v = P(p.x, p.y, perfiles[j] * cresta(t * 6) * (j === 2 ? 1 : 0.92));
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < dist.length - 1; j++) {
    const k = i * dist.length + j; idx.push(k, k + dist.length, k + 1, k + 1, k + dist.length, k + dist.length + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  escena.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x3e5240, roughness: 1, flatShading: true, side: THREE.DoubleSide })));

  // barrios de Kennedy: bloques bajos de ladrillo y algunas torres, fuera del cuadro satelital
  const casas = [], paso = 24;
  for (let x = -2600; x <= 2600; x += paso) for (let y = -2600; y <= 2600; y += paso) {
    if (Math.abs(x) < 262 && Math.abs(y) < 262) continue;
    if (((x / paso) | 0) % 6 === 0 || ((y / paso) | 0) % 7 === 0) continue; // avenidas
    if (azar() < 0.12) continue;
    casas.push([x + (azar() - 0.5) * 6, y + (azar() - 0.5) * 6]);
  }
  const caja1 = new THREE.BoxGeometry(1, 1, 1); caja1.translate(0, 0.5, 0);
  const malla = new THREE.InstancedMesh(caja1, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), casas.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(ARRIBA, (azar() - 0.5) * 0.1), sc = new THREE.Vector3(), col = new THREE.Color();
  const tonos = ['#8f5440', '#9c6149', '#a8705a', '#c9bda8', '#b9b2a6', '#7e4a3a', '#d4cfc4'];
  casas.forEach(([x, y], i) => {
    const torre = azar() < 0.035, alto = torre ? 26 + azar() * 22 : 6 + azar() * 7;
    sc.set(14 + azar() * 6, alto, 14 + azar() * 6); m.compose(P(x, y, 0), q, sc); malla.setMatrixAt(i, m);
    col.set(tonos[(azar() * tonos.length) | 0]); malla.setColorAt(i, col);
  });
  malla.receiveShadow = true; escena.add(malla);
}

// ---------- cámaras con vuelo suave
const mira = new THREE.Vector3();
let vuelo = null;
function ir(nombre, inmediato = false) {
  const c = CAMARAS[nombre]; if (!c) return;
  document.getElementById('aviso-silla').hidden = true;
  ficha.hidden = true; resaltar(-1);
  volar(P(...c.pos), P(...c.mira), c.fov, inmediato);
  history.replaceState(null, '', '#' + nombre);
  document.querySelectorAll('[data-cam]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cam === nombre)));
}
function volar(pos, objetivo, fov, inmediato) {
  if (inmediato || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    camara.position.copy(pos); controles.target.copy(objetivo); camara.fov = fov; camara.updateProjectionMatrix(); controles.update(); vuelo = null; return;
  }
  vuelo = { t0: performance.now(), dur: 2200, p0: camara.position.clone(), p1: pos, m0: controles.target.clone(), m1: objetivo, f0: camara.fov, f1: fov };
}
const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ---------- silla bajo el mouse
const rayo = new THREE.Raycaster(), puntero = new THREE.Vector2();
let resaltada = -1, pendiente = false, ultimoEvento = null;
const ficha = document.getElementById('ficha');
function nombreBloque(s) {
  const t = TRIBUNAS[s.tribuna];
  return `${t.prefijo}-${(s.bandeja + 1) * 100 + s.bloque}`;
}
function resaltar(i) {
  if (resaltada >= 0) malla.setColorAt(resaltada, new THREE.Color().fromArray(colorBase, resaltada * 3));
  resaltada = i;
  if (i >= 0) malla.setColorAt(i, new THREE.Color('#ff7a1a'));
  malla.instanceColor.needsUpdate = true;
}
lienzo.addEventListener('pointermove', (e) => { ultimoEvento = e; if (!pendiente) { pendiente = true; requestAnimationFrame(revisarPuntero); } }, { passive: true });
lienzo.addEventListener('pointerleave', () => { resaltar(-1); ficha.hidden = true; });
function revisarPuntero() {
  pendiente = false; const e = ultimoEvento; if (!e || vuelo) return;
  const r = lienzo.getBoundingClientRect();
  puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  rayo.setFromCamera(puntero, camara);
  const hit = rayo.intersectObject(malla, false)[0];
  if (!hit) { resaltar(-1); ficha.hidden = true; lienzo.style.cursor = ''; return; }
  const s = sillas[hit.instanceId];
  if (hit.instanceId !== resaltada) resaltar(hit.instanceId);
  ficha.hidden = false;
  ficha.style.transform = `translate(${e.clientX - r.left + 16}px, ${e.clientY - r.top + 16}px)`;
  ficha.querySelector('[data-t]').textContent = `${TRIBUNAS[s.tribuna].nombre} · ${s.bandeja ? 'Alta' : 'Baja'}`;
  ficha.querySelector('[data-b]').textContent = `Bloque ${nombreBloque(s)}`;
  ficha.querySelector('[data-f]').textContent = `Fila ${s.fila} · Silla ${s.numero}`;
  lienzo.style.cursor = 'pointer';
}
let arrastre = null;
lienzo.addEventListener('pointerdown', (e) => (arrastre = [e.clientX, e.clientY]));
lienzo.addEventListener('click', (e) => {
  if (arrastre && Math.hypot(e.clientX - arrastre[0], e.clientY - arrastre[1]) > 5) return;
  if (resaltada < 0) return;
  sentarse(resaltada);
});
function ojoSilla(i) {
  const s = sillas[i];
  const atras = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q); // hacia atrás de la silla
  const ojo = s.pos.clone().add(new THREE.Vector3(0, 1.18, 0)).addScaledVector(atras, 0.05);
  return { ojo, objetivo: new THREE.Vector3(0, 0, 0).lerp(ojo.clone().setY(0), 0.18) };
}
function vistaPalco(k) {
  const { mf, dAtras, h0, cajas, L } = palcoInfo; k ??= Math.floor(cajas / 2);
  const s = 0.5 + (L - 1) * (k + 0.5) / cajas;
  return { ojo: mf.enMundo(s, dAtras + 4.6, h0 + 2.05), objetivo: mf.enMundo(s - 6, -45, 0) };
}
function sentarse(i) {
  const s = sillas[i], { ojo, objetivo } = ojoSilla(i);
  volar(ojo, objetivo, 55);
  document.getElementById('silla-actual').textContent = `${TRIBUNAS[s.tribuna].nombre} · Bloque ${nombreBloque(s)} · Fila ${s.fila} · Silla ${s.numero}`;
  document.getElementById('aviso-silla').hidden = false;
  history.replaceState(null, '', '#silla-' + i);
  document.querySelectorAll('[data-cam]').forEach(b => b.setAttribute('aria-pressed', 'false'));
}

// ---------- interfaz
document.querySelectorAll('[data-cam]').forEach(b => b.addEventListener('click', () => { ir(b.dataset.cam); document.getElementById('aviso-silla').hidden = true; }));
document.querySelectorAll('[data-esquema]').forEach(b => b.addEventListener('click', () => {
  esquema = b.dataset.esquema; pintarSillas();
  document.querySelectorAll('[data-esquema]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
}));
document.getElementById('foto').addEventListener('click', () => {
  render();
  const a = document.createElement('a');
  a.download = `techo-3d-${(location.hash || '#vista').slice(1)}.png`;
  a.href = lienzo.toDataURL('image/png'); a.click();
});
function pintarEstado() {
  document.getElementById('n-sillas').textContent = estado.sillas.toLocaleString('es-CO');
  const porTribuna = {};
  sillas.forEach(s => (porTribuna[s.tribuna] = (porTribuna[s.tribuna] || 0) + 1));
  document.querySelectorAll('[data-cuenta]').forEach(el => (el.textContent = (porTribuna[el.dataset.cuenta] || 0).toLocaleString('es-CO')));
}
pintarEstado();

// ---------- ciclo
function ajustar() {
  const w = lienzo.clientWidth, h = lienzo.clientHeight;
  renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
}
addEventListener('resize', ajustar);
ajustar();

function render() { renderer.render(escena, camara); }
renderer.setAnimationLoop((t) => {
  if (vuelo) {
    const k = Math.min(1, (t - vuelo.t0) / vuelo.dur), e = suave(k);
    // arco: sube un poco a mitad del vuelo para no atravesar el techo
    const alto = Math.sin(Math.PI * e) * Math.min(40, vuelo.p0.distanceTo(vuelo.p1) * 0.15);
    camara.position.lerpVectors(vuelo.p0, vuelo.p1, e).y += alto;
    controles.target.lerpVectors(vuelo.m0, vuelo.m1, e);
    camara.fov = vuelo.f0 + (vuelo.f1 - vuelo.f0) * e; camara.updateProjectionMatrix();
    if (k >= 1) vuelo = null;
  }
  controles.update();
  render();
});

// arranque: cámara desde la URL (#arriba, #norte, #silla-1234…)
const h = location.hash.slice(1);
if (h.startsWith('silla-')) { ir('general', true); sentarse(+h.slice(6)); }
else ir(CAMARAS[h] ? h : 'general', true);

// guardar una toma en alta (servidor local: herramientas/servidor.py la escribe en tomas/)
async function guardar(nombre, w = 2400, h = 1350) {
  const pw = lienzo.style.width, ph = lienzo.style.height, pr = renderer.getPixelRatio();
  const aspecto = camara.aspect; vuelo = null; controles.update();
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix();
  document.body.classList.add('limpio'); render();
  const blob = await new Promise(r => lienzo.toBlob(r, 'image/png'));
  renderer.setPixelRatio(pr); ajustar(); camara.aspect = aspecto; ajustar(); document.body.classList.remove('limpio');
  const res = await fetch('/guardar?nombre=' + encodeURIComponent(nombre), { method: 'POST', body: blob });
  return res.status;
}

// para inspeccionar desde la consola o con Playwright
window.techo = { THREE, escena, camara, controles, sillas, ir, sentarse, estado, render, guardar, volar: (p, m, f) => volar(P(...p), P(...m), f, true),
  verSilla: (i, f = 55) => { const v = ojoSilla(i); volar(v.ojo, v.objetivo, f, true); },
  verPalco: (k, f = 62) => { const v = vistaPalco(k); volar(v.ojo, v.objetivo, f, true); } };
