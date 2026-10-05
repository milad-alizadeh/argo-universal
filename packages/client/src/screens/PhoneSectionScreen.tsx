import { useState } from 'react';
import { PhoneShell } from '../components/PhoneShell';
import { useSectionList } from '../components/SectionList';
import type { ShellSection } from '../components/shell-sections';
import { useNavigate } from '../navigation/context';
import { sectionDestination } from '../navigation/sections';

export interface PhoneSectionScreenProps {
  section: ShellSection;
}

// A phone section root: the drawer of sections around the section's list.
export function PhoneSectionScreen({ section }: PhoneSectionScreenProps) {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { header, list } = useSectionList(section);
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
      header={header}
    >
      {list}
    </PhoneShell>
  );
}
