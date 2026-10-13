import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type InspectorControl,
  InspectorProvider,
} from '#lib/product/inspector';
import { ListTitle } from '#lib/product/list-title';
import {
  type NavigationDestination,
  useNavigate,
} from '#lib/product/navigation/context';
import {
  sectionDestination,
  sectionOf,
} from '../../../../lib/product/navigation/sections';
import { DesktopShell } from '../desktop-shell/desktop-shell';
import type {
  DesktopShellProps,
  InspectorState,
} from '../desktop-shell/desktop-shell-props';
import { InspectorPane, type InspectorPaneProps } from '../inspector-pane';
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

type ShellInspectorProps = Pick<
  DesktopShellProps,
  'inspectorState' | 'onInspectorStateChange' | 'inspector'
>;

type SectionShellProps = Pick<
  DesktopShellProps,
  'selectedSection' | 'onSectionChange' | 'listHeader'
>;

interface LayoutShell {
  inspector: InspectorControl;
  shell: Omit<DesktopShellProps, 'children'>;
}

function useSectionProps(props: DesktopLayoutViewProps): SectionShellProps {
  const navigate = useNavigate();
  const section = sectionOf(props.destination);
  return {
    selectedSection: section,
    onSectionChange: (next) => navigate(sectionDestination(next)),
    listHeader: props.listHeader ?? (
      <ListTitle>{shellSections[section].title}</ListTitle>
    ),
  };
}

function useSidebarProps(): Pick<
  DesktopShellProps,
  'sidebarShown' | 'onSidebarShownChange'
> {
  const [sidebarShown, setSidebarShown] = useState(true);
  return { sidebarShown, onSidebarShownChange: setSidebarShown };
}

function useInspectorControl(
  inspectorState: InspectorState,
  setInspectorState: (state: InspectorState) => void,
): InspectorControl {
  const inspectorOpen = inspectorState !== 'closed';
  return useMemo(
    () => ({
      open: inspectorOpen,
      toggle: (): void => setInspectorState(inspectorOpen ? 'closed' : 'open'),
    }),
    [inspectorOpen, setInspectorState],
  );
}

function ChangesInspector(
  props: Pick<InspectorPaneProps, 'expanded' | 'onStateChange'>,
): React.JSX.Element {
  return (
    <InspectorPane title="Changes" {...props}>
      {null}
    </InspectorPane>
  );
}

function changesInspectorProps(
  inspectorState: InspectorState,
  setInspectorState: (state: InspectorState) => void,
): ShellInspectorProps {
  return {
    inspectorState,
    onInspectorStateChange: setInspectorState,
    inspector: (expanded) => (
      <ChangesInspector expanded={expanded} onStateChange={setInspectorState} />
    ),
  };
}

function useLayoutShell(props: DesktopLayoutViewProps): LayoutShell {
  const [inspectorState, setInspectorState] =
    useState<InspectorState>('closed');
  return {
    inspector: useInspectorControl(inspectorState, setInspectorState),
    shell: {
      ...useSectionProps(props),
      ...useSidebarProps(),
      ...changesInspectorProps(inspectorState, setInspectorState),
      attentionCount: props.attentionCount,
      list: props.list,
    },
  };
}

// The wide window's shell: the open section's list in the sidebar, `children` in the detail pane with its own header, and the Session's changes in the Inspector.
export function DesktopLayoutView(
  props: DesktopLayoutViewProps,
): React.JSX.Element {
  const { inspector, shell } = useLayoutShell(props);
  return (
    <InspectorProvider value={inspector}>
      <DesktopShell {...shell}>{props.children}</DesktopShell>
    </InspectorProvider>
  );
}
