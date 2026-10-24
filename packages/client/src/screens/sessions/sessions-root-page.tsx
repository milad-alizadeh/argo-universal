import { Action } from '@repo/kit/primitives/actions/action';
import {
  Screen,
  type ScreenProps,
} from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { View } from 'react-native';
import {
  searchSessionsLabel,
  SessionsViewMenu,
  type SessionsViewState,
} from '#features/sessions';
import { headerFilterIcon } from '#lib/product/header-button';
import { sections } from '../../lib/product/navigation/sections';

export interface SessionsRootPageProps extends SessionsViewState {
  onNewSession: () => void;
  children: React.ReactNode;
}

/*
 * A narrow window's Sessions root: a Screen whose primary Action is New Session (iOS top right, Android's FAB). The view
 * filter is a choice, not a verb, so it is a Menu above the list, a dot on it while the view is not the default.
 */
export function SessionsRootPage({
  onNewSession,
  children,
  ...viewState
}: SessionsRootPageProps): React.JSX.Element {
  return (
    <Screen {...pageProps(viewState, onNewSession)}>
      <View className="min-h-0 flex-1">
        <FilterRow {...viewState} />
        {children}
      </View>
    </Screen>
  );
}

function FilterRow({
  view,
  onViewChange,
}: SessionsViewState): React.JSX.Element {
  return (
    <View className="flex-row justify-end px-4">
      <SessionsViewMenu
        view={view}
        onViewChange={onViewChange}
        icon={headerFilterIcon}
      />
    </View>
  );
}

function pageProps(
  viewState: SessionsViewState,
  onNewSession: () => void,
): Omit<ScreenProps, 'children'> {
  return {
    title: sections.sessions.title,
    search: { label: searchSessionsLabel },
    value: viewState.query,
    onChangeText: viewState.onQueryChange,
    primaryAction: newSession(onNewSession),
  };
}

// The Slot reads its Action element itself, so this returns one rather than a component wrapping it.
const newSession = (onPress: () => void): React.JSX.Element => (
  <Action key="new" label="New Session" icon="new-session" onPress={onPress} />
);
