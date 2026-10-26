import type { KitProps } from '../../kit-props';

export type CardProps = KitProps<'Card'>;

export type CollapsibleCardProps = Extract<CardProps, { collapsible: true }>;
