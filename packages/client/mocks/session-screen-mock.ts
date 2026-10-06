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

export const runningSessionMocks = sessionMocks(
  settled(commands, {
    state: 'running',
    liveHeader: runningHeader,
    activeTurnId: 'turn-running',
  }),
);

export const idleSessionMocks = sessionMocks(
  settled(recorded('agent-2', 'markdown-answer')),
);

export const emptySessionMocks = sessionMocks(
  settled({ ...commands, rows: [] }, { title: 'New Session', maxRevision: 0 }),
);

// The Long Feed's first row, which only the oldest page holds.
export const oldestMessage = 'The first message of this long Session.';

// Every recording's rows one after another, seven times over, so the Feed spans several pages.
const repeatedRows: SessionUpdate[] = Array.from(
  { length: 7 },
  () => recordedFeedMocks,
)
  .flat()
  .flatMap(
    (mock, index) =>
      mock.rows.map((row) => ({
        ...row,
        id: `${index}-${row.id}`,
        position: index * 1000 + row.position,
        ...('toolCallId' in row
          ? { toolCallId: `${index}-${row.toolCallId}` }
          : {}),
      })) as SessionUpdate[],
  );
const longRows = repeatedRows.map((row, index) =>
  index === 0 && row.sessionUpdate === 'user_message'
    ? { ...row, content: [{ type: 'text' as const, text: oldestMessage }] }
    : row,
);

const longFeed = settled(
  { ...commands, rows: longRows },
  { maxRevision: Math.max(...longRows.map((row) => row.revision)) },
);
export const longSessionMocks = sessionMocks(longFeed);

const { 'feed.page': longPage } = createFeedMocks(longFeed);
if (!longPage) throw new Error('No Feed page mock');

// The newest page arrives; the page before it never does.
export const loadingOlderSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.page': (input, signal) =>
    input.direction === 'before' ? pending()() : longPage(input, signal),
};

// The row the Agent sends while the reader is scrolled up.
export const arrivingMessage = 'A message that arrived while reading back.';
const lastRow = longRows.at(-1);
const message = longRows.findLast(
  (row) => row.sessionUpdate === 'agent_message',
);
if (!lastRow || message?.sessionUpdate !== 'agent_message')
  throw new Error('No long Feed message');
const arrivingRow: SessionUpdate = {
  ...message,
  id: 'arriving-row',
  messageId: 'arriving-message',
  position: lastRow.position + 1,
  revision: longFeed.snapshot.maxRevision + 1,
  content: [{ type: 'text', text: arrivingMessage }],
};

let releaseArrivingRow = () => {};
// Sends the arriving row, once a test has scrolled away from the end.
export const sendArrivingRow = () => releaseArrivingRow();

export const arrivingRowSessionMocks: Fixtures = {
  ...longSessionMocks,
  'feed.subscribe': async function* () {
    yield { type: 'snapshot', snapshot: longFeed.snapshot };
    await new Promise<void>((resolve) => {
      releaseArrivingRow = resolve;
    });
    yield { type: 'row.upsert', rev: arrivingRow.revision, row: arrivingRow };
  },
};
