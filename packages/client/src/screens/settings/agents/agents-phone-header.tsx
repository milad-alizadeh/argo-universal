import type * as React from 'react';
import { type AgentsFilter } from '#features/agents';
import { HeaderButton, headerFilterIcon } from '#lib/product/header-button';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import { Menu } from '#primitives/overlays/menu';
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
  right: [
    <AgentsFilterMenu key="filter" {...props} />,
    <AddButton key="add" onPress={props.onAddCustomAgent} />,
  ],
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

function AddButton({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <HeaderButton
      icon="add"
      paired
      accessibilityLabel={addCustomAgentLabel}
      onPress={onPress}
    />
  );
}

// All, Installed or Not installed, checked on the current one; a dot shows while a filter narrows the list.
function AgentsFilterMenu(props: AgentsFilterProps): React.JSX.Element {
  return (
    <Menu
      accessibilityLabel="Filter Agents"
      value={props.filter}
      options={agentsFilterChoices}
      onValueChange={props.onFilter}
      trigger={filterTrigger(props.filter)}
    />
  );
}

// The Menu hands its trigger the press and ARIA props, so the trigger is the HeaderButton itself.
function filterTrigger(filter: AgentsFilter): React.JSX.Element {
  return (
    <HeaderButton
      icon={headerFilterIcon}
      paired
      dot={filter === 'all' ? undefined : 'filter'}
      accessibilityLabel="Filter Agents"
    />
  );
}
