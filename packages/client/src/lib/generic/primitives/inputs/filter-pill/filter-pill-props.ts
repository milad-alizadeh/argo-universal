import type { KitProps } from '../../kit-props';

export type FilterPillProps = KitProps<'FilterPill'>;

type PillText = Pick<FilterPillProps, 'label' | 'count'>;

const pillParts = (props: PillText): string[] =>
  props.count === undefined
    ? [props.label]
    : [props.label, String(props.count)];

// What the pill draws: the label, then its count.
export const filterPillLabel = (props: PillText): string =>
  pillParts(props).join(' ');

// What a screen reader says, with a pause before the count.
export const filterPillSpokenLabel = (props: PillText): string =>
  pillParts(props).join(', ');
