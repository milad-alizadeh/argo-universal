import type { AgentMessage, UserMessage } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  recordedAgentMessage,
  recordedUserMessage,
} from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { isDrawnFeedItem } from '../drawn-feed-item';
import { type FeedEntry, spaceBelowEntry } from './feed-entry';

const agentText = recordedAgentMessage('agent-1', 'edit-and-command');

const prompt = recordedUserMessage('agent-1', 'edit-and-command');

const row = (
  message: AgentMessage | UserMessage,
  id: string,
): FeedViewItem => ({
  type: 'row',
  row: { ...message, id },
});

const blank = (id: string): FeedViewItem => ({
  type: 'row',
  row: {
    ...agentText,
    id,
    state: 'settled',
    content: [{ type: 'text', text: '\n' }],
  },
});

const idOf = (item: FeedEntry): string | undefined =>
  item.type === 'row' ? item.row.id : undefined;

// The Feed's own steps: what is drawn, then the space each drawn row leaves below it.
interface DrawnSpacing {
  ids: (string | undefined)[];
  gaps: string[];
}

function gapsBetweenDrawn(items: FeedViewItem[]): DrawnSpacing {
  const entries: FeedEntry[] = items.filter(isDrawnFeedItem);

  return {
    ids: entries.map(idOf),
    gaps: entries.map((entry, index) =>
      spaceBelowEntry(entry, entries[index + 1]),
    ),
  };
}

it('leaves no space for a message that draws nothing, so a prompt has the same space either side', () => {
  const items = [
    row(agentText, 'before'),
    blank('empty-before'),
    row(prompt, 'prompt'),
    blank('empty-after'),
    row(agentText, 'after'),
  ];

  const { ids, gaps } = gapsBetweenDrawn(items);

  expect(items.map(idOf)).toContain('empty-before');

  expect(ids).toEqual(['before', 'prompt', 'after']);

  expect(gaps[0]).toBe(gaps[1]);
});
