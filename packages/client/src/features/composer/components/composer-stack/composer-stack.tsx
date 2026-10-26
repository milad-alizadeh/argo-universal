import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';

interface ComposerStackProps {
  // A row that sits over the Composer, such as where a new Session starts.
  above?: React.ReactNode;
  children: React.ReactNode;
}

export function ComposerStack({
  above,
  children,
}: ComposerStackProps): React.JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      {above}
      {children}
    </Stack>
  );
}
