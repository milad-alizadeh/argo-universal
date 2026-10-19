import { FadeIn } from 'react-native-reanimated';
import { cn } from '#lib/generic/utils';

const fadeInMilliseconds = 200;

const fades = { entering: FadeIn.duration(fadeInMilliseconds) };

const noFades = {};

// Rows that mount while the list reorders fade in; otherwise they appear at once. Leaving rows fade through `closing`.
export function rowFade(animate?: boolean): Partial<typeof fades> {
  return animate ? fades : noFades;
}

// Web: a flat row, 2 apart, whose hover and selected tints take the menu-row radius (Paper "Screen / 1 Porcelain · Ring · Regular").
const flatRow = 'web:mb-0.5 web:overflow-hidden web:rounded-xl';

export function rowClassName(closing?: boolean): string {
  return cn(
    'web:transition-opacity web:duration-150',
    flatRow,
    closing && 'opacity-0',
  );
}
