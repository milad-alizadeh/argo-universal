import {
  useOverlayList,
  useSidebarList,
  useWideSidebarList,
} from '#primitives/fields/field-layout';
import type { ResolvedItemProps } from './grouped-list-item-props';

/*
 * A row's lane: the gap between its parts, and where its text starts, which is the margin, the
 * leading slot and that gap. The separator starts with the text, as a stock iOS list's does, so each
 * lane keeps its inset beside the gap it adds up from.
 */
interface RowLane {
  gap: string;
  textInset: string;
}

// Where the row sits: a plain grouped list, a wide sidebar, or a popover or phone sidebar's compact rows.
export type RowLanePlace = 'grouped' | 'sidebar' | 'compact';

const rowLanes = {
  // A stock iOS 26 Form row at every web width: M + a 24 icon + 16, with M 16 on a phone and 20 from medium up.
  grouped: {
    gap: 'gap-4',
    textInset: 'web:after:left-14 wide:web:after:left-15',
  },
  // 16 + a 24 row icon + 12 on a phone; 16 + a 20 row icon + 8 on a wide window.
  compact: {
    gap: 'gap-3 wide:gap-2',
    textInset: 'web:after:left-13 wide:web:after:left-11',
  },
  // A sidebar's and a large row's parts keep 12 apart: M + 24 + 12.
  loose: {
    gap: 'gap-3',
    textInset: 'web:after:left-13 wide:web:after:left-14',
  },
  // A large row's image sits on a 40 tile: M + 40 + 12.
  tile: {
    gap: 'gap-3',
    textInset: 'web:after:left-17 wide:web:after:left-18',
  },
  // An Agent card's identity slot is 22 on a phone and 24 wide, followed by 12.
  card: {
    gap: 'gap-3',
    textInset: 'web:after:left-12.5 wide:web:after:left-13',
  },
} as const satisfies Record<string, RowLane>;

export function rowLane(
  props: Pick<ResolvedItemProps, 'size' | 'leading' | 'loading' | 'variant'>,
  place: RowLanePlace,
): RowLane {
  if (props.size === 'lg') return largeLane(props);

  return props.variant === 'card' ? rowLanes.card : placeLanes[place];
}

const placeLanes: Record<RowLanePlace, RowLane> = {
  grouped: rowLanes.grouped,
  sidebar: rowLanes.loose,
  compact: rowLanes.compact,
};

// A loading row's spinner sits in the row icon's slot, not on the tile.
const largeLane = (
  props: Pick<ResolvedItemProps, 'leading' | 'loading'>,
): RowLane =>
  props.leading && !props.loading ? rowLanes.tile : rowLanes.loose;

// A wide sidebar's rows keep their loose lane; a popover's and a phone sidebar's keep their compact one.
export function useRowLanePlace(): RowLanePlace {
  const wideSidebar = useWideSidebarList();
  const compact = [useSidebarList(), useOverlayList()].some(Boolean);

  if (wideSidebar) return 'sidebar';

  return compact ? 'compact' : 'grouped';
}
