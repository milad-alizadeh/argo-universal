import { SessionListInput } from '@repo/contracts';
import { expect, it } from 'vitest';

it.each([{ archived: false }, { archived: false, direction: 'forward' }])(
  'accepts the Session list paging mock %j',
  (pagingInput): void => {
    expect(SessionListInput.parse(pagingInput)).toEqual(pagingInput);
  },
);
it.each([{ direction: 'backward' }, { unexpected: true }])(
  'rejects unsupported paging mock fields %j',
  (pagingInput): void => {
    expect(
      SessionListInput.safeParse({ archived: false, ...pagingInput }).success,
    ).toBe(false);
  },
);
