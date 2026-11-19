import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { FeedProps } from '#features/feed';
import type { SessionPanels, SubagentListProps } from '#features/sessions';
import type {
  OpenSubagentFeed,
  SessionInspectorContent,
} from './session-inspector-content';
import {
  type OpenSubagent,
  selectSubagent,
  shellsSheet,
  type SubagentWork,
  subagentsSheet,
  type WorkSheet,
} from './session-work-sheet';
import {
  type SubagentSelection,
  useSubagentSelection,
} from './use-subagent-selection';
import { bothSheets } from './work-sheets';

interface WorkPanels {
  feed: FeedProps;
  // The Subagents the Session lists, selecting one opens its Feed in the sheet or the Inspector tab.
  subagents: SubagentListProps | undefined;
  openSubagentFeed: OpenSubagentFeed | undefined;
  sheets: ReactNode;
}

type WorkProps = SessionInspectorContent & {
  feed: FeedProps;
};

// The Feed memoises its rows on their props, so the opener it carries keeps one identity for the Session's life.
function useOpenSubagent(open: OpenSubagent): OpenSubagent {
  const latest = useRef(open);

  useEffect(() => {
    latest.current = open;
  }, [open]);

  return useCallback((sessionId: string) => latest.current(sessionId), []);
}

// Only a Session that has Subagents offers its Feed rows anything to open.
const feedWithSubagents = (
  feed: FeedProps,
  subagents: SubagentListProps | undefined,
  onOpenSubagent: OpenSubagent,
): FeedProps =>
  subagents?.subagents.length ? { ...feed, onOpenSubagent } : feed;

// A phone sheet and its Inspector tab are one panel: opening either shows the work at that width.
const panelOpening =
  (panels: SessionPanels, panel: string) =>
  (open: boolean): void =>
    open ? panels.select(panel) : panels.close(panel);

const sheetState = (
  panels: SessionPanels,
  panel: string,
  phoneVisible: boolean,
): WorkSheet => ({
  open: phoneVisible && panels.state.shown === panel,
  onOpenChange: panelOpening(panels, panel),
});

// A sheet opens on its list, so closing it closes the Agent's Feed too.
const closingFeed = (sheet: WorkSheet, closeFeed: () => void): WorkSheet => ({
  ...sheet,
  onOpenChange: (open) => {
    sheet.onOpenChange(open);

    if (!open) closeFeed();
  },
});

interface SubagentParts {
  selection: SubagentSelection;
  // What a Feed row asks for: the panel opened, then the Subagent it names.
  open: OpenSubagent;
  sheet: ReactNode;
}

// The Subagents list with the open Subagent's Feed, which the sheet pushes over it.
const listWithFeed = (selection: SubagentSelection): SubagentWork | undefined =>
  selection.list && { ...selection.list, feed: selection.page };

function useSubagentWork(
  props: WorkProps,
  panels: SessionPanels,
  phoneVisible: boolean,
): SubagentParts {
  const selection = useSubagentSelection(props);

  const state = closingFeed(
    sheetState(panels, 'subagents', phoneVisible),
    selection.close,
  );

  const sheet = subagentsSheet(listWithFeed(selection), state);
  const open = useOpenSubagent(selectSubagent(selection.list, state));

  return { selection, open, sheet };
}

// Workbench and Feed entry points share the Session's Inspector panels.
export function useWorkPanels(
  props: WorkProps,
  panels: SessionPanels,
  phoneVisible: boolean,
): WorkPanels {
  const agents = useSubagentWork(props, panels, phoneVisible);

  const shells = shellsSheet(
    props.shells,
    sheetState(panels, 'shells', phoneVisible),
  );

  return workParts(props, agents, shells);
}

function workParts(
  props: WorkProps,
  subagent: SubagentParts,
  shells: ReactNode,
): WorkPanels {
  return {
    feed: feedWithSubagents(props.feed, props.subagents, subagent.open),
    subagents: subagent.selection.list,
    openSubagentFeed: subagent.selection.open,
    sheets: bothSheets(subagent.sheet, shells),
  };
}
