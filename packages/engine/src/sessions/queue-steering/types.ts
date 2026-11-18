import type {
  NonUserPromptSender,
  QueueCommand,
  ContentBlock,
  QueuedPromptId,
} from '@repo/contracts';

export type SteerCommand =
  | Extract<QueueCommand, { action: 'steer' }>
  | { action: 'steerDraft'; prompt: ContentBlock[] };

export interface QueueSteering {
  prompt: ContentBlock[];
  queuedId?: QueuedPromptId;
  // Who sent a steered queue item that did not come from the person, so the Feed stores it as theirs.
  sender?: NonUserPromptSender;
  messageId: string;
  turnId: string;
  token: string;
}

export type QueueSteeringCommand =
  | {
      type: 'session.reserveQueueSteering';
      command: SteerCommand;
      reserved: PromiseWithResolvers<QueueSteering>;
    }
  | {
      type: 'session.finishQueueSteering';
      token: string;
      injected: boolean;
      committed: PromiseWithResolvers<void>;
    };
