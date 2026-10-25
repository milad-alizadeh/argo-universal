import UIKit

struct SkeletonShape: Equatable {
  var rect: CGRect
  var radius: CGFloat
}

// A drawn view the walk found, and the shapes that stand in for it (a paragraph gives one per line).
struct SkeletonLeaf {
  weak var view: UIView?
  var shapes: [SkeletonShape]
}

/*
 * Walks every descendant of a Skeleton, however deep, and says which views draw content: a paragraph gives one
 * shape per laid-out line; an image, svg, field, switch or small control gives one of its own size and radius.
 * Cards, rows and separators are containers or hairlines and give none, so they stay as drawn. An ignore view's
 * subtree and a SwiftUI hosting view (which redacts itself) are skipped whole.
 */
enum SkeletonCollector {
  // A bar is this much of its line box, so lines do not touch.
  private static let lineFill: CGFloat = 0.75
  // A fill thinner than this is a separator.
  private static let hairline: CGFloat = 2
  // A capsule or disc up to this size is a pill, avatar or small control: one shape for the whole of it.
  private static let smallControlHeight: CGFloat = 40
  private static let smallControlWidth: CGFloat = 240

  private static let atomicNames = [
    "RCTImageComponentView", "RNSVGSvgView", "RCTSwitchComponentView", "RCTTextInputComponentView",
    "RCTActivityIndicatorViewComponentView", "RCTSliderComponentView", "ExpoImage", "SymbolView",
  ]

  static func collect(in root: UIView) -> [SkeletonLeaf] {
    var leaves: [SkeletonLeaf] = []
    for child in root.subviews { walk(child, root: root, into: &leaves) }
    return leaves
  }

  private static func walk(_ view: UIView, root: UIView, into leaves: inout [SkeletonLeaf]) {
    if isSkipped(view) { return }
    if let shapes = shapes(of: view, root: root) {
      leaves.append(SkeletonLeaf(view: view, shapes: shapes))
      return
    }
    for child in view.subviews { walk(child, root: root, into: &leaves) }
  }

  private static func isSkipped(_ view: UIView) -> Bool {
    if view.isHidden || view is ArgoSkeletonIgnoreView || view is ArgoSkeletonView { return true }
    return className(view).contains("HostingView")
  }

  private static func className(_ view: UIView) -> String {
    String(reflecting: type(of: view))
  }

  private static func shapes(of view: UIView, root: UIView) -> [SkeletonShape]? {
    let size = view.bounds.size
    if size.width <= 0 || size.height <= 0 { return nil }
    if className(view).contains("RCTParagraphComponentView") { return lines(of: view, root: root) }
    if isAtomic(view) || isSmallCapsule(view) || isEmptyFill(view) {
      return [SkeletonShape(rect: view.convert(view.bounds, to: root), radius: radius(of: view))]
    }
    return nil
  }

  private static func isAtomic(_ view: UIView) -> Bool {
    if view is UIImageView || view is UIControl || view is UITextView || view is UIProgressView {
      return true
    }
    let name = className(view)
    return atomicNames.contains { name.contains($0) }
  }

  private static func hasFill(_ view: UIView) -> Bool {
    if let colour = view.backgroundColor, colour.cgColor.alpha > 0 { return true }
    if let colour = view.layer.backgroundColor, colour.alpha > 0 { return true }
    return false
  }

  private static func isSmallCapsule(_ view: UIView) -> Bool {
    let size = view.bounds.size
    let round = view.layer.cornerRadius >= min(size.width, size.height) / 2 - 1
    return hasFill(view) && round && size.height <= smallControlHeight && size.width <= smallControlWidth
  }

  // A filled box with nothing inside it: a dot, a bar of a chart.
  private static func isEmptyFill(_ view: UIView) -> Bool {
    hasFill(view) && view.subviews.isEmpty && min(view.bounds.width, view.bounds.height) > hairline
  }

  /*
   * The view's own corner radius, or the one its clipping parent gives it: an avatar's image is square inside a
   * rounded container of the same size.
   */
  private static func radius(of view: UIView) -> CGFloat {
    let size = view.bounds.size
    var radius = view.layer.cornerRadius
    var parent = view.superview
    while radius == 0, let current = parent, current.bounds.size.isClose(to: size) {
      radius = current.layer.cornerRadius
      parent = current.superview
    }
    if view is UISwitch || className(view).contains("Switch") { radius = min(size.width, size.height) / 2 }
    return min(radius, min(size.width, size.height) / 2)
  }

  /*
   * One shape per line of the paragraph. Lays its attributed text out with TextKit at the view's width and
   * height, so a line the view's `numberOfLines` cut is not drawn, and each line is as wide as its text.
   */
  private static func lines(of view: UIView, root: UIView) -> [SkeletonShape] {
    guard
      let text = view.value(forKey: "attributedText") as? NSAttributedString,
      text.length > 0
    else { return [] }

    let storage = NSTextStorage(attributedString: text)
    let layout = NSLayoutManager()
    let container = NSTextContainer(size: CGSize(width: view.bounds.width, height: view.bounds.height + 1))
    container.lineFragmentPadding = 0
    layout.usesFontLeading = false
    layout.addTextContainer(container)
    storage.addLayoutManager(layout)

    var shapes: [SkeletonShape] = []
    let range = layout.glyphRange(for: container)
    layout.enumerateLineFragments(forGlyphRange: range) { rect, used, _, _, _ in
      guard used.width > 0 else { return }
      let height = rect.height * lineFill
      let bar = CGRect(x: used.minX, y: rect.minY + (rect.height - height) / 2, width: used.width, height: height)
      shapes.append(SkeletonShape(rect: view.convert(bar, to: root), radius: height / 2))
    }
    return shapes
  }
}

extension CGSize {
  fileprivate func isClose(to other: CGSize) -> Bool {
    abs(width - other.width) < 1 && abs(height - other.height) < 1
  }
}
