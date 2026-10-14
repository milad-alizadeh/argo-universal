import type * as React from 'react';
import { createElement } from 'react';
import { Pressable, View } from 'react-native';
import { Icon, IconSlot } from '#primitives/display/icon';
import { SelectedCheck } from '#primitives/display/selected-check';
import { Text } from '#primitives/display/text';
import type { IconName } from '../../../symbols/icon-names';
import { cn } from '../../../utils';
import type { PickerOption, PickerOptionAction } from './picker-props';

/*
 * One option in a Picker's list. A wide window draws the popover's flat rows with the check leading,
 * so labels stay aligned; a phone sheet marks the chosen row with a flat tint and a trailing check.
 */
export type PickerOptionRowProps<Value extends string> = {
  option: PickerOption<Value>;
  selected: boolean;
  // The row Enter would choose, such as the first match while searching.
  active?: boolean;
  wide: boolean;
  onChoose: () => void;
};

export function PickerOptionRow<Value extends string>(
  props: PickerOptionRowProps<Value>,
): React.JSX.Element {
  return createElement(
    Pressable,
    optionPressProps(props),
    <LeadingCheck wide={props.wide} selected={props.selected} />,
    <OptionIcon name={props.option.icon} />,
    <OptionText option={props.option} />,
    <TrailingCheck wide={props.wide} selected={props.selected} />,
  );
}

// A chosen option reads as a pressed button, as a GroupedListItem's does.
function optionPressProps<Value extends string>(
  props: PickerOptionRowProps<Value>,
): React.ComponentProps<typeof Pressable> & { 'aria-pressed': boolean } {
  const { option, selected } = props;
  const disabled = !!option.disabled;

  return {
    role: 'button',
    accessibilityLabel: option.accessibilityLabel ?? option.label,
    accessibilityState: { selected, disabled },
    'aria-pressed': selected,
    disabled,
    onPress: props.onChoose,
    className: rowClassName({ ...props, disabled }),
  };
}

type RowState = {
  wide: boolean;
  selected?: boolean;
  active?: boolean;
  disabled?: boolean;
};

const rowBase =
  'min-h-11 flex-row items-center gap-2 rounded-xl px-2 py-1.5 active:bg-hover web:hover:bg-hover web:focus-visible:bg-hover web:outline-none';

// A phone row is taller and tints when chosen; a popover row marks the choice with its check alone.
function sheetRowClassName(state: RowState): string | undefined {
  if (state.wide) return undefined;

  return cn('min-h-14 gap-3 px-3 py-2', { 'bg-selected': state.selected });
}

function rowClassName(state: RowState): string {
  return cn(rowBase, sheetRowClassName(state), {
    'bg-hover': state.active,
    'opacity-50': state.disabled,
  });
}

type CheckProps = { wide: boolean; selected: boolean };

function LeadingCheck(props: CheckProps): React.JSX.Element | null {
  if (!props.wide) return null;

  return (
    <IconSlot role="control">{props.selected && <SelectedCheck />}</IconSlot>
  );
}

function TrailingCheck(props: CheckProps): React.JSX.Element | null {
  if (props.wide || !props.selected) return null;

  return <SelectedCheck role="body" />;
}

function OptionIcon(props: { name?: IconName }): React.JSX.Element | null {
  if (!props.name) return null;

  return <Icon name={props.name} role="body" tone="muted" aria-hidden />;
}

function OptionText<Value extends string>(props: {
  option: PickerOption<Value>;
}): React.JSX.Element {
  return createElement(
    View,
    { className: 'min-w-0 flex-1' },
    <Text numberOfLines={1}>{props.option.label}</Text>,
    <SupportingText option={props.option} />,
  );
}

function SupportingText<Value extends string>(props: {
  option: PickerOption<Value>;
}): React.JSX.Element | null {
  const { supporting, supportingCode } = props.option;

  if (!supporting) return null;

  return (
    <Text
      role={supportingCode ? 'code' : 'secondary'}
      tone="muted"
      numberOfLines={1}
    >
      {supporting}
    </Text>
  );
}

type ActionRowProps = {
  action: PickerOptionAction;
  wide: boolean;
  // An icon leads a footer action, such as "Add a Project"; an option's own step draws in the tint.
  icon?: IconName;
};

// The option's own next step, such as installing an Agent, drawn as an action under it.
export function PickerActionRow(props: ActionRowProps): React.JSX.Element {
  return createElement(
    Pressable,
    actionPressProps(props),
    <ActionLeading {...props} />,
    <Text tone={props.icon ? undefined : 'accent'}>{props.action.label}</Text>,
  );
}

function actionPressProps(
  props: ActionRowProps,
): React.ComponentProps<typeof Pressable> {
  return {
    role: 'button',
    accessibilityLabel: props.action.accessibilityLabel,
    onPress: props.action.onPress,
    className: rowClassName({ wide: props.wide }),
  };
}

function ActionLeading(props: ActionRowProps): React.JSX.Element | null {
  if (props.icon) return <Icon name={props.icon} role="body" aria-hidden />;

  return props.wide ? <IconSlot role="control" /> : null;
}
