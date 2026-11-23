import { InspectorControlsContext } from '@repo/kit/primitives/scaffolds/inspector';
import type * as React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import { shownInspectorState } from './inspector-column';
import { isFramed } from './is-framed';
import { ScaffoldBand } from './scaffold-band';
import { InspectorTitleBar } from './scaffold-band-controls';
import { PaneBanner, type PaneBannerProps } from './scaffold-chrome';
import type { ScaffoldProps } from './scaffold-props';
import { ScaffoldResizeHandles } from './scaffold-resize-handles';
import { ScaffoldWorkbench } from './scaffold-workbench';
import {
  type ScaffoldPartProps,
  useScaffoldLayout,
} from './use-scaffold-layout';

export interface ScaffoldParts extends ScaffoldPartProps {
  // A wide window: the sidebar and the list sit beside the page.
  framed: boolean;
}

const shownInspector = (props: ScaffoldProps): ScaffoldProps => ({
  ...props,
  inspectorState: shownInspectorState(props.sizeClass, props.inspectorState),
});

// The Scaffold's props as it applies them, with its layout: what its frame, sidebar and page are drawn from.
export function useScaffoldParts(props: ScaffoldProps): ScaffoldParts {
  const scaffold = shownInspector(props);

  return {
    scaffold,
    layout: useScaffoldLayout(scaffold),
    framed: isFramed(props.sizeClass),
  };
}

export type PanePlacement = Omit<FramePaneProps, 'testID' | 'children'>;

type InspectorReads = ScaffoldPartProps;

const inspectorPlacement = ({ layout }: InspectorReads): PanePlacement => ({
  offset: layout.inspector.offset,
  width: layout.inspector.width,
  hidden: !layout.inspector.open,
  ...layout.motion,
});

// The Inspector floats as the sidebar does: its panel runs up beside the title bar, whose row it holds its controls in.
function FramedInspector(parts: InspectorReads): React.JSX.Element {
  return (
    <View className="absolute flex-row" style={inspectorPosition(parts)}>
      <FramePane
        testID="desktop-inspector"
        surface="glass"
        {...inspectorPlacement(parts)}
      >
        <InspectorTitleBar {...parts} />
        <View className="min-h-0 flex-1">
          <InspectorControlsContext value={true}>
            {parts.scaffold.inspector(parts.layout.inspector.expanded)}
          </InspectorControlsContext>
        </View>
      </FramePane>
    </View>
  );
}

function inspectorPosition({ layout }: InspectorReads): ViewStyle {
  return {
    left: layout.inspector.offset,
    top: -layout.measures.titleBarHeight,
    bottom: layout.measures.inset,
  };
}

type BannerPlacement = Pick<PaneBannerProps, 'left' | 'width'>;

/*
 * The banner centres on the content column, as the Feed and the Composer do, so it floats over the column's quiet
 * middle and not over a Session bar's action at the column's trailing edge. With no column on show, an expanded
 * Inspector, it centres over every pane.
 */
function bannerPlacement({
  layout,
}: Pick<ScaffoldParts, 'layout'>): BannerPlacement {
  if (layout.page.hidden) return { left: layout.sidebarWidth };

  return { left: layout.content.offset, width: layout.content.width };
}

// A press anywhere outside the Workbench opened over the content closes it, as Codex's popover does.
function WorkbenchDismiss({
  layout,
}: Pick<ScaffoldParts, 'layout'>): React.JSX.Element | null {
  if (layout.workbench.state !== 'overlay') return null;

  return (
    <Pressable
      testID="workbench-dismiss"
      accessibilityLabel="Close Workbench"
      className="absolute inset-0"
      onPress={() => layout.setWorkbenchPopover(false)}
    />
  );
}

function OverlayContents(parts: ScaffoldParts): React.JSX.Element {
  return (
    <>
      <FramedInspector {...parts} />
      <WorkbenchDismiss layout={parts.layout} />
      <ScaffoldWorkbench {...parts} />
      <ScaffoldResizeHandles {...parts} />
      <PaneBanner {...bannerPlacement(parts)}>
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
      style={{ top: parts.layout.safeTop + parts.layout.panesTop }}
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

// The sidebar's panel runs up beside the title bar, so the page and the sidebar each set their own top.
const frameViewProps = (parts: ScaffoldParts): ViewProps => ({
  // Named for the Size class it lays out, such as `wide-frame`.
  testID: `${parts.scaffold.sizeClass}-frame`,
  className: 'flex-1 flex-row overflow-hidden bg-content',
  onLayout: parts.layout.onLayout,
});

/*
 * The Scaffold's frame without its sidebar and page, for a navigator that draws them itself:
 * `ScaffoldSidebar` as its permanent drawer and `ScaffoldPage` around each page, each given the
 * same parts. The navigator, the children, keeps the same place in the tree at every Size class,
 * so its pages never remount.
 */
export function ScaffoldFrame({
  parts,
  children,
}: ScaffoldFrameProps): React.JSX.Element {
  const { before, after } = frameEdges(parts);

  return (
    <View {...frameViewProps(parts)}>
      {before}
      <View className="min-w-0 flex-1">{children}</View>
      {after}
    </View>
  );
}
