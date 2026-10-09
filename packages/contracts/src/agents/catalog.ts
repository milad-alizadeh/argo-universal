import { z } from 'zod';
import type {
  ACPAgent,
  BinaryTarget,
  PackageDistribution,
} from './upstream/registry.gen';

export type { ACPAgent, ACPAgentRegistry } from './upstream/registry.gen';

export const AgentsCatalogInput = z
  .object({
    search: z.string().optional(),
    refresh: z.boolean().optional(),
  })
  .optional();
export type AgentsCatalogInput = z.infer<typeof AgentsCatalogInput>;

export type RegistrySupport =
  | { kind: 'binary'; recipe: BinaryTarget }
  | { kind: 'npx' | 'uvx'; recipe: PackageDistribution }
  | { kind: 'unsupported'; reason: string };

export interface AgentsCatalogOutput {
  agents: { entry: ACPAgent; support: RegistrySupport }[];
  serverPlatform: string;
  status: 'fresh' | 'stale' | 'unavailable';
  fetchedAt: string | null;
  error: string | null;
  rejectedValues: number;
}
