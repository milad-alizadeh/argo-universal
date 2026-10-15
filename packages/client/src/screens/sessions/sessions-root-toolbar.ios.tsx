import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type * as React from 'react';
import {
  type SessionsFilter,
  searchSessionsLabel,
  sessionsFilterChoices,
} from '#features/sessions';
import { hasLiquidGlass } from '#lib/generic/native-header';
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

// Active or Archived, checked on the current one.
function filterMenu(filter: SessionsFilter): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu {...filterMenuItem}>
      {sessionsFilterChoices.map(({ value, label }) => (
        <Stack.Toolbar.MenuAction key={value} {...choiceState(value, filter)}>
          {label}
        </Stack.Toolbar.MenuAction>
      ))}
    </Stack.Toolbar.Menu>
  );
}

type StackToolbarMenuActionProps = ComponentProps<
  typeof Stack.Toolbar.MenuAction
>;

const choiceState = (
  value: (typeof sessionsFilterChoices)[number]['value'],
  { archived, onArchivedChange }: SessionsFilter,
): Pick<StackToolbarMenuActionProps, 'isOn' | 'onPress'> => ({
  isOn: (value === 'archived') === archived,
  onPress: () => onArchivedChange(value === 'archived'),
});

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
