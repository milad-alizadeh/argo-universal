import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import {
  defaultSessionsView,
  type SessionsStatus,
  type SessionsView,
} from '../src/features/sessions/stores/sessions-view';
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
        {...props.view}
        query={props.query}
        sessions={props.sessions}
      />
    </View>
  );
}

type PreviewProps = SessionListViewProps &
  Pick<ComponentProps<typeof SessionsHeader>, 'view' | 'onViewChange'>;

function usePreviewView(
  args: SessionListViewProps,
): Pick<PreviewProps, 'view' | 'onViewChange'> {
  const [view, setView] = useState<SessionsView>(() => ({
    ...defaultSessionsView,
    ...definedFields(args),
  }));

  return { view, onViewChange: setView };
}

// The view fields the story sets; the others keep their defaults.
const definedFields = ({
  order,
  group,
  status,
  layout,
}: SessionListViewProps): Partial<SessionsView> =>
  Object.fromEntries(
    Object.entries({ order, group, status, layout }).filter(
      ([, value]) => value !== undefined,
    ),
  );

function usePreviewSessions(args: SessionListViewProps): PreviewProps {
  const [query, setQuery] = useState(args.query);
  const view = usePreviewView(args);
  const sessions = matchingSessions(args.sessions, query, view.view.status);

  return {
    ...args,
    ...view,
    query,
    sessions,
    onQueryChange: setQuery,
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

const showsStatus = (
  status: SessionsStatus,
  session: SessionListViewProps['sessions'][number],
): boolean =>
  status === 'all' || (session.archivedAt !== null) === (status === 'archived');

function matchingSessions(
  sessions: SessionListViewProps['sessions'],
  query: string,
  status: SessionsStatus,
): SessionListViewProps['sessions'] {
  return sessions.filter(
    (session) =>
      showsStatus(status, session) &&
      session.title.toLowerCase().includes(query.toLowerCase()),
  );
}
