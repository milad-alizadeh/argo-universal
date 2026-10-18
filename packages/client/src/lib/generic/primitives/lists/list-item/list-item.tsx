import {
  useContext,
  type ReactElement,
  type ReactNode,
  type ComponentProps,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { usePressRipple } from '#primitives/native/material-palette';
import { ProgressBar } from '#primitives/status/progress-bar';
import { ListContext } from '../../../list-context';
import { cn } from '../../../utils';
import {
  hasLeading,
  Accessory,
  ItemContent,
  Leading,
  Trailing,
} from './list-item-parts';
import type { ListItemProps } from './list-item-props';
import { itemPress, itemSeparator, itemSurface } from './list-item-styles';

const hairline = { height: StyleSheet.hairlineWidth };

interface DrawingProps extends ListItemProps {
  accessory?: ReactNode;
}

function rowLabel(props: ListItemProps): string {
  return [props.title, props.value]
    .filter((value) => value !== undefined)
    .join(', ');
}

function pressClass(disabled?: boolean): string {
  return cn(itemPress, disabled && 'opacity-50');
}

const pressHandlers = ({
  onPress,
  onLongPress,
}: ListItemProps): Pick<ListItemProps, 'onPress' | 'onLongPress'> => ({
  onPress,
  onLongPress,
});

function usePressProps(
  props: ListItemProps,
): ComponentProps<typeof Pressable> & { 'aria-pressed'?: boolean } {
  return {
    role: props.onPress ? 'button' : undefined,
    accessibilityLabel: props.accessibilityLabel ?? rowLabel(props),
    accessibilityState: { selected: props.selected, disabled: props.disabled },
    'aria-pressed': props.selected,
    disabled: props.disabled,
    ...pressHandlers(props),
    android_ripple: usePressRipple(),
    testID: props.testID,
    className: pressClass(props.disabled),
  };
}

function ItemPress(props: DrawingProps): ReactElement {
  return (
    <Pressable {...usePressProps(props)}>
      <TextClassContext value={undefined}>
        <Leading {...props} />
        <ItemContent {...props} />
        <Trailing {...props} />
        <Accessory>{props.accessory}</Accessory>
      </TextClassContext>
    </Pressable>
  );
}

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

export function ListItemFrame(props: DrawingProps): ReactElement {
  const { appearance, position } = useContext(ListContext);

  return (
    <View className={itemSurface(appearance, position, props.selected)}>
      <ItemPress {...props} />
      <ItemSeparator {...props} />
      <ItemProgress progress={props.progress} />
    </View>
  );
}

export function ListItem(props: ListItemProps): ReactElement {
  return <ListItemFrame {...props} />;
}
