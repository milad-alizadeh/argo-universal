import type { AgentServer } from '@repo/contracts';
import { useAgents } from './use-agents';

export function useInstalledAgents(): AgentServer[] {
  return useAgents().data ?? [];
}
