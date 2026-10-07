import {
  type FeedMock,
  newSessionCatalogs,
  recordedFeedMocks,
} from '@repo/api/mocks';
import type { SessionSnapshot, SessionUpdate } from '@repo/contracts';
import { recordedFeedMock, recordedUserMessage } from './feed-message-mock';
import { createFeedMocks } from './feed-mock';
import { createSubscriptionPublisher } from './subscription-publisher';
import { completedCommand } from './tool-call-mock';
import { type Fixtures, pending } from './trpc-mock-link';

const catalogAgent = (() => {
  const [agent] = newSessionCatalogs.bothAvailable;
  if (!agent) throw new Error('No Agent in the catalog mock');
  return agent;
})();

// The tail page holds every row, so the subscription sends only this snapshot.
function withWholeTail(
  mock: FeedMock,
  snapshotChanges: Partial<SessionSnapshot> = {},
): FeedMock {
  const fullSnapshot: SessionSnapshot = {
    ...mock.snapshot,
    // The catalog's Agent, so the Composer shows its name and options.
    agent: catalogAgent.agent,
    configOptions: catalogAgent.configOptions,
    ...snapshotChanges,
  };
  return {
    ...mock,
    snapshot: fullSnapshot,
    stream: [{ type: 'snapshot', snapshot: fullSnapshot }],
  };
}

function createSessionMocks(mock: FeedMock): Fixtures {
  return {
    ...createFeedMocks(mock),
    'agents.list': () => newSessionCatalogs.bothAvailable,
    'session.prompt': () => ({ messageId: 'message-sent' }),
    'session.cancel': () => ({}),
    'session.setConfigOption': () => ({ configOptions: [] }),
  };
}

const editAndCommandRecording = recordedFeedMock('agent-1', 'edit-and-command');
const recordedHeader = editAndCommandRecording.liveHeaders.findLast(
  (header) => header.startedAt !== null && header.source.type === 'tool_call',
);
if (!recordedHeader) throw new Error('No running live header recorded');
export const runningHeader = recordedHeader;

// A clock four minutes and twelve seconds into the running Turn.
export const runningTurnNow = (runningHeader.startedAt ?? 0) + 252_000;

const runningFeed = withWholeTail(editAndCommandRecording, {
  state: 'running',
  liveHeader: runningHeader,
  activeTurnId: 'turn-running',
});
export const runningSessionMocks = createSessionMocks(runningFeed);

const idleFeed = withWholeTail(recordedFeedMock('agent-2', 'markdown-answer'));
export const idleSessionMocks = createSessionMocks(idleFeed);

export const emptySessionMocks = createSessionMocks(
  withWholeTail(
    { ...editAndCommandRecording, rows: [] },
    { title: 'New Session', maxRevision: 0 },
  ),
);

// Only the oldest page holds this recording, and only the arriving row holds the other, so their text marks each one.
const oldestRecording = recordedFeedMock('agent-2', 'compaction');
const arrivingRecording = recordedFeedMock('agent-2', 'command-outcomes');

function firstTextOf(row: {
  content: readonly { type: string; text?: string }[];
}) {
  const [block] = row.content;
  if (block?.type !== 'text' || block.text === undefined)
    throw new Error('Recorded message has no text');
  return block.text;
}

// The Long Feed's first message, which only the oldest page holds.
export const oldestMessage = firstTextOf(
  recordedUserMessage('agent-2', 'compaction'),
);

// Each recording's rows as one more copy, with ids and positions after the copies before it.
const rowsAsCopy = (mock: FeedMock, copy: number) =>
  mock.rows.map((row) => ({
    ...row,
    id: `${copy}-${row.id}`,
    position: copy * 1000 + row.position,
    ...('toolCallId' in row ? { toolCallId: `${copy}-${row.toolCallId}` } : {}),
  })) as SessionUpdate[];

// The oldest recording, then every other recording seven times over, so the Feed spans several pages.
const repeatedRecordings = Array.from({ length: 7 }, () =>
  recordedFeedMocks.filter(
    (mock) => mock !== oldestRecording && mock !== arrivingRecording,
  ),
).flat();
const longRows = [oldestRecording, ...repeatedRecordings].flatMap(rowsAsCopy);

const longFeed = withWholeTail(
  { ...editAndCommandRecording, rows: longRows },
  { maxRevision: Math.max(...longRows.map((row) => row.revision)) },
);
export const longSessionMocks = createSessionMocks(longFeed);

