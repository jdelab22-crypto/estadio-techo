// Endereza la foto satelital sobre el eje de la cancha y dibuja una cuadrícula en metros.
// uso: swift enderezar.swift entrada.jpg cx cy anguloGrados mPorPx salida.jpg [metros=220] [pxPorMetro=8] [rejilla=1] [ox=0] [oy=0]
// (ox,oy) = centro de la salida en metros locales: x hacia la Oriental, y hacia el arco norte
import AppKit
let a = CommandLine.arguments
let src = NSImage(contentsOfFile: a[1])!
let rep0 = NSBitmapImageRep(data: src.tiffRepresentation!)!
let W = Double(rep0.pixelsWide), H = Double(rep0.pixelsHigh)
let cx = Double(a[2])!, cy = Double(a[3])!, ang = Double(a[4])!, mpp = Double(a[5])!
let span = a.count > 7 ? Double(a[7])! : 220, ppm = a.count > 8 ? Double(a[8])! : 8
let N = Int(span * ppm)
let grid = a.count > 9 ? a[9] != "0" : true
let ox = a.count > 10 ? Double(a[10])! : 0, oy = a.count > 11 ? Double(a[11])! : 0
let out = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: N, pixelsHigh: N, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)
let ctx = NSGraphicsContext.current!.cgContext
ctx.setFillColor(NSColor.black.cgColor); ctx.fill(CGRect(x: 0, y: 0, width: N, height: N))
// local metres (x right, y up = toward north goal) -> output px; output centre = (0,0)
ctx.translateBy(x: CGFloat(N)/2, y: CGFloat(N)/2)
ctx.scaleBy(x: CGFloat(ppm), y: CGFloat(ppm))
ctx.translateBy(x: CGFloat(-ox), y: CGFloat(-oy))
ctx.rotate(by: CGFloat(ang * .pi / 180))           // undo the pitch rotation
ctx.scaleBy(x: CGFloat(mpp), y: CGFloat(mpp))     // image px -> metres
ctx.translateBy(x: CGFloat(-cx), y: CGFloat(-(H - cy)))
ctx.draw(rep0.cgImage!, in: CGRect(x: 0, y: 0, width: W, height: H))
NSGraphicsContext.restoreGraphicsState()
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: out)
let g = NSGraphicsContext.current!.cgContext
let half = span / 2
if grid {
for axis in 0..<2 {
let o = axis == 0 ? ox : oy
var m = ((o - half) / 10).rounded(.up) * 10
while m <= o + half {
  let p = CGFloat((m - o + half) * ppm)
  let major = Int(m.rounded()) % 50 == 0
  g.setStrokeColor(major ? NSColor.cyan.withAlphaComponent(0.9).cgColor : NSColor.white.withAlphaComponent(0.35).cgColor)
  g.setLineWidth(major ? 2 : 1)
  if axis == 0 { g.move(to: CGPoint(x: p, y: 0)); g.addLine(to: CGPoint(x: p, y: CGFloat(N))) }
  else { g.move(to: CGPoint(x: 0, y: p)); g.addLine(to: CGPoint(x: CGFloat(N), y: p)) }
  g.strokePath()
  if Int(m.rounded()) % 20 == 0 {
    let s = NSAttributedString(string: "\(Int(m))", attributes: [.font: NSFont.boldSystemFont(ofSize: 18), .foregroundColor: NSColor.yellow])
    if axis == 0 { s.draw(at: NSPoint(x: Double(p) + 3, y: 6)) } else { s.draw(at: NSPoint(x: 6, y: Double(p) + 3)) }
  }
  m += 10
}
}
}
NSGraphicsContext.restoreGraphicsState()
try! out.representation(using: .jpeg, properties: [.compressionFactor: 0.88])!.write(to: URL(fileURLWithPath: a[6]))
