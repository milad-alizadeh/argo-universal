import type * as React from 'react';
import { View } from 'react-native';
import { ContentLayout } from '#lib/product/content-layout';
import { ShellBackdrop } from '../shell-backdrop/shell-backdrop';
import { ShellPane, type ShellPaneProps } from '../shell-pane/shell-pane';
import type { DesktopShellProps } from './desktop-shell-props';
import { PaneBanner, WindowDragStrip } from './shell-chrome';
import { ShellResizeHandles } from './shell-resize-handles';
import { ShellSidebar } from './shell-sidebar';
import { type ShellPartProps, useShellLayout } from './use-shell-layout';

export function ShellBackground({
  shell,
  layout,
}: ShellPartProps): React.JSX.Element {
  return (
    <>
      <ShellBackdrop sidebarShown={shell.sidebarShown} {...layout.motion} />
      <WindowDragStrip />
    </>
  );
}

export const detailPlacement = (
  layout: ShellPartProps['layout'],
): Omit<ShellPaneProps, 'testID' | 'children'> => ({
  offset: layout.shownListWidth,
  width: layout.detailWidth,
  hidden: layout.inspectorExpanded,
  ...layout.motion,
});

function DetailPane({ shell, layout }: ShellPartProps): React.JSX.Element {
  return (
    <ShellPane testID="desktop-detail" {...detailPlacement(layout)}>
      <ContentLayout className="overflow-hidden">
        {shell.children}
      </ContentLayout>
    </ShellPane>
  );
}

const inspectorPlacement = (
  layout: ShellPartProps['layout'],
): Omit<ShellPaneProps, 'testID' | 'children'> => ({
  offset: layout.detailRight,
  width: layout.inspectorTargetWidth,
  hidden: !layout.inspectorOpen,
  ...layout.motion,
});

export function InspectorPanel({
  shell,
  layout,
}: ShellPartProps): React.JSX.Element {
  return (
    <ShellPane testID="desktop-inspector" {...inspectorPlacement(layout)}>
      {shell.inspector(layout.inspectorExpanded)}
    </ShellPane>
  );
}

function ShellContent(parts: ShellPartProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row">
      <DetailPane {...parts} />
      <InspectorPanel {...parts} />
      <PaneBanner>{parts.shell.banner}</PaneBanner>
    </View>
  );
}

// The wide window: a floating glass panel holds the rail and the open section's list over a faint warm glow; the detail and a flush Inspector sit on the window surface.
export function DesktopShell(shell: DesktopShellProps): React.JSX.Element {
  const layout = useShellLayout(shell);

  return (
    <View
      testID="desktop-shell"
      className="flex-1 flex-row overflow-hidden bg-content"
      onLayout={layout.onLayout}
    >
      <ShellBackground shell={shell} layout={layout} />
      <ShellSidebar shell={shell} layout={layout} />
      <ShellResizeHandles shell={shell} layout={layout} />
      <ShellContent shell={shell} layout={layout} />
    </View>
  );
}
