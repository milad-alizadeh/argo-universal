import { useState, type ReactElement } from 'react';
import { View } from 'react-native';
import { wideMenuInsetClassName } from '#lib/generic/menu-surface';
import { cn } from '#lib/generic/utils';
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

// A phone sheet's page fill; wide, the popover's card and inset.
const choiceListClassName = cn(
  'flex-1 bg-content wide:gap-2 wide:bg-transparent',
  wideMenuInsetClassName,
);

function ChoiceList<Value extends string>(
  props: MultiplePickerProps<Value>,
): ReactElement {
  const [query, setQuery] = useState('');

  return (
    <View className={choiceListClassName}>
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
    <View className="px-4 py-3 wide:px-0 wide:py-1">
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
