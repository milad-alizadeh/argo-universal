package expo.modules.argoskeleton

import android.graphics.RectF
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.layout.LayoutInfo
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.ViewRootForTest

/*
 * An Icon with no content description draws a painter and says nothing in the semantics tree, so the tree alone
 * misses it. This reads Compose's layout tree for nodes that draw a painter and are small enough to be a glyph.
 * Compose does not expose the layout children, so they are read by name (LayoutNode.getChildren); if a Compose
 * version renames it, no glyph is found and the rest of the Skeleton still works.
 */
@OptIn(InternalComposeUiApi::class)
object ComposeGlyphs {
  fun read(root: ViewRootForTest, density: Float): List<SkeletonPlaceholder> {
    val found = mutableListOf<SkeletonPlaceholder>()
    visit(root.semanticsOwner.unmergedRootSemanticsNode.layoutInfo, density, found)
    return found
  }

  private fun visit(info: LayoutInfo, density: Float, out: MutableList<SkeletonPlaceholder>) {
    if (!info.isPlaced) return
    if (drawsPainter(info) && fits(info, density)) {
      val origin = info.coordinates.positionInRoot()
      val rect = RectF(origin.x, origin.y, origin.x + info.width, origin.y + info.height)
      out += SkeletonPlaceholder(rect, minOf(rect.width(), rect.height()) / 2)
      return
    }
    for (child in children(info)) visit(child, density, out)
  }

  private fun drawsPainter(info: LayoutInfo): Boolean =
    info.getModifierInfo().any { it.modifier.javaClass.name.contains("Painter") }

  private fun fits(info: LayoutInfo, density: Float): Boolean =
    info.width > 0 && info.height > 0 &&
      info.height <= SkeletonRules.SMALL_CONTROL_HEIGHT * density &&
      info.width <= SkeletonRules.SMALL_CONTROL_HEIGHT * density

  private fun children(info: LayoutInfo): List<LayoutInfo> {
    val method = info.javaClass.methods.firstOrNull { it.name.startsWith("getChildren") && it.parameterCount == 0 }
      ?: return emptyList()
    val list = method.invoke(info) as? List<*> ?: return emptyList()
    return list.filterIsInstance<LayoutInfo>()
  }
}
