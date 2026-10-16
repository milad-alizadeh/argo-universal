import type * as React from 'react';
import { agentRows, filterAgents, agentsEmptyLabel } from '#features/agents';
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
  const { status, rows } = props.agents;
  const agents = filterAgents(rows, props.filter, props.search);
  const cards = agents.map((agent) => ({ rows: agentRows([agent], props) }));

  if (status !== 'loaded') return [...cards, registrySection(status, props)];

  return cards.length ? cards : [emptySection(props)];
};

const registrySection = (
  status: 'loading' | 'failed',
  props: CatalogProps,
): FieldListSection => ({
  plain: true,
  rows: [
    <RegistryState key="registry" status={status} onRetry={props.onRetry} />,
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
