import { ProjectDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function ProjectDetailRoute(): React.JSX.Element {
  const { name } = useLocalSearchParams<{ name: string }>();
  return <ProjectDetailScreen name={name} />;
}
