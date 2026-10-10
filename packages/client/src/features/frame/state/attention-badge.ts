// Badges show counts above this as "99+".
const maximumAttentionBadgeCount = 99;

export interface AttentionBadge {
  // What a screen reader says for the badge.
  label: string;
  // What the badge draws.
  text: string;
}

function badgeText(attentionCount: number): string {
  return attentionCount > maximumAttentionBadgeCount
    ? `${maximumAttentionBadgeCount}+`
    : String(attentionCount);
}

function badgeLabel(attentionCount: number): string {
  const sessions = attentionCount === 1 ? 'Session needs' : 'Sessions need';
  return `${attentionCount} ${sessions} attention`;
}

// The Sessions-section badge for the Sessions that need input or are Unread; none when no Session does.
export function attentionBadge(attentionCount: number): AttentionBadge | null {
  if (attentionCount <= 0) return null;
  return {
    label: badgeLabel(attentionCount),
    text: badgeText(attentionCount),
  };
}
