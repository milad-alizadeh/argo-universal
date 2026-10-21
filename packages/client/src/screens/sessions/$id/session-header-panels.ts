import type {
  SessionHeaderProps,
  SessionPanels,
  SessionPullRequest,
} from '#features/sessions';
import type { OpenSessionViewProps } from './session-detail-view';
import { offeredSessionPanels } from './session-inspector';

export const headerPanels = (
  props: OpenSessionViewProps,
  panels: SessionPanels,
): SessionHeaderProps['panels'] => ({
  offered: offeredSessionPanels(props),
  counts: sectionCounts(props),
  agents: props.subagents,
  checks: summarizeChecks(props.header.pullRequests),
  shown: panels.state.shown,
  changesSummary: props.header.changes?.summary,
  onSelect: panels.select,
  onToggle: (panel) =>
    panel === 'changes' ? panels.toggle(panel) : panels.select(panel),
});

function sectionCounts(
  props: OpenSessionViewProps,
): Partial<Record<'subagents' | 'shells' | 'changes', number>> {
  return {
    subagents: agentCount(props),
    shells: shellCount(props),
    changes: changeCount(props),
  };
}

const agentCount = (props: OpenSessionViewProps): number =>
  props.subagents?.subagents.length ?? 0;

const shellCount = (props: OpenSessionViewProps): number =>
  props.shells?.shells.length ?? 0;

const changeCount = (props: OpenSessionViewProps): number =>
  props.header.pullRequests?.length ?? 0;

type Checks = NonNullable<SessionPullRequest['checks']>;

function summarizeChecks(
  changes: readonly SessionPullRequest[] = [],
): Checks | undefined {
  const checked = changes.flatMap(({ checks }) => (checks ? [checks] : []));

  return checked.length ? checked.reduce(addChecks) : undefined;
}

function addChecks(total: Checks, checks: Checks): Checks {
  return {
    passed: total.passed + checks.passed,
    failing: total.failing + checks.failing,
    running: total.running + checks.running,
    total: total.total + checks.total,
  };
}
