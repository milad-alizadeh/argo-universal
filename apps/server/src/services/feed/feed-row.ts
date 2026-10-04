import { SessionUpdate } from '@repo/contracts';
import type { FeedRowWrite } from './writer-job';

// The shape version of `payload` in the rows this Server writes.
export const payloadVersion = 1;

// A row as the `feed_row` table stores it: the envelope in columns, the rest in `payload`.
export function toFeedRowWrite(row: SessionUpdate): FeedRowWrite {
  const {
    id,
    sessionId,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    ...payload
  } = row;
  return {
    id,
    position,
    revision,
    turnId,
    state,
    sessionUpdate,
    payload,
    payloadVersion,
  };
}

// A stored row as a Session update, checked against its kind.
export function fromFeedRow(
  sessionId: string,
  row: Pick<
    FeedRowWrite,
    | 'id'
    | 'position'
    | 'revision'
    | 'turnId'
    | 'state'
    | 'sessionUpdate'
    | 'payload'
  >,
): SessionUpdate {
  return SessionUpdate.parse({
    ...(row.payload as object),
    id: row.id,
    sessionId,
    position: row.position,
    revision: row.revision,
    turnId: row.turnId ?? null,
    state: row.state,
    sessionUpdate: row.sessionUpdate,
  });
}
