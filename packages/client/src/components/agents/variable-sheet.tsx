import { EnvironmentVariable } from '@repo/contracts';
import type * as React from 'react';
import { EntrySheet, type EntrySheetField, removalOf } from './entry-sheet';
import { errorMessage } from './form-field';
import type { CustomAgentFormApi } from './use-custom-agent-form';

export type Editing = { index: number | null; variable: EnvironmentVariable };
type EditVariable = (editing: Editing | null) => void;
type SheetProps = {
  form: CustomAgentFormApi;
  editing: Editing;
  onEdit: EditVariable;
};
export const emptyVariable: EnvironmentVariable = { name: '', value: '' };
export const newVariable: Editing = { index: null, variable: emptyVariable };

function nameField(
  { index, variable }: Editing,
  onEdit: EditVariable,
): EntrySheetField {
  const name = EnvironmentVariable.shape.name.safeParse(variable.name);
  return {
    label: 'Name',
    value: variable.name,
    onChange: (next) =>
      onEdit({ index, variable: { ...variable, name: next } }),
    error: name.success ? undefined : errorMessage(name.error.issues),
  };
}

const valueField = (
  { index, variable }: Editing,
  onEdit: EditVariable,
): EntrySheetField => ({
  label: 'Value',
  value: variable.value,
  onChange: (next) => onEdit({ index, variable: { ...variable, value: next } }),
});

function saveVariable({ form, editing, onEdit }: SheetProps): void {
  const parsed = EnvironmentVariable.safeParse(editing.variable);
  if (!parsed.success) return;
  if (editing.index === null) form.pushFieldValue('env', parsed.data);
  else void form.replaceFieldValue('env', editing.index, parsed.data);
  onEdit(null);
}

const removeVariable =
  (form: CustomAgentFormApi) =>
  (index: number): void =>
    void form.removeFieldValue('env', index);

export function VariableSheet(props: SheetProps): React.JSX.Element {
  const { form, editing, onEdit } = props;
  const close = (): void => onEdit(null);
  return (
    <EntrySheet
      title="Environment variable"
      removeLabel="Remove variable"
      fields={[nameField(editing, onEdit), valueField(editing, onEdit)]}
      onSave={() => saveVariable(props)}
      onClose={close}
      onRemove={removalOf(editing.index, removeVariable(form), close)}
    />
  );
}
