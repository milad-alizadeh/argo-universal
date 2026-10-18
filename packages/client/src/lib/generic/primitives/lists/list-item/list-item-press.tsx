import type { ReactElement, ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';
import { TextClassContext } from '#primitives/content/text';
import { usePressRipple } from '#primitives/native/material-palette';
import { cn } from '../../../utils';
import { linkPress } from './list-item-link-press';
import { Accessory, ItemContent, Leading, Trailing } from './list-item-parts';
import type { ListItemProps } from './list-item-props';
import { RadioPress } from './list-item-radio';
import { itemPress } from './list-item-styles';

export type { DrawingProps } from './list-item-press-props';

import type { DrawingProps, RowPressProps } from './list-item-press-props';

function rowLabel(props: ListItemProps): string {
  return [props.title, props.value]
    .filter((value) => value !== undefined)
    .join(', ');
}

function pressClass(props: DrawingProps): string {
  return cn(
    itemPress,
    props.labelPlacement === 'above' &&
      'flex-col gap-1 px-0 py-0 wide:px-0 web:hover:bg-transparent active:bg-transparent',
    props.disabled && 'opacity-50',
  );
}

function pressHandlers(props: ListItemProps): RowPressProps {
  return {
    onPress: props.href ? linkPress(props) : props.onPress,
    onLongPress: props.onLongPress,
  };
}

function rowRole(
  props: DrawingProps,
): 'button' | 'link' | 'switch' | 'radio' | 'group' | undefined {
  if (props.checked !== undefined) return 'switch';

  return explicitRole(props) ?? pressRole(props.onPress);
}

const explicitRole = (
  props: DrawingProps,
): DrawingProps['role'] | DrawingProps['accessibilityRole'] =>
  props.role ?? props.accessibilityRole;

const pressRole = (onPress: ListItemProps['onPress']): 'button' | 'group' =>
  onPress ? 'button' : 'group';

const rowState = (
  props: DrawingProps,
): NonNullable<ComponentProps<typeof Pressable>['accessibilityState']> => ({
  selected: props.selected,
  disabled: props.disabled,
  checked: props.checked,
});

function accessibilityProps(props: DrawingProps): RowPressProps {
  return {
    role: rowRole(props),
    ...focusProps(props),
    accessibilityState: rowState(props),
    accessibilityHint: props.description,
    'aria-checked': props.checked,
    'aria-pressed': props.selected,
    'aria-current': currentPage(props),
    accessible: props.accessible ?? props.content === undefined,
    disabled: props.disabled,
  };
}

function usePressProps(props: DrawingProps): RowPressProps {
  return {
    ...accessibilityProps(props),
    ...pressHandlers(props),
    onKeyDown:
      props.checked === undefined ? props.onKeyDown : switchKeyDown(props),
    android_ripple: usePressRipple(),
    testID: props.testID,
    ...triggerProps(props),
    className: pressClass(props),
  };
}

function triggerProps(props: DrawingProps): RowPressProps {
  return {
    onPointerDown: props.onPointerDown,
    onHoverIn: props.onHoverIn,
    onHoverOut: props.onHoverOut,
    ref: props.ref,
    href: props.href,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
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
      {props.content ?? <ItemContent {...props} />}
      <Trailing {...props} />
      {props.labelPlacement ? null : <Accessory>{props.accessory}</Accessory>}
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

function currentPage(props: DrawingProps): 'page' | undefined {
  return props.selected && rowRole(props) === 'link' ? 'page' : undefined;
}

function focusProps(props: DrawingProps): RowPressProps {
  return {
    accessibilityLabel: spokenRowLabel(props),
    tabIndex: rowRole(props) === 'group' ? -1 : undefined,
  };
}

function spokenRowLabel(props: DrawingProps): string | undefined {
  return props.content === undefined
    ? (props.accessibilityLabel ?? rowLabel(props))
    : undefined;
}
