import { expect, it } from 'vitest';
import { blankedFeed, seededFeed } from './seed-feed.mts';

const size = { rows: 40 };

it('keeps every row and Turn of the recorded Feed', async () => {
  const recorded = await seededFeed('session-1', size, 10_000);
  const blank = await blankedFeed('session-1', size, 10_000);

  expect(blank.turns).toEqual(recorded.turns);
  expect(
    blank.rows.map(({ id, sessionUpdate, position }) => [
      id,
      sessionUpdate,
      position,
    ]),
  ).toEqual(
    recorded.rows.map(({ id, sessionUpdate, position }) => [
      id,
      sessionUpdate,
      position,
    ]),
  );
});

it('empties the text of every message and leaves other rows as recorded', async () => {
  const recorded = await seededFeed('session-1', size, 10_000);
  const blank = await blankedFeed('session-1', size, 10_000);
  const messages = ['user_message', 'agent_thought', 'agent_message'];

  blank.rows.forEach((row, index) => {
    if (messages.includes(row.sessionUpdate))
      expect(JSON.stringify(row.payload)).not.toMatch(/"text":"[^"]/u);
    else expect(row.payload).toEqual(recorded.rows[index]?.payload);
  });
  expect(
    new Set(blank.rows.map((row) => row.sessionUpdate)).size,
  ).toBeGreaterThan(3);
});
