import UIKit

struct SkeletonPlaceholder: Equatable {
  var rect: CGRect
  var radius: CGFloat
}

// A drawn view the walk found, and the placeholders that stand in for it (a paragraph gives one per line).
struct SkeletonLeaf {
  weak var view: UIView?
  weak var layer: CALayer?
  var placeholders: [SkeletonPlaceholder]

  init(view: UIView, placeholders: [SkeletonPlaceholder]) {
    self.view = view
    self.placeholders = placeholders
  }

  init(layer: CALayer, placeholders: [SkeletonPlaceholder]) {
    self.layer = layer
    self.placeholders = placeholders
  }
}

// What one walk of a Skeleton found: the RN views that draw content, and the SwiftUI trees it cannot see into.
struct SkeletonCollected {
  var leaves: [SkeletonLeaf] = []
  var hosts: [UIView] = []
  var ignored: [UIView] = []
}

/*
 * Walks every descendant of a Skeleton, however deep, and says which views draw content: a paragraph gives one
 * placeholder per laid-out line; an image, svg, field, switch or small control gives one of its own size and radius.
 * Cards, rows and separators are containers or hairlines and give none, so they stay as drawn. An ignore view's
 * subtree is skipped whole; a SwiftUI hosting view is listed for the Skeleton to redact and cover. The numbers and
 * class lists are SkeletonRules, generated from skeleton-rules.json, which the web and Android walks read too.
 */
enum SkeletonCollector {
  static func collect(in root: UIView) -> SkeletonCollected {
    var found = SkeletonCollected()
    for child in root.subviews { walk(child, root: root, into: &found) }
    return found
  }

  private static func walk(_ view: UIView, root: UIView, into found: inout SkeletonCollected) {
    if view is ArgoSkeletonIgnoreView {
      found.ignored.append(view)
      return
    }
    if view.isHidden || view is ArgoSkeletonView { return }
    if isHosting(view) {
      // A control-sized Host is one control (a Button): one placeholder, its fill hidden with the rest of it.
      if fitsSmallControl(view.bounds.size), view.bounds.width > 0, view.bounds.height > 0 {
        found.leaves.append(SkeletonLeaf(view: view, placeholders: [SkeletonPlaceholder(rect: view.convert(view.bounds, to: root), radius: radius(of: view))]))
      } else {
        found.hosts.append(view)
      }
      return
    }
    if let placeholders = placeholders(of: view, root: root) {
      found.leaves.append(SkeletonLeaf(view: view, placeholders: placeholders))
      return
    }
    for child in view.subviews { walk(child, root: root, into: &found) }
  }

  /*
   * What a large SwiftUI Host draws. A Toggle is a UISwitch, a real view. Text and icons are layers the hosting view
   * paints itself: a text layer gives one bar per line and an icon layer a round placeholder, so each looks like the
   * RN ones instead of SwiftUI's own redaction, which cannot be coloured or shaped.
   */
  static func controls(in host: UIView, root: UIView) -> [SkeletonLeaf] {
    var found: [SkeletonLeaf] = []
    func visit(_ view: UIView) {
      if view.isHidden { return }
      if isAtomic(view), !isParagraph(view), view.bounds.width > 0, view.bounds.height > 0 {
        found.append(SkeletonLeaf(view: view, placeholders: [SkeletonPlaceholder(rect: view.convert(view.bounds, to: root), radius: radius(of: view))]))
        return
      }
      found += drawn(by: view.layer, root: root)
      for child in view.subviews { visit(child) }
    }
    found += drawn(by: host.layer, root: root)
    for child in host.subviews { visit(child) }
    return found
  }

  // The layers of a view that SwiftUI paints text or an icon into. Layers of subviews are their own walk.
  private static func drawn(by layer: CALayer, root: UIView) -> [SkeletonLeaf] {
    var found: [SkeletonLeaf] = []
    for child in layer.sublayers ?? [] {
      if child.isHidden || child.delegate is UIView { continue }
      let name = String(reflecting: type(of: child))
      let bounds = child.bounds
      if bounds.width > 0, bounds.height > 0 {
        if SkeletonRules.glyphLayerClasses.contains(where: { name.contains($0) }) {
          let rect = root.layer.convert(bounds, from: child)
          found.append(SkeletonLeaf(layer: child, placeholders: [SkeletonPlaceholder(rect: rect, radius: min(rect.width, rect.height) / 2)]))
          continue
        }
        if SkeletonRules.textLayerClasses.contains(where: { name.contains($0) }) {
          found.append(SkeletonLeaf(layer: child, placeholders: bars(in: bounds) { root.layer.convert($0, from: child) }))
          continue
        }
      }
      found += drawn(by: child, root: root)
    }
    return found
  }

