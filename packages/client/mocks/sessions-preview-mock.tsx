import { useWide } from '@repo/kit/use-wide/use-wide';
import { type ComponentProps, type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import type { SessionsStatus } from '../src/features/sessions/stores/sessions-view';
import { showsUnderStatus } from '../src/features/sessions/utils/sessions-list-input';
import {
  SessionListView,
  type SessionListViewProps,
} from '../src/screens/sessions/session-list-view';
import { SessionsRootPage } from '../src/screens/sessions/sessions-root-page';

// A wide window's sidebar list under its header row; a phone's root Screen around the list.
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
  if (!useWide())
    return <SessionsRootPage {...props}>{children}</SessionsRootPage>;

  return (
    <>
      <PreviewHeader {...props} />
      {children}
    </>
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
