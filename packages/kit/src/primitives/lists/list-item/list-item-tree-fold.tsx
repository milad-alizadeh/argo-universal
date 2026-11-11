import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { TreeRow } from '../../../list-tree';
import { cn } from '../../../utils';
import type { InLanes, TreeLanes } from './list-item-tree-lanes';

type FoldProps = {
  parent: NonNullable<TreeRow['parent']>;
  title: string;
};

const foldButton =
  'items-center justify-center rounded-sm web:select-none web:hover:bg-hover';

type FoldButtonProps = FoldProps & { className: string };

// Named after its row, so a screen reader hears which row it folds, and reporting whether that row is open.
function FoldButton(props: FoldButtonProps): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={props.title}
      accessibilityState={{ expanded: props.parent.open }}
      aria-expanded={props.parent.open}
      onPress={props.parent.toggle}
      className={cn(foldButton, props.className)}
    >
      <DisclosureChevron open={props.parent.open} />
    </Pressable>
  );
}

const column = 'absolute inset-y-0 left-0 items-center';

// The rail under the chevron, on the line of its children's rails; a folded parent keeps its room and draws no line.
const railUnderChevron = (lanes: TreeLanes, open: boolean): string =>
  cn('flex-1 self-start', lanes.railGap, open && lanes.rail);

// A parent's chevron folds and unfolds its children; an open parent's rail starts under it.
function FoldColumn({ lanes, ...fold }: InLanes<FoldProps>): ReactElement {
  return (
    <View pointerEvents="box-none" className={cn(column, lanes.column)}>
      <View pointerEvents="none" className={lanes.own.above} />
      <FoldButton {...fold} className={lanes.chevron} />
      <View
        pointerEvents="none"
        className={railUnderChevron(lanes, fold.parent.open)}
      />
    </View>
  );
}

type OwnLaneProps = InLanes<{ tree: TreeRow; title: string }>;

function OwnLaneContent({ tree, title, lanes }: OwnLaneProps): ReactNode {
  if (tree.parent)
    return <FoldColumn parent={tree.parent} title={title} lanes={lanes} />;

  if (tree.depth === 0) return null;

  return <View pointerEvents="none" className={lanes.ownStub} />;
}

// The row's own lane: a parent's chevron and the start of its rail, or the end of the stub from the parent's rail.
export function OwnLane(props: OwnLaneProps): ReactElement {
  return (
    <View
      pointerEvents="box-none"
      className={cn('relative shrink-0', props.lanes.own.box)}
    >
      <OwnLaneContent {...props} />
    </View>
  );
}
