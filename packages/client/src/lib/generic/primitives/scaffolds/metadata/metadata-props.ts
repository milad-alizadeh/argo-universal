import type { ReactNode } from 'react';
import type { PillProps } from '#primitives/status/pill';
import type { KitProps } from '../../kit-props';

export type MetadataProps = KitProps<'Metadata'>;

export type MetadataLabelProps = KitProps<'Metadata.Label'>;

export type MetadataLinkProps = KitProps<'Metadata.Link'>;

export type MetadataPillsProps = KitProps<'Metadata.Pills'>;

export type MetadataStatusDotProps = KitProps<'Metadata.StatusDot'>;

export type MetadataAvatarProps = KitProps<'Metadata.Avatar'>;

export type PillValuesProps = { pills: PillProps[] };

export type MetadataRowProps = Pick<
  MetadataLabelProps,
  'title' | 'accessibilityLabel'
> & {
  label: string;
  children: ReactNode;
};

export const spokenField = (props: MetadataRowProps): string =>
  props.accessibilityLabel ?? `${props.title}, ${props.label}`;
