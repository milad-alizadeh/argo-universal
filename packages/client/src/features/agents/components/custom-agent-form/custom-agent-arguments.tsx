import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { keyedRows } from '../keyed-rows';
import {
  type ArgumentsField,
  type Editing,
  newArgument,
} from './argument-sheet';
import { AddEntryRow, type FormPartProps } from './custom-agent-form-sections';

type SectionProps = FormPartProps & { onEdit: (editing: Editing) => void };

type FieldProps = SectionProps & { field: ArgumentsField };

const argumentHint = 'Each argument is passed exactly as typed, in this order.';

export function CustomAgentArguments(props: SectionProps): React.JSX.Element {
  return (
    <props.form.Field name="args" mode="array">
      {(field) => <ArgumentsSection {...props} field={field} />}
    </props.form.Field>
  );
}

// One row per argument, in order; each opens its editor, and the last row adds one.
function ArgumentsSection(props: FieldProps): React.JSX.Element {
  return (
    <GroupedListSection title="Arguments" footer={argumentHint}>
      <ArgumentRows {...props} />
      <AddEntryRow
        label="Add argument"
        disabled={props.disabled}
        onPress={() => props.onEdit(newArgument)}
      />
    </GroupedListSection>
  );
}

function ArgumentRows(props: FieldProps): React.JSX.Element[] {
  return keyedRows(props.field.state.value).map(({ key, index, value }) => (
    <GroupedListItem
      key={key}
      code
      label={value}
      disabled={props.disabled}
      onPress={() => props.onEdit({ index, value })}
    />
  ));
}
