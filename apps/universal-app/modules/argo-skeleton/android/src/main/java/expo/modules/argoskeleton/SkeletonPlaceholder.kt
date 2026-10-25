package expo.modules.argoskeleton

import android.graphics.RectF

// A rounded rectangle in pixels; the coordinates are the Skeleton's, or a Compose root's while they are read.
data class SkeletonPlaceholder(val rect: RectF, val radius: Float) {
  fun translated(dx: Float, dy: Float): SkeletonPlaceholder =
    SkeletonPlaceholder(RectF(rect).apply { offset(dx, dy) }, radius)
}

/*
 * One text line's bar. It is part of the line box so lines do not touch, and at least as wide as a dot so a line
 * of one character is round; a bar wider than its text is centred on it. The numbers are SkeletonRules, which the
 * web and iOS walks read too.
 */
fun linePlaceholder(left: Float, top: Float, right: Float, bottom: Float): SkeletonPlaceholder {
  val height = (bottom - top) * SkeletonRules.LINE_FILL
  val inset = ((bottom - top) - height) / 2
  val width = maxOf(right - left, height * SkeletonRules.MIN_BAR_WIDTH_PER_HEIGHT)
  val start = left - (width - (right - left)) / 2
  return SkeletonPlaceholder(RectF(start, top + inset, start + width, top + inset + height), height / 2)
}
