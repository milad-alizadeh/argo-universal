import type { NonUserPromptSender, QueueCommand } from '@repo/contracts';
import type { QueueSteeringCommand } from './queue-steering-types';

export type QueueSessionCommand =
  | QueueSteeringCommand
  | {
      type: 'session.queue';
      connectionSignal?: AbortSignal;
      command: Exclude<QueueCommand, { action: 'steer' }>;
      // Set by the Server for a Plugin's Prompt; an App's command never carries one (ADR-0055).
      sender?: NonUserPromptSender;
      committed: PromiseWithResolvers<void>;
    };
