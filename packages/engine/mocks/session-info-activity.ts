import { idle, live, turn, information } from './session-info';
import type { SessionInfoFixture } from './session-info-case';

export const rules: {
  rule: string;
  input: SessionInfoFixture;
  expected: unknown;
}[] = [
  {
    rule: 'list activity ignores a Plan proposal while a Turn runs',
    input: {
      ...idle,
      live: {
        ...live,
        pendingPlanProposal: { planId: 'plan-1', content: 'A proposal' },
      },
    },
    expected: {
      information: { ...information, status: 'running', activity: 'Working' },
      running: true,
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
];
