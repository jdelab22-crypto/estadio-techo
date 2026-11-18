# Metropolitano de Techo en 3D

Paso 1 del "método del estadio" (PDF de Omnya Lab): el estadio escrito en código con three.js,
para después sacar de él cada toma (fotos con IA, clips y máscaras) y la página de escoger silla.

## Ver
Vista previa: configuración `estadio-techo` (puerto 3390) en `~/Desktop/cumple-inter/.claude/launch.json`.
Cámaras por URL: `#arriba`, `#general`, `#norte`, `#oriental`, `#occidental-norte`, `#occidental-sur`, `#silla-<índice>`.
En la consola: `techo.ir('norte')`, `techo.sentarse(i)`, `techo.sillas` (cada silla: tribuna, bandeja, bloque, fila, número).

## Archivos
- `assets/datos.js` — todas las medidas: segmentos de tribuna, pasillos, techos, torres, cámaras.
- `assets/estadio.js` — construye la escena; todas las sillas van en un solo InstancedMesh.
- `assets/suelo.jpg` — satélite enderezado sobre el eje de la cancha (520 m, 5 px/m).
- `referencias/` — mosaicos satelitales originales (Esri World Imagery, zoom 19).
- `herramientas/sat.py` baja teselas; `stitch.swift` las une; `enderezar.swift` gira el satélite al eje
  de la cancha y dibuja una rejilla en metros para medir:
  `swift herramientas/enderezar.swift referencias/satelite-z19.jpg 1365 1276 19.3 0.1488 salida.jpg 220 7`

## Medidas (del satélite)
Cancha girada 19,3° horario respecto al norte. Arcos en y = ±53 m. Tribunas:
Norte (sin techo, 18 filas), Oriental (sin techo, 12 filas, "IDRD" en sillas rojas), Occidental Norte
(7 filas rojas + 13 amarillas bajo techo de concreto, palcos de vidrio y oficinas detrás), Occidental Sur
(12 filas descubiertas + 16 bajo lona blanca). En el sur no hay tribuna. Torre doble con pantalla en la
esquina noreste. Ajustado con las fotos de `referencias/fotos/` (30-jul); el número exacto de filas y
sillas sigue siendo estimado hasta tener el mapa de la boletería.

## Paso 2: fotos con IA (Higgsfield)
1. Tomas del 3D en alta: en la consola, `await techo.guardar('3d-nombre', 2400, 1350)` → `tomas/3d-nombre.png`
   (lo escribe `herramientas/servidor.py`, que es el servidor de la vista previa).
2. Modelo `gpt_image_2_6`, calidad `high`, `2k`, 16:9 (2,75 créditos c/u). Referencias: la toma 3D primero y,
   si sirve, una foto real (`referencias/fotos/IMG_9178.jpg`) solo para materiales y color.
3. Prompt: "Turn the first image, a 3D render, into an ultra-photorealistic … same camera, same framing,
   same geometry … Change only materials and light, add nothing … Warm late afternoon … No CGI look, no people".
Resultados en `fotos-ia/` (v1 del 18-nov: arriba, oriental, silla ON-203 fila 4 silla 10).

## La página: `boletas/` (escoger silla)
Abrir http://localhost:3390/boletas/ (misma vista previa). Flujo: vista cenital → hover tiñe la tribuna
(máscara + `mix-blend-mode: color`) → clic baja (Oriental con el video de Kling; las demás con acercamiento
y fundido) → hover/clic en bloque → mapa de sillas → boleta con la vista → mejora a palco VIP.
- Precios, puertas y textos: `boletas/datos.js` (precios DE EJEMPLO; textos de interbogota.com/boletas).
- Zonas: `boletas/zonas/mascara-*.png|json` salen del 3D con `techo.guardarMascara()` usando la MISMA cámara
  de la foto IA; `mapa-sillas.json` con `techo.mapaSillas()`. Si se rehace una foto, revisar que la máscara
  calce (la de la Occidental Norte necesitó 3 intentos: sin la foto v1 como referencia, que la IA copiaba).
- Medios: `boletas/media/` (fotos a 1920 px, video a 720p con `herramientas/video-web.swift`).
- URL guarda el estado: `#oriental/OR-105/6-10/vip`.
