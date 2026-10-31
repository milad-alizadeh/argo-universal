package expo.modules.argoskeleton

import android.graphics.Color
import android.graphics.RectF
import android.text.Layout
import android.view.View
import android.view.ViewGroup
import android.widget.CompoundButton
import android.widget.EditText
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import androidx.compose.ui.platform.ViewRootForTest
import com.facebook.react.uimanager.BackgroundStyleApplicator
import com.facebook.react.uimanager.style.BorderRadiusProp
import com.facebook.react.uimanager.style.LogicalEdge
import kotlin.math.min

// A drawn view the walk found, and the placeholders that stand in for it (a paragraph gives one per line).
class SkeletonLeaf(val view: View, val placeholders: List<SkeletonPlaceholder>)

// A Compose tree under the Skeleton: its root view and the placeholders read from its semantics, in the root's pixels.
class ComposeContent(val root: ViewRootForTest, val local: List<SkeletonPlaceholder>, val origin: RectF) {
  val placeholders: List<SkeletonPlaceholder> get() = local.map { it.translated(origin.left, origin.top) }
}

/*
 * What one walk found: the drawn leaves the Skeleton stands in for, the Compose trees it covers, the ignore views
 * it skipped, and `muted`, the views it hides from accessibility.
 */
class Collected(
  val leaves: List<SkeletonLeaf>,
  val compose: List<ComposeContent>,
  val ignored: List<View>,
  val muted: List<View>,
)

/*
 * Walks every descendant of a Skeleton, however deep, and says which views draw content: a paragraph gives one
 * placeholder per laid-out line; an image, svg, field, switch or small control gives one of its own size and radius.
 * Cards, rows and separators are containers or hairlines and give none, so they stay as drawn. An ignore view's
 * subtree is skipped whole. A Compose tree is read through its semantics (ComposeSemantics).
 */
class ViewWalk(private val root: ViewGroup) {
  private val density = root.resources.displayMetrics.density
  private val leaves = mutableListOf<SkeletonLeaf>()
  private val compose = mutableListOf<ComposeContent>()
  private val ignored = mutableListOf<View>()

  fun collect(): Collected {
    for (index in 0 until root.childCount) walk(root.getChildAt(index))
    return Collected(withoutCoveredBars(leaves), compose, ignored, muteRoots(root))
  }

  /*
   * The highest views under the Skeleton that hold no ignore view. The Skeleton hides these from accessibility, so
   * everything beneath them is hidden too, whatever labels itself: a row, a drawer item, a fold button, a metadata
   * field or its group, an avatar. Hiding the leaves the Skeleton draws over is not enough, since a container that
   * carries its own label is not one of them. A view that holds an ignore view stays exposed and its own children
   * are muted one by one, because no-hide-descendants cannot be undone further down. The web Skeleton walks the
   * same way (skeleton-aria.ts).
   */
  private fun muteRoots(parent: ViewGroup): List<View> = mutesUnder(parent).roots

  // The views to mute under one parent, and whether that parent holds an ignore view anywhere beneath it.
  private class Mutes(val roots: List<View>, val holdsIgnore: Boolean)

  private fun mutesUnder(parent: ViewGroup): Mutes {
    val roots = mutableListOf<View>()
    var holdsIgnore = false
    for (child in childrenOf(parent)) {
      if (child is ArgoSkeletonIgnoreView) {
        holdsIgnore = true
        continue
      }
      // A child that holds an ignore view somewhere below gives the roots found under it instead of itself.
      val below = (child as? ViewGroup)?.let { mutesUnder(it) }?.takeIf { it.holdsIgnore }
      if (below != null) {
        holdsIgnore = true
        roots += below.roots
      } else if (child.visibility == View.VISIBLE) {
        roots += child
      }
    }
    return Mutes(roots, holdsIgnore)
  }

  private fun childrenOf(parent: ViewGroup): List<View> =
    (0 until parent.childCount).map { parent.getChildAt(it) }

  /*
   * A control's own placeholder stands for what is inside it. React Native can lay a pill's text out beside its fill
   * rather than inside it, so the text's bar would draw over the pill's capsule as a darker mark: a leaf whose
   * placeholders all lie inside a larger leaf's single placeholder keeps its view hidden and draws none.
   */
  private fun withoutCoveredBars(found: List<SkeletonLeaf>): List<SkeletonLeaf> {
    val controls = found.mapNotNull { it.placeholders.singleOrNull()?.rect }
    return found.map { leaf ->
      val inside = leaf.placeholders.isNotEmpty() && leaf.placeholders.all { bar ->
        controls.any { control -> contains(control, bar.rect) && area(control) > area(bar.rect) }
      }
      if (inside) SkeletonLeaf(leaf.view, emptyList()) else leaf
    }
  }

