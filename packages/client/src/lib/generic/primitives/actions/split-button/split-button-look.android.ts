import {
  type ButtonColors,
  type ButtonProps,
  Shape,
} from '@expo/ui/jetpack-compose';

export type HalfSide = 'leading' | 'trailing';

// M3 Expressive split button, small size: a full pill on each half's outer side (half the stock 40dp height) and 4dp facing corners.
const outerCorner = 20;

const innerCorner = 4;

// One half's colours and rounded corners, passed through the stock button's own props.
export function halfLook(
  colors: ButtonColors,
  side: HalfSide,
): Pick<ButtonProps, 'colors' | 'shape'> {
  const [start, end] =
    side === 'leading'
      ? [outerCorner, innerCorner]
      : [innerCorner, outerCorner];

  return {
    colors,
    shape: roundedSidesOutline(start, end),
  };
}

// The stock button's own `shape`: its start corners and end corners each take one radius.
function roundedSidesOutline(
  start: number,
  end: number,
): NonNullable<ButtonProps['shape']> {
  return Shape.RoundedCorner({
    cornerRadii: {
      topStart: start,
      bottomStart: start,
      topEnd: end,
      bottomEnd: end,
    },
  });
}
