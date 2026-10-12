import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import { InspectorProvider } from '#lib/product/inspector';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import {
  sectionDestination,
  sectionOf,
} from '../../../../lib/product/navigation/sections';
import {
  DesktopShell,
  type InspectorState,
} from '../desktop-shell/desktop-shell';
import { InspectorPane } from '../inspector-pane';
import { shellSections } from '../shell-sections';

export interface DesktopLayoutViewProps {
  destination: NavigationDestination;
  // The Sessions that need input or are Unread, for the rail's badge.
  attentionCount: number;
  // The open section's list, and the list's own part of the header row when it has one.
  list: ReactNode;
  listHeader?: ReactNode;
  children: ReactNode;
}

// The wide window's shell: the open section's list in the sidebar, `children` in the detail pane with its own header, and the Session's changes in the Inspector.
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
  const inspectorOpen = inspectorState !== 'closed';
  const inspector = useMemo(
    () => ({
      open: inspectorOpen,
      toggle: (): void => setInspectorState(inspectorOpen ? 'closed' : 'open'),
    }),
    [inspectorOpen],
  );

  return (
    <InspectorProvider value={inspector}>
      <DesktopShell
        selectedSection={section}
        attentionCount={attentionCount}
        sidebarShown={sidebarShown}
        onSidebarShownChange={setSidebarShown}
        onSectionChange={(next) => navigate(sectionDestination(next))}
        listHeader={listHeader ?? <ListTitle>{title}</ListTitle>}
        list={list}
        inspectorState={inspectorState}
        onInspectorStateChange={setInspectorState}
        inspector={(expanded) => (
          <InspectorPane
            title="Changes"
            expanded={expanded}
            onStateChange={setInspectorState}
          >
            {null}
          </InspectorPane>
        )}
      >
        {children}
      </DesktopShell>
    </InspectorProvider>
  );
}
