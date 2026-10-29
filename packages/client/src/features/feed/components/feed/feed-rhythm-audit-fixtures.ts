import { permissionMock } from '../../../../../mocks/requests/recorded-requests';
import {
  recordedFeedMock,
  recordedPrompt,
} from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';

function items(recording: string): FeedViewItem[] {
  const mock = recordedFeedMock('agent-1', recording);

  return toFeedView(mock.rows, mock.snapshot).items;
}

const mixed = items('edit-and-command');

const agentMessages = [...mixed, ...items('compaction')].filter(
  (item) => item.type === 'row' && item.row.sessionUpdate === 'agent_message',
);

const users: FeedViewItem[] = [
  ...mixed.filter(
    (item) => item.type === 'row' && item.row.sessionUpdate === 'user_message',
  ),
  { type: 'row', row: recordedPrompt('agent-1', 'markdown-prompt') },
];

const permission = toFeedView(
  permissionMock.pending.rows,
  permissionMock.pending.snapshot,
).items;

const activities = [...mixed, ...permission].filter(
  (item) => item.type !== 'row' && item.type !== 'thought',
);

export interface RhythmAudit {
  items: FeedViewItem[];
  compact: number[];
  wide: number[];
}

// Recorded content, with expected spaces from the existing role/paragraph/activity hierarchy.
export const rhythmAudits = {
  transitions: { items: mixed, compact: [24, 24], wide: [20, 20] },
  paragraphs: { items: agentMessages, compact: [12], wide: [10] },
  activity: { items: activities, compact: [8], wide: [6] },
  users: { items: users, compact: [24], wide: [20] },
  permission: { items: permission, compact: [24], wide: [20] },
  markdown: {
    items: items('markdown-answer'),
    compact: [24],
    wide: [20],
  },
  attachments: {
    items: items('image-prompt'),
    compact: [24],
    wide: [20],
  },
} satisfies Record<string, RhythmAudit>;
