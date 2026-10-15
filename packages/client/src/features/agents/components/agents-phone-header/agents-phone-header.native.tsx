import AddIcon from '@expo/material-symbols/add.xml';
import FilterList from '@expo/material-symbols/filter_list.xml';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { StackSearch } from '#lib/product/navigation/stack-search.native';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import {
  type AgentsFilterProps,
  type AgentsSearchProps,
  addCustomAgentLabel,
  agentsFilterChoices,
  searchLabel,
} from '../agents-toolbar';

type AgentsPhoneHeaderProps = AgentsFilterProps &
  AgentsSearchProps & { onAddCustomAgent: () => void };

const filterIcon =
  process.env.EXPO_OS === 'ios' ? 'slider.horizontal.3' : FilterList;

const addIcon = process.env.EXPO_OS === 'ios' ? 'plus' : AddIcon;

// A phone's native header, as the Stack Toolbar guide builds one: the filter menu, Add custom Agent, and the stack's search bar.
export function AgentsPhoneHeader(
  props: AgentsPhoneHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      {rightToolbar(props)}
      <StackSearch placeholder={searchLabel} onSearch={props.onSearch} />
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
