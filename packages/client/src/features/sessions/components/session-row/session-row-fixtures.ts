import { agentsList, sessionRows } from '@repo/mocks/app';
import type { SessionRowProps } from './session-row';

/*
 * Paper "SessionsList": one row per status, both Agents, a Change at each stage, a failed
 * Subagent and a finished Plan. A story adds only onSelect, so a parent can pass a fixture
 * straight through its own prop.
 */
type SessionRowFixture = Omit<
  SessionRowProps,
  'onSelect' | 'onRename' | 'onArchive'
>;

const firstAgentLogo = agentsList[0]?.icon ?? '';

const secondAgentLogo = agentsList[1]?.icon ?? firstAgentLogo;

export const runningSession = {
  session: {
    ...sessionRows.withPlan,
    title: 'Build the Session layout',
    activity: 'Running pnpm typecheck',
    shells: { running: 1, total: 1 },
    subagents: { running: 2, total: 3 },
  },
  logo: firstAgentLogo,
  pullRequest: { number: 45, stage: 'open' },
  age: '4m',
} satisfies SessionRowFixture;

export const needsInputSession = {
  session: {
    ...sessionRows.needsInput,
    agent: 'agent-two',
    title: 'Fix flaky Feed sync test',
    activity: 'Awaiting approval',
    plan: { done: 1, total: 4 },
  },
  logo: secondAgentLogo,
  pullRequest: { number: 45, stage: 'open' },
  age: '3m',
} satisfies SessionRowFixture;

export const failedSession = {
  session: {
    ...sessionRows.failed,
    title: 'Port the mock CLIs',
    activity: 'Ran pnpm test (exit 1)',
    plan: { done: 2, total: 3 },
    subagents: { running: 0, total: 2 },
  },
  logo: firstAgentLogo,
  subagentsFailed: true,
  pullRequest: { number: 40, stage: 'closed' },
  age: '1h',
} satisfies SessionRowFixture;

export const idleSession = {
  session: {
    ...sessionRows.idle,
    agent: 'agent-two',
    title: 'Rename Projects screen to Sessions',
    activity: 'Worked for 6m',
    plan: { done: 5, total: 5 },
    subagents: { running: 0, total: 3 },
  },
  logo: secondAgentLogo,
  pullRequest: { number: 44, stage: 'merged' },
  age: '2h',
} satisfies SessionRowFixture;

export const unreadSession = {
  session: {
    ...sessionRows.unread,
    title: 'Answer the review comments',
    activity: 'Replied to 3 comments',
  },
  logo: firstAgentLogo,
  age: '12m',
} satisfies SessionRowFixture;

export const archivedSession = {
  session: sessionRows.archived,
  logo: firstAgentLogo,
  age: '3d',
} satisfies SessionRowFixture;

export const selectedSession = {
  ...runningSession,
  selected: true,
} satisfies SessionRowFixture;

export const compactSession = {
  ...runningSession,
  layout: 'compact',
} satisfies SessionRowFixture;
