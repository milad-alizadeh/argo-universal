import type { KitSchemaProps } from '@repo/contracts/kit-props';
import type { ListAppearance } from './list-context';
import type { SizeClassValue } from './use-size-class/size-class-value';

export type Inset = SizeClassValue<NonNullable<KitSchemaProps['Stack']['gap']>>;

// What a List holds around its rows unless its caller sets it.
export interface ListInsets {
  padding?: Inset;
  paddingTop?: Inset;
  paddingBottom?: Inset;
}

// A grouped row's text starts this far inside its card, in px: the one inset of headings, footers and the Android caption.
export const rowInset = 16;

// Cards stand 16 from a compact window's sides; a wide page's column insets them already.
export const cardSides = { compact: 4, wide: 0 } as const;

const menuInsets = { padding: 1, paddingTop: 1, paddingBottom: 1 } as const;

// A web grouped list's first heading sits 8 down.
const insetsByAppearance = {
  plain: {},
  cards: { padding: cardSides },
  grouped: { padding: cardSides, paddingTop: 2, paddingBottom: 4 },
} satisfies Record<ListAppearance, ListInsets>;

const phoneInsets = (fit?: boolean): ListInsets => ({
  padding: { compact: 4, wide: fit ? 1 : 0 },
  paddingTop: cardSides,
  paddingBottom: { compact: 8, wide: 6 },
});

export interface InsetCase {
  menu: boolean;
  phone: boolean;
  appearance: ListAppearance;
  fit?: boolean;
  // A Detail's content column pads what it holds, so the List adds nothing around its rows.
  padded?: boolean;
}

// Where the List sits decides on its own: a padded column holds nothing around the rows, a menu holds its own.
function placeInsets(state: InsetCase): ListInsets | undefined {
  if (state.padded) return {};

  return state.menu ? menuInsets : undefined;
}

export function insetsOf(state: InsetCase): ListInsets {
  return (
    placeInsets(state) ??
    (state.phone
      ? phoneInsets(state.fit)
      : insetsByAppearance[state.appearance])
  );
}

// How far a Screen heading over grouped cards moves in so it starts on their rows' text: only a narrow web window.
export const headingInsetOf = (webGrouped: boolean, wide: boolean): number =>
  webGrouped && !wide ? rowInset : 0;
