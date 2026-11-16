import type { QueueCommand, QueuedPrompt } from '@repo/contracts';

export type SteerCommand = Extract<QueueCommand, { action: 'steer' }>;

export interface QueueSteering {
  row: QueuedPrompt;
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
