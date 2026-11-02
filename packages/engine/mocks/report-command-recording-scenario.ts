import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';

const shellCommand = 'cat hello.txt && git status --short';

const runningCommandId = 'described-running';

const longCommandId = 'described-long';

const commandTitle = 'Run command';

// Documented terminal_info ACP extension with the Agent's raw command description.
export const commandRecordingSteps: ScriptedScenario['steps'] = [
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: runningCommandId,
      kind: 'execute',
      title: commandTitle,
      status: 'in_progress',
      rawInput: {
        command: shellCommand,
        description: 'Checking the working tree',
      },
      content: [{ type: 'terminal', terminalId: runningCommandId }],
      _meta: {
        terminal_info: { terminal_id: runningCommandId, cwd: '/project' },
      },
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: longCommandId,
      kind: 'execute',
      title: commandTitle,
      status: 'in_progress',
      rawInput: {
        command: shellCommand,
        description:
          'Inspect a very long command description that must remain on a single line when the available space is narrow',
      },
      content: [{ type: 'terminal', terminalId: longCommandId }],
      _meta: {
        terminal_info: { terminal_id: longCommandId, cwd: '/project' },
      },
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId: longCommandId,
      status: 'completed',
      _meta: {
        terminal_exit: {
          terminal_id: longCommandId,
          exit_code: 0,
          signal: null,
        },
      },
    },
  },
];
