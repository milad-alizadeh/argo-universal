import { LegendList } from '@legendapp/list/react-native';
import { createElement, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '../../../symbols/icon';
import { Text } from '../../display/text/text';
import { Input } from '../input/input';
import type { PickerOption, PickerProps } from './picker-props';
import { choosePickerOption, pickerOptionsMessage } from './picker-selection';

type SearchProps<Value extends string> = PickerProps<Value> & {
  onClose: () => void;
};

export function PickerSearchList<Value extends string>(
  props: SearchProps<Value>,
): React.JSX.Element {
  const [query, setQuery] = useState('');
  const options = props.options.filter((option) =>
    matchesQuery(option.label, query),
  );
  return createElement(
    View,
    { className: 'flex-1 gap-3 bg-popover px-4 pt-3' },
    <Input {...searchInputProps(props.label, query, setQuery)} />,
    <SearchResults picker={props} options={options} />,
  );
}

function matchesQuery(label: string, query: string): boolean {
  return label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function searchInputProps(
  label: string,
  value: string,
  onChangeText: (text: string) => void,
): React.ComponentProps<typeof Input> {
  return {
    accessibilityLabel: `Search ${label}`,
    placeholder: 'Search',
    value,
    onChangeText,
    className: 'rounded-2xl border-0 bg-muted shadow-none',
  };
}

function SearchResults<Value extends string>(props: {
  picker: SearchProps<Value>;
  options: readonly PickerOption<Value>[];
}): React.JSX.Element {
  const message = pickerOptionsMessage(props.picker);
  return message ? (
    <SearchMessage message={message} failure={!!props.picker.error} />
  ) : (
    <SearchChoices {...props} />
  );
}

function SearchChoices<Value extends string>(props: {
  picker: SearchProps<Value>;
  options: readonly PickerOption<Value>[];
}): React.JSX.Element {
  return createElement(LegendList<PickerOption<Value>>, {
    data: props.options,
    keyExtractor: (option) => option.value,
    keyboardShouldPersistTaps: 'handled',
    ListEmptyComponent: <Text role="secondary">No matching options</Text>,
    renderItem: ({ item }) => <SearchOption {...props.picker} option={item} />,
  });
}

function SearchMessage(props: {
  message: string;
  failure: boolean;
}): React.JSX.Element {
  return (
    <Text semanticRole={props.failure ? 'alert' : 'status'}>
      {props.message}
    </Text>
  );
}

function SearchOption<Value extends string>(
  props: SearchProps<Value> & { option: PickerOption<Value> },
): React.JSX.Element {
  return createElement(
    Pressable,
    searchOptionProps(props),
    <OptionLabel option={props.option} />,
    props.option.value === props.value && (
      <Icon name="check" role="body" aria-hidden />
    ),
  );
}

function searchOptionProps<Value extends string>(
  props: SearchProps<Value> & { option: PickerOption<Value> },
): React.ComponentProps<typeof Pressable> {
  return {
    role: 'radio',
    accessibilityLabel: props.option.label,
    ...searchOptionState(props),
    onPress: () => commitSearchOption(props),
    className: 'min-h-14 flex-row items-center gap-3 py-3',
  };
}

function searchOptionState<Value extends string>(
  props: SearchProps<Value> & { option: PickerOption<Value> },
): React.ComponentProps<typeof Pressable> {
  const checked = props.option.value === props.value;
  return {
    'aria-checked': checked,
    accessibilityState: { checked, disabled: props.option.disabled },
    disabled: props.option.disabled,
  };
}

function commitSearchOption<Value extends string>(
  props: SearchProps<Value> & { option: PickerOption<Value> },
): void {
  choosePickerOption(props, props.option.value);
  props.onClose();
}

function OptionLabel<Value extends string>(props: {
  option: PickerOption<Value>;
}): React.JSX.Element {
  return createElement(
    View,
    { className: 'flex-1 gap-1' },
    <Text>{props.option.label}</Text>,
    props.option.supportingText && (
      <Text role="secondary">{props.option.supportingText}</Text>
    ),
  );
}
