import CoreGraphics
import Foundation

// An arc command's radii, its x-axis rotation in radians and its two flags.
struct ArcShape {
  let radii: CGVector
  let rotation: Double
  let large: Bool
  let sweep: Bool

  var hasRadii: Bool { radii.dx != 0 && radii.dy != 0 }
}

extension PathScanner {
  mutating func arcShape() -> ArcShape {
    let radiusX = abs(number()), radiusY = abs(number())
    let rotation = number() * .pi / 180
    let large = flag()
    return ArcShape(radii: CGVector(dx: radiusX, dy: radiusY), rotation: rotation, large: large, sweep: flag())
  }
}

struct CubicCurve {
  let control1: CGPoint
  let control2: CGPoint
  let end: CGPoint
}

// SVG's endpoint arc as cubic curves of at most a quarter turn each (SVG 1.1, appendix F.6.5).
struct EllipticalArc {
  let start: CGPoint
  let end: CGPoint
  let shape: ArcShape

  func curves() -> [CubicCurve] {
    guard end != start else { return [] }
    return turn().curves(endingAt: end)
  }

  // F.6.5 steps 3 and 4: the centre, the start angle and the angle swept.
  private func turn() -> ArcTurn {
    let frame = ArcFrame(self)
    let centre = frame.centre(shape)
    let u = CGVector(dx: (frame.x1 - centre.dx) / frame.rx, dy: (frame.y1 - centre.dy) / frame.ry)
    let v = CGVector(dx: (-frame.x1 - centre.dx) / frame.rx, dy: (-frame.y1 - centre.dy) / frame.ry)
    let ellipse = Ellipse(centre: placed(centre, in: frame), frame: frame)
    return ArcTurn(ellipse: ellipse, theta: angle(from: CGVector(dx: 1, dy: 0), to: u), delta: swept(angle(from: u, to: v)))
  }

  private func placed(_ centre: CGVector, in frame: ArcFrame) -> CGPoint {
    CGPoint(
      x: frame.cosR * centre.dx - frame.sinR * centre.dy + (start.x + end.x) / 2,
      y: frame.sinR * centre.dx + frame.cosR * centre.dy + (start.y + end.y) / 2)
  }

  // atan2 gives the shorter turn; the sweep flag picks the direction.
  private func swept(_ delta: Double) -> Double {
    let isWrongWay = shape.sweep ? delta < 0 : delta > 0
    guard isWrongWay else { return delta }
    return shape.sweep ? delta + 2 * .pi : delta - 2 * .pi
  }
}

private func angle(from u: CGVector, to v: CGVector) -> Double {
  atan2(u.dx * v.dy - u.dy * v.dx, u.dx * v.dx + u.dy * v.dy)
}

// F.6.5 step 1: the start point in the ellipse's own axes, from the chord's midpoint, with radii grown to reach the end (F.6.6).
private struct ArcFrame {
  let cosR: Double, sinR: Double
  let x1: Double, y1: Double
  let rx: Double, ry: Double

  init(_ arc: EllipticalArc) {
    cosR = cos(arc.shape.rotation)
    sinR = sin(arc.shape.rotation)
    let dx = (arc.start.x - arc.end.x) / 2, dy = (arc.start.y - arc.end.y) / 2
    x1 = cosR * dx + sinR * dy
    y1 = -sinR * dx + cosR * dy
    let radii = arc.shape.radii
    let lambda = (x1 * x1) / (radii.dx * radii.dx) + (y1 * y1) / (radii.dy * radii.dy)
    let growth = lambda > 1 ? lambda.squareRoot() : 1
    rx = radii.dx * growth
    ry = radii.dy * growth
  }

  // F.6.5 step 2: of the two ellipses through both points, the flags pick one.
  func centre(_ shape: ArcShape) -> CGVector {
    let numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
    let denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
    let sign = shape.large != shape.sweep ? 1.0 : -1.0
    let coefficient = sign * max(0, numerator / denominator).squareRoot()
    return CGVector(dx: coefficient * rx * y1 / ry, dy: -coefficient * ry * x1 / rx)
  }
}

private struct ArcStep {
  let angle: Double
  let k: Double

  init(angle: Double) {
    self.angle = angle
    k = 4.0 / 3.0 * tan(angle / 4)
  }
}

private struct ArcTurn {
  let ellipse: Ellipse
  let theta: Double
  let delta: Double

  func curves(endingAt end: CGPoint) -> [CubicCurve] {
    let segments = max(1, Int((abs(delta) / (.pi / 2)).rounded(.up)))
    let step = ArcStep(angle: delta / Double(segments))
    return (0..<segments).map { segment in
      let t = theta + Double(segment) * step.angle
      let segmentEnd = segment == segments - 1 ? end : ellipse.point(at: t + step.angle)
      return ellipse.curve(from: t, step: step, end: segmentEnd)
    }
  }
}

private struct Ellipse {
  let centre: CGPoint
  let frame: ArcFrame

  func point(at t: Double) -> CGPoint {
    CGPoint(
      x: centre.x + frame.rx * frame.cosR * cos(t) - frame.ry * frame.sinR * sin(t),
      y: centre.y + frame.rx * frame.sinR * cos(t) + frame.ry * frame.cosR * sin(t))
  }

  func tangent(at t: Double) -> CGVector {
    CGVector(
      dx: -frame.rx * frame.cosR * sin(t) - frame.ry * frame.sinR * cos(t),
      dy: -frame.rx * frame.sinR * sin(t) + frame.ry * frame.cosR * cos(t))
  }

  func curve(from t: Double, step: ArcStep, end: CGPoint) -> CubicCurve {
    let start = point(at: t), d1 = tangent(at: t), d2 = tangent(at: t + step.angle)
    return CubicCurve(
      control1: CGPoint(x: start.x + step.k * d1.dx, y: start.y + step.k * d1.dy),
      control2: CGPoint(x: end.x - step.k * d2.dx, y: end.y - step.k * d2.dy),
      end: end)
  }
}
