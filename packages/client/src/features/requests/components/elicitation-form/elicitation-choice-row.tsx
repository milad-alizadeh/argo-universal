import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type { ComponentProps, ReactElement } from 'react';
import { toggledChoice } from './elicitation-answers';
import {
  rowTitle,
  type ElicitationFieldProps,
} from './elicitation-field-props';
import { elicitationChoices } from './elicitation-property';
import type { ElicitationValue } from './elicitation-schema';

// A short known list shows all its options in place; a long one gets a page with a search field.
const inlineLimit = 6;

type ChoiceProps = Omit<
  ComponentProps<typeof FieldGroup.Picker>,
  'value' | 'multiple' | 'onValueChange'
>;

function choiceProps(props: ElicitationFieldProps): ChoiceProps {
  const options = (elicitationChoices(props.property) ?? []).map((choice) => ({
    value: choice.const,
    label: choice.title,
    subtitle: choice.description,
  }));

  const long = options.length > inlineLimit;

  return {
    title: rowTitle(props),
    options,
    presentation: long ? 'page' : 'inline',
    searchable: long,
  };
}

// An unanswered choice matches no option, not even one whose value is the empty string.
const unanswered = '\u0000unanswered';

export const isChoice = (props: ElicitationFieldProps['property']): boolean =>
  elicitationChoices(props) !== undefined;

/*
 * The choice as a Picker. Called, not rendered: a FieldGroup Section opens an inline Picker into one row per option by
 * its element type, so a component around it would hide the options.
 */
export function choicePicker(props: ElicitationFieldProps): ReactElement {
  return props.property.type === 'array' ? (
    multiplePicker(props)
  ) : (
    <FieldGroup.Picker
      key={props.name}
      {...choiceProps(props)}
      value={selectedValues(props.value)[0] ?? unanswered}
      onValueChange={props.onChange}
    />
  );
}

function multiplePicker(props: ElicitationFieldProps): ReactElement {
  const selected = selectedValues(props.value);

  return (
    <FieldGroup.Picker
      key={props.name}
      {...choiceProps(props)}
      multiple
      value={selected}
      onValueChange={(next) => props.onChange(chosenOnly(selected, next))}
    />
  );
}

// The picker reports its whole list; the form keeps toggling one choice at a time.
function chosenOnly(
  before: string[],
  next: readonly string[],
): ElicitationValue {
  const changed = [...before, ...next].find(
    (choice) => before.includes(choice) !== next.includes(choice),
  );

  return changed === undefined
    ? before
    : toggledChoice(before, changed, next.includes(changed));
}

const selectedValues = (value: ElicitationValue | undefined): string[] =>
  Array.isArray(value) ? value : stringList(value);

const stringList = (value: ElicitationValue | undefined): string[] =>
  typeof value === 'string' ? [value] : [];
