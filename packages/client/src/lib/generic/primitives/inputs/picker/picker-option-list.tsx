import type * as React from 'react';
import { createElement } from 'react';
import { Platform, View } from 'react-native';
import { listTestIdProps } from '#lib/generic/list-test-id';
import { ScrollFadeList } from '#lib/generic/scroll-fade/index';
import { PickerActionRow, PickerOptionRow } from './picker-option-row';
import {
  LoadingMessage,
  OptionsMessage,
  optionsMessage,
} from './picker-options-message';
import type {
  ComboboxFooterAction,
  PickerOption,
  PickerOptionAction,
} from './picker-props';

const listMaximumHeight = 320;

const rowEstimate = 44;

const web = Platform.OS === 'web';

export type PickerOptionListProps<Value extends string> = {
  label: string;
  value?: Value;
  options: readonly PickerOption<Value>[];
  wide: boolean;
  onChoose: (option: PickerOption<Value>) => void;
  // The row Enter would choose.
  activeValue?: Value;
  loading?: boolean;
  loadingLabel?: string;
  loadError?: string;
  // Shown when there is no option to list.
  emptyLabel?: string;
  footerAction?: ComboboxFooterAction;
};

type Row<Value extends string> =
  | { kind: 'option'; key: string; option: PickerOption<Value> }
  | { kind: 'action'; key: string; action: PickerOptionAction };

// Each option, with the step it offers right under it.
function listRows<Value extends string>(
  options: readonly PickerOption<Value>[],
): Row<Value>[] {
  return options.flatMap((option): Row<Value>[] => {
    const row: Row<Value> = { kind: 'option', key: option.value, option };

    if (!option.action) return [row];

    return [
      row,
      { kind: 'action', key: `${option.value}:action`, action: option.action },
    ];
  });
}

// A Picker's options as flat rows, or why there are none, with an optional action after them.
export function PickerOptionList<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  return createElement(
    View,
    { className: web ? 'gap-1' : 'flex-1 gap-1' },
    <OptionsOrMessage {...props} />,
    <FooterAction action={props.footerAction} wide={props.wide} />,
  );
}

function FooterAction(props: {
  action?: ComboboxFooterAction;
  wide: boolean;
}): React.JSX.Element | null {
  const { action } = props;

  if (!action) return null;

  return (
    <PickerActionRow
      action={{ ...action, accessibilityLabel: action.label }}
      icon={action.icon}
      wide={props.wide}
    />
  );
}

function OptionsOrMessage<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  if (props.loading)
    return <LoadingMessage label={props.label} message={props.loadingLabel} />;
  const message = optionsMessage(props);

  if (message !== undefined)
    return <OptionsMessage message={message} failure={!!props.loadError} />;

  return <Options {...props} />;
}

type ListProps<Value extends string> = React.ComponentProps<
  typeof ScrollFadeList<Row<Value>>
>;

const listPresentation = {
  estimatedItemSize: rowEstimate,
  surfaceClassName: 'bg-content',
  maxHeight: web ? listMaximumHeight : undefined,
};

function Options<Value extends string>(
  props: PickerOptionListProps<Value>,
): React.JSX.Element {
  return <ScrollFadeList<Row<Value>> {...optionListProps(props)} />;
}

function optionListProps<Value extends string>(
  props: PickerOptionListProps<Value>,
): ListProps<Value> {
  return {
    ...listTestIdProps(`picker-options-${props.label.toLowerCase()}`),
    ...listPresentation,
    data: listRows(props.options),
    keyExtractor: (row) => row.key,
    extraData: `${props.value}:${props.activeValue}`,
    renderItem: ({ item }) => <ListRow {...props} row={item} />,
  };
}

function ListRow<Value extends string>(
  props: PickerOptionListProps<Value> & { row: Row<Value> },
): React.JSX.Element {
  const { row } = props;

  if (row.kind === 'action')
    return <PickerActionRow action={row.action} wide={props.wide} />;

  return <OptionRow {...props} option={row.option} />;
}

function OptionRow<Value extends string>(
  props: PickerOptionListProps<Value> & { option: PickerOption<Value> },
): React.JSX.Element {
  const { option } = props;

  return (
    <PickerOptionRow
      option={option}
      selected={option.value === props.value}
      active={option.value === props.activeValue}
      wide={props.wide}
      onChoose={() => props.onChoose(option)}
    />
  );
}
