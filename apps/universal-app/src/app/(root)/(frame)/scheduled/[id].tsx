import { ScheduledDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';

export default function ScheduledRoute(): ReactNode {
  const { id, childId } = useLocalSearchParams<{
    id: string;
    childId?: string;
  }>();

  return <ScheduledDetailScreen id={id} childId={childId} />;
}
