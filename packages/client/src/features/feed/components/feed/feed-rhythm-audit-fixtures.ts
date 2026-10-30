import type { LiveHeader, Notice, SessionUpdate } from '@repo/contracts';
import { commandRow, workMocks } from '../../../../../mocks/feed-view.mocks';
import { permissionMock } from '../../../../../mocks/requests/recorded-requests';
import {
  recordedFeedMock,
  recordedPrompt,
} from '../../../../lib/product/feed-message.mocks';
import type { FeedViewItem } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';
import { liveHeaderNow, thoughtHeader } from '../live-header/live-header.mocks';

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

/*
 * An error Notice and a finished Compaction draw the Feed's status row, beside the Tool calls
 * they report on. They take the activity rhythm, not the space between one message and the next.
 */
function statusRows(): FeedViewItem[] {
  const work = workMocks[0];

  if (!work) throw new Error('Recordings need Agent work');

  const command = commandRow(work.rows);

  const notice: Notice = {
    ...noticeFields(command),
    sessionUpdate: 'notice',
    severity: 'error',
    title: 'The Agent lost its connection',
  };

  return toFeedView(
    [command, notice, { ...command, id: 'command-after-notice' }],
    work.snapshot,
  ).items;
}

function noticeFields(
  command: SessionUpdate,
): Pick<
  Notice,
  'id' | 'sessionId' | 'turnId' | 'position' | 'revision' | 'state'
> {
  return {
    id: 'standalone-notice',
    sessionId: command.sessionId,
    turnId: command.turnId,
    position: command.position,
    revision: command.revision,
    state: 'settled',
  };
}

export interface RhythmAudit {
  items: FeedViewItem[];
  compact: number[];
  wide: number[];
  // The Turn's live line, drawn as the Feed's last row while the Agent works.
  liveHeader?: LiveHeader;
  now?: number;
}

// A Turn still running: its live line is the last row, below the work already drawn.
const streaming = items('edit-and-command');

// The clamped prompt and the answer below it, for the space "Show more" must leave intact.
export const expansionItems: FeedViewItem[] = [
  { type: 'row', row: recordedPrompt('agent-1', 'markdown-prompt') },
  ...items('markdown-answer').filter(
    (item) => item.type === 'row' && item.row.sessionUpdate === 'agent_message',
  ),
];

// Recorded content, with expected spaces from the existing role/paragraph/activity hierarchy.
export const rhythmAudits = {
  transitions: { items: mixed, compact: [24, 24], wide: [20, 20] },
  paragraphs: { items: agentMessages, compact: [12], wide: [10] },
  activity: { items: activities, compact: [8], wide: [6] },
  users: { items: users, compact: [24], wide: [20] },
  permission: { items: permission, compact: [24], wide: [20] },
  statuses: { items: statusRows(), compact: [8, 8], wide: [6, 6] },
  streaming: {
    items: streaming,
    compact: [24, 24, 24],
    wide: [20, 20, 20],
    liveHeader: thoughtHeader,
    now: liveHeaderNow,
  },
  expansion: { items: expansionItems, compact: [24], wide: [20] },
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