  static func isHosting(_ view: UIView) -> Bool {
    SkeletonRules.hostClasses.contains { className(view).contains($0) }
  }

  private static func className(_ view: UIView) -> String {
    String(reflecting: type(of: view))
  }

  /*
   * A cheap fingerprint of everything a walk reads: each visible view's frame in the Skeleton's space, and a
   * paragraph's text. The Skeleton compares it on each pass of the run loop and only walks again when it changed.
   */
  static func signature(in root: UIView) -> Int {
    var hasher = Hasher()
    for child in root.subviews { sign(child, root: root, into: &hasher) }
    return hasher.finalize()
  }

  private static func sign(_ view: UIView, root: UIView, into hasher: inout Hasher) {
    if view.isHidden || view is ArgoSkeletonView { return }
    let frame = view.convert(view.bounds, to: root)
    hasher.combine(Int(frame.minX.rounded()))
    hasher.combine(Int(frame.minY.rounded()))
    hasher.combine(Int(frame.width.rounded()))
    hasher.combine(Int(frame.height.rounded()))
    if let text = paragraphText(of: view) { hasher.combine(text.string) }
    if view is ArgoSkeletonIgnoreView { return }
    for child in view.subviews { sign(child, root: root, into: &hasher) }
  }

  private static func placeholders(of view: UIView, root: UIView) -> [SkeletonPlaceholder]? {
    let size = view.bounds.size
    if size.width <= 0 || size.height <= 0 { return nil }
    if isParagraph(view) { return lines(of: view, root: root) }
    if isDecoration(view) { return nil }
    if isAtomic(view) || isSmallControl(view) || isEmptyFill(view) {
      return [SkeletonPlaceholder(rect: view.convert(view.bounds, to: root), radius: radius(of: view))]
    }
    return nil
  }

  private static func isParagraph(_ view: UIView) -> Bool {
    className(view).contains("RCTParagraphComponentView")
  }

  private static func isAtomic(_ view: UIView) -> Bool {
    if view is UIImageView || view is UIControl || view is UITextView || view is UIProgressView {
      return true
    }
    let name = className(view)
    return SkeletonRules.atomicClasses.contains { name.contains($0) }
  }

  // A vector too big to be an icon is decoration (a scroll fade): it stays drawn.
  private static func isDecoration(_ view: UIView) -> Bool {
    let name = className(view)
    return SkeletonRules.vectorClasses.contains { name.contains($0) } && !fitsSmallControl(view.bounds.size)
  }

  private static func isGlyph(_ view: UIView) -> Bool {
    if view is UIImageView { return true }
    let name = className(view)
    return SkeletonRules.glyphClasses.contains { name.contains($0) }
  }

  private static func hasFill(_ view: UIView) -> Bool {
    if let colour = view.backgroundColor, colour.cgColor.alpha > 0 { return true }
    if let colour = view.layer.backgroundColor, colour.alpha > 0 { return true }
    return false
  }

  private static func fitsSmallControl(_ size: CGSize) -> Bool {
    size.height <= SkeletonRules.smallControlHeight && size.width <= SkeletonRules.smallControlWidth
  }

  private static func hasBorder(_ view: UIView) -> Bool {
    view.layer.borderWidth > 0 && (view.layer.borderColor?.alpha ?? 0) > 0
  }

  // A small control drawn as a rounded box, filled or outlined (a button, a pill): one placeholder, whatever it holds.
  private static func isSmallControl(_ view: UIView) -> Bool {
    (hasFill(view) || hasBorder(view)) && view.layer.cornerRadius > 0 && fitsSmallControl(view.bounds.size)
  }

