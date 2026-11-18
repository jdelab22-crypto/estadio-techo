// Proyección de las fotos de Higgsfield sobre el modelo 3D.
// Cada foto se hizo desde una cámara conocida del 3D; aquí esa cámara se vuelve un proyector:
// la foto se pinta sobre la geometría desde ese punto, con prueba de profundidad para no
// pintar lo que el proyector no ve. Se mezclan los dos proyectores más parecidos a la cámara
// actual, así que al llegar a una de esas cámaras se ve exactamente la foto, y en el camino
// el estadio sigue siendo 3D pero vestido con las fotos.
import * as THREE from 'three';

// cámara de cada foto en coordenadas locales [x, y, altura] (las mismas con las que se sacó la toma 3D)
export const PROYECTORES = [
  { foto: 'assets/fotos/k0-este.jpg',               pos: [-22, 0, 430], mira: [-20, 0, 0],  fov: 32 },
  { foto: 'assets/fotos/k1-oriental.jpg',           pos: [-60, 2, 150], mira: [40, 3, 0],   fov: 38 },
  { foto: 'assets/fotos/oriental.jpg',              pos: [-30, 2, 46],  mira: [46, 4, 4],   fov: 42 },
  { foto: 'assets/fotos/k1-norte.jpg',              pos: [0, -75, 150], mira: [0, 45, 0],   fov: 38 },
  { foto: 'assets/fotos/norte.jpg',                 pos: [0, -2, 46],   mira: [0, 70, 4],   fov: 40 },
  { foto: 'assets/fotos/k1-occidental-norte.jpg',   pos: [70, 15, 150], mira: [-40, 38, 0], fov: 38 },
  { foto: 'assets/fotos/occidental-norte.jpg',      pos: [24, 22, 58],  mira: [-62, 42, 6], fov: 40 },
  { foto: 'assets/fotos/k1-occidental-sur.jpg',     pos: [75, -35, 150], mira: [-40, -40, 0], fov: 38 },
  { foto: 'assets/fotos/occidental-sur.jpg',        pos: [24, -40, 54], mira: [-60, -42, 6], fov: 40 },
];

