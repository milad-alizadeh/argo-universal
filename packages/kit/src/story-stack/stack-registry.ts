import type { StackScreens } from './stack-story-context';

// The dev route that shows a story's stack renders outside Storybook's tree, so a story leaves its screens here by story id.
const stacks = new Map<string, StackScreens>();

// Returns its own cleanup, so a story that unmounts takes its screens with it.
export function registerStack(id: string, screens: StackScreens): () => void {
  stacks.set(id, screens);

  return (): void => {
    stacks.delete(id);
  };
}

export function registeredStack(id: string): StackScreens | undefined {
  return stacks.get(id);
}
