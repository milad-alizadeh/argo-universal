import type { SessionUpdate } from '@repo/contracts';
import type { FeedEvent } from '../src/feed';

export const publicationTurnId = 'publishing-turn';

const acpUpdateType = 'feed.acpUpdate';

type PublicationCase = {
  label: string;
  initial: FeedEvent[];
  revision: number;
  tools: Partial<SessionUpdate>[];
  nextRevision: number;
};

export const publicationCases: PublicationCase[] = [
  {
    label: 'empty batch',
    initial: [],
    revision: 5,
    tools: [],
    nextRevision: 6,
  },
  {
    label: 'unfinished Tool',
    initial: [
      {
        type: acpUpdateType,
        acpSessionId: 'vendor-1',
        turnId: publicationTurnId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId: 'publishing-tool',
          status: 'in_progress',
        },
      },
    ],
    revision: 7,
    tools: [
      {
        turnId: publicationTurnId,
        revision: 7,
        state: 'settled',
        status: 'cancelled',
      },
    ],
    nextRevision: 8,
  },
];

export const publicationLateUpdate: FeedEvent = {
  type: acpUpdateType,
  acpSessionId: 'vendor-1',
  turnId: publicationTurnId,
  update: {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'publishing-tool',
    status: 'completed',
  },
};

export const nextTurnUpdate: FeedEvent = {
  type: acpUpdateType,
  acpSessionId: 'vendor-1',
  turnId: 'next-turn',
  update: {
    sessionUpdate: 'tool_call_update',
    toolCallId: 'next-tool',
    status: 'completed',
  },
};
