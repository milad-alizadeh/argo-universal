import type { SentPromptSender, QueueCommand } from '@repo/contracts';
import type { WriterJob } from '../storage';
import type { QueueSteeringCommand } from './queue-steering/types';
import type { SessionContext } from './session-context';

// What a queue step changes, and what it reads to change it.
export type QueueChange = Pick<SessionContext, 'promptQueue' | 'queueHolds'>;

export type QueueContext = QueueChange &
  Pick<SessionContext, 'dispatchingQueueId'>;

// A Plugin taking back a Queued Prompt it sent (ADR-0055); only the Server sends it, never an App.
export type WithdrawCommand = {
  action: 'withdraw';
  id: string;
  pluginId: string;
  // Told by the queue step whether it took the Prompt out, so the answer is the change itself.
  decided: (withdrawn: boolean) => void;
};

// What changes a Session's queue: an App's command, or the Server's withdraw for a Plugin.
type ServerQueueCommand =
  | Exclude<QueueCommand, { action: 'steer' }>
  | WithdrawCommand;

export type QueueSessionCommand =
  | QueueSteeringCommand
  | {
      type: 'session.queue';
      connectionSignal?: AbortSignal;
      command: ServerQueueCommand;
      // Set by the Server for a Plugin's Prompt; an App's command never carries one (ADR-0055).
      sender?: SentPromptSender;
      // The id a Plugin's appended Prompt takes, chosen by the Server so the Plugin can withdraw it.
      queuedId?: string;
      // Told the id of the row an append landed in: its own, or the Conversation's waiting Prompt it joined (ADR-0064).
      landed?: (queuedId: string) => void;
      // Stored atomically with admission of a scheduled Prompt.
      commitWith?: WriterJob;
      committed: PromiseWithResolvers<void>;
    };
