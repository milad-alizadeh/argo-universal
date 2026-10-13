import type { FeedChange } from '@repo/contracts';
export const afterRejectionRowId = 'after-rejection';

export const storedBeforeStreamText = 'Stored first';

export const overlappingTimersRowId = 'overlapping-timers';

export const thirdMessageRowId = 'message-2#0';

export const appendRowEvent = 'row.append';

export const upsertRowEvent = 'row.upsert';

export const fifthMessageRowId = 'message-5#0';

export const lastRowId = 'last-row';

export const teardownRowId = 'teardown-row';

export const fourthStoredUpsert = 'upsert message-4#0 @5';

export const dropFeedWriteTrigger = 'DROP TRIGGER hold_feed_writes';

export const queuedToolActivity = 'Reading files';

export const waitForCancelStep = 'wait-for-cancel';

export const createOpenMessageChange = (id: string, text = ''): FeedChange => ({
  type: 'upsert',
  update: {
    id,
    state: 'open',
    sessionUpdate: 'agent_message',
    messageId: id,
    content: [{ type: 'text', text }],
  },
});

export const createTextAppendChange = (
  id: string,
  text: string,
): FeedChange => ({
  type: 'append',
  id,
  field: 'content.0.text',
  text,
});
