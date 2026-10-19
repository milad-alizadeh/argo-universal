import type { KitProps } from '../../kit-props';

// Kit-only: drawing classes and test identity.
export type StatusDotProps = KitProps<'StatusDot'> & {
  className?: string;
  testID?: string;
};
