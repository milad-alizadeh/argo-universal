import { useRouter } from 'expo-router';
import { createContext, use, type ComponentType } from 'react';

// The pages a story can push to, by name.
export type StoryScreens = Record<string, ComponentType>;

// A stack's screens: the story itself is the root; `pages` are what it pushes to.
export interface StackScreens {
  Root: ComponentType;
  pages: StoryScreens;
}

export const StackScreensContext = createContext<StackScreens>({
  Root: () => null,
  pages: {},
});

// The story whose dev route the pages live under: none in the web preview, the route's `[story]` on a phone.
export const StackStoryContext = createContext<string | undefined>(undefined);

// Pushes the named screen on the story's stack, as a Link would in the App.
export function useStackPush(): (screen: string) => void {
  const router = useRouter();
  const story = use(StackStoryContext);

  return (screen) =>
    story === undefined
      ? router.push(`./${screen}`)
      : router.push({
          pathname: '/story-stack/[story]/[screen]',
          params: { story, screen },
        });
}
