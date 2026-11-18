// Gira y acerca una foto igual que CSS `transform-origin: Ox Oy; transform: rotate(θ) scale(s)`.
// uso: swift girar.swift entrada salida.jpg grados escala Ox Oy [ancho=1920 alto=1080]
import AppKit
let a = CommandLine.arguments
let img = NSImage(contentsOfFile: a[1])!
let th = Double(a[3])! * .pi / 180, s = Double(a[4])!, ox = Double(a[5])!, oy = Double(a[6])!
let W = a.count > 7 ? Int(a[7])! : 1920, H = a.count > 8 ? Int(a[8])! : 1080
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState(); NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let g = NSGraphicsContext.current!.cgContext
g.interpolationQuality = .high
g.setFillColor(NSColor.black.cgColor); g.fill(CGRect(x: 0, y: 0, width: W, height: H))
let O = CGPoint(x: ox * Double(W), y: (1 - oy) * Double(H))   // y hacia arriba en CoreGraphics
g.translateBy(x: O.x, y: O.y); g.rotate(by: CGFloat(-th)); g.scaleBy(x: CGFloat(s), y: CGFloat(s)); g.translateBy(x: -O.x, y: -O.y)
img.draw(in: NSRect(x: 0, y: 0, width: W, height: H))
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.92])!.write(to: URL(fileURLWithPath: a[2]))
