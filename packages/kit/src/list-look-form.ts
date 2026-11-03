import type { ListAppearance } from './list-context';
import type { FormLook, ListLookInput } from './list-look-parts';
import type { Drawing, PhoneDrawing } from './list-look-platform';
import { listPlaceFacts } from './list-place';

export const phoneOf = (drawing: Drawing): PhoneDrawing | undefined =>
  drawing === 'web' ? undefined : drawing;

// A phone draws what the phones declare; the web its own appearance.
export const phoneAppearanceOf = (input: ListLookInput): ListAppearance =>
  input.onPhones?.appearance ?? input.appearance;

const declaredAppearanceOf = (
  drawing: Drawing,
  input: ListLookInput,
): ListAppearance =>
  drawing === 'web' ? input.appearance : phoneAppearanceOf(input);

// A Card's body is the card already, so its List draws plain rows whatever it declares: never a card in the card.
export const appearanceOf = (
  drawing: Drawing,
  input: ListLookInput,
): ListAppearance =>
  listPlaceFacts(input.place).card
    ? 'plain'
    : declaredAppearanceOf(drawing, input);

export function groupedFacts(
  drawing: Drawing,
  appearance: ListAppearance,
): Pick<FormLook, 'webGrouped' | 'phone'> {
  const grouped = appearance === 'grouped';

  return {
    webGrouped: grouped && drawing === 'web',
    phone: grouped ? phoneOf(drawing) : undefined,
  };
}

// Cards stand apart, and a card's rows sit on one card: neither draws hairlines between its rows.
const unseparated = (appearance: ListAppearance, card: boolean): boolean =>
  card || appearance === 'cards';

// Only iOS separates rows and closes a group with a row description.
export const separationFacts = (
  drawing: Drawing,
  appearance: ListAppearance,
  card = false,
): Pick<FormLook, 'separated' | 'footerEndsGroup'> => ({
  separated: drawing === 'ios' && !unseparated(appearance, card),
  footerEndsGroup: drawing === 'ios',
});

export function formLook(drawing: Drawing, input: ListLookInput): FormLook {
  const appearance = appearanceOf(drawing, input);
  const { card } = listPlaceFacts(input.place);

  return {
    appearance,
    ...groupedFacts(drawing, appearance),
    ...separationFacts(drawing, appearance, card),
  };
}
