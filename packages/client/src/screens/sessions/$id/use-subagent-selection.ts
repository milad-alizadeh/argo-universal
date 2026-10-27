import type { Subagent } from '@repo/contracts';
import { useCallback, useMemo, useState } from 'react';
import type { SubagentListProps } from '#features/sessions';
import type { AgentFeedSlot } from './session-agents-tab';
import type { OpenSubagentFeed } from './session-inspector-content';
import type { SubagentWork } from './session-work-sheet';

interface SubagentSource {
  subagents?: SubagentListProps;
  renderSubagentFeed?: AgentFeedSlot;
}

export interface SubagentSelection {
  // The Subagents list, whose rows select a Subagent.
  list: SubagentListProps | undefined;
  // The Feed open over the list, as the Inspector's tab draws it.
  open: OpenSubagentFeed | undefined;
  // The Feed open over the list, as the phone sheet pushes it.
  page: SubagentWork['feed'];
  close: () => void;
}

const feedPage = (
  subagent: Subagent | undefined,
  renderFeed: AgentFeedSlot | undefined,
  onBack: () => void,
): SubagentWork['feed'] =>
  subagent &&
  renderFeed && { subagent, onBack, content: renderFeed({ subagent, onBack }) };

const openOne = (
  list: SubagentListProps | undefined,
  sessionId: string | null,
): Subagent | undefined =>
  list?.subagents.find((one) => one.sessionId === sessionId);

const selectable = (
  list: SubagentListProps | undefined,
  select: (sessionId: string) => void,
): SubagentListProps | undefined =>
  list && {
    ...list,
    onSelect: (one) => {
      select(one.sessionId);
      list.onSelect?.(one);
    },
  };

const useFeedPage = (
  subagent: Subagent | undefined,
  renderFeed: AgentFeedSlot | undefined,
  onBack: () => void,
): SubagentWork['feed'] =>
  useMemo(
    () => feedPage(subagent, renderFeed, onBack),
    [subagent, renderFeed, onBack],
  );

/*
 * Which Subagent's Feed is open belongs to the Session: its list rows, its Feed rows, the phone sheet and
 * the Inspector's tab all open and close the same one.
 */
export function useSubagentSelection(
  source: SubagentSource,
): SubagentSelection {
  const [selected, select] = useState<string | null>(null);
  const subagent = openOne(source.subagents, selected);
  const close = useCallback(() => select(null), []);

  return {
    list: selectable(source.subagents, select),
    open: subagent && { sessionId: subagent.sessionId, onBack: close },
    page: useFeedPage(subagent, source.renderSubagentFeed, close),
    close,
  };
}
