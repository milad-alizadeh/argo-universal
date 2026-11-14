import type { QueuedPrompt } from '@repo/contracts';
import { useQueueEditors, type QueueEditors } from './queue-editors';
import type { QueueRowProps } from './queue-types';
import { useQueueAction } from './use-queue-action';

type QueueAction = ReturnType<typeof useQueueAction>;

interface Editing {
  text: string;
  changeText: (text: string) => void;
  editing: boolean;
  begin: () => void;
  save: () => void;
  cancel: () => void;
}

export type QueueRow = QueueAction & Editing & QueueRowProps;

export function useQueueRow(props: QueueRowProps): QueueRow {
  const action = useQueueAction(props.command);
  const editors = useQueueEditors();

  return { ...props, ...action, ...rowEditing({ props, editors, action }) };
}

type RowEditing = {
  props: QueueRowProps;
  editors: QueueEditors;
  action: QueueAction;
};

function rowEditing(binding: RowEditing): Editing {
  const {
    props: { row },
    editors,
    action,
  } = binding;

  const draft = editors.drafts[row.id];

  return {
    ...editingDraft(draft),
    changeText: (text) => editors.change(row.id, text),
    begin: () => action.perform(() => editors.begin(row)),
    save: () => action.perform(() => editors.save(row)),
    cancel: () => action.perform(() => editors.cancel(row)),
  };
}

function editingDraft(
  draft: QueueEditors['drafts'][QueuedPrompt['id']] | undefined,
): Pick<Editing, 'text' | 'editing'> {
  return { text: draft?.text ?? '', editing: draft !== undefined };
}
