import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
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

  const waiver = { files: [row], rules: { 'argo/kit-styling': 'off' } };

  it.each([
    [
      'waives another rule',
      {
        overrides: [
          {
            files: [row],
            rules: { 'argo/kit-styling': 'off', 'argo/icon-role': 'off' },
          },
        ],
      },
    ],
    ['has two overrides', { overrides: [waiver, waiver] }],
  ])('rejects a list that %s', (_, list): void => {
    expect(() => readAllowlist(JSON.stringify(list))).toThrow(ZodError);
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

  it('keeps the waiver of a file git moved', (): void => {
    expect(
      allowlistProblems({
        current: [card],
        baseline: [row],
        flagged: new Set([card]),
        moved: new Map([[card, row]]),
      }),
    ).toEqual([]);
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
