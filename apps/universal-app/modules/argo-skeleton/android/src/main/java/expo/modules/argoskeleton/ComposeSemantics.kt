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
 * itself: its semantics tree. A text node's layout gives one placeholder per line; a switch, checkbox, radio button,
 * slider, progress bar, image or described icon gives its bounds. The unmerged tree is read, so each Text inside
 * a row is its own node. Coordinates are the Compose root's pixels.
 */
@OptIn(InternalComposeUiApi::class)
object ComposeSemantics {
  fun read(root: ViewRootForTest, density: Float): List<SkeletonPlaceholder> {
    val placeholders = mutableListOf<SkeletonPlaceholder>()
    visit(root.semanticsOwner.unmergedRootSemanticsNode, density, placeholders)
    for (glyph in ComposeGlyphs.read(root, density)) if (placeholders.none { overlaps(it, glyph) }) placeholders += glyph
    return placeholders
  }

  private fun overlaps(a: SkeletonPlaceholder, b: SkeletonPlaceholder): Boolean = RectF.intersects(a.rect, b.rect)

  private fun visit(node: SemanticsNode, density: Float, out: MutableList<SkeletonPlaceholder>) {
    if (!node.layoutInfo.isPlaced) return
    if (textPlaceholders(node, out)) return
    if (isToggle(node) && !fitsSmallControl(node, density)) {
      for (child in node.children) visitInToggle(child, density, out)
      return
    }
    control(node, density)?.let {
      out += it
      return
    }
    for (child in node.children) visit(child, density, out)
  }

  private fun isToggle(node: SemanticsNode): Boolean {
    val config = node.config
    if (!config.contains(SemanticsProperties.Role)) return false
    val role = config[SemanticsProperties.Role]
    return role == Role.Switch || role == Role.Checkbox || role == Role.RadioButton
  }

  private fun fitsSmallControl(node: SemanticsNode, density: Float): Boolean {
    val bounds = node.boundsInRoot
    return bounds.height <= SkeletonRules.SMALL_CONTROL_HEIGHT * density &&
      bounds.width <= SkeletonRules.SMALL_CONTROL_WIDTH * density
  }

  private fun hasText(node: SemanticsNode): Boolean =
    node.config.contains(SemanticsProperties.Text) || node.children.any { hasText(it) }

  /*
   * A toggle that spans its whole row is a merged node: its label is a text child and its control is a child with
   * no text. Each gets its own placeholder (the label's lines, and one round placeholder for the control), never one pill.
   */
  private fun visitInToggle(node: SemanticsNode, density: Float, out: MutableList<SkeletonPlaceholder>) {
    if (!node.layoutInfo.isPlaced) return
    if (textPlaceholders(node, out)) return
    if (fitsSmallControl(node, density) && !hasText(node)) {
      val bounds = node.boundsInRoot
      val rect = RectF(bounds.left, bounds.top, bounds.right, bounds.bottom)
      out += SkeletonPlaceholder(rect, minOf(rect.width(), rect.height()) / 2)
      return
    }
    for (child in node.children) visitInToggle(child, density, out)
  }

  private fun textPlaceholders(node: SemanticsNode, out: MutableList<SkeletonPlaceholder>): Boolean {
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
        out += linePlaceholder(
          origin.x + result.getLineLeft(line),
          origin.y + result.getLineTop(line),
          origin.x + result.getLineRight(line),
          origin.y + result.getLineBottom(line),
        )
      }
    }
    return true
  }

  private fun control(node: SemanticsNode, density: Float): SkeletonPlaceholder? {
    val config = node.config
    val role = if (config.contains(SemanticsProperties.Role)) config[SemanticsProperties.Role] else null
    val round = role == Role.Switch || role == Role.RadioButton ||
      config.contains(SemanticsProperties.ProgressBarRangeInfo)
    val small = role == Role.Checkbox || role == Role.Image ||
      (config.contains(SemanticsProperties.ContentDescription) && node.children.isEmpty())
    if (!round && !small) return null
    val bounds = node.boundsInRoot
    val rect = RectF(bounds.left, bounds.top, bounds.right, bounds.bottom)
    val radius = minOf(rect.width(), rect.height()) / 2
    return SkeletonPlaceholder(rect, radius)
  }
}
