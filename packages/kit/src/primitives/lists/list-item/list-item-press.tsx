import { type ReactElement, type ComponentProps } from 'react';
import { Pressable, type KeyDownEvent } from 'react-native';
import type { ContextActions } from '#primitives/actions/action';
import { usePressRipple } from '#primitives/native/material-palette';
import type { SpokenElement } from '#primitives/overlays/menu';
import { useListLook } from '../../../list-look-context';
import { useRowHighlightHandlers } from '../../../row-highlights';
import { cn } from '../../../utils';
import { BesidePress, useBesidePress } from './list-item-beside-press';
import { useContentItemPress } from './list-item-content-selection';
import { linkPress } from './list-item-link-press';
import { interactive, usePressClass } from './list-item-press-class';
import type { ListItemProps } from './list-item-props';
import { RadioRow } from './list-item-radio';
import { ItemContentSlots } from './list-item-slots';
import { useRowFocus } from './use-row-focus';

export type { DrawingProps } from './list-item-press-props';

import type {
  DrawingProps,
  RowKeyDown,
  RowPressProps,
} from './list-item-press-props';

function rowLabel(props: ListItemProps): string {
  return [props.title, props.value]
    .filter((value) => value !== undefined)
    .join(', ');
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
    ...useContentItemPress(props),
    onKeyDown: rowKeyDown(props),
    android_ripple: usePressRipple(),
    testID: props.testID,
    ...triggerProps(props),
    ...useRowHighlightHandlers(hoverHandlers(props), interactive(props)),
    className: usePressClass(props),
  };
}

// The row's own hover handlers; the highlight keeps them and marks the row around them.
function hoverHandlers(props: DrawingProps): RowPressProps {
  return { onHoverIn: props.onHoverIn, onHoverOut: props.onHoverOut };
}

function triggerProps(props: DrawingProps): RowPressProps {
  return {
    onPointerDown: props.onPointerDown,
    ref: props.ref,
    href: props.href,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
  };
}

function isSwitchSpace(event: KeyDownEvent): boolean {
  return event.nativeEvent.key === ' ' && event.target === event.currentTarget;
}

function canToggle(props: DrawingProps, event: KeyDownEvent): boolean {
  return !props.disabled && !event.nativeEvent.repeat;
}

const pressRow = (props: DrawingProps): void => props.onPress?.();

function rowKeyDown(props: DrawingProps): RowKeyDown | undefined {
  return props.checked === undefined ? props.onKeyDown : switchKeyDown(props);
}

function switchKeyDown(props: DrawingProps): RowKeyDown {
  return (event) => {
    if (!isSwitchSpace(event)) return;

    event.preventDefault();

    if (canToggle(props, event)) pressRow(props);
  };
}

// The web draws a radio row as a DOM radio, as its List look says.
const useRadioRow = (props: DrawingProps): boolean =>
  useListLook().domRows && props.accessibilityRole === 'radio';

export function ItemPress(props: DrawingProps): ReactElement {
  const press = usePressProps(props);
  const focused = { ...press, ...useRowFocus() };
  const className = cn(press.className, focused.className);
  const beside = useBesidePress(props);

  if (useRadioRow(props))
    return <RadioRow row={props} className={press.className} />;

  if (beside)
    return <BesidePress props={props} press={{ ...focused, className }} />;

  return (
    <Pressable {...focused} className={className}>
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

type RowMenu = ComponentProps<typeof ContextActions>['menu'];

// The row as its press reads: its name, role, hint and state, such as selected.
const spokenRow = (props: DrawingProps): SpokenElement => ({
  label: spokenRowLabel(props),
  role: rowRole(props),
  hint: props.description,
  state: rowState(props),
});

// The row's context menu meta, with how the row reads, which iOS needs when a page preview hides the row's own press.
export const rowMenu = (props: DrawingProps): RowMenu =>
  props.contextMenu && { ...props.contextMenu, spoken: spokenRow(props) };
