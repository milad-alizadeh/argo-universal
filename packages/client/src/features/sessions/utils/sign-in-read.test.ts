import { expect, it, vi } from 'vitest';
import {
  dropped,
  serverError,
} from '../../../../mocks/sessions/open-failure.mocks';
import { unreadSignIn } from './sign-in-read';

const reread = vi.fn<() => void>();

it('shows Loading… until the Agent’s methods arrive', () => {
  expect(unreadSignIn({ error: null, dropped: false, reread })).toEqual({
    kind: 'loading',
  });
});

// The read runs again by itself when the Connection reopens.
it('keeps Loading… for a read the Connection dropped', () => {
  expect(unreadSignIn({ error: dropped, dropped: true, reread })).toEqual({
    kind: 'loading',
  });
});

it.each([
  { case: 'a Server error', error: serverError },
  { case: 'no answer while the Connection is up', error: dropped },
])(
  'shows Failed to Launch, whose Retry reads again, for $case',
  ({ error }) => {
    const callout = unreadSignIn({ error, dropped: false, reread });

    expect(callout).toEqual({
      kind: 'launch',
      message: error.message,
      onRetry: reread,
    });
  },
);
