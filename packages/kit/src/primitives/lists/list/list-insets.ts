import { isNativeGrouped, isWebGrouped } from '../../../list-grouped';
import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

type Options = Insets & Pick<ListProps<never>, 'appearance' | 'fit'>;

// Paper's Configure popover (menu-surface.ts): a list in a popover holds its rows 4px in from every side.
const menuInset = { sides: 1, ends: 1 } as const;

export function listInsets(props: Options, menu: boolean): Insets {
  if (menu) return menuInsets(props);

  return appearanceInsets(props);
}

function appearanceInsets(props: Options): Insets {
  if (isNativeGrouped(props.appearance)) return phoneInsets(props);

  return isWebGrouped(props.appearance) ? groupedInsets(props) : props;
}

// A phone's grouped List of ListItems holds its cards 16 from the sides, as it did before FieldGroup.
function phoneInsets(props: Options): Insets {
  return {
    padding: orInset(props.padding, { compact: 4, wide: props.fit ? 1 : 0 }),
    paddingTop: orInset(props.paddingTop, { compact: 4, wide: 0 }),
    paddingBottom: orInset(props.paddingBottom, { compact: 8, wide: 6 }),
  };
}

/*
 * A web grouped list holds its cards 16 from a narrow window's sides, and on a wide page its cards' edges start on the
 * title's line, as a FieldGroup's do; its first heading sits 8 down.
 */
const groupedInset = {
  sides: { compact: 4, wide: 0 },
  top: 2,
  bottom: 4,
} as const;

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
