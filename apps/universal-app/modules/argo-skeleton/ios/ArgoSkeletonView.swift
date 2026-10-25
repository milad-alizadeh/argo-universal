import ExpoModulesCore
import UIKit

/*
 * The Skeleton's native view. While `loading` it walks the views under it (ArgoSkeletonCollector), sets each
 * content view's alpha to 0 and paints one rounded shape per text line, image or control in a single shape layer
 * above them. It restores every view when loading ends and when it leaves the window, since Fabric recycles views.
 */
public final class ArgoSkeletonView: ExpoView {
  private struct Hidden {
    weak var view: UIView?
    let alpha: CGFloat
  }

  private static let fade: TimeInterval = 0.2
  private static let refreshInterval: TimeInterval = 0.1
  private static let pulseKey = "pulse"

  private let shapeLayer = CAShapeLayer()
  private var loading = false
  private var animation = "pulse"
  private var shapeColor: UIColor?
  private var concealed: [ObjectIdentifier: Hidden] = [:]
  private var timer: Timer?
  private var shown: [SkeletonShape] = []

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    shapeLayer.zPosition = 10_000
    shapeLayer.opacity = 0
    layer.addSublayer(shapeLayer)
    applyColor()
  }

  func setLoading(_ value: Bool) {
    guard value != loading else { return }
    loading = value
    if value { start() } else { stop() }
  }

  func setAnimation(_ value: String) {
    animation = value
    if loading { applyAnimation() }
  }

  func setShapeColor(_ value: UIColor?) {
    shapeColor = value
    applyColor()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    shapeLayer.frame = bounds
    if loading { refresh() }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { restoreAll(animated: false) } else if loading { start() }
  }

  deinit {
    timer?.invalidate()
  }

  private func applyColor() {
    let fallback = UIColor.label.withAlphaComponent(0.05)
    shapeLayer.fillColor = (shapeColor ?? fallback).cgColor
  }

  private func start() {
    guard window != nil else { return }
    timer?.invalidate()
    let timer = Timer(timeInterval: Self.refreshInterval, repeats: true) { [weak self] _ in self?.refresh() }
    RunLoop.main.add(timer, forMode: .common)
    self.timer = timer
    refresh()
    fade(to: 1)
    applyAnimation()
  }

  private func stop() {
    timer?.invalidate()
    timer = nil
    shapeLayer.removeAnimation(forKey: Self.pulseKey)
    restoreAll(animated: true)
    fade(to: 0)
    accessibilityElements = nil
    shown = []
  }

  private func fade(to opacity: Float) {
    let change = CABasicAnimation(keyPath: "opacity")
    change.fromValue = shapeLayer.presentation()?.opacity ?? shapeLayer.opacity
    change.toValue = opacity
    change.duration = Self.fade
    shapeLayer.opacity = opacity
    shapeLayer.add(change, forKey: "fade")
  }

  private func applyAnimation() {
    shapeLayer.removeAnimation(forKey: Self.pulseKey)
    guard animation == "pulse", !UIAccessibility.isReduceMotionEnabled else { return }
    let pulse = CABasicAnimation(keyPath: "opacity")
    pulse.fromValue = 1
    pulse.toValue = 0.5
    pulse.duration = 0.9
    pulse.autoreverses = true
    pulse.repeatCount = .infinity
    pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    shapeLayer.add(pulse, forKey: Self.pulseKey)
  }

  private func refresh() {
    let leaves = SkeletonCollector.collect(in: self)
    hide(leaves)
    let shapes = leaves.flatMap(\.shapes)
    guard shapes != shown else { return }
    shown = shapes
    let path = UIBezierPath()
    for shape in shapes {
      path.append(UIBezierPath(roundedRect: shape.rect, cornerRadius: shape.radius))
    }
    shapeLayer.path = path.cgPath
    exposeStatusToAccessibility()
  }

  // Hides what the walk found, and shows again what it no longer finds.
  private func hide(_ leaves: [SkeletonLeaf]) {
    var current = Set<ObjectIdentifier>()
    for leaf in leaves {
      guard let view = leaf.view else { continue }
      let id = ObjectIdentifier(view)
      current.insert(id)
      if concealed[id] == nil { concealed[id] = Hidden(view: view, alpha: view.alpha) }
      view.alpha = 0
    }
    for (id, entry) in concealed where !current.contains(id) {
      entry.view?.alpha = entry.alpha
      concealed[id] = nil
    }
  }

  private func restoreAll(animated: Bool) {
    let entries = concealed.values
    concealed = [:]
    let restore = { for entry in entries { entry.view?.alpha = entry.alpha } }
    if animated {
      UIView.animate(withDuration: Self.fade, animations: restore)
    } else {
      restore()
    }
  }

  // A busy status for VoiceView: one element for the shapes, then whatever an ignore view keeps readable.
  private func exposeStatusToAccessibility() {
    let status = UIAccessibilityElement(accessibilityContainer: self)
    status.accessibilityLabel = "Loading"
    status.accessibilityTraits = .updatesFrequently
    status.accessibilityFrameInContainerSpace = bounds
    accessibilityElements = [status] + ignoredViews(in: self)
  }

  private func ignoredViews(in view: UIView) -> [UIView] {
    view.subviews.flatMap { child -> [UIView] in
      if child is ArgoSkeletonIgnoreView { return [child] }
      return ignoredViews(in: child)
    }
  }
}
