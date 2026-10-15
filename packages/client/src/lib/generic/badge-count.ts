// Badges show counts above this as "99+".
const maximumBadgeCount = 99;

// A count a row or tile shows as a badge.
export interface BadgeCount {
  count: number;
  // What a screen reader says for it, such as "3 Sessions need attention"; the count when absent.
  label?: string;
}

export interface CountBadge {
  // What the badge draws, such as "99+".
  text: string;
  label: string;
}

const cappedCount = (count: number): string =>
  count > maximumBadgeCount ? `${maximumBadgeCount}+` : String(count);

const counts = (badge: BadgeCount | undefined): badge is BadgeCount =>
  (badge?.count ?? 0) > 0;

const spoken = (badge: BadgeCount, text: string): string => badge.label ?? text;

// What a count badge draws and says; nothing when there is nothing to count.
export function countBadge(
  badge: BadgeCount | undefined,
): CountBadge | undefined {
  if (!counts(badge)) return undefined;

  const text = cappedCount(badge.count);

  return { text, label: spoken(badge, text) };
}
