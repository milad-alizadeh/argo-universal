import type { PaneSpan } from '../utils/pane-shift';

export interface FrameGeometry {
  panesTop: number;
  thresholds: { listFold: number; workbenchUndock: number };
  listFolded: boolean;
  workbenchDocked: boolean;
  rail: PaneSpan;
  list: PaneSpan;
  content: PaneSpan;
  workbench: PaneSpan;
  stage: PaneSpan;
}
