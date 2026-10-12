import {
  DesktopLayout,
  PhoneLayout,
  type Section,
  useWide,
} from '@repo/client';
import { Slot } from 'expo-router';
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
  if (!useWide()) return <PhoneSections />;
  return (
    <DesktopLayout destination={destination}>
      <Slot />
    </DesktopLayout>
  );
}

// On a phone each section is a tab: it mounts on first open, keeps its stack while another is shown, and freezes while hidden.
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

const frozenWhenHidden: NonNullable<TabSlotProps['renderFn']> = (
  descriptor,
  options,
) =>
  defaultTabsSlotRender(
    { ...descriptor, options: { ...descriptor.options, freezeOnBlur: true } },
    options,
  );
