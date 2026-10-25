import type { ListProps } from './list-props';

// The rows, how a row is keyed and drawn are the example's own, so a fixture leaves them out.
type RecyclingFixture = Omit<
  ListProps<unknown>,
  'items' | 'keyExtractor' | 'renderItem'
>;

export const recyclingList = {
  appearance: 'plain',
  recycleItems: true,
  drawDistance: 0,
  estimatedItemSize: 56,
  maintainVisibleContentPosition: false,
} satisfies RecyclingFixture;
