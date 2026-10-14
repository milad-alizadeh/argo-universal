import type * as React from 'react';
import type { Pressable, View } from 'react-native';
import type { GroupedListItemProps } from './grouped-list-item-props';
import { isModifiedClick } from './web-row-link';

export function interactionProps(
  item: GroupedListItemProps,
  press: () => void,
): ReturnType<typeof triggerProps> &
  ReturnType<typeof switchKeyboardProps> & { disabled: boolean | undefined } {
  return {
    ...triggerProps(item),
    ...switchKeyboardProps(item, press),
    disabled: item.disabled,
  };
}

export function linkProps(
  props: GroupedListItemProps,
): React.ComponentProps<typeof Pressable> & { href?: string } {
  return {
    role: props.accessibilityRole ?? 'link',
    href: rowHref(props),
    onPress: rowPress(props.onPress),
  };
}

function rowPress(
  onPress: GroupedListItemProps['onPress'],
): React.ComponentProps<typeof Pressable>['onPress'] {
  return (event) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    onPress?.();
  };
}

export function selectionProps(
  props: GroupedListItemProps,
): Pick<
  React.ComponentProps<typeof View>,
  'accessibilityState' | 'aria-checked'
> & { 'aria-current'?: 'page'; 'aria-pressed'?: boolean } {
  return {
    accessibilityState: { disabled: !!props.disabled, checked: props.checked },
    'aria-current': currentPage(props),
    'aria-pressed': props.accessibilityRole === 'button' ? props.selected : undefined,
    'aria-checked': props.checked,
  };
}

function currentPage(props: GroupedListItemProps): 'page' | undefined {
  return !props.accessibilityRole && props.selected ? 'page' : undefined;
}

function triggerProps(props: GroupedListItemProps): React.ComponentProps<
  typeof Pressable
> & {
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
} {
  return {
    ...hoverProps(props),
    ref: props.ref,
    id: props.id,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
  };
}

function hoverProps(
  props: GroupedListItemProps,
): Pick<React.ComponentProps<typeof Pressable>, 'onHoverIn' | 'onHoverOut'> {
  return { onHoverIn: props.onHoverIn, onHoverOut: props.onHoverOut };
}

function rowHref(props: GroupedListItemProps): string | undefined {
  return props.accessibilityRole ? undefined : (props.href ?? '#');
}

interface SwitchKeyboardProps {
  tabIndex?: 0 | -1;
  onKeyDown?: React.KeyboardEventHandler;
}

// React Native Web handles Space for buttons only; a switch row owns the same activation.
function switchKeyboardProps(
  props: GroupedListItemProps,
  press: () => void,
): SwitchKeyboardProps {
  if (props.accessibilityRole !== 'switch') return {};

  return {
    tabIndex: props.disabled ? -1 : 0,
    onKeyDown: switchKeyDown(props.disabled, press),
  };
}

function switchKeyDown(
  disabled: boolean | undefined,
  press: () => void,
): React.KeyboardEventHandler {
  return (event) => {
    if (!isSwitchSpace(event)) return;
    event.preventDefault();

    if (canActivateSwitch(disabled, event.repeat)) press();
  };
}

function isSwitchSpace(event: React.KeyboardEvent): boolean {
  return event.key === ' ' && event.target === event.currentTarget;
}

function canActivateSwitch(
  disabled: boolean | undefined,
  repeat: boolean,
): boolean {
  return !disabled && !repeat;
}
