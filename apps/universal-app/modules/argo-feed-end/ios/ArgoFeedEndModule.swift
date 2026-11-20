import ExpoModulesCore
import UIKit

public final class ArgoFeedEndModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ArgoFeedEnd")
    View(ArgoFeedEndView.self) {}
  }
}

// LegendList positions the footer at the end of the scroll content. Keep it there through UIKit's
// size change when the reader was already following, including when a row's measured height shrinks.
public final class ArgoFeedEndView: ExpoView {
  private var sizeObservation: NSKeyValueObservation?
  private var pinnedHeight: CGFloat?

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    sizeObservation = nil
    pinnedHeight = nil
    guard window != nil else { return }
    var ancestor = superview
    while let view = ancestor, !(view is UIScrollView) { ancestor = view.superview }
    guard let scroll = ancestor as? UIScrollView else { return }
    sizeObservation = scroll.observe(\.contentSize, options: [.prior, .new]) { [weak self] scroll, change in
      self?.contentSizeChanged(scroll, beforeChange: change.isPrior)
    }
  }

  private func contentSizeChanged(_ scroll: UIScrollView, beforeChange: Bool) {
    let height = scroll.contentSize.height
    // The Feed's clearance is in its footer. The system's bottom safe area is outside that content.
    let end = max(-scroll.adjustedContentInset.top, height - scroll.bounds.height)
    let y = scroll.contentOffset.y
    let resting = !scroll.isTracking && !scroll.isDragging && !scroll.isDecelerating
    if beforeChange {
      pinnedHeight = resting && height > 0 && abs(y - end) <= 1 ? height : nil
      return
    }
    guard let oldHeight = pinnedHeight else { return }
    pinnedHeight = nil
    if resting && height != oldHeight && abs(y - end) > 0.5 {
      scroll.setContentOffset(CGPoint(x: scroll.contentOffset.x, y: end), animated: false)
    }
  }
}
