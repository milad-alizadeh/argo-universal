import { permissionOptions, SessionRecord, type Turn } from '@repo/contracts';
import { expect, it } from 'vitest';
import { type SessionInfoInput, toSessionInfo } from './session-info';

const stored = SessionRecord.parse({
  id: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  title: 'Check reliability',
  titleSource: 'user',
  archivedAt: null,
  seenRevision: 0,
  activityAt: 100,
  failure: null,
  vendorSessionId: null,
  parentSessionId: null,
  checkoutPath: '/project',
  checkoutBranch: 'main',
  vendorRef: null,
  configValues: [],
  epoch: 0,
  projectionVersion: 1,
  maxRevision: 0,
  createdAt: 10,
  updatedAt: 20,
});
const idle: SessionInfoInput = {
  row: stored,
  turns: [],
  message: undefined,
  plan: undefined,
  live: null,
  feed: null,
  liveHeaderRows: [],
  children: [],
};
const live = {
  activeTurnId: 'turn-1',
  activeTurnStartedAt: 50,
  permissionQueue: [],
  pendingElicitation: null,
  failure: null,
};
const turn: Turn = {
  id: 'turn-1',
  sessionId: 'session-1',
  status: 'running',
  startedAt: 50,
  endedAt: null,
  stopReason: null,
  error: null,
  usage: null,
  model: null,
};
const information = {
  sessionId: 'session-1',
  projectId: 'project-1',
  agent: 'mock',
  parentSessionId: null,
  cwd: '/project',
  createdAt: 10,
  updatedAt: 20,
  title: 'Check reliability',
  titleSource: 'user',
  status: 'idle',
  activity: '',
  activityAt: 100,
  checkout: { type: 'main', path: '/project', branch: 'main' },
  plan: null,
  subagents: { total: 0, running: 0 },
  shells: { total: 0, running: 0 },
  archivedAt: null,
  issue: null,
  pullRequest: null,
};

