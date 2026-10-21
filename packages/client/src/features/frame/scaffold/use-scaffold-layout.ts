import { useState } from 'react';
import type { ReactNode } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import type { WindowBandContent } from '#lib/product/window-band';
import { type FrameMotion, frameTiming } from '../utils/frame-timing';
import {
  type InspectorState,
  type ScaffoldGeometry,
  type ScaffoldMeasures,
  scaffoldGeometry,
} from './scaffold-geometry';
import { useSidebarIntent, type SidebarIntent } from './use-sidebar-intent';

// What the Scaffold places: its Slots, and the sidebar's and the Inspector's state, which the caller holds.
export interface ScaffoldProps {
  band?: WindowBandContent | null;
  inspectorAvailable?: boolean;
  workbenchShown?: boolean;
  onWorkbenchShownChange?: (shown: boolean) => void;
  sizeClass: SizeClass;
  // The section picker beside the list on a wide window, such as the rail.
  sidebar: ReactNode;
  // The list's own part of the sidebar's header row.
  listHeader: ReactNode;
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

interface PreferredWidths {
  preferredListWidth: number;
  preferredInspectorWidth: number;
  setPreferredListWidth: (width: number) => void;
  setPreferredInspectorWidth: (width: number) => void;
}

interface WindowWidth {
  width: number;
  onLayout: (event: LayoutChangeEvent) => void;
}

export interface ScaffoldLayout
  extends ScaffoldGeometry, PreferredWidths, WindowWidth {
  measures: ScaffoldMeasures;
  safeTop: number;
  requestSidebar: SidebarIntent['requestSidebar'];
  motion: FrameMotion;
  setResizing: (resizing: boolean) => void;
}

export interface ScaffoldPartProps {
  scaffold: ScaffoldProps;
  layout: ScaffoldLayout;
}

function useCSSPixels(name: string): number {
  return Number.parseFloat(String(useCSSVariable(name)));
}

function useScaffoldMeasures(): ScaffoldMeasures {
  return {
    listWidth: useCSSPixels('--spacing-frame-list'),
    inspectorWidth: useCSSPixels('--spacing-frame-inspector'),
    railWidth: useCSSPixels('--spacing-frame-rail'),
    inset: useCSSPixels('--spacing-frame-inset'),
    barHeight: useCSSPixels('--spacing-frame-control'),
    topBandHeight: useCSSPixels('--spacing-frame-control'),
    workbenchWidth: useCSSPixels('--spacing-frame-list'),
    paneGap: useCSSPixels('--spacing-4'),
    composerWidth: useCSSPixels('--container-composer'),
    contentGutter: useCSSPixels('--spacing-6'),
    contentMaximum: useCSSPixels('--container-column'),
  };
}

function usePreferredWidths(measures: ScaffoldMeasures): PreferredWidths {
  const [preferredListWidth, setPreferredListWidth] = useState(
    measures.listWidth,
  );

  const [preferredInspectorWidth, setPreferredInspectorWidth] = useState(
    measures.inspectorWidth,
  );

  return {
    preferredListWidth,
    preferredInspectorWidth,
    setPreferredListWidth,
    setPreferredInspectorWidth,
  };
}

// The window's width until the Scaffold measures itself: a pane first laid out at 0 wide pins the Feed's list to that width.
function useWindowWidth(): WindowWidth {
  const [width, setWidth] = useState(useWindowDimensions().width);

  return {
    width,
    onLayout: ({ nativeEvent }) => setWidth(nativeEvent.layout.width),
  };
}

function useScaffoldWidths(): PreferredWidths & { measures: ScaffoldMeasures } {
  const measures = useScaffoldMeasures();

  return { measures, ...usePreferredWidths(measures) };
}

function useScaffoldSizing(
  scaffold: ScaffoldProps,
): ReturnType<typeof useScaffoldWidths> & SidebarIntent {
  return { ...useScaffoldWidths(), ...useSidebarIntent(scaffold) };
}

function useFrameMotion(
  { transitionKey }: ScaffoldGeometry,
  resizing: boolean,
): FrameMotion {
  return { transitionKey, animate: !resizing, timing: frameTiming };
}

export function useScaffoldLayout(scaffold: ScaffoldProps): ScaffoldLayout {
  const widths = useScaffoldSizing(scaffold);
  const windowWidth = useWindowWidth();
  const [resizing, setResizing] = useState(false);
  const geometry = geometryOf(scaffold, widths, windowWidth);

  return {
    ...geometry,
    safeTop: useSafeAreaInsets().top,
    ...widths,
    ...windowWidth,
    motion: useFrameMotion(geometry, resizing),
    setResizing,
  };
}

function geometryOf(
  scaffold: ScaffoldProps,
  widths: ReturnType<typeof useScaffoldSizing>,
  windowWidth: WindowWidth,
): ScaffoldGeometry {
  return scaffoldGeometry({
    ...scaffold,
    ...widths,
    ...windowWidth,
    framed: scaffold.sizeClass === 'wide',
    workbenchAvailable: Boolean(scaffold.band?.workbench),
  });
}
