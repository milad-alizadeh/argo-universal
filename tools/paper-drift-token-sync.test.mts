import { expect, it } from 'vitest';
import { codeTokensOf, recordingPaper } from './paper-drift.mocks.mts';
import { planTokens } from './paper-drift/token-plan.mts';
import { applyTokens, tokenReport } from './paper-drift/token-sync.mts';

const RADIUS_LG = '--radius-lg';
const RADIUS_ALIAS = 'var(--radius)';
const defaults = {
  '--color-neutral-950': 'oklch(14.5% 0 0)',
  '--color-white': '#fff',
};
const own = {
  '--color-foreground': 'var(--color-neutral-950)',
  '--color-success': 'oklch(62.7% 0.194 149.2)',
  '--radius': '10px',
  [RADIUS_LG]: RADIUS_ALIAS,
  '--radius-sm': 'calc(var(--radius) - 4px)',
  '--spacing-0_5': '0.125rem',
  '--font-weight-strong': '600',
  '--shadow-sm': '0 1px 2px #000',
  '--spacing-hairline': 'hairlineWidth()',
};
const paperTokens = {
  '--color-success': 'var(--color-green-600)',
  '--color-green-600': 'oklch(62.7% 0.194 149.214)',
  [RADIUS_LG]: '10px',
  '--radius-sm': '6px',
  '--spacing-0_5': '4px',
  '--font-weight-strong': '600',
  '--text-xs': '12px',
};

it('plans adds, changes and unmapped tokens, leaving Paper-only tokens alone', (): void => {
  expect(planTokens(paperTokens, codeTokensOf(own, defaults))).toEqual({
    add: [
      { type: 'radius', name: '--radius', value: '10px' },
      {
        type: 'color',
        name: '--color-neutral-950',
        value: 'oklch(14.5% 0 0)',
      },
      {
        type: 'color',
        name: '--color-foreground',
        value: 'var(--color-neutral-950)',
      },
    ],
    change: [
      {
        type: 'radius',
        name: RADIUS_LG,
        value: RADIUS_ALIAS,
        paper: '10px',
      },
      { type: 'spacing', name: '--spacing-0_5', value: '2px', paper: '4px' },
    ],
    unchanged: ['--color-success', '--radius-sm', '--font-weight-strong'],
    paperOnly: ['--color-green-600', '--text-xs'],
    unmapped: [
      {
        name: '--shadow-sm',
        value: '0 1px 2px #000',
        reason: 'Paper has no token type for it',
      },
      {
        name: '--spacing-hairline',
        value: 'hairlineWidth()',
        reason: 'not a spacing value Paper can hold',
      },
    ],
  });
});

it('counts an alias to a token neither side has as unmapped', (): void => {
  const plan = planTokens({}, codeTokensOf({ '--color-x': 'var(--color-y)' }));
  expect(plan.add).toEqual([]);
  expect(plan.unmapped).toEqual([
    {
      name: '--color-x',
      value: 'var(--color-y)',
      reason: 'aliases --color-y, which Paper would not have',
    },
  ]);
});

it('ends the report with the counts', (): void => {
  const plan = planTokens(paperTokens, codeTokensOf(own, defaults));
  expect(tokenReport(plan).at(-1)).toBe(
    'Tokens: 3 to add, 2 to change, 3 unchanged, 2 only in Paper, left alone, 2 unmapped.',
  );
});

it('creates before it sets, and returns what Paper refused', async (): Promise<void> => {
  const { paper, calls } = recordingPaper({
    create_tokens: [
      { name: '--radius', result: 'created' },
      { result: 'error', message: 'bad value' },
    ],
    set_tokens: { results: [{ name: RADIUS_LG, result: 'updated' }] },
  });
  const plan = planTokens(paperTokens, codeTokensOf(own, defaults));
  expect(await applyTokens(paper, plan)).toEqual(['?: bad value']);
  expect(calls.map((call): string => call.tool)).toEqual([
    'create_tokens',
    'set_tokens',
  ]);
  expect(calls[1]?.args).toEqual({
    tokens: [
      { name: RADIUS_LG, value: RADIUS_ALIAS },
      { name: '--spacing-0_5', value: '2px' },
    ],
  });
});

it('rejects a write answer it does not recognise', async (): Promise<void> => {
  const { paper } = recordingPaper({ create_tokens: 'OK' });
  const plan = planTokens({}, codeTokensOf({ '--radius': '10px' }));
  await expect(applyTokens(paper, plan)).rejects.toThrow(/invalid/i);
});
