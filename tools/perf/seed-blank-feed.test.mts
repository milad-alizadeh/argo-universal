import { expect, it } from 'vitest';
import { blankFeed } from './seed-feed.mts';

const feed = blankFeed('session-1', 7, 10_000);

it('seeds the requested number of rows, each in order and with its own id', () => {
  expect(feed.rows.map((row) => row.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(new Set(feed.rows.map((row) => row.id)).size).toBe(7);
});

it('holds only messages, every one of them with empty text', () => {
  expect(new Set(feed.rows.map((row) => row.sessionUpdate))).toEqual(
    new Set(['user_message', 'agent_thought', 'agent_message']),
  );

  for (const row of feed.rows)
    expect(row.payload).toEqual({
      messageId: row.id,
      content: [{ type: 'text', text: '' }],
    });
});

it('gives every row a Turn that ended', () => {
  const turnIds = new Set(feed.turns.map((turn) => turn.id));

  expect(feed.rows.every((row) => row.turnId && turnIds.has(row.turnId))).toBe(
    true,
  );
  expect(feed.turns.every((turn) => turn.status === 'ended')).toBe(true);
});
