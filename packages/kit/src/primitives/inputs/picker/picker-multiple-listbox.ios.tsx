// iOS: a List of cards with the system trailing checkmark, inside the drill-in Sheet.
import type { ReactElement } from 'react';
import { List } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import type { ListboxProps } from './picker-multiple-listbox-props';
import { chooseValues } from './picker-multiple-value';
import type { PickerOption } from './picker-props';

export function ChoiceListbox<Value extends string>(
  props: ListboxProps<Value>,
): ReactElement {
  return (
    <List appearance="cards" accessibilityLabel={props.label}>
      <List.Section
        selectionMode="multiple"
        selection={props.value ?? []}
        onSelectionChange={(next) => chooseValues(props, next)}
      >
        {props.shown.map((option) => optionRow(props, option))}
      </List.Section>
    </List>
  );
}

function optionRow<Value extends string>(
  props: ListboxProps<Value>,
  option: PickerOption<Value>,
): ReactElement {
  return (
    <ListItem
      key={option.value}
      id={option.value}
      title={option.label}
      subtitle={option.subtitle}
      disabled={option.disabled || props.disabled}
      accessibilityRole="button"
    />
  );
}
