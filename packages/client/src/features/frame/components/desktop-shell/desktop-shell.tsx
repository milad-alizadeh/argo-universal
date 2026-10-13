import type * as React from 'react';
import { View } from 'react-native';
import { ContentLayout } from '#lib/product/content-layout';
import { ShellBackdrop } from '../shell-backdrop/shell-backdrop';
import { ShellPane } from '../shell-pane/shell-pane';
import type { DesktopShellProps } from './desktop-shell-props';
import { ShellResizeHandles } from './shell-resize-handles';
import { ShellSidebar } from './shell-sidebar';
import { type ShellPartProps, useShellLayout } from './use-shell-layout';

function ShellBackground({ shell, layout }: ShellPartProps): React.JSX.Element {
  return (
    <>
      <ShellBackdrop sidebarShown={shell.sidebarShown} {...layout.motion} />
      {/* An invisible strip along the window's top drags the Electron window; controls above it stay clickable. */}
      <View
        testID="window-drag-strip"
        pointerEvents="none"
        className="absolute inset-x-0 top-0 h-[calc(var(--spacing-shell-inset)+var(--spacing-shell-control))] web:[app-region:drag]"
      />
    </>
  );
}

function DetailPane({ shell, layout }: ShellPartProps): React.JSX.Element {
  return (
    <ShellPane
      testID="desktop-detail"
      offset={layout.shownListWidth}
      width={layout.detailWidth}
      hidden={layout.inspectorExpanded}
      {...layout.motion}
    >
      <ContentLayout className="overflow-hidden">
        {shell.children}
      </ContentLayout>
    </ShellPane>
  );
}

function InspectorPanel({ shell, layout }: ShellPartProps): React.JSX.Element {
  return (
    <ShellPane
      testID="desktop-inspector"
      offset={layout.usableWidth - layout.inspectorTargetWidth}
      width={layout.inspectorTargetWidth}
      hidden={!layout.inspectorOpen}
      {...layout.motion}
    >
      {shell.inspector(layout.inspectorExpanded)}
    </ShellPane>
  );
}

function ShellContent(parts: ShellPartProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row">
      <DetailPane {...parts} />
      <InspectorPanel {...parts} />
    </View>
  );
}

// The wide window: a floating glass panel holds the rail and the open section's list over a faint warm glow; the detail and a flush Inspector sit on the window surface.
export function DesktopShell(shell: DesktopShellProps): React.JSX.Element {
  const layout = useShellLayout(shell);
  return (
    <View
      testID="desktop-shell"
      className="flex-1 flex-row overflow-hidden bg-sidebar"
      onLayout={layout.onLayout}
    >
      <ShellBackground shell={shell} layout={layout} />
      <ShellSidebar shell={shell} layout={layout} />
      <ShellResizeHandles shell={shell} layout={layout} />
      <ShellContent shell={shell} layout={layout} />
    </View>
  );
}
