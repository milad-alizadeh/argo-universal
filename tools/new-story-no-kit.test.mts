import { describe, expect, it } from 'vitest';
import { declaredProps } from './new-story-props.mts';
import { renderStory } from './new-story-rules.mts';

describe('renderStory without a kit component', () => {
  it('lists argTypes from the props and spies on a required handler', () => {
    const source = renderStory({
      title: 'Connection/ConnectionBanner',
      component: 'ConnectionBanner',
      importPath: './connection-banner',
      kitComponent: undefined,
      props: declaredProps(
        [
          "interface ConnectionBannerProps { state: 'open' | 'offline'; onRetry: () => void }",
        ],
        'ConnectionBanner',
      ),
      branches: new Map(),
    });

    expect(source).toContain("import { fn } from 'storybook/test';");
    expect(source).toContain("state: 'open',");
    expect(source).toContain('onRetry: fn(),');
    expect(source).toContain(
      "state: { control: 'select', options: ['open', 'offline'] },",
    );
    expect(source).not.toContain('kitArgTypes');
  });
});
