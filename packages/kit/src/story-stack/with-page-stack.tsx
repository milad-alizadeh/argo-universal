import type { ComponentType } from 'react';
import { Page } from '#primitives/scaffolds/page';
import { withStack } from './with-stack';

interface StoryContext {
  id: string;
}

function OnPage({ Story }: { Story: ComponentType }): React.JSX.Element {
  return (
    <Page title="Screen">
      <Story />
    </Page>
  );
}

// A story as the one screen of a stack: a Page titled "Screen" holds it, so what it pushes shows a header with Back.
export function withPageStack() {
  const stacked = withStack();

  return (Story: ComponentType, context: StoryContext): React.JSX.Element =>
    stacked(() => <OnPage Story={Story} />, context);
}
