import type { NonUserPromptSender, QueueCommand } from '@repo/contracts';
import type { QueueSteeringCommand } from './queue-steering/types';

// A Plugin taking back a Queued Prompt it sent (ADR-0055); only the Server sends it, never an App.
export type WithdrawCommand = {
  action: 'withdraw';
  id: string;
  pluginId: string;
};

// What changes a Session's queue: an App's command, or the Server's withdraw for a Plugin.
export type ServerQueueCommand =
  | Exclude<QueueCommand, { action: 'steer' }>
  | WithdrawCommand;

export type QueueSessionCommand =
  | QueueSteeringCommand
  | {
      type: 'session.queue';
      connectionSignal?: AbortSignal;
      command: ServerQueueCommand;
      // Set by the Server for a Plugin's Prompt; an App's command never carries one (ADR-0055).
      sender?: NonUserPromptSender;
      // The id a Plugin's appended Prompt takes, chosen by the Server so the Plugin can withdraw it.
      queuedId?: string;
      committed: PromiseWithResolvers<void>;
    };
