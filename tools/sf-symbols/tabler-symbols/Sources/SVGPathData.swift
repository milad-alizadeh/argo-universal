import CoreGraphics
import Foundation

private let commands: [CGPathElementType: (letter: String, points: Int)] = [
  .moveToPoint: ("M", 1),
  .addLineToPoint: ("L", 1),
  .addQuadCurveToPoint: ("Q", 2),
  .addCurveToPoint: ("C", 3),
  .closeSubpath: ("Z", 0),
]

func svgPathData(_ path: CGPath) -> String {
  var data = ""
  path.applyWithBlock { element in data += svgCommand(element.pointee) }
  return data
}

private func svgCommand(_ element: CGPathElement) -> String {
  guard let command = commands[element.type] else { return "" }
  let points = (0..<command.points).map { coordinates(element.points[$0]) }
  return command.letter + points.joined(separator: " ")
}

private func coordinates(_ point: CGPoint) -> String {
  "\(number(point.x)) \(number(point.y))"
}

private func number(_ value: CGFloat) -> String {
  let text = String(format: "%.3f", value).replacingOccurrences(of: #"\.?0+$"#, with: "", options: .regularExpression)
  return text == "-0" ? "0" : text
}
