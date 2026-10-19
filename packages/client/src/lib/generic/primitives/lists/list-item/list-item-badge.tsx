import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { CountBadge } from '#primitives/status/count-badge';
import { StatusDot } from '#primitives/status/status-dot';
import { useInSidebar } from '../../../row-drawing-context';
import type { ListItemProps, RowBadge } from './list-item-props';

// A Row badge at the top-end corner of the view it sits in, such as a row's leading icon or a header button.
export function ItemBadge({ badge }: Pick<ListItemProps, 'badge'>): ReactNode {
  if (badge === undefined) return null;

  return (
    <View className="absolute -right-1 -top-1">{renderRowBadge(badge)}</View>
  );
}

function renderRowBadge(
  badge: NonNullable<ListItemProps['badge']>,
): ReactElement {
  if (typeof badge === 'number') return <CountBadge badge={{ count: badge }} />;

  if (badge.kind === 'count')
    return <CountBadge badge={{ count: badge.count, label: badge.label }} />;

  return <RowStatus badge={badge} />;
}

function RowStatus({
  badge,
}: {
  badge: Extract<RowBadge, { kind: 'status' }>;
}): ReactElement {
  return (
    <View className="rounded-full bg-card p-0.5">
      <StatusDot
        tone={badge.tone}
        pulse={badge.pulse}
        accessibilityLabel={badge.label}
      />
    </View>
  );
}

export function hasBadge(badge: ListItemProps['badge']): boolean {
  return badge !== undefined && hasBadgeContent(badge);
}

function hasBadgeContent(badge: NonNullable<ListItemProps['badge']>): boolean {
  if (typeof badge === 'number') return badge > 0;

  return badge.kind !== 'count' || badge.count > 0;
}

// Paper's SettingsList: a sidebar row's status is a small dot after its value, not a badge on its icon.
export function sidebarStatus(badge: ListItemProps['badge']): ReactNode {
  if (typeof badge !== 'object' || badge.kind !== 'status') return undefined;

  return (
    <StatusDot
      size="sm"
      tone={badge.tone}
      pulse={badge.pulse}
      accessibilityLabel={badge.label}
    />
  );
}

// A sidebar row draws its status after its value, so its icon carries no badge.
export function useLeadingBadge(
  badge: ListItemProps['badge'],
): ListItemProps['badge'] {
  return useInSidebar() ? undefined : badge;
}
