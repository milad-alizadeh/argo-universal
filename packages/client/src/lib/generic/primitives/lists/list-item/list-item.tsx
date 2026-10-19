import { useContext, type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ProgressBar } from '#primitives/status/progress-bar';
import { ListContext } from '../../../list-context';
import { ListFooter } from '../../../list-footer';
import { InListItem } from '../../../list-item-control-context';
import { useInMenu } from '../../../menu-rows-context';
import { hasLeading } from './list-item-parts';
import { placedContent } from './list-item-placement';
import { ItemPress, type DrawingProps } from './list-item-press';
import type { ListItemProps } from './list-item-props';
import {
  useItemSelection,
  ChoiceAccessory,
  ChoiceSlot,
} from './list-item-selection';
import {
  itemSeparator,
  itemSurface,
  type ItemDrawing,
} from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

function useItemDrawing(): ItemDrawing {
  const { appearance, position } = useContext(ListContext);

  return { appearance, position, menu: useInMenu() };
}

function ItemSeparator(props: ListItemProps): ReactNode {
  const separator = itemSeparator(useItemDrawing(), hasLeading(props));

  return separator ? <View className={separator} style={hairline} /> : null;
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
  return (
    <InListItem value>
      <ItemSurface {...props} />
      {props.description && Platform.OS !== 'android' ? (
        <ListFooter text={props.description} />
      ) : null}
    </InListItem>
  );
}

function ItemSurface(props: DrawingProps): ReactElement {
  return (
    <View className={itemSurface(useItemDrawing(), props.selected)}>
      <ItemPress {...drawingContent(props)} />
      <Selection selected={props.selected} />
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} />
    </View>
  );
}

// A menu row's check leads the row, as in Paper's Combobox; elsewhere it trails.
export function ListItem(props: ListItemProps): ReactElement {
  const selected = useItemSelection(props);
  const menu = useInMenu();

  return (
    <ListItemFrame
      {...selected}
      choice={menu ? <ChoiceSlot {...selected} /> : undefined}
      accessory={menu ? undefined : <ChoiceAccessory {...selected} />}
    />
  );
}

function drawingContent(props: DrawingProps): DrawingProps {
  return {
    ...placedContent(props),
    accessibilityLabel:
      props.accessibilityLabel ??
      [props.title, props.value].filter(Boolean).join(', '),
  };
}
