import type { CountBadgeProps } from './count-badge-props';

export const countCountBadge = {
  badge: { count: 3, label: '3 items need attention' },
} satisfies CountBadgeProps;

export const runningCountBadge = {
  badge: { count: 3 },
  tone: 'success',
} satisfies CountBadgeProps;

export const finishedCountBadge = {
  badge: { count: 3 },
  tone: 'muted',
} satisfies CountBadgeProps;

export const over99CountBadge = {
  badge: { count: 120 },
} satisfies CountBadgeProps;
