import type { PromptQueue, QueuedPrompt, QueueCommand } from '@repo/contracts';

export interface PromptQueueProps {
  queue: PromptQueue;
  holds: readonly string[];
  canSteer?: boolean;
  command: (command: QueueCommand) => Promise<void>;
}

export type QueueRowProps = PromptQueueProps & {
  row: QueuedPrompt;
  index: number;
};
