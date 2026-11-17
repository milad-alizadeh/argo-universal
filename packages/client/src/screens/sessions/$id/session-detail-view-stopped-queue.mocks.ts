import { QueuedPromptId } from '@repo/contracts';
import { fn } from 'storybook/test';
import type { OpenSessionViewProps } from './session-detail-view';
import { longSession } from './session-detail-view.mocks';

// The Server restarted mid-Turn: the queue it paused, above the Turn it stopped.
export const stoppedOverQueueSession: OpenSessionViewProps = {
  ...longSession,
  composer: {
    ...longSession.composer,
    placeholder: 'Message the Agent',
    promptQueue: {
      queue: {
        items: [
          {
            id: QueuedPromptId.parse('compact'),
            revision: 0,
            prompt: [{ type: 'text', text: '/compact' }],
          },
        ],
        pauseReason: 'Server restarted',
      },
      holds: [],
      command: fn(),
    },
  },
  stoppedTurn: {
    reason: 'The Server restarted during this Turn',
    onRetry: fn(),
  },
};
