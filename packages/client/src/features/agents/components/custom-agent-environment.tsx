import type { EnvironmentVariable } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { useWide } from '../../../lib/generic/use-wide';
import type { CustomAgentFormApi } from '../hooks/use-custom-agent-form';
import { AddEntry, EntryList, type EntryListItem } from './entry-controls';
import { FieldMessage } from './form-field';
import { keyedRows } from './keyed-rows';
import { VariableColumns, VariableInputRow } from './variable-inputs';
import {
  type Editing,
  VariableSheet,
  emptyVariable,
  newVariable,
} from './variable-sheet';

type SectionProps = { form: CustomAgentFormApi; disabled: boolean };
type VariablesField = {
  state: { value: EnvironmentVariable[]; meta: { errors: readonly unknown[] } };
  pushValue: (value: EnvironmentVariable) => void;
};
type BodyProps = SectionProps & { field: VariablesField };
type EditVariable = (editing: Editing) => void;
const environmentHint =
  'Stored on the Server in plain text. Not for API keys or other secrets; sign in through the Agent instead.';

export function CustomAgentEnvironment(props: SectionProps): React.JSX.Element {
  return (
    <props.form.Field name="env" mode="array">
      {(field) => <EnvironmentBody {...props} field={field} />}
    </props.form.Field>
  );
}

function EnvironmentBody(props: BodyProps): React.JSX.Element {
  return (
    <View className="gap-2 pt-4">
      <VariableList {...props} />
      <FieldMessage
        hint={environmentHint}
        errors={props.field.state.meta.errors}
      />
    </View>
  );
}

function VariableList(props: BodyProps): React.JSX.Element {
  if (!useWide()) return <VariableRows {...props} />;
  return (
    <>
      <VariableInputs {...props} />
      <AddEntry
        label="Add environment variable"
        disabled={props.disabled}
        onPress={() => props.field.pushValue(emptyVariable)}
      />
    </>
  );
}

function VariableInputs(props: BodyProps): React.JSX.Element {
  const rows = keyedRows(props.field.state.value);
  return (
    <>
      {rows.length > 0 && <VariableColumns />}
      {rows.map((row) => (
        <VariableInputRow key={row.key} {...props} index={row.index} />
      ))}
    </>
  );
}

const variableItems = (
  values: readonly EnvironmentVariable[],
  onEdit: EditVariable,
): EntryListItem[] =>
  keyedRows(values).map(({ key, index, value }) => ({
    key,
    label: value.name,
    detail: value.value,
    onPress: () => onEdit({ index, variable: value }),
  }));

function VariableEntries(
  props: BodyProps & { onEdit: EditVariable },
): React.JSX.Element {
  return (
    <EntryList
      items={variableItems(props.field.state.value, props.onEdit)}
      disabled={props.disabled}
      addLabel="Add environment variable"
      onAdd={() => props.onEdit(newVariable)}
    />
  );
}

function VariableRows(props: BodyProps): React.JSX.Element {
  const [editing, setEditing] = useState<Editing | null>(null);
  return (
    <>
      <VariableEntries {...props} onEdit={setEditing} />
      {editing && (
        <VariableSheet
          form={props.form}
          editing={editing}
          onEdit={setEditing}
        />
      )}
    </>
  );
}
