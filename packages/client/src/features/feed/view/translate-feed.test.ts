import type { SessionUpdate } from '@repo/contracts';
import { expect, it, vi } from 'vitest';
import { workMocks } from '../../../../mocks/feed-view.mocks';
import { toFeedView, translateFeed } from './to-feed-view';
import { translateTurn } from './translate-turn';

// What the Feed is asked to translate, counted at the Turn translator the Feed calls for each Turn it draws again.
vi.mock('./translate-turn', async (importOriginal) => {
  const original = await importOriginal<typeof import('./translate-turn')>();

  return {
    translateTurn: vi.fn<typeof original.translateTurn>(original.translateTurn),
  };
});

const recorded = workMocks[0];

if (!recorded) throw new Error('Recorded catalog needs an edit-and-command');

const { snapshot } = recorded;

// The recording once per Turn, with every id its own, until the Feed holds a thousand rows.
const copies = Math.ceil(1000 / recorded.rows.length);

const copy = (turn: number): SessionUpdate[] =>
  recorded.rows.map((row) => ({
    ...row,
    id: `${turn}-${row.id}`,
    turnId: `turn-${turn}`,
    position: turn * 1000 + row.position,
    ...('toolCallId' in row && { toolCallId: `${turn}-${row.toolCallId}` }),
  }));

const rows = Array.from({ length: copies }, (_unused, turn) =>
  copy(turn),
).flat();

const lastTurn = copy(copies - 1).length;

const translatedRows = (): number =>
  vi
    .mocked(translateTurn)
    .mock.calls.reduce((total, [turn]) => total + turn.length, 0);

// A chunk of streamed text replaces the newest row with a new object; the reducer keeps every other row as it was.
function withStreamedChunk(text: string): SessionUpdate[] {
  const newest = rows.at(-1);

  if (newest?.sessionUpdate !== 'agent_message') throw new Error('Needs text');

  return [
    ...rows.slice(0, -1),
    { ...newest, content: [{ type: 'text', text }] },
  ];
}

it('translates only the Turn a streamed chunk changed in a 1000-row Feed', () => {
  expect(rows.length).toBeGreaterThanOrEqual(1000);
  const first = translateFeed(rows, snapshot);
  vi.mocked(translateTurn).mockClear();

  const next = translateFeed(
    withStreamedChunk('one more'),
    snapshot,
    first.turns,
  );

  expect(translatedRows()).toBe(lastTurn);
  expect(next.view.items).toHaveLength(first.view.items.length);
});

it('translates nothing when no row changed', () => {
  const first = translateFeed(rows, snapshot);
  vi.mocked(translateTurn).mockClear();

  translateFeed([...rows], snapshot, first.turns);

  expect(translatedRows()).toBe(0);
});

it('draws the same items as translating every row again', () => {
  const first = translateFeed(rows, snapshot);
  const streamed = withStreamedChunk('one more');

  expect(translateFeed(streamed, snapshot, first.turns).view).toEqual(
    toFeedView(streamed, snapshot),
  );
});
