// Badges show counts above this as "99+".
const maximumBadgeCount = 99;

// What a count badge draws; nothing when there is nothing to count.
export function badgeCountText(count: number | undefined): string | undefined {
  if (!count || count < 0) return undefined;

  return cappedCount(count);
}

function cappedCount(count: number): string {
  return count > maximumBadgeCount ? `${maximumBadgeCount}+` : String(count);
}

export interface CountBadge {
  // What the badge draws, such as "99+".
  text: string;
  // What a screen reader says for it; the count itself unless the caller names it.
  label: string;
}

// A row's count badge, or none when there is nothing to count.
export function countBadge(
  count: number | undefined,
  label: string | undefined,
): CountBadge | undefined {
  const text = badgeCountText(count);

  return text === undefined ? undefined : { text, label: label ?? text };
}
