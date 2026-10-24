import { Stack, useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Host } from '#primitives/native/host';
import { HeaderIconButton } from './screen-action-button.android';

// The story's root page is a nested stack's first page, so its header has no Back; this top app bar button returns to Storybook.
export function ScreenStoryBack(): ReactNode {
  const router = useRouter();

  return (
    <Stack.Screen options={{ headerLeft: () => backButton(router.back) }} />
  );
}

function backButton(back: () => void): ReactNode {
  return (
    <Host matchContents>
      <HeaderIconButton icon="chevron-left" label="Back" onPress={back} />
    </Host>
  );
}
