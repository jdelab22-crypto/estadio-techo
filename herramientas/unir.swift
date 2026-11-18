// Pega varios clips en uno, sin recomprimir. uso: swift unir.swift salida.mp4 clip1.mp4 clip2.mp4 ...
import AVFoundation
let a = CommandLine.arguments
let comp = AVMutableComposition()
let pista = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
var t = CMTime.zero
for f in a[2...] {
  let asset = AVURLAsset(url: URL(fileURLWithPath: f))
  let v = asset.tracks(withMediaType: .video)[0]
  try! pista.insertTimeRange(CMTimeRange(start: .zero, duration: asset.duration), of: v, at: t)
  if t == .zero { pista.preferredTransform = v.preferredTransform }
  t = CMTimeAdd(t, asset.duration)
}
let salida = URL(fileURLWithPath: a[1]); try? FileManager.default.removeItem(at: salida)
let exp = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!
exp.outputURL = salida; exp.outputFileType = .mp4
let s = DispatchSemaphore(value: 0)
exp.exportAsynchronously { s.signal() }
s.wait()
print(exp.status == .completed ? "ok \(CMTimeGetSeconds(t)) s" : "error \(String(describing: exp.error))")
