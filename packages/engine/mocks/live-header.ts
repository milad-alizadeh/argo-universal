import type {
  AgentThought,
  Notice,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';
import { recordedFeedMocks } from '@repo/mocks/app';

type LiveHeaderMock = {
  agent: string;
  recordedHeader: string;
  command: ToolCallUpdate & {
    turnId: string;
    state: 'open';
    status: 'in_progress';
  };
  thought: Omit<AgentThought, 'turnId' | 'content'> & {
    turnId: string;
    content: { type: 'text'; text: string }[];
  };
  retry: Notice & {
    state: 'settled';
    severity: 'warning';
    _meta: {
      argo: {
        retry: { attempt: number; maxAttempts: number; delayMs: number };
      };
    };
  };
  progress: (
    | (Extract<SessionUpdate, { sessionUpdate: 'plan_update' }> & {
        state: 'settled';
        plan: { type: 'items'; planId: string; entries: never[] };
      })
    | (Extract<SessionUpdate, { sessionUpdate: 'compaction_update' }> & {
        state: 'settled';
        status: 'completed';
      })
  )[];
};

const thought = recordedFeedMocks
  .flatMap((mock): SessionUpdate[] => mock.rows)
  .find(
    (row): row is Extract<SessionUpdate, { sessionUpdate: 'agent_thought' }> =>
      row.sessionUpdate === 'agent_thought',
  );

if (!thought) throw new Error('Recording needs an Agent thought');

type RecordedMock = (typeof recordedFeedMocks)[number];

type RecordedCommand = Extract<
  SessionUpdate,
  { sessionUpdate: 'tool_call_update' }
>;

const requireCommand = (mock: RecordedMock): RecordedCommand => {
  const command = mock.rows.find(
    (row): row is RecordedCommand =>
      row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
  );

  if (!command) throw new Error('Recording needs a command');

  return command;
};

function toLiveHeaderMock(mock: RecordedMock): LiveHeaderMock {
  const command = requireCommand(mock);

  return {
    agent: mock.agent,
    recordedHeader: recordedHeader(mock.agent),
    command: liveCommand(command),
    thought: liveThought(command),
    retry: retryNotice(command),
    progress: [planProgress(command), compactionProgress(command)],
  };
}

const recordedHeader = (agent: string): string =>
  agent === 'agent-1'
    ? 'Show hello.txt and short git status'
    : 'Reading /repo/app.txt';

const liveCommand = (command: RecordedCommand): LiveHeaderMock['command'] => ({
  ...command,
  turnId: 'turn-1',
  state: 'open',
  status: 'in_progress',
});

const liveThought = (command: RecordedCommand): LiveHeaderMock['thought'] => ({
  ...thought,
  turnId: 'turn-1',
  position: command.position + 1,
  revision: command.revision + 1,
  content: [{ type: 'text', text: '**Checking the tests**\n\nDetails' }],
});

const retryNotice = (command: RecordedCommand): LiveHeaderMock['retry'] => ({
  id: 'retry',
  sessionId: command.sessionId,
  turnId: 'turn-1',
  position: command.position + 2,
  revision: command.revision + 2,
  sessionUpdate: 'notice',
  state: 'settled',
  severity: 'warning',
  title: 'Retrying',
  _meta: { argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } } },
});

const planProgress = (
  command: RecordedCommand,
): LiveHeaderMock['progress'][number] => ({
  id: 'progress-plan',
  sessionId: command.sessionId,
  turnId: 'turn-1',
  position: command.position + 3,
  revision: command.revision + 3,
  state: 'settled',
  sessionUpdate: 'plan_update',
  plan: { type: 'items', planId: 'plan-1', entries: [] },
});

const compactionProgress = (
  command: RecordedCommand,
): LiveHeaderMock['progress'][number] => ({
  id: 'progress-compaction',
  sessionId: command.sessionId,
  turnId: 'turn-1',
  position: command.position + 4,
  revision: command.revision + 4,
  state: 'settled',
  sessionUpdate: 'compaction_update',
  compactionId: 'compaction-1',
  status: 'completed',
});

export const liveHeaderMocks = recordedFeedMocks
  .filter((mock): boolean => mock.recording === 'edit-and-command')
  .map(toLiveHeaderMock);
