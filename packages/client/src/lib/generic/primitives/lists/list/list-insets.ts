import type { ListProps } from './list-props';

type Insets = Pick<
  ListProps<never>,
  'padding' | 'paddingTop' | 'paddingBottom'
>;

type Options = Insets & Pick<ListProps<never>, 'appearance' | 'fit'>;

export function listInsets(props: Options): Insets {
  if (props.appearance !== 'grouped') return props;

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
