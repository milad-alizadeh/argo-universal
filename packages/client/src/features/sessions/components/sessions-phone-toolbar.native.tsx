import FilterList from '@expo/material-symbols/filter_list.xml';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import type { SessionsPhoneToolbarProps } from './sessions-phone-toolbar-props';

const filterIcon =
  process.env.EXPO_OS === 'ios' ? 'slider.horizontal.3' : FilterList;

// iOS 26 docks New Session beside the search bar at the bottom; earlier iOS keeps it in the header.
const newSessionInHeader = process.env.EXPO_OS === 'ios' && !hasLiquidGlass;

const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

type FilterProps = Pick<
  SessionsPhoneToolbarProps,
  'archived' | 'onArchivedChange'
>;

// A phone's Sessions header, as the Stack Toolbar guide builds one: the filter menu, the stack's search bar, and New Session on iOS.
export function SessionsPhoneToolbar(
  props: SessionsPhoneToolbarProps,
): React.JSX.Element {
  return (
    <>
      <SessionsRightToolbar {...props} />
      <SessionsSearchBar onQueryChange={props.onQueryChange} />
      {bottomSearch ? (
        <SessionsBottomToolbar onNewSession={props.onNewSession} />
      ) : null}
    </>
  );
}

function SessionsRightToolbar(
  props: SessionsPhoneToolbarProps,
): React.JSX.Element {
  return (
    <Stack.Toolbar placement="right">
      {filterMenu(props)}
      {newSessionInHeader ? newSessionButton(props.onNewSession) : null}
    </Stack.Toolbar>
  );
}

// Active or Archived, checked on the current one.
function filterMenu({
  archived,
  onArchivedChange,
}: FilterProps): React.JSX.Element {
  return (
    <Stack.Toolbar.Menu icon={filterIcon} accessibilityLabel="Filter Sessions">
      {toolbarDot(archived)}
      {filterChoice('Active', !archived, () => onArchivedChange(false))}
      {filterChoice('Archived', archived, () => onArchivedChange(true))}
    </Stack.Toolbar.Menu>
  );
}

function filterChoice(
  label: string,
  isOn: boolean,
  onPress: () => void,
): React.JSX.Element {
  return (
    <Stack.Toolbar.MenuAction isOn={isOn} onPress={onPress}>
      {label}
    </Stack.Toolbar.MenuAction>
  );
}

function newSessionButton(onPress: () => void): React.JSX.Element {
  return (
    <Stack.Toolbar.Button
      icon="square.and.pencil"
      accessibilityLabel="New Session"
      onPress={onPress}
    />
  );
}

// The stack's own search bar; closing or cancelling it clears the query.
function SessionsSearchBar({
  onQueryChange,
}: Pick<SessionsPhoneToolbarProps, 'onQueryChange'>): React.JSX.Element {
  return (
    <Stack.SearchBar
      placeholder="Search Sessions"
      autoCapitalize="none"
      hideWhenScrolling={false}
      onChangeText={(event) => onQueryChange(event.nativeEvent.text)}
      onCancelButtonPress={() => onQueryChange('')}
      onClose={() => onQueryChange('')}
    />
  );
}

function SessionsBottomToolbar({
  onNewSession,
}: Pick<SessionsPhoneToolbarProps, 'onNewSession'>): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      <Stack.Toolbar.Spacer />
      {newSessionButton(onNewSession)}
    </Stack.Toolbar>
  );
}
