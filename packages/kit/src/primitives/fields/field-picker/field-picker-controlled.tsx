import { useState, type ReactElement } from 'react';
import { FieldGroup } from '#primitives/fields/field-group';
import type { FieldPickerProps } from './field-picker-model';
import { FieldPickerScreen } from './field-picker-screen';
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

/*
 * The choices of a `page` drawn on their own, as the page shows them once pushed or opened: on a phone a grouped
 * List of option rows with a mark on the chosen one, on the web a menu's rows.
 */
export function ControlledScreen(props: FieldPickerProps): ReactElement {
  return (
    <FieldPickerScreen
      {...useControlled(props)}
      query=""
      onQueryChange={ignoreQuery}
      searchInHeader
    />
  );
}

function ignoreQuery(): void {}
