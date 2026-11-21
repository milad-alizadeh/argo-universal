import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import {
  ProgressBar,
  type ProgressBarProps,
} from '#primitives/status/progress-bar';
import { useListLook } from '../../../list-look-context';
import { useTreeRow } from '../../../list-tree';
import type { ListItemProps } from './list-item-props';
import { treeLanes, type TreeLayout } from './list-item-tree-lanes';

/*
 * Paper "SessionsList": a sidebar row's bar runs under its content, 4 above the row's end, on a hairline track.
 * A phone row's step bar runs under its content too, past the 24 leading slot and its
 * 16 gap, 8 above the row's end; a plain bar keeps the row's full width.
 */
const barPlaces = {
  sidebar: 'absolute bottom-1 left-9.5 right-3 flex-row',
  steps: 'absolute bottom-2 left-14 right-4 flex-row wide:left-15 wide:right-5',
  full: 'absolute inset-x-0 bottom-0',
};

type BarPlace = keyof typeof barPlaces;

function barPlace(
  sidebar: boolean | undefined,
  steps: ProgressBarProps['steps'],
): BarPlace {
  if (sidebar) return 'sidebar';

  return steps ? 'steps' : 'full';
}

// The tree layout whose lanes push the row's content, and so its bar, in; a full-width bar ignores the tree.
const barTrees: Record<BarPlace, TreeLayout | undefined> = {
  sidebar: 'sidebar',
  steps: 'row',
  full: undefined,
};

// A drawn tree pushes the row's content in one lane per level; the bar under that content moves in with it.
function useTreeDepth(): number {
  const tree = useTreeRow();
  const { treeDrawn } = useListLook();

  return treeDrawn ? (tree?.depth ?? 0) : 0;
}

function TreeIndent(props: { depth: number; layout: TreeLayout }): ReactNode {
  const { lane } = treeLanes(props.layout, true);

  return Array.from({ length: props.depth }, (_, level) => (
    <View key={level} className={lane} />
  ));
}

export function ItemProgress({
  progress,
  sidebar,
}: Required<Pick<ListItemProps, 'progress'>> &
  Pick<ListItemProps, 'sidebar'>): ReactElement {
  const place = barPlace(sidebar, progress.steps);
  const layout = barTrees[place];
  const depth = useTreeDepth();

  const bar = (
    <ProgressBar {...progress} track={sidebar ? 'hairline' : undefined} />
  );

  if (!layout) return <View className={barPlaces[place]}>{bar}</View>;

  return (
    <View className={barPlaces[place]}>
      <TreeIndent depth={depth} layout={layout} />
      <View className="min-w-0 flex-1">{bar}</View>
    </View>
  );
}
