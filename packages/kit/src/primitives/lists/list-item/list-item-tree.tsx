import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useListLook } from '../../../list-look-context';
import { useTreeRow, type TreeRow } from '../../../list-tree';
import { cn } from '../../../utils';
import { hasLeading } from './list-item-parts';
import type { ListItemProps } from './list-item-props';
import { OwnLane } from './list-item-tree-fold';
import {
  treeLanes,
  type InLanes,
  type TreeLayout,
} from './list-item-tree-lanes';

// A rail starts at its lane's edge.
const railStart = 'absolute left-0';

// An ancestor's rail that runs on past this row to a later sibling of the row's own branch.
function ThroughLane({
  runs,
  lanes,
}: InLanes<{ runs: boolean }>): ReactElement {
  return (
    <View pointerEvents="none" className={lanes.lane}>
      {runs ? (
        <View className={cn(railStart, lanes.rail, 'inset-y-0')} />
      ) : null}
    </View>
  );
}

// The rails of the row's ancestors, outermost first.
function ThroughLanes(
  props: InLanes<{ through: readonly boolean[] }>,
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

const parentRail = ({ last, lanes }: InLanes<{ last: boolean }>): string =>
  cn(railStart, lanes.rail, last ? lanes.lastRail : 'inset-y-0');

// The parent's rail beside this row, with a stub across towards the row; a last child's rail ends there.
function ParentLane(props: InLanes<{ last: boolean }>): ReactElement {
  return (
    <View pointerEvents="none" className={props.lanes.lane}>
      <View className={parentRail(props)} />
      <View className={props.lanes.stub} />
    </View>
  );
}

// True when the row draws a chevron of its own, a button its row's press must not hold (list-item-beside-press.tsx).
export function useFoldButton(): boolean {
  const tree = useTreeRow();
  const { treeDrawn } = useListLook();

  return Boolean(tree?.parent && treeDrawn);
}

interface TreeLaneProps {
  // The row, for its title, which names its chevron, and its leading mark, which a regular row's chevron sits under.
  row: Pick<ListItemProps, 'title' | 'leading' | 'badge'>;
  layout: TreeLayout;
}

/*
 * The row's tree lane, drawn only on a wide desktop or web window: its ancestors' rails, its parent's, then its own
 * lane, which holds a parent's chevron. It runs the row's full height, past a regular row's own padding.
 */
export function TreeLane(props: TreeLaneProps): ReactNode {
  const tree = useTreeRow();
  const { treeDrawn: drawn } = useListLook();

  if (!tree || !drawn) return null;

  return <RowOfLanes tree={tree} {...props} />;
}

const rowOfLanes = 'flex-row self-stretch';

function RowOfLanes(props: TreeLaneProps & { tree: TreeRow }): ReactElement {
  const { tree, row } = props;
  const lanes = treeLanes(props.layout, hasLeading(row));

  return (
    <View pointerEvents="box-none" className={cn(rowOfLanes, lanes.own.lanes)}>
      <ThroughLanes through={tree.through} lanes={lanes} />
      {tree.depth > 0 ? <ParentLane last={tree.last} lanes={lanes} /> : null}
      <OwnLane tree={tree} title={row.title} lanes={lanes} />
    </View>
  );
}
