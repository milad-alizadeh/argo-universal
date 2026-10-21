import type { KitProps } from '../../kit-props';

// Kit-only: a pressable Surface's spoken name, and `fill`, which takes its parent's height, as cards in a Grid row share the tallest.
export type SurfaceProps = KitProps<'Surface'> & {
  accessibilityLabel?: string;
  fill?: boolean;
};
