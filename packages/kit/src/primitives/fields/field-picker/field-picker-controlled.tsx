import { useState, type ReactElement } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import type { FieldPickerProps } from './field-picker-model';
import { FieldPicker } from './field-picker-switch';

// A story's picker keeps its own value, so a choice shows on the row, and passes each choice on to its spy.
function useControlled(props: FieldPickerProps): FieldPickerProps {
  const [value, setValue] = useState(props.value);

  return {
    ...props,
    value,
    onValueChange: (next) => {
      setValue(next);
      props.onValueChange(next);
    },
  };
}

export function ControlledPicker(props: FieldPickerProps): ReactElement {
  return <FieldPicker {...useControlled(props)} />;
}

/*
 * The same, as the one picker of a FieldGroup section. A Section opens an inline picker into rows only when the
 * picker is its direct child, so this draws the section itself instead of a story decorator wrapping a component.
 */
export function ControlledSection(props: FieldPickerProps): ReactElement {
  return (
    <FieldGroup>
      <FieldGroup.Section title="Section">
        <FieldPicker {...useControlled(props)} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}
