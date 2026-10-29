import { describe, expect, it } from 'vitest';
import { drawing, kit, meta } from './story-gate-fixtures.mocks.mts';
import { gateProblems, type Sources } from './story-gate-rules.mts';

const button = `export interface ButtonProps {
  label: string;
  variant?: 'default' | 'outline';
  disabled?: boolean;
  style?: { color: string };
  onPress?: () => void;
}

export function Button(props: ButtonProps): null {
  return null;
}
`;

const buttonFile = 'packages/kit/src/primitives/actions/button/button.tsx';

const tree = (source = button): Sources => new Map([[buttonFile, source]]);

const drawn = (body: string): string =>
  `import { Button } from './button';\n\n${drawing}\n${body}\n`;

const loudStory = 'export const Loud: Story = { args: { volume: 11 } };';

const failingStory = (args: string): string =>
  `${drawing}\nexport const Failing: Story = { args: ${args} };`;

describe('the props a story file varies', (): void => {
  it('passes when every arg is a prop the component declares', (): void => {
    expect(
      gateProblems(
        kit,
        drawn(
          "export const Outline: Story = { args: { variant: 'outline' } };",
        ),
        tree(),
      ),
    ).toEqual([]);
  });

  it("fails on an arg the component's props do not name", (): void => {
    expect(
      gateProblems(
        kit,
        drawn('export const ChecksRunning: Story = { args: { checks: 2 } };'),
        tree(),
      ),
    ).toEqual([
      expect.stringContaining(
        'story `ChecksRunning` sets `checks`, which is not a prop',
      ),
    ]);
  });

  it('reads a key nested inside an arg as part of that arg, not as an arg', (): void => {
    expect(
      gateProblems(
        kit,
        drawn(
          "export const Tinted: Story = { args: { style: { color: 'red' } } };",
        ),
        tree(),
      ),
    ).toEqual([]);
  });

  it('follows a props type the component takes from a sibling module', (): void => {
    const sources: Sources = new Map([
      [buttonFile, "import type { ButtonProps } from './button-props';\n"],
      [
        'packages/kit/src/primitives/actions/button/button-props.ts',
        'export interface ButtonProps {\n  label: string;\n}\n',
      ],
    ]);

    expect(gateProblems(kit, drawn(loudStory), sources)).toEqual([
      expect.stringContaining(
        'story `Loud` sets `volume`, which is not a prop',
      ),
    ]);
  });

  it('says nothing when the component file is not in the tree', (): void => {
    expect(gateProblems(kit, drawn(loudStory), new Map())).toEqual([]);
  });

  it('says nothing when the props type is an intersection it cannot read whole', (): void => {
    expect(
      gateProblems(
        kit,
        drawn(loudStory),
        tree('export type ButtonProps = Base & {\n  label: string;\n};\n'),
      ),
    ).toEqual([]);
  });

  it('says nothing when the meta draws its component through its own render', (): void => {
    expect(
      gateProblems(
        kit,
        `import { Button } from './button';\n\n${meta(
          "  component: Button,\n  argTypes: kitArgTypes('Button'),\n  render: (args) => <Frame {...args} />,",
        )}\n${loudStory}\n`,
        tree(),
      ),
    ).toEqual([]);
  });
});

describe("a child's state in a parent's args", (): void => {
  it('fails on a state spelled out inline', (): void => {
    expect(
      gateProblems(
        kit,
        failingStory(
          "{ check: { name: 'Lint', state: 'failed', url: '/ci' } }",
        ),
      ),
    ).toEqual([
      expect.stringContaining('story `Failing` spells out `check` inline'),
    ]);
  });

  it('names the outermost object only, which is the one that becomes an import', (): void => {
    expect(
      gateProblems(
        kit,
        failingStory(
          "{ check: { name: 'Lint', state: 'failed', run: { id: 1, at: 2, by: 3 } } }",
        ),
      ),
    ).toEqual([
      expect.stringContaining('story `Failing` spells out `check` inline'),
    ]);
  });

  it.each([
    "{ check: { name: 'Lint', state: 'failed' } }",
    '{ check: failingCheck }',
    '{ check: { ...failingCheck, onOpen: fn() } }',
    '{ check: { onRead: fn(read), onInput: fn(), onFailure: fn() } }',
    '{ check: { onOpen: () => {}, onClose: () => {}, onRetry: () => {} } }',
  ])('passes on %s', (args): void => {
    expect(gateProblems(kit, failingStory(args))).toEqual([]);
  });
});
