import type * as React from 'react';
import {
  agentCards,
  filterAgents,
  agentsEmptyLabel,
  type RowsLoad,
} from '#features/agents';
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

const catalogSections = (props: CatalogProps): FieldListSection[] => {
  const { rows, ...load } = props.agents;
  const agents = filterAgents(rows, props.filter, props.search);
  const cards = agents.map((agent) => ({ rows: agentCards([agent], props) }));

  if (load.status !== 'loaded') return [...cards, registrySection(load, props)];

  return cards.length ? cards : [emptySection(props)];
};

const registrySection = (
  load: Exclude<RowsLoad, { status: 'loaded' }>,
  props: CatalogProps,
): FieldListSection => ({
  plain: true,
  rows: [<RegistryState key="registry" load={load} onRetry={props.onRetry} />],
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
