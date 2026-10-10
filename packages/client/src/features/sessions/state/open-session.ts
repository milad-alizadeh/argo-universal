import type { SessionConfigOption, SessionNewInput } from '@repo/contracts';
import type { SessionChoices } from './session-choices';

const checkoutInput = ({
  inNewWorktree,
  baseBranch,
}: SessionChoices): SessionNewInput['checkout'] =>
  inNewWorktree ? { type: 'worktree', baseBranch } : { type: 'main' };

const configValues = (
  configOptions: readonly SessionConfigOption[],
): SessionNewInput['configOptions'] =>
  configOptions.map(({ configId, currentValue }) => ({
    configId,
    value: currentValue,
  }));

// The Session New Session opens, before its first prompt.
export function toNewSessionInput(
  choices: SessionChoices,
  configOptions: readonly SessionConfigOption[],
): SessionNewInput | undefined {
  const { project, agent } = choices;
  if (!project || !agent) return undefined;
  return {
    projectId: project.id,
    agent: agent.agent,
    checkout: checkoutInput(choices),
    configOptions: configValues(configOptions),
    prompt: [],
  };
}

export interface OpenSessionReadiness {
  connected: boolean;
  choices: SessionChoices;
  configReady: boolean;
  opening: boolean;
}

// Open Session works once the Server is reachable and every choice has settled.
export function canOpenSession({
  connected,
  choices,
  configReady,
  opening,
}: OpenSessionReadiness): boolean {
  return [
    connected,
    choices.project !== undefined,
    choices.agent?.availability === 'available',
    choices.baseBranchLoaded,
    configReady,
    !opening,
  ].every(Boolean);
}
