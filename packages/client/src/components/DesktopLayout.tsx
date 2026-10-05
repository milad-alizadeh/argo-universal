import { type ReactNode, useState } from 'react';
import { Text } from '#primitives/text';
import { type NavigationDestination, useNavigate } from '../navigation/context';
import {
  destinationTitle,
  sectionDestination,
  sectionOf,
} from '../navigation/sections';
import { DesktopShell, type InspectorState } from './DesktopShell';
import { SectionList } from './SectionList';
import { shellSections } from './shell-sections';

export interface DesktopLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

// The wide window's shell: the open section's list in the sidebar, and `children` in the detail pane.
export function DesktopLayout({ destination, children }: DesktopLayoutProps) {
  const navigate = useNavigate();
  const [sidebarShown, setSidebarShown] = useState(true);
  const [inspectorState, setInspectorState] =
    useState<InspectorState>('closed');
  const section = sectionOf(destination);
  const { title } = shellSections[section];
  // A wide window shows Accounts beside the Settings list.
  const detail: NavigationDestination =
    destination.to === 'settings' ? { to: 'settings-accounts' } : destination;

  return (
    <DesktopShell
      selectedSection={section}
      attentionCount={0}
      sidebarShown={sidebarShown}
      onSidebarShownChange={setSidebarShown}
      onSectionChange={(next) => navigate(sectionDestination(next))}
      listHeader={
        <Text role="heading" aria-level={2} className="text-base font-semibold">
          {title}
        </Text>
      }
      list={<SectionList section={section} selectedDestination={detail} />}
      detailHeader={
        <Text
          role="heading"
          aria-level={2}
          className="text-sm font-semibold"
          numberOfLines={1}
        >
          {destinationTitle(detail)}
        </Text>
      }
      inspectorState={inspectorState}
      onInspectorStateChange={setInspectorState}
      inspectorHeader={null}
      inspector={null}
    >
      {children}
    </DesktopShell>
  );
}
