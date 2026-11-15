import type { NonUserPromptSender, QueueCommand } from '@repo/contracts';

// A change to a Session's Prompt queue, settled once the queue is stored.
export type QueueSessionCommand = {
  type: 'session.queue';
  connectionSignal?: AbortSignal;
  command: QueueCommand;
  // Set by the Server for a Plugin's Prompt; an App's command never carries one (ADR-0055).
  sender?: NonUserPromptSender;
  committed: PromiseWithResolvers<void>;
};
