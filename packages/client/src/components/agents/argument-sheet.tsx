import { AgentArgument } from '@repo/contracts';
import type * as React from 'react';
import { EntrySheet, type EntrySheetField, removalOf } from './entry-sheet';
import { errorMessage } from './form-field';
import type { CustomAgentFormApi } from './use-custom-agent-form';

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
type Parsed = ReturnType<typeof AgentArgument.safeParse>;
export const newArgument: Editing = { index: null, value: '' };

const argumentFields = (
  { index, value }: Editing,
  onEdit: SheetProps['onEdit'],
  parsed: Parsed,
): EntrySheetField[] => [
  {
    label: 'Argument',
    value,
    onChange: (next) => onEdit({ index, value: next }),
    error: parsed.success ? undefined : errorMessage(parsed.error.issues),
  },
];

function saveArgument(
  { form, editing, onEdit }: SheetProps,
  parsed: Parsed,
): void {
  if (!parsed.success) return;
  if (editing.index === null) form.pushFieldValue('args', parsed.data);
  else void form.replaceFieldValue('args', editing.index, parsed.data);
  onEdit(null);
}

const removeArgument =
  (form: CustomAgentFormApi) =>
  (index: number): void =>
    void form.removeFieldValue('args', index);

export function ArgumentSheet(props: SheetProps): React.JSX.Element {
  const { form, editing, onEdit } = props;
  const parsed = AgentArgument.safeParse(editing.value);
  const close = (): void => onEdit(null);
  return (
    <EntrySheet
      title="Argument"
      removeLabel="Remove argument"
      fields={argumentFields(editing, onEdit, parsed)}
      onSave={() => saveArgument(props, parsed)}
      onClose={close}
      onRemove={removalOf(editing.index, removeArgument(form), close)}
    />
  );
}