const rules: { rule: string; input: SessionInfoInput; expected: unknown }[] = [
  {
    rule: 'needs input uses the first Permission request before running work',
    input: {
      ...idle,
      live: {
        ...live,
        permissionQueue: [
          {
            toolCallId: 'tool-1',
            title: 'Run the checks',
            options: permissionOptions,
          },
          {
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
      liveHeaderRows: [
        {
          id: 'thought-1',
          sessionId: 'session-1',
          turnId: 'turn-1',
          position: 1,
          revision: 1,
          state: 'open',
          sessionUpdate: 'agent_thought',
          messageId: 'thought-1',
          content: [{ type: 'text', text: '**Checking the tests**\nDetails' }],
        },
      ],
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
    input: { ...idle, turns: [turn] },
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
    rule: 'stored running Turn supplies the Live header without a Session actor',
    input: {
      ...idle,
      turns: [turn],
      liveHeaderRows: [
        {
          id: 'thought-1',
          sessionId: 'session-1',
          turnId: 'turn-1',
          position: 1,
          revision: 1,
          state: 'open',
          sessionUpdate: 'agent_thought',
          messageId: 'thought-1',
          content: [{ type: 'text', text: '**Checking the tests**' }],
        },
      ],
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
    rule: 'failed status comes from the newest Turn',
    input: {
      ...idle,
      turns: [
        { ...turn, id: 'older-running', startedAt: 40 },
        {
          ...turn,
          id: 'turn-2',
          startedAt: 60,
          status: 'ended',
          stopReason: 'error',
          error: { code: 1, message: 'Failed' },
        },
      ],
    },
    expected: {
      information: { ...information, status: 'failed' },
      running: false,
    },
  },
  {
    rule: 'an interrupted Turn does not fail the Session',
    input: {
      ...idle,
      turns: [
        {
          ...turn,
          status: 'ended',
          stopReason: 'error',
          error: { code: 'interrupted', message: 'Stopped' },
        },
      ],
    },
    expected: { information, running: false },
  },
  {
    rule: 'an items Plan reports completed entries',
    input: {
      ...idle,
      plan: {
        id: 'plan-update',
        sessionId: 'session-1',
        turnId: 'turn-1',
        position: 3,
        revision: 3,
        state: 'settled',
        sessionUpdate: 'plan_update',
        plan: {
          type: 'items',
          planId: 'plan-1',
          entries: [
            { content: 'Done', priority: 'high', status: 'completed' },
            { content: 'Working', priority: 'medium', status: 'in_progress' },
            { content: 'Next', priority: 'low', status: 'pending' },
            { content: 'Stopped', priority: 'low', status: 'cancelled' },
          ],
        },
      },
    },
    expected: {
      information: { ...information, plan: { done: 1, total: 4 } },
      running: false,
    },
  },
  {
    rule: 'other Plans do not report checklist progress',
    input: {
      ...idle,
      plan: {
        id: 'plan-update',
        sessionId: 'session-1',
        turnId: 'turn-1',
        position: 3,
        revision: 3,
        state: 'settled',
        sessionUpdate: 'plan_update',
        plan: { type: 'markdown', planId: 'plan-1', content: '# Proposal' },
      },
    },
    expected: { information, running: false },
  },
  {
    rule: 'Subagents count running child Sessions once',
    input: {
      ...idle,
      children: [
        { ...stored, id: 'child-1', parentSessionId: 'session-1' },
        { ...stored, id: 'child-2', parentSessionId: 'session-1' },
        { ...stored, id: 'child-3', parentSessionId: 'session-1' },
      ],
      turns: [
        { ...turn, id: 'child-turn-1', sessionId: 'child-1' },
        { ...turn, id: 'child-turn-2', sessionId: 'child-1' },
        { ...turn, id: 'child-turn-3', sessionId: 'child-2', status: 'ended' },
      ],
    },
    expected: {
      information: { ...information, subagents: { total: 3, running: 1 } },
      running: false,
    },
  },
  {
    rule: 'activityAt comes from the Feed actor when its revision is ahead',
    input: { ...idle, feed: { maxRevision: 2, activityAt: 300 } },
    expected: {
      information: { ...information, status: 'unread', activityAt: 300 },
      running: false,
    },
  },
  {
    rule: 'a Feed actor at the stored revision preserves stored activityAt',
    input: { ...idle, feed: { maxRevision: 0, activityAt: 300 } },
    expected: { information, running: false },
  },
  {
    rule: 'Elicitation needs input even without a running Turn',
    input: {
      ...idle,
      live: {
        ...live,
        activeTurnId: null,
        pendingElicitation: {
          requestId: 'question-1',
          mode: 'form',
          message: 'Which file?',
          requestedSchema: { properties: {} },
        },
      },
    },
    expected: {
      information: {
        ...information,
        status: 'needs_input',
        activity: 'Waiting for your answer',
      },
      running: false,
    },
  },
  {
    rule: 'the live context owns running status over a stale stored Turn',
    input: { ...idle, live: { ...live, activeTurnId: null }, turns: [turn] },
    expected: { information, running: false },
  },
  {
    rule: 'equal start times use the newest Turn id',
    input: {
      ...idle,
      turns: [
        { ...turn, id: 'turn-a', status: 'ended', stopReason: 'error' },
        { ...turn, id: 'turn-z', status: 'ended', stopReason: 'end_turn' },
      ],
    },
    expected: { information, running: false },
  },
  {
    rule: 'the Checkout comes from the stored branch',
    input: { ...idle, row: { ...stored, checkoutBranch: 'argo/session-1' } },
    expected: {
      information: {
        ...information,
        checkout: {
          type: 'worktree',
          path: '/project',
          branch: 'argo/session-1',
        },
      },
      running: false,
    },
  },
];
it.each(rules)('$rule', ({ input, expected }): void => {
  const before = structuredClone(input);
  expect(toSessionInfo(input)).toEqual(expected);
  expect(input).toEqual(before);
});
