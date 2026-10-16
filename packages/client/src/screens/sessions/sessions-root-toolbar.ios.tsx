import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type * as React from 'react';
import {
  type SessionsFilter,
  searchSessionsLabel,
  sessionsFilterChoices,
  sessionsLayoutChoices,
  sessionsLayoutLabel,
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

// Active or Archived, then the Layout section's Regular or Compact; each checked on the current one. MenuAction.icon takes the option's SF Symbol, which UIMenu draws after the title, the check before it.
function filterMenu(filter: SessionsFilter): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu {...filterMenuItem}>
      {sessionsFilterChoices.map((choice) => (
        <Stack.Toolbar.MenuAction
          key={choice.value}
          {...choiceState(choice, filter)}
        >
          {choice.label}
        </Stack.Toolbar.MenuAction>
      ))}
      {layoutMenu(filter)}
    </Stack.Toolbar.Menu>
  );
}

// An inline menu is a UIMenu section: a divider above it and its title as the heading.
function layoutMenu(filter: SessionsFilter): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu inline title={sessionsLayoutLabel}>
      {sessionsLayoutChoices.map((choice) => (
        <Stack.Toolbar.MenuAction
          key={choice.value}
          {...layoutState(choice, filter)}
        >
          {choice.label}
        </Stack.Toolbar.MenuAction>
      ))}
    </Stack.Toolbar.Menu>
  );
}

type StackToolbarMenuActionProps = ComponentProps<
  typeof Stack.Toolbar.MenuAction
>;

type ChoiceState = Pick<
  StackToolbarMenuActionProps,
  'icon' | 'isOn' | 'onPress'
>;

const choiceState = (
  { value, icon }: (typeof sessionsFilterChoices)[number],
  { archived, onArchivedChange }: SessionsFilter,
): ChoiceState => ({
  icon: iconSymbols[icon].sf,
  isOn: (value === 'archived') === archived,
  onPress: () => onArchivedChange(value === 'archived'),
});

const layoutState = (
  { value, icon }: (typeof sessionsLayoutChoices)[number],
  { layout, onLayoutChange }: SessionsFilter,
): ChoiceState => ({
  icon: iconSymbols[icon].sf,
  isOn: value === layout,
  onPress: () => onLayoutChange(value),
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
