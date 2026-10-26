import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import { Surface } from '@repo/kit/primitives/layout/surface';
import type * as React from 'react';

interface SlotPreviewCardProps {
  caption: string;
  children: React.ReactNode;
}

// A Slot's preview on a card, under a caption that says what it stands for.
export const SlotPreviewCard = ({
  caption,
  children,
}: SlotPreviewCardProps): React.JSX.Element => (
  <Surface kind="card" padding={4}>
    <Stack direction="column" gap={2}>
      <Text role="secondary" tone="muted">
        {caption}
      </Text>
      {children}
    </Stack>
  </Surface>
);
