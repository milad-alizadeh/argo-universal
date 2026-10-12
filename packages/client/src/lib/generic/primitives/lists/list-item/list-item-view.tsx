import type * as React from 'react';
import { useContext } from 'react';
import { Pressable, View } from 'react-native';
import { FieldRowEnd, useNavigationFields } from '../../fields/field-layout';
import { type ListItemProps, listItemName } from '../../fields/field-props';
import { ListItemBody } from './list-item-content';
import { rowClasses } from './list-item-styles';
import { isModifiedClick } from './web-row-link';

export function ListItem(props: ListItemProps): React.JSX.Element {
  const navigation = useNavigationFields();
  const rowProps = {
    accessibilityLabel: listItemName(props),
    ...selectionProps(props),
    className: rowClasses(props, navigation, useContext(FieldRowEnd)),
  };
  const content = <ListItemBody {...props} />;
  if (!props.onPress)
    return (
      <View {...rowProps} role="group">
        {content}
      </View>
    );
  return (
    <Pressable
      {...linkProps(props)}
      {...rowProps}
      {...triggerProps(props)}
      {...switchKeyboardProps(props, props.onPress)}
      disabled={props.disabled}
    >
      {content}
    </Pressable>
  );
}

function linkProps(
  props: ListItemProps,
): React.ComponentProps<typeof Pressable> & { href?: string } {
  return {
    role: props.role ?? 'link',
    href: rowHref(props),
    onPress: rowPress(props.onPress),
  };
}

function rowPress(
  onPress: ListItemProps['onPress'],
): React.ComponentProps<typeof Pressable>['onPress'] {
  return (event) => {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    onPress?.();
  };
}

function selectionProps(
  props: ListItemProps,
): Pick<
  React.ComponentProps<typeof View>,
  'accessibilityState' | 'aria-checked'
> & { 'aria-current'?: 'page'; 'aria-pressed'?: boolean } {
  return {
    accessibilityState: { disabled: !!props.disabled, checked: props.checked },
    'aria-current': currentPage(props),
    'aria-pressed': props.role === 'button' ? props.selected : undefined,
    'aria-checked': props.checked,
  };
}

function currentPage(props: ListItemProps): 'page' | undefined {
  return !props.role && props.selected ? 'page' : undefined;
}

function triggerProps(props: ListItemProps): React.ComponentProps<
  typeof Pressable
> & {
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
} {
  return {
    ref: props.ref,
    onHoverIn: props.onHoverIn,
    onHoverOut: props.onHoverOut,
    id: props.id,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
  };
}

function rowHref(props: ListItemProps): string | undefined {
  return props.role ? undefined : (props.href ?? '#');
}

// React Native Web handles Space for buttons only; a switch row owns the same activation.
function switchKeyboardProps(
  props: ListItemProps,
  press: () => void,
): {
  tabIndex?: 0 | -1;
  onKeyDown?: React.KeyboardEventHandler;
} {
  if (props.role !== 'switch') return {};
  return {
    tabIndex: props.disabled ? -1 : 0,
    onKeyDown: (event) => {
      if (!isSwitchSpace(event)) return;
      event.preventDefault();
      if (canActivateSwitch(props.disabled, event.repeat)) press();
    },
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
