import type { Href } from 'expo-router';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import type { IconName } from '../../../../lib/generic/symbols/icon-names';

// A page's path, one the router knows.
export type SettingsHref = Extract<Href, string>;

export interface SettingsListProps {
  // Undefined until the Server has answered: the row shows "…", or nothing while disconnected.
  projectCount?: number;
  agentCount?: number;
  pluginCount?: number;
  // The path of the page shown; a page's own pages keep its row selected.
  selectedPath?: string;
  // Opens a page by its path.
  onSelect: (href: SettingsHref) => void;
  projectsNeedAttention?: boolean;
  accountState?: string;
  connectionState?: string;
  deviceCount?: number;
  appearanceState?: string;
  notificationsState?: string;
  status?: 'ready' | 'loading' | 'disconnected';
  // The sidebar's search: only pages whose title matches show.
  query?: string;
}

export interface SettingsRow {
  label: string;
  icon: IconName;
  // The page's path.
  href: SettingsHref;
  value?: string;
  needsAttention?: boolean;
  disabled?: boolean;
  status?: GroupedListItemProps['status'];
}
