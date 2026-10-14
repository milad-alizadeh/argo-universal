import type {
  AgentInfo,
  AgentsCatalogOutput,
  MachineTools,
  RegistrySupport,
} from '@repo/contracts';
import type { AgentDetail } from './agent-detail-types';
import { probedRow } from './agent-list';

type CatalogAgent = AgentsCatalogOutput['agents'][number];

const distributionLabels = {
  binary: 'Binary',
  npx: 'npm · needs Node.js',
  uvx: 'Python · needs uv',
};

// How the Server installs a registry Agent, or why it cannot on this platform.
const distributionLabel = (support: RegistrySupport): string =>
  support.kind === 'unsupported'
    ? support.reason
    : distributionLabels[support.kind];

function registryLinks({ entry }: CatalogAgent): AgentDetail['links'] {
  const links = [
    { label: 'GitHub', url: entry.repository },
    { label: 'Licence', url: entry.license_url },
    { label: 'Website', url: entry.website },
  ];

  return links.flatMap(({ label, url }) => (url ? [{ label, url }] : []));
}

type ToolNeed = { tool: keyof MachineTools; status: AgentDetail['status'] };

const toolNeeds: Partial<Record<CatalogAgent['support']['kind'], ToolNeed>> = {
  npx: { tool: 'node', status: 'needs-node' },
  uvx: { tool: 'uv', status: 'needs-uv' },
};

// Unknown until the Server has looked: a missing look never hides Install.
const lacks = ({ tool }: ToolNeed, tools?: MachineTools): boolean =>
  tools?.[tool] === false;

// Install is offered only when the tool its distribution installs with is on the Server.
const notInstalledStatus = (
  { support }: CatalogAgent,
  tools?: MachineTools,
): AgentDetail['status'] => {
  const need = toolNeeds[support.kind];

  return need && lacks(need, tools) ? need.status : 'not-installed';
};

function registryDetail(
  registry: CatalogAgent,
  tools?: MachineTools,
): AgentDetail {
  return {
    id: registry.id,
    name: registry.entry.name,
    description: registry.entry.description,
    icon: registry.entry.icon,
    status: notInstalledStatus(registry, tools),
    version: registry.entry.version,
    distribution: distributionLabel(registry.support),
    links: registryLinks(registry),
  };
}

// One Agent's page: the Server's probe where it has one, with the ACP Registry's entry beneath.
export function agentDetail(
  info?: AgentInfo,
  registry?: CatalogAgent,
  tools?: MachineTools,
): AgentDetail | undefined {
  const fromRegistry = registry && registryDetail(registry, tools);

  if (!info) return fromRegistry;

  return withProbe(info, fromRegistry);
}

const sourceLabels = {
  argo: 'Installed by Argo',
  unknown: 'Found on this Mac',
} as const;

// Where an installed Agent was found replaces how the Server would install it.
const foundSource = ({
  owner,
}: AgentInfo): Pick<AgentDetail, 'source' | 'distribution'> =>
  owner ? { source: sourceLabels[owner], distribution: undefined } : {};

function withProbe(
  info: AgentInfo,
  fromRegistry: AgentDetail | undefined,
): AgentDetail {
  const probed = probedRow(info);

  return {
    ...fromRegistry,
    ...probed,
    ...foundSource(info),
    status: probedStatus(probed, fromRegistry),
    icon: probed.icon ?? fromRegistry?.icon,
    version: selectedVersion(info, fromRegistry),
    availableVersion: info.availableVersion,
  };
}

// A configured Agent with nothing installed still needs the tool its install uses.
const probedStatus = (
  probed: AgentDetail,
  registry: AgentDetail | undefined,
): AgentDetail['status'] =>
  probed.status === 'not-installed' && registry
    ? registry.status
    : probed.status;

const selectedVersion = (
  info: AgentInfo,
  registry?: AgentDetail,
): string | undefined => info.version ?? registry?.version;
