import type { SessionInfo } from '@repo/contracts';
import { agentsList } from '@repo/mocks/app';
import type * as React from 'react';
import { View } from 'react-native';
import {
  virtualListPosition,
  type VirtualListPosition,
} from '#primitives/lists/virtual-list-item';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import type { SessionsLayout } from '../../state/sessions-layout';
import { SessionRow, type SessionRowProps } from './session-row';
import { showsSessionAge } from './session-row-props';

export interface SessionRowListMockProps {
  sessions: readonly SessionInfo[];
  onSelect: (sessionId: string) => void;
  selectedSessionId?: string;
  layout?: SessionsLayout;
  metadata?: Record<
    string,
    Pick<SessionRowProps, 'pullRequest' | 'subagentsFailed' | 'trailing'>
  >;
}

// As the Sessions list sets its rows: Regular cards 8 apart; Compact rows as one phone grouped section, 2 apart wide.
const listClassName = {
  regular:
    'w-full gap-2 bg-content px-4 py-2 wide:w-frame-list wide:px-2 wide:py-4',
  compact:
    'w-full bg-content px-4 py-2 wide:w-frame-list wide:gap-0.5 wide:px-2 wide:py-4',
} satisfies Record<SessionsLayout, string>;

function agentLogo(agent: string): string {
  return agentsList.find((entry) => entry.agent === agent)?.logo ?? '';
}

type RowMetadata = NonNullable<SessionRowListMockProps['metadata']>[string];

const metadataOf = (
  list: SessionRowListMockProps,
  session: SessionInfo,
): RowMetadata => list.metadata?.[session.sessionId] ?? {};

// The age shows only where the list would show it.
const shownAge = (
  layout: SessionsLayout,
  { trailing }: RowMetadata,
): string | undefined => (showsSessionAge(layout) ? trailing : undefined);

const positionOf = (
  index: number,
  list: SessionRowListMockProps,
): VirtualListPosition =>
  virtualListPosition(index === 0, index === list.sessions.length - 1);

interface ListedRowProps {
  list: SessionRowListMockProps;
  session: SessionInfo;
  index: number;
}

function rowProps(row: ListedRowProps, wide: boolean): SessionRowProps {
  const { list, session } = row;
  const layout = list.layout ?? 'regular';
  const metadata = metadataOf(list, session);

  return {
    ...metadata,
    session,
    logo: agentLogo(session.agent),
    selected: wide && session.sessionId === list.selectedSessionId,
    layout,
    trailing: shownAge(layout, metadata),
    position: positionOf(row.index, list),
    onSelect: list.onSelect,
  };
}

function ListedRow(props: ListedRowProps): React.JSX.Element {
  const wide = useWide();

  return <SessionRow {...rowProps(props, wide)} />;
}

const listedRows = (list: SessionRowListMockProps): React.JSX.Element[] =>
  list.sessions.map((session, index) => (
    <ListedRow
      key={session.sessionId}
      list={list}
      session={session}
      index={index}
    />
  ));

export function SessionRowListMock(
  props: SessionRowListMockProps,
): React.JSX.Element {
  return (
    <View
      testID="session-row-list"
      className={listClassName[props.layout ?? 'regular']}
    >
      {listedRows(props)}
    </View>
  );
}
