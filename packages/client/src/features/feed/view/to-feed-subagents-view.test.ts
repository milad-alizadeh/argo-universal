import { expect, it } from 'vitest';
import {
  exploreSessionId,
  exploreTitle,
  messageRow,
  resultRow,
  spawnPromptRow,
  spawnRow,
  stateOnlyRow,
  subagentRows,
  subagentSnapshot,
  unknownSubagentSnapshot,
} from '../../../../mocks/subagent-rows.mocks';
import type { FeedSubagent } from './feed-view';
import { toFeedView } from './to-feed-view';

const subagentItems = (
  rows: typeof subagentRows,
  snapshot = subagentSnapshot,
): FeedSubagent[] =>
  toFeedView(rows, snapshot).items.flatMap((item) =>
    item.type === 'subagent' ? [item] : [],
  );

it('draws one row per Subagent action', () => {
  expect(subagentItems(subagentRows)).toEqual([
    {
      type: 'subagent',
      id: spawnRow.id,
      subagentSessionId: exploreSessionId,
      kind: 'started',
      title: exploreTitle,
      role: 'Explore',
    },
    {
      type: 'subagent',
      id: messageRow.id,
      subagentSessionId: exploreSessionId,
      kind: 'messaged',
      title: exploreTitle,
      role: 'Explore',
    },
    {
      type: 'subagent',
      id: resultRow.id,
      subagentSessionId: exploreSessionId,
      kind: 'replied',
      title: exploreTitle,
      role: 'Explore',
    },
  ]);
});

it('draws no row for a Subagent state change', () => {
  expect(subagentItems([stateOnlyRow])).toEqual([]);
});

it('keeps a prompt that arrives without a spawn as its own Messaged row', () => {
  expect(subagentItems([spawnPromptRow])).toEqual([
    expect.objectContaining({ kind: 'messaged' }),
  ]);
});

it('draws a reply that carries no text', () => {
  const silent = { ...resultRow, _meta: { argo: { result: [] } } };

  expect(subagentItems([spawnRow, silent])).toEqual([
    expect.objectContaining({ kind: 'started' }),
    expect.objectContaining({ kind: 'replied' }),
  ]);
});

it('starts a Subagent the snapshot does not list yet from its own row', () => {
  const [started] = subagentItems(
    [spawnRow, spawnPromptRow],
    unknownSubagentSnapshot,
  );

  expect(started).toEqual(
    expect.objectContaining({ title: exploreTitle, role: null }),
  );
});

it('folds the prompt a child started on into its Started row', () => {
  expect(subagentItems([spawnRow, spawnPromptRow])).toEqual([
    expect.objectContaining({ kind: 'started' }),
  ]);
});

it('folds the first message after a spawn even when it carries no words', () => {
  const empty = {
    ...spawnPromptRow,
    _meta: { argo: { action: 'message' as const } },
  };

  expect(subagentItems([spawnRow, empty])).toEqual([
    expect.objectContaining({ kind: 'started' }),
  ]);
});
