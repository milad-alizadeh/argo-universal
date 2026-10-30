import { permissionOptions } from '@repo/contracts';
import { idle, live, turn, information } from './session-info';
import type { SessionInfoFixture } from './session-info-case';

export const rules: {
  rule: string;
  input: SessionInfoFixture;
  expected: unknown;
}[] = [
  {
    rule: 'needs input uses the first Permission request before running work',
    input: {
      ...idle,
      activeTurnId: 'turn-1',
      live: {
        ...live,
        permissionQueue: [
          {
            requestId: 'request-1',
            toolCallId: 'tool-1',
            title: 'Run the checks',
            options: permissionOptions,
          },
          {
            requestId: 'request-2',
            toolCallId: 'tool-2',
            title: 'Another request',
            options: permissionOptions,
          },
        ],
      },
    },
    expected: {
      information: {
        ...information,
        status: 'needs_input',
        activity: 'Run the checks',
      },
      running: true,
    },
  },
  {
    rule: 'running uses the Live header',
    input: {
      ...idle,
      live,
      activeTurnId: 'turn-1',
      liveHeader: {
        text: 'Checking the tests',
        source: { type: 'thought' },
        startedAt: 50,
      },
    },
    expected: {
      information: {
        ...information,
        status: 'running',
        activity: 'Checking the tests',
      },
      running: true,
    },
  },
  {
    rule: 'running without a Live header falls back to Working',
    input: { ...idle, turns: [turn], activeTurnId: 'turn-1' },
    expected: {
      information: { ...information, status: 'running', activity: 'Working' },
      running: true,
    },
  },
  {
    rule: 'idle activity uses the first line of the newest Agent message',
    input: {
      ...idle,
      message: {
        id: 'message-2',
        sessionId: 'session-1',
        turnId: 'turn-1',
        position: 2,
        revision: 2,
        state: 'settled',
        sessionUpdate: 'agent_message',
        messageId: 'message-2',
        content: [
          { type: 'text', text: 'Checks passed\nMore detail' },
          { type: 'text', text: 'Another block' },
        ],
      },
    },
    expected: {
      information: { ...information, activity: 'Checks passed' },
      running: false,
    },
  },
  {
    rule: 'idle activity shows Markdown as plain text with a short path',
    input: {
      ...idle,
      message: {
        id: 'message-3',
        sessionId: 'session-1',
        turnId: 'turn-1',
        position: 3,
        revision: 3,
        state: 'settled',
        sessionUpdate: 'agent_message',
        messageId: 'message-3',
        content: [
          {
            type: 'text',
            text: 'Created [qa-note.txt](/tmp/argo-qa/home/worktrees/abc/qa-note.txt) with `QA_FILE_1320`.',
          },
        ],
      },
    },
    expected: {
      information: {
        ...information,
        activity: 'Created qa-note.txt with QA_FILE_1320.',
      },
      running: false,
    },
  },
];
