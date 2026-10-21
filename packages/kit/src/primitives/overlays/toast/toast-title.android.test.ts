import { describe, expect, it } from 'vitest';
import { toastTitle } from './toast-title.android';

const title = 'Title';

describe('toastTitle on Android', () => {
  it.each([
    [{ title, message: 'Message text.' }, `${title}. Message text.`],
    [{ title: 'First.', message: 'Second.' }, 'First. Second.'],
    [{ title: 'First!', message: 'Second.' }, 'First! Second.'],
    [{ title: 'First?', message: 'Second.' }, 'First? Second.'],
    [{ title }, title],
    [{ title, message: '' }, title],
  ])('%j reads %j', (toast, expected) => {
    expect(toastTitle(toast)).toBe(expected);
  });
});
