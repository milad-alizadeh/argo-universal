import ExpoModulesCore
import UIKit

/*
 * The Skeleton's native view. While `loading` it walks the views under it (SkeletonCollector), sets each content
 * view's alpha to 0 and paints one rounded placeholder per text line, image or control in a single placeholder layer above
 * them. It restores every view when loading ends and when it leaves the window, since Fabric recycles views.
 *
 * It walks again only when something changed: on its own layout, and once after any pass of the main run loop in
 * which the fingerprint of the views under it differs. UIKit has no notification for a descendant's layout, and an
 * idle run loop does not pass, so a screen at rest costs nothing.
 */
public final class ArgoSkeletonView: ExpoView {
  private struct Hidden {
    weak var view: UIView?
    weak var layer: CALayer?
    let alpha: CGFloat
    let opacity: Float

    func restore() {
      view?.alpha = alpha
      layer?.opacity = opacity
    }
  }

  private static let fade: TimeInterval = 0.2
  private static let pulseKey = "pulse"

  private let placeholderLayer = CAShapeLayer()
  private var loading = false
  private var animation = "pulse"
  private var placeholderColor: UIColor?
  private var concealed: [ObjectIdentifier: Hidden] = [:]
  private var observer: CFRunLoopObserver?
  private var signature = 0
  private var shown: [SkeletonPlaceholder] = []
  private let status = UIAccessibilityElement(accessibilityContainer: UIView())

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    placeholderLayer.zPosition = 10_000
    placeholderLayer.opacity = 0
    layer.addSublayer(placeholderLayer)
    applyColor()
    status.accessibilityLabel = "Loading"
    status.accessibilityValue = "Busy"
    status.accessibilityTraits = .updatesFrequently
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

  func setPlaceholderColor(_ value: UIColor?) {
    placeholderColor = value
    applyColor()
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    placeholderLayer.frame = bounds
    if loading { refresh() }
  }

  public override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil {
      stopObserving()
      restoreAll(animated: false)
    } else if loading {
      start()
    }
  }

  deinit {
    stopObserving()
  }

  private func applyColor() {
    let fallback = UIColor.label.withAlphaComponent(0.15)
    let colour = (placeholderColor ?? fallback).cgColor
    placeholderLayer.fillColor = colour
  }

  private func start() {
    guard window != nil else { return }
    observe()
    exposeStatusToAccessibility(ignored: [])
    refresh()
    fade(to: 1)
    applyAnimation()
  }

  private func stop() {
    stopObserving()
    placeholderLayer.removeAnimation(forKey: Self.pulseKey)
    restoreAll(animated: true)
    fade(to: 0)
    accessibilityElements = nil
    shown = []
    signature = 0
  }

  // Calls back after each pass of the main run loop that had work; the walk runs only if the fingerprint moved.
  private func observe() {
    stopObserving()
    let observer = CFRunLoopObserverCreateWithHandler(nil, CFRunLoopActivity.beforeWaiting.rawValue, true, 0) {
      [weak self] _, _ in
      self?.refreshIfChanged()
    }
    CFRunLoopAddObserver(CFRunLoopGetMain(), observer, .commonModes)
    self.observer = observer
  }

  private func stopObserving() {
    guard let observer else { return }
    CFRunLoopRemoveObserver(CFRunLoopGetMain(), observer, .commonModes)
    self.observer = nil
  }

  private func refreshIfChanged() {
    guard loading, SkeletonCollector.signature(in: self) != signature else { return }
    refresh()
  }

  private func fade(to opacity: Float) {
    let change = CABasicAnimation(keyPath: "opacity")
    change.fromValue = placeholderLayer.presentation()?.opacity ?? placeholderLayer.opacity
    change.toValue = opacity
    change.duration = Self.fade
    placeholderLayer.opacity = opacity
    placeholderLayer.add(change, forKey: "fade")
  }

  private func applyAnimation() {
    placeholderLayer.removeAnimation(forKey: Self.pulseKey)
    guard animation == "pulse", !UIAccessibility.isReduceMotionEnabled else { return }
    let pulse = CABasicAnimation(keyPath: "opacity")
    pulse.fromValue = 1
    pulse.toValue = 0.5
    pulse.duration = 0.9
    pulse.autoreverses = true
    pulse.repeatCount = .infinity
    pulse.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
    placeholderLayer.add(pulse, forKey: Self.pulseKey)
  }

  private func refresh() {
    signature = SkeletonCollector.signature(in: self)
    let found = SkeletonCollector.collect(in: self)
    let controls = found.hosts.flatMap { SkeletonCollector.controls(in: $0, root: self) }
    hide(found.leaves + controls)
    let placeholders = (found.leaves + controls).flatMap(\.placeholders)
    exposeStatusToAccessibility(ignored: found.ignored)
    guard placeholders != shown else { return }
    shown = placeholders
    let path = UIBezierPath()
    for placeholder in placeholders {
      path.append(UIBezierPath(roundedRect: placeholder.rect, cornerRadius: placeholder.radius))
    }
    placeholderLayer.path = path.cgPath
  }

  // Hides what the walk found, and shows again what it no longer finds.
  private func hide(_ leaves: [SkeletonLeaf]) {
    var current = Set<ObjectIdentifier>()
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    defer { CATransaction.commit() }
    for leaf in leaves {
      if let view = leaf.view {
        let id = ObjectIdentifier(view)
        current.insert(id)
        if concealed[id] == nil { concealed[id] = Hidden(view: view, layer: nil, alpha: view.alpha, opacity: 1) }
        view.alpha = 0
      } else if let layer = leaf.layer {
        let id = ObjectIdentifier(layer)
        current.insert(id)
        if concealed[id] == nil { concealed[id] = Hidden(view: nil, layer: layer, alpha: 1, opacity: layer.opacity) }
        layer.opacity = 0
      }
    }
    for (id, entry) in concealed where !current.contains(id) {
      entry.restore()
      concealed[id] = nil
    }
  }

  private func restoreAll(animated: Bool) {
    let entries = concealed.values
    concealed = [:]
    let restore = {
      CATransaction.begin()
      CATransaction.setDisableActions(true)
      for entry in entries { entry.restore() }
      CATransaction.commit()
    }
    if animated {
      UIView.animate(withDuration: Self.fade, animations: restore)
    } else {
      restore()
    }
  }

  // A busy status for VoiceOver, there as soon as loading starts: one element, then whatever an ignore view keeps readable.
  private func exposeStatusToAccessibility(ignored: [UIView]) {
    status.accessibilityContainer = self
    status.accessibilityFrameInContainerSpace = bounds
    accessibilityElements = [status] + ignored
  }
}
