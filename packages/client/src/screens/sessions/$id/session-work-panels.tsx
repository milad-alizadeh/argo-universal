import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { ComposerProps } from '#features/composer';
import type { FeedProps } from '#features/feed';
import type { SessionPanels, SubagentListProps } from '#features/sessions';
import type {
  OpenSubagentFeed,
  SessionInspectorContent,
} from './session-inspector-content';
import {
  type OpenSubagent,
  selectSubagent,
  shellsPanel,
  type SubagentWork,
  subagentsPanel,
  useWorkSheet,
  type WorkHome,
  type WorkPresentation,
} from './session-work-sheet';
import {
  type SubagentSelection,
  useSubagentSelection,
} from './use-subagent-selection';
import { bothSheets } from './work-sheets';

interface WorkPanels {
  composer: ComposerProps;
  feed: FeedProps;
  // The Subagents the Session lists, selecting one opens its Feed in the sheet or the Inspector tab.
  subagents: SubagentListProps | undefined;
  openSubagentFeed: OpenSubagentFeed | undefined;
  sheets: ReactNode;
}

type WorkProps = SessionInspectorContent & {
  composer: ComposerProps;
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

// Where a panel's pill and sheet live: this Composer, and the sheet the pill opens.
const workHome = (
  composer: ComposerProps,
  panels: SessionPanels,
  { panel, phoneVisible }: { panel: string; phoneVisible: boolean },
): WorkHome => ({
  composer,
  sheet: {
    open: phoneVisible && panels.state.shown === panel,
    onOpenChange: panelOpening(panels, panel),
  },
});

// A sheet opens on its list, so closing it closes the Subagent's Feed too.
const closingFeed = (home: WorkHome, closeFeed: () => void): WorkHome => ({
  ...home,
  sheet: {
    ...home.sheet,
    onOpenChange: (open) => {
      home.sheet.onOpenChange(open);

      if (!open) closeFeed();
    },
  },
});

interface SubagentParts {
  selection: SubagentSelection;
  // What a Feed row asks for: the panel opened, then the Subagent it names.
  open: OpenSubagent;
  sheet: WorkPresentation;
}

// The Subagents list with the open Subagent's Feed, which the sheet pushes over it.
const listWithFeed = (selection: SubagentSelection): SubagentWork | undefined =>
  selection.list && { ...selection.list, feed: selection.page };

function subagentHome(
  composer: ComposerProps,
  panels: SessionPanels,
  { close, phoneVisible }: { close: () => void; phoneVisible: boolean },
): WorkHome {
  return closingFeed(
    workHome(composer, panels, { panel: 'subagents', phoneVisible }),
    close,
  );
}

function useSubagentWork(
  props: WorkProps,
  panels: SessionPanels,
  phoneVisible: boolean,
): SubagentParts {
  const selection = useSubagentSelection(props);

  const home = subagentHome(props.composer, panels, {
    close: selection.close,
    phoneVisible,
  });

  return useSubagentParts(selection, home);
}

function useSubagentParts(
  selection: SubagentSelection,
  home: WorkHome,
): SubagentParts {
  const sheet = useWorkSheet(subagentsPanel, listWithFeed(selection), home);
  const open = useOpenSubagent(selectSubagent(selection.list, home.sheet));

  return { selection, open, sheet };
}

/*
 * The Session's Subagents and Shells: a Composer pill and a sheet each on a phone, the Inspector's
 * tabs when wide. The pills chain, so the Composer carries both.
 */
export function useWorkPanels(
  props: WorkProps,
  panels: SessionPanels,
  phoneVisible: boolean,
): WorkPanels {
  const { selection, open, sheet } = useSubagentWork(
    props,
    panels,
    phoneVisible,
  );

  const shells = useShellWork(props, panels, { sheet, phoneVisible });

  return workParts(props, { selection, open, sheet }, shells);
}

function useShellWork(
  props: WorkProps,
  panels: SessionPanels,
  { sheet, phoneVisible }: { sheet: WorkPresentation; phoneVisible: boolean },
): WorkPresentation {
  const home = workHome(sheet.composer, panels, {
    panel: 'shells',
    phoneVisible,
  });

  return useWorkSheet(shellsPanel, props.shells, home);
}

function workParts(
  props: WorkProps,
  subagent: SubagentParts,
  shells: WorkPresentation,
): WorkPanels {
  return {
    composer: shells.composer,
    feed: feedWithSubagents(props.feed, props.subagents, subagent.open),
    subagents: subagent.selection.list,
    openSubagentFeed: subagent.selection.open,
    sheets: bothSheets(subagent.sheet, shells),
  };
}
