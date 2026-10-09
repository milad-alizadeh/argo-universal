import { expect, it } from 'vitest';
import { screen, snapshotOf } from './paper-drift.mocks.mts';
import { findLiteralDrift } from './paper-drift/literal-drift.mts';
import { findNameDrift } from './paper-drift/name-drift.mts';
import { blockBody, declarations } from './paper-drift/theme-tokens.mts';
import { findTokenDrift, sameValue } from './paper-drift/token-drift.mts';
import { normaliseValue, resolveTokens } from './paper-drift/token-values.mts';

it.each([
  ['1rem', '16px'],
  ['calc(10px - 4px)', '6px'],
  ['#fff', '#FFFFFFFF'],
  ['oklch(55.6% 0 none)', normaliseValue('oklch(55.6% 0 0)')],
  ['400', '400'],
])('normalises %s', (value, expected): void => {
  expect(normaliseValue(value)).toBe(expected);
});

it('resolves var() through the same token set', (): void => {
  const tokens = {
    '--radius': '10px',
    '--radius-sm': 'calc(var(--radius) - 4px)',
  };
  expect(resolveTokens(tokens)['--radius-sm']).toBe('6px');
});

it('treats colours one step apart per channel as the same', (): void => {
  expect(sameValue('#155DFCFF', '#165DFCFF')).toBe(true);
  expect(sameValue('#155DFCFF', '#185DFCFF')).toBe(false);
});

it('reads declarations from one block, skipping comments and nested rules', (): void => {
  const css =
    '@theme static {\n  /* a */\n  --a: 1px;\n  @keyframes x { to { opacity: 1; } }\n  --b: var(--a);\n}\n@other { --c: 2px; }';
  expect(declarations(blockBody(css, '@theme static'))).toEqual({
    '--a': '1px',
    '--b': 'var(--a)',
  });
});

it('reports tokens whose resolved values differ, or that code lacks', (): void => {
  const paper = { '--a': '16px', '--b': 'var(--a)', '--c': '1px' };
  const code = {
    all: { '--a': '1rem', '--b': '2px', '--d': '3px' },
    own: { '--d': '3px' },
  };
  expect(findTokenDrift(paper, code)).toEqual({
    mismatches: [
      { name: '--b', paper: '16px', code: '2px' },
      { name: '--c', paper: '1px', code: undefined },
    ],
    missingInPaper: ['--d'],
  });
});

it('suggests the token for a literal on its scale', (): void => {
  const snapshot = snapshotOf(
    [
      screen({
        id: 'a',
        name: 'A',
        styles: {
          gap: '8px',
          color: 'var(--color-x)',
          fontSize: '17px',
          padding: '0px',
        },
      }),
    ],
    { '--spacing-2': '8px', '--color-x': '#000' },
  );
  expect(findLiteralDrift(snapshot)).toEqual([
    {
      property: 'gap',
      value: '8px',
      count: 1,
      tokens: ['--spacing-2'],
      examples: ['Screen › A'],
    },
    {
      property: 'fontSize',
      value: '17px',
      count: 1,
      tokens: [],
      examples: ['Screen › A'],
    },
  ]);
});

it('groups frame names that differ only in case and punctuation', (): void => {
  const snapshot = snapshotOf([
    screen(
      { id: 'a', name: 'Session row' },
      { id: 'b', name: 'SessionRow' },
      { id: 'c', name: 'SessionRow' },
      { id: 'd', name: 'Frame 2' },
    ),
  ]);
  expect(findNameDrift(snapshot)).toEqual([
    [
      { name: 'SessionRow', count: 2 },
      { name: 'Session row', count: 1 },
    ],
  ]);
});
