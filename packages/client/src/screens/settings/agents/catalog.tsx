import {
  type LoadingRow,
  loadingRows,
} from '@repo/kit/primitives/lists/list-item';
import { RowDrawingContext } from '@repo/kit/row-drawing-context';
import type * as React from 'react';
import { View } from 'react-native';
import {
  agentRows,
  filterAgents,
  agentsEmptyLabel,
  type RowsLoad,
} from '#features/agents';
import {
  FieldList,
  type FieldListSection,
} from '#lib/product/field-list/field-list';
import type { AgentListViewProps } from './agent-list-view';
import {
  AgentsFilterPills,
  type AgentsFilterProps,
  type AgentsSearchProps,
} from './agents-toolbar';
import { RegistryState } from './catalog-states';

type CatalogProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

export const agentsCatalogTestId = 'agents-catalog';

export function AgentCatalog(props: CatalogProps): React.JSX.Element {
  return (
    <RowDrawingContext value="content">
      <FieldList
        gap="sm"
        testID={agentsCatalogTestId}
        sections={catalogSections(props)}
        header={<FilterHeader {...props} />}
      />
    </RowDrawingContext>
  );
}

function FilterHeader(props: CatalogProps): React.JSX.Element {
  return (
    <View className="pb-3">
      <AgentsFilterPills {...props} />
    </View>
  );
}

/*
 * A load still going stands in for the cards it will bring; one that failed says so and offers Retry.
 * Either way the Agents already known keep their cards above it.
 */
const catalogSections = (props: CatalogProps): FieldListSection[] => {
  const { rows, ...load } = props.agents;
  const agents = filterAgents(rows, props.filter, props.search);
  const cards = agents.map((agent) => ({ rows: agentRows([agent], props) }));

  if (load.status === 'loading') return [...cards, ...loadingCards];

  if (load.status === 'failed') return [...cards, registrySection(load, props)];

  return foundSections(cards, props);
};

const foundSections = (
  cards: FieldListSection[],
  props: CatalogProps,
): FieldListSection[] => (cards.length ? cards : [emptySection(props)]);

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

// Each Agent is its own card, so each loading row is its own section, as the cards above them are.
const loadingCards: FieldListSection[] = loadingRows(loadingAgents).map(
  (row) => ({ rows: [row] }),
);

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
