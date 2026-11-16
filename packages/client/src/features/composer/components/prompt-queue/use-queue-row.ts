import { useQueueEditors, type QueueEditors } from './queue-editors';
import type { QueueRowProps } from './queue-types';
import { useQueueAction } from './use-queue-action';

type QueueAction = ReturnType<typeof useQueueAction>;

interface Editing {
  editing: boolean;
  editorBusy: boolean;
  begin: () => void;
}

export type QueueRow = QueueAction & Editing & QueueRowProps;

export function useQueueRow(props: QueueRowProps): QueueRow {
  const action = useQueueAction(props.command);
  const editors = useQueueEditors();

  return { ...props, ...action, ...rowEditing(props, editors, action) };
}

function rowEditing(
  { row }: QueueRowProps,
  editors: QueueEditors,
  action: QueueAction,
): Editing {
  return {
    editing: editors.drafts[row.id] !== undefined,
    editorBusy: Object.keys(editors.drafts).length > 0,
    begin: () => action.perform(() => editors.begin(row)),
  };
}
