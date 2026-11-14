import { QueuedPromptId } from '@repo/contracts';
import type { PromptQueueProps } from './prompt-queue';

const first = {
  id: QueuedPromptId.parse('first'),
  revision: 0,
  prompt: [
    { type: 'text' as const, text: 'Add tests for the settings screen' },
  ],
};

const second = {
  id: QueuedPromptId.parse('second'),
  revision: 0,
  prompt: [
    {
      type: 'text' as const,
      text: 'Review the changes and summarize the result',
    },
  ],
};

export const queuedPrompts: Omit<PromptQueueProps, 'command'> = {
  queue: { items: [first, second], pauseReason: null },
  holds: [],
};

export const pausedPrompts: Omit<PromptQueueProps, 'command'> = {
  ...queuedPrompts,
  queue: { ...queuedPrompts.queue, pauseReason: 'Turn stopped' },
};

export const editingElsewhere: Omit<PromptQueueProps, 'command'> = {
  ...queuedPrompts,
  holds: [first.id],
};
