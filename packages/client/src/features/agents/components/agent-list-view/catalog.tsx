import type { AgentsCatalogOutput } from '@repo/contracts';
import type * as React from 'react';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import {
  offeredAgents,
  platformName,
  withRegistryEntries,
} from '../../state/agent-list';
import {
  type AgentRowEntry,
  type AgentsFilter,
  filterAgents,
} from '../../state/agent-status';
import type { CatalogLoad } from '../../state/catalog-sync';
import { agentRows } from '../agent-list-item/agent-list-item';
import {
  catalogEmptySection,
  catalogLoadingSection,
  type LoadingSectionProps,
} from './catalog-states';

export type AgentCatalogProps = {
  catalog: CatalogLoad;
  installed: readonly AgentRowEntry[];
  filter: AgentsFilter;
  search: string;
  onOpenAgent: (agentId: string) => void;
};

type LoadedProps = AgentCatalogProps & { saved: AgentsCatalogOutput };

type AgentGroup = { title: string; agents: AgentRowEntry[] };

export const agentsCatalogTestId = 'agents-catalog';

/*
 * The installed Agents, then the ACP Registry's other Agents for this Server, as grouped rows.
 * The registry can list hundreds of Agents, so a FieldList mounts only the rows in view.
 */
export function AgentCatalog(props: AgentCatalogProps): React.JSX.Element {
  return (
    <FieldList testID={agentsCatalogTestId} sections={catalogSections(props)} />
  );
}

/*
 * Until the registry's Agents arrive, or while a failed load waits to retry, the installed
 * Agents show above a loading row; a toast says why a load failed.
 */
function catalogSections(props: AgentCatalogProps): FieldListSection[] {
  const { catalog } = props;

  if (catalog.status !== 'loaded') return [loadingSection(props)];

  if (catalog.catalog.status === 'unavailable')
    return [
      loadingSection(props, platformName(catalog.catalog.serverPlatform)),
    ];

  return loadedSections({ ...props, saved: catalog.catalog });
}

function loadingSection(
  props: AgentCatalogProps,
  platform?: string,
): FieldListSection {
  const section: LoadingSectionProps = {
    installed: filterAgents(props.installed, props),
    onOpenAgent: props.onOpenAgent,
  };

  if (platform) section.platform = platform;

  return catalogLoadingSection(section);
}

const registryGroups = (props: LoadedProps, platform: string): AgentGroup[] => [
  {
    title: 'Installed',
    agents: withRegistryEntries(props.installed, props.saved),
  },
  {
    title: `Available for ${platform}`,
    agents: offeredAgents(props.installed, props.saved),
  },
];

// Installed, then Available for the Server's platform, leaving out a group the filters empty.
const agentGroups = (props: LoadedProps, platform: string): AgentGroup[] =>
  registryGroups(props, platform)
    .map(({ title, agents }) => ({
      title,
      agents: filterAgents(agents, props),
    }))
    .filter(({ agents }) => agents.length > 0);

function loadedSections(props: LoadedProps): FieldListSection[] {
  const platform = platformName(props.saved.serverPlatform);
  const groups = agentGroups(props, platform);

  if (groups.length === 0)
    return [catalogEmptySection({ platform, search: props.search })];

  return groups.map(({ title, agents }) => ({
    title,
    rows: agentRows(agents, props.onOpenAgent),
  }));
}
