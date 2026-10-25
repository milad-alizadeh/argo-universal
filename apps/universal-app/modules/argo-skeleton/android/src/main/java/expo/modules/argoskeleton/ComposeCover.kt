package expo.modules.argoskeleton

import android.graphics.RenderEffect
import android.graphics.RuntimeShader
import android.os.Build
import androidx.compose.ui.InternalComposeUiApi
import androidx.compose.ui.platform.ViewRootForTest

/*
 * Hides Compose content without touching it: a render effect on the Compose root replaces every pixel inside a
 * shape's rectangle with the pixel just left of it, which is the row's own background. Compose draws backgrounds
 * and content into one layer, so this is how the content goes while cards and rows stay. AGSL shaders need
 * Android 13; on older versions the content stays under the shapes.
 */
@OptIn(InternalComposeUiApi::class)
object ComposeCover {
  private const val MAX_SHAPES = 128
  private const val PADDING = 2f
  private const val SAMPLE_OFFSET = 3f

  private const val AGSL = """
    uniform shader content;
    uniform float4 rects[$MAX_SHAPES];
    uniform int count;
    half4 main(float2 xy) {
      for (int i = 0; i < $MAX_SHAPES; i++) {
        if (i >= count) { break; }
        float4 r = rects[i];
        if (xy.x >= r.x && xy.x <= r.z && xy.y >= r.y && xy.y <= r.w) {
          return content.eval(float2(max(r.x - $SAMPLE_OFFSET, 0.0), xy.y));
        }
      }
      return content.eval(xy);
    }
  """

  fun apply(root: ViewRootForTest, shapes: List<SkeletonShape>) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
    if (shapes.isEmpty()) {
      clear(root)
      return
    }
    val rects = FloatArray(MAX_SHAPES * 4)
    val used = shapes.take(MAX_SHAPES)
    used.forEachIndexed { index, shape ->
      rects[index * 4] = shape.rect.left - PADDING
      rects[index * 4 + 1] = shape.rect.top - PADDING
      rects[index * 4 + 2] = shape.rect.right + PADDING
      rects[index * 4 + 3] = shape.rect.bottom + PADDING
    }
    val shader = RuntimeShader(AGSL)
    shader.setFloatUniform("rects", rects)
    shader.setIntUniform("count", used.size)
    root.view.setRenderEffect(RenderEffect.createRuntimeShaderEffect(shader, "content"))
  }

  fun clear(root: ViewRootForTest) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) root.view.setRenderEffect(null)
  }
}
