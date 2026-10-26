import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';

interface NewSessionQuestionProps {
  // What goes under the question, such as the Agent picker.
  children?: React.ReactNode;
}

export function NewSessionQuestion({
  children,
}: NewSessionQuestionProps): React.JSX.Element {
  return (
    <Stack direction="column" gap={6} align="center">
      <Text role="title" accessibilityRole="heading" aria-level={1}>
        What should we work on?
      </Text>
      {children}
    </Stack>
  );
}
