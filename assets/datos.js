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
    barandaAtras: true,
  },
  {
    id: 'esquina-ne', tribuna: 'norte', A: [37.6, 61.5], B: [43, 56.2], base: 1.0, bloqueInicio: 8,
    bandejas: [{ filas: 13, huella: 0.8, contra: 0.4 }],
    pasillos: [],
    barandaAtras: true,
  },
  {
    id: 'oriental', tribuna: 'oriental', A: [43, 56], B: [43, -50], base: 1.0,
    bandejas: [{ filas: 12, huella: 0.8, contra: 0.4 }],
    pasillos: [10.6, 21.2, 31.8, 42.4, 53, 63.6, 74.2, 84.8, 95.4],
    // las sillas rojas que escriben IDRD en los 4 bloques del centro (foto IMG_9178)
    letras: { real: 'IDRD', inter: 'INTER', desde: 32.4, hasta: 74.2 },
    barandaAtras: true,
  },
  {
    id: 'occidental-norte', tribuna: 'occidental-norte', A: [-52.5, 12], B: [-48, 66], base: 1.8,
    // fotos: 6–7 filas rojas abajo, pasillo, ~12 filas amarillas, palcos de vidrio y oficinas bajo el techo
    bandejas: [
      { filas: 7, huella: 0.8, contra: 0.38 },
      { salto: 1.6, subida: 1.2, filas: 13, huella: 0.85, contra: 0.45 },
    ],
    pasillos: [9, 18, 27, 36, 45],
    palco: { fondo: 6, alto: 3.2, cajas: 10 },
    edificio: { fondo: 17 },
    techo: { tipo: 'concreto', desde: 2.5, frente: 15.2, fondo: 16.6, color: 0xdcd9d2, nervios: 3.2 },
  },
  {
    id: 'occidental-sur', tribuna: 'occidental-sur', A: [-47, -76], B: [-51.5, -9], base: 1.0,
    bandejas: [
      { filas: 12, huella: 0.85, contra: 0.38 },
      { salto: 1.4, subida: 1.6, filas: 16, huella: 0.8, contra: 0.44 },
    ],
    pasillos: [7, 16, 25, 34, 43, 52, 61],
    edificio: { fondo: 5 },
    techo: { tipo: 'lona', desde: 9.4, frente: 17, fondo: 17.5, color: 0xf4f4f1, vanos: 9 },
  },
];

export const TRIBUNAS = {
  'norte': { nombre: 'Norte', techo: false, prefijo: 'N' },
  'oriental': { nombre: 'Oriental', techo: false, prefijo: 'OR' },
  'occidental-norte': { nombre: 'Occidental Norte', techo: true, prefijo: 'ON' },
  'occidental-sur': { nombre: 'Occidental Sur', techo: true, prefijo: 'OS' },
};

// Torres de luz (base medida en el satélite; las cabezas apuntan al centro).
// La del noreste es la torre doble con pantalla (fotos IMG_9178 y video); las otras, un solo poste.
export const TORRES = [
  { x: -40, y: 74.3, tipo: 'poste' }, { x: 48.6, y: 68.6, tipo: 'doble' },
  { x: 38.6, y: -55.7, tipo: 'poste' }, { x: -38.6, y: -56.4, tipo: 'poste' },
];
export const ALTO_TORRE = 35;

// Bancos de suplentes, costado occidental.
// Túneles curvos frente a la Occidental: blancos (patrocinio) y de policarbonato (bancos).
export const BANCOS = [
  { y: 21, largo: 5, tipo: 'blanco' }, { y: 15, largo: 3.5, tipo: 'claro' },
  { y: 4.5, largo: 16, tipo: 'blanco' }, { y: -9, largo: 9, tipo: 'claro' },
  { y: -21, largo: 9, tipo: 'claro' },
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
  arriba:            { nombre: 'Desde arriba',      pos: [-22, 0, 430], mira: [-20, 0, 0], fov: 32 },
  general:           { nombre: 'Vista general',     pos: [-60, 2, 150], mira: [40, 3, 0], fov: 38 },
  'norte':           { nombre: 'Norte',             pos: [0, -2, 46], mira: [0, 70, 4], fov: 40 },
  'oriental':        { nombre: 'Oriental',          pos: [-30, 2, 46], mira: [46, 4, 4], fov: 42 },
  'occidental-norte':{ nombre: 'Occidental Norte',  pos: [24, 22, 58], mira: [-62, 42, 6], fov: 40 },
  'occidental-sur':  { nombre: 'Occidental Sur',    pos: [24, -40, 54], mira: [-60, -42, 6], fov: 40 },
};
