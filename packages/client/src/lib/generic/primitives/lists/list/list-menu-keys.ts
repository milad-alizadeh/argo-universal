import type { KeyboardEvent } from 'react';
import { moveFocusAmong } from '#lib/generic/arrow-focus';

// A menu's rows are what a press reaches; a control inside one (a slider, a field) is not a row.
const rowRoles = '[role="button"],[role="radio"],[role="switch"],[role="link"]';

const unavailable = ':disabled,[aria-disabled="true"]';

const menuRows = (menu: HTMLElement): HTMLElement[] =>
  [...menu.querySelectorAll<HTMLElement>(rowRoles)].filter(
    (row) => !row.matches(unavailable),
  );

/*
 * The arrow keys, Home and End move between a popover List's rows, as in a Combobox. A key a control already
 * took (a slider, a Combobox's own choices) stays with it, and so does one pressed outside the rows.
 */
export function moveBetweenRows(event: KeyboardEvent<HTMLElement>): void {
  if (event.defaultPrevented) return;

  const rows = menuRows(event.currentTarget);

  if (rows.some((row) => row === event.target)) moveFocusAmong(event, rows);
}
