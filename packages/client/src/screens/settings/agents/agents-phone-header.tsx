import type * as React from 'react';
import { headerFilterIcon } from '#lib/product/header-button';
import type { HeaderItem } from '#lib/product/navigation/header-items';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import {
  type AgentsFilterProps,
  type AgentsHeaderProps,
  type AgentsSearchProps,
  addCustomAgentLabel,
  agentsFilterChoices,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';

// A narrow window's header: back, the title, then the filter menu, Add custom Agent and Search.
export const agentsHeader = (props: AgentsHeaderProps): ScreenHeaderProps => ({
  title: agentsTitle,
  search: headerSearch(props),
  right: [filterItem(props), addItem(props.onAddCustomAgent)],
});

export function AgentsPhoneHeader(
  props: AgentsHeaderProps,
): React.JSX.Element | null {
  return <ScreenHeader {...agentsHeader(props)} />;
}

const headerSearch = ({
  onSearch,
}: AgentsSearchProps): ScreenHeaderProps['search'] => ({
  placeholder: searchLabel,
  onChangeText: onSearch,
});

const addItem = (onPress: () => void): HeaderItem => ({
  icon: 'add',
  accessibilityLabel: addCustomAgentLabel,
  onPress,
});

// All, Installed or Not installed, checked on the current one; a dot shows while a filter narrows the list.
const filterItem = ({ filter, onFilter }: AgentsFilterProps): HeaderItem => ({
  icon: headerFilterIcon,
  accessibilityLabel: 'Filter Agents',
  dot: filter === 'all' ? undefined : 'filter',
  menu: agentsFilterChoices.map(({ value, label }) => ({
    label,
    selected: value === filter,
    onPress: () => onFilter(value),
  })),
});
