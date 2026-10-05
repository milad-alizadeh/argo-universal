import { type ReactNode, useState } from 'react';
import { useNavigate } from '../navigation/context';
import { sectionDestination } from '../navigation/sections';
import { PhoneShell } from './PhoneShell';
import type { ShellSection } from './shell-sections';

export interface PhoneSectionsLayoutProps {
  section: ShellSection;
  children: ReactNode;
}

// The phone's drawer of sections around the open section's list.
export function PhoneSectionsLayout({
  section,
  children,
}: PhoneSectionsLayoutProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  return (
    <PhoneShell
      selectedSection={section}
      attentionCount={0}
      drawerOpen={drawerOpen}
      onDrawerOpenChange={setDrawerOpen}
      onSectionChange={(next) => navigate(sectionDestination(next))}
      // Search and filter arrive with the Sessions list screen.
      onSearch={() => {}}
      onFilter={() => {}}
    >
      {children}
    </PhoneShell>
  );
}
