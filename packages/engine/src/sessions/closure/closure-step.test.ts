import { expect, it } from 'vitest';
import { nextClosureStep } from './closure-step';

it.each([
  ['discard', { stored: false, feedEnded: false }],
  ['discard', { stored: false, feedEnded: true }],
  ['flush', { stored: true, feedEnded: false }],
  ['close', { stored: true, feedEnded: true }],
] as const)('takes the %s step for %j', (expected, facts): void => {
  expect(nextClosureStep(facts)).toBe(expected);
});
