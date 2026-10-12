import type { IconSize } from '../../../lib/generic/symbols/icon';
import { useWide } from '../../../lib/generic/use-wide';

// Feed icons, leading marks and disclosure chevrons alike, step up with the Body text on the phone.
export function useFeedIconSize(): IconSize {
  return useWide() ? 'sm' : 'md';
}
