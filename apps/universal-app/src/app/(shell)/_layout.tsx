import {
  DesktopLayout,
  OnboardingLayout,
  type NavigationDestination,
  type Section,
  useOnboardingShown,
  useWide,
} from '@repo/client';
import { Slot, usePathname, useRouter } from 'expo-router';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { PhoneDrawer } from '@/navigation/phone-drawer';
import { hrefFor } from '@/navigation/routes';
import { useDestination } from '@/navigation/use-destination';

// The URL each section opens on.
const sectionHrefs = {
  sessions: '/',
  issues: '/issues',
  atlas: '/atlas',
  settings: '/settings',
} as const satisfies Record<Section, string>;

// Picks the shell by width; each section's layout picks how its pages stack.
export default function ShellLayout(): React.JSX.Element {
  const destination = useDestination();
  const wide = useWide();
  const { page, shellChanged } = usePageBeforeShellChange(wide, destination);
  const Shell = wide ? WideShell : NarrowShell;

  return (
    <>
      <Shell destination={destination} />
      {/* The first shell opens on the URL itself; only a later shell has a page to reopen. */}
      {shellChanged && <ReopenPage key={String(wide)} page={page} />}
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

// A narrow web window still sets up its Server; the phone shell waits for the first Project.
function NarrowShell({
  destination,
}: {
  destination: NavigationDestination;
}): React.JSX.Element {
  const onboarding = useOnboardingShown(destination);

  return onboarding ? <OnboardingLayout /> : <PhoneDrawer />;
}

interface ShownPage {
  path: string;
  destination: NavigationDestination;
}

interface ShellPage {
  page: ShownPage;
  // The width has crossed the breakpoint since the App opened.
  shellChanged: boolean;
}

// The page the shown shell is on; across a width change it stays the one the previous shell showed.
function usePageBeforeShellChange(
  wide: boolean,
  destination: NavigationDestination,
): ShellPage {
  const path = usePathname();

  const [shown, setShown] = useState(() =>
    firstShell(wide, { path, destination }),
  );

  if (shown.wide !== wide)
    setShown({ wide, page: shown.page, shellChanged: true });
  else if (shown.page.path !== path)
    setShown({ ...shown, page: { path, destination } });

  return shown;
}

const firstShell = (
  wide: boolean,
  page: ShownPage,
): ShellPage & { wide: boolean } => ({ wide, page, shellChanged: false });

// Each shell mounts its own navigator on Sessions, so on mount it reopens the previous shell's page above its section's root.
function ReopenPage({ page }: { page: ShownPage }): null {
  const router = useRouter();
  const [{ path, destination }] = useState(page);
  useEffect(() => {
    if (path === sectionHrefs.sessions) return;
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

function sectionRoot(path: string): (typeof sectionHrefs)[Section] {
  const href = Object.values(sectionHrefs).find(
    (sectionHref) =>
      sectionHref !== '/' &&
      (path === sectionHref || path.startsWith(`${sectionHref}/`)),
  );

  return href ?? sectionHrefs.sessions;
}
