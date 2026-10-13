// Step 1: whether the Server has an Agent that can run Sessions.
export type AgentStep =
  | { status: 'done'; agentName: string }
  // `checking` while the Agents load or the Server looks again.
  | { status: 'not-found'; checking: boolean };

// Step 2: the Server's GitHub login, in the states of Settings › Accounts' AccountRow.
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
  'not-found': { agent: 'next', project: 'open' },
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

type Runner = { name: string };

const loadedAgentStep = ([first]: readonly Runner[]): AgentStep =>
  first === undefined
    ? { status: 'not-found', checking: false }
    : { status: 'done', agentName: first.name };

// The first of the Agents that run Sessions, or none; `undefined` while they load.
export function agentStep(
  runners: readonly Runner[] | undefined,
  lookingAgain: boolean,
): AgentStep {
  if (runners === undefined || lookingAgain)
    return { status: 'not-found', checking: true };
  return loadedAgentStep(runners);
}
