import type {
  ACPAgent,
  AgentServer,
  AgentsRegistryOutput,
} from '@repo/contracts';
import { type InstalledAgents, installedAgents } from './installed-agents';

export const server = (id: string, name: string): AgentServer => ({
  id,
  name,
  version: '1.0.0',
  env: {},
});

const entry = (id: string, name: string): ACPAgent => ({
  id,
  name,
  version: '2.0.0',
  description: `${name} writes code.`,
  distribution: {},
});

export const registryOf = (
  ...agents: AgentsRegistryOutput['agents']
): AgentsRegistryOutput => ({ agents, error: null });

// The Server's answer, through the real ordering.
export const loaded = (...agents: AgentServer[]): InstalledAgents =>
  installedAgents({ data: agents, isError: false });

export const zed = server('zed-agent', 'Zed Agent');

export const amp = server('amp-agent', 'Amp');

export const zedEntry = entry(zed.id, zed.name);

export const ampEntry = entry(amp.id, amp.name);

export const bolt = entry('bolt-agent', 'Bolt');

// Zed and Amp run here; Bolt has no build for this platform.
export const registry = registryOf(
  { entry: zedEntry, support: 'npx' },
  { entry: bolt, support: 'unavailable' },
  { entry: ampEntry, support: 'binary' },
);
