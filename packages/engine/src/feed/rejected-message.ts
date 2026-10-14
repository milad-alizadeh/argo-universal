import type { FeedChange } from '@repo/contracts';

export const messageRejectedEvent = 'feed.messageRejected';

export type MessageRejectedEvent = {
  type: typeof messageRejectedEvent;
  turnId: string | null;
  reason: string;
};

export const messageRejectedNotice = (
  id: string,
  reason: string,
): FeedChange => ({
  type: 'upsert',
  update: {
    id,
    sessionUpdate: 'notice',
    state: 'settled',
    severity: 'warning',
    title: 'The Agent sent an unrecognised message',
    description: reason,
  },
});
