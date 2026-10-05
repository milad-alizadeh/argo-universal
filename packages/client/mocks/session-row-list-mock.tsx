import { agentsList } from '@repo/api/mocks';
import type { SessionInfo } from '@repo/contracts';
import { View } from 'react-native';
import { SessionRow, type SessionRowProps } from '../src/components/SessionRow';
import { useWide } from '../src/navigation/use-wide';

export function SessionRowListMock({
  sessions,
  onSelect,
  selectedSessionId,
  metadata = {},
}: {
  sessions: readonly SessionInfo[];
  onSelect: (sessionId: string) => void;
  selectedSessionId?: string;
  metadata?: Record<
    string,
    Pick<SessionRowProps, 'issue' | 'pullRequest' | 'subagentsFailed'>
  >;
}) {
  const wide = useWide();
  return (
    <View
      testID="session-row-list"
      className="w-session-phone max-w-full bg-background wide:w-session-desktop wide:gap-1 wide:bg-sidebar wide:px-2 wide:py-4"
    >
      {sessions.map((session) => (
        <SessionRow
          key={session.sessionId}
          session={session}
          logo={
            agentsList.find((agent) => agent.agent === session.agent)?.logo ??
            ''
          }
          selected={wide && session.sessionId === selectedSessionId}
          onSelect={onSelect}
          {...metadata[session.sessionId]}
        />
      ))}
    </View>
  );
}
