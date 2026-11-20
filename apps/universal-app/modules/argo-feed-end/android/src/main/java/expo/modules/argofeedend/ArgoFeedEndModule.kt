package expo.modules.argofeedend

import android.content.Context
import android.view.ViewTreeObserver
import android.widget.ScrollView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.views.ExpoView

class ArgoFeedEndModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ArgoFeedEnd")
    View(ArgoFeedEndView::class) {}
  }
}

// LegendList learns of a larger content height after layout. Keep a reader already at the
// bottom there for the frame Android is about to draw, including consecutive layout passes.
class ArgoFeedEndView(context: Context, appContext: AppContext) :
    ExpoView(context, appContext), ViewTreeObserver.OnPreDrawListener {
  private var scroll: ScrollView? = null
  private var anchor: EndAnchor? = null

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    var ancestor = parent
    while (ancestor != null && ancestor !is ScrollView) ancestor = ancestor.parent
    scroll = ancestor as? ScrollView
    if (scroll != null) viewTreeObserver.addOnPreDrawListener(this)
  }

  override fun onDetachedFromWindow() {
    viewTreeObserver.removeOnPreDrawListener(this)
    scroll = null
    anchor = null
    super.onDetachedFromWindow()
  }

  override fun onPreDraw(): Boolean {
    val viewport = scroll ?: return true
    val maxScrollY = viewport.laidOutScrollEnd() ?: return true
    keepEndInView(viewport, maxScrollY)
    return true
  }

  private fun keepEndInView(viewport: ScrollView, maxScrollY: Int) {
    val scrollY = viewport.scrollY
    if (anchor?.followsGrowthTo(maxScrollY, scrollY) == true && scrollY < maxScrollY) {
      viewport.scrollTo(viewport.scrollX, maxScrollY)
    }
    val previous = anchor
    val drawnY = viewport.scrollY
    if (previous?.maxScrollY != maxScrollY || previous.scrollY != drawnY) {
      anchor = EndAnchor(maxScrollY, drawnY)
    }
  }
}

private fun ScrollView.laidOutScrollEnd(): Int? {
  val content = getChildAt(0) ?: return null
  if (content.height == 0 || height == 0) return null
  return (content.height - height + paddingTop + paddingBottom).coerceAtLeast(0)
}

private data class EndAnchor(val maxScrollY: Int, val scrollY: Int) {
  private val wasAtEnd = scrollY >= maxScrollY - 1

  // Upward motion from a gesture, accessibility action or restoration takes priority.
  fun followsGrowthTo(end: Int, currentY: Int): Boolean =
      wasAtEnd && end > maxScrollY && currentY >= scrollY
}