const { 'feed.page': longFeedPage } = createFeedMocks(longFeed);

// The newest page arrives; the page before it never does.
export const loadingOlderSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.page': (input) =>
    input.direction === 'before' ? pending()() : longFeedPage(input),
};

let releaseOlderPage = () => {};

// Each older page waits until a test sends it, so the test can mark the reader's place first.
function holdOlderPages(feed: FeedMock): Fixtures {
  const { 'feed.page': feedPage } = createFeedMocks(feed);
  return {
    ...createSessionMocks(feed),
    'feed.page': async (input) => {
      if (input.direction === 'before')
        await new Promise<void>((resolve) => {
          releaseOlderPage = resolve;
        });
      return feedPage(input);
    },
  };
}

export const heldOlderPageSessionMocks = holdOlderPages(longFeed);

// The client's page size, which the split group straddles.
const clientPageSize = 150;
const splitGroupSize = 20;
const splitGroupRowsInTail = splitGroupSize / 2;

// One Turn of numbered commands, which the Feed draws as one Tool call group.
const { commandActions: _, ...commandArgo } =
  completedCommand._meta?.argo ?? {};
const splitGroupRows = Array.from(
  { length: splitGroupSize },
  (_unused, index): SessionUpdate => ({
    ...completedCommand,
    id: `split-step-${index + 1}`,
    toolCallId: `split-step-${index + 1}`,
    turnId: 'turn-split-group',
    title: `Step ${index + 1}`,
    _meta: { ...completedCommand._meta, argo: commandArgo },
  }),
);
const rowsAfterSplitGroup = longRows.slice(
  -(clientPageSize - splitGroupRowsInTail),
);
const splitGroupFeedRows = [
  ...longRows.slice(0, splitGroupSize),
  ...splitGroupRows,
  ...rowsAfterSplitGroup,
].map((row, index) => ({ ...row, position: index + 1 }));

// The tail page starts at Step 11, so the older page brings Steps 1 to 10 into the same group.
export const splitGroupStepInTail = `Step ${splitGroupSize - 2}`;
export const splitGroupSessionMocks = holdOlderPages(
  withWholeTail(
    { ...editAndCommandRecording, rows: splitGroupFeedRows },
    {
      maxRevision: Math.max(...splitGroupFeedRows.map((row) => row.revision)),
    },
  ),
);

// Sends the older page the Feed is waiting for.
export const sendOlderPage = () => releaseOlderPage();

// The row the Agent sends while the reader is scrolled up.
// Its first message, since plain text matches exactly where the last one ends in `done`, which other recordings send too.
const arrivingAgentMessage = arrivingRecording.rows.find(
  (row) => row.sessionUpdate === 'agent_message',
);
const lastLongRow = longRows.at(-1);
if (arrivingAgentMessage?.sessionUpdate !== 'agent_message' || !lastLongRow)
  throw new Error('No arriving message recorded');
export const arrivingMessage = firstTextOf(arrivingAgentMessage);
const arrivingRow: SessionUpdate = {
  ...arrivingAgentMessage,
  id: 'arriving-row',
  position: lastLongRow.position + 1,
  revision: longFeed.snapshot.maxRevision + 1,
};

const arrivingRows = createSubscriptionPublisher<SessionUpdate>();
// Sends the arriving row, once a test has scrolled away from the end.
export const sendArrivingRow = () => arrivingRows.publish(arrivingRow);

export const arrivingRowSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.subscribe': async function* (_input, signal) {
    yield { type: 'snapshot', snapshot: longFeed.snapshot };
    for await (const row of arrivingRows.subscribe(signal))
      yield { type: 'row.upsert', rev: row.revision, row };
  },
};
const runningFeedMocks = createFeedMocks(runningFeed);
const idleFeedMocks = createFeedMocks(idleFeed);
const feedMocksFor = ({ sessionId }: { sessionId: string }) =>
  sessionId === 'session-2' ? idleFeedMocks : runningFeedMocks;

// `session-1` is the running recording and `session-2` the idle one, so a story can switch between them.
export const twoSessionMocks: Fixtures = {
  ...runningSessionMocks,
  'feed.page': (input) => feedMocksFor(input)['feed.page'](input),
  'feed.row': (input) => feedMocksFor(input)['feed.row'](input),
  'feed.subscribe': (input) => feedMocksFor(input)['feed.subscribe'](input),
};
