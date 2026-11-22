import { leadingMarkPixels } from '../../../leading-mark';
import type { ListItemProps } from './list-item-props';

/*
 * A phone row's leading lane: the 16 gutter, the mark, then the gap to the title. The separator and a step bar start
 * where the title does, so they read the lane's inset instead of redoing this sum. Tailwind needs each class written
 * out, so the table holds the classes and `laneMetrics` the numbers they come from; list-item-lane.test.ts keeps them equal.
 */
export type InsetLane = 'row' | 'avatar';

export const laneMetrics = {
  gutter: 16,
  row: { mark: 24, gap: { ios: 16, android: 16 } },
  avatar: { mark: leadingMarkPixels, gap: { ios: 12, android: 16 } },
} as const;

export const laneInsets = {
  row: 'left-14 wide:left-15',
  avatar: 'left-14 android:left-15 wide:left-15',
} as const satisfies Record<InsetLane, string>;

export const leadingLaneOf = (size: ListItemProps['leadingSize']): InsetLane =>
  size === 'avatar' ? 'avatar' : 'row';
