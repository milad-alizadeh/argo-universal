import type { AgentInfo, AgentsCatalogOutput } from '@repo/contracts';
import type { AgentRowEntry } from './agent-status';

type CatalogAgent = AgentsCatalogOutput['agents'][number];
interface CustomAgentName {
  id: string;
  name: string;
}
const platformNames: Record<string, string> = {
  darwin: 'macOS',
  linux: 'Linux',
  windows: 'Windows',
};

// "darwin-aarch64" reads as "macOS"; an unknown platform keeps its own name.
export function platformName(serverPlatform: string): string {
  const [system = serverPlatform] = serverPlatform.split('-');
  return platformNames[system] ?? serverPlatform;
}

const fromCatalog = ({ id, entry }: CatalogAgent): AgentRowEntry => ({
  id,
  name: entry.name,
  description: entry.description,
  icon: entry.icon,
  status: 'not-installed',
});

const withEntry = (
  agent: AgentRowEntry,
  entry?: CatalogAgent['entry'],
): AgentRowEntry => {
  if (!entry) return agent;
  return {
    description: entry.description,
    ...agent,
    icon: agent.icon ?? entry.icon,
  };
};

// An installed Agent borrows its registry entry's description and icon where the probe has none.
export function withRegistryEntries(
  installed: readonly AgentRowEntry[],
  catalog: AgentsCatalogOutput,
): AgentRowEntry[] {
  const entries = new Map(catalog.agents.map(({ id, entry }) => [id, entry]));
  return installed.map((agent) => withEntry(agent, entries.get(agent.id)));
}

// Every registry Agent as a row the Server has not installed.
const availableAgents = (catalog: AgentsCatalogOutput): AgentRowEntry[] =>
  catalog.agents.map(fromCatalog);

// The registry's Agents the list offers beside the installed ones, leaving out any already installed.
export function offeredAgents(
  installed: readonly AgentRowEntry[],
  catalog: AgentsCatalogOutput,
): AgentRowEntry[] {
  const installedIds = new Set(installed.map(({ id }) => id));
  return availableAgents(catalog).filter(({ id }) => !installedIds.has(id));
}

export const customAgentDescription = 'Custom ACP program';

const logoUri = (logo: string): string | undefined =>
  logo.startsWith('<')
    ? `data:image/svg+xml,${encodeURIComponent(logo)}`
    : logo || undefined;

const customRow = ({ id, name }: CustomAgentName): AgentRowEntry => ({
  id,
  name,
  description: customAgentDescription,
  custom: true,
  status: 'checking',
});

// An Agent as the Server's probe reports it.
export function probedRow(info: AgentInfo, custom = false): AgentRowEntry {
  return {
    id: info.agent,
    name: info.label,
    icon: logoUri(info.logo),
    ...readiness(info),
    ...customDescription(custom),
  };
}
// A newer release shows only once the installed one is Ready; any other status needs the user first.
const readiness = (
  info: AgentInfo,
): Pick<AgentRowEntry, 'status' | 'reason' | 'disabled'> => ({
  status: listedStatus(info),
  ...reasonOf(info),
  ...(info.enabled ? {} : { disabled: true }),
});
// A disabled Agent is never checked, so with no saved Readiness it reads as Disabled, never Checking….
export function listedStatus(info: AgentInfo): AgentRowEntry['status'] {
  if (!info.enabled && info.status === 'checking') return 'disabled';
  return checkedStatus(info);
}
const checkedStatus = (info: AgentInfo): AgentRowEntry['status'] =>
  info.status === 'ready' && hasPublishedUpdate(info) ? 'update' : info.status;
const reasonOf = ({ reason }: AgentInfo): Pick<AgentRowEntry, 'reason'> =>
  reason === undefined ? {} : { reason };
const hasPublishedUpdate = (info: AgentInfo): boolean => {
  if (!info.version || !info.availableVersion) return false;
  return info.version !== info.availableVersion;
};

// The Server's Agents as last checked; a custom Agent the list has not reached yet reads as Checking….
export function installedAgents(
  agents: readonly AgentInfo[],
  custom: readonly CustomAgentName[],
): AgentRowEntry[] {
  const customIds = new Set(custom.map(({ id }) => id));
  const probed = new Set(agents.map(({ agent }) => agent));
  return [
    ...agents.map((info) => probedRow(info, customIds.has(info.agent))),
    ...custom.filter(({ id }) => !probed.has(id)).map(customRow),
  ];
}

const customDescription = (
  custom: boolean,
): Pick<AgentRowEntry, 'custom' | 'description'> =>
  custom ? { custom, description: customAgentDescription } : {};
