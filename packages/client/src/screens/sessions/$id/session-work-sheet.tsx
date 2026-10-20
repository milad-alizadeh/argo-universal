import { createElement, type ReactNode } from 'react';
import type { ComposerProps } from '#features/composer';
import {
  ShellSheet,
  type ShellPanelProps,
  shellsRunning,
  SubagentSheet,
  type SubagentListProps,
} from '#features/sessions';
import { SizeClass } from '../../../lib/generic/size-class/size-class';

type ComposerStatus = NonNullable<ComposerProps['status']>;

// What the Composer's pill says about a panel's work.
type Work = NonNullable<ComposerStatus['subagents']>;

// How a panel's phone sheet opens and closes.
export interface WorkSheet {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface WorkPresentation {
  composer: ComposerProps;
  sheet: ReactNode;
}

// The Composer the pill belongs to, and the sheet it opens.
export interface WorkHome {
  composer: ComposerProps;
  sheet: WorkSheet;
}

/*
 * One kind of work a Session does beside its Feed: Subagents or Shells. Each fills its own
 * Composer pill and draws its own phone sheet; everything else about them is the same.
 */
export interface WorkPanel<Props> {
  // The Composer status field this panel's pill fills.
  pill: keyof Pick<ComposerStatus, 'subagents' | 'shells'>;
  count: (props: Props) => number;
  running: (props: Props) => boolean;
  sheet: (props: Props, sheet: WorkSheet) => ReactNode;
}

// A Session with none of this work has nothing to show, so it gets no pill and no sheet.
const shownWork = <Props,>(
  panel: WorkPanel<Props>,
  props: Props | undefined,
): Props | undefined => (props && panel.count(props) > 0 ? props : undefined);

// The pill counts the work, says whether any of it is running, and opens the sheet.
const pillWork = <Props,>(
  panel: WorkPanel<Props>,
  props: Props,
  sheet: WorkSheet,
): Work => ({
  count: panel.count(props),
  running: panel.running(props),
  onPress: () => sheet.onOpenChange(true),
});

const composerWithPill = <Props,>(
  panel: WorkPanel<Props>,
  props: Props,
  home: WorkHome,
): ComposerProps => ({
  ...home.composer,
  status: {
    ...home.composer.status,
    [panel.pill]: pillWork(panel, props, home.sheet),
  },
});

// The Composer's pill for this work, and the sheet it opens — a phone's stand-in for the Inspector tab.
export function useWorkSheet<Props>(
  panel: WorkPanel<Props>,
  props: Props | undefined,
  home: WorkHome,
): WorkPresentation {
  const work = shownWork(panel, props);

  if (!work) return { composer: home.composer, sheet: null };

  return {
    composer: composerWithPill(panel, work, home),
    sheet: (
      <SizeClass only="compact">{panel.sheet(work, home.sheet)}</SizeClass>
    ),
  };
}

// Picking a Subagent leaves the sheet for its page, so the sheet closes first.
const selectAndClose = (
  props: SubagentListProps,
  sheet: WorkSheet,
): SubagentListProps['onSelect'] => {
  if (!props.onSelect) return undefined;

  return (selected): void => {
    sheet.onOpenChange(false);
    props.onSelect?.(selected);
  };
};

export const subagentsPanel: WorkPanel<SubagentListProps> = {
  pill: 'subagents',
  count: (props) => props.subagents.length,
  running: (props) => props.subagents.some((item) => item.state !== 'idle'),
  sheet: (props, sheet) =>
    createElement(SubagentSheet, {
      ...props,
      ...sheet,
      onSelect: selectAndClose(props, sheet),
    }),
};

export const shellsPanel: WorkPanel<ShellPanelProps> = {
  pill: 'shells',
  count: (props) => props.shells.length,
  running: (props) => shellsRunning(props.shells),
  sheet: (props, sheet) => createElement(ShellSheet, { ...props, ...sheet }),
};

// What a Subagent row in the Feed asks for: the child's own Feed, named by its session.
export type OpenSubagent = (subagentSessionId: string) => void;

const selectNamed = (
  props: SubagentListProps,
  subagentSessionId: string,
): void => {
  const named = props.subagents.find(
    (one) => one.sessionId === subagentSessionId,
  );

  if (named) props.onSelect?.(named);
};

// A Feed row opens the same place its Subagents list row does: the panel, then the child it names.
export const selectSubagent =
  (props: SubagentListProps | undefined, sheet: WorkSheet): OpenSubagent =>
  (subagentSessionId) => {
    sheet.onOpenChange(true);

    if (props) selectNamed(props, subagentSessionId);
  };
