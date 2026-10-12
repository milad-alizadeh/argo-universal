import type {
  Navigate,
  NavigationDestination,
} from '#lib/product/navigation/context';

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
