import { z } from 'zod';
import { agentServerColumns } from '../columns';
import type { ACPAgent } from './upstream/registry.gen';

export const RegistryAgentId = agentServerColumns.pick({ id: true });

export const AgentServerEnvironment = z.record(z.string(), z.string());

export type AgentServerEnvironment = z.infer<typeof AgentServerEnvironment>;

export type AgentServer = z.infer<typeof RegistryAgentId> &
  Pick<ACPAgent, 'name' | 'icon' | 'version'> & { env: AgentServerEnvironment };

export const AgentServerRecord = agentServerColumns;

export type RegistryAgentId = z.infer<typeof RegistryAgentId>;
