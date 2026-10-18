import type { ReactElement, ReactNode, ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { usePressRipple } from '#primitives/native/material-palette';
import { cn } from '../../../utils';
import { Accessory, ItemContent, Leading, Trailing } from './list-item-parts';
import type { ListItemProps } from './list-item-props';
import { RadioPress } from './list-item-radio';
import { itemPress } from './list-item-styles';

export interface DrawingProps extends ListItemProps {
  accessory?: ReactNode;
  checked?: boolean;
  role?: 'link';
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

function rowRole(
  props: DrawingProps,
): 'button' | 'link' | 'switch' | 'radio' | undefined {
  if (props.checked !== undefined) return 'switch';

  return explicitRole(props) ?? pressRole(props.onPress);
}

const explicitRole = (
  props: DrawingProps,
): DrawingProps['role'] | DrawingProps['accessibilityRole'] =>
  props.role ?? props.accessibilityRole;

const pressRole = (onPress: ListItemProps['onPress']): 'button' | undefined =>
  onPress ? 'button' : undefined;

const rowState = (
  props: DrawingProps,
): NonNullable<ComponentProps<typeof Pressable>['accessibilityState']> => ({
  selected: props.selected,
  disabled: props.disabled,
  checked: props.checked,
});

function accessibilityProps(
  props: DrawingProps,
): ComponentProps<typeof Pressable> & { 'aria-pressed'?: boolean } {
  return {
    role: rowRole(props),
    accessibilityLabel: props.accessibilityLabel ?? rowLabel(props),
    accessibilityState: rowState(props),
    'aria-checked': props.checked,
    'aria-pressed': props.selected,
    disabled: props.disabled,
  };
}

function usePressProps(props: DrawingProps): ComponentProps<
  typeof Pressable
> & {
  onKeyDown?: React.KeyboardEventHandler;
} {
  return {
    ...accessibilityProps(props),
    ...pressHandlers(props),
    onKeyDown: props.checked === undefined ? undefined : switchKeyDown(props),
    android_ripple: usePressRipple(),
    testID: props.testID,
    className: pressClass(props.disabled),
  };
}

function isSwitchSpace(event: React.KeyboardEvent): boolean {
  return event.key === ' ' && event.target === event.currentTarget;
}

function canToggle(props: DrawingProps, event: React.KeyboardEvent): boolean {
  return !props.disabled && !event.repeat;
}

const pressRow = (props: DrawingProps): void => props.onPress?.();

function switchKeyDown(props: DrawingProps): React.KeyboardEventHandler {
  return (event) => {
    if (!isSwitchSpace(event)) return;

    event.preventDefault();

    if (canToggle(props, event)) pressRow(props);
  };
}

function ItemContentSlots(props: DrawingProps): ReactElement {
  return (
    <TextClassContext value={undefined}>
      <Leading {...props} />
      <ItemContent {...props} />
      <Trailing {...props} />
      <Accessory>{props.accessory}</Accessory>
    </TextClassContext>
  );
}

export function ItemPress(props: DrawingProps): ReactElement {
  const press = usePressProps(props);

  if (Platform.OS === 'web' && props.accessibilityRole === 'radio')
    return (
      <RadioPress row={props}>
        <ItemContentSlots {...props} />
      </RadioPress>
    );

  return (
    <Pressable {...press}>
      <ItemContentSlots {...props} />
    </Pressable>
  );
}
