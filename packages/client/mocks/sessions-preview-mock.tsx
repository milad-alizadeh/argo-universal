import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import type { SessionsStatus } from '../src/features/sessions/stores/sessions-view';
import { showsUnderStatus } from '../src/features/sessions/utils/sessions-list-input';
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
        view={props.view}
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
  const [view, setView] = useState(args.view);

  return { view, onViewChange: setView };
}

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

function matchingSessions(
  sessions: SessionListViewProps['sessions'],
  query: string,
  status: SessionsStatus,
): SessionListViewProps['sessions'] {
  return sessions.filter(
    (session) =>
      showsUnderStatus(status, session.archivedAt) &&
      session.title.toLowerCase().includes(query.toLowerCase()),
  );
}