  // A small filled box with nothing inside it: a dot, a bar of a chart. A big one is a card's background: it stays drawn.
  private static func isEmptyFill(_ view: UIView) -> Bool {
    hasFill(view) && view.subviews.isEmpty && fitsSmallControl(view.bounds.size) && min(view.bounds.width, view.bounds.height) > SkeletonRules.hairline
  }

  /*
   * The view's own corner radius, or the one its clipping parent gives it (an avatar's image is square inside a
   * rounded container of the same size). A switch is round, and so is an icon with no radius of its own.
   */
  private static func radius(of view: UIView) -> CGFloat {
    let size = view.bounds.size
    let limit = min(size.width, size.height) / 2
    var radius = view.layer.cornerRadius
    var parent = view.superview
    while radius == 0, let current = parent, current.bounds.size.isClose(to: size) {
      radius = current.layer.cornerRadius
      parent = current.superview
    }
    if view is UISwitch || className(view).contains("Switch") || isHosting(view) { radius = limit }
    if radius == 0, isGlyph(view), fitsSmallControl(size) { radius = limit }
    return min(radius, limit)
  }

  // A paragraph's text. RCTParagraphComponentView declares `attributedText`; any other class is not asked.
  private static func paragraphText(of view: UIView) -> NSAttributedString? {
    guard isParagraph(view), view.responds(to: NSSelectorFromString("attributedText")) else { return nil }
    return view.value(forKey: "attributedText") as? NSAttributedString
  }

  /*
   * One placeholder per line of the paragraph. Lays its attributed text out with TextKit at the view's width and
   * height, so a line the view's `numberOfLines` cut is not drawn, and each line is as wide as its text. A view
   * whose text cannot be read is split by its height into bars of a body line each.
   */
  private static func lines(of view: UIView, root: UIView) -> [SkeletonPlaceholder] {
    guard let text = paragraphText(of: view) else { return fallbackLines(of: view, root: root) }
    if text.length == 0 { return [] }

    let storage = NSTextStorage(attributedString: text)
    let layout = NSLayoutManager()
    let container = NSTextContainer(size: CGSize(width: view.bounds.width, height: view.bounds.height + 1))
    container.lineFragmentPadding = 0
    layout.usesFontLeading = false
    layout.addTextContainer(container)
    storage.addLayoutManager(layout)

    var placeholders: [SkeletonPlaceholder] = []
    let range = layout.glyphRange(for: container)
    layout.enumerateLineFragments(forGlyphRange: range) { rect, used, _, _, _ in
      guard used.width > 0 else { return }
      placeholders.append(barPlaceholder(CGRect(x: used.minX, y: rect.minY, width: used.width, height: rect.height)) { view.convert($0, to: root) })
    }
    return placeholders
  }

  private static func fallbackLines(of view: UIView, root: UIView) -> [SkeletonPlaceholder] {
    bars(in: view.bounds) { view.convert($0, to: root) }
  }

  // A box of text whose lines are not known (a view that cannot be read, a drawn layer): split by its height into body lines.
  private static func bars(in box: CGRect, convert: (CGRect) -> CGRect) -> [SkeletonPlaceholder] {
    let body = UIFont.preferredFont(forTextStyle: .body).lineHeight
    let count = box.height > body * SkeletonRules.singleLineMax ? max(1, Int((box.height / body).rounded())) : 1
    let height = box.height / CGFloat(count)
    return (0..<count).map { line in
      barPlaceholder(CGRect(x: box.minX, y: box.minY + CGFloat(line) * height, width: box.width, height: height), convert: convert)
    }
  }

  // A bar is part of its line box so lines do not touch, and at least as wide as a dot so one character is round.
  private static func barPlaceholder(_ line: CGRect, convert: (CGRect) -> CGRect) -> SkeletonPlaceholder {
    let height = line.height * SkeletonRules.lineFill
    let width = max(line.width, height * SkeletonRules.minBarWidthPerHeight)
    let bar = CGRect(
      x: line.minX - (width - line.width) / 2,
      y: line.minY + (line.height - height) / 2,
      width: width,
      height: height
    )
    return SkeletonPlaceholder(rect: convert(bar), radius: height / 2)
  }
}

extension CGSize {
  fileprivate func isClose(to other: CGSize) -> Bool {
    abs(width - other.width) < SkeletonRules.sameSizeTolerance && abs(height - other.height) < SkeletonRules.sameSizeTolerance
  }
}
