import type { SizeClass } from '@repo/kit/use-size-class/size-class';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import type { WindowBandView } from '#lib/product/window-band';
import type { ContentRule } from '../../../lib/product/content-rule';
import { useContentRule } from '../../../lib/product/use-content-rule';
import { type FrameMotion, frameTiming } from '../utils/frame-timing';
import { type BandLeading, useBandLeading } from './band-leading';
import {
  type FrameLayout,
  type FrameMeasures,
  frameLayout,
  type InspectorState,
} from './frame-layout';
import { useSidebarIntent, type SidebarIntent } from './use-sidebar-intent';

// What the Scaffold places: its Slots, and the sidebar's and the Inspector's state, which the caller holds.
export interface ScaffoldProps {
  band?: WindowBandView | null;
  inspectorAvailable?: boolean;
  workbenchShown?: boolean;
  onWorkbenchShownChange?: (shown: boolean) => void;
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

// The wide window's Frame layout, with what the panes draw it with: the window's width, the measures and the setters a divider or toggle calls.
export interface ScaffoldLayout extends FrameLayout, WindowWidth {
  measures: FrameMeasures;
  bandLeading: BandLeading;
  safeTop: number;
  setPreferredListWidth: PreferredWidths['setPreferredListWidth'];
  setPreferredInspectorWidth: PreferredWidths['setPreferredInspectorWidth'];
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

const contentMeasures = ({
  gutter,
  maximum,
}: ContentRule): Pick<FrameMeasures, 'contentGutter' | 'contentMaximum'> => ({
  contentGutter: gutter,
  contentMaximum: maximum,
});

function useFrameMeasures(bandLeading: BandLeading): FrameMeasures {
  return {
    listWidth: useCSSPixels('--spacing-frame-list'),
    inspectorWidth: useCSSPixels('--spacing-frame-inspector'),
    railWidth: useCSSPixels('--spacing-frame-rail'),
    inset: useCSSPixels('--spacing-frame-inset'),
    bandHeight: useCSSPixels('--spacing-frame-control'),
    bandLeading: bandLeading.width,
    workbenchWidth: useCSSPixels('--spacing-frame-list'),
    paneGap: useCSSPixels('--spacing-4'),
    composerWidth: useCSSPixels('--container-composer'),
    ...contentMeasures(useContentRule()),
  };
}

function usePreferredWidths(measures: FrameMeasures): PreferredWidths {
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

interface ScaffoldSizing extends PreferredWidths, SidebarIntent {
  measures: FrameMeasures;
  bandLeading: BandLeading;
}

function useScaffoldSizing(scaffold: ScaffoldProps): ScaffoldSizing {
  const bandLeading = useBandLeading();
  const measures = useFrameMeasures(bandLeading);

  return {
    bandLeading,
    measures,
    ...usePreferredWidths(measures),
    ...useSidebarIntent(scaffold),
  };
}

// The phone shell draws no Frame, so only a change of the sidebar's state moves its page.
const transitionKey = (scaffold: ScaffoldProps, layout: FrameLayout): string =>
  scaffold.sizeClass === 'wide'
    ? layout.transitionKey
    : `${scaffold.sidebarShown}`;

const layoutOf = (
  scaffold: ScaffoldProps,
  sizing: ScaffoldSizing,
  width: number,
): FrameLayout =>
  frameLayout({
    ...scaffold,
    ...sizing,
    width,
    workbenchAvailable: Boolean(scaffold.band?.workbench),
  });

export function useScaffoldLayout(scaffold: ScaffoldProps): ScaffoldLayout {
  const sizing = useScaffoldSizing(scaffold);
  const windowWidth = useWindowWidth();
  const [resizing, setResizing] = useState(false);
  const layout = layoutOf(scaffold, sizing, windowWidth.width);
  const key = transitionKey(scaffold, layout);

  return {
    ...sizing,
    ...layout,
    ...windowWidth,
    safeTop: useSafeAreaInsets().top,
    motion: { transitionKey: key, animate: !resizing, timing: frameTiming },
    setResizing,
  };
}
