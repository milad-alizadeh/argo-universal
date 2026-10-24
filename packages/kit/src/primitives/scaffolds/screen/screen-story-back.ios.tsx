import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';

// The story's root page is a nested stack's first page, so its header has no Back; this stock bar item returns to Storybook.
export function ScreenStoryBack(): ReactNode {
  const router = useRouter();

  return (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button
        icon="chevron.left"
        accessibilityLabel="Back"
        onPress={() => router.back()}
      />
    </Stack.Toolbar>
  );
}
