import type * as React from 'react';
import { HeaderButton } from '#lib/product/header-button';
import {
  ScreenHeader,
  type ScreenHeaderProps,
} from '#lib/product/navigation/screen-header';
import { Menu } from '#primitives/overlays/menu';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { AgentsFilter } from '../../state/agent-status';
import {
  type AgentsFilterProps,
  type AgentsSearchProps,
  addCustomAgentLabel,
  agentsFilterChoices,
  searchLabel,
} from '../agents-toolbar';

type AgentsPhoneHeaderProps = AgentsFilterProps &
  AgentsSearchProps & { onAddCustomAgent: () => void };

// A phone's native header: back, the title, then the filter menu, Add custom Agent and Search.
export function AgentsPhoneHeader(
  props: AgentsPhoneHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <ScreenHeader
      title="Agents"
      search={headerSearch(props)}
      right={[
        <AgentsFilterMenu key="filter" {...props} />,
        <AddButton key="add" onPress={props.onAddCustomAgent} />,
      ]}
    />
  );
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
      icon="filters"
      paired
      dot={filter === 'all' ? undefined : 'filter'}
      accessibilityLabel="Filter Agents"
    />
  );
}
