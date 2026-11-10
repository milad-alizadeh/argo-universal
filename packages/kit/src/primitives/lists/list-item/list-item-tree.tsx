import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useListLook } from '../../../list-look-context';
import { useTreeRow, type TreeRow } from '../../../list-tree';
import { cn } from '../../../utils';
import { FoldButton, type FoldProps } from './list-item-tree-fold';
import { RegularLanes, type RegularRow } from './list-item-tree-regular';

/*
 * Paper "Issue row": each level of the tree is a 16 lane. A rail is a 1px line 7 in from its lane's start, in the
 * border colour; a child's lane under its parent's chevron carries its rail and a stub across to its own lane, and a
 * last child's rail ends in an elbow there. The rail's box is 8 wide, so its right border lands on that line.
 */
const lane = 'relative w-4 shrink-0';

const rail = 'absolute left-0 w-2 border-r border-border';

const across = 'absolute top-1/2 right-0 h-px bg-border';

// An ancestor's rail that runs on past this row to a later sibling of the row's own branch.
function ThroughLane({ runs }: { runs: boolean }): ReactElement {
  return (
    <View pointerEvents="none" className={lane}>
      {runs ? <View className={cn(rail, 'inset-y-0')} /> : null}
    </View>
  );
}

// The parent's rail beside this row, with a stub across to the row's own lane; a last child's ends there.
function ParentLane({ last }: { last: boolean }): ReactElement {
  return (
    <View pointerEvents="none" className={lane}>
      <View
        className={cn(rail, 'top-0', last ? 'bottom-1/2 -mb-px' : 'bottom-0')}
      />
      <View className={cn(across, 'left-2')} />
    </View>
  );
}

// A parent's chevron folds and unfolds its children; an open parent's rail starts under it.
function FoldLane({ parent, title }: FoldProps): ReactElement {
  return (
    <View pointerEvents="box-none" className={lane}>
      {parent.open ? (
        <View
          pointerEvents="none"
          className={cn(rail, 'top-1/2 bottom-0 mt-2')}
        />
      ) : null}
      <FoldButton parent={parent} title={title} className="absolute inset-0" />
    </View>
  );
}

function OwnLane({
  tree,
  title,
}: {
  tree: TreeRow;
  title: string;
}): ReactElement {
  if (tree.parent) return <FoldLane parent={tree.parent} title={title} />;

  return (
    <View pointerEvents="none" className={lane}>
      {tree.depth > 0 ? <View className={cn(across, 'left-0')} /> : null}
    </View>
  );
}

// The rails of the row's ancestors, outermost first.
function ThroughLanes({ through }: { through: readonly boolean[] }): ReactNode {
  const [runs, ...inner] = through;

  if (runs === undefined) return null;

  return (
    <>
      <ThroughLane runs={runs} />
      <ThroughLanes through={inner} />
    </>
  );
}

type LaneProps = {
  title: string;
  // Set on a regular row, which draws its tree against its own lanes; a compact row's line leaves it out.
  regular?: RegularRow;
};

// True when the row draws a chevron of its own, a button its row's press must not hold (list-item-beside-press.tsx).
export function useFoldButton(): boolean {
  const tree = useTreeRow();
  const { treeDrawn } = useListLook();

  return Boolean(tree?.parent && treeDrawn);
}

/*
 * The row's tree lane, drawn only on a wide desktop or web window. A compact row's is its ancestors' rails, its
 * parent's, then its own lane, which holds a parent's chevron. A regular row keeps its chevron and rail under its
 * leading mark instead (list-item-tree-regular.tsx).
 */
export function TreeLane(props: LaneProps): ReactNode {
  const tree = useTreeRow();
  const { treeDrawn: drawn } = useListLook();

  if (!tree || !drawn) return null;

  return <Lanes tree={tree} {...props} />;
}

function Lanes({
  tree,
  title,
  regular,
}: LaneProps & { tree: TreeRow }): ReactElement {
  if (regular) return <RegularLanes tree={tree} title={title} {...regular} />;

  return (
    <View pointerEvents="box-none" className="flex-row self-stretch">
      <ThroughLanes through={tree.through} />
      {tree.depth > 0 ? <ParentLane last={tree.last} /> : null}
      <OwnLane tree={tree} title={title} />
    </View>
  );
}
