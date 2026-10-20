import { describe, expect, it } from 'vitest';
import {
  dropped,
  openFailure,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import { optionsReadToast } from './options-read-toast';

describe('optionsReadToast', () => {
  it('shows a failed read as a failed load', () => {
    expect(optionsReadToast(serverError, false)).toEqual({
      title: "Couldn't load the Agent's options",
      message: 'Session session-1 closed',
    });
  });

  it.each([
    { case: 'no failure', cause: null, wasDropped: false },
    {
      case: 'an Agent that needs sign-in, which Send reports',
      cause: openFailure({ type: 'auth-required' }),
      wasDropped: false,
    },
    {
      case: 'an Agent that failed to launch, which Send reports',
      cause: openFailure({ type: 'failed', message: 'Agent exited' }),
      wasDropped: false,
    },
    {
      case: 'a dropped Connection, which the banner reports',
      cause: dropped,
      wasDropped: true,
    },
  ])('shows none for $case', ({ cause, wasDropped }) => {
    expect(optionsReadToast(cause, wasDropped)).toBeUndefined();
  });
});
