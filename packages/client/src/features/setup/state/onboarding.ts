// Step 1 completes when a Registry Agent is saved.
export type AgentStep = { status: 'done' } | { status: 'not-installed' };

// Step 2: the Server's GitHub login, in the AccountRow states designed for Settings › Accounts in Paper.
export type GitHubStep =
  | { status: 'not-connected' }
  | { status: 'login-found'; login: string }
  | { status: 'signing-in' }
  | { status: 'signed-in'; login: string }
  | { status: 'expired'; login: string };

// A done step shows a check; the next step holds the one primary button; an open step keeps an outline button.
export type StepMark = 'done' | 'next' | 'open';

export interface StepMarks {
  agent: StepMark;
  github: StepMark;
  project: StepMark;
}

const agentMarks: Record<
  AgentStep['status'],
  Pick<StepMarks, 'agent' | 'project'>
> = {
  done: { agent: 'done', project: 'next' },
  'not-installed': { agent: 'next', project: 'open' },
};

const githubMarks: Record<GitHubStep['status'], StepMark> = {
  'not-connected': 'open',
  'login-found': 'open',
  'signing-in': 'open',
  'signed-in': 'done',
  expired: 'open',
};

// Signing in to an Agent comes first; GitHub is optional, so it never holds the next action; adding the first Project ends the checklist, so that step is never done.
export function stepMarks(agent: AgentStep, github: GitHubStep): StepMarks {
  return { ...agentMarks[agent.status], github: githubMarks[github.status] };
}

export const agentStep = (agents: readonly { id: string }[]): AgentStep => ({
  status: agents.length ? 'done' : 'not-installed',
});
