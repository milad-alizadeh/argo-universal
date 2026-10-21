import type { BadgeCount } from '@repo/kit/badge-count';
import type { Section } from '../../../lib/product/navigation/sections';

function badgeLabel(attentionCount: number): string {
  const sessions = attentionCount === 1 ? 'Session needs' : 'Sessions need';

  return `${attentionCount} ${sessions} attention`;
}

// The Sessions-section badge for the Sessions that need input or are Unread.
export function attentionBadge(attentionCount: number): BadgeCount {
  return { count: attentionCount, label: badgeLabel(attentionCount) };
}

// Only the Sessions section counts attention; every other section shows none.
export function sectionAttentionCount(
  section: Section,
  attentionCount: number,
): number {
  return section === 'sessions' ? attentionCount : 0;
}
