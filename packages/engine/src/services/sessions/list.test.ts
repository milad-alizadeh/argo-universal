import { SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';

it.each([{ archived: false }, { archived: false, direction: 'forward' }])(
  'accepts the Session list paging mock %j',
  (input): void => {
    expect(SessionListInput.parse(input)).toEqual(input);
  },
);
it.each([{ direction: 'backward' }, { unexpected: true }])(
  'rejects unsupported paging mock fields %j',
  (input): void => {
    expect(
      SessionListInput.safeParse({ archived: false, ...input }).success,
    ).toBe(false);
  },
);
