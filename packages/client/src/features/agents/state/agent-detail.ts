import type {
  AgentInfo,
  AgentsCatalogOutput,
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

function registryDetail(registry: CatalogAgent): AgentDetail {
  return {
    id: registry.id,
    name: registry.entry.name,
    description: registry.entry.description,
    icon: registry.entry.icon,
    status: 'not-installed',
    version: registry.entry.version,
    distribution: distributionLabel(registry.support),
    links: registryLinks(registry),
  };
}

// One Agent's page: the Server's probe where it has one, with the ACP Registry's entry beneath.
export function agentDetail(
  info?: AgentInfo,
  registry?: CatalogAgent,
): AgentDetail | undefined {
  const fromRegistry = registry && registryDetail(registry);
  if (!info) return fromRegistry;
  return withProbe(info, fromRegistry);
}

function withProbe(
  info: AgentInfo,
  fromRegistry: AgentDetail | undefined,
): AgentDetail {
  const probed = probedRow(info);
  return {
    ...fromRegistry,
    ...probed,
    icon: probed.icon ?? fromRegistry?.icon,
    signInCommand: info.installStep,
    version: selectedVersion(info, fromRegistry),
    availableVersion: info.availableVersion,
  };
}
const selectedVersion = (
  info: AgentInfo,
  registry?: AgentDetail,
): string | undefined => info.version ?? registry?.version;
