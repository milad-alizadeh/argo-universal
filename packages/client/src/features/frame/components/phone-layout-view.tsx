import type * as React from 'react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import {
  sectionDestination,
  sectionOf,
} from '../../../lib/product/navigation/sections';
import { PhoneShell } from './phone-shell';

export interface PhoneLayoutViewProps {
  destination: NavigationDestination;
  // The Sessions that need input or are Unread, for the drawer's badge.
  attentionCount: number;
  children: ReactNode;
}

// The phone's shell: one drawer for every section, so picking a section animates it shut over the new list.
export function PhoneLayoutView({
  destination,
  attentionCount,
  children,
}: PhoneLayoutViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const section = sectionOf(destination);
  const atSectionRoot = destination.to === sectionDestination(section).to;
  // Mounting the next section stalls the first frame, so a picked section's drawer shuts once it has mounted.
  const deferClose = useRef(false);
  const shownSection = useRef(section);
  useEffect(() => {
    if (shownSection.current === section) return;
    shownSection.current = section;
    const frame = requestAnimationFrame(() => setDrawerOpen(false));
    return (): void => cancelAnimationFrame(frame);
  }, [section]);

  return (
    <PhoneShell
      selectedSection={section}
      attentionCount={attentionCount}
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
