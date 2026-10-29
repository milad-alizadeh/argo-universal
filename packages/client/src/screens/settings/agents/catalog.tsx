import {
  type LoadingRow,
  loadingRows,
} from '@repo/kit/primitives/lists/list-item';
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

export function AgentCatalog(props: CatalogProps): React.JSX.Element {
  return (
    <FieldList
      testID={agentsCatalogTestId}
      sections={catalogSections(props)}
      header={<AgentsFilterPills {...props} />}
      headerBleeds
    />
  );
}

/*
 * Every Agent is a card in one section, so the cards sit a card's gap apart rather than a section's.
 * A load still going stands in for the cards it will bring; one that failed says so and offers Retry.
 * Either way the Agents already known keep their cards above it.
 */
const catalogSections = (props: CatalogProps): FieldListSection[] => {
  const { rows, ...load } = props.agents;

  const cards = [
    ...agentRows(filterAgents(rows, props.filter, props.search), props),
    ...(load.status === 'loading' ? loadingCards : []),
  ];

  return [...cardsSection(cards), ...belowCards(load, cards, props)];
};

const cardsSection = (cards: React.ReactElement[]): FieldListSection[] =>
  cards.length ? [{ rows: cards }] : [];

const belowCards = (
  load: RowsLoad,
  cards: React.ReactElement[],
  props: CatalogProps,
): FieldListSection[] => {
  if (load.status === 'failed') return [registrySection(load, props)];

  return cards.length ? [] : [emptySection(props)];
};

/*
 * Widths, not words: an Agent card is its logo, its name, the line of description under it and its version
 * below that, so the cards the page is waiting for stand in for themselves at the size they will be.
 */
export const agentsLoadingTitle = 'Claude Code';

const loadingAgents: LoadingRow[] = [
  {
    title: agentsLoadingTitle,
    subtitle: 'Anthropic’s Agent for the terminal and the editor.',
    meta: 'v2.1.0',
  },
  {
    title: 'Gemini CLI',
    subtitle: 'Google’s open-source Agent, run from a Project’s folder.',
    meta: 'v0.14.2',
  },
  {
    title: 'Codex',
    subtitle: 'OpenAI’s Agent over ACP.',
    meta: 'v0.8.0',
  },
];

// The loading rows join the Agents' section, a card each, as the cards above them are.
const loadingCards = loadingRows(loadingAgents);

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
