import type {
  Navigate,
  NavigationDestination,
} from '#lib/product/navigation/context';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import type { IconName } from '../../../../lib/generic/symbols/icon-names';

export interface SettingsListProps {
  // Undefined until the Server has answered: the row shows "…", or nothing while disconnected.
  projectCount?: number;
  agentCount?: number;
  selectedDestination?: NavigationDestination;
  onSelect: Navigate;
  projectsNeedAttention?: boolean;
  agentsNeedAttention?: boolean;
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
  destination: NavigationDestination;
  value?: string;
  needsAttention?: boolean;
  disabled?: boolean;
  status?: GroupedListItemProps['status'];
}
