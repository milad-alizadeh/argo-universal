import type { AgentInfo, ProjectInfo } from '@repo/contracts';
import { newSessionCatalogs, newSessionProjects } from '@repo/mocks/app';
import type { SessionChoiceInput } from './session-choices';

function required<Value>(value: Value | undefined, what: string): Value {
  if (value === undefined) throw new Error(`Recorded mocks need ${what}`);
  return value;
}

function baseBranchOf(project: ProjectInfo): string {
  if (project.checkoutChoice.type !== 'worktree')
    throw new Error('The first recorded Project needs a worktree');
  return project.checkoutChoice.baseBranch;
}

const [firstProject, secondProject] = newSessionProjects;
const [agentOne, agentTwo] = newSessionCatalogs.bothAvailable;

export const worktreeProject: ProjectInfo = required(
  firstProject,
  'a worktree Project',
);
export const mainProject: ProjectInfo = required(
  secondProject,
  'a main Project',
);
export const firstAgent: AgentInfo = required(agentOne, 'two Agents');
export const secondAgent: AgentInfo = required(agentTwo, 'two Agents');
export const notInstalled: AgentInfo = required(
  newSessionCatalogs.oneNotInstalled[0],
  'an Agent that is not installed',
);
export const projectBaseBranch = baseBranchOf(worktreeProject);

export const input = (
  overrides: Partial<SessionChoiceInput> = {},
): SessionChoiceInput => ({
  projects: newSessionProjects,
  agents: newSessionCatalogs.bothAvailable,
  chosen: {},
  branches: undefined,
  ...overrides,
});
