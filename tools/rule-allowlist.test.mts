import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { allowlistProblems, readAllowlist } from './rule-allowlist.mts';

const rule = 'argo/kit-styling';

const row = 'packages/client/src/features/feed/row.tsx';

const card = 'packages/client/src/features/feed/card.tsx';

const allowlist = (files: string[]): string =>
  JSON.stringify({
    overrides: [{ files, rules: { 'argo/kit-styling': 'off' } }],
  });

describe('a rule allowlist', (): void => {
  it('reads the files it waives', (): void => {
    expect(readAllowlist(allowlist([row, card]), rule)).toEqual([row, card]);
  });

  const waiver = { files: [row], rules: { 'argo/kit-styling': 'off' } };

  it('rejects a list that waives another rule', (): void => {
    const list = {
      overrides: [
        {
          files: [row],
          rules: { 'argo/kit-styling': 'off', 'argo/icon-size': 'off' },
        },
      ],
    };

    expect(() => readAllowlist(JSON.stringify(list), rule)).toThrow(
      'must waive argo/kit-styling and nothing else',
    );
  });

  it('rejects a list with two overrides', (): void => {
    const list = { overrides: [waiver, waiver] };

    expect(() => readAllowlist(JSON.stringify(list), rule)).toThrow(ZodError);
  });

  it('accepts a list that shrank and still has findings', (): void => {
    expect(
      allowlistProblems({
        rule,
        current: [row],
        baseline: [row, card],
        flagged: new Set([row]),
      }),
    ).toEqual([]);
  });

  it('rejects a file added since the baseline', (): void => {
    expect(
      allowlistProblems({
        rule,
        current: [row, card],
        baseline: [row],
        flagged: new Set([row, card]),
      }),
    ).toEqual([`${card}: added; the allowlist only shrinks.`]);
  });

  it('keeps the waiver of a file git moved', (): void => {
    expect(
      allowlistProblems({
        rule,
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
        rule,
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
        rule,
        current: [row],
        baseline: undefined,
        flagged: new Set([row]),
      }),
    ).toEqual([]);
  });
});
