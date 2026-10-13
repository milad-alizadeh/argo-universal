import { Easing } from 'react-native-reanimated';
import type { CubicBezier } from './motion';

export function bezierEasing({
  x1,
  y1,
  x2,
  y2,
}: CubicBezier): ReturnType<typeof Easing.bezier> {
  return Easing.bezier(x1, y1, x2, y2);
}
