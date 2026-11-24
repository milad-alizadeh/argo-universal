import { createContext, type ReactNode } from 'react';
import type { SidebarAction } from './model';

export interface SidebarHeaderProps {
  actions?: readonly SidebarAction[];
  search?: { query: string; label: string; onChange: (query: string) => void };
}

export const NativeSidebarHeader = createContext<
  ((props: SidebarHeaderProps) => ReactNode) | null
>(null);

export const NativePluginSidebar = createContext(false);

export { NativeSidebarList } from './native-sidebar-list';

export type {
  NativeSidebarListProps,
  SidebarAction,
  SidebarRow,
  SidebarSection,
} from './model';

export { sidebarSystemImage } from './system-image';
