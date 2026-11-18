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
Norte (sin techo, 18 filas), Oriental (sin techo, 12 filas), Occidental Norte (bandeja baja de 7 filas
+ alta de 26 bajo techo, palcos VIP arriba), Occidental Sur (baja de 12 filas descubierta + alta de 16
bajo techo). En el sur no hay tribuna. Alturas y número de filas son estimados: falta confirmarlos con
fotos desde adentro y el mapa de sillas de la boletería.
