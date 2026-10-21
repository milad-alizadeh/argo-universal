import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { ComposerProps } from '#features/composer';
import type { FeedProps } from '#features/feed';
import type {
  SessionPanel,
  SessionPanels,
  SubagentListProps,
} from '#features/sessions';
import type { SessionInspectorContent } from './session-inspector';
import {
  type OpenSubagent,
  selectSubagent,
  shellsPanel,
  subagentsPanel,
  useWorkSheet,
  type WorkHome,
  type WorkPresentation,
} from './session-work-sheet';

interface WorkPanels {
  composer: ComposerProps;
  feed: FeedProps;
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
  (panels: SessionPanels, panel: SessionPanel) =>
  (open: boolean): void =>
    open ? panels.select(panel) : panels.close(panel);

// Where a panel's pill and sheet live: this Composer, and the sheet the pill opens.
const workHome = (
  composer: ComposerProps,
  panels: SessionPanels,
  panel: SessionPanel,
): WorkHome => ({
  composer,
  sheet: {
    open: panels.state.shown === panel,
    onOpenChange: panelOpening(panels, panel),
  },
});

/*
 * The Session's Subagents and Shells: a Composer pill and a sheet each on a phone, the Inspector's
 * tabs when wide. The pills chain, so the Composer carries both.
 */
export function useWorkPanels(
  props: WorkProps,
  panels: SessionPanels,
): WorkPanels {
  const home = workHome(props.composer, panels, 'subagents');
  const subagents = useWorkSheet(subagentsPanel, props.subagents, home);
  const next = workHome(subagents.composer, panels, 'shells');
  const shells = useWorkSheet(shellsPanel, props.shells, next);
  const open = useOpenSubagent(selectSubagent(props.subagents, home.sheet));

  return {
    composer: shells.composer,
    feed: feedWithSubagents(props.feed, props.subagents, open),
    sheets: bothSheets(subagents, shells),
  };
}

// Both work sheets mount together; each draws only at its own width and when its panel is shown.
const bothSheets = (
  subagents: WorkPresentation,
  shells: WorkPresentation,
): ReactNode => (
  <>
    {subagents.sheet}
    {shells.sheet}
  </>
);
