import { describe, expect, it } from 'vitest';
import { declaresKey, namedImports, readStory } from './story-file.mts';

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

describe('what a story file declares', (): void => {
  it('reads a named import written across lines', (): void => {
    const source =
      "import {\n  loading,\n  idle,\n} from './button-fixtures';\n";

    expect(read(source).imports).toEqual([
      { names: ['loading', 'idle'], from: './button-fixtures' },
    ]);
  });

  it('says whether the meta sets a key on a line of its own', (): void => {
    const { meta } = read(
      "const meta = {\n  title: 'A',\n  argTypes: {},\n  // render: nothing\n} satisfies Meta;",
    );

    expect([declaresKey(meta, 'argTypes'), declaresKey(meta, 'args')]).toEqual([
      true,
      false,
    ]);
  });
});

describe('the args blocks of a story file', (): void => {
  const source = `const meta = {
  args: { size: 'm', note: '}' },
} satisfies Meta;

export const Busy: Story = {
  args: { onPress: fn(), state: { a: 1, b: 2, c: 3, d: { e: 1 } }, tone: 'x' },
};
`;

  it('owns the meta args by the meta and the others by their story', (): void => {
    expect(read(source).argsBlocks.map(({ owner }): string => owner)).toEqual([
      'meta',
      'Busy',
    ]);
  });

  it('lists the top-level keys, ignoring braces inside strings', (): void => {
    expect(read(source).argsBlocks[0]?.keys).toEqual(['size', 'note']);
  });

  it('counts the data keys of the outermost objects, not callbacks or nested ones', (): void => {
    expect(read(source).argsBlocks[1]?.objects).toEqual([
      { key: 'state', dataKeys: 4 },
    ]);
  });
});
