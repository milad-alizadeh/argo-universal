import { expect, it } from 'vitest';
import { nextClosureStep } from './closure-step';

it.each([
  {
    name: 'discards a New Session no prompt reached',
    kept: false,
    feedEnded: false,
    step: 'discard',
  },
  {
    name: 'discards a New Session no prompt reached after its Feed ended',
    kept: false,
    feedEnded: true,
    step: 'discard',
  },
  {
    name: 'flushes the Feed of a kept Session',
    kept: true,
    feedEnded: false,
    step: 'flush',
  },
  {
    name: 'closes a kept Session whose Feed already ended',
    kept: true,
    feedEnded: true,
    step: 'close',
  },
])('$name', ({ kept, feedEnded, step }): void => {
  expect(nextClosureStep({ kept, feedEnded })).toBe(step);
});
