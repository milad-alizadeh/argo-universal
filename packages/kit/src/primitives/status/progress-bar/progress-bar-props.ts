import type { KitProps } from '../../kit-props';

// Kit-only: test identity, and the hairline track a sidebar row's Plan bar runs on.
export type ProgressBarProps = KitProps<'ProgressBar'> & {
  testID?: string;
  indeterminate?: boolean;
  // A rounded hairline track instead of the tone's tint (Paper "SessionsList").
  track?: 'hairline';
};
