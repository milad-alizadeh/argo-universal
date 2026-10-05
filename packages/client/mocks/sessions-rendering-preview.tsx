import { sessionRows } from '@repo/api/mocks';
import { useState } from 'react';
import { View } from 'react-native';
import {
  SessionsList,
  type SessionsListProps,
} from '../src/components/SessionsList';
import { Button } from '../src/primitives/button';
import { Text } from '../src/primitives/text';

export function createSessionsRenderingMock() {
  let activityReads = 0;
  const sessions = [
    {
      ...sessionRows.idle,
      sessionId: 'memo-unchanged',
      title: 'Unchanged Session',
      activityAt: 300,
      get activity() {
        activityReads++;
        return sessionRows.idle.activity;
      },
    },
    {
      ...sessionRows.idle,
      sessionId: 'memo-selectable',
      title: 'Selectable Session',
      activityAt: 200,
    },
    {
      ...sessionRows.idle,
      sessionId: 'memo-updated',
      title: 'Updated Session',
      activityAt: 100,
    },
  ];
  return {
    sessions,
    getActivityReads: () => activityReads,
    reset: () => {
      activityReads = 0;
    },
  };
}

export function SessionsRenderingPreview({
  mock,
  ...props
}: SessionsListProps & {
  mock: ReturnType<typeof createSessionsRenderingMock>;
}) {
  const [sessions, setSessions] = useState(mock.sessions);
  const [selectedSessionId, setSelectedSessionId] = useState<string>();
  return (
    <View className="w-full wide:w-shell-list">
      <View style={{ height: 360 }}>
        <SessionsList
          {...props}
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelect={setSelectedSessionId}
        />
      </View>
      <Button
        onPress={() =>
          setSessions((current) =>
            current.map((session) =>
              session.sessionId === 'memo-updated'
                ? { ...session, activity: 'Session activity updated' }
                : session,
            ),
          )
        }
      >
        <Text>Update Session</Text>
      </Button>
    </View>
  );
}
