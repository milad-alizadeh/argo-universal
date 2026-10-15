import { Stack } from 'expo-router';
import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { headerFilterIcon } from '#lib/product/header-button';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import { toolbarIcon } from '../../../lib/product/navigation/toolbar-icon';
import {
  type AgentsFilterProps,
  type AgentsSearchProps,
  addCustomAgentLabel,
  agentsFilterChoices,
  searchLabel,
} from './agents-toolbar';

type AgentsPhoneHeaderProps = AgentsFilterProps &
  AgentsSearchProps & { onAddCustomAgent: () => void };

const filterIcon = toolbarIcon(headerFilterIcon);

const addIcon = toolbarIcon('add');

// A phone's native header, as the Stack Toolbar guide builds one: the filter menu, Add custom Agent, and the stack's search bar.
export function AgentsPhoneHeader(
  props: AgentsPhoneHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      {rightToolbar(props)}
      <PhoneSearchBar placeholder={searchLabel} onSearch={props.onSearch} />
    </>
  );
}

function rightToolbar(props: AgentsPhoneHeaderProps): React.JSX.Element {
  return (
    <Stack.Toolbar placement="right">
      {filterMenu(props)}
      <Stack.Toolbar.Button
        icon={addIcon}
        accessibilityLabel={addCustomAgentLabel}
        onPress={props.onAddCustomAgent}
      />
    </Stack.Toolbar>
  );
}

// All, Installed or Not installed, checked on the current one; on Android a dot shows while a filter narrows the list.
function filterMenu({
  filter,
  onFilter,
}: AgentsFilterProps): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu icon={filterIcon} accessibilityLabel="Filter Agents">
      {toolbarDot(filter !== 'all')}
      {agentsFilterChoices.map(({ value, label }) =>
        filterChoice(label, value === filter, () => onFilter(value)),
      )}
    </Stack.Toolbar.Menu>
  );
}

function filterChoice(
  label: string,
  isOn: boolean,
  onPress: () => void,
): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction key={label} isOn={isOn} onPress={onPress}>
      {label}
    </Stack.Toolbar.MenuAction>
  );
}
