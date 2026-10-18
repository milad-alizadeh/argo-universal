import type * as React from 'react';
import { Text } from '#primitives/content/text';

export function Unsupported(): React.JSX.Element {
  return (
    <Text role="secondary" tone="muted">
      Update Argo to see this
    </Text>
  );
}
