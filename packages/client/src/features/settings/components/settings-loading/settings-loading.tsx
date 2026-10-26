import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type { ReactElement } from 'react';

// What a Settings screen shows while the Server has not answered: a Spinner and what it waits for, on the Screen's own column.
export const SettingsLoading = ({ label }: { label: string }): ReactElement => (
  <Stack direction="row" gap={3} align="center">
    <Spinner accessibilityLabel="Loading" />
    <Text role="body" tone="muted">
      {label}
    </Text>
  </Stack>
);
