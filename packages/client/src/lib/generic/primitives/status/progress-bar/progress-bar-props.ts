import type { KitProps } from '../../kit-props';

// Kit-only: test identity.
export type ProgressBarProps = KitProps<'ProgressBar'> & { testID?: string };
