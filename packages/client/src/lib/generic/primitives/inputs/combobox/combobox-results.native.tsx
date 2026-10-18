import type { ReactElement } from 'react';
// Phones use native grouped rows; desktop results keep their keyboard and focus drawing.
import { View } from 'react-native';
import { ComboboxChoices } from './combobox-choices';
import type { ResultsProps } from './combobox-results';

export function ComboboxResults<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return (
    <View className="flex-1 bg-content">
      {props.search}
      <ComboboxChoices {...props} />
      {props.footer}
    </View>
  );
}
