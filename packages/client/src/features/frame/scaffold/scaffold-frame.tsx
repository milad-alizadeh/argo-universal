import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import { Sheet } from '#primitives/overlays/sheet';
import { FrameBackdrop } from '../components/frame-backdrop/frame-backdrop';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import { InspectorInSheet } from '../components/inspector-pane';
import { PaneBanner, WindowDragStrip } from './scaffold-chrome';
import { ScaffoldResizeHandles } from './scaffold-resize-handles';
import {
  type ScaffoldLayout,
  type ScaffoldPartProps,
  type ScaffoldProps,
  useScaffoldLayout,
} from './use-scaffold-layout';

export interface ScaffoldParts extends ScaffoldPartProps {
  // A wide window: the sidebar and the list sit beside the page.
  framed: boolean;
  // A compact or medium window's Inspector, open in a sheet over the window.
  inspectorSheetOpen: boolean;
}

// ADR-0026, amended 2026-10-18: only a wide window frames the page; compact and medium take the phone shell.
export const isFramed = (sizeClass: SizeClass): boolean => sizeClass === 'wide';

// Only a wide window has the Inspector's own column; elsewhere the Inspector is a sheet, so it takes no room beside the page.
const shownInspector = (props: ScaffoldProps): ScaffoldProps =>
  props.sizeClass === 'wide' ? props : { ...props, inspectorState: 'closed' };

const inspectorSheetOpen = (props: ScaffoldProps): boolean =>
  props.sizeClass !== 'wide' && props.inspectorState !== 'closed';

// The Scaffold's props as it applies them, with its layout: what its frame, sidebar and page are drawn from.
export function useScaffoldParts(props: ScaffoldProps): ScaffoldParts {
  const scaffold = shownInspector(props);

  return {
    scaffold,
    layout: useScaffoldLayout(scaffold),
    framed: isFramed(props.sizeClass),
    inspectorSheetOpen: inspectorSheetOpen(props),
  };
}

const sidebarWidth = ({ measures, shownListWidth }: ScaffoldLayout): number =>
  measures.inset * 2 + measures.railWidth + shownListWidth;

// The width of the sidebar and the list, for the permanent drawer that holds them.
export const scaffoldSidebarWidth = ({ layout }: ScaffoldParts): number =>
  sidebarWidth(layout);

export type PanePlacement = Omit<FramePaneProps, 'testID' | 'children'>;

const inspectorPlacement = ({ layout }: ScaffoldPartProps): PanePlacement => ({
  offset: layout.detailRight,
  width: layout.inspectorTargetWidth,
  hidden: !layout.inspectorOpen,
  ...layout.motion,
});

function InspectorColumn(parts: ScaffoldPartProps): React.JSX.Element {
  return (
    <FramePane testID="desktop-inspector" {...inspectorPlacement(parts)}>
      {parts.scaffold.inspector(parts.layout.inspectorExpanded)}
    </FramePane>
  );
}

const openInspector = (scaffold: ScaffoldProps, open: boolean): void =>
  scaffold.onInspectorStateChange(open ? 'open' : 'closed');

// The phone shell's Inspector: a sheet from the window's bottom edge, which the page's header button opens. Its one large detent is what iPadOS shows as a centred form sheet; a sheet sized to its content opens as a page sheet there.
function InspectorSheet(parts: ScaffoldParts): React.JSX.Element {
  const { scaffold } = parts;

  return (
    <Sheet
      open={parts.inspectorSheetOpen}
      onOpenChange={(open) => openInspector(scaffold, open)}
      label="Inspector"
      detents={['large']}
      bottomEdge
    >
      {inspectorPage(scaffold)}
    </Sheet>
  );
}

// An untitled root page, so a part of the Inspector can push its own pages over it; Sheet reads it from its direct children.
function inspectorPage(scaffold: ScaffoldProps): React.JSX.Element {
  return (
    <Sheet.Page name="inspector">
      <InspectorInSheet value>{scaffold.inspector(false)}</InspectorInSheet>
    </Sheet.Page>
  );
}

function Backdrop({ scaffold, layout }: ScaffoldPartProps): React.JSX.Element {
  return (
    <>
      <FrameBackdrop sidebarShown={scaffold.sidebarShown} {...layout.motion} />
      <WindowDragStrip />
    </>
  );
}

// The Inspector beside the page, the resize handles, and the banner over the panes.
function Overlays(parts: ScaffoldParts): React.JSX.Element {
  return (
    <>
      <InspectorColumn {...parts} />
      <ScaffoldResizeHandles {...parts} />
      <PaneBanner left={sidebarWidth(parts.layout)}>
        {parts.scaffold.banner}
      </PaneBanner>
    </>
  );
}

interface FrameEdges {
  before: ReactNode;
  after: ReactNode;
}

// What sits around the sidebar and the page: a framed window's backdrop, Inspector, handles and banner; the phone shell's Inspector sheet, as its pages place their own banner under their header.
const frameEdges = (parts: ScaffoldParts): FrameEdges =>
  parts.framed
    ? {
        before: <Backdrop {...parts} />,
        after: <Overlays {...parts} />,
      }
    : { before: null, after: <InspectorSheet {...parts} /> };

export type ScaffoldFrameProps = PropsWithChildren<{ parts: ScaffoldParts }>;

// A framed tablet's panes start under the status bar; the backdrop still runs behind it. The phone shell's pages keep their own header insets, and a desktop window has none.
function useFrameTop(framed: boolean): ViewStyle {
  const { top } = useSafeAreaInsets();

  return { paddingTop: framed ? top : 0 };
}

function FrameRow({ parts, children }: ScaffoldFrameProps): React.JSX.Element {
  const { before, after } = frameEdges(parts);

  return (
    <View
      // Named for the Size class it lays out, such as `wide-frame`.
      testID={`${parts.scaffold.sizeClass}-frame`}
      className="flex-1 flex-row overflow-hidden bg-content"
      style={useFrameTop(parts.framed)}
      onLayout={parts.layout.onLayout}
    >
      {before}
      <View className="min-w-0 flex-1">{children}</View>
      {after}
    </View>
  );
}

/*
 * The Scaffold's frame without its sidebar and page, for a navigator that draws them itself:
 * `ScaffoldSidebar` as its permanent drawer and `ScaffoldPage` around each page, each given the
 * same parts. The navigator, the children, keeps the same place in the tree at every Size class,
 * so its pages never remount.
 */
export function ScaffoldFrame(props: ScaffoldFrameProps): React.JSX.Element {
  return <FrameRow {...props} />;
}
