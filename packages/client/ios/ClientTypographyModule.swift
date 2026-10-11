import CoreText
import ExpoModulesCore
import ExpoUI
import SwiftUI

public final class ClientTypographyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ClientTypography")
    OnCreate {
      ViewModifierRegistry.register("balancedLineHeight") { params, context, _ in
        try BalancedLineHeight(from: params, appContext: context)
      }
    }
    OnDestroy {
      ViewModifierRegistry.unregister("balancedLineHeight")
    }
  }
}

private struct BalancedLineHeight: ViewModifier, Record {
  @Field private var value: CGFloat = 0

  func body(content: Content) -> some View {
    if #available(iOS 26.0, *) {
      content.modifier(ResolvedLineHeight(value: value))
    } else {
      content
    }
  }
}

@available(iOS 26.0, *)
private struct ResolvedLineHeight: ViewModifier {
  @Environment(\.font) private var font
  @Environment(\.fontResolutionContext) private var context
  private let value: CGFloat

  init(value: CGFloat) {
    self.value = value
  }

  func body(content: Content) -> some View {
    let resolved = (font ?? .body).resolve(in: context).ctFont
    let natural = CTFontGetAscent(resolved) + CTFontGetDescent(resolved) + CTFontGetLeading(resolved)
    let extra = max(0, value - natural)
    content.lineSpacing(extra).padding(.vertical, extra / 2)
  }
}
