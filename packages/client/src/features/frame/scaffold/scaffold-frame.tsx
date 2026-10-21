import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import { InspectorControlsContext } from '#primitives/scaffolds/inspector';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import { ScaffoldBand } from './scaffold-band';
import { PaneBanner } from './scaffold-chrome';
import { ScaffoldResizeHandles } from './scaffold-resize-handles';
import { ScaffoldWorkbench } from './scaffold-workbench';
import {
  type ScaffoldLayout,
  type ScaffoldPartProps,
  type ScaffoldProps,
  useScaffoldLayout,
} from './use-scaffold-layout';

export interface ScaffoldParts extends ScaffoldPartProps {
  // A wide window: the sidebar and the list sit beside the page.
  framed: boolean;
}

// ADR-0026, amended 2026-10-18: only a wide window frames the page; compact and medium take the phone shell.
export const isFramed = (sizeClass: SizeClass): boolean => sizeClass === 'wide';

// Only a wide window has the Inspector's own column; elsewhere the page's Inspector is its own sheet, so it takes no room beside the page.
const shownInspector = (props: ScaffoldProps): ScaffoldProps =>
  props.sizeClass === 'wide' ? props : { ...props, inspectorState: 'closed' };

// The Scaffold's props as it applies them, with its layout: what its frame, sidebar and page are drawn from.
export function useScaffoldParts(props: ScaffoldProps): ScaffoldParts {
  const scaffold = shownInspector(props);

  return {
    scaffold,
    layout: useScaffoldLayout(scaffold),
    framed: isFramed(props.sizeClass),
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
    <View className="absolute top-0 flex-row" style={inspectorPosition(parts)}>
      <FramePane
        testID="desktop-inspector"
        surface="glass"
        {...inspectorPlacement(parts)}
      >
        <InspectorControlsContext value={true}>
          {parts.scaffold.inspector(parts.layout.inspectorExpanded)}
        </InspectorControlsContext>
      </FramePane>
    </View>
  );
}

function inspectorPosition({ layout }: ScaffoldPartProps): ViewStyle {
  return { left: layout.frame.stage.offset, bottom: layout.measures.inset };
}

function OverlayContents(parts: ScaffoldParts): React.JSX.Element {
  return (
    <>
      <InspectorColumn {...parts} />
      <ScaffoldWorkbench {...parts} />
      <ScaffoldResizeHandles {...parts} />
      <PaneBanner left={sidebarWidth(parts.layout)}>
        {parts.scaffold.banner}
      </PaneBanner>
    </>
  );
}

// The Inspector, Workbench and handles share the panes' origin below the band.
function Overlays(parts: ScaffoldParts): React.JSX.Element {
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 bottom-0"
      style={{ top: parts.layout.frame.panesTop }}
    >
      <OverlayContents {...parts} />
    </View>
  );
}

interface FrameEdges {
  before: ReactNode;
  after: ReactNode;
}

// What sits around the sidebar and the page: a framed window's drag strip, Inspector, handles and banner. The phone shell has none: its pages place their own banner under their header.
const frameEdges = (parts: ScaffoldParts): FrameEdges =>
  parts.framed
    ? {
        before: <ScaffoldBand {...parts} />,
        after: <Overlays {...parts} />,
      }
    : { before: null, after: null };

export type ScaffoldFrameProps = PropsWithChildren<{ parts: ScaffoldParts }>;

// A framed tablet's panes start under the status bar; the window surface still runs behind it. The phone shell's pages keep their own header insets, and a desktop window has none.
function useFrameTop(parts: ScaffoldParts): ViewStyle {
  const { top } = useSafeAreaInsets();

  return { paddingTop: parts.framed ? top + parts.layout.frame.panesTop : 0 };
}

function FrameRow({ parts, children }: ScaffoldFrameProps): React.JSX.Element {
  const { before, after } = frameEdges(parts);

  return (
    <View
      // Named for the Size class it lays out, such as `wide-frame`.
      testID={`${parts.scaffold.sizeClass}-frame`}
      className="flex-1 flex-row overflow-hidden bg-content"
      style={useFrameTop(parts)}
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
