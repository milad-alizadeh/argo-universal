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
    shells: { running: 1, total: 1 },
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
  {
    ...sessionRows.unread,
    title: 'Answer the review comments',
    activity: 'Replied to 3 comments',
  },
];

export const paperSessionMetadata = {
  'session-plan': {
    pullRequest: { number: 45, stage: 'open' },
    age: '4m',
  },
  'session-needs-input': {
    pullRequest: { number: 45, stage: 'open' },
    age: '3m',
  },
  'session-failed': {
    subagentsFailed: true,
    pullRequest: { number: 40, stage: 'closed' },
    age: '1h',
  },
  'session-idle': {
    pullRequest: { number: 44, stage: 'merged' },
    age: '2h',
  },
  'session-unread': { age: '12m' },
} as const;
