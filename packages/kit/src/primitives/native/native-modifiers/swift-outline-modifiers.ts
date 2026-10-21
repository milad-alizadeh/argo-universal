import * as SwiftModifiers from '@expo/ui/swift-ui/modifiers';

type SwiftModifier = SwiftModifiers.ModifierConfig;

// Makes the whole frame answer taps, its empty space included.
export function rectangularHitArea(): SwiftModifier {
  return SwiftModifiers.contentShape(SwiftModifiers.shapes.rectangle());
}

// Paints the colour, when there is one, in continuous rounded corners and clips the content to them.
export function roundedFill(
  color: string | undefined,
  radius: number,
): SwiftModifier[] {
  const corners = SwiftModifiers.shapes.roundedRectangle({
    cornerRadius: radius,
    roundedCornerStyle: 'continuous',
  });

  return [
    ...(color ? [SwiftModifiers.background(color, corners)] : []),
    SwiftModifiers.clipShape('roundedRectangle', radius),
  ];
}
