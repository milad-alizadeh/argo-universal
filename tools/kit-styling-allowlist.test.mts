import { describe, expect, it } from 'vitest';
import { allowlistProblems, readAllowlist } from './kit-styling-allowlist.mts';

const row = 'packages/client/src/features/feed/row.tsx';

const card = 'packages/client/src/features/feed/card.tsx';

const allowlist = (files: string[]): string =>
  JSON.stringify({
    overrides: [{ files, rules: { 'argo/kit-styling': 'off' } }],
  });

describe('the kit-styling allowlist', (): void => {
  it('reads the files it waives', (): void => {
    expect(readAllowlist(allowlist([row, card]))).toEqual([row, card]);
  });

  it('accepts a list that shrank and still has findings', (): void => {
    expect(
      allowlistProblems({
        current: [row],
        baseline: [row, card],
        flagged: new Set([row]),
      }),
    ).toEqual([]);
  });

  it('rejects a file added since the baseline', (): void => {
    expect(
      allowlistProblems({
        current: [row, card],
        baseline: [row],
        flagged: new Set([row, card]),
      }),
    ).toEqual([`${card}: added; the allowlist only shrinks.`]);
  });

  it('rejects a file that no longer styles a kit component', (): void => {
    expect(
      allowlistProblems({
        current: [row],
        baseline: [row],
        flagged: new Set(),
      }),
    ).toEqual([
      `${row}: no argo/kit-styling findings; delete it from the allowlist.`,
    ]);
  });

  it('allows the first list when the baseline has none', (): void => {
    expect(
      allowlistProblems({
        current: [row],
        baseline: undefined,
        flagged: new Set([row]),
      }),
    ).toEqual([]);
  });
});
