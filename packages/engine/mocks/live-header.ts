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

export const liveHeaderMocks = recordedFeedMocks
  .filter((mock): boolean => mock.recording === 'edit-and-command')
  .map((mock): LiveHeaderMock => {
    const command = mock.rows.find(
      (
        row,
      ): row is Extract<SessionUpdate, { sessionUpdate: 'tool_call_update' }> =>
        row.sessionUpdate === 'tool_call_update' && row.kind === 'execute',
    );
    if (!command) throw new Error('Recording needs a command');
    return {
      agent: mock.agent,
      recordedHeader:
        mock.agent === 'agent-1'
          ? 'Show hello.txt and short git status'
          : 'Reading /repo/app.txt',
      command: {
        ...command,
        turnId: 'turn-1',
        state: 'open' as const,
        status: 'in_progress' as const,
      },
      thought: {
        ...thought,
        turnId: 'turn-1',
        position: command.position + 1,
        revision: command.revision + 1,
        content: [
          {
            type: 'text' as const,
            text: '**Checking the tests**\n\nDetails',
          },
        ],
      },
      retry: {
        id: 'retry',
        sessionId: command.sessionId,
        turnId: 'turn-1',
        position: command.position + 2,
        revision: command.revision + 2,
        sessionUpdate: 'notice',
        state: 'settled',
        severity: 'warning' as const,
        title: 'Retrying',
        _meta: {
          argo: { retry: { attempt: 2, maxAttempts: 5, delayMs: 1000 } },
        },
      } satisfies Notice,
      progress: [
        {
          id: 'progress-plan',
          sessionId: command.sessionId,
          turnId: 'turn-1',
          position: command.position + 3,
          revision: command.revision + 3,
          state: 'settled',
          sessionUpdate: 'plan_update',
          plan: { type: 'items', planId: 'plan-1', entries: [] },
        },
        {
          id: 'progress-compaction',
          sessionId: command.sessionId,
          turnId: 'turn-1',
          position: command.position + 4,
          revision: command.revision + 4,
          state: 'settled',
          sessionUpdate: 'compaction_update',
          compactionId: 'compaction-1',
          status: 'completed' as const,
        },
      ] satisfies SessionUpdate[],
    };
  });
