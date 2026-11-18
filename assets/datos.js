// Estadio Metropolitano de Techo — medidas calcadas del satélite (Esri, z19, 0,149 m/px).
// Coordenadas locales en metros, alineadas con la cancha:
//   x → hacia la tribuna Oriental, y → hacia el arco norte, (0,0) = centro de la cancha.
// La cancha real está girada 19,3° en sentido horario respecto al norte geográfico.
// Herramienta para volver a medir: herramientas/enderezar.swift (rejilla en metros sobre el satélite).

export const GIRO_NORTE = 19.3; // grados

export const CANCHA = { largo: 105, ancho: 68, cx: 0, cy: 0 };
// Zona verde total (pasto) y franja sintética oscura del costado occidental.
export const PASTO = { x0: -36, x1: 41, y0: -59, y1: 59 };
export const FRANJA = { x0: -45.5, x1: -36, y0: -59, y1: 59 };

// Cada segmento de graderío: frente desde A hasta B (pie de la primera fila);
// el graderío crece alejándose de la cancha. Las bandejas se apilan hacia atrás.
// pasillos = metros desde A donde hay escalera (1,2 m de ancho); separan los bloques.
export const SEGMENTOS = [
  {
    id: 'norte', tribuna: 'norte', A: [-37, 61.5], B: [37, 61.5], base: 1.0,
    bandejas: [{ filas: 18, huella: 0.8, contra: 0.4 }],
    pasillos: [5, 16, 25, 41, 57, 65],
  },
  {
    id: 'esquina-ne', tribuna: 'norte', A: [37.6, 61.5], B: [43, 56.2], base: 1.0,
    bandejas: [{ filas: 13, huella: 0.8, contra: 0.4 }],
    pasillos: [],
  },
  {
    id: 'oriental', tribuna: 'oriental', A: [43, 56], B: [43, -50], base: 1.0,
    bandejas: [{ filas: 12, huella: 0.8, contra: 0.4 }],
    pasillos: [10.3, 25.3, 40.3, 56, 71.7, 86, 100.3],
  },
  {
    id: 'occidental-norte', tribuna: 'occidental-norte', A: [-52.5, 12], B: [-48, 66], base: 1.1,
    bandejas: [
      { filas: 7, huella: 0.8, contra: 0.38 },
      { salto: 1.6, subida: 1.4, filas: 26, huella: 0.8, contra: 0.42 },
    ],
    pasillos: [9, 18, 27, 36, 45],
    palco: { fondo: 6, alto: 3.2, cajas: 10 },
    edificio: { fondo: 10 },
    techo: { desde: 4, fondoExtra: 10, frente: 20.5, fondo: 22, color: 0xb9bcbd, cerchas: 9 },
  },
  {
    id: 'occidental-sur', tribuna: 'occidental-sur', A: [-47, -76], B: [-51.5, -9], base: 1.0,
    bandejas: [
      { filas: 12, huella: 0.85, contra: 0.38 },
      { salto: 1.4, subida: 1.6, filas: 16, huella: 0.8, contra: 0.44 },
    ],
    pasillos: [7, 16, 25, 34, 43, 52, 61],
    edificio: { fondo: 5 },
    techo: { desde: 9.4, fondoExtra: 6, frente: 17.5, fondo: 18.5, color: 0xe9ecec, cerchas: 7 },
  },
];

export const TRIBUNAS = {
  'norte': { nombre: 'Norte', techo: false, prefijo: 'N' },
  'oriental': { nombre: 'Oriental', techo: false, prefijo: 'OR' },
  'occidental-norte': { nombre: 'Occidental Norte', techo: true, prefijo: 'ON' },
  'occidental-sur': { nombre: 'Occidental Sur', techo: true, prefijo: 'OS' },
};

// Torres de luz (base medida en el satélite; las cabezas apuntan al centro).
export const TORRES = [
  [-40, 74.3], [48.6, 68.6], [38.6, -55.7], [-38.6, -56.4],
];
export const ALTO_TORRE = 35;

// Bancos de suplentes, costado occidental.
export const BANCOS = [
  { y: 10, largo: 10 }, { y: -11.5, largo: 10 },
];

// Volúmenes vecinos sencillos (anexo azul detrás de Occidental Sur).
export const ANEXOS = [
  { x0: -86, x1: -79, y0: -59, y1: -36, alto: 6, color: 0x2f5fb3 },
];

// Zonas donde NO van árboles (el estadio y su plaza).
export const SIN_ARBOLES = [
  { x0: -100, x1: 60, y0: -63, y1: 90 },
  { x0: -96, x1: -44, y0: -84, y1: -63 },
];

// Cámaras de la escena: posición y mira en coordenadas locales [x, y, altura].
export const CAMARAS = {
  arriba:            { nombre: 'Desde arriba',      pos: [-18, -1, 430], mira: [-18, 0, 0], fov: 32 },
  general:           { nombre: 'Vista general',     pos: [125, -165, 115], mira: [-12, 2, 4], fov: 32 },
  'norte':           { nombre: 'Norte',             pos: [0, -2, 46], mira: [0, 70, 4], fov: 40 },
  'oriental':        { nombre: 'Oriental',          pos: [-22, 0, 40], mira: [50, 2, 3], fov: 40 },
  'occidental-norte':{ nombre: 'Occidental Norte',  pos: [24, 22, 58], mira: [-62, 42, 6], fov: 40 },
  'occidental-sur':  { nombre: 'Occidental Sur',    pos: [24, -40, 54], mira: [-60, -42, 6], fov: 40 },
};
