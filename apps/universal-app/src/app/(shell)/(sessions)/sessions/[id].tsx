import { SessionScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function SessionRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SessionScreen id={id} />;
}
