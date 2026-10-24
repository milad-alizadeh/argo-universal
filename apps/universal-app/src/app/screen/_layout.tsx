import type * as React from 'react';
import { PushedStack } from '@/navigation/section-stack';

// Pushed screens sit over the Frame under the same stock headers a section's screens have.
export default function PushedLayout(): React.JSX.Element {
  return <PushedStack />;
}
