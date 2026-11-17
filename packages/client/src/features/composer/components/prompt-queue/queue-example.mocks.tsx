import type { QueueCommand, PromptQueue } from '@repo/contracts';
import { useState } from 'react';
import type { PromptQueueProps } from './queue-types';

export function useQueueExample(initial: PromptQueueProps): PromptQueueProps {
  const [queue, setQueue] = useState(initial.queue);

  return {
    ...initial,
    queue,
    command: async (command) => {
      await initial.command(command);
      setQueue((current) => applyCommand(current, command));
    },
  };
}

function applyCommand(queue: PromptQueue, command: QueueCommand): PromptQueue {
  if (command.action === 'resume') return { ...queue, pauseReason: null };

  if (command.action === 'move') return movedQueue(queue, command);

  return {
    ...queue,
    items: queue.items.flatMap((item) => editedItem(item, command)),
  };
}

function editedItem(
  item: PromptQueue['items'][number],
  command: QueueCommand,
): PromptQueue['items'] {
  if (!matchesItem(item, command)) return [item];

  return changedItem(item, command);
}

function matchesItem(
  item: PromptQueue['items'][number],
  command: QueueCommand,
): boolean {
  return 'id' in command && item.id === command.id;
}

function changedItem(
  item: PromptQueue['items'][number],
  command: QueueCommand,
): PromptQueue['items'] {
  if (['delete', 'steer'].includes(command.action)) return [];

  if (command.action === 'save')
    return [{ ...item, prompt: command.prompt, revision: item.revision + 1 }];

  return [item];
}

function movedQueue(
  queue: PromptQueue,
  command: Extract<QueueCommand, { action: 'move' }>,
): PromptQueue {
  const item = queue.items.find((entry) => entry.id === command.id);
  const items = queue.items.filter((entry) => entry.id !== command.id);
  const before = items.findIndex((entry) => entry.id === command.beforeId);

  if (item) items.splice(before < 0 ? items.length : before, 0, item);

  return { ...queue, items };
}
