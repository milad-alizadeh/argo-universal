import { describe, expect, it } from 'vitest';
import { toastTitle } from './toast-title.android';

const title = "Couldn't load Sessions";

describe('toastTitle on Android', () => {
  it.each([
    [
      { title, message: "The Server didn't respond." },
      `${title}. The Server didn't respond.`,
    ],
    [
      { title: 'Saved.', message: 'Restart to apply.' },
      'Saved. Restart to apply.',
    ],
    [{ title: 'Done!', message: 'All set.' }, 'Done! All set.'],
    [
      { title: 'Retry?', message: 'The Server is back.' },
      'Retry? The Server is back.',
    ],
    [{ title }, title],
    [{ title, message: '' }, title],
  ])('%j reads %j', (toast, expected) => {
    expect(toastTitle(toast)).toBe(expected);
  });
});
