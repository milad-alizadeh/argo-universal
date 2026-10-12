import type { EnvironmentVariable } from '@repo/contracts';
import type * as React from 'react';
import { FieldSection } from '#primitives/field-section';
import { AddEntryRow, type FormPartProps } from './custom-agent-form-sections';
import { VariableRow } from './custom-agent-launch';
import { errorMessage, sectionFooter } from './form-field';
import { keyedRows } from './keyed-rows';
import { type Editing, newVariable } from './variable-sheet';

type SectionProps = FormPartProps & { onEdit: (editing: Editing) => void };
type FieldProps = SectionProps & {
  field: {
    state: {
      value: EnvironmentVariable[];
      meta: { errors: readonly unknown[] };
    };
  };
};
const environmentHint =
  'Stored on the Server in plain text. Not for API keys or other secrets; sign in through the Agent instead.';

export function CustomAgentEnvironment(props: SectionProps): React.JSX.Element {
  return (
    <props.form.Field name="env" mode="array">
      {(field) => <EnvironmentSection {...props} field={field} />}
    </props.form.Field>
  );
}

const environmentFooter = ({
  field,
}: FieldProps): ReturnType<typeof sectionFooter> =>
  sectionFooter(errorMessage(field.state.meta.errors), environmentHint);

// One row per variable; each opens its editor, and the last row adds one. A list error replaces the hint.
function EnvironmentSection(props: FieldProps): React.JSX.Element {
  return (
    <FieldSection title="Environment variables" {...environmentFooter(props)}>
      <VariableRows {...props} />
      <AddEntryRow
        title="Add environment variable"
        disabled={props.disabled}
        onPress={() => props.onEdit(newVariable)}
      />
    </FieldSection>
  );
}

function VariableRows(props: FieldProps): React.JSX.Element[] {
  return keyedRows(props.field.state.value).map(({ key, index, value }) => (
    <VariableRow
      key={key}
      variable={value}
      disabled={props.disabled}
      onPress={() => props.onEdit({ index, variable: value })}
    />
  ));
}
