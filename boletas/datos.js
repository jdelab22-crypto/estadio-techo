// Datos de la boletería del Metropolitano de Techo.
// PRECIOS DE EJEMPLO: reemplazar por los de boletas.interbogota.com antes de publicar.
export const MONEDA = (n) => '$' + n.toLocaleString('es-CO');

// Textos de las tribunas tomados de interbogota.com/boletas.
export const TRIBUNAS = {
  'occidental-norte': {
    nombre: 'Occidental Norte', techo: true, puerta: 'Puerta 1',
    precio: [70000, 90000], // bandeja baja, bandeja alta
    texto: 'Tribuna local con techo. Aquí están las sillas donde nuestra banda está presente. En esta tribuna también quedan el palco y la zona VIP.',
    vista: 'media/silla-occidental-norte.jpg', foto: 'media/tribuna-occidental-norte.jpg', mascara: 'final-occidental-norte',
    agotado: 0.62,
    video: 'media/bajada-occidental-norte.mp4', giro: { grados: 180, escala: 1, ox: 0.5, oy: 0.5 },
  },
  'occidental-sur': {
    nombre: 'Occidental Sur', techo: true, puerta: 'Puerta 2',
    precio: [55000, 65000],
    texto: 'Nuestra segunda tribuna local, también con techo. Para vivir el partido del lado local sin preocuparse por el clima.',
    vista: 'media/silla-occidental-sur.jpg', foto: 'media/tribuna-occidental-sur.jpg', mascara: 'final-occidental-sur',
    agotado: 0.48,
    video: 'media/bajada-occidental-sur.mp4', giro: { grados: 180, escala: 1, ox: 0.5, oy: 0.5 },
  },
  'norte': {
    nombre: 'Norte', techo: false, puerta: 'Puerta 5',
    precio: [30000],
    texto: 'Detrás del arco norte, a cielo abierto. La tribuna para vivir de cerca cada llegada al área. No tiene techo: en tarde de lluvia bogotana, trae chaqueta.',
    vista: 'media/silla-norte.jpg', foto: 'media/tribuna-norte.jpg', mascara: 'final-norte',
    agotado: 0.4,
    // el video empieza en la vista general girada 90° y acercada (mismo cálculo que herramientas/girar.swift)
    video: 'media/bajada-norte.mp4', giro: { grados: 90, escala: 1.95, ox: 0.47, oy: 0.5 },
  },
  'oriental': {
    nombre: 'Oriental', techo: false, puerta: 'Puerta 3',
    precio: [40000],
    texto: 'Recorre todo el costado oriental, de frente a las tribunas locales: el partido completo a la vista. No tiene techo, así que el sol y la lluvia se viven como en la cancha.',
    vista: 'media/silla-oriental.jpg', foto: 'media/tribuna-oriental.jpg', mascara: 'final-oriental',
    agotado: 0.33,
    // bajada continua del cielo a la tribuna (dos clips de Kling pegados)
    video: 'media/bajada-oriental.mp4',
  },
};

// Bloques que salen agotados completos (ejemplo).
export const BLOQUES_AGOTADOS = ['ON-102', 'N-103', 'OS-207'];

export const PALCO = {
  nombre: 'Palco 5', nivel: 'VIP · Occidental Norte', sillas: 8, entrada: 'VIP', precio: 350000,
  foto: 'media/palco-vip.jpg',
  texto: 'Sillones de cuero, vidrio de frente a la cancha y entrada propia.',
};
