import type { SessionUpdate } from '@repo/contracts';
import { expect, it } from 'vitest';
import { workMocks } from '../../../../mocks/feed-view.mocks';
import {
  type FeedTranslator,
  toFeedView,
  translateFeed,
  translatingFeed,
} from './to-feed-view';
import { translateTurn } from './translate-turn';

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

// The Feed's translator, and how many rows it has asked the Turn translator for: it asks of each Turn it draws again.
interface CountingFeed {
  translate: FeedTranslator;
  translated: () => number;
}

function countingFeed(): CountingFeed {
  let total = 0;

  const translate = translatingFeed((turn, snapshot, folded) => {
    total += turn.length;

    return translateTurn(turn, snapshot, folded);
  });

  return { translate, translated: () => total };
}

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
  const counting = countingFeed();

  const next = counting.translate(
    withStreamedChunk('one more'),
    snapshot,
    first.turns,
  );

  expect(counting.translated()).toBe(lastTurn);
  expect(next.view.items).toHaveLength(first.view.items.length);
});

it('translates nothing when no row changed', () => {
  const first = translateFeed(rows, snapshot);
  const counting = countingFeed();

  counting.translate([...rows], snapshot, first.turns);

  expect(counting.translated()).toBe(0);
});

it('draws the same items as translating every row again', () => {
  const first = translateFeed(rows, snapshot);
  const streamed = withStreamedChunk('one more');

  expect(translateFeed(streamed, snapshot, first.turns).view).toEqual(
    toFeedView(streamed, snapshot),
  );
});
