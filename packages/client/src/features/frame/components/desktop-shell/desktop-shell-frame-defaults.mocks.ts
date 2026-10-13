import type { DesktopShellProps } from './desktop-shell-props';

type FrameShellProps = Omit<
  DesktopShellProps,
  'children' | 'inspector' | 'listHeader' | 'list'
>;

type FrameShellInput = Partial<FrameShellProps>;

function frameNavigation({
  selectedSection = 'sessions',
  onSectionChange = () => {},
}: FrameShellInput): Pick<
  FrameShellProps,
  'selectedSection' | 'onSectionChange'
> {
  return { selectedSection, onSectionChange };
}

function frameSidebar({
  sidebarShown = true,
  onSidebarShownChange = () => {},
}: FrameShellInput): Pick<
  FrameShellProps,
  'sidebarShown' | 'onSidebarShownChange'
> {
  return { sidebarShown, onSidebarShownChange };
}

function frameInspectorState({
  inspectorState = 'closed',
  onInspectorStateChange = () => {},
}: FrameShellInput): Pick<
  FrameShellProps,
  'inspectorState' | 'onInspectorStateChange'
> {
  return { inspectorState, onInspectorStateChange };
}

export function frameShellProps(props: FrameShellInput): FrameShellProps {
  return {
    ...frameNavigation(props),
    ...frameSidebar(props),
    ...frameInspectorState(props),
    attentionCount: props.attentionCount ?? 1,
  };
}
