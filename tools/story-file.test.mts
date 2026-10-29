import { describe, expect, it } from 'vitest';
import { namedImports, readStory } from './story-file.mts';

const file = 'packages/kit/src/primitives/actions/button/button.stories.tsx';

const read = (source: string): ReturnType<typeof readStory> =>
  readStory({ file, source });

const story = `import type { Meta } from '@storybook/react';
import { Button } from './button';
import { loading, idle } from './button-fixtures';

const meta = {
  title: 'Design System/Primitives/Actions/Button',
  component: Button,
  argTypes: {},
} satisfies Meta<typeof Button>;

export default meta;

export const Default: Story = { args: {} };

export const Loading = action(true);
`;

describe('reading a story file', (): void => {
  it('reads the title and the component off the meta', (): void => {
    expect(read(story)).toMatchObject({
      title: 'Design System/Primitives/Actions/Button',
      component: 'Button',
    });
  });

  it('counts annotated and built exports as stories, and not the default export', (): void => {
    expect(read(story).exports.map(({ name }): string => name)).toEqual([
      'Default',
      'Loading',
    ]);
  });

  it('reads named imports with their module', (): void => {
    expect(read(story).imports).toEqual([
      { names: ['Meta'], from: '@storybook/react' },
      { names: ['Button'], from: './button' },
      { names: ['loading', 'idle'], from: './button-fixtures' },
    ]);
  });

  it('has no title or component where the meta sets neither', (): void => {
    expect(
      read('const meta = {\n  tags: [],\n} satisfies Meta;'),
    ).toMatchObject({
      title: undefined,
      component: undefined,
    });
  });

  it('ignores a title a story sets after the meta closes', (): void => {
    const source =
      "const meta = {\n  tags: [],\n};\n\nexport const A: Story = { title: 'x' };";

    expect(read(source).title).toBeUndefined();
  });

  it('reads the imports of a component file the same way', (): void => {
    expect(namedImports("import { A } from './a';")).toEqual([
      { names: ['A'], from: './a' },
    ]);
  });
});
