import { expect, waitFor, within } from 'storybook/test';
import { openRowMenu, type User } from './list-move-pointer.mocks';

// The picker's own title heads the places of a List without Sections.
export const untitledSection = 'Move to';

// Opens a row's menu, then its Move to… picker: a popover named Move to.
export async function openPicker(
  user: User,
  row: HTMLElement,
): Promise<HTMLElement> {
  const menu = await openRowMenu(user, row);

  await user.click(within(menu).getByRole('menuitem', { name: 'Move to…' }));

  const picker = await within(row.ownerDocument.body).findByRole('dialog', {
    name: 'Move to',
  });

  await waitFor(() => expect(picker).toBeVisible());

  return picker;
}

const textOf = (node: Node): string => node.textContent ?? '';

const isHeading = (node: Element): boolean =>
  node.getAttribute('role') === 'heading';

interface Place {
  section: string;
  node: HTMLElement;
}

// Each place the picker lists, with the Section heading it follows.
function placesOf(picker: HTMLElement): Place[] {
  let section = untitledSection;

  const nodes = picker.querySelectorAll<HTMLElement>(
    '[role="heading"],[role="button"]',
  );

  return [...nodes].flatMap((node) => {
    if (!isHeading(node)) return [{ section, node }];

    section = textOf(node);

    return [];
  });
}

// The picker's places by the Section heading they follow, each by its label.
export function pickerPlaces(picker: HTMLElement): Map<string, string[]> {
  const places = new Map<string, string[]>();

  for (const { section, node } of placesOf(picker))
    places.set(section, [...(places.get(section) ?? []), textOf(node)]);

  return places;
}

function placeIn(
  picker: HTMLElement,
  [section, label]: [string, string],
): HTMLElement {
  const found = placesOf(picker).find(
    (place) => place.section === section && textOf(place.node) === label,
  );

  if (!found) throw new Error(`No ${label} under ${section} in the picker.`);

  return found.node;
}

// Moves a row from its menu's Move to… picker, to the place `label` in `section`.
export async function moveVia(
  user: User,
  row: HTMLElement,
  place: [section: string, label: string],
): Promise<void> {
  const picker = await openPicker(user, row);

  await user.click(placeIn(picker, place));
}
