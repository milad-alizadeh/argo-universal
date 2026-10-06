import { recordedFeedMocks } from '@repo/api/mocks';
import type {
  AgentThought,
  Notice,
  SessionUpdate,
  ToolCallUpdate,
} from '@repo/contracts';

const thought = recordedFeedMocks
  .flatMap((mock) => mock.rows)
  .find((row): row is AgentThought => row.sessionUpdate === 'agent_thought');
if (!thought) throw new Error('Recording needs an Agent thought');

export const liveHeaderMocks = recordedFeedMocks
  .filter((mock) => mock.recording === 'edit-and-command')
  .map((mock) => {
    const command = mock.rows.find(
      (row): row is ToolCallUpdate =>
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
          { type: 'text' as const, text: '**Checking the tests**\n\nDetails' },
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
        severity: 'warning',
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
          status: 'completed',
        },
      ] satisfies SessionUpdate[],
    };
  });
