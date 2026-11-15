import type { QueueCommand } from '@repo/contracts';
import type { QueueSteeringCommand } from './queue-steering-types';

export type QueueSessionCommand =
  | QueueSteeringCommand
  | {
      type: 'session.queue';
      connectionSignal?: AbortSignal;
      command: Exclude<QueueCommand, { action: 'steer' }>;
      committed: PromiseWithResolvers<void>;
    };
