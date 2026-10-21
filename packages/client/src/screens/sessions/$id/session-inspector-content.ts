import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { ChangesViewProps } from '#features/changes';
import {
  type SessionHeaderProps,
  type SessionPanel,
  type ShellPanelProps,
  shellsRunning,
  ShellPanel,
  type SubagentListProps,
} from '#features/sessions';
import type {
  InspectorTab,
  InspectorProps,
} from '#primitives/scaffolds/inspector';
import { SessionAgentsStage, type AgentFeedSlot } from './session-agents-stage';
import { SessionChangesStage } from './session-changes-stage';

export interface SessionInspectorContent {
  changesRequest?: number;
  header?: SessionHeaderProps;
  renderSubagentFeed?: AgentFeedSlot;
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
  renderSubagentFeed,
}: SessionInspectorContent): PanelContent | undefined {
  if (!subagents?.subagents.length) return undefined;

  const running = subagents.subagents.some((one) => one.state !== 'idle');

  return {
    count: subagents.subagents.length,
    countTone: runningTone(running),
    body: createElement(SessionAgentsStage, {
      ...subagents,
      renderFeed: renderSubagentFeed,
    }),
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
    body: createElement(ShellPanel, { ...shells, listScrolls: true }),
  };
}

// Changes is always offered; until the page loads them it is empty.
function changesPanel(
  { changes, header, changesRequest }: SessionInspectorContent,
  scrollState?: InspectorProps['scrollState'],
): PanelContent {
  return {
    body: createElement(SessionChangesStage, {
      changes,
      header,
      scrollState,
      changesRequest,
    }),
  };
}

export const panelContent: Record<
  SessionPanel,
  (
    content: SessionInspectorContent,
    scrollState?: InspectorProps['scrollState'],
  ) => PanelContent | undefined
> = { subagents: subagentsPanel, shells: shellsPanel, changes: changesPanel };
