import type {
  AgentInfo,
  ProjectInfo,
  ProjectsBranchesOutput,
} from '@repo/contracts';

// What the reader picked on New Session; anything unpicked follows the defaults.
export interface ChosenSettings {
  projectId?: string;
  agent?: string;
  newWorktree?: boolean;
}

export interface SessionChoiceInput {
  projects: readonly ProjectInfo[];
  agents: readonly AgentInfo[];
  chosen: ChosenSettings;
  // The chosen main Project's branches; undefined until they load.
  branches: ProjectsBranchesOutput | undefined;
}

export interface SessionChoices {
  project: ProjectInfo | undefined;
  agent: AgentInfo | undefined;
  inNewWorktree: boolean;
  baseBranch: string;
  baseBranchLoaded: boolean;
}

// Another Project starts from its own checkout default.
export const chooseAnotherProject = (
  chosen: ChosenSettings,
  projectId: string,
): ChosenSettings => ({ ...chosen, projectId, newWorktree: undefined });

// The chosen Project while it is listed, else the first.
export const chooseProject = (
  projects: readonly ProjectInfo[],
  chosen: string | undefined,
): ProjectInfo | undefined =>
  projects.find((entry) => entry.id === chosen) ?? projects[0];

const chooseAgent = (
  agents: readonly AgentInfo[],
  chosen: string | undefined,
): AgentInfo | undefined =>
  agents.find((entry) => entry.agent === chosen) ??
  agents.find((entry) => entry.availability === 'available') ??
  agents[0];

type Checkout = Pick<
  SessionChoices,
  'inNewWorktree' | 'baseBranch' | 'baseBranchLoaded'
>;

const isMain = (project: ProjectInfo | undefined): boolean =>
  project?.checkoutChoice.type === 'main';

const worktreeBase = (project: ProjectInfo | undefined): string | undefined =>
  project?.checkoutChoice.type === 'worktree'
    ? project.checkoutChoice.baseBranch
    : undefined;

const currentBranch = (branches: ProjectsBranchesOutput | undefined): string =>
  branches?.currentBranch ?? 'main';

// A worktree Project starts from its own base branch; a main Project from its current branch.
const baseBranchOf = (
  project: ProjectInfo | undefined,
  branches: ProjectsBranchesOutput | undefined,
): string => worktreeBase(project) ?? currentBranch(branches);

// A main Project opens in place unless the reader asks for a new worktree.
const checkoutOf = (
  project: ProjectInfo | undefined,
  { chosen, branches }: SessionChoiceInput,
): Checkout => ({
  inNewWorktree: chosen.newWorktree ?? !isMain(project),
  baseBranch: baseBranchOf(project, branches),
  baseBranchLoaded: !isMain(project) || branches !== undefined,
});

// The reader's choices of where and how the Session runs, over the Project's and Agents' defaults.
export function toSessionChoices(input: SessionChoiceInput): SessionChoices {
  const project = chooseProject(input.projects, input.chosen.projectId);
  return {
    project,
    agent: chooseAgent(input.agents, input.chosen.agent),
    ...checkoutOf(project, input),
  };
}
