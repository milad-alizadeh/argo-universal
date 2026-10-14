import type * as React from 'react';
import { View } from 'react-native';
import { Icon, IconSlot, IconSpinner } from '#primitives/display/icon/icon';
import { cn } from '../../../utils';
import type { ListItemProps } from './list-item-props';

type LeadingProps = Pick<
  ListItemProps,
  'icon' | 'loading' | 'leading' | 'size'
> & {
  className: string;
};

// The row's icon or image, or a spinner in the icon's slot while the row loads.
export function ListItemLeading({
  loading,
  ...glyph
}: LeadingProps): React.JSX.Element | null {
  if (loading) return <RowSpinner />;

  return <RowGlyph {...glyph} />;
}

function RowGlyph({
  icon,
  leading,
  size,
  className,
}: Omit<LeadingProps, 'loading'>): React.JSX.Element | null {
  if (leading) return <LeadingSlot size={size}>{leading}</LeadingSlot>;

  return icon ? <RowIcon icon={icon} className={className} /> : null;
}

// An image sits centred in the row icon's slot, or on a large row's 40 tile.
function LeadingSlot({
  size,
  children,
}: Pick<ListItemProps, 'size'> & {
  children: React.ReactNode;
}): React.JSX.Element {
  if (size === 'large')
    return (
      <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-background">
        {children}
      </View>
    );

  return <IconSlot role="row">{children}</IconSlot>;
}

function RowIcon({
  icon,
  className,
}: Required<Pick<ListItemProps, 'icon'>> & {
  className: string;
}): React.JSX.Element {
  return <Icon name={icon} role="row" className={cn('shrink-0', className)} />;
}

// Paper: a Body-sized spinner in the row icon's slot.
function RowSpinner(): React.JSX.Element {
  return (
    <IconSlot role="row">
      <IconSpinner iconRole="body" colorClassName="accent-foreground" />
    </IconSlot>
  );
}
