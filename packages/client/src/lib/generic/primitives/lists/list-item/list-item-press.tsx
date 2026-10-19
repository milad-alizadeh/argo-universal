import { use, type ReactElement, type ComponentProps } from 'react';
import { Platform, Pressable } from 'react-native';
import { usePressRipple } from '#primitives/native/material-palette';
import { ListContext } from '../../../list-context';
import { useInMenu } from '../../../menu-rows-context';
import { usePressedRowHandlers } from '../../../row-highlights';
import { cn } from '../../../utils';
import { linkPress } from './list-item-link-press';
import type { ListItemProps } from './list-item-props';
import { RadioRow } from './list-item-radio';
import { ItemContentSlots } from './list-item-slots';
import { itemPress } from './list-item-styles';
import { useRowFocus } from './use-row-focus';

export type { DrawingProps } from './list-item-press-props';

import type { DrawingProps, RowPressProps } from './list-item-press-props';

function rowLabel(props: ListItemProps): string {
  return [props.title, props.value]
    .filter((value) => value !== undefined)
    .join(', ');
}

// A menu trigger's row (a web Picker row) presses through its pointer handler and popup.
function interactive(props: DrawingProps): boolean {
  if (props.disabled) return false;

  return [
    props.onPress,
    props.href,
    props.onLongPress,
    props.onPointerDown,
    props['aria-haspopup'],
  ].some(Boolean);
}

type RowPlace = Pick<React.ContextType<typeof ListContext>, 'appearance'> & {
  menu: boolean;
};

function pressClass(props: DrawingProps, place: RowPlace): string {
  return cn(
    itemPress({
      ...place,
      interactive: interactive(props),
      control: props.control !== undefined,
    }),
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
  const place = { menu: useInMenu(), appearance: use(ListContext).appearance };

  return {
    ...accessibilityProps(props),
    ...pressHandlers(props),
    onKeyDown:
      props.checked === undefined ? props.onKeyDown : switchKeyDown(props),
    android_ripple: usePressRipple(),
    testID: props.testID,
    ...triggerProps(props),
    ...usePressedRowHandlers(),
    className: pressClass(props, place),
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

export function ItemPress(props: DrawingProps): ReactElement {
  const press = usePressProps(props);
  const focus = useRowFocus();

  if (Platform.OS === 'web' && props.accessibilityRole === 'radio')
    return <RadioRow row={props} className={press.className} />;

  return (
    <Pressable
      {...press}
      {...focus}
      className={cn(press.className, focus.className)}
    >
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
