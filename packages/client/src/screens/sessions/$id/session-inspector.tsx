import type { ReactNode } from 'react';
import { createElement, type JSX } from 'react';
import {
  ChangesFiles,
  ChangesToolbar,
  type ChangesViewProps,
} from '#features/changes';
import {
  type SessionPanel,
  sessionPanelLabels,
  sessionPanelOrder,
  type SessionPanels,
  SubagentList,
  type SubagentListProps,
} from '#features/sessions';
import {
  Inspector,
  type InspectorProps,
  type InspectorTab,
} from '#primitives/scaffolds/inspector';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

// A Session's Shells, which the Shells panel lists; the Shells page fills it.
export interface SessionShellsPanel {
  count: number;
  running: boolean;
  panel: ReactNode;
}

export interface SessionInspectorContent {
  subagents?: SubagentListProps;
  shells?: SessionShellsPanel;
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
  if (!shells?.count) return undefined;

  return {
    count: shells.count,
    countTone: runningTone(shells.running),
    body: shells.panel,
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

// Each panel's content, or nothing where the Session has none: Subagents and Shells while it has any.
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

// The tab's key back to its panel; the Inspector only hands back keys it was given.
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
    toolbar: shown && panelContent[shown](props)?.toolbar,
  };
}

const panelTitle = (shown: SessionPanel | undefined): string =>
  shown ? sessionPanelLabels[shown].label : '';

// The Session's Inspector: a tab for each panel opened from the header, showing one at a time.
export function SessionInspector(
  props: SessionInspectorProps,
): JSX.Element | null {
  const { shown } = props.panels.state;

  const inspector = createElement(
    Inspector,
    inspectorProps(props),
    shownPanel(props)?.body,
  );

  return shown === 'subagents' ? (
    <SizeClass only="wide">{inspector}</SizeClass>
  ) : (
    inspector
  );
}

function shownPanel(props: SessionInspectorProps): PanelContent | undefined {
  const { shown } = props.panels.state;

  return shown ? panelContent[shown](props) : undefined;
}
