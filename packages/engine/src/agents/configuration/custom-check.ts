import type { AgentCheck, CustomAgentDefinition } from '@repo/contracts';
import type { CheckAgentLaunch } from '../agent-launch';
import { createCustomAgentLaunch } from './custom-launch';

export type CustomCheck = {
  agentId: string;
  definition: CustomAgentDefinition;
};

// The ACP module runs the handshake; the Agents module only names what to launch.
export const checkCustomDefinition = (
  checkAgentLaunch: CheckAgentLaunch,
  { agentId, definition }: CustomCheck,
): Promise<AgentCheck> =>
  checkAgentLaunch({
    name: definition.name,
    launch: createCustomAgentLaunch({ agentId, definition }),
  });
