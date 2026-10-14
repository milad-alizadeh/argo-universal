import type { AgentInfo, ProjectInfo, SessionNewInput } from '@repo/contracts';
import type { SessionChoices } from './session-choices';

const checkoutInput = ({
  inNewWorktree,
  baseBranch,
}: SessionChoices): SessionNewInput['checkout'] =>
  inNewWorktree ? { type: 'worktree', baseBranch } : { type: 'main' };

type SettledChoices = SessionChoices & {
  project: ProjectInfo;
  agent: AgentInfo;
};

// A Project, an Agent ready to run and, for a main checkout, its base branch.
const settled = (choices: SessionChoices): choices is SettledChoices =>
  [
    choices.project !== undefined,
    choices.agent?.status === 'ready',
    choices.baseBranchLoaded,
  ].every(Boolean);

// The empty Session New Session opens for its choices; its options and first prompt follow once it is open.
export function toNewSessionInput(
  choices: SessionChoices,
): SessionNewInput | undefined {
  if (!settled(choices)) return undefined;
  const { project, agent } = choices;

  return {
    projectId: project.id,
    agent: agent.agent,
    checkout: checkoutInput(choices),
    configOptions: [],
    prompt: [],
  };
}

export interface OpenSessionReadiness {
  connected: boolean;
  choices: SessionChoices;
  // True while the first prompt uploads or waits for the Session.
  sending: boolean;
  // True once the first prompt reached the Session.
  handedOff: boolean;
}

// The first prompt can be sent once the Server is reachable and every choice has settled; it waits for the Session to open.
export function canOpenSession({
  connected,
  choices,
  sending,
  handedOff,
}: OpenSessionReadiness): boolean {
  return [
    connected,
    toNewSessionInput(choices) !== undefined,
    !sending,
    !handedOff,
  ].every(Boolean);
}
