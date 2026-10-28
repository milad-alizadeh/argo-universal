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

const issueTracker = { pluginId: 'issue-tracker', pluginName: 'Issue tracker' };

// The Issue tracker's glyph, which leads its items and its Activity line.
const ticket = { sf: 'ticket', material: 'confirmation_number' } as const;

// The Issues the Issue tracker shows: one on the row, one behind "+2".
export const rowIssue = `#${412}`;

export const moreIssue = `#${398}`;

/*
 * Three Plugin items fit a desktop row after Argo's own; two more wait behind "+2", each with its Plugin's name. The
 * Issue opens the Issue tracker's page.
 */
export const pluginItemsSession = {
  ...idleSession,
  plugins: {
    items: [
      {
        ...issueTracker,
        key: 'issue-tracker:0',
        item: {
          icon: ticket,
          text: rowIssue,
          tone: 'info',
          tooltip: 'Issue #412: Sync fails on large repos',
          action: { path: '/issues/412' },
        },
      },
      {
        key: 'deploys:1',
        pluginId: 'deploys',
        pluginName: 'Deploys',
        item: { text: 'Preview ready', tone: 'success' },
      },
      {
        key: 'coverage:2',
        pluginId: 'coverage',
        pluginName: 'Coverage',
        item: { text: '78%' },
      },
    ],
    more: [
      {
        key: 'checks:0',
        pluginId: 'checks',
        pluginName: 'Checks',
        item: { text: 'Lint passed', tone: 'success' },
      },
      {
        ...issueTracker,
        key: 'issue-tracker:1',
        item: { text: moreIssue, action: { path: '/issues/398' } },
      },
    ],
  },
} satisfies SessionRowFixture;

export const pluginItemsCompactSession = {
  ...pluginItemsSession,
  layout: 'compact',
} satisfies SessionRowFixture;

// The Issue tracker writes the Activity line in place of Argo's, led by its glyph.
export const pluginActivitySession = {
  ...runningSession,
  plugins: {
    items: [],
    more: [],
    activity: { text: 'Awaiting review · 1 of 2', icon: ticket },
  },
} satisfies SessionRowFixture;
