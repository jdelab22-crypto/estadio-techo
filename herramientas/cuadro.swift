// Saca un cuadro en el segundo indicado (negativo = desde el final). uso: swift cuadro.swift video.mp4 segundos salida.jpg
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let g = AVAssetImageGenerator(asset: asset); g.appliesPreferredTrackTransform = true
g.requestedTimeToleranceBefore = .zero; g.requestedTimeToleranceAfter = .zero
let d = CMTimeGetSeconds(asset.duration), s = Double(a[2])!
let img = try! g.copyCGImage(at: CMTime(seconds: s < 0 ? d + s : s, preferredTimescale: 600), actualTime: nil)
try! NSBitmapImageRep(cgImage: img).representation(using: .jpeg, properties: [.compressionFactor: 0.85])!.write(to: URL(fileURLWithPath: a[3]))
print("ok", d)
