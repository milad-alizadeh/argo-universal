import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { type NavigationDestination, useNavigate } from '../navigation/context';
import { sectionDestination, sectionOf } from '../navigation/sections';
import { PhoneShell, type ShellSection } from './PhoneShell';

export interface PhoneLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

// The phone's shell: one drawer for every section, so picking a section animates it shut over the new list.
export function PhoneLayout({ destination, children }: PhoneLayoutProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const section = sectionOf(destination);
  const atSectionRoot = destination.to === sectionDestination(section).to;
  // Mounting the next section stalls the first frame, so a picked section's drawer shuts once it has mounted.
  const deferClose = useRef(false);
  const pendingSection = useRef<ShellSection | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawerOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [section]);

  return (
    <PhoneShell
      selectedSection={section}
      attentionCount={0}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={(open) => {
        if (!open && deferClose.current) deferClose.current = false;
        else setDrawerOpen(open);
      }}
      onDrawerClosed={() => {
        const next = pendingSection.current;
        pendingSection.current = null;
        if (next) navigate(sectionDestination(next));
      }}
      onSectionChange={(next) => {
        if (next === section) return;
        if (opensAfterClose) {
          pendingSection.current = next;
          return;
        }
        deferClose.current = true;
        navigate(sectionDestination(next));
      }}
      swipeEnabled={atSectionRoot}
    >
      {children}
    </PhoneShell>
  );
}

// UIKit measures a stack's safe area while the drawer has the card scaled, so iOS mounts a picked section once the card is full size.
const opensAfterClose = Platform.OS === 'ios';
