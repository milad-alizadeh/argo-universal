import { within } from 'storybook/test';

/*
 * The whole row its press target belongs to: a row with a meta line draws its press under its content, so the content
 * sits beside the press target rather than inside it.
 */
export function rowWith(press: HTMLElement): ReturnType<typeof within> {
  const row = press.parentElement;

  if (!row) throw new Error('A row press target has no row');

  return within(row);
}
