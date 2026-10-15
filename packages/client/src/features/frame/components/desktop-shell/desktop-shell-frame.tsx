import type * as React from 'react';
import {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  use,
} from 'react';
import { View } from 'react-native';
import { ContentLayout } from '#lib/product/content-layout';
import { ShellPane } from '../shell-pane/shell-pane';
import {
  detailPlacement,
  InspectorPanel,
  ShellBackground,
} from './desktop-shell';
import type { DesktopShellProps } from './desktop-shell-props';
import { PaneBanner } from './shell-chrome';
import { ShellResizeHandles } from './shell-resize-handles';
import { ShellSidebar } from './shell-sidebar';
import {
  type ShellLayout,
  type ShellPartProps,
  useShellLayout,
} from './use-shell-layout';

interface FrameParts extends ShellPartProps {
  wide: boolean;
}

const FrameContext = createContext<FrameParts | null>(null);

function useFrame(): FrameParts {
  const parts = use(FrameContext);

  if (!parts) throw new Error('Render inside a DesktopShellFrame.');

  return parts;
}

type DesktopShellFrameShell = Omit<DesktopShellProps, 'children'>;

export interface DesktopShellFrameProps {
  shell: DesktopShellFrameShell;
  wide: boolean;
  // Floats over a narrow window, where the panes' banner is not drawn.
  narrowBanner: ReactNode;
  // The navigator, which draws `DesktopShellSidebar` beside `DesktopShellDetail` on a wide window.
  children: ReactNode;
}

const sidebarWidth = ({ measures, shownListWidth }: ShellLayout): number =>
  measures.inset * 2 + measures.railWidth + shownListWidth;

function useFrameParts(
  shell: DesktopShellFrameShell,
  wide: boolean,
): FrameParts {
  const frameShell = { ...shell, children: null };

  return { shell: frameShell, layout: useShellLayout(frameShell), wide };
}

// The shell around a navigator that draws the sidebar and each page itself; at every width the navigator keeps the same place in the tree.
export function DesktopShellFrame({
  shell,
  wide,
  narrowBanner,
  children,
}: DesktopShellFrameProps): React.JSX.Element {
  const parts = useFrameParts(shell, wide);

  return (
    <FrameContext value={parts}>
      <FrameRow parts={parts} narrowBanner={narrowBanner}>
        {children}
      </FrameRow>
    </FrameContext>
  );
}

type FrameRowProps = Pick<
  DesktopShellFrameProps,
  'narrowBanner' | 'children'
> & {
  parts: FrameParts;
};

interface FrameEdges {
  testID: string;
  before: ReactNode;
  after: ReactNode;
}

// What sits around the navigator: a wide window's backdrop, Inspector, handles and banner, or a narrow window's banner.
const frameEdges = (parts: FrameParts, narrowBanner: ReactNode): FrameEdges =>
  parts.wide
    ? {
        testID: 'desktop-shell',
        before: <ShellBackground {...parts} />,
        after: <WideOverlays {...parts} />,
      }
    : { testID: 'phone-shell', before: null, after: narrowBanner };

function FrameRow(props: FrameRowProps): React.JSX.Element {
  const { testID, before, after } = frameEdges(props.parts, props.narrowBanner);

  return (
    <View
      testID={testID}
      className="flex-1 flex-row overflow-hidden bg-content"
      onLayout={props.parts.layout.onLayout}
    >
      {before}
      <View className="min-w-0 flex-1">{props.children}</View>
      {after}
    </View>
  );
}

// The Inspector beside the pages, the resize handles and the banner over the panes.
function WideOverlays(parts: ShellPartProps): React.JSX.Element {
  return (
    <>
      <InspectorPanel {...parts} />
      <ShellResizeHandles {...parts} />
      <PaneBanner left={sidebarWidth(parts.layout)}>
        {parts.shell.banner}
      </PaneBanner>
    </>
  );
}

export interface DesktopShellSidebarProps {
  // Opens a section through the navigator that holds the sidebar.
  onSectionChange: DesktopShellProps['onSectionChange'];
}

// The rail and the open section's list, as a wide window's permanent drawer.
export function DesktopShellSidebar({
  onSectionChange,
}: DesktopShellSidebarProps): React.JSX.Element {
  const { shell, layout } = useFrame();

  // The drawer stacks its content in a column; the sidebar fills its height.
  return (
    <View className="flex-1 flex-row">
      <ShellSidebar shell={{ ...shell, onSectionChange }} layout={layout} />
    </View>
  );
}

// The sidebar's width, for the permanent drawer that holds it.
export function useDesktopSidebarWidth(): number {
  return sidebarWidth(useFrame().layout);
}

const pagePlacement = (
  layout: ShellLayout,
  wide: boolean,
): ReturnType<typeof detailPlacement> =>
  wide
    ? detailPlacement(layout)
    : { ...layout.motion, offset: 0, width: layout.width, hidden: false };

// A section's pages: the detail pane on a wide window, the whole window on a narrow one; the tree is the same at both, so the pages never remount, and the pane fills the navigator's column.
export function DesktopShellDetail({
  children,
}: PropsWithChildren): React.JSX.Element {
  const { layout, wide } = useFrame();

  return (
    <View className="flex-1 flex-row">
      <ShellPane testID="desktop-detail" {...pagePlacement(layout, wide)}>
        <ContentLayout className="overflow-hidden" measured={wide}>
          {children}
        </ContentLayout>
      </ShellPane>
    </View>
  );
}
