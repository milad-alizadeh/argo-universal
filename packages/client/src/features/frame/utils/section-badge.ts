import type { PluginBadge } from '@repo/contracts/plugins/runtime';
import type { BadgeCount } from '@repo/kit/badge-count';
import {
  isPluginSection,
  pluginSectionId,
  type Section,
} from '../../../lib/product/navigation/sections';
import { attentionBadge, sectionAttentionCount } from './attention-badge';

const pluginBadgeCount = (
  section: Section,
  badges: readonly PluginBadge[],
): number =>
  badges.find(({ pluginId, id }) => pluginSectionId(pluginId, id) === section)
    ?.count ?? 0;

// What a section's rail tile and drawer row count: the Sessions that need attention for Sessions, the nav item's own `argo.nav.badge` for a Plugin's, none for the rest.
export function sectionBadge(
  section: Section,
  attentionCount: number,
  pluginBadges: readonly PluginBadge[],
): BadgeCount {
  if (isPluginSection(section))
    return { count: pluginBadgeCount(section, pluginBadges) };

  return attentionBadge(sectionAttentionCount(section, attentionCount));
}
