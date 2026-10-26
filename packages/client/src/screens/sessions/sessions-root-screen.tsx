import { Action } from '@repo/kit/primitives/actions/action';
import {
  Screen,
  type ScreenProps,
} from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import {
  isDefaultSessionsView,
  type SessionsViewGroup,
  type SessionsViewState,
  sessionsViewGroups,
} from '#features/sessions';
import { headerFilterIcon } from '#lib/product/header-button';
import { sections } from '../../lib/product/navigation/sections';

export interface SessionsRootScreenProps extends SessionsViewState {
  onNewSession: () => void;
  children: React.ReactNode;
}

const searchSessionsLabel = 'Search Sessions';

// The App E2E steps find the filter by this name.
const filterLabel = 'Filter Sessions';

/*
 * The Sessions root, once for every width: a Screen whose primary Action is New Session (iOS top right, Android's FAB) and whose
 * one header Action is the view filter, a submenu of checked choices per Section with a dot while the view is not the default.
 * A wide window draws it as the heading of the sidebar's list, which the list sits under.
 */
export function SessionsRootScreen({
  onNewSession,
  children,
  ...viewState
}: SessionsRootScreenProps): React.JSX.Element {
  return <Screen {...screenProps(viewState, onNewSession)}>{children}</Screen>;
}

function screenProps(
  viewState: SessionsViewState,
  onNewSession: () => void,
): Omit<ScreenProps, 'children'> {
  return {
    title: sections.sessions.title,
    search: { label: searchSessionsLabel },
    value: viewState.query,
    onChangeText: viewState.onQueryChange,
    primaryAction: newSession(onNewSession),
    actions: filterSubmenu(viewState),
  };
}

// The Slot reads its Action element itself, so this returns one rather than a component wrapping it.
const newSession = (onPress: () => void): React.JSX.Element => (
  <Action key="new" label="New Session" icon="new-session" onPress={onPress} />
);

// A dot on the filter while the view is not the default, read out after its name.
const changedDot = {
  kind: 'status',
  tone: 'accent',
  label: 'Changed',
} as const;

// The filter is a submenu Action, returned as an element since a wrapper component would declare nothing: one Section per view field.
function filterSubmenu({
  view,
  onViewChange,
}: SessionsViewState): React.JSX.Element {
  const filter = { label: filterLabel, icon: headerFilterIcon };
  const badge = isDefaultSessionsView(view) ? undefined : changedDot;

  return (
    <Action key="filter" {...filter} badge={badge}>
      {sessionsViewGroups(view, onViewChange).map(filterSection)}
    </Action>
  );
}

type ViewOption = SessionsViewGroup['options'][number];

// Each view field is one Section; each option has its icon, the chosen one checked.
function filterSection(group: SessionsViewGroup): React.JSX.Element {
  const options: readonly ViewOption[] = group.options;

  return (
    <Action.Section key={group.label} title={group.label}>
      {options.map((option) => filterOption(group, option))}
    </Action.Section>
  );
}

function filterOption(
  group: SessionsViewGroup,
  option: ViewOption,
): React.JSX.Element {
  return (
    <Action
      key={option.value}
      label={option.label}
      icon={option.icon}
      selected={option.value === group.value}
      onPress={() => group.onValueChange(option.value)}
    />
  );
}
