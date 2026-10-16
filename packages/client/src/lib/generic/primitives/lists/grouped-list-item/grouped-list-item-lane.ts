import type { ResolvedItemProps } from './grouped-list-item-props';

/*
 * A row's lane: the gap between its parts, and where its text starts, which is the 16 gutter, the
 * leading slot and that gap. The separator starts with the text, as a stock iOS list's does, so each
 * lane keeps its inset beside the gap it adds up from.
 */
interface RowLane {
  gap: string;
  textInset: string;
}

const rowLanes = {
  // 16 + a 24 row icon + 12 on a phone; 16 + a 20 row icon + 8 on a wide window.
  compact: {
    gap: 'gap-3 wide:gap-2',
    textInset: 'web:after:left-13 wide:web:after:left-11',
  },
  // A sidebar's and a large row's parts keep 12 apart: 16 + 24 + 12, and 16 + 20 + 12.
  loose: {
    gap: 'gap-3',
    textInset: 'web:after:left-13 wide:web:after:left-12',
  },
  // A large row's image sits on a 40 tile: 16 + 40 + 12.
  tile: { gap: 'gap-3', textInset: 'web:after:left-17' },
} as const satisfies Record<string, RowLane>;

export function rowLane(
  props: Pick<ResolvedItemProps, 'size' | 'leading' | 'loading'>,
  sidebar: boolean,
): RowLane {
  if (props.size === 'lg') return largeLane(props);

  return sidebar ? rowLanes.loose : rowLanes.compact;
}

// A loading row's spinner sits in the row icon's slot, not on the tile.
const largeLane = (
  props: Pick<ResolvedItemProps, 'leading' | 'loading'>,
): RowLane =>
  props.leading && !props.loading ? rowLanes.tile : rowLanes.loose;
