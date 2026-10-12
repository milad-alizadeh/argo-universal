import type { SessionInfo } from '@repo/contracts';
import { sessionRows } from '@repo/mocks/app';

export const sessionRowMocks = {
  planAndSubagents: {
    ...sessionRows.withPlan,
    subagents: sessionRows.withSubagents.subagents,
  },
  finishedSubagents: {
    ...sessionRows.idle,
    plan: { done: 5, total: 5 },
    subagents: { running: 0, total: 3 },
  },
} satisfies Record<string, SessionInfo>;

export const paperSessionRows: SessionInfo[] = [
  {
    ...sessionRows.withPlan,
    title: 'Build the Session layout',
    activity: 'Running pnpm typecheck',
    subagents: { running: 2, total: 3 },
  },
  {
    ...sessionRows.needsInput,
    agent: 'agent-two',
    title: 'Fix flaky Feed sync test',
    activity: 'Awaiting approval',
    plan: { done: 1, total: 4 },
  },
  {
    ...sessionRows.failed,
    title: 'Port the mock CLIs',
    activity: 'Ran pnpm test (exit 1)',
    plan: { done: 2, total: 3 },
    subagents: { running: 0, total: 2 },
  },
  {
    ...sessionRows.idle,
    agent: 'agent-two',
    title: 'Rename Projects screen to Sessions',
    activity: 'Worked for 6m',
    plan: { done: 5, total: 5 },
    subagents: { running: 0, total: 3 },
  },
];

export const paperSessionMetadata = {
  'session-plan': {
    issue: { number: 128 },
    pullRequest: { number: 45, status: 'open' },
  },
  'session-needs-input': { issue: { number: 131 } },
  'session-failed': {
    subagentsFailed: true,
    issue: { number: 99 },
    pullRequest: { number: 47, status: 'draft' },
  },
  'session-idle': {
    issue: { number: 96 },
    pullRequest: { number: 44, status: 'merged' },
  },
} as const;