  private fun area(rect: RectF): Float = rect.width() * rect.height()

  private fun contains(outer: RectF, inner: RectF): Boolean {
    val slack = SkeletonRules.ROUND_SLACK * density
    return inner.left >= outer.left - slack && inner.right <= outer.right + slack &&
      inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack
  }

  private fun walk(view: View) {
    if (view is ArgoSkeletonIgnoreView) {
      ignored += view
      return
    }
    if (view.visibility != View.VISIBLE || view is ArgoSkeletonView) return
    if (view is ViewRootForTest) {
      readCompose(view)
      // React Native views hosted inside a Compose tree (a Card's text) are its children, not semantics nodes.
      if (view is ViewGroup) for (index in 0 until view.childCount) walk(view.getChildAt(index))
      return
    }
    placeholdersOf(view)?.let {
      leaves += SkeletonLeaf(view, it)
      return
    }
    if (view is ViewGroup) for (index in 0 until view.childCount) walk(view.getChildAt(index))
  }

  private fun readCompose(rootForTest: ViewRootForTest) {
    val view = rootForTest.view
    val origin = rectInRoot(view)
    val read = ComposeSemantics.read(rootForTest, density)
    val whole = read.singleOrNull()?.takeIf { fillsRoot(it, view) }
    if (whole != null) {
      // A Compose tree that is one control (a Button) is drawn by its own fill: hide the tree itself, not pixels in it.
      leaves += SkeletonLeaf(view, listOf(whole.translated(origin.left, origin.top)))
      return
    }
    compose += ComposeContent(rootForTest, read.ifEmpty { glyphOnly(view) }, origin)
  }

  private fun fillsRoot(placeholder: SkeletonPlaceholder, view: View): Boolean {
    val slack = SkeletonRules.SAME_SIZE_TOLERANCE * density
    return kotlin.math.abs(placeholder.rect.width() - view.width) <= slack &&
      kotlin.math.abs(placeholder.rect.height() - view.height) <= slack
  }

  // A small Compose tree with no semantics at all is a glyph (an icon draws none): one placeholder of its own size.
  private fun glyphOnly(view: View): List<SkeletonPlaceholder> {
    val small = view.width <= SkeletonRules.SMALL_CONTROL_HEIGHT * density && view.height <= SkeletonRules.SMALL_CONTROL_HEIGHT * density
    if (!small || view.width <= 0 || view.height <= 0) return emptyList()
    val rect = RectF(0f, 0f, view.width.toFloat(), view.height.toFloat())
    return listOf(SkeletonPlaceholder(rect, minOf(rect.width(), rect.height()) / 2))
  }

  private fun placeholdersOf(view: View): List<SkeletonPlaceholder>? {
    if (view.width <= 0 || view.height <= 0) return null
    if (view !is EditText) textLayout(view)?.let { return lines(view, it) }
    if (isDecoration(view)) return null
    if (!isAtomic(view) && !isSmallControl(view) && !isEmptyFill(view)) return null
    return listOf(SkeletonPlaceholder(rectInRoot(view), radiusOf(view)))
  }

  private fun rectInRoot(view: View): RectF {
    val rect = android.graphics.Rect(0, 0, view.width, view.height)
    root.offsetDescendantRectToMyCoords(view, rect)
    return RectF(rect)
  }

  // A vector too big to be an icon is decoration (a scroll fade): it stays drawn.
  private fun isDecoration(view: View): Boolean {
    val name = view.javaClass.name
    return SkeletonRules.vectorClasses.any { name.contains(it) } && !fitsSmallControl(view)
  }

  private fun isGlyph(view: View): Boolean {
    if (view is ImageView) return true
    val name = view.javaClass.name
    return SkeletonRules.glyphClasses.any { name.contains(it) }
  }

  private fun fitsSmallControl(view: View): Boolean =
    view.height <= SkeletonRules.SMALL_CONTROL_HEIGHT * density && view.width <= SkeletonRules.SMALL_CONTROL_WIDTH * density

