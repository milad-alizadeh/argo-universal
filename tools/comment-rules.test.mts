import { describe, expect, it } from 'vitest';
import { commentProblems } from './comment-rules.mts';

const nameTheRule = /Name the exact rule/;
const refactor = /Refactor to meet the cap/;

describe('suppressions', (): void => {
  it.each([
    '// oxlint-disable-next-line unicorn/no-thenable -- awaiting must hang',
    '// eslint-disable-next-line react/no-array-index-key',
    '/* oxlint-disable no-control-regex, unicorn/no-thenable -- vendor format */',
    '// oxlint-disable-line typescript/no-explicit-any -- generated shape',
  ])('passes a suppression that names its rules: %s', (line): void => {
    expect(commentProblems(line)).toEqual([]);
  });

  it.each([
    '// oxlint-disable-next-line',
    '// eslint-disable-next-line -- no rule named',
    '/* oxlint-disable */',
    '// eslint-disable',
  ])('asks for the rule name: %s', (line): void => {
    expect(commentProblems(line)).toEqual([expect.stringMatching(nameTheRule)]);
  });

  it.each([
    'max-lines-per-function',
    'max-lines',
    'complexity',
    'max-depth',
    'max-nested-callbacks',
    'max-statements',
    'max-params',
    'sonarjs/cognitive-complexity',
    'eslint/max-lines',
  ])('refuses a disabled cap: %s', (rule): void => {
    expect(
      commentProblems(`// oxlint-disable-next-line ${rule} -- too long`),
    ).toEqual([expect.stringMatching(refactor)]);
  });

  it('reads the reason as prose, not as rules', (): void => {
    expect(
      commentProblems(
        '// oxlint-disable-next-line no-control-regex -- complexity of git paths',
      ),
    ).toEqual([]);
  });

  it("sends an argo rule to the rule's override", (): void => {
    expect(
      commentProblems('// oxlint-disable-next-line argo/vendor-name -- logo'),
    ).toEqual([expect.stringMatching(/argo rule's override/)]);
  });
});

describe('markers', (): void => {
  it('reports a work marker', (): void => {
    expect(commentProblems('// TODO: split this')).toEqual([
      expect.stringMatching(/GitHub issue/),
    ]);
  });

  it('asks why an expected type error is expected', (): void => {
    expect(commentProblems('// @ts-expect-error')).toEqual([
      expect.stringMatching(/Say why/),
    ]);
    expect(commentProblems('// @ts-expect-error vendor type lags')).toEqual([]);
  });

  it('ignores a line without a comment', (): void => {
    expect(commentProblems("const name = 'oxlint-disable';")).toEqual([]);
  });
});
