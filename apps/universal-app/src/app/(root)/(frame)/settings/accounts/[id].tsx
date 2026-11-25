import { AccountDetailScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';

export default function AccountRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <AccountDetailScreen accountId={id} />;
}
