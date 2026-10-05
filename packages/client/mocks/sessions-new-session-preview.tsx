import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  SessionsList,
  type SessionsListProps,
} from '../src/components/SessionsList';
import { largeSessions } from './sessions-list-mock';

export function SessionsNewSessionPreview(props: SessionsListProps) {
  const [sessions, setSessions] = useState(largeSessions.slice(0, 12));
  const nextNumber = useRef(1);

  function addSession(projectId: string) {
    const number = nextNumber.current++;
    props.onNewSession?.(projectId);
    setSessions((current) => [
      {
        ...largeSessions[0]!,
        projectId,
        sessionId: `new-session-${number}`,
        title: `New Session ${number}`,
        activity: 'Session created',
        activityAt: Date.now() + number,
      },
      ...current,
    ]);
  }

  return (
    <View className="w-full wide:w-shell-list">
      <View style={{ height: 480 }}>
        <SessionsList
          {...props}
          sessions={sessions}
          onNewSession={addSession}
        />
      </View>
    </View>
  );
}
