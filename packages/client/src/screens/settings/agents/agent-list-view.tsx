import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { type AgentRows, type AgentsFilter } from '#features/agents';
import {
  SettingsPage,
  type SettingsPageSearch,
} from '#lib/product/settings-page';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import {
  AgentsFilterPills,
  type AgentsHeaderProps,
  type AgentsFilterProps,
  type AgentsSearchProps,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';
import { AgentCatalog } from './catalog';

export type AgentListViewProps = {
  agents: AgentRows;
  onInstall: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: () => void;
  initialSearch?: string;
  initialFilter?: AgentsFilter;
  renderHeader?: (header: AgentsHeaderProps) => ReactNode;
};

type ListProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

export function AgentListView(props: AgentListViewProps): React.JSX.Element {
  const [search, onSearch] = useState(initialSearch(props));
  const [filter, onFilter] = useState(initialFilter(props));
  const list = { ...props, search, onSearch, filter, onFilter };

  return (
    <View className="flex-1 min-h-0 bg-content wide:bg-transparent">
      {props.renderHeader?.(list)}
      <AgentsPage {...list} />
    </View>
  );
}

const initialSearch = (props: AgentListViewProps): string =>
  props.initialSearch ?? '';

const initialFilter = (props: AgentListViewProps): AgentsFilter =>
  props.initialFilter ?? 'all';

function AgentsPage(props: ListProps): React.JSX.Element {
  return (
    <SettingsPage
      title={agentsTitle}
      search={pageSearch(props)}
      toolbar={<AgentsFilterPills {...props} />}
    >
      <PhoneFilters {...props} />
      <AgentCatalog {...props} />
    </SettingsPage>
  );
}

const pageSearch = (props: AgentsSearchProps): SettingsPageSearch => ({
  label: searchLabel,
  value: props.search,
  onChangeText: props.onSearch,
});

function PhoneFilters(props: AgentsFilterProps): React.JSX.Element | null {
  return (
    <SizeClass only="compact">
      <View className="z-10 shrink-0 px-4 py-3">
        <AgentsFilterPills {...props} />
      </View>
    </SizeClass>
  );
}
