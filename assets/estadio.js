// Estadio Metropolitano de Techo en three.js — paso 1 del método: el estadio en código.
// Cada silla es una instancia de un solo InstancedMesh y sabe su tribuna, bloque, fila y número.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CANCHA, PASTO, FRANJA, SEGMENTOS, TRIBUNAS, TORRES, ALTO_TORRE, BANCOS, ANEXOS,
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
const camara = new THREE.PerspectiveCamera(40, 1, 0.3, 4000);
const controles = new OrbitControls(camara, lienzo);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.maxPolarAngle = Math.PI * 0.495;
controles.minDistance = 4;
controles.maxDistance = 900;

// Cielo y sol de media tarde, entrando desde el occidente (detrás de las tribunas techadas).
const cielo = new Sky();
cielo.scale.setScalar(3000);
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
escena.fog = new THREE.Fog(0xc9d6e0, 450, 1500);

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
const tierra = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshStandardMaterial({ color: 0x5f6655, roughness: 1 }));
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
  valla(P(38.5, -50), P(38.5, 50));
  valla(P(-26, 56.5), P(26, 56.5)); valla(P(-26, -56.5), P(26, -56.5));
}

// bancos de suplentes
for (const b of BANCOS) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, b.largo), M.concretoOscuro); base.position.y = 0.2;
  const techo = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, b.largo + 0.2), new THREE.MeshPhysicalMaterial({ color: 0xcfe0ea, transparent: true, opacity: 0.45, roughness: 0.1 }));
  techo.position.set(0.2, 2.3, 0);
  const fondo = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, b.largo), M.blanco); fondo.position.set(-1.1, 1.1, 0);
  const banca = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, b.largo - 0.6), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 })); banca.position.set(-0.6, 0.62, 0);
  g.add(base, techo, fondo, banca); g.traverse(o => (o.castShadow = true));
  g.position.copy(P(-41.5, b.y)); escena.add(g);
}

// ---------- tribunas
const silla = (() => {
  const asiento = new THREE.BoxGeometry(0.44, 0.07, 0.4); asiento.translate(0, 0.43, -0.02);
  const espaldar = new THREE.BoxGeometry(0.44, 0.4, 0.06); espaldar.rotateX(-0.14); espaldar.translate(0, 0.68, 0.19);
  const pata = new THREE.BoxGeometry(0.08, 0.4, 0.08); pata.translate(0, 0.2, 0.05);
  return mergeGeometries([asiento, espaldar, pata]);
})();

const sillas = []; // {seg, tribuna, bandeja, bloque, fila, numero, pos, normal}
const piezasConcreto = [], piezasEscalera = [], piezasBaranda = [];

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
  return { filas, fondo: d, alto: h };
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
  forma.lineTo(pf.fondo + 0.3, pf.alto + 1.1);
  forma.lineTo(pf.fondo + 0.3, 0);
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

function construirSegmento(seg) {
  const mf = marco(seg), pf = perfil(seg);
  extruirPerfil(seg, mf, pf, 0, mf.L, M.concreto, piezasConcreto);
  // orientación con +Z local hacia atrás (n) y +X a lo largo (u)
  const base = new THREE.Matrix4().makeBasis(mf.u3, ARRIBA, mf.n3);
  const qSeg = new THREE.Quaternion().setFromRotationMatrix(base.determinant() > 0 ? base : new THREE.Matrix4().makeBasis(mf.u3.clone().negate(), ARRIBA, mf.n3));

  // escaleras pintadas en cada pasillo
  const anchoPasillo = 1.2;
  for (const p of seg.pasillos) {
    for (const f of pf.filas) {
      caja(piezasEscalera, mf.enMundo(p, f.d + f.huella / 2, f.h + 0.012), new THREE.Vector3(anchoPasillo, 0.025, f.huella), qSeg);
      // contrahuella intermedia de la escalera (dos peldaños por fila)
      caja(piezasEscalera, mf.enMundo(p, f.d + f.huella / 2, f.h + 0.012 + 0.2), new THREE.Vector3(anchoPasillo * 0.98, 0.02, f.huella / 2), qSeg);
    }
    // baranda central del pasillo
    const f0 = pf.filas[0], f1 = pf.filas[pf.filas.length - 1];
    const a = mf.enMundo(p, f0.d, f0.h + 1.0), b = mf.enMundo(p, f1.d + f1.huella, f1.h + 1.0);
    const v = b.clone().sub(a), g = new THREE.CylinderGeometry(0.03, 0.03, v.length(), 6);
    g.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(ARRIBA, v.normalize()), new THREE.Vector3(1, 1, 1)));
    piezasBaranda.push(g);
  }
  // baranda del frente
  caja(piezasBaranda, mf.enMundo(mf.L / 2, -0.15, seg.base + 0.55), new THREE.Vector3(mf.L, 1.1, 0.06), qSeg);

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
          pos: mf.enMundo(s, f.d + f.huella * 0.42, f.h), q: qSeg,
        });
      }
    });
  }

  // edificio detrás + palcos + techo
  let dAtras = pf.fondo + 0.3;
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
      caja(piezasBaranda, mf.enMundo(0.5 + (mf.L - 1) * i / cajas, dAtras + 0.25, h0 + alto / 2), new THREE.Vector3(0.12, alto - 0.3, 0.12), qSeg);
    }
    estado.palcos = cajas;
    palcoInfo = { mf, dAtras, h0, alto, cajas, L: mf.L };
  }
  if (seg.techo) {
    const t = seg.techo, d0 = t.desde, d1 = pf.fondo + (seg.edificio ? seg.edificio.fondo : 0) + 0.3;
    const prof = d1 - d0, largo = mf.L + 2;
    const lamina = texturaLamina(t.color); lamina.repeat.set(largo / 0.9 / 4, 1);
    const pendiente = Math.atan2(t.fondo - t.frente, prof);
    const g = new THREE.PlaneGeometry(largo, Math.hypot(prof, t.fondo - t.frente));
    // el plano: X a lo largo, Y hacia atrás-arriba
    const mat = new THREE.MeshStandardMaterial({ map: lamina, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });
    const techo = new THREE.Mesh(g, mat);
    const centro = mf.enMundo(mf.L / 2, (d0 + d1) / 2, (t.frente + t.fondo) / 2);
    techo.position.copy(centro);
    techo.quaternion.copy(qSeg).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2 - pendiente));
    techo.castShadow = techo.receiveShadow = true;
    escena.add(techo);
    // cerchas blancas por encima de la lámina (así se ven en el satélite) y columnas atrás
    for (let i = 0; i < t.cerchas; i++) {
      const s = -1 + largo * (i + 0.5) / t.cerchas;
      const a = mf.enMundo(s, d0 - 0.2, t.frente + 0.55), b = mf.enMundo(s, d1, t.fondo + 0.55);
      const v = b.clone().sub(a);
      const viga = new THREE.BoxGeometry(0.35, 1.0, v.length());
      viga.applyMatrix4(new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.clone().normalize()), new THREE.Vector3(1, 1, 1)));
      piezasBaranda.push(viga);
      caja(piezasBaranda, mf.enMundo(s, d1 - 0.4, t.fondo / 2), new THREE.Vector3(0.5, t.fondo, 0.5), qSeg);
    }
    // muro trasero: cierra la tribuna desde el piso hasta la lámina
    caja(piezasConcreto, mf.enMundo(mf.L / 2, d1 + 0.15, t.fondo / 2), new THREE.Vector3(mf.L, t.fondo, 0.3), qSeg);
    // canal frontal del techo
    caja(piezasBaranda, mf.enMundo(mf.L / 2, d0 - 0.2, t.frente - 0.1), new THREE.Vector3(largo, 0.6, 0.3), qSeg);
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

