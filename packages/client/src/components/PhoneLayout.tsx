import { type ReactNode, useEffect, useRef, useState } from 'react';
import { type NavigationDestination, useNavigate } from '../navigation/context';
import { sectionDestination, sectionOf } from '../navigation/sections';
import { PhoneShell } from './PhoneShell';

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
      onSectionChange={(next) => {
        if (next === section) return;
        deferClose.current = true;
        navigate(sectionDestination(next));
      }}
      swipeEnabled={atSectionRoot}
    >
      {children}
    </PhoneShell>
  );
}
