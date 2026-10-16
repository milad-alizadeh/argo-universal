import CoreGraphics

// SVG path data allows a number to start where the last one ends: "1.5.5" is 1.5 then .5, "2-2" is 2 then -2.
private let numberPattern = #/[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/#

// Reads SVG path data one command letter, number or flag at a time.
struct PathScanner {
  private var rest: Substring

  init(_ data: String) { rest = data[...] }

  mutating func command() -> Character? {
    skipSeparators()
    guard let next = rest.first, next.isLetter else { return nil }
    return rest.removeFirst()
  }

  mutating func hasNumber() -> Bool {
    skipSeparators()
    return rest.prefixMatch(of: numberPattern) != nil
  }

  mutating func number() -> Double {
    skipSeparators()
    guard let match = rest.prefixMatch(of: numberPattern), let value = Double(match.output) else {
      fatalError("Expected a number at \(rest.prefix(16))")
    }
    rest = rest[match.range.upperBound...]
    return value
  }

  // Arc flags may be written without separators ("a2 2 0 104 0").
  mutating func flag() -> Bool {
    skipSeparators()
    return rest.removeFirst() == "1"
  }

  mutating func point() -> CGPoint {
    let x = number()
    return CGPoint(x: x, y: number())
  }

  private mutating func skipSeparators() {
    rest = rest.drop { $0.isWhitespace || $0 == "," }
  }
}
