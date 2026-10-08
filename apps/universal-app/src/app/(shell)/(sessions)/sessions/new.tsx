import { NewSessionScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function NewSessionRoute(): React.JSX.Element {
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  return <NewSessionScreen projectId={projectId} />;
}
