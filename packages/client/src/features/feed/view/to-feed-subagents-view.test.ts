import { expect, it } from 'vitest';
import {
  exploreMessage,
  explorePrompt,
  exploreResult,
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
      text: explorePrompt,
    },
    {
      type: 'subagent',
      id: messageRow.id,
      subagentSessionId: exploreSessionId,
      kind: 'messaged',
      title: exploreTitle,
      role: 'Explore',
      text: exploreMessage,
    },
    {
      type: 'subagent',
      id: resultRow.id,
      subagentSessionId: exploreSessionId,
      kind: 'replied',
      title: exploreTitle,
      role: 'Explore',
      text: exploreResult,
    },
  ]);
});

it('draws no row for a Subagent state change', () => {
  expect(subagentItems([stateOnlyRow])).toEqual([]);
});

it('keeps a prompt that arrives without a spawn as its own Messaged row', () => {
  expect(subagentItems([spawnPromptRow])).toEqual([
    expect.objectContaining({ kind: 'messaged', text: explorePrompt }),
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

it('shows only the first line of a long prompt', () => {
  const multiline = {
    ...spawnPromptRow,
    _meta: {
      argo: {
        action: 'message' as const,
        prompt: [
          { type: 'text' as const, text: `${exploreMessage}\nAnd more` },
        ],
      },
    },
  };

  expect(subagentItems([spawnRow, multiline])).toEqual([
    expect.objectContaining({ kind: 'started', text: exploreMessage }),
  ]);
});
