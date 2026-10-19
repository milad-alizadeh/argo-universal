import { useContext, type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ProgressBar } from '#primitives/status/progress-bar';
import { ListContext, type ListPosition } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { InListItem } from '../../../list-item-control-context';
import { SkeletonContent, SkeletonMark } from '../../../list-skeleton';
import { useSeparatorCovered } from '../../../row-highlights';
import { useGroupPosition } from './list-item-group';
import { useSelectedHighlight } from './list-item-highlight';
import { hasLeading } from './list-item-parts';
import { placedContent } from './list-item-placement';
import { ItemPress, type DrawingProps } from './list-item-press';
import type { ListItemProps } from './list-item-props';
import { useItemSelection, ChoiceAccessory } from './list-item-selection';
import { itemSeparator, itemSurface } from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

function ItemSeparator(props: ListItemProps): ReactNode {
  const { appearance, position, highlights, index } = useContext(ListContext);
  const covered = useSeparatorCovered(highlights, index);

  const separator = itemSeparator(appearance, position, hasLeading(props));

  return separator && !covered ? (
    <View className={separator} style={hairline} />
  ) : null;
}

function ItemProgress({
  progress,
}: Pick<ListItemProps, 'progress'>): ReactNode {
  return progress ? (
    <View className="absolute inset-x-0 bottom-0">
      <ProgressBar {...progress} />
    </View>
  ) : null;
}

function Selection({ selected }: Pick<ListItemProps, 'selected'>): ReactNode {
  return selected ? (
    <View
      pointerEvents="none"
      aria-hidden
      className="absolute inset-0 bg-selected"
    />
  ) : null;
}

export function ListItemFrame(props: DrawingProps): ReactElement {
  const list = useContext(ListContext);
  const position = useGroupPosition(props.description);

  return (
    <InListItem value>
      <ListContext value={{ ...list, position }}>
        <ItemSurface {...props} />
      </ListContext>
      <RowFooter description={props.description} position={list.position} />
    </InListItem>
  );
}

const sectionEnds = new Set<ListPosition>(['last', 'only']);

const footerGap = (position: ListPosition): string | undefined =>
  sectionEnds.has(position) ? undefined : 'mb-4';

// A row's description closes its group; a section's gap separates it from the group after it.
function RowFooter(props: {
  description?: string;
  position: ListPosition;
}): ReactNode {
  if (!props.description || Platform.OS === 'android') return null;

  return (
    <View className={footerGap(props.position)}>
      <ListFooter text={props.description} />
    </View>
  );
}

function ItemSurface(props: DrawingProps): ReactElement {
  const { appearance, position } = useContext(ListContext);
  useSelectedHighlight(props.selected);

  return (
    <View className={itemSurface(appearance, position, props)}>
      <ItemPress {...drawingContent(props)} />
      <Selection selected={props.selected} />
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} />
    </View>
  );
}

// A loading row keeps the row's surface, lanes and line heights, with nothing to press or read.
function LoadingItem(props: ListItemProps): ReactElement {
  return (
    <ListItemFrame
      title={props.title}
      leading={props.leading === undefined ? undefined : <SkeletonMark />}
      content={<SkeletonContent {...props} />}
    />
  );
}

// Only a choosing List draws the choice slot; an empty one would hold the trailing lane off the row's edge.
export function ListItem(props: ListItemProps): ReactElement {
  if (props.isLoading) return <LoadingItem {...props} />;

  return <ChoosingItem {...props} />;
}

function ChoosingItem(props: ListItemProps): ReactElement {
  const selected = useItemSelection(props);
  const { selectionMode } = useContext(ListContext);

  const accessory = selectionMode ? (
    <ChoiceAccessory {...selected} />
  ) : undefined;

  return <ListItemFrame {...selected} accessory={accessory} />;
}

function drawingContent(props: DrawingProps): DrawingProps {
  return {
    ...placedContent(props),
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