export function crearProyeccion({ renderer, escena, P }) {
  const cargador = new THREE.TextureLoader();
  const U = {
    uFoto0: { value: null }, uFoto1: { value: null }, uDist0: { value: null }, uDist1: { value: null }, uFotoB: { value: null }, uDistB: { value: null }, uVPB: { value: new THREE.Matrix4() }, uPosB: { value: new THREE.Vector3() },
    uVP0: { value: new THREE.Matrix4() }, uVP1: { value: new THREE.Matrix4() },
    uPos0: { value: new THREE.Vector3() }, uPos1: { value: new THREE.Vector3() },
    uW0: { value: 0 }, uW1: { value: 0 }, uFuerza: { value: 1 }, uSillasProy: { value: 1 }, uResaltada: { value: -1 },
  };
  const negra = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); negra.needsUpdate = true;

  const proy = PROYECTORES.map((p) => {
    const cam = new THREE.PerspectiveCamera(p.fov, 16 / 9, 0.5, 6000);
    cam.position.copy(P(...p.pos)); cam.lookAt(P(...p.mira)); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
    const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    const rt = new THREE.WebGLRenderTarget(1024, 576, { type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    const tex = cargador.load(p.foto); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 8;
    return { ...p, cam, vp, rt, tex, dir: cam.getWorldDirection(new THREE.Vector3()), centro: cam.position.clone() };
  });

  // distancia desde cada proyector a lo primero que ve (un "mapa de sombras" en metros)
  const matDist = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uPos: { value: new THREE.Vector3() } },
    vertexShader: `varying vec3 vM;
      void main() {
        #include <begin_vertex>
        vec4 p = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
        p = instanceMatrix * p;
        #endif
        vec4 w = modelMatrix * p; vM = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `uniform vec3 uPos; varying vec3 vM; void main() { gl_FragColor = vec4(length(vM - uPos), 0.0, 0.0, 1.0); }`,
  });
  function profundidades() {
    const prev = { rt: renderer.getRenderTarget(), color: renderer.getClearColor(new THREE.Color()), alfa: renderer.getClearAlpha(), sombras: renderer.shadowMap.autoUpdate };
    renderer.shadowMap.autoUpdate = false;
    escena.overrideMaterial = matDist;
    renderer.setClearColor(new THREE.Color(60000, 0, 0), 1);
    for (const p of proy) {
      matDist.uniforms.uPos.value.copy(p.centro);
      renderer.setRenderTarget(p.rt); renderer.clear(); renderer.render(escena, p.cam);
    }
    escena.overrideMaterial = null;
    renderer.setRenderTarget(prev.rt); renderer.setClearColor(prev.color, prev.alfa); renderer.shadowMap.autoUpdate = prev.sombras;
  }

  const hechos = new WeakSet();
  function parchear(mat, { sillas = false } = {}) {
    for (const m of [].concat(mat)) {
      if (!m || hechos.has(m) || !(m.isMeshStandardMaterial)) continue;
      hechos.add(m);
      if (sillas) m.defines = { ...(m.defines || {}), SILLAS: '' };
      m.customProgramCacheKey = () => 'proy' + (sillas ? 's' : '');
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', `#include <common>
            varying vec3 vMundo;
            #ifdef SILLAS
            flat varying float vInst;
            #endif`)
          .replace('#include <project_vertex>', `#include <project_vertex>
            { vec4 pm = vec4(transformed, 1.0);
              #ifdef USE_INSTANCING
              pm = instanceMatrix * pm;
              #endif
              vMundo = (modelMatrix * pm).xyz;
              #ifdef SILLAS
              vInst = float(gl_InstanceID);
              #endif
            }`);
        sh.fragmentShader = sh.fragmentShader
          .replace('#include <common>', `#include <common>
            varying vec3 vMundo;
            #ifdef SILLAS
            flat varying float vInst;
            #endif
            uniform sampler2D uFoto0, uFoto1, uDist0, uDist1, uFotoB, uDistB;
            uniform mat4 uVP0, uVP1, uVPB; uniform vec3 uPos0, uPos1, uPosB;
            uniform float uW0, uW1, uFuerza, uSillasProy, uResaltada;
            float cubre(mat4 vp, vec3 pos, sampler2D dist, out vec2 uv) {
              uv = vec2(0.0);
              vec4 c = vp * vec4(vMundo, 1.0);
              if (c.w <= 0.0) return 0.0;
              uv = c.xy / c.w * 0.5 + 0.5;
              if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return 0.0;
              float d = length(vMundo - pos);
              if (d > texture2D(dist, uv).r + 0.35 + d * 0.006) return 0.0;
              vec2 e = min(uv, 1.0 - uv);
              return smoothstep(0.0, 0.025, min(e.x, e.y));
            }`)
          .replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
            if (uFuerza > 0.0) {
              vec2 uv0, uv1;
              float c0 = uW0 * cubre(uVP0, uPos0, uDist0, uv0);
              float c1 = uW1 * cubre(uVP1, uPos1, uDist1, uv1);
              // capa de fondo: la foto cenital cubre todo lo que las otras dos no ven
              vec2 uvB; float cB = cubre(uVPB, uPosB, uDistB, uvB);
              float s = c0 + c1;
              float cerca = clamp(s / max(uW0 + uW1, 1e-4) * 1.6, 0.0, 1.0);
              if (s > 0.0005 || cB > 0.0) {
                vec3 fB = texture2D(uFotoB, uvB).rgb;
                vec3 fC = s > 0.0005 ? (c0 * texture2D(uFoto0, uv0).rgb + c1 * texture2D(uFoto1, uv1).rgb) / s : fB;
                vec3 f = mix(fB, fC, cerca);
                float a = uFuerza * max(cerca, cB * 0.92);
                #ifdef SILLAS
                a *= uSillasProy;
                if (abs(vInst - uResaltada) < 0.5) a = 0.0;
                #endif
                gl_FragColor.rgb = mix(gl_FragColor.rgb, f, a);
              }
            }`);
      };
      m.needsUpdate = true;
    }
  }
  function parchearEscena() {
    escena.traverse((o) => { if (o.isMesh && !o.userData.sinFoto) parchear(o.material, { sillas: !!o.userData.sillas }); });
  }

  // cada cuadro: los dos proyectores más parecidos a la cámara (misma dirección y cerca)
  const dir = new THREE.Vector3();
  function actualizar(camara) {
    camara.getWorldDirection(dir);
    const puntajes = proy.map((p, i) => {
      const a = Math.max(0, dir.dot(p.dir));
      const d = camara.position.distanceTo(p.centro);
      return { i, s: Math.pow(a, 6) / Math.pow(1 + d / 45, 2) };
    }).sort((x, y) => y.s - x.s);
    const [a, b] = puntajes, total = a.s + b.s || 1;
    const pa = proy[a.i], pb = proy[b.i];
    U.uFoto0.value = pa.tex; U.uDist0.value = pa.rt.texture; U.uVP0.value.copy(pa.vp); U.uPos0.value.copy(pa.centro);
    U.uFoto1.value = pb.tex; U.uDist1.value = pb.rt.texture; U.uVP1.value.copy(pb.vp); U.uPos1.value.copy(pb.centro);
    U.uW0.value = a.s / total; U.uW1.value = b.s / total;
    const base = proy[0];
    U.uFotoB.value = base.tex; U.uDistB.value = base.rt.texture; U.uVPB.value.copy(base.vp); U.uPosB.value.copy(base.centro);
    if (!U.uFoto1.value) U.uFoto1.value = negra;
  }

  return { U, parchear, parchearEscena, profundidades, actualizar, proyectores: proy };
}
