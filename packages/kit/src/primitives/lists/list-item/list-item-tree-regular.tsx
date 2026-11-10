import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import type { TreeRow } from '../../../list-tree';
import { cn } from '../../../utils';
import { FoldButton, type FoldProps } from './list-item-tree-fold';

/*
 * A regular row reserves no lane of its own, so a tree never pushes its rows in. A parent's chevron sits under its
 * leading mark and its rail runs down from there, on the mark's centre. A child's lane is as wide as that mark and the
 * gap after it, so the child's mark starts where its parent's title does, and the rail's stub meets the child's mark
 * at its middle. Each set follows its row's lanes (list-item-layouts.ts) and leading slot (list-item-parts.tsx); a
 * row with no leading mark keeps a slot the mark's width for its chevron instead.
 */
const regularLanes = {
  row: {
    lanes: '-my-4',
    gap: '-mr-4',
    lane: 'relative w-10 shrink-0',
    rail: 'w-3 border-r border-border',
    toMark: 'top-0 h-7 wide-type:h-6.5',
    across:
      'absolute top-7 right-1.5 left-3 -mt-px h-px bg-border wide-type:top-6.5',
    fold: 'w-6 pt-10 wide-type:pt-9',
    slot: 'w-6 pt-5 wide-type:pt-4.5',
  },
  sidebar: {
    lanes: '-my-2.5',
    gap: '-mr-2.5',
    lane: 'relative w-6.5 shrink-0',
    rail: 'w-2 border-r border-border',
    toMark: 'top-0 h-5',
    across: 'absolute top-5 right-1 left-2 -mt-px h-px bg-border',
    fold: 'w-4 pt-7.5',
    slot: 'w-4 pt-3',
  },
};

// A lane's rail starts at its lane's edge; a parent's own, under its chevron, sits on the same line.
const placed = 'absolute left-0';

const ownRail = 'mt-0.5 flex-1 self-start';

type Lanes = (typeof regularLanes)[keyof typeof regularLanes];

// Which of the row's own lanes the tree is drawn against.
export interface RegularRow {
  // A sidebar row, whose lanes and leading mark are narrower.
  sidebar: boolean;
  // The row draws a leading mark, which its chevron and rail sit under.
  leading: boolean;
}

type LanesProps = RegularRow & { tree: TreeRow; title: string };

type Drawn<Props> = Props & { lanes: Lanes };

// An ancestor's rail that runs on past this row to a later sibling of the row's own branch.
function ThroughLane({ runs, lanes }: Drawn<{ runs: boolean }>): ReactElement {
  return (
    <View pointerEvents="none" className={lanes.lane}>
      {runs ? <View className={cn(placed, lanes.rail, 'inset-y-0')} /> : null}
    </View>
  );
}

// The rails of the row's ancestors, outermost first.
function ThroughLanes(
  props: Drawn<{ through: readonly boolean[] }>,
): ReactNode {
  const [runs, ...inner] = props.through;

  if (runs === undefined) return null;

  return (
    <>
      <ThroughLane runs={runs} lanes={props.lanes} />
      <ThroughLanes through={inner} lanes={props.lanes} />
    </>
  );
}

// The parent's rail beside this row, with a stub across to the row's leading mark; a last child's ends there.
function ParentLane({ last, lanes }: Drawn<{ last: boolean }>): ReactElement {
  return (
    <View pointerEvents="none" className={lanes.lane}>
      <View
        className={cn(placed, lanes.rail, last ? lanes.toMark : 'inset-y-0')}
      />
      <View className={lanes.across} />
    </View>
  );
}

type FoldLaneProps = Drawn<FoldProps & Pick<RegularRow, 'leading'>>;

const foldClass = (lanes: Lanes, leading: boolean): string =>
  cn(
    'items-center',
    leading
      ? ['absolute inset-y-0 left-0', lanes.fold]
      : ['self-stretch', lanes.slot],
  );

// A parent's chevron, then the rail to its children while it is open.
function FoldColumn({ lanes, leading, ...fold }: FoldLaneProps): ReactElement {
  return (
    <View pointerEvents="box-none" className={foldClass(lanes, leading)}>
      <FoldButton {...fold} className="size-4" />
      {fold.parent.open ? (
        <View pointerEvents="none" className={cn(ownRail, lanes.rail)} />
      ) : null}
    </View>
  );
}

// Under the leading mark the column takes no width of its own: it draws over the mark's lane.
function FoldLane(props: FoldLaneProps): ReactElement {
  const column = <FoldColumn {...props} />;

  if (!props.leading) return column;

  return (
    <View pointerEvents="box-none" className="relative w-0">
      {column}
    </View>
  );
}

function OwnLane({ tree, title, ...drawn }: Drawn<LanesProps>): ReactNode {
  if (tree.parent)
    return <FoldLane parent={tree.parent} title={title} {...drawn} />;

  if (drawn.leading) return null;

  return <View pointerEvents="none" className={drawn.lanes.slot} />;
}

// The lanes take the row's gap back when the leading mark follows them, so a top-level row's mark never moves.
const lanesClass = (lanes: Lanes, leading: boolean): string =>
  cn('flex-row self-stretch', lanes.lanes, leading && lanes.gap);

export function RegularLanes(props: LanesProps): ReactElement {
  const { tree, leading } = props;
  const lanes = regularLanes[props.sidebar ? 'sidebar' : 'row'];

  return (
    <View pointerEvents="box-none" className={lanesClass(lanes, leading)}>
      <ThroughLanes through={tree.through} lanes={lanes} />
      {tree.depth > 0 ? <ParentLane last={tree.last} lanes={lanes} /> : null}
      <OwnLane {...props} lanes={lanes} />
    </View>
  );
}
