import { expect, waitFor, within, type userEvent } from 'storybook/test';

// A story's own user: one pointer, so a press in one call is released by the next.
export type User = ReturnType<typeof userEvent.setup>;

export interface Point {
  x: number;
  y: number;
}

// Where the pointer goes: a drag aims by where it is, so the stories drive it to points on the screen.
export const centre = (element: Element): Point => {
  const box = element.getBoundingClientRect();

  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
};

// Just inside an element's top, so a row dragged there lands before it.
export const topOf = (element: Element): Point => {
  const box = element.getBoundingClientRect();

  return { x: box.left + 20, y: box.top + 4 };
};

export const coords = ({
  x,
  y,
}: Point): Pick<MouseEventInit, 'clientX' | 'clientY'> => ({
  clientX: x,
  clientY: y,
});

export const rowNamed = (within_: HTMLElement, title: string): HTMLElement =>
  within(within_).getByRole('button', { name: title });

// A lane on a wide board: a group named after its Section.
export const laneNamed = (
  canvasElement: HTMLElement,
  title: string,
): HTMLElement => within(canvasElement).getByRole('group', { name: title });

export async function openRowMenu(
  user: User,
  row: HTMLElement,
): Promise<HTMLElement> {
  await user.pointer({ target: row, keys: '[MouseRight]' });

  const menu = await within(row.ownerDocument.body).findByRole('menu');

  // The menu fades in, so its items show once it has opened.
  await waitFor(() =>
    expect(within(menu).getAllByRole('menuitem')[0]).toBeVisible(),
  );

  return menu;
}

// The glyphs of a shortcut a menu item shows after its label, such as ⌥↓; no label holds one.
const shortcut = /[⌃⌥⇧⌘↑↓←→]/gu;

// A menu's items by label, without the shortcuts they show.
export const itemNames = (menu: HTMLElement): string[] =>
  within(menu)
    .getAllByRole('menuitem')
    .map((item) => (item.textContent ?? '').replace(shortcut, ''));

// Presses a row and moves past the mouse's slop, then waits for the lifted copy to draw beside it.
async function lift(user: User, row: HTMLElement): Promise<void> {
  const from = centre(row);

  await user.pointer([
    { target: row, coords: coords(from), keys: '[MouseLeft>]' },
    { target: row, coords: coords({ x: from.x, y: from.y + 12 }) },
  ]);

  await waitFor(() =>
    expect(
      within(row.ownerDocument.body).getAllByText(row.textContent ?? ''),
    ).toHaveLength(2),
  );
}

// Takes a row, drags it past the mouse's slop, holds it over `to`, and drops it there.
export async function dragTo(
  user: User,
  row: HTMLElement,
  to: Point,
): Promise<void> {
  await lift(user, row);
  await user.pointer({ target: row, coords: coords(to) });
  await user.pointer({ target: row, keys: '[/MouseLeft]' });
}
