import { EnvironmentVariable } from '@repo/contracts';
import { useField, useForm, useStore } from '@tanstack/react-form';
import type * as React from 'react';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';
import {
  EntrySheet,
  type EntrySheetEntry,
  entryField,
  removalOf,
} from '../entry-sheet/entry-sheet';

export type Editing = { index: number | null; variable: EnvironmentVariable };

type EditVariable = (editing: Editing | null) => void;

type SheetProps = {
  form: CustomAgentFormApi;
  editing: Editing;
  onEdit: EditVariable;
};

const emptyVariable: EnvironmentVariable = { name: '', value: '' };

export const newVariable: Editing = { index: null, variable: emptyVariable };

// Each part validates as the form does: on mount for Save, on change while typing.
const { name: nameSchema, value: valueSchema } = EnvironmentVariable.shape;

const forName = { onMount: nameSchema, onChange: nameSchema };

const forValue = { onMount: valueSchema, onChange: valueSchema };

function saveVariable(
  { form, editing, onEdit }: SheetProps,
  variable: EnvironmentVariable,
): void {
  if (editing.index === null) form.pushFieldValue('env', variable);
  else void form.replaceFieldValue('env', editing.index, variable);
  onEdit(null);
}

const removeVariable =
  (form: CustomAgentFormApi) =>
  (index: number): void =>
    void form.removeFieldValue('env', index);

const nameInput = { label: 'Name', placeholder: 'EXAMPLE_HOME' };

const valueInput = { label: 'Value', placeholder: '/Users/you/.example' };

function useVariableEntry(props: SheetProps): EntrySheetEntry {
  const entry = useForm({
    defaultValues: props.editing.variable,
    onSubmit: ({ value }) => saveVariable(props, value),
  });

  const name = useField({ form: entry, name: 'name', validators: forName });
  const value = useField({ form: entry, name: 'value', validators: forValue });

  return {
    fields: [entryField(nameInput, name), entryField(valueInput, value)],
    onSave: () => void entry.handleSubmit(),
    dirty: useStore(entry.store, (state) => state.isDirty),
  };
}

export function VariableSheet(props: SheetProps): React.JSX.Element {
  const { form, editing, onEdit } = props;
  const close = (): void => onEdit(null);

  return (
    <EntrySheet
      title="Environment variable"
      removeLabel="Remove variable"
      {...useVariableEntry(props)}
      onClose={close}
      onRemove={removalOf(editing.index, removeVariable(form), close)}
    />
  );
}
