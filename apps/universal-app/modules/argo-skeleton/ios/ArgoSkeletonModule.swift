import ExpoModulesCore

public final class ArgoSkeletonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ArgoSkeleton")

    View(ArgoSkeletonView.self) {
      Prop("loading") { (view: ArgoSkeletonView, loading: Bool) in
        view.setLoading(loading)
      }

      Prop("animation") { (view: ArgoSkeletonView, animation: String) in
        view.setAnimation(animation)
      }

      Prop("color") { (view: ArgoSkeletonView, color: UIColor?) in
        view.setPlaceholderColor(color)
      }
    }

    View(ArgoSkeletonIgnoreView.self) {}
  }
}

// Marks a subtree the walk skips: it stays as drawn and stays readable to VoiceOver.
public final class ArgoSkeletonIgnoreView: ExpoView {}
