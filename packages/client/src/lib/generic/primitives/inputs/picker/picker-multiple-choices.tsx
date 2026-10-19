import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ComboboxSearch } from '#primitives/inputs/combobox';
import { drillInLimit } from './picker-drill-in';
import { ChoiceListbox } from './picker-multiple-listbox';
import type { MultiplePickerProps, PickerOption } from './picker-props';
import { pickerOptionsMessage } from './picker-selection';

// Choices toggle in place, so the list stays open until dismissed.
export function Choices<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const message = pickerOptionsMessage(props);

  if (message)
    return <OptionsMessage message={message} failure={!!props.loadError} />;

  return <ChoiceList {...props} />;
}

function ChoiceList<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const [query, setQuery] = useState('');

  return (
    <View className="flex-1 bg-content wide:gap-1 wide:bg-transparent wide:p-1">
      {props.options.length > drillInLimit ? (
        <Search label={props.label} value={query} onChangeText={setQuery} />
      ) : null}
      <ChoiceListbox {...props} shown={matching(props.options, query)} />
    </View>
  );
}

function Search(props: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
}): ReactElement {
  return (
    <View className="px-4 py-3 wide:p-0">
      <ComboboxSearch
        {...props}
        label={`Search ${props.label}`}
        placeholder="Search"
      />
    </View>
  );
}

function matching<Value extends string>(
  options: readonly PickerOption<Value>[],
  query: string,
): readonly PickerOption<Value>[] {
  const text = query.trim().toLocaleLowerCase();

  return options.filter((option) =>
    `${option.label} ${option.subtitle ?? ''}`
      .toLocaleLowerCase()
      .includes(text),
  );
}

function OptionsMessage(props: {
  message: string;
  failure: boolean;
}): ReactElement {
  return (
    <Text
      role="secondary"
      accessibilityRole={props.failure ? 'alert' : 'status'}
      className="px-4 py-3"
    >
      {props.message}
    </Text>
  );
}
