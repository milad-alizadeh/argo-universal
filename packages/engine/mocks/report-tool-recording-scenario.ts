import type { ScriptedScenario } from '@repo/mocks/agent/scripted-scenario';
import { commandRecordingSteps } from './report-command-recording-scenario';

const originalGreeting = 'hello';

const greetingPath = '/project/hello.txt';

const updatedGreeting = 'hello Argo';

// Scripted ACP Tool calls with active details and Agent descriptions.
export const toolRecordingSteps: ScriptedScenario['steps'] = [
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'execute-text',
      kind: 'execute',
      title: 'Inspect the build',
      status: 'in_progress',
      content: [
        {
          type: 'content',
          content: { type: 'text', text: 'Build output in progress' },
        },
      ],
    },
  },
  // A command the Agent has started but not yet sent any output for.
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'execute-pending',
      kind: 'execute',
      title: 'Verify the build',
      status: 'in_progress',
      rawInput: { command: 'pnpm verify', timeout: 900000 },
      content: [],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'edit-raw',
      kind: 'edit',
      title: 'Update configuration',
      status: 'in_progress',
      rawInput: { file: 'config.json' },
      rawOutput: { result: 'Changes pending' },
      content: [],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'edit-title',
      kind: 'edit',
      title: 'Updating the greeting',
      status: 'in_progress',
      content: [
        {
          type: 'diff',
          path: greetingPath,
          oldText: originalGreeting,
          newText: updatedGreeting,
        },
      ],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'edit-empty-title',
      kind: 'edit',
      title: '',
      status: 'in_progress',
      content: [
        {
          type: 'diff',
          path: greetingPath,
          oldText: originalGreeting,
          newText: updatedGreeting,
        },
      ],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'edit-described',
      kind: 'edit',
      title: 'Correcting the greeting',
      status: 'in_progress',
      content: [
        {
          type: 'diff',
          path: greetingPath,
          oldText: originalGreeting,
          newText: updatedGreeting,
        },
      ],
    },
  },
  ...commandRecordingSteps,
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'delete-raw',
      kind: 'delete',
      title: 'Remove cache',
      status: 'in_progress',
      rawOutput: { result: 'Removal pending' },
      content: [],
    },
  },
  {
    type: 'update',
    update: {
      sessionUpdate: 'tool_call',
      toolCallId: 'move-raw',
      kind: 'move',
      title: 'Move archive',
      status: 'in_progress',
      rawOutput: { result: 'Move pending' },
      content: [],
    },
  },
];
