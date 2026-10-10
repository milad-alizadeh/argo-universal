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
import { detailDestination } from '../state/detail-destination';
import { DesktopShell, type InspectorState } from './desktop-shell';
import { shellSections } from './shell-sections';

export interface DesktopLayoutViewProps {
  destination: NavigationDestination;
  // The Sessions that need input or are Unread, for the rail's badge.
  attentionCount: number;
  // The open section's list, and the list's own part of the header row when it has one.
  list: ReactNode;
  listHeader?: ReactNode;
  children: ReactNode;
}

// The wide window's shell: the open section's list in the sidebar, and `children` in the detail pane.
export function DesktopLayoutView({
  destination,
  attentionCount,
  list,
  listHeader,
  children,
}: DesktopLayoutViewProps): React.JSX.Element {
  const navigate = useNavigate();
  const [sidebarShown, setSidebarShown] = useState(true);
  const [inspectorState, setInspectorState] =
    useState<InspectorState>('closed');
  const section = sectionOf(destination);
  const { title } = shellSections[section];
  const detail = detailDestination(destination);

  return (
    <DesktopShell
      selectedSection={section}
      attentionCount={attentionCount}
      sidebarShown={sidebarShown}
      onSidebarShownChange={setSidebarShown}
      onSectionChange={(next) => navigate(sectionDestination(next))}
      listHeader={
        listHeader ?? (
          <Text
            role={'heading'}
            semanticRole="heading"
            aria-level={2}
            className="pl-2"
          >
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
            role={'heading'}
            semanticRole="heading"
            aria-level={2}
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
