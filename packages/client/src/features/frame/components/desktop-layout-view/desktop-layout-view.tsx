import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  type InspectorControl,
  InspectorProvider,
} from '#lib/product/inspector';
import { ListTitle } from '#lib/product/list-title';
import type { Section } from '../../../../lib/product/navigation/sections';
import { DesktopShell } from '../desktop-shell/desktop-shell';
import type {
  DesktopShellProps,
  InspectorState,
} from '../desktop-shell/desktop-shell-props';
import { InspectorPane, type InspectorPaneProps } from '../inspector-pane';
import { shellSections } from '../shell-sections';

export interface DesktopLayoutViewProps {
  section: Section;
  onSectionChange: (section: Section) => void;
  // The Sessions that need input or are Unread, for the rail's badge.
  attentionCount: number;
  // The open section's list, and the list's own part of the header row when it has one.
  list: ReactNode;
  listHeader?: ReactNode;
  // Floats over the top of the detail pane.
  banner?: ReactNode;
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

type LayoutShellProps = Omit<DesktopLayoutViewProps, 'children'>;

function sectionProps(props: LayoutShellProps): SectionShellProps {
  return {
    selectedSection: props.section,
    onSectionChange: props.onSectionChange,
    listHeader: props.listHeader ?? (
      <ListTitle>{shellSections[props.section].title}</ListTitle>
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

// The shell's props: the open section, the sidebar and the Inspector, each with its state.
export function useLayoutShell(props: LayoutShellProps): LayoutShell {
  const [inspectorState, setInspectorState] =
    useState<InspectorState>('closed');

  return {
    inspector: useInspectorControl(inspectorState, setInspectorState),
    shell: {
      ...sectionProps(props),
      ...useSidebarProps(),
      ...changesInspectorProps(inspectorState, setInspectorState),
      attentionCount: props.attentionCount,
      list: props.list,
      banner: props.banner,
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
