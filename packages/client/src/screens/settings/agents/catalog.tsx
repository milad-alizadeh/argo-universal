import type * as React from 'react';
import {
  agentList,
  filterAgents,
  agentsEmptyLabel,
  type AgentRowEntry,
} from '#features/agents';
import { agentRows } from '#features/agents';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import type { AgentListViewProps } from './agent-list-view';
import type { AgentsFilterProps, AgentsSearchProps } from './agents-toolbar';
import { RegistryState } from './catalog-states';

type CatalogProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

export const agentsCatalogTestId = 'agents-catalog';

export function AgentCatalog(props: CatalogProps): React.JSX.Element {
  return (
    <FieldList
      gap="sm"
      testID={agentsCatalogTestId}
      sections={catalogSections(props)}
    />
  );
}

const rowsOf = (props: CatalogProps): AgentRowEntry[] =>
  props.catalog.status === 'loaded'
    ? agentList(props.installed, props.catalog.catalog)
    : props.installed.map((agent) => ({
        ...agent,
        description: '',
        installed: true,
        unavailable: false,
      }));

const catalogSections = (props: CatalogProps): FieldListSection[] => {
  const agents = filterAgents(rowsOf(props), props.filter, props.search);
  const cards = agents.map((agent) => ({ rows: agentRows([agent], props) }));

  if (props.catalog.status !== 'loaded')
    return [...cards, registrySection(props)];

  return cards.length ? cards : [emptySection(props)];
};

const registrySection = (props: CatalogProps): FieldListSection => ({
  plain: true,
  rows: [
    <RegistryState
      key="registry"
      status={
        props.catalog.status === 'loaded' ? undefined : props.catalog.status
      }
      onRetry={props.onRetry}
    />,
  ],
});

const emptySection = (props: CatalogProps): FieldListSection => ({
  plain: true,
  rows: [
    <RegistryState
      key="empty"
      empty={agentsEmptyLabel(props.filter, props.search)}
    />,
  ],
});
