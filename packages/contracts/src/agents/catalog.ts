import { z } from 'zod';
import { agentColumns, agentCatalogSyncRequestColumns } from '../columns';
import type {
  ACPAgent,
  BinaryTarget,
  PackageDistribution,
} from './upstream/registry.gen';

export type { ACPAgent, ACPAgentRegistry } from './upstream/registry.gen';
export const AgentRecord = agentColumns;
export type AgentRecord = z.infer<typeof AgentRecord>;
export const AgentCatalogSyncRequestRecord = agentCatalogSyncRequestColumns;
export type AgentCatalogSyncRequestRecord = z.infer<typeof AgentCatalogSyncRequestRecord>;

export const AgentsCatalogInput = z
  .object({
    search: z.string().optional(),
  })
  .optional();
export type AgentsCatalogInput = z.infer<typeof AgentsCatalogInput>;

export type RegistrySupport =
  | { kind: 'binary'; recipe: BinaryTarget }
  | { kind: 'npx' | 'uvx'; recipe: PackageDistribution }
  | { kind: 'unsupported'; reason: string };

export interface AgentsCatalogOutput {
  agents: {
    id: AgentRecord['id'];
    entry: ACPAgent;
    support: RegistrySupport;
  }[];
  serverPlatform: string;
  status: 'fresh' | 'stale' | 'unavailable';
  fetchedAt: AgentRecord['catalogSyncedAt'];
  error: string | null;
  rejectedValues: number;
}

export interface AgentsCatalogSyncOutput {
  changedIds: AgentRecord['id'][];
  error: string | null;
  rejectedValues: number;
}
