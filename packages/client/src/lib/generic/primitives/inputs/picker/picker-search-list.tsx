import { LegendList, type LegendListProps } from '@legendapp/list/react-native';
import { createElement, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';
import { TextInput } from '#primitives/inputs/text-input';
import type { PickerOption, PickerProps } from './picker-props';
import { choosePickerOption, pickerOptionsMessage } from './picker-selection';

type SearchProps<Value extends string> = PickerProps<Value> & {
  onClose: () => void;
};

// One list, search field first, so iOS's automatic inset keeps all of it below a transparent sheet header.
export function PickerSearchList<Value extends string>(
  props: SearchProps<Value>,
): React.JSX.Element {
  const [query, setQuery] = useState('');

  return createElement(
    View,
    { className: 'flex-1 bg-card px-4' },
    createElement(LegendList<PickerOption<Value>>, {
      ...searchListProps,
      ...resultProps(props, query),
      ListHeaderComponent: <SearchField {...props} {...{ query, setQuery }} />,
    }),
  );
}

function resultProps<Value extends string>(
  props: SearchProps<Value>,
  query: string,
): Pick<
  LegendListProps<PickerOption<Value>>,
  'data' | 'ListEmptyComponent' | 'renderItem'
> {
  return {
    data: searchResults(props, query),
    ListEmptyComponent: <SearchEmpty {...props} />,
    renderItem: ({ item }) => <SearchOption {...props} option={item} />,
  };
}

const searchListProps = {
  keyExtractor: (option: PickerOption<string>): string => option.value,
  keyboardShouldPersistTaps: 'handled',
  contentInsetAdjustmentBehavior: 'automatic',
} as const;

interface SearchFieldProps {
  label: string;
  query: string;
  setQuery: (text: string) => void;
}

function SearchField(props: SearchFieldProps): React.JSX.Element {
  return (
    <View className="py-3">
      <TextInput
        variant="bare"
        accessibilityLabel={`Search ${props.label}`}
        placeholder="Search"
        value={props.query}
        onChangeText={props.setQuery}
        className="rounded-2xl border-0 bg-muted shadow-none"
      />
    </View>
  );
}

// While loading or after a failure the list stays empty and says why.
function searchResults<Value extends string>(
  props: SearchProps<Value>,
  query: string,
): readonly PickerOption<Value>[] {
  if (pickerOptionsMessage(props)) return [];

  return props.options.filter((option) => matchesQuery(option.label, query));
}

function matchesQuery(label: string, query: string): boolean {
  return label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function SearchEmpty<Value extends string>(
  props: SearchProps<Value>,
): React.JSX.Element {
  const message = pickerOptionsMessage(props);

  return message ? (
    <SearchMessage message={message} failure={!!props.loadError} />
  ) : (
    <Text role="secondary">No matching options</Text>
  );
}

function SearchMessage(props: {
  message: string;
  failure: boolean;
}): React.JSX.Element {
  return (
    <Text accessibilityRole={props.failure ? 'alert' : 'status'}>
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
