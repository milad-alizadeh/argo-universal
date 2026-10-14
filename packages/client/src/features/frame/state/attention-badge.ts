import { badgeCountText } from '#primitives/display/badge';
import type { Section } from '../../../lib/product/navigation/sections';

export interface AttentionBadge {
  // What a screen reader says for the badge.
  label: string;
  // What the badge draws.
  text: string;
}

function badgeLabel(attentionCount: number): string {
  const sessions = attentionCount === 1 ? 'Session needs' : 'Sessions need';

  return `${attentionCount} ${sessions} attention`;
}

// The Sessions-section badge for the Sessions that need input or are Unread; none when no Session does.
export function attentionBadge(attentionCount: number): AttentionBadge | null {
  const text = badgeCountText(attentionCount);

  if (text === undefined) return null;

  return { label: badgeLabel(attentionCount), text };
}

// Only the Sessions section counts attention; every other section shows none.
export function sectionAttentionCount(
  section: Section,
  attentionCount: number,
): number {
  return section === 'sessions' ? attentionCount : 0;
}
