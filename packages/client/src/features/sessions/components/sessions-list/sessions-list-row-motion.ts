import { FadeIn } from 'react-native-reanimated';
import { cn } from '#lib/generic/utils';
import type { SessionsLayout } from '../../state/sessions-layout';

const fadeInMilliseconds = 200;

const fades = { entering: FadeIn.duration(fadeInMilliseconds) };

const noFades = {};

// Rows that mount while the list reorders fade in; otherwise they appear at once. Leaving rows fade through `closing`.
export function rowFade(animate?: boolean): Partial<typeof fades> {
  return animate ? fades : noFades;
}

export function rowClassName(
  layout?: SessionsLayout,
  closing?: boolean,
): string {
  return cn(
    layout === 'compact' ? 'wide:pb-0.5' : 'pb-2',
    'web:transition-opacity web:duration-150',
    closing && 'opacity-0',
  );
}
