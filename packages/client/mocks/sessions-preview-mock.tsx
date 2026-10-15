import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import {
  SessionsView,
  type SessionsViewProps,
} from '../src/screens/sessions/sessions-view';

export function SessionsPreviewMock(args: SessionsViewProps): ReactElement {
  const props = usePreviewSessions(args);

  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      <PreviewHeader {...props} />
      <SessionsView
        {...args}
        query={props.query}
        archived={props.archived}
        sessions={props.sessions}
      />
    </View>
  );
}

type PreviewProps = SessionsViewProps &
  Pick<ComponentProps<typeof SessionsHeader>, 'onArchivedChange'>;

function usePreviewSessions(args: SessionsViewProps): PreviewProps {
  const [query, setQuery] = useState(args.query);
  const [archived, setArchived] = useState(args.archived);
  const sessions = matchingSessions(args.sessions, query, archived);

  return {
    ...args,
    query,
    archived,
    sessions,
    onQueryChange: setQuery,
    onArchivedChange: setArchived,
  };
}

function PreviewHeader(
  props: ComponentProps<typeof SessionsHeader>,
): ReactElement {
  return (
    <View className="min-h-11 web:h-11 wide:min-h-14 web:wide:h-14 flex-row items-center gap-0.5 px-2">
      <SessionsHeader
        query={props.query}
        onQueryChange={props.onQueryChange}
        archived={props.archived}
        onArchivedChange={props.onArchivedChange}
        onNewSession={props.onNewSession}
      />
    </View>
  );
}

function matchingSessions(
  sessions: SessionsViewProps['sessions'],
  query: string,
  archived: boolean,
): SessionsViewProps['sessions'] {
  return sessions.filter(
    (session) =>
      (session.archivedAt !== null) === archived &&
      session.title.toLowerCase().includes(query.toLowerCase()),
  );
}
