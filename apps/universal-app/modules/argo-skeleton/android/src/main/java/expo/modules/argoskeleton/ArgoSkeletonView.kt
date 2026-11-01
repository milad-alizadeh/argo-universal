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
 * line, image or control above its children. It hides everything under it from accessibility except what a
 * Skeleton.Ignore holds, so its own "Loading" is the one announcement. While it holds a Skeleton.Ignore its own node
 * steps aside, because TalkBack gives a labelled node every view under it and the Ignore content would never be a
 * stop of its own; a one-off announcement says "Loading" in its place. It restores every view when loading ends
 * and when it leaves the window, since Fabric recycles views.
 */
@OptIn(InternalComposeUiApi::class)
class ArgoSkeletonView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

  // The views the Skeleton drew over, by the alpha each had; and the views it hid from accessibility, by the
  // importance each had. The two sets differ: a card stays drawn and still says nothing.
  private val faded = LinkedHashMap<View, Float>()
  private val muted = LinkedHashMap<View, Int>()
  private val covered = mutableListOf<ViewRootForTest>()
  private var loading = false
  private var steppedAside = false
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
    steppedAside = false
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
    steppedAside = false
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
    contentDescription = LOADING_LABEL
    importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES
    accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_POLITE
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) stateDescription = BUSY_LABEL
  }

  /*
   * "Loading" is said once, as an announcement, the first time the Skeleton steps aside in a loading state; there is
   * no "Busy" status on the screen after it. A Skeleton.Ignore that is not shown does not count: it has no stop to give.
   */
  private fun stepAsideForIgnored() {
    if (steppedAside) return
    steppedAside = true
    clearBusyStatus(View.IMPORTANT_FOR_ACCESSIBILITY_NO)
    // announceForAccessibility is deprecated in API 36 and has no replacement that speaks without a node.
    @Suppress("DEPRECATION")
    announceForAccessibility(LOADING_LABEL)
  }

  // The Ignore content went away while still loading: the Skeleton is its own busy status again.
  private fun stepBackIn() {
    if (!steppedAside) return
    steppedAside = false
    exposeBusyToAccessibility()
  }

  private fun hideBusyFromAccessibility() = clearBusyStatus(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO)

  private fun clearBusyStatus(importance: Int) {
    contentDescription = null
    accessibilityLiveRegion = View.ACCESSIBILITY_LIVE_REGION_NONE
    importantForAccessibility = importance
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
    if (found.ignored.any { it.isShown }) stepAsideForIgnored() else stepBackIn()
    drawOver(found.leaves.map { it.view })
    hideFromAccessibility(found.muted)
    cover(found.compose)
    val next = found.leaves.flatMap { it.placeholders } + found.compose.flatMap { it.placeholders }
    if (next == placeholders) return
    placeholders = next
    invalidate()
  }

  // Takes the pixels of what the walk draws a placeholder for, and gives them back to what it no longer finds.
  private fun drawOver(views: List<View>) {
    for (view in views) {
      if (view !in faded) faded[view] = view.alpha
      view.alpha = 0f
    }
    for (view in faded.keys.filter { it !in views }) showAgain(view, faded.remove(view), animated = false)
  }

  /*
   * Hides every subtree the walk muted, so a container that labels itself says nothing through the Skeleton and the
   * Skeleton's own "Loading" is the one announcement. Views it no longer mutes get their own importance back.
   */
  private fun hideFromAccessibility(views: List<View>) {
    for (view in views) {
      if (view !in muted) muted[view] = view.importantForAccessibility
      view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
    }
    for (view in muted.keys.filter { it !in views }) speakAgain(view, muted.remove(view))
  }

  private fun cover(contents: List<ComposeContent>) {
    for (content in contents) {
      if (coverPlaceholders[content.root] != content.local) {
        ComposeCover.apply(content.root, content.local)
        coverPlaceholders[content.root] = content.local
      }
      // Its semantics say nothing through the Skeleton because a muted view above it hides the whole subtree.
      if (content.root !in covered) covered += content.root
    }
    val gone = covered.filter { root -> contents.none { it.root === root } }
    for (root in gone) uncover(root)
  }

  private fun uncover(root: ViewRootForTest) {
    ComposeCover.clear(root)
    coverPlaceholders.remove(root)
    covered.remove(root)
  }

  private fun restoreAll(animated: Boolean) {
    val alphas = faded.toMap()
    faded.clear()
    for ((view, alpha) in alphas) showAgain(view, alpha, animated)
    val importances = muted.toMap()
    muted.clear()
    for ((view, importance) in importances) speakAgain(view, importance)
    for (root in covered.toList()) uncover(root)
  }

  private fun showAgain(view: View, alpha: Float?, animated: Boolean) {
    if (alpha == null) return
    if (animated) view.animate().alpha(alpha).setDuration(FADE_MS).start() else view.alpha = alpha
  }

  /*
   * Puts back the importance the view had, unless something else has written one since: React Native sets this from
   * `aria-hidden`, and a row that hides itself while loading gets its own value back from React, not from here.
   */
  private fun speakAgain(view: View, importance: Int?) {
    if (importance == null) return
    if (view.importantForAccessibility != View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS) return
    view.importantForAccessibility = importance
  }

  private companion object {
    const val LOADING_LABEL = "Loading"
    const val BUSY_LABEL = "Busy"
    const val REFRESH_MS = 100L
    const val FADE_MS = 200L
    const val PULSE_MS = 900L
    const val PULSE_LOW = 0.5f
    val DEFAULT_COLOR = Color.argb(38, 0, 0, 0)
  }
}
