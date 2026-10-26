import type { ReactElement } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';

type ChoicesProps = {
  title: string;
  choices: readonly string[];
  value: string;
  onPick: (next: string) => void;
};

// A drill's choices as the FieldGroup's inline picker draws them: one field row each, a mark on the chosen one.
export function Choices(props: ChoicesProps): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        <FieldGroup.Picker
          title={props.title}
          presentation="inline"
          value={props.value}
          options={options(props.choices)}
          onValueChange={props.onPick}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

const options = (
  choices: readonly string[],
): { value: string; label: string }[] =>
  choices.map((choice) => ({ value: choice, label: choice }));
