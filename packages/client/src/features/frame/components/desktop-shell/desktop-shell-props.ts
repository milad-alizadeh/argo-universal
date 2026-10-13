import type { ReactNode } from 'react';
import type { Section } from '../../../../lib/product/navigation/sections';

export type InspectorState = 'closed' | 'open' | 'expanded';

export interface DesktopShellProps {
  selectedSection: Section;
  attentionCount: number;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  onSectionChange: (section: Section) => void;
  listHeader: ReactNode;
  list: ReactNode;
  // The detail page, which draws its own header.
  children: ReactNode;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
  // The Inspector pane's page, told whether the Inspector fills the detail area, which the shell decides from the window's width.
  inspector: (expanded: boolean) => ReactNode;
}
