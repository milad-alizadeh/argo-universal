import type { KitProps } from '../../kit-props';

// Kit-only: test identity, and the hairline track a sidebar row's Plan bar runs on.
export type ProgressBarProps = KitProps<'ProgressBar'> & {
  testID?: string;
  indeterminate?: boolean;
  // A rounded hairline track instead of the tone's tint (Paper "SessionsList").
  track?: 'hairline';
  // One segment per step instead of one fill (Paper's step bar, Option A).
  steps?: ProgressSteps;
};

export interface ProgressSteps {
  done: number;
  // Steps underway: they follow the done ones, pale.
  started: number;
  total: number;
}
