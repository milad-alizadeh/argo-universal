import CoreGraphics
import Foundation

// Tabler draws 2-point strokes with round caps and joins on a 24-point grid.
let grid = 24.0
let strokeWidth = 2.0

// The other custom symbols' box in 100-point type, centred on the advance and on half the cap height.
let box = 137.5
let top = -103.98
let viewBox = "-68.75 \(top) 137.5 137.5"

func svgFiles(in folder: URL) throws -> [URL] {
  try FileManager.default.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)
    .filter { $0.pathExtension == "svg" }
    .sorted { $0.lastPathComponent < $1.lastPathComponent }
}

func symbolPathsJSON(_ files: [URL]) throws -> String {
  "{\n\(try files.map(symbolEntry).joined(separator: ",\n"))\n}"
}

private func symbolEntry(_ file: URL) throws -> String {
  let name = "custom.\(file.deletingPathExtension().lastPathComponent)"
  return "  \"\(name)\": {\n    \"viewBox\": \"\(viewBox)\",\n    \"d\": \"\(try filledOutline(of: file))\"\n  }"
}

// The asset catalog and the masks need filled shapes, so the strokes are outlined and unioned.
private func filledOutline(of file: URL) throws -> String {
  let filled = try strokes(in: file)
    .copy(strokingWithWidth: strokeWidth, lineCap: .round, lineJoin: .round, miterLimit: 10)
    .normalized(using: .winding)
  var placed = CGAffineTransform(translationX: -box / 2, y: top).scaledBy(x: box / grid, y: box / grid)
  return svgPathData(filled.copy(using: &placed)!)
}

// Some Tabler builds carry an invisible `stroke="none"` frame, which is skipped.
private func strokes(in file: URL) throws -> CGPath {
  let strokes = CGMutablePath()
  let data = try XMLDocument(contentsOf: file)
    .nodes(forXPath: "//*[local-name()='path'][not(@stroke='none')]/@d")
  for d in data.compactMap(\.stringValue) { strokes.addPath(PathBuilder.path(from: d)) }
  return strokes
}
