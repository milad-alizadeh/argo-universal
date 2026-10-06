import {
  type FeedMock,
  newSessionCatalogs,
  recordedFeedMocks,
} from '@repo/api/mocks';
import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { createFeedMocks } from './feed-mock';
import { type Fixtures, pending } from './trpc-mock-link';

const catalogAgent = (() => {
  const [agent] = newSessionCatalogs.bothAvailable;
  if (!agent) throw new Error('No Agent in the catalog mock');
  return agent;
})();

function recorded(agent: string, recording: string) {
  const mock = recordedFeedMocks.find(
    (mock) => mock.agent === agent && mock.recording === recording,
  );
  if (!mock) throw new Error(`No recorded Feed ${agent}/${recording}`);
  return mock;
}

// The tail page holds every row, so the subscription sends only this snapshot.
function settled(
  mock: FeedMock,
  snapshot: Partial<SessionSnapshot> = {},
): FeedMock {
  const full: SessionSnapshot = {
    ...mock.snapshot,
    // The catalog's Agent, so the Composer shows its name and options.
    agent: catalogAgent.agent,
    configOptions: catalogAgent.configOptions,
    ...snapshot,
  };
  return {
    ...mock,
    snapshot: full,
    stream: [{ type: 'snapshot', snapshot: full }],
  };
}

function sessionMocks(mock: FeedMock): Fixtures {
  return {
    ...createFeedMocks(mock),
    'agents.list': () => newSessionCatalogs.bothAvailable,
    'session.prompt': () => ({ messageId: 'message-sent' }),
    'session.cancel': () => ({}),
    'session.setConfigOption': () => ({ configOptions: [] }),
  };
}

const commands = recorded('agent-1', 'edit-and-command');
const recordedHeader = commands.liveHeaders.findLast(
  (header) => header.startedAt !== null && header.source.type === 'tool_call',
);
if (!recordedHeader) throw new Error('No running live header recorded');
export const runningHeader = recordedHeader;

// A clock four minutes and twelve seconds into the running Turn.
export const sessionNow = (runningHeader.startedAt ?? 0) + 252_000;

const runningFeed = settled(commands, {
  state: 'running',
  liveHeader: runningHeader,
  activeTurnId: 'turn-running',
});
export const runningSessionMocks = sessionMocks(runningFeed);

const idleFeed = settled(recorded('agent-2', 'markdown-answer'));
export const idleSessionMocks = sessionMocks(idleFeed);

export const emptySessionMocks = sessionMocks(
  settled({ ...commands, rows: [] }, { title: 'New Session', maxRevision: 0 }),
);

// Only the oldest page holds this recording, and only the arriving row holds the other, so their text marks each one.
const oldest = recorded('agent-2', 'compaction');
const arriving = recorded('agent-2', 'command-outcomes');

function messageText(mock: FeedMock, kind: 'user_message' | 'agent_message') {
  const row = mock.rows.find((row) => row.sessionUpdate === kind);
  const [block] = row && 'content' in row ? row.content : [];
  if (block?.type !== 'text') throw new Error(`No ${kind} recorded`);
  return block.text;
}

// The Long Feed's first message, which only the oldest page holds.
export const oldestMessage = messageText(oldest, 'user_message');

// Each recording's rows as one more copy, with ids and positions after the copies before it.
const copyRows = (mock: FeedMock, copy: number) =>
  mock.rows.map((row) => ({
    ...row,
    id: `${copy}-${row.id}`,
    position: copy * 1000 + row.position,
    ...('toolCallId' in row ? { toolCallId: `${copy}-${row.toolCallId}` } : {}),
  })) as SessionUpdate[];

// The oldest recording, then every other recording seven times over, so the Feed spans several pages.
const repeated = Array.from({ length: 7 }, () =>
  recordedFeedMocks.filter((mock) => mock !== oldest && mock !== arriving),
).flat();
const longRows = [oldest, ...repeated].flatMap(copyRows);

const longFeed = settled(
  { ...commands, rows: longRows },
  { maxRevision: Math.max(...longRows.map((row) => row.revision)) },
);
export const longSessionMocks = sessionMocks(longFeed);

const { 'feed.page': longPage } = createFeedMocks(longFeed);

// The newest page arrives; the page before it never does.
export const loadingOlderSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.page': (input) =>
    input.direction === 'before' ? pending()() : longPage(input),
};

// The row the Agent sends while the reader is scrolled up.
export const arrivingMessage = messageText(arriving, 'agent_message');
const lastRow = longRows.at(-1);
const message = arriving.rows.find(
  (row) => row.sessionUpdate === 'agent_message',
);
if (!lastRow || !message) throw new Error('No arriving message recorded');
const arrivingRow: SessionUpdate = {
  ...message,
  id: 'arriving-row',
  position: lastRow.position + 1,
  revision: longFeed.snapshot.maxRevision + 1,
};

let releaseArrivingRow = () => {};
// Sends the arriving row, once a test has scrolled away from the end.
export const sendArrivingRow = () => releaseArrivingRow();

export const arrivingRowSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.subscribe': async function* () {
    releaseArrivingRow = () => {};
    yield { type: 'snapshot', snapshot: longFeed.snapshot };
    await new Promise<void>((resolve) => {
      releaseArrivingRow = resolve;
    });
    yield { type: 'row.upsert', rev: arrivingRow.revision, row: arrivingRow };
  },
};

const feedFor = ({ sessionId }: { sessionId: string }) =>
  createFeedMocks(sessionId === 'session-2' ? idleFeed : runningFeed);

// `session-1` is the running recording and `session-2` the idle one, so a story can switch between them.
export const twoSessionMocks: Fixtures = {
  ...runningSessionMocks,
  'feed.page': (input) => feedFor(input)['feed.page'](input),
  'feed.row': (input) => feedFor(input)['feed.row'](input),
  'feed.subscribe': (input) => feedFor(input)['feed.subscribe'](input),
};
