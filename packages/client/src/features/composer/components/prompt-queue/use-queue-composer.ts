import type { QueuedPrompt } from '@repo/contracts';
import { sendResumesQueue } from '../composer/composer-conditions';
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
  const row = editedRow(queue, editors);

  return row ? editingProps(props, { row, editors, action }) : idleProps(props);
}

function idleProps(props: ComposerProps): ComposerProps {
  return sendResumesQueue(props) ? resumingProps(props) : props;
}

function resumingProps(props: ComposerProps): ComposerProps {
  const command = queueCommand(props.promptQueue);
  const resume = (): void => void command({ action: 'resume' }).catch(() => {});

  // Cmd+Enter has no draft to steer with, so it resumes as Send does.
  return { ...props, onSend: resume, onSteer: resume };
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
  queue: PromptQueueProps | undefined,
  editors: QueueEditors,
): QueuedPrompt | undefined {
  const items = queue?.queue.items ?? [];

  return items.find((item) => editors.drafts[item.id] !== undefined);
}

export function queueCommand(
  queue: PromptQueueProps | undefined,
): PromptQueueProps['command'] {
  return queue?.command ?? unavailable;
}
