import { NewSessionScreen, SessionScreen } from '@repo/client';
import { newSessionId } from '@repo/client/navigation';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

// New Session and the Session its first prompt starts share this screen; the hand-off only changes the id.
export default function SessionRoute(): React.JSX.Element {
  const { id, projectId } = useLocalSearchParams<{
    id: string;
    projectId?: string;
  }>();

  if (id === newSessionId) return <NewSessionScreen projectId={projectId} />;

  return <SessionScreen id={id} />;
}
