import { sessionRows } from '@repo/api/mocks';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import {
  SessionsList,
  type SessionsListProps,
} from '../src/components/sessions-list';
import { largeSessions } from './sessions-list-mock';

export function SessionsNewSessionPreview(
  props: SessionsListProps,
): React.JSX.Element {
  const [sessions, setSessions] = useState(largeSessions.slice(0, 12));
  const nextNumber = useRef(1);

  function addSession(projectId: string): void {
    const number = nextNumber.current++;
    props.onNewSession?.(projectId);
    setSessions((current) => [
      {
        ...sessionRows.idle,
        projectId,
        sessionId: `new-session-${number}`,
        title: `New Session ${number}`,
        activity: 'Session created',
        activityAt: largeSessions.length + number,
      },
      ...current,
    ]);
  }

  return (
    <View className="w-full flex-1 wide:w-shell-list" style={{ minHeight: 0 }}>
      <SessionsList {...props} sessions={sessions} onNewSession={addSession} />
    </View>
  );
}
