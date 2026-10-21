import type { ReactNode } from 'react';
import { createElement, type JSX } from 'react';
import {
  ChangesFiles,
  useChangesStage,
  ChangesToolbar,
  ChangesSheetHeader,
  type ChangesViewProps,
} from '#features/changes';
import {
  type SessionPanel,
  sessionPanelLabels,
  sessionPanelOrder,
  type SessionPanels,
  ShellPanel,
  type ShellPanelProps,
  shellsRunning,
  SubagentList,
  type SubagentListProps,
} from '#features/sessions';
import {
  Inspector,
  type InspectorProps,
  type InspectorTab,
} from '#primitives/scaffolds/inspector';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

export interface SessionInspectorContent {
  subagents?: SubagentListProps;
  shells?: ShellPanelProps;
  // The Session's changed files; absent until the page loads them.
  changes?: ChangesViewProps;
}

// What one panel draws: its tab's count, its body and a toolbar over it.
type PanelContent = Pick<InspectorTab, 'count' | 'countTone'> & {
  body: ReactNode;
  toolbar?: ReactNode;
};

const runningTone = (running: boolean): InspectorTab['countTone'] =>
  running ? 'success' : 'muted';

function subagentsPanel({
  subagents,
}: SessionInspectorContent): PanelContent | undefined {
  if (!subagents?.subagents.length) return undefined;

  const running = subagents.subagents.some((one) => one.state !== 'idle');

  return {
    count: subagents.subagents.length,
    countTone: runningTone(running),
    body: createElement(SubagentList, subagents),
  };
}

function shellsPanel({
  shells,
}: SessionInspectorContent): PanelContent | undefined {
  if (!shells?.shells.length) return undefined;

  const running = shellsRunning(shells.shells);

  return {
    count: shells.shells.length,
    countTone: runningTone(running),
    body: createElement(ShellPanel, shells),
  };
}

// Changes is always offered; until the page loads them it is empty.
function changesPanel({ changes }: SessionInspectorContent): PanelContent {
  if (!changes) return { body: null };

  return {
    body: createElement(ChangesFiles, changes),
    toolbar: createElement(ChangesToolbar, changes),
  };
}

const panelContent: Record<
  SessionPanel,
  (content: SessionInspectorContent) => PanelContent | undefined
> = { subagents: subagentsPanel, shells: shellsPanel, changes: changesPanel };

export const offeredSessionPanels = (
  content: SessionInspectorContent,
): SessionPanel[] =>
  sessionPanelOrder.filter((panel) => panelContent[panel](content));

const tabOf = (
  panel: SessionPanel,
  content: SessionInspectorContent,
): InspectorTab => {
  const { count, countTone } = panelContent[panel](content) ?? {};

  return { key: panel, ...sessionPanelLabels[panel], count, countTone };
};

type SessionInspectorProps = SessionInspectorContent & {
  panels: SessionPanels;
};

function onPanel(run: (panel: SessionPanel) => void): (key: string) => void {
  return (key) => {
    const panel = sessionPanelOrder.find((one) => one === key);

    if (panel) run(panel);
  };
}

function inspectorTabs({
  panels,
  ...content
}: SessionInspectorProps): InspectorProps['tabs'] {
  return {
    items: panels.state.tabs.map((panel) => tabOf(panel, content)),
    selected: panels.state.shown ?? '',
    onSelect: onPanel(panels.select),
    onClose: onPanel(panels.close),
  };
}

function inspectorProps(props: SessionInspectorProps): InspectorProps {
  const { tabs, shown } = props.panels.state;

  return {
    title: panelTitle(shown),
    open: tabs.length > 0,
    onOpenChange: (open) => !open && props.panels.closeAll(),
    tabs: inspectorTabs(props),
    sheetHeader: changesSheetHeader(shown),
    toolbar: shown && panelContent[shown](props)?.toolbar,
  };
}

const panelTitle = (shown: SessionPanel | undefined): string =>
  shown ? sessionPanelLabels[shown].label : '';

const changesSheetHeader = (shown: SessionPanel | undefined): ReactNode =>
  shown === 'changes' ? createElement(ChangesSheetHeader) : undefined;

// Subagents and Shells have their own phone sheets, so their tabs are the wide window's alone.
const phonePanels = new Set<SessionPanel | undefined>(['subagents', 'shells']);

// The Session's Inspector: a tab for each panel opened from the header, showing one at a time.
export function SessionInspector(
  props: SessionInspectorProps,
): JSX.Element | null {
  const stage = useChangesStage(props.changes);
  const content = { ...props, changes: stage.changes };
  const inspector = renderInspector(content, stage);

  return phonePanels.has(props.panels.state.shown) ? (
    <SizeClass only="wide">{inspector}</SizeClass>
  ) : (
    inspector
  );
}

function shownPanel(props: SessionInspectorProps): PanelContent | undefined {
  const { shown } = props.panels.state;

  return shown ? panelContent[shown](props) : undefined;
}

const changesScroll = (
  shown: SessionPanel | undefined,
  stage: ReturnType<typeof useChangesStage>,
): InspectorProps['scrollState'] =>
  shown === 'changes' ? stage.scrollState : undefined;

function renderInspector(
  content: SessionInspectorProps,
  stage: ReturnType<typeof useChangesStage>,
): JSX.Element {
  const scrollState = changesScroll(content.panels.state.shown, stage);

  return createElement(
    Inspector,
    { ...inspectorProps(content), scrollState },
    shownPanel(content)?.body,
  );
}
