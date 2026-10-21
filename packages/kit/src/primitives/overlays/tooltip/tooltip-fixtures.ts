import type { KitProps } from '../../kit-props';

export const linkTooltip = { label: 'Link' } satisfies Omit<
  KitProps<'Tooltip'>,
  'children'
>;
