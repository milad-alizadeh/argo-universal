import type * as React from 'react';
import type { ReactNode } from 'react';
import { InspectorProvider } from '#lib/product/inspector';
import type { NavigationDestination } from '#lib/product/navigation/context';
import { sectionOf } from '../../../lib/product/navigation/sections';
import { useLayoutShell } from '../components/desktop-layout-view/desktop-layout-view';
import { DesktopShellFrame } from '../components/desktop-shell/desktop-shell-frame';
import { useAttentionCount } from '../hooks/use-attention-count';
import { LiveConnectionBanner } from './live-connection-banner';
import { SectionFiltersProvider } from './section-filters';
import { useSectionList } from './section-list';

export interface ShellFrameProps {
  destination: NavigationDestination;
  wide: boolean;
  // The navigator of sections.
  children: ReactNode;
}

// The shell's props: the open section's connected list, the live attention count and the live Connection banner.
function useFrameShell(
  destination: NavigationDestination,
): ReturnType<typeof useLayoutShell> {
  const { header, list } = useSectionList(sectionOf(destination), destination);

  return useLayoutShell({
    destination,
    list,
    listHeader: header,
    attentionCount: useAttentionCount(),
    banner: <LiveConnectionBanner />,
  });
}

function FrameWithShell({
  destination,
  wide,
  children,
}: ShellFrameProps): React.JSX.Element {
  const { inspector, shell } = useFrameShell(destination);

  return (
    <InspectorProvider value={inspector}>
      <DesktopShellFrame shell={shell} wide={wide}>
        {children}
      </DesktopShellFrame>
    </InspectorProvider>
  );
}

// The shell around the navigator of sections, at every width, with the section filters its lists and headers share.
export function ShellFrame(props: ShellFrameProps): React.JSX.Element {
  return (
    <SectionFiltersProvider>
      <FrameWithShell {...props} />
    </SectionFiltersProvider>
  );
}
