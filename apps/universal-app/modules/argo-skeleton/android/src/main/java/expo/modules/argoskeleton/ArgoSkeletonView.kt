package expo.modules.argoskeleton

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.View
import android.view.ViewTreeObserver
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.ViewRootForTest
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/*
 * The Skeleton's native view. While `loading` it walks the views under it (ViewWalk) before every frame, sets
 * each content view's alpha to 0, covers Compose content (ComposeCover), and draws one rounded shape per text
 * line, image or control above its children. It restores every view when loading ends and when it leaves the
 * window, since Fabric recycles views.
 */
@OptIn(InternalComposeUiApi::class)
class ArgoSkeletonView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private class Hidden(val alpha: Float, val importance: Int)

  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
  private val hidden = LinkedHashMap<View, Hidden>()
  private val covered = mutableListOf<ViewRootForTest>()
  private var loading = false
  private var animation = "pulse"
  private var shapeColor: Int? = null
  private var shapes: List<SkeletonShape> = emptyList()
  private var fade = 0f
  private var pulse = 1f
  private var fader: ValueAnimator? = null
  private var pulser: ValueAnimator? = null

  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    refresh()
    true
  }

  init {
    setWillNotDraw(false)
  }

  fun setLoading(value: Boolean) {
    if (value == loading) return
    loading = value
    if (value) start() else stop()
  }

  fun setAnimation(value: String) {
    animation = value
    if (loading) applyAnimation()
  }

  fun setShapeColor(value: Int?) {
    shapeColor = value
    invalidate()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    pulser?.cancel()
    restoreAll(animated = false)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (loading) start()
  }

  override fun dispatchDraw(canvas: Canvas) {
    super.dispatchDraw(canvas)
    if (!loading && fade == 0f) return
    val base = shapeColor ?: DEFAULT_COLOR
    paint.color = base
    paint.alpha = (Color.alpha(base) * fade * pulse).toInt()
    for (shape in shapes) canvas.drawRoundRect(shape.rect, shape.radius, shape.radius, paint)
  }

  private fun start() {
    if (!isAttachedToWindow) return
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    viewTreeObserver.addOnPreDrawListener(preDraw)
    contentDescription = "Loading"
    animateFade(1f)
    applyAnimation()
    refresh()
  }

  private fun stop() {
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    pulser?.cancel()
    pulse = 1f
    contentDescription = null
    restoreAll(animated = true)
    animateFade(0f)
  }

  private fun animateFade(target: Float) {
    fader?.cancel()
    fader = ValueAnimator.ofFloat(fade, target).apply {
      duration = FADE_MS
      addUpdateListener {
        fade = it.animatedValue as Float
        invalidate()
      }
      start()
    }
  }

  private fun applyAnimation() {
    pulser?.cancel()
    pulse = 1f
    if (animation != "pulse") return
    pulser = ValueAnimator.ofFloat(1f, PULSE_LOW).apply {
      duration = PULSE_MS
      repeatCount = ValueAnimator.INFINITE
      repeatMode = ValueAnimator.REVERSE
      addUpdateListener {
        pulse = it.animatedValue as Float
        invalidate()
      }
      start()
    }
  }

  private fun refresh() {
    val found = ViewWalk(this).collect()
    hide(found.leaves.map { it.view })
    cover(found.compose)
    val next = found.leaves.flatMap { it.shapes } + found.compose.flatMap { it.shapes }
    if (next == shapes) return
    shapes = next
    invalidate()
  }

  // Hides what the walk found, and shows again what it no longer finds.
  private fun hide(views: List<View>) {
    for (view in views) {
      if (view !in hidden) hidden[view] = Hidden(view.alpha, view.importantForAccessibility)
      view.alpha = 0f
      view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    }
    val gone = hidden.keys.filter { it !in views }
    for (view in gone) restore(view, hidden.remove(view), animated = false)
  }

  private fun cover(contents: List<ComposeContent>) {
    for (content in contents) {
      ComposeCover.apply(content.root, content.local)
      content.root.view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      if (content.root !in covered) covered += content.root
    }
    val gone = covered.filter { root -> contents.none { it.root === root } }
    for (root in gone) uncover(root)
  }

  private fun uncover(root: ViewRootForTest) {
    ComposeCover.clear(root)
    root.view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
    covered.remove(root)
  }

  private fun restoreAll(animated: Boolean) {
    val entries = hidden.toMap()
    hidden.clear()
    for ((view, entry) in entries) restore(view, entry, animated)
    for (root in covered.toList()) uncover(root)
  }

  private fun restore(view: View, entry: Hidden?, animated: Boolean) {
    if (entry == null) return
    view.importantForAccessibility = entry.importance
    if (animated) view.animate().alpha(entry.alpha).setDuration(FADE_MS).start() else view.alpha = entry.alpha
  }

  private companion object {
    const val FADE_MS = 200L
    const val PULSE_MS = 900L
    const val PULSE_LOW = 0.5f
    val DEFAULT_COLOR = Color.argb(13, 0, 0, 0)
  }
}
