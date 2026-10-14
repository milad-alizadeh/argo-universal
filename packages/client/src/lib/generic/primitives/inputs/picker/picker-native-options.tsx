import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { PickerOption, PickerOptionAction } from './picker-props';

type ItemProps = React.ComponentProps<typeof GroupedListItem>;

/*
 * A Picker's options as the phone's own list rows: each a choice the platform marks (iOS a
 * checkmark on the chosen row, Android a RadioButton on every row), its next step under it.
 */
export function NativeOptionRows<Value extends string>(props: {
  options: readonly PickerOption<Value>[];
  value?: Value;
  onChoose: (option: PickerOption<Value>) => void;
}): React.JSX.Element {
  return <>{props.options.map((option) => nativeOption(props, option))}</>;
}

function nativeOption<Value extends string>(
  props: { value?: Value; onChoose: (option: PickerOption<Value>) => void },
  option: PickerOption<Value>,
): React.JSX.Element {
  return (
    <NativeOption
      key={option.value}
      option={option}
      selected={option.value === props.value}
      onChoose={() => props.onChoose(option)}
    />
  );
}

type OptionProps<Value extends string> = {
  option: PickerOption<Value>;
  selected: boolean;
  onChoose: () => void;
};

function NativeOption<Value extends string>(
  props: OptionProps<Value>,
): React.JSX.Element {
  return (
    <>
      <GroupedListItem {...optionRowProps(props)} />
      <NativeActionRow action={props.option.action} />
    </>
  );
}

const choiceRow = {
  accessibilityRole: 'button',
  disclosure: false,
  choice: true,
} as const;

function optionRowProps<Value extends string>(
  props: OptionProps<Value>,
): ItemProps {
  const { option } = props;

  return {
    ...choiceRow,
    label: option.label,
    accessibilityLabel: option.accessibilityLabel,
    subtitle: optionSubtitle(option),
    icon: option.icon,
    disabled: option.disabled,
    selected: props.selected,
    onPress: props.onChoose,
  };
}

function optionSubtitle(option: PickerOption<string>): ItemProps['subtitle'] {
  if (!option.supporting) return undefined;

  return { text: option.supporting, code: option.supportingCode };
}

const actionRow = { accessibilityRole: 'button', tone: 'accent' } as const;

// A row in the tint that runs a step, such as signing in to an Agent or adding a Project.
export function NativeActionRow(props: {
  action?: PickerOptionAction & { icon?: ItemProps['icon'] };
}): React.JSX.Element | null {
  const { action } = props;

  if (!action) return null;

  return <GroupedListItem {...actionRow} {...action} />;
}
