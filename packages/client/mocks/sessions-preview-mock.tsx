import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import {
  SessionListView,
  type SessionListViewProps,
} from '../src/screens/sessions/session-list-view';

export function SessionsPreviewMock(args: SessionListViewProps): ReactElement {
  const props = usePreviewSessions(args);

  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      <PreviewHeader {...props} />
      <SessionListView
        {...args}
        query={props.query}
        archived={props.archived}
        layout={props.layout}
        sessions={props.sessions}
      />
    </View>
  );
}

type PreviewProps = SessionListViewProps &
  Pick<
    ComponentProps<typeof SessionsHeader>,
    'onArchivedChange' | 'layout' | 'onLayoutChange'
  >;

function usePreviewLayout(
  args: SessionListViewProps,
): Pick<PreviewProps, 'layout' | 'onLayoutChange'> {
  const [layout, setLayout] = useState(args.layout ?? 'regular');

  return { layout, onLayoutChange: setLayout };
}

function usePreviewSessions(args: SessionListViewProps): PreviewProps {
  const [query, setQuery] = useState(args.query);
  const [archived, setArchived] = useState(args.archived);
  const sessions = matchingSessions(args.sessions, query, archived);

  return {
    ...args,
    ...usePreviewLayout(args),
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
      <SessionsHeader {...props} />
    </View>
  );
}

function matchingSessions(
  sessions: SessionListViewProps['sessions'],
  query: string,
  archived: boolean,
): SessionListViewProps['sessions'] {
  return sessions.filter(
    (session) =>
      (session.archivedAt !== null) === archived &&
      session.title.toLowerCase().includes(query.toLowerCase()),
  );
}
