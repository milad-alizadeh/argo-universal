package expo.modules.argoskeleton

import android.graphics.RectF
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.ViewRootForTest
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.text.TextLayoutResult

/*
 * Compose has no redaction and React Native cannot see into it, so the Skeleton reads what Compose says about
 * itself: its semantics tree. A text node's layout gives one shape per line; a switch, checkbox, radio button,
 * slider, progress bar, image or described icon gives its bounds. The unmerged tree is read, so each Text inside
 * a row is its own node. Coordinates are the Compose root's pixels.
 */
@OptIn(InternalComposeUiApi::class)
object ComposeSemantics {
  private const val SMALL_RADIUS_DP = 4f

  fun read(root: ViewRootForTest, density: Float): List<SkeletonShape> {
    val shapes = mutableListOf<SkeletonShape>()
    visit(root.semanticsOwner.unmergedRootSemanticsNode, density, shapes)
    return shapes
  }

  private fun visit(node: SemanticsNode, density: Float, out: MutableList<SkeletonShape>) {
    if (!node.layoutInfo.isPlaced) return
    if (textShapes(node, out)) return
    control(node, density)?.let {
      out += it
      return
    }
    for (child in node.children) visit(child, density, out)
  }

  private fun textShapes(node: SemanticsNode, out: MutableList<SkeletonShape>): Boolean {
    val config = node.config
    if (!config.contains(SemanticsProperties.Text) && !config.contains(SemanticsProperties.EditableText)) return false
    val results = mutableListOf<TextLayoutResult>()
    if (!config.contains(SemanticsActions.GetTextLayoutResult)) return false
    val read = config[SemanticsActions.GetTextLayoutResult].action
    if (read == null || !read(results)) return false
    val origin = node.positionInRoot
    for (result in results) {
      for (line in 0 until result.lineCount) {
        if (result.getLineRight(line) <= result.getLineLeft(line)) continue
        out += lineShape(
          origin.x + result.getLineLeft(line),
          origin.y + result.getLineTop(line),
          origin.x + result.getLineRight(line),
          origin.y + result.getLineBottom(line),
        )
      }
    }
    return true
  }

  private fun control(node: SemanticsNode, density: Float): SkeletonShape? {
    val config = node.config
    val role = if (config.contains(SemanticsProperties.Role)) config[SemanticsProperties.Role] else null
    val round = role == Role.Switch || role == Role.RadioButton ||
      config.contains(SemanticsProperties.ProgressBarRangeInfo)
    val small = role == Role.Checkbox || role == Role.Image ||
      (config.contains(SemanticsProperties.ContentDescription) && node.children.isEmpty())
    if (!round && !small) return null
    val bounds = node.boundsInRoot
    val rect = RectF(bounds.left, bounds.top, bounds.right, bounds.bottom)
    val radius = if (round) minOf(rect.width(), rect.height()) / 2 else SMALL_RADIUS_DP * density
    return SkeletonShape(rect, radius)
  }
}
