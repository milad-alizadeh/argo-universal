import { tint } from '@expo/ui/swift-ui/modifiers';

// SwiftUI's tint, left out while Uniwind has not resolved the colour.
export function optionalTint(
  color: string | undefined,
): ReturnType<typeof tint>[] {
  return color === undefined ? [] : [tint(color)];
}
