import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { List } from '#primitives/lists/list';
import { ComboboxOptionRow } from './combobox-option';
import type { ResultsProps } from './combobox-results';

const maximumHeight = 320;

export function ComboboxChoices<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return <List {...listProps(props)}>{choiceSection(props)}</List>;
}

type ChoiceListProps = Omit<
  React.ComponentProps<typeof List>,
  'items' | 'renderItem' | 'children'
>;

function listProps<Value extends string>(
  props: ResultsProps<Value>,
): ChoiceListProps {
  const web = Platform.OS === 'web';

  return {
    accessibilityRole: 'radiogroup',
    accessibilityLabel: props.label,
    fit: web,
    maxHeight: web ? maximumHeight : undefined,
    appearance: web ? 'plain' : 'grouped',
    empty: props.message,
    endContent: props.message,
    drawDistance: Number.MAX_SAFE_INTEGER,
  };
}

function choiceSection<Value extends string>(
  props: ResultsProps<Value>,
): ReactElement {
  return (
    <List.Section
      selectionMode="single"
      selection={props.value === undefined ? [] : [props.value]}
      onSelectionChange={([id]) => choose(props, id)}
    >
      {props.options.map((option) => (
        <ComboboxOptionRow key={option.value} {...props} option={option} />
      ))}
    </List.Section>
  );
}

function choose<Value extends string>(
  props: ResultsProps<Value>,
  id: string | undefined,
): void {
  const option = props.options.find((entry) => entry.value === id);

  if (!option) return;

  props.onValueChange(option.value);
  props.onClose?.();
}
