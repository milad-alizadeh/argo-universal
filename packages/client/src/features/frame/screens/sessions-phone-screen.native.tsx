import FilterList from '@expo/material-symbols/filter_list.xml';
import { Stack } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';
import { SessionsScreen, useSessionsFilter } from '#features/sessions';
import { hasLiquidGlass } from '#lib/generic/native-header';
import { useNavigate } from '#lib/product/navigation/context';
import { toolbarDot } from '#lib/product/navigation/toolbar-dot';
import { MenuToolbar } from '../components/menu-toolbar.native';
import { shellSections } from '../components/shell-sections';

type SessionsFilter = ReturnType<typeof useSessionsFilter>;

const filterIcon =
  process.env.EXPO_OS === 'ios' ? 'slider.horizontal.3' : FilterList;

// iOS 26 docks New Session beside the search bar at the bottom; earlier iOS keeps it in the header.
const bottomSearch = process.env.EXPO_OS === 'ios' && hasLiquidGlass;

const newSessionInHeader = process.env.EXPO_OS === 'ios' && !hasLiquidGlass;

// A phone's Sessions root, as the Stack Toolbar guide builds one: ☰, the title, the filter menu, the stack's search bar, New Session on iOS, and the list.
export function SessionsPhoneScreen(): React.JSX.Element {
  const filter = useSessionsFilter();
  const navigate = useNavigate();
  const newSession = (): void => navigate({ to: 'new-session' });

  return (
    <View className="flex-1 bg-content">
      <Stack.Screen options={{ title: shellSections.sessions.title }} />
      <MenuToolbar />
      {rightToolbar(filter, newSession)}
      {searchBar(filter.onQueryChange)}
      {bottomSearch ? bottomToolbar(newSession) : null}
      <SessionsScreen {...filter} />
    </View>
  );
}

function rightToolbar(
  filter: SessionsFilter,
  newSession: () => void,
): React.JSX.Element {
  return (
    <Stack.Toolbar placement="right">
      {filterMenu(filter)}
      {newSessionInHeader ? newSessionButton(newSession) : null}
    </Stack.Toolbar>
  );
}

// Active or Archived, checked on the current one.
function filterMenu({
  archived,
  onArchivedChange,
}: SessionsFilter): React.JSX.Element {
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
function searchBar(onQueryChange: (query: string) => void): React.JSX.Element {
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

function bottomToolbar(newSession: () => void): React.JSX.Element {
  return (
    <Stack.Toolbar placement="bottom">
      <Stack.Toolbar.SearchBarSlot />
      <Stack.Toolbar.Spacer />
      {newSessionButton(newSession)}
    </Stack.Toolbar>
  );
}
