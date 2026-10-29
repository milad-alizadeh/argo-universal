import type {
  ContentBlock,
  SessionSnapshot,
  Subagent,
  SubagentUpdate,
} from '@repo/contracts';
import type { FeedSubagent } from '../src/features/feed/view/feed-view';
import { toFeedView } from '../src/features/feed/view/to-feed-view';
import { recordedFeedMock } from '../src/lib/product/feed-message.mocks';

const parentSessionId = 'parent-session';

export const exploreSessionId = 'subagent-explore';

const text = (value: string): ContentBlock[] => [{ type: 'text', text: value }];

// The Agent's own name for the child, which the Feed row and the Subagents list both show.
export const exploreTitle = 'Explore';

export const explorePrompt =
  'Find every place that reads feed rows by index instead of position, and list them with file and line.';

export const exploreMessage = 'Skip the tests folder.';

export const exploreResult =
  'Three readers page backwards: the Feed actor’s page handler, the snapshot reader and the held Feed.';

const subagentRow = (
  position: number,
  id: string,
  fields: Partial<SubagentUpdate>,
): SubagentUpdate => ({
  id,
  sessionId: parentSessionId,
  position,
  revision: position,
  turnId: 'turn-1',
  state: 'settled',
  sessionUpdate: 'subagent_update',
  subagentSessionId: exploreSessionId,
  ...fields,
});

// Only the spawn row names the child, so only it takes the other child's name.
const retitled = (row: SubagentUpdate, title: string): SubagentUpdate =>
  row.title === undefined ? row : { ...row, title };

// The same five actions against another child, for a Session whose Subagents list names its own.
export const subagentRowsFor = (
  subagentSessionId: string,
  title: string,
): SubagentUpdate[] =>
  subagentRows.map((row) => ({
    ...retitled(row, title),
    id: `${subagentSessionId}-${row.id}`,
    subagentSessionId,
  }));

export const spawnRow = subagentRow(1, 'spawn-explore', {
  title: exploreTitle,
  subagentState: 'running',
  _meta: { argo: { action: 'spawn' } },
});

// The Agent's first message after a spawn is the prompt the child started on.
export const spawnPromptRow = subagentRow(2, 'message-explore-prompt', {
  _meta: { argo: { action: 'message', prompt: text(explorePrompt) } },
});

// A state change on its own says nothing the Subagents list does not already say.
export const stateOnlyRow = subagentRow(3, 'state-explore', {
  subagentState: 'requires_action',
});

export const messageRow = subagentRow(4, 'message-explore-later', {
  _meta: { argo: { action: 'message', prompt: text(exploreMessage) } },
});

export const resultRow = subagentRow(5, 'result-explore', {
  _meta: { argo: { result: text(exploreResult) } },
});

export const subagentRows: SubagentUpdate[] = [
  spawnRow,
  spawnPromptRow,
  stateOnlyRow,
  messageRow,
  resultRow,
];

const explore: Subagent = {
  sessionId: exploreSessionId,
  parentSessionId,
  readOnly: true,
  toolCallId: null,
  title: exploreTitle,
  role: 'Explore',
  model: 'Sonnet 4.5',
  state: 'running',
  stopReason: null,
  startedAt: null,
  endedAt: null,
  durationMs: null,
  tokens: null,
};

const recordedSnapshot = recordedFeedMock(
  'agent-1',
  'edit-and-command',
).snapshot;

export const subagentSnapshot: SessionSnapshot = {
  ...recordedSnapshot,
  subagents: [explore],
};

// A Session whose Subagents the snapshot does not list yet, so the rows name the child by themselves.
export const unknownSubagentSnapshot: SessionSnapshot = {
  ...recordedSnapshot,
  subagents: [],
};

// The rows the real converter makes from the recorded actions, in Feed order.
const subagentItems: FeedSubagent[] = toFeedView(
  subagentRows,
  subagentSnapshot,
).items.flatMap((item) => (item.type === 'subagent' ? [item] : []));

export const subagentItemOf = (kind: FeedSubagent['kind']): FeedSubagent => {
  const item = subagentItems.find((candidate) => candidate.kind === kind);

  if (!item) throw new Error(`Recorded catalog needs a ${kind} Subagent row`);

  return item;
};
