import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import type * as React from 'react';
import {
  isDefaultSessionsView,
  type SessionsViewGroup,
  type SessionsViewState,
  searchSessionsLabel,
  sessionsViewGroups,
} from '#features/sessions';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { headerFilterIcon } from '#lib/product/header-button';
import { PhoneSearchBar } from '#lib/product/navigation/phone-search-bar';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import { toolbarIcon } from '../../lib/product/navigation/toolbar-icon';

export interface SessionsRootToolbarProps extends SessionsViewState {
  onNewSession: () => void;
}

/*
 * The Sessions root's stock header items, as the Stack Toolbar guide builds them: the view menu, then New Session,
 * each in its own bubble, and the stack's search bar. iOS 26 docks New Session beside the search bar instead.
 */
export function SessionsRootToolbar({
  onNewSession,
  ...viewState
}: SessionsRootToolbarProps): React.JSX.Element {
  const newSession = newSessionButton(onNewSession);

  return (
    <>
      <Stack.Toolbar placement="right">
        {viewMenu(viewState)}
        {hasLiquidGlass ? null : newSession}
      </Stack.Toolbar>
      {searchBar(viewState, newSession)}
    </>
  );
}

function searchBar(
  { onQueryChange }: SessionsViewState,
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

const viewMenuItem = {
  icon: toolbarIcon(headerFilterIcon),
  accessibilityLabel: 'Filter Sessions',
  separateBackground: true,
};

/*
 * Each of the view's groups as an inline section, its heading the section's title.
 * No option has an icon, as in Paper: UIMenu draws each title after its check. The button carries a dot while the view is not the default.
 */
function viewMenu({
  view,
  onViewChange,
}: SessionsViewState): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu {...viewMenuItem}>
      {toolbarDot(!isDefaultSessionsView(view))}
      {sessionsViewGroups(view, onViewChange).map(viewSection)}
    </Stack.Toolbar.Menu>
  );
}

type ViewOption = SessionsViewGroup['options'][number];

// An inline menu is a UIMenu section: a divider above it and its title as the heading.
function viewSection(group: SessionsViewGroup): React.JSX.Element {
  const options: readonly ViewOption[] = group.options;

  return (
    <Stack.Toolbar.Menu key={group.label} inline title={group.label}>
      {options.map((option) => (
        <Stack.Toolbar.MenuAction
          key={option.value}
          {...optionState(group, option)}
        >
          {option.label}
        </Stack.Toolbar.MenuAction>
      ))}
    </Stack.Toolbar.Menu>
  );
}

type StackToolbarMenuActionProps = ComponentProps<
  typeof Stack.Toolbar.MenuAction
>;

type OptionState = Pick<StackToolbarMenuActionProps, 'isOn' | 'onPress'>;

const optionState = (
  group: SessionsViewGroup,
  option: ViewOption,
): OptionState => ({
  isOn: group.value === option.value,
  onPress: () => group.onValueChange(option.value),
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
