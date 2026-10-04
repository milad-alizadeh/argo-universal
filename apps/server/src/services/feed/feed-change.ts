import {
  type FeedChange,
  type RowAppend,
  type RowPatch,
  type RowUpsert,
  SessionUpdate,
} from '@repo/contracts';
import { z } from 'zod';

// The part of a Session's Feed that the Feed actor holds in memory (spec 0002 section 8).
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

export interface FeedChangeResult {
  feed: Feed;
  streamEvents: FeedStreamEvent[];
  // Why the change was refused; a refused change leaves `feed` as it was.
  rejection: string | null;
}

// The Feed sets these, so a patch or an append cannot; `state` is the row's own.
const envelopeFields = new Set([
  'id',
  'sessionId',
  'position',
  'revision',
  'turnId',
  'sessionUpdate',
]);

const reject = (feed: Feed, rejection: string): FeedChangeResult => ({
  feed,
  streamEvents: [],
  rejection,
});

// The value at a dotted path such as `content.0.text`, or undefined when the path leads nowhere.
function readField(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (Array.isArray(current) && /^\d+$/.test(key))
      current = current[Number(key)];
    else if (
      current !== null &&
      typeof current === 'object' &&
      Object.hasOwn(current, key)
    )
      current = (current as Record<string, unknown>)[key];
    else return undefined;
  }
  return current;
}

// A copy of `value` with `text` at a path that `readField` resolved.
function writeField(
  value: unknown,
  [key, ...rest]: readonly string[],
  text: string,
): unknown {
  if (key === undefined) return text;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[Number(key)] = writeField(value[Number(key)], rest, text);
    return copy;
  }
  const record = value as Record<string, unknown>;
  return { ...record, [key]: writeField(record[key], rest, text) };
}

// The id of the row a change touches.
export const changedRowId = (change: FeedChange) =>
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
    candidate: Record<string, unknown> & { sessionUpdate: string },
    toStreamEvent: (row: SessionUpdate) => FeedStreamEvent,
  ): FeedChangeResult => {
    const row = SessionUpdate.safeParse(candidate);
    if (!row.success)
      return reject(
        feed,
        `row ${id} does not match ${candidate.sessionUpdate}: ${z.prettifyError(row.error)}`,
      );
    return {
      feed: {
        ...feed,
        maxRevision: revision,
        nextPosition: existing ? feed.nextPosition : feed.nextPosition + 1,
        rows: { ...feed.rows, [id]: row.data },
      },
      streamEvents: [toStreamEvent(row.data)],
      rejection: null,
    };
  };

  switch (change.type) {
    case 'upsert': {
      if (existing && existing.sessionUpdate !== change.update.sessionUpdate)
        return reject(
          feed,
          `row ${id} is ${existing.sessionUpdate}, not ${change.update.sessionUpdate}`,
        );
      return accept(
        {
          ...change.update,
          sessionId: feed.sessionId,
          position: existing?.position ?? feed.nextPosition,
          revision,
          turnId: existing ? existing.turnId : turnId,
        },
        (row) => ({ type: 'row.upsert', rev: revision, row }),
      );
    }
    case 'append': {
      if (!existing) return reject(feed, `no row ${id}`);
      const path = change.field.split('.');
      if (envelopeFields.has(path[0] ?? ''))
        return reject(feed, `${change.field} of row ${id} is set by the Feed`);
      const current = readField(existing, path);
      if (typeof current !== 'string')
        return reject(feed, `${change.field} of row ${id} is not a string`);
      return accept(
        {
          ...(writeField(
            existing,
            path,
            current + change.text,
          ) as SessionUpdate),
          revision,
        },
        () => ({
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
      if (!existing) return reject(feed, `no row ${id}`);
      const envelopeField = Object.keys(change.set).find((key) =>
        envelopeFields.has(key),
      );
      if (envelopeField)
        return reject(feed, `${envelopeField} of row ${id} is set by the Feed`);
      return accept({ ...existing, ...change.set, revision }, () => ({
        type: 'row.patch',
        rev: revision,
        id,
        set: change.set,
      }));
    }
  }
}
