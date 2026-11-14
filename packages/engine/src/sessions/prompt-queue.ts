import { QueuedPromptId } from '@repo/contracts';
import type { PromptQueue, QueuedPrompt, QueueCommand } from '@repo/contracts';
import { TRPCError } from '@trpc/server';
import type { SessionContext } from './session-context';
import { SessionRowUpdateJob } from './session-storage';

export const queueWrite = (
  sessionId: string,
  promptQueue: PromptQueue,
): SessionRowUpdateJob =>
  new SessionRowUpdateJob({ id: sessionId, set: { promptQueue } });

type QueueChange = Pick<SessionContext, 'promptQueue' | 'queueHolds'>;

type QueueContext = QueueChange & Pick<SessionContext, 'dispatchingQueueId'>;

type RowCommand = Exclude<QueueCommand, { action: 'append' | 'resume' }>;

type EditingCommand = Extract<QueueCommand, { action: 'save' | 'release' }>;

type OrderCommand = Extract<QueueCommand, { action: 'move' | 'delete' }>;

const conflict = (message: string): never => {
  throw new TRPCError({ code: 'CONFLICT', message });
};

export function changePromptQueue(
  context: QueueContext,
  command: QueueCommand,
  createId: () => string,
): QueueChange {
  if (command.action === 'append')
    return appendRow(context, command.prompt, createId());

  if (command.action === 'resume')
    return {
      promptQueue: { ...context.promptQueue, pauseReason: null },
      queueHolds: context.queueHolds,
    };

  return changeExistingRow(context, command);
}

function withItems(context: QueueChange, items: QueuedPrompt[]): QueueChange {
  return {
    promptQueue: { ...context.promptQueue, items },
    queueHolds: context.queueHolds,
  };
}

function requireRow(context: QueueContext, command: RowCommand): QueuedPrompt {
  const row = context.promptQueue.items.find(({ id }) => id === command.id);

  if (!row || row.id === context.dispatchingQueueId)
    return conflict('This Prompt has already started');
  requireRevision(row, command);

  return row;
}

function requireRevision(row: QueuedPrompt, command: RowCommand): void {
  if ('revision' in command && row.revision !== command.revision)
    conflict('This Prompt changed in another App');
}

function changeRow(
  context: QueueContext,
  command: RowCommand,
  row: QueuedPrompt,
): QueueChange {
  if (command.action === 'hold') return holdRow(context, row.id, command.token);

  if (isOrderCommand(command)) return changeOrder(context, command, row);

  return finishEditing(context, command, row);
}

function holdRow(context: QueueChange, id: string, token: string): QueueChange {
  const held = context.queueHolds[id];

  if (held && held !== token)
    return conflict('This Prompt is being edited in another App');

  return {
    promptQueue: context.promptQueue,
    queueHolds: { ...context.queueHolds, [id]: token },
  };
}

function finishEditing(
  context: QueueChange,
  command: EditingCommand,
  row: QueuedPrompt,
): QueueChange {
  if (context.queueHolds[row.id] !== command.token)
    return conflict('This App no longer holds the Prompt for editing');
  const queueHolds = { ...context.queueHolds };
  delete queueHolds[row.id];
  const released = { ...context, queueHolds };

  return command.action === 'save'
    ? saveRow(released, row, command.prompt)
    : released;
}

function saveRow(
  context: QueueChange,
  row: QueuedPrompt,
  prompt: QueuedPrompt['prompt'],
): QueueChange {
  return withItems(
    context,
    context.promptQueue.items.map((item) =>
      item.id === row.id
        ? { ...item, prompt, revision: item.revision + 1 }
        : item,
    ),
  );
}

function changeOrder(
  context: QueueChange,
  command: OrderCommand,
  row: QueuedPrompt,
): QueueChange {
  if (context.queueHolds[row.id])
    return conflict('Finish editing this Prompt first');
  const items = context.promptQueue.items.filter(({ id }) => id !== row.id);

  if (command.action === 'move') insertRow(items, row, command.beforeId);

  return withItems(context, items);
}

function insertRow(
  items: QueuedPrompt[],
  row: QueuedPrompt,
  beforeId: string | null,
): void {
  const index =
    beforeId === null
      ? items.length
      : items.findIndex(({ id }) => id === beforeId);

  if (index < 0) conflict('The queue order changed in another App');
  items.splice(index, 0, row);
}

function appendRow(
  context: QueueContext,
  prompt: QueuedPrompt['prompt'],
  id: string,
): QueueChange {
  return withItems(context, [
    ...context.promptQueue.items,
    { id: QueuedPromptId.parse(id), prompt, revision: 0 },
  ]);
}

function isOrderCommand(command: RowCommand): command is OrderCommand {
  return command.action === 'delete' || command.action === 'move';
}

function changeExistingRow(
  context: QueueContext,
  command: RowCommand,
): QueueChange {
  if (command.action === 'release' && !context.queueHolds[command.id])
    return { promptQueue: context.promptQueue, queueHolds: context.queueHolds };

  return changeRow(context, command, requireRow(context, command));
}
