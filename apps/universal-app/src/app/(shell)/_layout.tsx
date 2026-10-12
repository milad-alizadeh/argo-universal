import {
  DesktopLayout,
  PhoneLayout,
  type NavigationDestination,
  type Section,
  useWide,
} from '@repo/client';
import { Slot, usePathname, useRouter } from 'expo-router';
import {
  defaultTabsSlotRender,
  TabList,
  Tabs,
  TabSlot,
  type TabSlotProps,
  TabTrigger,
  useTabTrigger,
} from 'expo-router/ui';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { hrefFor } from '@/navigation/routes';
import { useDestination } from '@/navigation/use-destination';

// Each section's route and the URL it opens on.
const sectionTabs = {
  sessions: { name: '(sessions)', href: '/' },
  issues: { name: 'issues', href: '/issues' },
  atlas: { name: 'atlas', href: '/atlas' },
  settings: { name: 'settings', href: '/settings' },
} as const satisfies Record<Section, { name: string; href: string }>;

// Picks the shell by width; each section's layout picks how its pages stack.
export default function ShellLayout(): React.JSX.Element {
  const destination = useDestination();
  const wide = useWide();
  const openPage = usePageBeforeShellChange(wide, destination);
  return (
    <>
      {wide ? <WideShell destination={destination} /> : <PhoneSections />}
      <ReopenPage key={String(wide)} page={openPage} />
    </>
  );
}

function WideShell({
  destination,
}: {
  destination: NavigationDestination;
}): React.JSX.Element {
  return (
    <DesktopLayout destination={destination}>
      <Slot />
    </DesktopLayout>
  );
}

interface ShownPage {
  path: string;
  destination: NavigationDestination;
}

// The page the shown shell is on; across a width change it stays the one the previous shell showed.
function usePageBeforeShellChange(
  wide: boolean,
  destination: NavigationDestination,
): ShownPage {
  const path = usePathname();
  const [shown, setShown] = useState({ wide, page: { path, destination } });
  if (shown.wide !== wide) setShown({ wide, page: shown.page });
  else if (shown.page.path !== path)
    setShown({ wide, page: { path, destination } });
  return shown.page;
}

// Each shell mounts its own navigator on Sessions, so on mount it reopens the previous shell's page above its section's root.
function ReopenPage({ page }: { page: ShownPage }): null {
  const router = useRouter();
  const [{ path, destination }] = useState(page);
  useEffect(() => {
    if (path === sectionTabs.sessions.href) return;
    const root = sectionRoot(path);
    router.replace(root);
    if (path === root) return;
    // The section's stack mounts on the next frame; a push before then would land without its root below.
    const frame = requestAnimationFrame((): void => {
      router.push(hrefFor(destination));
    });
    return (): void => cancelAnimationFrame(frame);
  }, [destination, path, router]);
  return null;
}

function sectionRoot(path: string): (typeof sectionTabs)[Section]['href'] {
  const section = Object.values(sectionTabs).find(
    ({ href }) =>
      href !== '/' && (path === href || path.startsWith(`${href}/`)),
  );
  return section?.href ?? sectionTabs.sessions.href;
}

// On a phone each section is a tab: it mounts on first open, keeps its stack while another is shown, and stops rendering while hidden.
function PhoneSections(): React.JSX.Element {
  return (
    <Tabs style={{ flex: 1 }}>
      <PhoneSectionShell />
      {/* The drawer is the tab list; this only declares the tabs, which Tabs reads from its direct children. */}
      <TabList style={{ display: 'none' }}>{sectionTriggers}</TabList>
    </Tabs>
  );
}

const sectionTriggers = Object.values(sectionTabs).map((tab) => (
  <TabTrigger key={tab.name} name={tab.name} href={tab.href} />
));

function PhoneSectionShell(): React.JSX.Element {
  const destination = useDestination();
  const { switchTab } = useTabTrigger({ name: sectionTabs.sessions.name });
  return (
    <PhoneLayout
      destination={destination}
      onSectionChange={(section) => switchTab(sectionTabs[section].name, {})}
    >
      <TabSlot renderFn={frozenWhenHidden} />
    </PhoneLayout>
  );
}

// Freezing skips a hidden section's renders; its effects and subscriptions stay live, since React's Activity, which would pause them, crashes Fabric's view mounting on Android (React Native 0.86).
const frozenWhenHidden: NonNullable<TabSlotProps['renderFn']> = (
  descriptor,
  options,
) =>
  defaultTabsSlotRender(
    { ...descriptor, options: { ...descriptor.options, freezeOnBlur: true } },
    options,
  );
