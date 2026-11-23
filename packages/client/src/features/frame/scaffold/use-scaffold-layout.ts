import { useState } from 'react';
import { type LayoutChangeEvent, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { bandWorkbench } from '#lib/product/window-band';
import type { ContentRule } from '../../../lib/product/content-rule';
import { useContentRule } from '../../../lib/product/use-content-rule';
import type { FrameMotion } from '../utils/frame-timing';
import { type BandLeading, useBandLeading } from './band-leading';
import {
  type FrameLayout,
  type FrameMeasures,
  frameLayout,
} from './frame-layout';
import type { ScaffoldProps } from './scaffold-props';
import {
  type PreferredWidths,
  usePreferredWidths,
} from './use-preferred-widths';
import { useScaffoldMotion } from './use-scaffold-motion';
import { useSidebarIntent, type SidebarIntent } from './use-sidebar-intent';
import {
  useWorkbenchPopover,
  type WorkbenchPopover,
} from './use-workbench-popover';

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
  setInspectorWidth: PreferredWidths['setInspectorWidth'];
  requestSidebar: SidebarIntent['requestSidebar'];
  setWorkbenchPopover: WorkbenchPopover['setWorkbenchPopover'];
  motion: FrameMotion;
  setResizing: (resizing: boolean) => void;
}

export interface ScaffoldPartProps {
  scaffold: ScaffoldProps;
  layout: ScaffoldLayout;
}

// What a part reads of the props and the layout, by field, so it takes no more than it uses.
export interface PartReads<
  Scaffold extends keyof ScaffoldProps,
  Layout extends keyof ScaffoldLayout,
> {
  scaffold: Pick<ScaffoldProps, Scaffold>;
  layout: Pick<ScaffoldLayout, Layout>;
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

function useFrameMeasures(): FrameMeasures {
  return {
    listWidth: useCSSPixels('--spacing-frame-list'),
    inspectorWidth: useCSSPixels('--spacing-frame-inspector'),
    railWidth: useCSSPixels('--spacing-frame-rail'),
    inset: useCSSPixels('--spacing-frame-inset'),
    titleBarHeight: useCSSPixels('--spacing-frame-title-bar'),
    workbenchWidth: useCSSPixels('--spacing-frame-list'),
    paneGap: useCSSPixels('--spacing-4'),
    composerWidth: useCSSPixels('--container-composer'),
    ...contentMeasures(useContentRule()),
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

interface ScaffoldSizing
  extends PreferredWidths, SidebarIntent, WorkbenchPopover {
  measures: FrameMeasures;
  bandLeading: BandLeading;
}

function useScaffoldSizing(scaffold: ScaffoldProps): ScaffoldSizing {
  const bandLeading = useBandLeading();
  const measures = useFrameMeasures();

  return {
    bandLeading,
    measures,
    ...usePreferredWidths(measures, scaffold),
    ...useSidebarIntent(scaffold),
    ...useWorkbenchPopover(scaffold),
  };
}

const layoutOf = (
  scaffold: ScaffoldProps,
  sizing: ScaffoldSizing,
  width: number,
): FrameLayout =>
  frameLayout({
    ...scaffold,
    ...sizing,
    width,
    workbenchAvailable: Boolean(bandWorkbench(scaffold.band)),
    listless: !scaffold.list,
  });

export function useScaffoldLayout(scaffold: ScaffoldProps): ScaffoldLayout {
  const sizing = useScaffoldSizing(scaffold);
  const windowWidth = useWindowWidth();
  const layout = layoutOf(scaffold, sizing, windowWidth.width);

  // A page that holds the Workbench closes the popover, so a narrower one later starts with it closed, as Codex's does.
  if (sizing.workbenchPopover && layout.workbench.fits)
    sizing.setWorkbenchPopover(false);

  return {
    ...sizing,
    ...layout,
    ...windowWidth,
    safeTop: useSafeAreaInsets().top,
    ...useScaffoldMotion(scaffold, layout),
  };
}
