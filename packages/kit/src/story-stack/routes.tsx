import { Stack, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { registeredStack } from './stack-registry';
import { StackStoryContext } from './stack-story-context';

// The App's dev route for a story's stack (`(dev)/story-stack/[story]`): a real native Stack, so a Page draws its header and pushes with Back as in the App. Nothing renders in production.
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

export function StackStoryPage(): ReactNode {
  const { story, page } = useLocalSearchParams<{
    story: string;
    page: string;
  }>();

  const Page = registeredStack(story)?.pages[page];

  return Page ? <Page /> : null;
}
