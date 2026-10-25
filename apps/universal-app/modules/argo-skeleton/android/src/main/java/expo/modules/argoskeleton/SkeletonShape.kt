package expo.modules.argoskeleton

import android.graphics.RectF

// A rounded rectangle in pixels; the coordinates are the Skeleton's, or a Compose root's while they are read.
data class SkeletonShape(val rect: RectF, val radius: Float) {
  fun translated(dx: Float, dy: Float): SkeletonShape =
    SkeletonShape(RectF(rect).apply { offset(dx, dy) }, radius)
}

// The line a bar is this much of, so lines do not touch.
const val LINE_FILL = 0.75f

fun lineShape(left: Float, top: Float, right: Float, bottom: Float): SkeletonShape {
  val height = (bottom - top) * LINE_FILL
  val inset = ((bottom - top) - height) / 2
  return SkeletonShape(RectF(left, top + inset, right, top + inset + height), height / 2)
}
