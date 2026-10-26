import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import type { ReactNode } from 'react';
import type { WindowBandView } from '#lib/product/window-band';
import type { InspectorState, WorkbenchIntent } from './frame-layout';

// What the Scaffold places: its Slots, and the sidebar's and the Inspector's state, which the caller holds.
export interface ScaffoldProps {
  band?: WindowBandView | null;
  inspectorAvailable: boolean;
  workbenchIntent: WorkbenchIntent;
  onWorkbenchIntentChange: (intent: WorkbenchIntent) => void;
  sizeClass: SizeClass;
  // The section picker beside the list on a wide window, such as the rail.
  sidebar: ReactNode;
  // Under the window's band, drawn under its own Screen's heading.
  list: ReactNode;
  // The page beside the list, which draws its own header; a compact or medium window shows it over the list.
  page?: ReactNode;
  // The Inspector's page, told whether it fills the page's area, which the Scaffold decides from the window's width.
  inspector: (expanded: boolean) => ReactNode;
  // Floats over the top of the page, so the page under it never moves.
  banner?: ReactNode;
  sidebarShown: boolean;
  onSidebarShownChange: (shown: boolean) => void;
  inspectorState: InspectorState;
  onInspectorStateChange: (state: InspectorState) => void;
}
