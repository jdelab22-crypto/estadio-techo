// Recomprime un video para la web (H.264). uso: swift video-web.swift entrada.mp4 salida.mp4 [preset=1280x720]
import AVFoundation
let a = CommandLine.arguments
let preset = a.count > 3 && a[3] == "1080" ? AVAssetExportPreset1920x1080 : AVAssetExportPreset1280x720
let exp = AVAssetExportSession(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])), presetName: preset)!
let out = URL(fileURLWithPath: a[2]); try? FileManager.default.removeItem(at: out)
exp.outputURL = out; exp.outputFileType = .mp4; exp.shouldOptimizeForNetworkUse = true
let s = DispatchSemaphore(value: 0); exp.exportAsynchronously { s.signal() }; s.wait()
print(exp.status == .completed ? "ok" : "error \(String(describing: exp.error))")
