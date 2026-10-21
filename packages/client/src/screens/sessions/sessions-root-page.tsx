import { Action, ActionList } from '@repo/kit/primitives/actions/action-list';
import { Page, type PageProps } from '@repo/kit/primitives/scaffolds/page';
import type * as React from 'react';
import {
  isDefaultSessionsView,
  type SessionsViewGroup,
  type SessionsViewState,
  searchSessionsLabel,
  sessionsViewGroups,
} from '#features/sessions';
import { headerFilterIcon } from '#lib/product/header-button';
import { sections } from '../../lib/product/navigation/sections';

export interface SessionsRootPageProps extends SessionsViewState {
  onNewSession: () => void;
  children: React.ReactNode;
}

// The App E2E steps find the filter by this name.
const filterLabel = 'Filter Sessions';

/*
 * A narrow window's Sessions root: a Page whose primary Action is New Session (iOS top right, Android's FAB) and whose
 * one header Action is the view filter, a checked choice per Section with a dot while the view is not the default.
 */
export function SessionsRootPage({
  onNewSession,
  children,
  ...viewState
}: SessionsRootPageProps): React.JSX.Element {
  return <Page {...pageProps(viewState, onNewSession)}>{children}</Page>;
}

function pageProps(
  viewState: SessionsViewState,
  onNewSession: () => void,
): Omit<PageProps, 'children'> {
  return {
    title: sections.sessions.title,
    search: { label: searchSessionsLabel },
    value: viewState.query,
    onChangeText: viewState.onQueryChange,
    primaryAction: newSession(onNewSession),
    actions: <SessionsFilter {...viewState} />,
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

function SessionsFilter(viewState: SessionsViewState): React.JSX.Element {
  return <ActionList>{filterSubmenu(viewState)}</ActionList>;
}

// The filter is a submenu Action: one Section per view field.
function filterSubmenu({
  view,
  onViewChange,
}: SessionsViewState): React.JSX.Element {
  const badge = isDefaultSessionsView(view) ? undefined : changedDot;
  const filter = { label: filterLabel, icon: headerFilterIcon, badge };

  return (
    <Action key="filter" {...filter}>
      {sessionsViewGroups(view, onViewChange).map(filterSection)}
    </Action>
  );
}

type ViewOption = SessionsViewGroup['options'][number];

// Each view field is one Section; each option has its icon, the chosen one checked.
function filterSection(group: SessionsViewGroup): React.JSX.Element {
  const options: readonly ViewOption[] = group.options;

  return (
    <ActionList.Section key={group.label} title={group.label}>
      {options.map((option) => filterOption(group, option))}
    </ActionList.Section>
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
