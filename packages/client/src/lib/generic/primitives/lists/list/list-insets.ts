import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

type Options = Insets & Pick<ListProps<never>, 'appearance' | 'fit'>;

// Paper's Configure popover (menu-surface.ts): a grouped list in a popover holds its rows 12px in from the sides, 4px from the top and bottom.
const menuInset = { sides: 3, ends: 1 } as const;

export function listInsets(props: Options, menu: boolean): Insets {
  if (props.appearance !== 'grouped') return plainInsets(props, menu);

  if (menu) return menuInsets(props);

  return { padding: horizontalInset(props), ...verticalInsets(props) };
}

// A plain list in a popover sits in its caller's inset, so it adds no scroll end gap below its last row.
function plainInsets(props: Options, menu: boolean): Insets {
  return menu ? { ...props, paddingBottom: props.paddingBottom ?? 0 } : props;
}

function horizontalInset(props: Options): Insets['padding'] {
  return props.padding ?? { compact: 4, wide: props.fit ? 1 : 0 };
}

function verticalInsets(props: Options): Omit<Insets, 'padding'> {
  return {
    paddingTop: props.paddingTop ?? { compact: 4, wide: 0 },
    paddingBottom: props.paddingBottom ?? { compact: 8, wide: 6 },
  };
}

const orInset = (
  inset: Insets['padding'],
  fallback: NonNullable<Insets['padding']>,
): NonNullable<Insets['padding']> => inset ?? fallback;

function menuInsets(props: Options): Insets {
  return {
    padding: orInset(props.padding, menuInset.sides),
    paddingTop: orInset(props.paddingTop, menuInset.ends),
    paddingBottom: orInset(props.paddingBottom, menuInset.ends),
  };
}
