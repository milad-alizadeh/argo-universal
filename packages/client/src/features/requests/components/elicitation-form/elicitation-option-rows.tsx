import type { ElicitationEnumOption } from '@repo/contracts';
import { List } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { ReactElement } from 'react';

export type OptionRowsProps = {
  options: readonly ElicitationEnumOption[];
  selected: readonly string[];
  multiple: boolean;
  disabled: boolean;
  onToggle: (choice: string, checked: boolean) => void;
};

export function OptionRows(props: OptionRowsProps): ReactElement {
  return (
    <List.Section
      selectionMode={props.multiple ? 'multiple' : 'single'}
      selection={props.selected}
      onSelectionChange={(next) => chooseOption(props, next)}
    >
      {optionItems(props)}
    </List.Section>
  );
}

function chooseOption(props: OptionRowsProps, next: readonly string[]): void {
  const changed = props.options.find((option) =>
    props.multiple
      ? props.selected.includes(option.const) !== next.includes(option.const)
      : next.includes(option.const),
  );

  if (changed) props.onToggle(changed.const, next.includes(changed.const));
}

function optionItems(props: OptionRowsProps): ReactElement[] {
  return props.options.map((option) => (
    <ListItem
      key={option.const}
      id={option.const}
      title={option.title}
      subtitle={option.description}
      disabled={props.disabled}
    />
  ));
}
