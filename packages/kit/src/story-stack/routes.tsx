import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { registeredStack } from './stack-registry';
import { StackStoryContext } from './stack-story-context';

// The App's dev route for a story's stack (`(dev)/story-stack/[story]`): a real native Stack, so a Screen draws its header and pushes with Back as in the App. Nothing renders in production.
export function StackStoryLayout(): ReactNode {
  const { story } = useLocalSearchParams<{ story: string }>();

  if (!__DEV__) return null;

  return (
    <StackStoryContext value={story}>
      <Stack />
    </StackStoryContext>
  );
}

export function StackStoryRoot(): ReactNode {
  const { story } = useLocalSearchParams<{ story: string }>();
  const Root = registeredStack(story)?.Root;

  return Root ? <Root /> : null;
}

export function StackStoryScreen(): ReactNode {
  const { story, screen } = useLocalSearchParams<{
    story: string;
    screen: string;
  }>();

  const Screen = registeredStack(story)?.pages[screen];

  return Screen ? <Screen /> : null;
}
