package expo.modules.argoskeleton

import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.os.Build
import android.view.View
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.ViewRootForTest
import java.util.WeakHashMap

/*
 * Hides Compose content without touching it: a render effect on the Compose root replaces every pixel inside a
 * placeholder's rounded rectangle (as round as the placeholder, so a card's own corner is not painted over) with
 * one pixel just outside it, which is the row's own background. Compose draws backgrounds and
 * content into one layer, so this is how the content goes while cards and rows stay. The pixel is taken level with the
 * rectangle's centre, so the rounded corner of a card a button sits in is never sampled. It is taken from the
 * left of the placeholder, then the right, above and below, and never from another placeholder. Placeholders beyond one shader's
 * limit go into further effects chained after it, so none is dropped. AGSL shaders need Android 13; on older
 * versions the whole Compose root is made transparent instead, which hides its content and its own backgrounds.
 */
@OptIn(InternalComposeUiApi::class)
object ComposeCover {
  private const val CHUNK = 64
  private const val PADDING = 6f
  private const val SAMPLE_OFFSET = 3f

  private const val AGSL = """
    uniform shader content;
    uniform float4 rects[$CHUNK];
    uniform float radii[$CHUNK];
    uniform int count;
    uniform float2 size;
    bool inside(float2 p, float4 r, float radius) {
      float2 hs = (r.zw - r.xy) * 0.5;
      float rr = min(radius, min(hs.x, hs.y));
      float2 q = abs(p - (r.xy + r.zw) * 0.5) - (hs - rr);
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) <= rr;
    }
    bool covered(float2 p) {
      for (int i = 0; i < $CHUNK; i++) {
        if (i >= count) { break; }
        if (inside(p, rects[i], radii[i])) { return true; }
      }
      return false;
    }
    half4 around(float4 r) {
      float cx = (r.x + r.z) * 0.5;
      float cy = (r.y + r.w) * 0.5;
      float2 left = float2(r.x - $SAMPLE_OFFSET, cy);
      if (left.x >= 0.0 && !covered(left)) { return content.eval(left); }
      float2 right = float2(r.z + $SAMPLE_OFFSET, cy);
      if (right.x <= size.x && !covered(right)) { return content.eval(right); }
      float2 above = float2(cx, r.y - $SAMPLE_OFFSET);
      if (above.y >= 0.0 && !covered(above)) { return content.eval(above); }
      return content.eval(float2(cx, min(r.w + $SAMPLE_OFFSET, size.y)));
    }
    half4 main(float2 xy) {
      float4 hit = float4(0.0);
      bool found = false;
      for (int i = 0; i < $CHUNK; i++) {
        if (i >= count) { break; }
        if (inside(xy, rects[i], radii[i])) { hit = rects[i]; found = true; }
      }
      if (found) { return around(hit); }
      return content.eval(xy);
    }
  """

  private val alphas = WeakHashMap<View, Float>()

  fun apply(root: ViewRootForTest, placeholders: List<SkeletonPlaceholder>) {
    val view = root.view
    if (placeholders.isEmpty()) {
      clear(root)
      return
    }
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      if (view !in alphas) alphas[view] = view.alpha
      view.alpha = 0f
      return
    }
    var effect: RenderEffect? = null
    for (chunk in placeholders.chunked(CHUNK)) {
      val next = chunkEffect(chunk, view.width.toFloat(), view.height.toFloat())
      effect = if (effect == null) next else RenderEffect.createChainEffect(next, effect)
    }
    view.setRenderEffect(effect)
  }

  private fun chunkEffect(placeholders: List<SkeletonPlaceholder>, width: Float, height: Float): RenderEffect {
    val rects = FloatArray(CHUNK * 4)
    val radii = FloatArray(CHUNK)
    placeholders.forEachIndexed { index, placeholder ->
      rects[index * 4] = placeholder.rect.left - PADDING
      rects[index * 4 + 1] = placeholder.rect.top - PADDING
      rects[index * 4 + 2] = placeholder.rect.right + PADDING
      rects[index * 4 + 3] = placeholder.rect.bottom + PADDING
      radii[index] = placeholder.radius + PADDING
    }
    val shader = RuntimeShader(AGSL)
    shader.setFloatUniform("rects", rects)
    shader.setFloatUniform("radii", radii)
    shader.setIntUniform("count", placeholders.size)
    shader.setFloatUniform("size", width, height)
    return RenderEffect.createRuntimeShaderEffect(shader, "content")
  }

  fun clear(root: ViewRootForTest) {
    val view = root.view
    alphas.remove(view)?.let { view.alpha = it }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) view.setRenderEffect(null)
  }
}
