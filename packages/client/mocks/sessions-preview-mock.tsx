import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import type { SessionsStatus } from '../src/features/sessions/stores/sessions-view';
import { showsUnderStatus } from '../src/features/sessions/utils/sessions-list-input';
import {
  SessionListView,
  type SessionListViewProps,
} from '../src/screens/sessions/session-list-view';
import { SessionsRootScreen } from '../src/screens/sessions/sessions-root-screen';

// The Sessions root Screen around the list, which draws its header at every width.
export function SessionsPreviewMock(args: SessionListViewProps): ReactElement {
  const props = usePreviewSessions(args);
  const { view, query, sessions } = props;

  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      <PreviewChrome {...props}>
        <SessionListView {...args} {...{ view, query, sessions }} />
      </PreviewChrome>
    </View>
  );
}

function PreviewChrome({
  children,
  ...props
}: PreviewProps & { children: ReactElement }): ReactElement {
  return <SessionsRootScreen {...props}>{children}</SessionsRootScreen>;
}

type PreviewProps = SessionListViewProps &
  Pick<ComponentProps<typeof SessionsRootScreen>, 'view' | 'onViewChange'>;

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
