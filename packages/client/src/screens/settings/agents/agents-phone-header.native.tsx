import { Stack } from 'expo-router';
import type * as React from 'react';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { headerFilterIcon } from '#lib/product/header-button';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { ScreenHeader } from '#lib/product/navigation/screen-header';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
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

// A phone's native header, as the Stack Toolbar guide builds one: the title, the filter menu, Add custom Agent, and the stack's search bar.
export function AgentsPhoneHeader(
  props: AgentsHeaderProps,
): React.JSX.Element | null {
  if (useWide()) return null;

  return (
    <>
      <ScreenHeader title={agentsTitle} />
      {rightToolbar(props)}
      <PhoneSearchBar placeholder={searchLabel} onSearch={props.onSearch} />
    </>
  );
}

function rightToolbar(props: AgentsHeaderProps): React.JSX.Element {
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
