import type { RowBadge } from '@repo/kit/primitives/lists/list-item';
import type { IconName } from '@repo/kit/symbols/icon-names';
import type { Href } from 'expo-router';
import type { ThemeChoice } from '#features/settings';

// A page's path, one the router knows.
type SettingsHref = Extract<Href, string>;

export interface SettingsListViewProps {
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
  // This Device's theme, chosen in place from the Theme group's Appearance row.
  theme?: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
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
  status?: Omit<Extract<RowBadge, { kind: 'status' }>, 'kind'>;
}

// A titled group of pages.
export interface SettingsGroup {
  title: string;
  rows: SettingsRow[];
}
