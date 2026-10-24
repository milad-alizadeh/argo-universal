import { countBadge } from '../../../badge-count';
import type { DeclaredSubmenu } from './action-declarations';

type Badge = NonNullable<DeclaredSubmenu['badge']>;

/*
 * What a native header badge shows: a count's text, an empty string for a status dot, and nothing for no badge or a
 * zero count. Stock badges draw no tone.
 */
export function submenuBadgeText(badge?: Badge): string | undefined {
  return badge && badgeText(badge);
}

function badgeText(badge: Badge): string | undefined {
  if (badge.kind !== 'count') return '';

  return countBadge(badge)?.text;
}

// A count badge's text, which a submenu folded into the overflow menu shows after its label; a status dot shows none there.
export function submenuCountText(badge?: Badge): string | undefined {
  return countBadge(counted(badge))?.text;
}

const counted = (
  badge?: Badge,
): Extract<Badge, { kind: 'count' }> | undefined =>
  badge?.kind === 'count' ? badge : undefined;

// The submenu's spoken name, its badge after the label, as Android's stock toolbar badge reads it.
export function submenuLabel({
  label,
  badge,
}: Pick<DeclaredSubmenu, 'label' | 'badge'>): string {
  const spoken = badge && badgeSpoken(badge);

  return spoken ? `${label}, ${spoken}` : label;
}

function badgeSpoken(badge: Badge): string | undefined {
  if (badge.kind === 'count') return countBadge(badge)?.label;

  return badge.label;
}
