import { type Database } from '@repo/db';
import { feedRow, session } from '@repo/db/schema';
import { eq } from 'drizzle-orm';
import { type FeedRowWrite } from '../../feed';

export const runningTurnId = 'running-turn';

export const partialReply = 'Partial reply';

export const editedFilePath = '/project/file';

export const completedToolId = 'completed-tool';

export const failedToolId = 'failed-tool';

export const cancelledToolId = 'cancelled-tool';

export const invalidMessageId = 'invalid-message';

export const futurePayloadId = 'future-payload';

export const settledCompletedToolId = 'settled-completed-tool';

export const settledRunningToolId = 'settled-running-tool';

export const messageRow = (
  id: string,
  position: number,
  revision: number,
): FeedRowWrite => ({
  id,
  position,
  revision,
  turnId: runningTurnId,
  state: 'open',
  sessionUpdate: 'agent_message',
  payloadVersion: 1,
  payload: {
    messageId: id,
    content: [{ type: 'text', text: partialReply }],
  },
  searchText: partialReply,
  sourceRef: { line: 7 },
});

export const seedStoredFeedRows = (
  database: Database,
  input: { sessionId: string; maxRevision: number; rows: FeedRowWrite[] },
): void => {
  database
    .insert(feedRow)
    .values(
      input.rows.map((row): typeof feedRow.$inferInsert => ({
        ...row,
        sessionId: input.sessionId,
      })),
    )
    .run();
  database
    .update(session)
    .set({ maxRevision: input.maxRevision })
    .where(eq(session.id, input.sessionId))
    .run();
};

export const toolRow = ({
  id,
  position,
  revision,
  status,
  state = 'open',
}: {
  id: string;
  position: number;
  revision: number;
  status: string;
  state?: 'open' | 'settled';
}): FeedRowWrite => ({
  ...messageRow(id, position, revision),
  state,
  sessionUpdate: 'tool_call_update',
  payload: {
    toolCallId: id,
    title: 'Read a file',
    kind: 'read',
    status,
    content: [],
    rawInput: { path: editedFilePath },
  },
});
