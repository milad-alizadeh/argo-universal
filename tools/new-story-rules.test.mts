import { describe, expect, it } from 'vitest';
import { declaredProps } from './new-story-props.mts';
import {
  branchesIn,
  derivedTitle,
  kitPartIn,
  renderStory,
  storyEntries,
} from './new-story-rules.mts';
import { storyTitleProblems } from './story-title-rules.mts';

const styles = `
import { cva } from 'class-variance-authority';
const outer = cva('base', {
  variants: {
    variant: { default: 'a', outline: 'b' },
    size: { sm: 'c', md: 'd' },
    disabled: { true: 'e' },
  },
});
const inner = cva('', { variants: { variant: { default: 'f', link: 'g' } } });
`;

describe('branchesIn', () => {
  it('unites every variants map in the folder, keeping source order', () => {
    expect(Object.fromEntries(branchesIn([styles]))).toEqual({
      variant: ['default', 'outline', 'link'],
      size: ['sm', 'md'],
      disabled: ['true'],
    });
  });

  it('reads tailwind-variants as well as cva', () => {
    const source = "const pill = tv({ variants: { tone: { info: 'a' } } });";

    expect(Object.fromEntries(branchesIn([source]))).toEqual({
      tone: ['info'],
    });
  });

  it('finds nothing in a component with no variants map', () => {
    expect(branchesIn(['export const Pill = () => null;']).size).toBe(0);
  });
});

describe('storyEntries', () => {
  it('gives each branch one story and drops props the component does not declare', () => {
    const entries = storyEntries(
      new Map([
        ['variant', ['default']],
        ['disabled', ['true']],
        ['destructive', ['true']],
      ]),
      new Set(['variant', 'disabled', 'label']),
    );

    expect(entries.map((entry) => entry.name)).toEqual(['Default', 'Disabled']);
  });

  it('names a value two props share after its prop', () => {
    const entries = storyEntries(
      new Map([
        ['size', ['sm']],
        ['gap', ['sm']],
      ]),
    );

    expect(entries.map((entry) => entry.name)).toEqual(['SizeSm', 'GapSm']);
  });
});

describe('derivedTitle', () => {
  it.each([
    [
      'packages/kit/src/primitives/status/pill/pill.tsx',
      'Design System/Primitives/Status/Pill',
    ],
    ['packages/kit/src/symbols/icon.tsx', 'Design System/Icon'],
    [
      'packages/client/src/lib/product/scroll-fade/scroll-fade.tsx',
      'Design System/Patterns/ScrollFade',
    ],
    [
      'packages/client/src/features/sessions/components/session-row.tsx',
      'Sessions/SessionRow',
    ],
  ])('%s → %s, which the title check accepts', (file, title) => {
    const story = file.replace(/\.tsx$/, '.stories.tsx');

    expect(derivedTitle(file)).toBe(title);
    expect(
      storyTitleProblems(story, `const meta = { title: '${title}' }`),
    ).toEqual([]);
  });

  it('refuses a folder no story group belongs to', () => {
    expect(() => derivedTitle('packages/client/src/app/index.tsx')).toThrow(
      'no story group belongs to this folder',
    );
  });
});

describe('renderStory', () => {
  const plan = {
    title: 'Design System/Primitives/Actions/Button',
    component: 'Button',
    importPath: './button',
    kitPart: kitPartIn(["type ButtonProps = KitProps<'Button'>;"]),
    props: [
      {
        name: 'label',
        required: true,
        kind: 'text' as const,
        options: undefined,
      },
      {
        name: 'variant',
        required: false,
        kind: 'choice' as const,
        options: ['default', 'outline'],
      },
    ],
    branches: new Map([['variant', ['default', 'outline']]]),
  };

  it('writes a story per branch and keeps the label an arg', () => {
    const source = renderStory(plan);

    expect(source).toMatch(/args: \{ label: 'Label',/);
    expect(source).toContain("argTypes: kitArgTypes('Button')");
    expect(source).toContain(
      "export const Outline: Story = { args: { variant: 'outline' } };",
    );
    expect(source).not.toMatch(/export const Label\b/);
  });

  it('gives a branch-less component one Default story', () => {
    expect(renderStory({ ...plan, branches: new Map() })).toContain(
      'export const Default: Story = {};',
    );
  });
});

describe('declaredProps', () => {
  const source = `
    type Tone = 'info' | 'danger';
    export interface BannerProps {
      title: string;
      tone?: Tone;
      count: number;
      open: boolean;
      onRetry: () => void;
      blob: BlobRef;
    }`;

  it('reads each prop of `<Component>Props`, through a local alias', () => {
    expect(declaredProps([source], 'Banner')).toEqual([
      { name: 'title', required: true, kind: 'text', options: undefined },
      {
        name: 'tone',
        required: false,
        kind: 'choice',
        options: ['info', 'danger'],
      },
      { name: 'count', required: true, kind: 'number', options: undefined },
      { name: 'open', required: true, kind: 'boolean', options: undefined },
      { name: 'onRetry', required: true, kind: 'handler', options: undefined },
      { name: 'blob', required: true, kind: 'opaque', options: undefined },
    ]);
  });

  it('reads the literal parts of an intersection alias', () => {
    const alias = 'type RowProps = ViewProps & { label: string };';

    expect(declaredProps([alias], 'Row').map((prop) => prop.name)).toEqual([
      'label',
    ]);
  });

  it('gives a component with no props type no props', () => {
    expect(declaredProps(['export const Row = () => null;'], 'Row')).toEqual(
      [],
    );
  });
});

describe('renderStory without a kit part', () => {
  it('lists argTypes from the props and spies on a required handler', () => {
    const source = renderStory({
      title: 'Connection/ConnectionBanner',
      component: 'ConnectionBanner',
      importPath: './connection-banner',
      kitPart: undefined,
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
