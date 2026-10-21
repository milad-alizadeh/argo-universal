import type { SessionHeaderProps, SessionPanels } from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';
import { offeredSessionPanels } from './session-inspector';

export const headerPanels = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): SessionHeaderProps['panels'] => ({
  offered: offeredSessionPanels(props),
  counts: sectionCounts(props),
  shown: panels.state.shown,
  changesSummary: props.header.changes?.summary,
  onSelect: panels.select,
  onToggle: (panel) =>
    panel === 'changes' ? panels.toggle(panel) : panels.select(panel),
});

function sectionCounts(
  props: OpenSessionViewProps,
): Partial<Record<'subagents' | 'shells', number>> {
  return { subagents: agentCount(props), shells: shellCount(props) };
}

const agentCount = (props: OpenSessionViewProps): number =>
  props.subagents?.subagents.length ?? 0;

const shellCount = (props: OpenSessionViewProps): number =>
  props.shells?.shells.length ?? 0;
