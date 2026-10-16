import { stored, idle, live, turn, information } from './session-info';
import type { SessionInfoFixture } from './session-info-case';

export const rules: {
  rule: string;
  input: SessionInfoFixture;
  expected: unknown;
}[] = [
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
        elicitationQueue: [
          {
            requestId: 'question-1',
            mode: 'form',
            message: 'Which file?',
            requestedSchema: { properties: {} },
          },
        ],
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
