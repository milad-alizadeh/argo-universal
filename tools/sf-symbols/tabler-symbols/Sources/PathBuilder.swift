import CoreGraphics

enum CurveKind { case cubic, quadratic }

// The control point a smooth curve reflects, left by the curve command before it.
struct CurveControl {
  let kind: CurveKind
  let point: CGPoint
}

// Draws SVG path data into a CGPath; a lowercase command is relative to the current point.
final class PathBuilder {
  private typealias Command = (PathBuilder) -> (Bool) -> CurveControl?

  private static let commands: [Character: Command] = [
    "M": PathBuilder.move, "L": PathBuilder.line, "H": PathBuilder.horizontal, "V": PathBuilder.vertical,
    "C": PathBuilder.cubic, "S": PathBuilder.smoothCubic, "Q": PathBuilder.quadratic,
    "T": PathBuilder.smoothQuadratic, "A": PathBuilder.arc, "Z": PathBuilder.close,
  ]

  private var scanner: PathScanner
  private let path = CGMutablePath()
  private var current = CGPoint.zero
  private var start = CGPoint.zero
  private var previousControl: CurveControl?

  private init(_ data: String) { scanner = PathScanner(data) }

  static func path(from data: String) -> CGPath { PathBuilder(data).build() }

  private func build() -> CGPath {
    var command = scanner.command()
    while let next = command {
      run(next)
      command = scanner.command() ?? repeated(after: next)
    }
    return path
  }

  // Numbers after a command repeat it, except that a move's extra pairs draw lines.
  private func repeated(after command: Character) -> Character? {
    guard scanner.hasNumber(), command.uppercased() != "Z" else { return nil }
    return ["M": "L", "m": "l"][command] ?? command
  }

  private func run(_ command: Character) {
    guard let draw = Self.commands[Character(command.uppercased())] else {
      fatalError("Unsupported path command \(command)")
    }
    previousControl = draw(self)(command.isLowercase)
  }

  private func point(relative: Bool) -> CGPoint {
    let point = scanner.point()
    return relative ? CGPoint(x: current.x + point.x, y: current.y + point.y) : point
  }

  private func reflected(_ kind: CurveKind) -> CGPoint {
    guard let previousControl, previousControl.kind == kind else { return current }
    return CGPoint(x: 2 * current.x - previousControl.point.x, y: 2 * current.y - previousControl.point.y)
  }

  private func move(relative: Bool) -> CurveControl? {
    current = point(relative: relative)
    start = current
    path.move(to: current)
    return nil
  }

  private func line(relative: Bool) -> CurveControl? {
    current = point(relative: relative)
    path.addLine(to: current)
    return nil
  }

  private func horizontal(relative: Bool) -> CurveControl? {
    let x = scanner.number()
    current.x = relative ? current.x + x : x
    path.addLine(to: current)
    return nil
  }

  private func vertical(relative: Bool) -> CurveControl? {
    let y = scanner.number()
    current.y = relative ? current.y + y : y
    path.addLine(to: current)
    return nil
  }

  private func cubic(relative: Bool) -> CurveControl? {
    cubic(from: point(relative: relative), relative: relative)
  }

  private func smoothCubic(relative: Bool) -> CurveControl? {
    cubic(from: reflected(.cubic), relative: relative)
  }

  private func cubic(from control1: CGPoint, relative: Bool) -> CurveControl? {
    let control2 = point(relative: relative), end = point(relative: relative)
    path.addCurve(to: end, control1: control1, control2: control2)
    current = end
    return CurveControl(kind: .cubic, point: control2)
  }

  private func quadratic(relative: Bool) -> CurveControl? {
    quadratic(through: point(relative: relative), relative: relative)
  }

  private func smoothQuadratic(relative: Bool) -> CurveControl? {
    quadratic(through: reflected(.quadratic), relative: relative)
  }

  private func quadratic(through control: CGPoint, relative: Bool) -> CurveControl? {
    let end = point(relative: relative)
    path.addQuadCurve(to: end, control: control)
    current = end
    return CurveControl(kind: .quadratic, point: control)
  }

  private func arc(relative: Bool) -> CurveControl? {
    let shape = scanner.arcShape()
    let end = point(relative: relative)
    if shape.hasRadii {
      EllipticalArc(start: current, end: end, shape: shape).curves().forEach(add)
    } else {
      path.addLine(to: end)
    }
    current = end
    return nil
  }

  private func add(_ curve: CubicCurve) {
    path.addCurve(to: curve.end, control1: curve.control1, control2: curve.control2)
  }

  private func close(relative _: Bool) -> CurveControl? {
    path.closeSubpath()
    current = start
    return nil
  }
}
