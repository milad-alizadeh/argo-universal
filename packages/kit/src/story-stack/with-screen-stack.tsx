import type { ComponentType } from 'react';
import { Screen } from '#primitives/scaffolds/screen';
import { withStack } from './with-stack';

interface StoryContext {
  id: string;
}

function OnScreen({ Story }: { Story: ComponentType }): React.JSX.Element {
  return (
    <Screen title="Screen">
      <Story />
    </Screen>
  );
}

// A story as the one screen of a stack: a Screen titled "Screen" holds it, so what it pushes shows a header with Back.
export function withScreenStack() {
  const stacked = withStack();

  return (Story: ComponentType, context: StoryContext): React.JSX.Element =>
    stacked(() => <OnScreen Story={Story} />, context);
}
