import * as SwiftModifiers from '@expo/ui/swift-ui/modifiers';

type SwiftModifier = SwiftModifiers.ModifierConfig;

// Makes the whole frame answer taps, its empty space included.
export function rectangularHitArea(): SwiftModifier {
  return SwiftModifiers.contentShape(SwiftModifiers.shapes.rectangle());
}

// Draws a bordered button fully rounded, as a pill.
export function capsuleButtonBorder(): SwiftModifier {
  return SwiftModifiers.buttonBorderShape('capsule');
}
