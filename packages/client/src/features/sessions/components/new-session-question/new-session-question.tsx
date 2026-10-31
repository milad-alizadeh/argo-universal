import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';

// The question New Session asks: a wide window draws it as the page's heading, a phone as the Composer's placeholder.
export const newSessionQuestion = 'What should we work on?';

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
        {newSessionQuestion}
      </Text>
      {children}
    </Stack>
  );
}
