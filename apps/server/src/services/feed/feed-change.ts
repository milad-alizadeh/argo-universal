import {
  type ContentBlock,
  type FeedChange,
  type FeedUpsert,
  feedSetFields,
  type RowAppend,
  type RowPatch,
  type RowUpsert,
  readFeedField,
  SessionUpdate,
  type SessionUpdateKind,
  writeFeedRowField,
} from '@repo/contracts';
import { z } from 'zod';

// The part of a Session's Feed that the Feed actor holds in memory.
export interface Feed {
  sessionId: string;
  // The revision of the newest change.
  maxRevision: number;
  nextPosition: number;
  // Open rows, rows that settled since the last write, and written rows a change brought back, by id.
  rows: Record<string, SessionUpdate>;
}

// What `feed.subscribe` sends for one change.
export type FeedStreamEvent = RowUpsert | RowAppend | RowPatch;

// A refused change says why and leaves the Feed as it was.
export type FeedChangeResult =
  | { feed: Feed; streamEvent: FeedStreamEvent }
  | { rejection: string };

// The Feed sets these, and a row keeps its id and kind, so a patch or an append cannot change them; `state` is the row's own.
const envelopeFields = new Set<string>([
  ...feedSetFields,
  'id',
  'sessionUpdate',
]);

// The prompt a person sent, written as the Turn's first row (ADR 0012).
export const userMessageId = (turnId: string): string => `${turnId}:user`;

export const userMessageChange = (
  turnId: string,
  content: ContentBlock[],
): FeedUpsert => ({
  type: 'upsert',
  update: {
    id: userMessageId(turnId),
    sessionUpdate: 'user_message',
    messageId: userMessageId(turnId),
    state: 'settled',
    content,
  },
});

// The id of the row a change touches.
export const changedRowId = (change: FeedChange): string =>
  change.type === 'upsert' ? change.update.id : change.id;

// Gives a change its revision and a new row its position, and works out the stream events; the result is checked against the row's kind.
export function applyFeedChange(
  feed: Feed,
  change: FeedChange,
  turnId: string | null,
): FeedChangeResult {
  const id = changedRowId(change);
  const existing = feed.rows[id];
  const revision = feed.maxRevision + 1;

  const accept = (
    candidate: Record<string, unknown> & { sessionUpdate: SessionUpdateKind },
    toStreamEvent: (row: SessionUpdate) => FeedStreamEvent,
  ): FeedChangeResult => {
    const row = SessionUpdate.safeParse(candidate);
    if (!row.success)
      return {
        rejection: `row ${id} does not match ${candidate.sessionUpdate}: ${z.prettifyError(row.error)}`,
      };
    if (
      existing?.sessionUpdate === 'tool_call_update' &&
      row.data.sessionUpdate === 'tool_call_update' &&
      (existing._meta?.argo?.permissionOutcome ||
        row.data._meta?.argo?.permissionOutcome)
    )
      row.data = {
        ...row.data,
        _meta: {
          ...existing._meta,
          ...row.data._meta,
          argo: {
            ...existing._meta?.argo,
            ...row.data._meta?.argo,
            permissionOutcome:
              existing._meta?.argo?.permissionOutcome ??
              row.data._meta?.argo?.permissionOutcome,
          },
        },
      };
    return {
      feed: {
        ...feed,
        maxRevision: revision,
        nextPosition: existing ? feed.nextPosition : feed.nextPosition + 1,
        rows: { ...feed.rows, [id]: row.data },
      },
      streamEvent: toStreamEvent(row.data),
    };
  };

  switch (change.type) {
    case 'upsert': {
      if (existing && existing.sessionUpdate !== change.update.sessionUpdate)
        return {
          rejection: `row ${id} is ${existing.sessionUpdate}, not ${change.update.sessionUpdate}`,
        };
      return accept(
        {
          ...change.update,
          sessionId: feed.sessionId,
          position: existing?.position ?? feed.nextPosition,
          revision,
          turnId: existing ? existing.turnId : turnId,
        },
        (row): RowUpsert => ({ type: 'row.upsert', rev: revision, row }),
      );
    }
    case 'append': {
      if (!existing) return { rejection: `no row ${id}` };
      const path = change.field.split('.');
      if (envelopeFields.has(path[0] ?? ''))
        return { rejection: `${change.field} of row ${id} is set by the Feed` };
      const current = readFeedField(existing, path);
      if (typeof current !== 'string')
        return { rejection: `${change.field} of row ${id} is not a string` };
      return accept(
        {
          ...existing,
          ...writeFeedRowField(existing, change.field, current + change.text),
          revision,
        },
        (): RowAppend => ({
          type: 'row.append',
          rev: revision,
          id,
          field: change.field,
          off: current.length,
          text: change.text,
        }),
      );
    }
    case 'patch': {
      if (!existing) return { rejection: `no row ${id}` };
      const envelopeField = Object.keys(change.set).find((key): boolean =>
        envelopeFields.has(key),
      );
      if (envelopeField)
        return {
          rejection: `${envelopeField} of row ${id} is set by the Feed`,
        };
      return accept(
        { ...existing, ...change.set, revision },
        (row): RowPatch => ({
          type: 'row.patch',
          rev: revision,
          id,
          set: Object.hasOwn(change.set, '_meta')
            ? { ...change.set, _meta: row._meta }
            : change.set,
        }),
      );
    }
  }
}