  private fun isAtomic(view: View): Boolean {
    if (view is ImageView || view is CompoundButton || view is EditText || view is ProgressBar) return true
    val name = view.javaClass.name
    return SkeletonRules.atomicClasses.any { name.contains(it) }
  }

  private fun hasFill(view: View): Boolean {
    val colour = BackgroundStyleApplicator.getBackgroundColor(view)
    return colour != null && Color.alpha(colour) > 0
  }

  private fun hasBorder(view: View): Boolean {
    val colour = BackgroundStyleApplicator.getBorderColor(view, LogicalEdge.ALL)
    return colour != null && Color.alpha(colour) > 0
  }

  // A small control drawn as a rounded box, filled or outlined (a button, a pill): one placeholder, whatever it holds.
  private fun isSmallControl(view: View): Boolean =
    (hasFill(view) || hasBorder(view)) && radiusOf(view) > 0f && fitsSmallControl(view)

  // A small filled box with nothing inside it: a dot, a bar of a chart. A big one is a card's background: it stays drawn.
  private fun isEmptyFill(view: View): Boolean {
    val empty = view !is ViewGroup || view.childCount == 0
    return hasFill(view) && empty && fitsSmallControl(view) && min(view.width, view.height) > SkeletonRules.HAIRLINE * density
  }

  // The view's own corner radius, or the one a clipping parent of the same size gives it (an avatar's image).
  private fun radiusOf(view: View): Float {
    val limit = min(view.width, view.height) / 2f
    var radius = ownRadius(view)
    var parent = view.parent as? View
    while (radius == 0f && parent != null && parent !== root && sameSize(parent, view)) {
      radius = ownRadius(parent)
      parent = parent.parent as? View
    }
    if (view is CompoundButton || view is ProgressBar) radius = limit
    if (radius == 0f && isGlyph(view) && fitsSmallControl(view)) radius = limit
    return min(radius, limit)
  }

  private fun ownRadius(view: View): Float =
    BackgroundStyleApplicator.getBorderRadius(view, BorderRadiusProp.BORDER_RADIUS)
      ?.resolve(min(view.width, view.height).toFloat()) ?: 0f

  private fun sameSize(a: View, b: View): Boolean =
    kotlin.math.abs(a.width - b.width) < SkeletonRules.SAME_SIZE_TOLERANCE &&
      kotlin.math.abs(a.height - b.height) < SkeletonRules.SAME_SIZE_TOLERANCE

  private class TextLayout(val layout: Layout, val x: Float, val y: Float, val maxLines: Int)

  private fun textLayout(view: View): TextLayout? {
    if (view is TextView) {
      val layout = view.layout ?: return null
      return TextLayout(layout, view.totalPaddingLeft.toFloat(), view.totalPaddingTop.toFloat(), view.maxLines)
    }
    if (view.javaClass.name != PREPARED_TEXT_VIEW) return null
    return preparedLayout(view)
  }

  // PreparedLayoutTextView and its layout are internal to React Native, so they are read by name.
  private fun preparedLayout(view: View): TextLayout? {
    val prepared = view.javaClass.getMethod("getPreparedLayout").invoke(view) ?: return null
    val layout = prepared.javaClass.getMethod("getLayout").invoke(prepared) as? Layout ?: return null
    val offset = prepared.javaClass.getMethod("getVerticalOffset").invoke(prepared) as? Float ?: 0f
    val maxLines = prepared.javaClass.getMethod("getMaximumNumberOfLines").invoke(prepared) as? Int ?: 0
    return TextLayout(layout, view.paddingLeft.toFloat(), view.paddingTop + offset, maxLines)
  }

  private fun lines(view: View, text: TextLayout): List<SkeletonPlaceholder> {
    val origin = rectInRoot(view)
    val count = if (text.maxLines in 1 until text.layout.lineCount) text.maxLines else text.layout.lineCount
    return (0 until count).mapNotNull { line ->
      val width = text.layout.getLineMax(line)
      if (width <= 0f) return@mapNotNull null
      val left = origin.left + text.x + text.layout.getLineLeft(line)
      val top = origin.top + text.y + text.layout.getLineTop(line)
      val bottom = origin.top + text.y + text.layout.getLineBottom(line)
      linePlaceholder(left, top, left + width, bottom)
    }
  }

  private companion object {
    const val PREPARED_TEXT_VIEW = "com.facebook.react.views.text.PreparedLayoutTextView"
  }
}
