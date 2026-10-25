package expo.modules.argoskeleton

import android.content.Context
import android.graphics.Color
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView

class ArgoSkeletonModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ArgoSkeleton")

    View(ArgoSkeletonView::class) {
      Prop("loading") { view: ArgoSkeletonView, loading: Boolean -> view.setLoading(loading) }
      Prop("animation") { view: ArgoSkeletonView, animation: String -> view.setAnimation(animation) }
      Prop("color") { view: ArgoSkeletonView, color: Color? -> view.setShapeColor(color?.toArgb()) }
    }

    View(ArgoSkeletonIgnoreView::class) {}
  }
}

// Marks a subtree the walk skips: it stays as drawn and stays readable to TalkBack.
class ArgoSkeletonIgnoreView(context: Context, appContext: AppContext) : ExpoView(context, appContext)
