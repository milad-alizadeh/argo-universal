import { isWebGrouped } from '../../../list-grouped';
import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

type Options = Insets & Pick<ListProps<never>, 'appearance'>;

// Paper's Configure popover (menu-surface.ts): a list in a popover holds its rows 4px in from every side.
const menuInset = { sides: 1, ends: 1 } as const;

export function listInsets(props: Options, menu: boolean): Insets {
  if (menu) return menuInsets(props);

  return isWebGrouped(props.appearance) ? groupedInsets(props) : props;
}

// A web grouped list holds its cards 16 from the sides, as a FieldGroup does on a page, and its first heading 8 down.
const groupedInset = { sides: 4, top: 2, bottom: 4 } as const;

const orInset = (
  inset: Insets['padding'],
  fallback: NonNullable<Insets['padding']>,
): NonNullable<Insets['padding']> => inset ?? fallback;

function groupedInsets(props: Options): Insets {
  return {
    padding: orInset(props.padding, groupedInset.sides),
    paddingTop: orInset(props.paddingTop, groupedInset.top),
    paddingBottom: orInset(props.paddingBottom, groupedInset.bottom),
  };
}

function menuInsets(props: Options): Insets {
  return {
    padding: orInset(props.padding, menuInset.sides),
    paddingTop: orInset(props.paddingTop, menuInset.ends),
    paddingBottom: orInset(props.paddingBottom, menuInset.ends),
  };
}
