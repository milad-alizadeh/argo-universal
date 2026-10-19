import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

type Options = Insets & Pick<ListProps<never>, 'appearance' | 'fit'>;

// Paper Combobox 9BM-0: a grouped list in a popover holds its menu rows 4px inside the popover.
const menuInset = 1;

export function listInsets(props: Options, menu: boolean): Insets {
  if (props.appearance !== 'grouped') return props;

  if (menu) return menuInsets(props);

  return { padding: horizontalInset(props), ...verticalInsets(props) };
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

const orMenuInset = (
  inset: Insets['padding'],
): NonNullable<Insets['padding']> => inset ?? menuInset;

function menuInsets(props: Options): Insets {
  return {
    padding: orMenuInset(props.padding),
    paddingTop: orMenuInset(props.paddingTop),
    paddingBottom: orMenuInset(props.paddingBottom),
  };
}
