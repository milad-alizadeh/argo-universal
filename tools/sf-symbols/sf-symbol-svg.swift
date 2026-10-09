import AppKit

// Prints {"<name>": {"width", "height", "d"} | {"width", "height", "bitmap"} | null} for each SF Symbol named on stdin, one per line, drawn at 16 points.
// Paths sit in the symbol image's own box, so an SVG with that viewBox and the default preserveAspectRatio draws what the app draws.
// A symbol with an eraser layer (a badge cut out of a folder) has no single outline, so it comes back as a BMP for potrace instead.
let pointSize = 16.0
let probeScale = 8.0
let traceScale = 64.0

typealias BoolMethod = @convention(c) (AnyObject, Selector) -> Bool

// The glyph and its layers are private CoreUI types, read through key-value coding.
func layers(_ rep: NSImageRep) -> [NSObject] {
  let glyph = (rep as NSObject).value(forKey: "vectorGlyph") as? NSObject
  return glyph?.value(forKey: "monochromeLayers") as? [NSObject] ?? []
}

func erases(_ layer: NSObject) -> Bool {
  let selector = NSSelectorFromString("isEraserLayer")
  guard layer.responds(to: selector) else { return false }
  return unsafeBitCast(layer.method(for: selector), to: BoolMethod.self)(layer, selector)
}

func outline(_ rep: NSImageRep) -> CGPath? {
  let selector = NSSelectorFromString("outlinePath")
  guard rep.responds(to: selector) else { return nil }
  return (rep.perform(selector)?.takeUnretainedValue() as? NSBezierPath)?.cgPath
}

func bitmap(_ image: NSImage, scale: Double) -> NSBitmapImageRep? {
  let width = Int(image.size.width * scale), height = Int(image.size.height * scale)
  guard let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil, pixelsWide: width, pixelsHigh: height, bitsPerSample: 8,
    samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
    bytesPerRow: 0, bitsPerPixel: 0)
  else { return nil }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bitmap)
  NSColor.white.setFill()
  CGRect(x: 0, y: 0, width: width, height: height).fill()
  image.draw(in: CGRect(x: 0, y: 0, width: width, height: height))
  NSGraphicsContext.restoreGraphicsState()
  return bitmap
}

// The inked bounds of the symbol image, in image points with a top-left origin.
func inkBounds(_ image: NSImage) -> CGRect? {
  guard let bitmap = bitmap(image, scale: probeScale) else { return nil }
  var minX = bitmap.pixelsWide, minY = bitmap.pixelsHigh, maxX = -1, maxY = -1
  for y in 0..<bitmap.pixelsHigh {
    for x in 0..<bitmap.pixelsWide where (bitmap.colorAt(x: x, y: y)?.brightnessComponent ?? 1) < 0.5 {
      minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
    }
  }
  guard maxX >= 0 else { return nil }
  return CGRect(
    x: Double(minX) / probeScale, y: Double(minY) / probeScale,
    width: Double(maxX - minX + 1) / probeScale, height: Double(maxY - minY + 1) / probeScale)
}

func number(_ value: CGFloat) -> String {
  String(format: "%.3f", value).replacingOccurrences(of: #"\.?0+$"#, with: "", options: .regularExpression)
}

func svgPathData(_ path: CGPath, _ transform: CGAffineTransform) -> String {
  var data = ""
  let point = { (p: CGPoint) -> String in let q = p.applying(transform); return "\(number(q.x)) \(number(q.y))" }
  path.applyWithBlock { element in
    let p = element.pointee.points
    switch element.pointee.type {
    case .moveToPoint: data += "M\(point(p[0]))"
    case .addLineToPoint: data += "L\(point(p[0]))"
    case .addQuadCurveToPoint: data += "Q\(point(p[0])) \(point(p[1]))"
    case .addCurveToPoint: data += "C\(point(p[0])) \(point(p[1])) \(point(p[2]))"
    case .closeSubpath: data += "Z"
    @unknown default: break
    }
  }
  return data
}

// The outline is in the glyph's own units, y down; scale it onto the inked bounds.
func traced(_ image: NSImage, _ path: CGPath) -> String? {
  guard let ink = inkBounds(image) else { return nil }
  let bounds = path.boundingBoxOfPath
  let scale = max(ink.width / bounds.width, ink.height / bounds.height)
  let transform = CGAffineTransform(translationX: ink.midX, y: ink.midY)
    .scaledBy(x: scale, y: scale)
    .translatedBy(x: -bounds.midX, y: -bounds.midY)
  return svgPathData(path, transform)
}

func render(_ name: String, into folder: URL) -> [String: Any]? {
  guard let image = NSImage(systemSymbolName: name, accessibilityDescription: nil)?
    .withSymbolConfiguration(.init(pointSize: pointSize, weight: .regular)),
    let rep = image.representations.first
  else { return nil }
  let size: [String: Any] = ["width": image.size.width, "height": image.size.height]
  if !layers(rep).contains(where: erases), let path = outline(rep), let data = traced(image, path) {
    return size.merging(["d": data]) { $1 }
  }
  let file = folder.appendingPathComponent("\(name).bmp")
  guard let bmp = bitmap(image, scale: traceScale)?.representation(using: .bmp, properties: [:]),
    (try? bmp.write(to: file)) != nil
  else { return nil }
  return size.merging(["bitmap": file.path, "bitmapScale": traceScale]) { $1 }
}

let folder = URL(fileURLWithPath: CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : NSTemporaryDirectory())
var result: [String: Any] = [:]
while let line = readLine() {
  let name = line.trimmingCharacters(in: .whitespaces)
  if !name.isEmpty { result[name] = render(name, into: folder) ?? NSNull() }
}
FileHandle.standardOutput.write(try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys]))
