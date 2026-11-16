import type { QueuedPrompt } from '@repo/contracts';
import type { ComposerProps } from '../composer/composer-types';
import { useQueueEditors, type QueueEditors } from './queue-editors';
import type { PromptQueueProps } from './queue-types';
import { useQueueAction } from './use-queue-action';

type Action = ReturnType<typeof useQueueAction>;

type Edit = { row: QueuedPrompt; editors: QueueEditors; action: Action };

export function useQueueComposer(props: ComposerProps): ComposerProps {
  const editors = useQueueEditors();
  const queue = props.promptQueue;
  const action = useQueueAction(queueCommand(queue));
  const row = queue ? editedRow(queue.queue.items, editors) : undefined;

  return row ? editingProps(props, { row, editors, action }) : props;
}

async function unavailable(): Promise<void> {
  throw new Error('The queue is unavailable');
}

function editingProps(props: ComposerProps, edit: Edit): ComposerProps {
  return {
    ...props,
    ...editDraft(edit),
    queueWhileRunning: true,
    followUpSuggestion: undefined,
    sending: props.sending || edit.action.pending,
    error: edit.action.error ?? props.error,
    placeholder: 'Edit Queued Prompt',
    queueEdit: { id: edit.row.id, cancel: () => cancel(edit) },
  };
}

function editDraft({
  row,
  editors,
  action,
}: Edit): Pick<ComposerProps, 'draft' | 'onDraftChange' | 'onSend'> {
  return {
    draft: { text: editors.drafts[row.id]?.text ?? '', attachments: [] },
    onDraftChange: (draft) => editors.change(row.id, draft.text),
    onSend: () => action.perform(() => editors.save(row)),
  };
}

function cancel({ row, editors, action }: Edit): void {
  action.perform(() => editors.cancel(row));
}

function editedRow(
  items: readonly QueuedPrompt[],
  editors: QueueEditors,
): QueuedPrompt | undefined {
  return items.find((item) => editors.drafts[item.id] !== undefined);
}

export function queueCommand(
  queue: PromptQueueProps | undefined,
): PromptQueueProps['command'] {
  return queue?.command ?? unavailable;
}
