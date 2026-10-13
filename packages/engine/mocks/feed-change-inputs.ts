import type { FeedChange } from '@repo/contracts';
import type {
  AgentMessage,
  FeedUpdate,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { type Feed, type FeedStreamEvent } from '../src/feed';
export const firstMessageRowId = 'message-1#0';

export const messageTextField = 'content.0.text';

export const message = (
  overrides: Partial<AgentMessage> = {},
): AgentMessage => ({
  id: firstMessageRowId,
  sessionId: 'session-1',
  position: 3,
  revision: 7,
  turnId: 'turn-1',
  state: 'open',
  sessionUpdate: 'agent_message',
  messageId: 'message-1',
  content: [{ type: 'text', text: 'Hello' }],
  ...overrides,
});

const commandRow: ToolCallUpdate = {
  id: 'tool-1',
  sessionId: 'session-1',
  position: 4,
  revision: 8,
  turnId: 'turn-1',
  state: 'open',
  sessionUpdate: 'tool_call_update',
  toolCallId: 'tool-1',
  title: 'pnpm test',
  kind: 'execute',
  status: 'in_progress',
  content: [{ type: 'terminal', command: 'pnpm test', output: 'ok\n' }],
};
export const command = (
  overrides: Partial<ToolCallUpdate> = {},
): ToolCallUpdate => ({ ...commandRow, ...overrides });

export const feedWith = (...rows: SessionUpdate[]): Feed => ({
  sessionId: 'session-1',
  maxRevision: 8,
  nextPosition: 5,
  rows: Object.fromEntries(
    rows.map((row): [string, SessionUpdate] => [row.id, row]),
  ),
});

const messageUpdate = (row: AgentMessage): FeedUpdate => ({
  id: row.id,
  state: row.state,
  sessionUpdate: row.sessionUpdate,
  messageId: row.messageId,
  content: row.content,
});
const toolUpdate = (row: ToolCallUpdate): FeedUpdate => ({
  id: row.id,
  state: row.state,
  sessionUpdate: row.sessionUpdate,
  toolCallId: row.toolCallId,
  title: row.title,
  kind: row.kind,
  status: row.status,
  content: row.content,
});
export const update = (row: AgentMessage | ToolCallUpdate): FeedUpdate =>
  row.sessionUpdate === 'agent_message' ? messageUpdate(row) : toolUpdate(row);

export const expectedStreamEvent = (
  row: SessionUpdate,
  event: FeedStreamEvent | undefined,
): FeedStreamEvent => event ?? { type: 'row.upsert', rev: 9, row };

export interface Accepted {
  name: string;
  rows: SessionUpdate[];
  change: FeedChange;
  turnId?: string | null;
  // The changed row; the change takes revision 9.
  rowAfter: SessionUpdate;
  // Defaults to an upsert of `rowAfter`.
  streamEvent?: FeedStreamEvent;
}
