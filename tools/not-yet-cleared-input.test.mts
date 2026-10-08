import { expect, it } from 'vitest';
import { evaluateWaivers } from './not-yet-cleared/evaluate.mts';

const current = '{"overrides":[]}';
const report = '{"diagnostics":[]}';

it.each([
  '{"overrides":[}',
  '{"overrides":false}',
  '{"overrides":[],"rules":{"complexity":"off"}}',
])('rejects malformed waiver input: %s', (text): void => {
  expect((): unknown =>
    evaluateWaivers({ current: text, baseline: current, report }),
  ).toThrow(/Invalid|Unrecognized|Expected|expected/);
});

it.each([
  '{"diagnostics":false}',
  '{"diagnostics":[{"filename":"example.ts"}]}',
])('rejects an incomplete report: %s', (measured): void => {
  expect((): unknown =>
    evaluateWaivers({ current, baseline: current, report: measured }),
  ).toThrow(/Invalid|Unrecognized|Expected|expected/);
});
