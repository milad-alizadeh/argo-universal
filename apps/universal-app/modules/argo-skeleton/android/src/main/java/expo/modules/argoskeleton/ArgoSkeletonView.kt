package expo.modules.argoskeleton

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.view.ViewTreeObserver
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.ViewRootForTest
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

/*
 * The Skeleton's native view. While `loading` it walks the views under it (ViewWalk) before every frame, sets
 * each content view's alpha to 0, covers Compose content (ComposeCover), and draws one rounded placeholder per text
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
  private var placeholderColor: Int? = null
  private var placeholders: List<SkeletonPlaceholder> = emptyList()
  private var fade = 0f
  private var pulse = 1f
  private var fader: ValueAnimator? = null
  private var pulser: ValueAnimator? = null
  private var pending = false
  private var lastRefresh = 0L
  private val coverPlaceholders = HashMap<ViewRootForTest, List<SkeletonPlaceholder>>()

  private val preDraw = ViewTreeObserver.OnPreDrawListener {
    scheduleRefresh()
    true
  }

  private val refreshTask = Runnable {
    pending = false
    lastRefresh = SystemClock.uptimeMillis()
    refresh()
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

  fun setPlaceholderColor(value: Int?) {
    placeholderColor = value
    invalidate()
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    if (loading) scheduleRefresh()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    removeCallbacks(refreshTask)
    pending = false
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
    val base = placeholderColor ?: DEFAULT_COLOR
    paint.color = base
    paint.alpha = (Color.alpha(base) * fade * pulse).toInt()
    for (placeholder in placeholders) canvas.drawRoundRect(placeholder.rect, placeholder.radius, placeholder.radius, paint)
  }

  private fun start() {
    if (!isAttachedToWindow) return
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    viewTreeObserver.addOnPreDrawListener(preDraw)
    exposeBusyToAccessibility()
    animateFade(1f)
    applyAnimation()
    refresh()
  }

  private fun stop() {
    viewTreeObserver.removeOnPreDrawListener(preDraw)
    pulser?.cancel()
    pulse = 1f
    removeCallbacks(refreshTask)
    pending = false
    hideBusyFromAccessibility()
    restoreAll(animated = true)
    animateFade(0f)
  }

  /*
   * The walk runs at most once per interval and only after the Skeleton drew or laid out; it re-applies the cover and
   * redraws only when the placeholders it found differ, so a screen at rest does not draw again because of it.
   */
  private fun scheduleRefresh() {
    if (pending) return
    pending = true
    val wait = (REFRESH_MS - (SystemClock.uptimeMillis() - lastRefresh)).coerceAtLeast(0)
    postDelayed(refreshTask, wait)
  }

  // A busy status for TalkBack, there from the first frame of loading even when the walk finds no placeholder.
  private fun exposeBusyToAccessibility() {
    contentDescription = "Loading"
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) stateDescription = "Busy"
  }

  private fun hideBusyFromAccessibility() {
    contentDescription = null
    accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_NONE
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_AUTO
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) stateDescription = null
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
    val next = found.leaves.flatMap { it.placeholders } + found.compose.flatMap { it.placeholders }
    if (next == placeholders) return
    placeholders = next
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
      if (coverPlaceholders[content.root] != content.local) {
        ComposeCover.apply(content.root, content.local)
        coverPlaceholders[content.root] = content.local
      }
      content.root.view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
      if (content.root !in covered) covered += content.root
    }
    val gone = covered.filter { root -> contents.none { it.root === root } }
    for (root in gone) uncover(root)
  }

  private fun uncover(root: ViewRootForTest) {
    ComposeCover.clear(root)
    coverPlaceholders.remove(root)
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
    const val REFRESH_MS = 100L
    const val FADE_MS = 200L
    const val PULSE_MS = 900L
    const val PULSE_LOW = 0.5f
    val DEFAULT_COLOR = Color.argb(38, 0, 0, 0)
  }
}
