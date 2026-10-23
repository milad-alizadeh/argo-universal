import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

// Paper's Configure popover (menu-surface.ts): a list in a popover holds its rows 4px in from every side.
const menuInset = { sides: 1, ends: 1 } as const;

export function listInsets(props: Insets, menu: boolean): Insets {
  return menu ? menuInsets(props) : props;
}

const orInset = (
  inset: Insets['padding'],
  fallback: NonNullable<Insets['padding']>,
): NonNullable<Insets['padding']> => inset ?? fallback;

function menuInsets(props: Insets): Insets {
  return {
    padding: orInset(props.padding, menuInset.sides),
    paddingTop: orInset(props.paddingTop, menuInset.ends),
    paddingBottom: orInset(props.paddingBottom, menuInset.ends),
  };
}
