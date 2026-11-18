import { AddServerScreen } from '@repo/client';
import type * as React from 'react';

// The only page a phone or tablet that holds no Server can reach: pairing one opens the App on it (#2388).
export default function PairRoute(): React.JSX.Element {
  return <AddServerScreen />;
}
