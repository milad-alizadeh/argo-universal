import CoreGraphics
import Foundation

// Converts Tabler's outline icons into filled custom-symbol paths (ADR-0019), printing their JSON to stdout:
//   swift tools/sf-symbols/tabler-symbols.swift packages/client/src/lib/generic/symbols/assets/tabler \
//     > packages/client/src/lib/generic/symbols/tabler-symbol-paths.json
// Each icon's strokes (24-point grid, width 2, round caps and joins) are outlined and unioned by Core Graphics, so the
// iOS asset catalog and the masks get filled shapes. The 24-point box becomes the 137.5-unit box the other custom
// symbols use, in 100-point type, centred on the advance and on half the cap height.
let grid = 24.0
let strokeWidth = 2.0
let box = 137.5
let top = -103.98
let viewBox = "-68.75 \(top) 137.5 137.5"

struct PathParser {
  private let scalars: [Character]
  private var index = 0
  private(set) var path = CGMutablePath()
  private var current = CGPoint.zero
  private var start = CGPoint.zero
  private var lastControl: CGPoint?
  private var lastCommand: Character = " "

  init(_ data: String) { scalars = Array(data) }

  private mutating func skipSeparators() {
    while index < scalars.count, scalars[index].isWhitespace || scalars[index] == "," { index += 1 }
  }

  private mutating func command() -> Character? {
    skipSeparators()
    guard index < scalars.count, scalars[index].isLetter else { return nil }
    defer { index += 1 }
    return scalars[index]
  }

  private mutating func hasNumber() -> Bool {
    skipSeparators()
    guard index < scalars.count else { return false }
    let next = scalars[index]
    return next.isNumber || next == "-" || next == "+" || next == "."
  }

  private mutating func number() -> Double {
    skipSeparators()
    var text = ""
    var seenDot = false, seenExponent = false
    while index < scalars.count {
      let next = scalars[index]
      let signAllowed = text.isEmpty || text.last == "e" || text.last == "E"
      if next.isNumber { text.append(next) }
      else if (next == "-" || next == "+") && signAllowed { text.append(next) }
      else if next == "." && !seenDot && !seenExponent { seenDot = true; text.append(next) }
      else if (next == "e" || next == "E") && !seenExponent { seenExponent = true; text.append(next) }
      else { break }
      index += 1
    }
    return Double(text) ?? 0
  }

  // Arc flags may be written without separators ("a2 2 0 1 0 4 0" or "a2 2 0 104 0").
  private mutating func flag() -> Bool {
    skipSeparators()
    defer { index += 1 }
    return scalars[index] == "1"
  }

  private mutating func point(relative: Bool) -> CGPoint {
    let x = number(), y = number()
    return relative ? CGPoint(x: current.x + x, y: current.y + y) : CGPoint(x: x, y: y)
  }

  mutating func parse() -> CGPath {
    var command: Character = " "
    while true {
      if let next = self.command() { command = next } else if !hasNumber() || command == "Z" || command == "z" { break }
      draw(command)
      if command == "M" { command = "L" } else if command == "m" { command = "l" }
    }
    return path
  }

  private mutating func draw(_ command: Character) {
    let relative = command.isLowercase
    var control: CGPoint?
    switch command.uppercased() {
    case "M":
      current = point(relative: relative); start = current; path.move(to: current)
    case "L":
      current = point(relative: relative); path.addLine(to: current)
    case "H":
      let x = number(); current.x = relative ? current.x + x : x; path.addLine(to: current)
    case "V":
      let y = number(); current.y = relative ? current.y + y : y; path.addLine(to: current)
    case "C":
      let c1 = point(relative: relative), c2 = point(relative: relative), end = point(relative: relative)
      path.addCurve(to: end, control1: c1, control2: c2); current = end; control = c2
    case "S":
      let c1 = reflected("CS"), c2 = point(relative: relative), end = point(relative: relative)
      path.addCurve(to: end, control1: c1, control2: c2); current = end; control = c2
    case "Q":
      let c = point(relative: relative), end = point(relative: relative)
      path.addQuadCurve(to: end, control: c); current = end; control = c
    case "T":
      let c = reflected("QT"), end = point(relative: relative)
      path.addQuadCurve(to: end, control: c); current = end; control = c
    case "A":
      let rx = number(), ry = number(), rotation = number()
      let large = flag(), sweep = flag(), end = point(relative: relative)
      addArc(to: end, rx: rx, ry: ry, rotation: rotation * .pi / 180, large: large, sweep: sweep)
      current = end
    case "Z":
      path.closeSubpath(); current = start
    default:
      fatalError("Unsupported path command \(command)")
    }
    lastControl = control
    lastCommand = Character(command.uppercased())
  }

  private func reflected(_ previous: String) -> CGPoint {
    guard let lastControl, previous.contains(lastCommand) else { return current }
    return CGPoint(x: 2 * current.x - lastControl.x, y: 2 * current.y - lastControl.y)
  }

