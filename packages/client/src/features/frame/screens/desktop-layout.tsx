import { PortalHost } from '@rn-primitives/portal';
import type * as React from 'react';
import { type ReactNode, useState } from 'react';
import { detailActionsHost, detailHeaderHost } from '#features/sessions';
import { Text } from '#lib/generic/primitives/text';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import {
  destinationTitle,
  sectionDestination,
  sectionOf,
} from '../../../lib/product/navigation/sections';
import { DesktopShell, type InspectorState } from '../components/desktop-shell';
import { shellSections } from '../components/shell-sections';
import { useAttentionCount } from '../hooks/use-attention-count';
import { useSectionList } from './section-list';

export interface DesktopLayoutProps {
  destination: NavigationDestination;
  children: ReactNode;
}

// The wide window's shell: the open section's list in the sidebar, and `children` in the detail pane.
export function DesktopLayout({
  destination,
  children,
}: DesktopLayoutProps): React.JSX.Element {
  const navigate = useNavigate();
  const attentionCount = useAttentionCount();
  const [sidebarShown, setSidebarShown] = useState(true);
  const [inspectorState, setInspectorState] =
    useState<InspectorState>('closed');
  const section = sectionOf(destination);
  const { title } = shellSections[section];
  // A wide window shows Accounts beside the Settings list.
  const detail: NavigationDestination =
    destination.to === 'settings' ? { to: 'settings-accounts' } : destination;
  const { header, list } = useSectionList(section, detail);

  return (
    <DesktopShell
      selectedSection={section}
      attentionCount={attentionCount}
      sidebarShown={sidebarShown}
      onSidebarShownChange={setSidebarShown}
      onSectionChange={(next) => navigate(sectionDestination(next))}
      listHeader={
        header ?? (
          <Text role="heading" aria-level={2} className="pl-2 type-heading">
            {title}
          </Text>
        )
      }
      list={list}
      detailHeader={
        // A Session draws its own title and status here.
        detail.to === 'session' ? (
          <PortalHost name={detailHeaderHost} />
        ) : (
          <Text
            role="heading"
            aria-level={2}
            className="type-heading"
            numberOfLines={1}
          >
            {destinationTitle(detail)}
          </Text>
        )
      }
      detailActions={
        detail.to === 'session' ? (
          <PortalHost name={detailActionsHost} />
        ) : undefined
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
