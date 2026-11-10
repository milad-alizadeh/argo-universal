import type { PressLayout } from './list-item-layouts';

// The row layouts a tree is drawn in: a compact line, a regular row, and a regular sidebar row.
export type TreeLayout = Extract<PressLayout, 'compact' | 'row' | 'sidebar'>;

// The row's own lane, which holds a parent's chevron and the start of its rail.
interface OwnLane {
  // What the row of lanes takes from its row for it: the row's padding to run past, and the gap to give back.
  lanes: string;
  // The room the lane takes in the row of lanes.
  box: string;
  // The room above the chevron.
  above: string;
}

interface LaneSet {
  // One ancestor's lane.
  lane: string;
  // A rail's box: its right border is the line.
  rail: string;
  // Where a last child's rail ends.
  lastRail: string;
  // The stub from the parent's rail towards the row.
  stub: string;
  // That stub carried on across the own lane of a child with no chevron.
  ownStub: string;
  // The chevron's column in the own lane, as wide as the leading mark.
  column: string;
  chevron: string;
  // The space between the chevron and the rail under it.
  railGap: string;
  // The own lane of a row with a leading mark, and of one without.
  underMark: OwnLane;
  withoutMark: OwnLane;
}

// Paper "Issue row": the chevron has a 16 lane of its own, centred on the line, with or without a leading mark.
const compactOwn: OwnLane = { lanes: '', box: 'w-4', above: 'flex-1' };

/*
 * Every size here follows the row's press layout (list-item-layouts.ts) and its leading slot (list-item-parts.tsx):
 * change one of those and change its set here.
 *
 * Paper "Issue row", a compact line: each level is a 16 lane. A rail is a 1px line 7 in from its lane's start, in the
 * border colour; a child's lane under its parent's chevron carries its rail and a stub across to its own lane, and a
 * last child's rail ends in an elbow there. The rail's box is 8 wide, so its right border lands on that line. The
 * chevron's button fills its lane, so the rail under it leaves the chevron's 16 as its gap.
 *
 * A regular row reserves no lane of its own, so a tree never pushes its rows in. A parent's chevron sits under its
 * leading mark and its rail runs down from there, on the mark's centre. A child's lane is as wide as that mark and the
 * gap after it, so the child's mark starts where its parent's title does, and the stub meets the child's mark at its
 * middle. The lanes give the row's gap back, since the mark follows them at once. A row with no leading mark keeps a
 * lane the mark's width for its chevron, on its title's line.
 */
const laneSets = {
  compact: {
    lane: 'relative w-4 shrink-0',
    rail: 'w-2 border-r border-border',
    lastRail: 'top-0 bottom-1/2 -mb-px',
    stub: 'absolute top-1/2 right-0 left-2 h-px bg-border',
    ownStub: 'absolute inset-x-0 top-1/2 h-px bg-border',
    column: 'w-4',
    chevron: 'absolute inset-0',
    railGap: 'mt-4',
    underMark: compactOwn,
    withoutMark: compactOwn,
  },
  row: {
    lane: 'relative w-10 shrink-0',
    rail: 'w-3 border-r border-border',
    lastRail: 'top-0 h-7 wide-type:h-6.5',
    stub: 'absolute top-7 right-1.5 left-3 -mt-px h-px bg-border wide-type:top-6.5',
    ownStub: 'hidden',
    column: 'w-6',
    chevron: 'size-4',
    railGap: 'mt-0.5',
    underMark: {
      lanes: '-my-4 -mr-4',
      box: 'w-0',
      above: 'h-10 wide-type:h-9',
    },
    withoutMark: { lanes: '-my-4', box: 'w-6', above: 'h-5 wide-type:h-4.5' },
  },
  sidebar: {
    lane: 'relative w-6.5 shrink-0',
    rail: 'w-2 border-r border-border',
    lastRail: 'top-0 h-5',
    stub: 'absolute top-5 right-1 left-2 -mt-px h-px bg-border',
    ownStub: 'hidden',
    column: 'w-4',
    chevron: 'size-4',
    railGap: 'mt-0.5',
    underMark: { lanes: '-my-2.5 -mr-2.5', box: 'w-0', above: 'h-7.5' },
    withoutMark: { lanes: '-my-2.5', box: 'w-4', above: 'h-3' },
  },
} satisfies Record<TreeLayout, LaneSet>;

// One row's lanes: its layout's set, with the own lane its leading mark asks for.
export interface TreeLanes extends Omit<LaneSet, 'underMark' | 'withoutMark'> {
  own: OwnLane;
}

export function treeLanes(layout: TreeLayout, leading: boolean): TreeLanes {
  const { underMark, withoutMark, ...set } = laneSets[layout];

  return { ...set, own: leading ? underMark : withoutMark };
}

// A part of the tree's drawing, with the lanes it draws in.
export type InLanes<Props> = Props & { lanes: TreeLanes };
