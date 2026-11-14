import type { PromptQueueProps } from './prompt-queue';

const first = {
  id: 'first',
  revision: 0,
  prompt: [
    { type: 'text' as const, text: 'Add tests for the settings screen' },
  ],
};

const second = {
  id: 'second',
  revision: 0,
  prompt: [
    {
      type: 'text' as const,
      text: 'Review the changes and summarize the result',
    },
  ],
};

export const queuedPrompts: PromptQueueProps = {
  queue: { items: [first, second], pauseReason: null },
  holds: [],
  command: async () => {},
};

export const pausedPrompts: PromptQueueProps = {
  ...queuedPrompts,
  queue: { ...queuedPrompts.queue, pauseReason: 'Turn stopped' },
};

export const editingElsewhere: PromptQueueProps = {
  ...queuedPrompts,
  holds: [first.id],
};
