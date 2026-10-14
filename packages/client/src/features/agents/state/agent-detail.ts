import type {
  AgentInfo,
  AgentsCatalogOutput,
  InstallationOwner,
  MachineTools,
  RegistrySupport,
} from '@repo/contracts';
import type { AgentDetail } from './agent-detail-types';
import { probedRow } from './agent-list';
import { isInstalled } from './agent-status';

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

type ToolNeed = {
  tool: keyof MachineTools;
  status: AgentDetail['status'];
  // What the Server's look observed.
  reason: string;
};

const toolNeeds: Partial<Record<CatalogAgent['support']['kind'], ToolNeed>> = {
  npx: { tool: 'node', status: 'needs-node', reason: 'npx isn’t on this Mac.' },
  uvx: { tool: 'uv', status: 'needs-uv', reason: 'uvx isn’t on this Mac.' },
};

// Unknown until the Server has looked: a missing look never hides Install.
const lacks = ({ tool }: ToolNeed, tools?: MachineTools): boolean =>
  tools?.[tool] === false;

type NotInstalled = Pick<AgentDetail, 'status' | 'reason'>;

// Install is offered only when the tool its distribution installs with is on the Server.
const notInstalledStatus = (
  { support }: CatalogAgent,
  tools?: MachineTools,
): NotInstalled => {
  const need = toolNeeds[support.kind];

  return need && lacks(need, tools)
    ? { status: need.status, reason: need.reason }
    : { status: 'not-installed' };
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
    ...notInstalledStatus(registry, tools),
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
  homebrew: 'Installed with Homebrew',
  npm: 'Installed with npm',
  unknown: 'Found on this Mac',
} as const satisfies Record<InstallationOwner, string>;

type FoundCopy = Pick<
  AgentDetail,
  'source' | 'distribution' | 'owner' | 'path' | 'updateCommand'
>;

// Where an installed Agent was found replaces how the Server would install it.
const foundSource = ({ owner, path, updateCommand }: AgentInfo): FoundCopy =>
  owner
    ? {
        source: sourceLabels[owner],
        distribution: undefined,
        owner,
        path,
        updateCommand,
      }
    : {};

function withProbe(
  info: AgentInfo,
  fromRegistry: AgentDetail | undefined,
): AgentDetail {
  const probed = probedRow(info);

  return {
    ...fromRegistry,
    ...probed,
    ...foundSource(info),
    ...probedStatus(probed, fromRegistry),
    icon: probed.icon ?? fromRegistry?.icon,
    ...versionsOf(info, fromRegistry),
  };
}

// A configured Agent with nothing installed still needs the tool its install uses.
const probedStatus = (
  probed: AgentDetail,
  registry: AgentDetail | undefined,
): NotInstalled =>
  probed.status === 'not-installed' && registry
    ? { status: registry.status, reason: registry.reason }
    : { status: probed.status, reason: probed.reason };

const catalogRelease = (
  info: AgentInfo,
  fromRegistry: AgentDetail | undefined,
): string | undefined => info.availableVersion ?? fromRegistry?.version;

// Before install the page offers the catalog's release; after, only the copy's own versions.
const versionsOf = (
  info: AgentInfo,
  fromRegistry: AgentDetail | undefined,
): Pick<AgentDetail, 'version' | 'agentVersion' | 'availableVersion'> => ({
  version: isInstalled(info)
    ? info.version
    : catalogRelease(info, fromRegistry),
  agentVersion: info.agentVersion,
  availableVersion: info.availableVersion,
});
