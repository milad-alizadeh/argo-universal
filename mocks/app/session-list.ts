import { agentsList } from './session-agents';

export { agentsList } from './session-agents';

import type {
  ProjectsListOutput,
  SessionInfo,
  SessionListOutput,
} from '@repo/contracts';

const exampleProjectPath = '/projects/example';

const activityAt = Date.parse('2026-10-05T12:00:00.000Z');

export const projectsList: ProjectsListOutput = [
  {
    id: 'project-1',
    name: 'Example Project',
    path: exampleProjectPath,
    createdAt: activityAt - 60_000,
    checkoutChoice: { type: 'worktree', baseBranch: 'main' },
    remoteHost: 'GitHub',
    folderExists: true,
  },
];

const baseSession: SessionInfo = {
  sessionId: 'session-idle',
  projectId: 'project-1',
  agent: 'agent-one',
  parentSessionId: null,
  cwd: exampleProjectPath,
  status: 'idle',
  title: 'Finished work',
  titleSource: 'agent',
  activity: 'The change is ready to review.',
  activityAt,
  checkout: { type: 'main', path: exampleProjectPath, branch: 'main' },
  plan: null,
  subagents: { running: 0, total: 0 },
  shells: { running: 0, total: 0 },
  archivedAt: null,
  pullRequest: null,
  createdAt: activityAt - 60_000,
  updatedAt: activityAt,
};

export const sessionRows = {
  needsInput: {
    ...baseSession,
    sessionId: 'session-needs-input',
    status: 'needs_input',
    title: 'Review the proposed change',
    activity: 'Allow the command to run?',
  },
  running: {
    ...baseSession,
    sessionId: 'session-running',
    status: 'running',
    title: 'Build the settings screen',
    activity: 'Running the tests',
  },
  failed: {
    ...baseSession,
    sessionId: 'session-failed',
    status: 'failed',
    title: 'Fix the failing build',
    activity: 'The build failed.',
  },
  unread: {
    ...baseSession,
    sessionId: 'session-unread',
    status: 'unread',
    title: 'New results to review',
    activity: 'I found the cause of the failure.',
  },
  idle: baseSession,
  longTitle: {
    ...baseSession,
    sessionId: 'session-long-title',
    titleSource: 'prompt',
    title:
      'Investigate why the Session list stops receiving live updates after the phone reconnects and verify that every App catches up with the latest Feed activity',
  },
  withPlan: {
    ...baseSession,
    sessionId: 'session-plan',
    status: 'running',
    title: 'Implement the agreed Plan',
    plan: { done: 2, total: 5 },
    activity: 'Implementing the next step',
  },
  withSubagents: {
    ...baseSession,
    sessionId: 'session-subagents',
    status: 'running',
    title: 'Review with Subagents',
    subagents: { running: 2, total: 3 },
    activity: 'Waiting for the reviews',
  },
  withShells: {
    ...baseSession,
    sessionId: 'session-shells',
    status: 'running',
    title: 'Watch the development server',
    shells: { running: 1, total: 2 },
    activity: 'Checking the development server',
  },
  archived: {
    ...baseSession,
    sessionId: 'session-archived',
    titleSource: 'user',
    title: 'Archived work',
    archivedAt: activityAt,
    checkout: {
      type: 'worktree',
      path: '/checkouts/archived',
      branch: 'feature',
    },
    cwd: '/checkouts/archived',
  },
} satisfies Record<string, SessionInfo>;

// Each Agent has all row variations, so stories can check parity without naming vendors.
export const activeSessions: SessionListOutput = {
  sessions: agentsList.flatMap(({ id: agent }): SessionInfo[] =>
    Object.values(sessionRows)
      .filter((row): boolean => row.archivedAt === null)
      .map((row): typeof row => ({
        ...row,
        agent,
        sessionId: `${agent}:${row.sessionId}`,
      })),
  ),
  nextCursor: null,
};

export const archivedSessions: SessionListOutput = {
  sessions: agentsList.map(({ id: agent }): SessionInfo => ({
    ...sessionRows.archived,
    agent,
    sessionId: `${agent}:${sessionRows.archived.sessionId}`,
  })),
  nextCursor: null,
};
