import type { BadgeCount } from '../../../badge-count';

export interface CountBadgeProps {
  // Nothing draws at zero or without a count.
  badge?: BadgeCount;
  tone?: 'danger' | 'success' | 'muted';
}