// anexos
for (const a of ANEXOS) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(a.x1 - a.x0, a.alto, a.y1 - a.y0), [M.concreto, M.concreto, new THREE.MeshStandardMaterial({ color: a.color, roughness: 0.6 }), M.concreto, M.concreto, M.concreto]);
  m.position.copy(P((a.x0 + a.x1) / 2, (a.y0 + a.y1) / 2, a.alto / 2)); m.castShadow = m.receiveShadow = true; escena.add(m);
}

// ---------- sillas en un solo InstancedMesh
const COLORES = {
  real: {
    'norte': ['#e3d6a6', '#d9c98f'], 'oriental': ['#e9c217', '#dfb513'],
    'occidental-norte': ['#e7c01b', '#d8b011'], 'occidental-sur': ['#ecc41c', '#ddb515'],
  },
  inter: { todos: ['#141414', '#1d1d1d'], acento: '#f1f0ec' },
};
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
    if (esquema === 'real') {
      const p = COLORES.real[s.tribuna]; c.set(azar() < 0.5 ? p[0] : p[1]);
    } else {
      // negro con blancos sueltos, como el rojo con azules del ejemplo
      c.set(azar() < 0.07 ? COLORES.inter.acento : (azar() < 0.5 ? COLORES.inter.todos[0] : COLORES.inter.todos[1]));
    }
    c.toArray(colorBase, i * 3); malla.setColorAt(i, c);
  });
  malla.instanceColor.needsUpdate = true;
  M.escalera.color.set(esquema === 'real' ? 0xe7c321 : 0xd9d6cf);
}
pintarSillas();

// ---------- torres de luz
for (const [x, y] of TORRES) {
  const g = new THREE.Group();
  const fuste = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.75, ALTO_TORRE, 12), M.aceroOscuro);
  fuste.position.y = ALTO_TORRE / 2; fuste.castShadow = true; g.add(fuste);
  const cabeza = new THREE.Group();
  const marcoLuces = new THREE.Mesh(new THREE.BoxGeometry(7, 4.2, 0.4), M.aceroOscuro); cabeza.add(marcoLuces);
  const focos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.28, 0.32, 0.4, 10).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3d6, emissiveIntensity: 0.35, roughness: 0.2 }), 24);
  const m = new THREE.Matrix4(); let k = 0;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { m.makeTranslation(-2.75 + i * 1.1, -1.5 + j * 1.0, 0.35); focos.setMatrixAt(k++, m); }
  cabeza.add(focos);
  cabeza.position.y = ALTO_TORRE + 1.5;
  const hacia = P(0, 0, 0).sub(P(x, y, 0)); cabeza.rotation.y = Math.atan2(hacia.x, hacia.z); cabeza.rotation.x = 0; cabeza.rotateX(0.5);
  cabeza.traverse(o => (o.castShadow = true));
  g.add(cabeza); g.position.copy(P(x, y, 0)); escena.add(g);
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
function sentarse(i) {
  const s = sillas[i];
  const atras = new THREE.Vector3(0, 0, 1).applyQuaternion(s.q); // hacia atrás de la silla
  const ojo = s.pos.clone().add(new THREE.Vector3(0, 1.18, 0)).addScaledVector(atras, 0.05);
  const objetivo = new THREE.Vector3(0, 0, 0).lerp(ojo.clone().setY(0), 0.18);
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

// para inspeccionar desde la consola o con Playwright
window.techo = { THREE, escena, camara, controles, sillas, ir, sentarse, estado, render };
