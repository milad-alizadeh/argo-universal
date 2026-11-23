import { SessionDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function SessionRoute(): React.JSX.Element {
  const { id, projectId, draft } = useLocalSearchParams<{
    id: string;
    projectId?: string;
    draft?: string;
  }>();

  return <SessionDetailScreen id={id} projectId={projectId} draft={draft} />;
}
