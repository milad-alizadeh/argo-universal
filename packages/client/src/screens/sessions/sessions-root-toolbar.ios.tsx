import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type * as React from 'react';
import {
  defaultSessionsView,
  isDefaultSessionsView,
  resetSessionsViewLabel,
  type SessionsFilter,
  searchSessionsLabel,
  sessionsViewGroups,
} from '#features/sessions';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { iconSymbols } from '#lib/generic/symbols/icon-names';
import { headerFilterIcon } from '#lib/product/header-button';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { toolbarIcon } from '../../lib/product/navigation/toolbar-icon';

export interface SessionsRootToolbarProps extends SessionsFilter {
  onNewSession: () => void;
}

/*
 * The Sessions root's stock header items, as the Stack Toolbar guide builds them: the filter menu, then New Session,
 * each in its own bubble, and the stack's search bar. iOS 26 docks New Session beside the search bar instead.
 */
export function SessionsRootToolbar({
  onNewSession,
  ...filter
}: SessionsRootToolbarProps): React.JSX.Element {
  const newSession = newSessionButton(onNewSession);

  return (
    <>
      <Stack.Toolbar placement="right">
        {filterMenu(filter)}
        {hasLiquidGlass ? null : newSession}
      </Stack.Toolbar>
      {searchBar(filter, newSession)}
    </>
  );
}

function searchBar(
  { onQueryChange }: SessionsFilter,
  newSession: React.JSX.Element,
): React.JSX.Element {
  return (
    <PhoneSearchBar
      placeholder={searchSessionsLabel}
      onSearch={onQueryChange}
      dockedAction={newSession}
    />
  );
}

const filterMenuItem = {
  icon: toolbarIcon(headerFilterIcon),
  accessibilityLabel: 'Filter Sessions',
  separateBackground: true,
};

/*
 * Each of the view's groups as an inline section, its heading the section's title, then Reset to default in a last section.
 * MenuAction.icon takes the option's SF Symbol, which UIMenu draws before the title, after the check.
 */
function filterMenu(filter: SessionsFilter): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu {...filterMenuItem}>
      {sessionsViewGroups.map((group) => viewSection(group, filter))}
      {resetSection(filter)}
    </Stack.Toolbar.Menu>
  );
}

type ViewGroup = (typeof sessionsViewGroups)[number];

type ViewOption = ViewGroup['options'][number];

// An inline menu is a UIMenu section: a divider above it and its title as the heading.
function viewSection(
  group: ViewGroup,
  filter: SessionsFilter,
): React.JSX.Element {
  const options: readonly ViewOption[] = group.options;

  return (
    <Stack.Toolbar.Menu key={group.field} inline title={group.label}>
      {options.map((option) => optionAction(group.field, option, filter))}
    </Stack.Toolbar.Menu>
  );
}

function optionAction(
  field: ViewGroup['field'],
  option: ViewOption,
  filter: SessionsFilter,
): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction
      key={option.value}
      {...optionState(field, option, filter)}
    >
      {option.label}
    </Stack.Toolbar.MenuAction>
  );
}

type StackToolbarMenuActionProps = ComponentProps<
  typeof Stack.Toolbar.MenuAction
>;

type OptionState = Pick<
  StackToolbarMenuActionProps,
  'icon' | 'isOn' | 'onPress'
>;

const optionIcon = (option: ViewOption): Pick<OptionState, 'icon'> =>
  'icon' in option ? { icon: iconSymbols[option.icon].sf } : {};

const optionState = (
  field: ViewGroup['field'],
  option: ViewOption,
  { view, onViewChange }: SessionsFilter,
): OptionState => ({
  ...optionIcon(option),
  isOn: view[field] === option.value,
  onPress: () => onViewChange({ ...view, [field]: option.value }),
});

// MenuAction.disabled greys Reset while the view is the default.
function resetSection({
  view,
  onViewChange,
}: SessionsFilter): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu inline>
      <Stack.Toolbar.MenuAction
        disabled={isDefaultSessionsView(view)}
        onPress={() => onViewChange(defaultSessionsView)}
      >
        {resetSessionsViewLabel}
      </Stack.Toolbar.MenuAction>
    </Stack.Toolbar.Menu>
  );
}

function newSessionButton(onPress: () => void): React.JSX.Element {
  return (
    <Stack.Toolbar.Button
      icon={toolbarIcon('new-session')}
      accessibilityLabel="New Session"
      separateBackground
      onPress={onPress}
    />
  );
}
