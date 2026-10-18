import type * as React from 'react';
import { View } from 'react-native';
import { Icon, IconSlot, IconSpinner } from '#primitives/display/icon';
import { useOverlayList } from '#primitives/fields/field-layout';
import type { IconRole } from '../../../symbols/icon-role';
import { cn } from '../../../utils';
import type { ResolvedItemProps } from './grouped-list-item-props';

type LeadingProps = Pick<
  ResolvedItemProps,
  'icon' | 'loading' | 'leading' | 'leadingLayout' | 'size' | 'variant'
> & {
  className: string;
};

// The row's icon or image, or a spinner in the icon's slot while the row loads.
export function GroupedListItemLeading({
  loading,
  ...glyph
}: LeadingProps): React.JSX.Element | null {
  if (loading) return <RowSpinner />;

  return <RowGlyph {...glyph} />;
}

function RowGlyph(
  props: Omit<LeadingProps, 'loading'>,
): React.JSX.Element | null {
  if (props.leading)
    return <LeadingSlot {...props}>{props.leading}</LeadingSlot>;

  return props.icon ? (
    <RowIcon icon={props.icon} className={props.className} />
  ) : null;
}

// An image sits centred in the row icon's slot, or on a large row's 40 tile.
type LeadingSlotProps = Pick<
  ResolvedItemProps,
  'size' | 'variant' | 'leadingLayout'
> & {
  children: React.ReactElement;
};

function LeadingSlot({
  size,
  variant,
  children,
  leadingLayout,
}: LeadingSlotProps): React.JSX.Element {
  const role = useLeadingRole();

  if (leadingLayout === 'content') return children;

  if (size === 'lg') return <LargeLeading>{children}</LargeLeading>;

  return <IconSlot {...leadingSlotProps(variant, role)}>{children}</IconSlot>;
}

const leadingSlotProps = (
  variant: ResolvedItemProps['variant'],
  role: IconRole,
): Pick<React.ComponentProps<typeof IconSlot>, 'role' | 'className'> => ({
  role: variant === 'card' ? 'identity' : role,
  className:
    variant === 'card' ? 'relative web:top-px wide:-top-0.5' : undefined,
});

// A popover's compact row leads with a Body-sized slot, as Paper's menu rows do; a list row keeps the row icon's.
function useLeadingRole(): IconRole {
  return useOverlayList() ? 'body' : 'row';
}

function RowIcon({
  icon,
  className,
}: Required<Pick<ResolvedItemProps, 'icon'>> & {
  className: string;
}): React.JSX.Element {
  return (
    <Icon
      name={icon}
      role={useLeadingRole()}
      className={cn('shrink-0', className)}
    />
  );
}

// Paper: a Body-sized spinner in the row icon's slot.
function RowSpinner(): React.JSX.Element {
  return (
    <IconSlot role={useLeadingRole()}>
      <IconSpinner iconRole="body" colorClassName="accent-foreground" />
    </IconSlot>
  );
}

function LargeLeading({
  children,
}: {
  children: React.ReactElement;
}): React.JSX.Element {
  return (
    <View className="size-10 shrink-0 items-center justify-center rounded-xl bg-card">
      {children}
    </View>
  );
}
