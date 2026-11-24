import type { ReactNode } from 'react';
import type { DrawnIcon } from '../symbols/icon-symbol';

export interface SidebarAction {
  title: string;
  icon?: DrawnIcon;
  selected?: boolean;
  disabled?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  children?: readonly SidebarAction[];
}

export interface SidebarRow {
  id: string;
  title: string;
  icon?: DrawnIcon;
  subtitle?: string;
  value?: string;
  depth?: number;
  status?: {
    tone: 'success' | 'warning' | 'info' | 'danger' | 'muted';
    label: string;
  };
  progress?: { value: number; label?: string };
  emphasized?: boolean;
  selected?: boolean;
  onPress?: () => void;
  actions?: readonly SidebarAction[];
}

export interface SidebarSection {
  id: string;
  title?: string;
  footer?: string;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  actions?: readonly SidebarAction[];
  rows: readonly SidebarRow[];
}

export interface NativeSidebarListProps {
  sections: readonly SidebarSection[];
  empty?: ReactNode;
  onRefresh?: () => Promise<void>;
  onEndReached?: () => void;
}
