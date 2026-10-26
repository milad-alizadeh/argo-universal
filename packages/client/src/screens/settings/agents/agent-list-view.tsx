import {
  Screen,
  type ScreenProps,
} from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { useState } from 'react';
import {
  type AgentRows,
  type AgentsFilter,
  type AgentsFilterProps,
} from '#features/agents';
import {
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
};

type ListProps = AgentListViewProps & AgentsFilterProps & AgentsSearchProps;

export function AgentListView(props: AgentListViewProps): React.JSX.Element {
  const [search, onSearch] = useState(initialSearch(props));
  const [filter, onFilter] = useState(initialFilter(props));
  const list = { ...props, search, onSearch, filter, onFilter };

  return <AgentsPage {...list} />;
}

const initialSearch = (props: AgentListViewProps): string =>
  props.initialSearch ?? '';

const initialFilter = (props: AgentListViewProps): AgentsFilter =>
  props.initialFilter ?? 'all';

function AgentsPage(props: ListProps): React.JSX.Element {
  return (
    <Screen {...screenProps(props)}>
      <AgentCatalog {...props} />
    </Screen>
  );
}

function screenProps(props: ListProps): ScreenProps {
  return {
    title: agentsTitle,
    search: { label: searchLabel },
    value: props.search,
    onChangeText: props.onSearch,
  };
}
