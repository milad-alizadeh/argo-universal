import type * as React from 'react';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  use,
} from 'react';
import { View } from 'react-native';
import type { SizeClass } from '#lib/generic/use-size-class/size-class';
import { FrameBackdrop } from '../components/frame-backdrop/frame-backdrop';
import {
  FramePane,
  type FramePaneProps,
} from '../components/frame-pane/frame-pane';
import { PaneBanner, WindowDragStrip } from './scaffold-chrome';
import { ScaffoldResizeHandles } from './scaffold-resize-handles';
import {
  type ScaffoldLayout,
  type ScaffoldPartProps,
  type ScaffoldProps,
  useScaffoldLayout,
} from './use-scaffold-layout';

export interface ScaffoldParts extends ScaffoldPartProps {
  // A medium or wide window: the sidebar and the list sit beside the page.
  framed: boolean;
}

const ScaffoldContext = createContext<ScaffoldParts | null>(null);

export function useScaffoldParts(): ScaffoldParts {
  const parts = use(ScaffoldContext);

  if (!parts) throw new Error('Render inside a ScaffoldFrame.');

  return parts;
}

export const isFramed = (sizeClass: SizeClass): boolean =>
  sizeClass !== 'compact';

// ADR-0026: only a wide window has the Inspector's own column; a medium window's Inspector is a sheet, which is not built yet.
const shownInspector = (props: ScaffoldProps): ScaffoldProps =>
  props.sizeClass === 'wide' ? props : { ...props, inspectorState: 'closed' };

function useParts(props: ScaffoldProps): ScaffoldParts {
  const scaffold = shownInspector(props);

  return {
    scaffold,
    layout: useScaffoldLayout(scaffold),
    framed: isFramed(props.sizeClass),
  };
}

const sidebarWidth = ({ measures, shownListWidth }: ScaffoldLayout): number =>
  measures.inset * 2 + measures.railWidth + shownListWidth;

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
      {parts.scaffold.sizeClass === 'wide' ? (
        <InspectorColumn {...parts} />
      ) : null}
      <ScaffoldResizeHandles {...parts} />
      <PaneBanner left={sidebarWidth(parts.layout)}>
        {parts.scaffold.banner}
      </PaneBanner>
    </>
  );
}

interface FrameEdges {
  testID: string;
  before: ReactNode;
  after: ReactNode;
}

// What sits around the sidebar and the page: a framed window's backdrop, Inspector, handles and banner; a compact window's pages place their own banner under their header.
const frameEdges = (parts: ScaffoldParts): FrameEdges =>
  parts.framed
    ? {
        testID: 'desktop-shell',
        before: <Backdrop {...parts} />,
        after: <Overlays {...parts} />,
      }
    : { testID: 'phone-shell', before: null, after: null };

type FrameRowProps = PropsWithChildren<{ parts: ScaffoldParts }>;

function FrameRow({ parts, children }: FrameRowProps): React.JSX.Element {
  const { testID, before, after } = frameEdges(parts);

  return (
    <View
      testID={testID}
      className="flex-1 flex-row overflow-hidden bg-content"
      onLayout={parts.layout.onLayout}
    >
      {before}
      <View className="min-w-0 flex-1">{children}</View>
      {after}
    </View>
  );
}

type ScaffoldFrameProps = PropsWithChildren<
  Omit<ScaffoldProps, 'sidebar' | 'page'>
>;

/*
 * The Scaffold's frame without its sidebar and page, for a navigator that draws them itself:
 * `ScaffoldSidebar` as its permanent drawer and `ScaffoldPage` around each page. The navigator,
 * the children, keeps the same place in the tree at every Size class, so its pages never remount.
 */
export function ScaffoldFrame({
  children,
  ...props
}: ScaffoldFrameProps): React.JSX.Element {
  const parts = useParts({ ...props, sidebar: null });

  return (
    <ScaffoldContext value={parts}>
      <FrameRow parts={parts}>{children}</FrameRow>
    </ScaffoldContext>
  );
}

// The width of the sidebar and the list, for the permanent drawer that holds them.
export function useScaffoldSidebarWidth(): number {
  return sidebarWidth(useScaffoldParts().layout);
}

// The props the Scaffold was given, as it applies them.
export function useScaffoldProps(): ScaffoldProps {
  return useScaffoldParts().scaffold;
}
