import AppKit
let a=CommandLine.arguments; let dir=a[1], z=a[2], N=Int(a[3])!, out=a[4]
let s=256; let img=NSImage(size: NSSize(width:s*N,height:s*N)); img.lockFocus()
for r in 0..<N { for c in 0..<N { if let t=NSImage(contentsOfFile:"\(dir)/t_\(z)_\(r)_\(c).jpg") { t.draw(in: NSRect(x:c*s,y:(N-1-r)*s,width:s,height:s)) } } }
img.unlockFocus()
let rep=NSBitmapImageRep(data: img.tiffRepresentation!)!
try! rep.representation(using:.jpeg,properties:[.compressionFactor:0.9])!.write(to:URL(fileURLWithPath:out))
