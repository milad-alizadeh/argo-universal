import { usePathname } from 'expo-router';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { InspectorProvider } from '#lib/product/inspector';
import { sectionOf } from '../../../lib/product/navigation/sections';
import { useLayoutShell } from '../components/desktop-layout-view/desktop-layout-view';
import { DesktopShellFrame } from '../components/desktop-shell/desktop-shell-frame';
import {
  PhoneDrawerContent,
  type PhoneDrawerContentProps,
} from '../components/phone-drawer-content/phone-drawer-content';
import { useAttentionCount } from '../hooks/use-attention-count';
import { LiveConnectionBanner } from './connection-banner';
import { SectionFiltersProvider, useSectionContent } from './section-content';

export interface ShellProps {
  wide: boolean;
  // The navigator of sections, which picks a section through its own navigation.
  children: ReactNode;
}

// The section a sidebar's rail picks goes through the navigator that holds the sidebar (`DesktopShellSidebar`), never through the shell.
const pickedByTheNavigator = (): void => {};

// The shown section's list, the live attention count and the live Connection banner, with the sidebar's and the Inspector's state.
function useShellState(): ReturnType<typeof useLayoutShell> {
  const path = usePathname();
  const section = sectionOf(path);
  const { header, list } = useSectionContent(section, path);

  return useLayoutShell({
    section,
    onSectionChange: pickedByTheNavigator,
    list,
    listHeader: header,
    attentionCount: useAttentionCount(),
    banner: <LiveConnectionBanner />,
  });
}

function ShellWithState({ wide, children }: ShellProps): React.JSX.Element {
  const { inspector, shell } = useShellState();

  return (
    <InspectorProvider value={inspector}>
      <DesktopShellFrame shell={shell} wide={wide}>
        {children}
      </DesktopShellFrame>
    </InspectorProvider>
  );
}

// The shell around the navigator of sections, at every width, with the section filters its lists and headers share.
export function Shell(props: ShellProps): React.JSX.Element {
  return (
    <SectionFiltersProvider>
      <ShellWithState {...props} />
    </SectionFiltersProvider>
  );
}

export type SectionDrawerProps = Omit<
  PhoneDrawerContentProps,
  'attentionCount'
>;

// The narrow window's drawer of sections, with the live attention count; the drawing is `PhoneDrawerContent`.
export function SectionDrawer(props: SectionDrawerProps): React.JSX.Element {
  return <PhoneDrawerContent {...props} attentionCount={useAttentionCount()} />;
}
