import { Stack } from 'expo-router';
import type * as React from 'react';
import { headerFilterIcon } from '#lib/product/header-button';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import { SizeClass } from '../../../lib/generic/size-class/size-class';
import { toolbarIcon } from '../../../lib/product/navigation/toolbar-icon';
import {
  type AgentsFilterProps,
  type AgentsHeaderProps,
  addCustomAgentLabel,
  agentsFilterChoices,
  agentsTitle,
  searchLabel,
} from './agents-toolbar';

const filterIcon = toolbarIcon(headerFilterIcon);

const addIcon = toolbarIcon('add');

// A phone's native header, as the Stack Toolbar guide builds one: the title, the filter menu and Add custom Agent, each in its own bubble, and the stack's search bar.
export function AgentsPhoneHeader(props: AgentsHeaderProps): React.JSX.Element {
  return (
    <SizeClass only="compact">
      <ScreenHeader title={agentsTitle} />
      {rightToolbar(props)}
      <PhoneSearchBar placeholder={searchLabel} onSearch={props.onSearch} />
    </SizeClass>
  );
}

function rightToolbar(props: AgentsHeaderProps): React.JSX.Element {
  return (
    <Stack.Toolbar placement="right">
      {filterMenu(props)}
      <Stack.Toolbar.Button
        icon={addIcon}
        accessibilityLabel={addCustomAgentLabel}
        separateBackground
        onPress={props.onAddCustomAgent}
      />
    </Stack.Toolbar>
  );
}

const filterMenuItem = {
  icon: filterIcon,
  accessibilityLabel: 'Filter Agents',
  separateBackground: true,
};

// All, Installed or Not installed, checked on the current one; on Android a dot shows while a filter narrows the list.
function filterMenu({
  filter,
  onFilter,
}: AgentsFilterProps): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu {...filterMenuItem}>
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
