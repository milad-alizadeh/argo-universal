import { useContext, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { ProgressBar } from '#primitives/status/progress-bar';
import { ListContext } from '../../../list-context';
import { hasLeading } from './list-item-parts';
import { ItemPress, type DrawingProps } from './list-item-press';
import type { ListItemProps } from './list-item-props';
import { itemSeparator, itemSurface } from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

function ItemSeparator(props: ListItemProps): ReactNode {
  const { appearance, position } = useContext(ListContext);

  const separator = itemSeparator(appearance, position, hasLeading(props));

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
  const { appearance, position } = useContext(ListContext);

  return (
    <View className={itemSurface(appearance, position, props.selected)}>
      <ItemPress {...props} />
      <Selection selected={props.selected} />
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} />
    </View>
  );
}

export function ListItem(props: ListItemProps): ReactElement {
  const { selectionMode } = useContext(ListContext);

  return (
    <ListItemFrame
      {...props}
      accessory={
        selectionMode === 'single' && props.selected ? (
          <Icon name="check" role="row" />
        ) : undefined
      }
    />
  );
}
