import { expect, it } from 'vitest';
import { errorToast } from './error-toast';

const title = "Couldn't check sign-in";

const message = 'Server error';

it.each([
  { case: 'an Error', cause: new Error(message) },
  { case: 'a thrown string', cause: message },
])('says what $case says below the title', ({ cause }) => {
  expect(errorToast(title, cause)).toEqual({ title, message });
});

it('keeps the key that tells one toast from another', () => {
  expect(errorToast(title, new Error(message), 'sign-in')).toEqual({
    title,
    message,
    key: 'sign-in',
  });
});

it.each([null, undefined])('shows no toast for no failure (%s)', (cause) => {
  expect(errorToast(title, cause)).toBeUndefined();
});
