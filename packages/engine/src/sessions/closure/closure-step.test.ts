import { expect, it } from 'vitest';
import { nextClosureStep } from './closure-step';

it.each([
  {
    name: 'discards a Session never stored',
    stored: false,
    feedEnded: false,
    step: 'discard',
  },
  {
    name: 'discards a Session never stored after its Feed ended',
    stored: false,
    feedEnded: true,
    step: 'discard',
  },
  {
    name: 'flushes the Feed of a stored Session',
    stored: true,
    feedEnded: false,
    step: 'flush',
  },
  {
    name: 'closes a stored Session whose Feed already ended',
    stored: true,
    feedEnded: true,
    step: 'close',
  },
])('$name', ({ stored, feedEnded, step }): void => {
  expect(nextClosureStep({ stored, feedEnded })).toBe(step);
});
