import type * as React from 'react';
import { View } from 'react-native';
import { Icon, IconSpinner } from '../symbols/icon';
import { useWide } from '../use-wide';
import { cn } from '../utils';
import type { ListItemProps } from './field-props';

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

// An image sits centred in the icon's slot: 20 on wide rows, 24 on phone rows, or on a large row's 40 tile.
function LeadingSlot({
  size,
  children,
}: Pick<ListItemProps, 'size'> & {
  children: React.ReactNode;
}): React.JSX.Element {
  const wide = useWide();
  return (
    <View
      className={cn(
        'shrink-0 items-center justify-center',
        slotSize(size, wide),
      )}
    >
      {children}
    </View>
  );
}

function slotSize(size: ListItemProps['size'], wide: boolean): string {
  if (size === 'large') return 'size-10 rounded-xl bg-background';
  return wide ? 'size-5' : 'size-6';
}

function RowIcon({
  icon,
  className,
}: Required<Pick<ListItemProps, 'icon'>> & {
  className: string;
}): React.JSX.Element {
  const wide = useWide();
  return (
    <Icon
      name={icon}
      size={wide ? 'md' : 'lg'}
      className={cn('shrink-0', className)}
    />
  );
}

// Paper: a 16 spinner in the 20 icon slot on wide rows, a 20 spinner in the 24 slot on phone rows.
function RowSpinner(): React.JSX.Element {
  const wide = useWide();
  return (
    <View
      aria-hidden
      className={cn(
        'shrink-0 items-center justify-center',
        wide ? 'size-5' : 'size-6',
      )}
    >
      <IconSpinner
        size={wide ? 'sm' : 'md'}
        colorClassName="accent-foreground"
      />
    </View>
  );
}
