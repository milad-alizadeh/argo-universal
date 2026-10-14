import type { ButtonColors, ButtonProps } from '@expo/ui/jetpack-compose';
import type { NativeColors } from '#lib/generic/native-theme';
import { roundedSidesOutline } from '#primitives/native/native-modifiers';

export type HalfSide = 'leading' | 'trailing';

// M3 Expressive split button, small size: a full pill on each half's outer side (half the stock 40dp height) and 4dp facing corners.
const outerCorner = 20;

const innerCorner = 4;

// Paper owns the colours: a primary split fills with the primary token, otherwise the muted one.
function halfColors(colors: NativeColors, primary: boolean): ButtonColors {
  if (!primary)
    return { containerColor: colors.muted, contentColor: colors.foreground };

  return {
    containerColor: colors.primary,
    contentColor: colors.primaryForeground,
  };
}

// One half's colours and rounded corners, passed through the stock button's own props.
export function halfLook(
  colors: NativeColors,
  primary: boolean,
  side: HalfSide,
): Pick<ButtonProps, 'colors' | 'shape'> {
  const [start, end] =
    side === 'leading'
      ? [outerCorner, innerCorner]
      : [innerCorner, outerCorner];

  return {
    colors: halfColors(colors, primary),
    shape: roundedSidesOutline(start, end),
  };
}
