package dev.argo.client

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.ui.ExpoUIView

class ClientThemeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ClientTheme")
    ExpoUIView<HostThemeProps>("HostTheme") {
      Content { props -> HostThemeContent(props) }
    }
  }
}
