import { useRouter } from 'expo-router';
import { createContext, use, type ComponentType } from 'react';

// The pages a story can push to, by name.
export type StackPages = Record<string, ComponentType>;

// A stack's screens: the story itself is the root; `pages` are what it pushes to.
export interface StackScreens {
  Root: ComponentType;
  pages: StackPages;
}

export const StackScreensContext = createContext<StackScreens>({
  Root: () => null,
  pages: {},
});

// The story whose dev route the pages live under: none in the web preview, the route's `[story]` on a phone.
export const StackStoryContext = createContext<string | undefined>(undefined);

// Pushes the named page on the story's stack, as a Link would in the App.
export function useStackPush(): (page: string) => void {
  const router = useRouter();
  const story = use(StackStoryContext);

  return (page) =>
    story === undefined
      ? router.push(`./${page}`)
      : router.push({
          pathname: '/story-stack/[story]/[page]',
          params: { story, page },
        });
}
