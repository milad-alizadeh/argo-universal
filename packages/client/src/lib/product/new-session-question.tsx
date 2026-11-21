import { Text } from '@repo/kit/primitives/content/text';
import { Stack } from '@repo/kit/primitives/layout/stack';
import type * as React from 'react';
import { View } from 'react-native';
import { useContentWide } from './content-layout';
import { SessionColumn } from './session-column';

// The question New Session asks: a wide window draws it as the page's heading, a phone as the Composer's placeholder.
export const newSessionQuestion = 'What should we work on?';

interface NewSessionQuestionProps {
  // What goes under the question, such as the Agent picker.
  children?: React.ReactNode;
}

export function NewSessionQuestion({
  children,
}: NewSessionQuestionProps): React.JSX.Element | null {
  if (!useContentWide()) return null;

  return (
    <View className="flex-1 justify-center">
      <SessionColumn>
        <Stack direction="column" gap={6} align="center">
          <Text role="title" accessibilityRole="heading" aria-level={1}>
            {newSessionQuestion}
          </Text>
          {children}
        </Stack>
      </SessionColumn>
    </View>
  );
}
