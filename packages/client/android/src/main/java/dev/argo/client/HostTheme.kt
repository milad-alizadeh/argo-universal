package dev.argo.client

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import expo.modules.kotlin.views.ComposeProps
import expo.modules.kotlin.views.FunctionalComposableScope
import expo.modules.kotlin.views.OptimizedComposeProps
import expo.modules.ui.UIComposableScope

@OptimizedComposeProps
data class HostThemeProps(val colors: ThemeColors = ThemeColors()) : ComposeProps

@Composable
fun FunctionalComposableScope.HostThemeContent(props: HostThemeProps) {
  val colors = argoColorScheme(MaterialTheme.colorScheme, props.colors)
  CompositionLocalProvider(LocalContentColor provides colors.onSurface) {
    MaterialTheme(colorScheme = colors) {
      Children(UIComposableScope())
    }
  }
}
