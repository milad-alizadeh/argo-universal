import type { SessionInfo } from '@repo/contracts';
import { agentsList } from '@repo/mocks/app';
import type * as React from 'react';
import { Platform, View } from 'react-native';
import { List } from '#primitives/lists/list';
import { SizeClass } from '../../../../lib/generic/size-class/size-class';
import type { SessionsLayout } from '../../stores/sessions-view';
import { rowClassName } from '../sessions-list/sessions-list-row-motion';
import { SessionRow, type SessionRowProps } from './session-row';

export interface SessionRowListMockProps {
  sessions: readonly SessionInfo[];
  onSelect: (sessionId: string) => void;
  selectedSessionId?: string;
  layout?: SessionsLayout;
  metadata?: Record<
    string,
    Pick<SessionRowProps, 'pullRequest' | 'subagentsFailed' | 'age'>
  >;
}

// As the Sessions list sets its rows: phones draw Regular cards and Compact grouped rows; the web draws flat sidebar rows, 2 apart, 8 from the left and 14 from the right.
const listClassName =
  'w-full bg-content px-4 py-2 wide:w-frame-list wide:px-0 wide:py-1.5';

const webList = Platform.OS === 'web';

function listAppearance(
  layout?: SessionsLayout,
): 'plain' | 'grouped' | 'cards' {
  if (webList) return 'plain';

  return layout === 'compact' ? 'grouped' : 'cards';
}

function agentLogo(agent: string): string {
  return agentsList.find((entry) => entry.id === agent)?.icon ?? '';
}

type RowMetadata = NonNullable<SessionRowListMockProps['metadata']>[string];

const metadataOf = (
  list: SessionRowListMockProps,
  session: SessionInfo,
): RowMetadata => list.metadata?.[session.sessionId] ?? {};

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
    onSelect: list.onSelect,
  };
}

function ListedRow(props: ListedRowProps): React.JSX.Element {
  return (
    <View className={rowClassName()}>
      <SizeClass
        compact={<SessionRow {...rowProps(props, false)} />}
        wide={<SessionRow {...rowProps(props, true)} />}
      />
    </View>
  );
}

function listedRows(props: SessionRowListMockProps): React.JSX.Element {
  return (
    <List
      appearance={listAppearance(props.layout)}
      padding={webList ? { compact: 0, wide: 2 } : undefined}
      maxHeight={1200}
      items={props.sessions}
      keyExtractor={(session) => session.sessionId}
      renderItem={(session, index) => (
        <ListedRow list={props} session={session} index={index} />
      )}
    />
  );
}

export function SessionRowListMock(
  props: SessionRowListMockProps,
): React.JSX.Element {
  return (
    <View testID="session-row-list" className={listClassName}>
      {listedRows(props)}
    </View>
  );
}
