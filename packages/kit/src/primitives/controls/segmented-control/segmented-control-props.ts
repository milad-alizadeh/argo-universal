import type { KitProps } from '../../kit-props';

type Derived = KitProps<'SegmentedControl'>;

export type SegmentOption = Derived['options'][number] & { detail?: string };

export type SegmentedControlProps = Omit<Derived, 'options'> & {
  options: readonly SegmentOption[];
};

export const segmentTitle = ({ label, detail }: SegmentOption): string =>
  detail ? `${label} · ${detail}` : label;
