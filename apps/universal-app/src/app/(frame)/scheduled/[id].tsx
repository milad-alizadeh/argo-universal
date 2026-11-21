import { ScheduledDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function ScheduledRoute(): ReactNode {
  const { id, sessionId } = useLocalSearchParams<{
    id: string;
    sessionId?: string;
  }>();

  return <ScheduledDetailScreen id={id} sessionId={sessionId} />;
}
