import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import type * as React from 'react';
import {
  agentRows,
  filterAgents,
  agentsEmptyLabel,
  AgentsFilterPills,
  type AgentsFilterProps,
  type RowsLoad,
} from '#features/agents';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import type { AgentListViewProps } from './agent-list-view';
import type { AgentsSearchProps } from './agents-header';
import { RegistryState } from './catalog-states';

type CatalogProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

const agentsCatalogTestId = 'agents-catalog';

/*
 * Nothing known yet while a load goes on: the catalog has no cards of its own, so inside the Skeleton its List
 * draws placeholder rows at the size the cards will be.
 */
export function AgentCatalog(props: CatalogProps): React.JSX.Element {
  const sections = catalogSections(props);

  return (
    <Skeleton
      fill
      loading={isWaiting(props.agents, sections)}
      accessibilityLabel="Loading Agents"
    >
      <Catalog {...props} sections={sections} />
    </Skeleton>
  );
}

function Catalog(
  props: CatalogProps & { sections: FieldListSection[] },
): React.JSX.Element {
  return (
    <FieldList
      testID={agentsCatalogTestId}
      sections={props.sections}
      header={<AgentsFilterPills {...props} />}
      headerBleeds
    />
  );
}

const isWaiting = (
  load: RowsLoad,
  sections: readonly FieldListSection[],
): boolean => load.status === 'loading' && sections.length === 0;

/*
 * Every Agent is a card in one section, so the cards sit a card's gap apart rather than a section's.
 * A load still going adds no cards; one that failed says so and offers Retry. Either way the Agents
 * already known keep their cards above it.
 */
const catalogSections = (props: CatalogProps): FieldListSection[] => {
  const { rows, ...load } = props.agents;
  const found = filterAgents(rows, props.filter, props.search);

  const cards = agentRows(found, props);

  return [...cardsSection(cards), ...belowCards(load, cards, props)];
};

const cardsSection = (cards: React.ReactElement[]): FieldListSection[] =>
  cards.length ? [{ rows: cards }] : [];

// A load still going has found nothing yet, which is not the same as there being none.
const belowCards = (
  load: RowsLoad,
  cards: React.ReactElement[],
  props: CatalogProps,
): FieldListSection[] => {
  if (load.status !== 'loaded') return failedSection(load, props);

  return cards.length ? [] : [emptySection(props)];
};

const failedSection = (
  load: RowsLoad,
  props: CatalogProps,
): FieldListSection[] =>
  load.status === 'failed' ? [registrySection(load, props)] : [];

const registrySection = (
  load: Extract<RowsLoad, { status: 'failed' }>,
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
