import { describe, expect, it } from 'vitest';
import { drawing, kit, meta } from './story-gate-fixtures.mocks.mts';
import { gateProblems } from './story-gate-rules.mts';

describe('a story file that documents a component', (): void => {
  it('passes with argTypes beside its component', (): void => {
    expect(gateProblems(kit, drawing)).toEqual([]);
  });

  it('fails with a component and no argTypes', (): void => {
    expect(gateProblems(kit, meta('  component: Button,'))).toEqual([
      expect.stringContaining('sets `component:` but no `argTypes`'),
    ]);
  });

  it('passes when it opts out of autodocs instead', (): void => {
    expect(
      gateProblems(
        kit,
        meta(
          "  component: Button,\n  // Drawn as a scale, not a component.\n  tags: ['!autodocs'],",
        ),
      ),
    ).toEqual([]);
  });

  it('passes when it documents no component at all', (): void => {
    expect(gateProblems(kit, meta("  title: 'X',"))).toEqual([]);
  });
});

describe('a story name', (): void => {
  it.each(['WithPoster', 'WithoutMetadata', 'FullWidthTrue', 'LoadingFalse'])(
    'fails when it names a prop: %s',
    (name): void => {
      expect(
        gateProblems(kit, `${drawing}\nexport const ${name}: Story = {};`),
      ).toEqual([
        expect.stringContaining(`story \`${name}\` is named after a prop`),
      ]);
    },
  );

  it.each(['Destructive', 'Loading', 'Compact', 'Withering', 'Secondary'])(
    'passes when it names a state: %s',
    (name): void => {
      expect(
        gateProblems(kit, `${drawing}\nexport const ${name}: Story = {};`),
      ).toEqual([]);
    },
  );
});

describe('the files the gates read', (): void => {
  it('ignores a test story, whose name states the behaviour under test', (): void => {
    expect(
      gateProblems(
        'packages/kit/src/primitives/actions/button/button.test.stories.tsx',
        `${meta('  component: Button,')}\nexport const WithoutAgentHidesControl: Story = {};`,
      ),
    ).toEqual([]);
  });

  it('ignores a file outside the kit and the client', (): void => {
    expect(
      gateProblems('apps/storybook/x.stories.tsx', meta('  component: X,')),
    ).toEqual([]);
  });

  it('ignores a component file', (): void => {
    expect(
      gateProblems('packages/kit/src/primitives/actions/button/button.tsx', ''),
    ).toEqual([]);
  });
});
