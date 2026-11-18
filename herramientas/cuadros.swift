// Saca N cuadros repartidos de un video. uso: swift cuadros.swift video.mov carpeta N
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let gen = AVAssetImageGenerator(asset: asset); gen.appliesPreferredTrackTransform = true
gen.maximumSize = CGSize(width: 1600, height: 1600)
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let dur = CMTimeGetSeconds(asset.duration), n = Int(a[3])!
for i in 0..<n {
  let t = CMTime(seconds: dur * (Double(i) + 0.5) / Double(n), preferredTimescale: 600)
  let img = try! gen.copyCGImage(at: t, actualTime: nil)
  let rep = NSBitmapImageRep(cgImage: img)
  try! rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85])!.write(to: URL(fileURLWithPath: "\(a[2])/video-\(i+1).jpg"))
}
print("ok", dur)
