import type { QueueCommand, ContentBlock } from '@repo/contracts';

export type SteerCommand =
  | Extract<QueueCommand, { action: 'steer' }>
  | { action: 'steerDraft'; prompt: ContentBlock[] };

export interface QueueSteering {
  prompt: ContentBlock[];
  queuedId?: string;
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