  // SVG's endpoint arc as cubic curves of at most a quarter turn each (SVG 1.1, appendix F.6.5).
  private mutating func addArc(to end: CGPoint, rx: Double, ry: Double, rotation: Double, large: Bool, sweep: Bool) {
    if end == current { return }
    var rx = abs(rx), ry = abs(ry)
    if rx == 0 || ry == 0 { path.addLine(to: end); return }
    let cosR = cos(rotation), sinR = sin(rotation)
    let dx = (current.x - end.x) / 2, dy = (current.y - end.y) / 2
    let x1 = cosR * dx + sinR * dy, y1 = -sinR * dx + cosR * dy
    let lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
    if lambda > 1 { rx *= lambda.squareRoot(); ry *= lambda.squareRoot() }
    let numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    let denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
    let coefficient = (large != sweep ? 1.0 : -1.0) * max(0, numerator / denominator).squareRoot()
    let cx1 = coefficient * rx * y1 / ry, cy1 = -coefficient * ry * x1 / rx
    let cx = cosR * cx1 - sinR * cy1 + (current.x + end.x) / 2
    let cy = sinR * cx1 + cosR * cy1 + (current.y + end.y) / 2
    func angle(_ ux: Double, _ uy: Double, _ vx: Double, _ vy: Double) -> Double {
      atan2(ux * vy - uy * vx, ux * vx + uy * vy)
    }
    let theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
    var delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
    if !sweep && delta > 0 { delta -= 2 * .pi } else if sweep && delta < 0 { delta += 2 * .pi }
    let segments = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
    let step = delta / Double(segments)
    let k = 4.0 / 3.0 * tan(step / 4)
    func onEllipse(_ t: Double) -> CGPoint {
      CGPoint(x: cx + rx * cosR * cos(t) - ry * sinR * sin(t), y: cy + rx * sinR * cos(t) + ry * cosR * sin(t))
    }
    func tangent(_ t: Double) -> CGPoint {
      CGPoint(x: -rx * cosR * sin(t) - ry * sinR * cos(t), y: -rx * sinR * sin(t) + ry * cosR * cos(t))
    }
    for segment in 0..<segments {
      let t1 = theta + Double(segment) * step, t2 = t1 + step
      let p1 = onEllipse(t1), p2 = segment == segments - 1 ? end : onEllipse(t2)
      let d1 = tangent(t1), d2 = tangent(t2)
      path.addCurve(
        to: p2,
        control1: CGPoint(x: p1.x + k * d1.x, y: p1.y + k * d1.y),
        control2: CGPoint(x: p2.x - k * d2.x, y: p2.y - k * d2.y))
    }
  }
}

// The `d` of each stroked path in a Tabler SVG; the invisible `stroke="none"` frame some icons carry is skipped.
final class StrokeReader: NSObject, XMLParserDelegate {
  var paths: [String] = []

  func parser(
    _ parser: XMLParser, didStartElement name: String, namespaceURI: String?, qualifiedName: String?,
    attributes: [String: String]
  ) {
    if name == "path", attributes["stroke"] != "none", let d = attributes["d"] { paths.append(d) }
  }
}

func number(_ value: CGFloat) -> String {
  let text = String(format: "%.3f", value).replacingOccurrences(of: #"\.?0+$"#, with: "", options: .regularExpression)
  return text == "-0" ? "0" : text
}

func svgPathData(_ path: CGPath) -> String {
  var data = ""
  let point = { (p: CGPoint) -> String in "\(number(p.x)) \(number(p.y))" }
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

func outline(_ file: URL) -> String {
  let reader = StrokeReader()
  let parser = XMLParser(contentsOf: file)!
  parser.delegate = reader
  guard parser.parse() else { fatalError("Cannot read \(file.path)") }
  let strokes = CGMutablePath()
  for d in reader.paths {
    var parser = PathParser(d)
    strokes.addPath(parser.parse())
  }
  let filled = strokes
    .copy(strokingWithWidth: strokeWidth, lineCap: .round, lineJoin: .round, miterLimit: 10)
    .normalized(using: .winding)
  let scale = box / grid
  var placed = CGAffineTransform(translationX: -box / 2, y: top).scaledBy(x: scale, y: scale)
  return svgPathData(filled.copy(using: &placed)!)
}

let folder = URL(fileURLWithPath: CommandLine.arguments[1])
let files = try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
  .filter { $0.pathExtension == "svg" }
  .sorted { $0.lastPathComponent < $1.lastPathComponent }
let entries = files.map { file in
  let name = "custom.\(file.deletingPathExtension().lastPathComponent)"
  return "  \"\(name)\": {\n    \"viewBox\": \"\(viewBox)\",\n    \"d\": \"\(outline(file))\"\n  }"
}
print("{\n\(entries.joined(separator: ",\n"))\n}")
