import type { ReactElement } from 'react';
// Phones use native grouped rows; desktop results keep their keyboard and focus drawing.
import { View } from 'react-native';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { ComboboxOptionRow } from './combobox-option';
import type { ResultsProps } from './combobox-results';

export function ComboboxResults<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return (
    <View className="flex-1 bg-content">
      {props.search}
      <Options {...props} />
      {props.message}
      {props.footer}
    </View>
  );
}

function Options<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return (
    <GroupedList>
      <GroupedListSection>
        {props.options.map((option) => (
          <ComboboxOptionRow key={option.value} {...props} option={option} />
        ))}
      </GroupedListSection>
    </GroupedList>
  );
}
