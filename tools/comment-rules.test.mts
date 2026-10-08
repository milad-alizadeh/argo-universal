import { describe, expect, it } from 'vitest';
import { commentProblems } from './comment-rules.mts';

const nameTheRule = /Name the exact rule/;
const refactor = /Refactor to meet the cap/;

describe('suppressions', () => {
  it.each([
    '// oxlint-disable-next-line unicorn/no-thenable -- awaiting must hang',
    '// eslint-disable-next-line react/no-array-index-key',
    '/* oxlint-disable no-control-regex, unicorn/no-thenable -- vendor format */',
    '// oxlint-disable-line typescript/no-explicit-any -- generated shape',
  ])('passes a suppression that names its rules: %s', (line) => {
    expect(commentProblems(line)).toEqual([]);
  });

  it.each([
    '// oxlint-disable-next-line',
    '// eslint-disable-next-line -- no rule named',
    '/* oxlint-disable */',
    '// eslint-disable',
  ])('asks for the rule name: %s', (line) => {
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
  ])('refuses a disabled cap: %s', (rule) => {
    expect(
      commentProblems(`// oxlint-disable-next-line ${rule} -- too long`),
    ).toEqual([expect.stringMatching(refactor)]);
  });

  it('reads the reason as prose, not as rules', () => {
    expect(
      commentProblems(
        '// oxlint-disable-next-line no-control-regex -- complexity of git paths',
      ),
    ).toEqual([]);
  });

  it("sends an argo rule to the rule's override", () => {
    expect(
      commentProblems('// oxlint-disable-next-line argo/vendor-name -- logo'),
    ).toEqual([expect.stringMatching(/argo rule's override/)]);
  });
});

describe('markers', () => {
  it('reports a work marker', () => {
    expect(commentProblems('// TODO: split this')).toEqual([
      expect.stringMatching(/GitHub issue/),
    ]);
  });

  it('asks why an expected type error is expected', () => {
    expect(commentProblems('// @ts-expect-error')).toEqual([
      expect.stringMatching(/Say why/),
    ]);
    expect(commentProblems('// @ts-expect-error vendor type lags')).toEqual([]);
  });

  it('ignores a line without a comment', () => {
    expect(commentProblems("const name = 'oxlint-disable';")).toEqual([]);
  });
});
