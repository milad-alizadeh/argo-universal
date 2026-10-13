import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import {
  SettingsPage,
  type SettingsPageSearch,
} from '#lib/product/settings-page';
import { offeredAgents } from '../../state/agent-list';
import {
  type AgentRowEntry,
  type AgentsFilter,
  countAgents,
} from '../../state/agent-status';
import type { CatalogLoad } from '../../state/catalog-sync';
import { AgentsPhoneHeader } from '../agents-phone-header/agents-phone-header';
import {
  AddAgentButton,
  AgentsFilterPills,
  type AgentsFilterProps,
  type AgentsSearchProps,
  searchLabel,
} from '../agents-toolbar';
import { AgentCatalog } from './catalog';
import { useCatalogErrorToast } from './catalog-states';

export type AgentListViewProps = {
  catalog: CatalogLoad;
  // The Agents installed on the Server, built in and custom.
  installed: AgentRowEntry[];
  onAddCustomAgent: () => void;
  onOpenAgent: (agentId: string) => void;
  // Where the list starts, for stories.
  initialSearch?: string;
  initialFilter?: AgentsFilter;
};

type ListProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

function useListState(
  props: AgentListViewProps,
): AgentsFilterProps & AgentsSearchProps {
  const [search, onSearch] = useState(props.initialSearch ?? '');
  const [filter, onFilter] = useState(props.initialFilter ?? 'all');

  return {
    search,
    onSearch,
    filter,
    onFilter,
    counts: countAgents(listedAgents(props)),
  };
}

// The Agents the list draws before filters: installed, then the loaded registry's others.
const listedAgents = ({
  installed,
  catalog,
}: AgentListViewProps): AgentRowEntry[] =>
  catalog.status === 'loaded'
    ? [...installed, ...offeredAgents(installed, catalog.catalog)]
    : installed;

// The Agents page: installed Agents, then the ACP Registry's, with filters and search.
export function AgentListView(props: AgentListViewProps): React.JSX.Element {
  const list: ListProps = { ...props, ...useListState(props) };
  useCatalogErrorToast(props.catalog);

  return (
    <View className="flex-1 min-h-0 bg-sidebar wide:bg-transparent">
      <AgentsPhoneHeader {...list} />
      <AgentsPage {...list} />
    </View>
  );
}

const pageSearch = (props: AgentsSearchProps): SettingsPageSearch => ({
  label: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
});

// A wide window's title carries Add custom Agent and Search, with the filter pills under it.
function AgentsPage(props: ListProps): React.JSX.Element {
  return (
    <SettingsPage
      title="Agents"
      actions={<AddAgentButton onPress={props.onAddCustomAgent} />}
      search={pageSearch(props)}
      toolbar={<AgentsFilterPills {...props} />}
    >
      <View className="flex-1 min-h-0">
        <AgentCatalog {...props} />
      </View>
    </SettingsPage>
  );
}
