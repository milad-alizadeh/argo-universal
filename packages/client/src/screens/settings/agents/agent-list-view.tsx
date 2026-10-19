import type * as React from 'react';
import { useState } from 'react';
import { type AgentRows, type AgentsFilter } from '#features/agents';
import { Page, type PageProps } from '#primitives/scaffolds/page';
import {
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
    <Page {...pageProps(props)}>
      <AgentCatalog {...props} />
    </Page>
  );
}

function pageProps(props: ListProps): PageProps {
  return {
    title: agentsTitle,
    search: { label: searchLabel },
    value: props.search,
    onChangeText: props.onSearch,
  };
}
