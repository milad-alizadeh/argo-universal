import { describe, expect, it } from 'vitest';
import { pastSessionSignIn } from './session-sign-in';

describe('pastSessionSignIn while a sign-in runs', () => {
  // The user sent again before the browser sign-in finished, so a newer Turn ended `auth_required`.
  it('follows the sign-in and answers the newest Turn when it finishes', () => {
    expect(
      pastSessionSignIn({
        problem: { type: 'turn', id: 'end-2' },
        answered: undefined,
        authenticating: 'end-1',
      }),
    ).toMatchObject({
      follows: true,
      afterSignIn: { type: 'answer-turn', turnEnd: 'end-2' },
    });
  });
});
