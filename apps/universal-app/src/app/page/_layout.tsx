import type * as React from 'react';
import { PushedStack } from '@/navigation/section-stack';

// Pushed pages sit over the Frame under the same stock headers a section's pages have.
export default function PushedLayout(): React.JSX.Element {
  return <PushedStack />;
}
