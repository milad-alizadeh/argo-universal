import { AddServerScreen } from '@repo/client';
import { useLocalSearchParams } from 'expo-router';
import type * as React from 'react';
import { pairLinkEnabled, pairLinkIn } from '@/lib/pair-link';

export default function AddServerRoute(): React.JSX.Element {
  return (
    <AddServerScreen
      link={pairLinkIn(useLocalSearchParams(), pairLinkEnabled)}
    />
  );
}
