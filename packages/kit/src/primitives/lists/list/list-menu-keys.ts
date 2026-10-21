import type { KeyboardEvent } from 'react';
import { moveFocusAmong } from '#kit/arrow-focus';

// A menu's rows are what a press reaches; a control inside one (a slider, a field) is not a row.
const rowRoles = '[role="button"],[role="radio"],[role="switch"],[role="link"]';

// A row's own drawn part, such as a switch row's switch, is out of the tab order and is not a row of its own.
const notARow = ':disabled,[aria-disabled="true"],[tabindex="-1"]';

const menuRows = (menu: HTMLElement): HTMLElement[] =>
  [...menu.querySelectorAll<HTMLElement>(rowRoles)].filter(
    (row) => !row.matches(notARow) && !row.parentElement?.closest(rowRoles),
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
