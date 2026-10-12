import { type ReactElement, useState } from 'react';
import { View } from 'react-native';
import { SessionsHeader } from '../src/features/sessions/components/sessions-header';
import {
  SessionsView,
  type SessionsViewProps,
} from '../src/features/sessions/components/sessions-view/sessions-view';

export function SessionsPreviewMock(args: SessionsViewProps): ReactElement {
  const [query, setQuery] = useState(args.query);
  const [archived, setArchived] = useState(args.archived);
  const sessions = args.sessions.filter(
    (session) =>
      (session.archivedAt !== null) === archived &&
      session.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View className="flex-1 w-full" style={{ minHeight: 0 }}>
      <View className="min-h-11 web:h-11 wide:min-h-14 web:wide:h-14 flex-row items-center gap-0.5 px-2">
        <SessionsHeader
          query={query}
          onQueryChange={setQuery}
          archived={archived}
          onArchivedChange={setArchived}
          onNewSession={args.onNewSession}
        />
      </View>
      <SessionsView
        {...args}
        query={query}
        archived={archived}
        sessions={sessions}
      />
    </View>
  );
}
