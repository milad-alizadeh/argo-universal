import { useRouter, type Href } from 'expo-router';
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

// The path the stack's pages live under: none in the web preview, the dev route's own on a phone.
export const StackBasePathContext = createContext('');

// Pushes the named page on the story's stack, as a Link would in the App.
export function useStackPush(): (page: string) => void {
  const router = useRouter();
  const base = use(StackBasePathContext);

  // The path is built at run time, so it is not one of the typed routes the App's build knows.
  return (page) => router.push(`${base}/${page}` as Href);
}
