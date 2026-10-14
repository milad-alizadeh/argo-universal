import type { SessionInfo } from '@repo/contracts';
import { agentsList } from '@repo/mocks/app';
import type * as React from 'react';
import { View } from 'react-native';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { SessionRow, type SessionRowProps } from './session-row';

interface SessionRowListMockProps {
  sessions: readonly SessionInfo[];
  onSelect: (sessionId: string) => void;
  selectedSessionId?: string;
  metadata?: Record<
    string,
    Pick<SessionRowProps, 'issue' | 'pullRequest' | 'subagentsFailed'>
  >;
}

const listClassName =
  'w-session-phone max-w-full bg-content wide:w-session-desktop wide:gap-1 wide:px-2 wide:py-4';

function agentLogo(agent: string): string {
  return agentsList.find((entry) => entry.agent === agent)?.logo ?? '';
}

function listedRowProps(
  session: SessionInfo,
  list: SessionRowListMockProps,
  wide: boolean,
): SessionRowProps {
  return {
    session,
    logo: agentLogo(session.agent),
    selected: wide && session.sessionId === list.selectedSessionId,
    onSelect: list.onSelect,
    ...list.metadata?.[session.sessionId],
  };
}

export function SessionRowListMock(
  props: SessionRowListMockProps,
): React.JSX.Element {
  const wide = useWide();

  return (
    <View testID="session-row-list" className={listClassName}>
      {props.sessions.map((session) => (
        <SessionRow
          key={session.sessionId}
          {...listedRowProps(session, props, wide)}
        />
      ))}
    </View>
  );
}
