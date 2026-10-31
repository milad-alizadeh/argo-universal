import { describe, expect, it } from 'vitest';
import { blankedFeed, seededFeed, type SeededFeed } from './seed-feed.mts';

const size = { rows: 40 };

const messages = new Set(['user_message', 'agent_thought', 'agent_message']);

const messageRows = (feed: SeededFeed): SeededFeed['rows'] =>
  feed.rows.filter((row) => messages.has(row.sessionUpdate));

const otherRows = (feed: SeededFeed): SeededFeed['rows'] =>
  feed.rows.filter((row) => !messages.has(row.sessionUpdate));

type Row = SeededFeed['rows'][number];

const identity = ({
  id,
  sessionUpdate,
  position,
}: Row): (string | number)[] => [id, sessionUpdate, position];

const payload = (row: Row): Row['payload'] => row.payload;

describe('a blanked Feed', async () => {
  const recorded = await seededFeed('session-1', size, 10_000);
  const blank = await blankedFeed('session-1', size, 10_000);

  it('keeps every row and Turn of the recorded Feed', () => {
    expect(blank.turns).toEqual(recorded.turns);
    expect(blank.rows.map(identity)).toEqual(recorded.rows.map(identity));
  });

  it('holds no text in any prompt, thought or answer', () => {
    expect(messageRows(blank)).not.toHaveLength(0);
    expect(JSON.stringify(messageRows(blank).map(payload))).not.toMatch(
      /"text":"[^"]/u,
    );
  });

  it('leaves Tool calls and compaction rows as recorded', () => {
    expect(otherRows(blank)).not.toHaveLength(0);
    expect(otherRows(blank).map(payload)).toEqual(
      otherRows(recorded).map(payload),
    );
  });
});
