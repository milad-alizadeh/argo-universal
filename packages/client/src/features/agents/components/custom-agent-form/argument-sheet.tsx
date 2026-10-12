import { AgentArgument } from '@repo/contracts';
import { useField, useForm, useStore } from '@tanstack/react-form';
import type * as React from 'react';
import type { CustomAgentFormApi } from '../../hooks/use-custom-agent-form';
import {
  EntrySheet,
  type EntrySheetEntry,
  entryField,
  removalOf,
} from '../entry-sheet/entry-sheet';

export type ArgumentsField = {
  state: { value: string[] };
  pushValue: (value: string) => void;
  removeValue: (index: number) => void;
};
export type Editing = { index: number | null; value: string };
type SheetProps = {
  form: CustomAgentFormApi;
  editing: Editing;
  onEdit: (editing: Editing | null) => void;
};
export const newArgument: Editing = { index: null, value: '' };

// The entry validates as the form does: on mount for Save, on change while typing.
const validators = { onMount: AgentArgument, onChange: AgentArgument };

function saveArgument(
  { form, editing, onEdit }: SheetProps,
  value: string,
): void {
  if (editing.index === null) form.pushFieldValue('args', value);
  else void form.replaceFieldValue('args', editing.index, value);
  onEdit(null);
}

const removeArgument =
  (form: CustomAgentFormApi) =>
  (index: number): void =>
    void form.removeFieldValue('args', index);

const argumentInput = { label: 'Argument', placeholder: '--acp' };

function useArgumentEntry(props: SheetProps): EntrySheetEntry {
  const entry = useForm({
    defaultValues: { value: props.editing.value },
    onSubmit: ({ value }) => saveArgument(props, value.value),
  });
  const field = useField({ form: entry, name: 'value', validators });
  return {
    fields: [entryField(argumentInput, field)],
    onSave: () => void entry.handleSubmit(),
    dirty: useStore(entry.store, (state) => state.isDirty),
  };
}

export function ArgumentSheet(props: SheetProps): React.JSX.Element {
  const { form, editing, onEdit } = props;
  const close = (): void => onEdit(null);
  return (
    <EntrySheet
      title="Argument"
      removeLabel="Remove argument"
      {...useArgumentEntry(props)}
      onClose={close}
      onRemove={removalOf(editing.index, removeArgument(form), close)}
    />
  );
}
