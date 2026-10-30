import { Icon } from '@repo/kit/primitives/content/icon';
import { List } from '@repo/kit/primitives/lists/list';
import { Skeleton } from '@repo/kit/primitives/status/skeleton';
import { useSidebarGutterHeld } from '@repo/kit/sidebar-gutter';
import type * as React from 'react';
import { View } from 'react-native';
import type { SessionsLayout } from '../../stores/sessions-view';
import { sessionsListLook } from '../sessions-list/sessions-list-look';
import { SessionListRow } from '../sessions-list/sessions-list-rows';
import { standardTopPadding } from '../sessions-list/sessions-list-top-padding';
import {
  placeholderProjectName,
  placeholderRows,
} from './sessions-loading-rows';

export interface SessionsLoadingProps {
  // Regular rows carry their Agent line and age; Compact rows are one line each.
  layout?: SessionsLayout;
  // Drawn in the Sessions list's own empty slot, whose sides already hold the list's inset.
  inList?: boolean;
}

const ignoreSelect = (): void => {};

function PlaceholderRows({ layout }: SessionsLoadingProps): React.ReactNode {
  return placeholderRows.map((row) => (
    <SessionListRow
      key={row.session.sessionId}
      session={row.session}
      logo=""
      age={row.age}
      layout={layout}
      onSelect={ignoreSelect}
    />
  ));
}

function PlaceholderSection({
  layout,
}: SessionsLoadingProps): React.JSX.Element {
  return (
    <List.Section
      title={placeholderProjectName}
      leading={<Icon name="folder-open" />}
    >
      <PlaceholderRows layout={layout} />
    </List.Section>
  );
}

function PlaceholderList({
  layout = 'regular',
  inList = false,
}: SessionsLoadingProps): React.JSX.Element {
  const look = usePlaceholderLook(layout, inList);

  return (
    <List {...look} fit paddingTop={standardTopPadding}>
      <PlaceholderSection layout={layout} />
    </List>
  );
}

function usePlaceholderLook(
  layout: SessionsLayout,
  inList: boolean,
): ReturnType<typeof sessionsListLook> {
  const held = useSidebarGutterHeld();

  return sessionsListLook(layout, inList || held ? 'inset' : 'padded');
}

// The Sessions list's own rows under a Project's section, drawn by the real Session row; the Skeleton swaps each line for a bar, so nothing shifts when the Sessions load.
export function SessionsLoading({
  layout = 'regular',
  inList,
}: SessionsLoadingProps): React.JSX.Element {
  return (
    <View role="status" accessibilityLabel="Loading Sessions">
      <Skeleton loading>
        <View pointerEvents="none">
          <PlaceholderList layout={layout} inList={inList} />
        </View>
      </Skeleton>
    </View>
  );
}
