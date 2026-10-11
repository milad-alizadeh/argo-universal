import type {
  Navigate,
  NavigationDestination,
} from '#lib/product/navigation/context';

export interface SettingsListProps {
  projects: readonly { name: string }[];
  agents: readonly { agent: string; label: string }[];
  selectedDestination?: NavigationDestination;
  onSelect: Navigate;
  serverName?: string;
  deviceName?: string;
  projectsNeedAttention?: boolean;
  agentsNeedAttention?: boolean;
  accountState?: string;
  connectionState?: string;
  deviceCount?: number;
  appearanceState?: string;
  notificationsState?: string;
  status?: 'ready' | 'loading' | 'disconnected';
}
