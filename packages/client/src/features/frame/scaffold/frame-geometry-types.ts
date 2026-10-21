import type { PaneSpan } from '../utils/pane-shift';

export interface FrameGeometry {
  panesTop: number;
  thresholds: { listFold: number; workbenchUndock: number };
  listFolded: boolean;
  sidebarAvailable: boolean;
  workbenchDocked: boolean;
  workbenchState: 'docked' | 'auto-hidden' | 'floating' | 'hidden';
  page: PaneSpan;
  rail: PaneSpan;
  list: PaneSpan;
  content: PaneSpan;
  workbench: PaneSpan;
  stage: PaneSpan;
}
