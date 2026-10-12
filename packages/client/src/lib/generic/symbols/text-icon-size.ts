import { useWide } from '../use-wide';
import type { IconSize } from './icon';

export type IconTextRole = 'body' | 'control' | 'secondary';

// An icon or chevron beside text follows that text's role, so it steps up on the phone when the text does.
const textIconSizes = {
  body: { wide: 'sm', phone: 'md' },
  control: { wide: 'sm', phone: 'sm' },
  secondary: { wide: 'xs', phone: 'sm' },
} as const satisfies Record<IconTextRole, Record<'wide' | 'phone', IconSize>>;

export function useTextIconSize(role: IconTextRole = 'body'): IconSize {
  return textIconSizes[role][useWide() ? 'wide' : 'phone'];
}
