// Badges show counts above this as "99+".
const maximumBadgeCount = 99;

// What a count badge draws; nothing when there is nothing to count.
export function badgeCountText(count: number | undefined): string | undefined {
  if (count === undefined || count <= 0) return undefined;

  return cappedCount(count);
}

function cappedCount(count: number): string {
  return count > maximumBadgeCount ? `${maximumBadgeCount}+` : String(count);
}
