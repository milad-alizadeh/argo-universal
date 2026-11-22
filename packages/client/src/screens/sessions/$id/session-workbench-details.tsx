import type { Subagent } from '@repo/contracts';
import { useSheet } from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { ChangesFiles } from '#features/changes';
import {
  ChangeRows,
  resolveChangeStage,
  ShellOutput,
  type SessionPullRequest,
  shellTitle,
  shellStopAction,
  shellSupporting,
  shellRowMark,
  subagentStateLabel,
  workbenchPreviewLimit,
} from '#features/sessions';
import { subagentMarkDescriptor } from '../../../lib/product/subagents/subagent-role';
import { pullRequestsOf, summaryOf } from './sections/changes-facts';
import { withCheckoutFiles } from './sections/checkout-files';
import { openPullRequest } from './sections/open-pull-request';
import type { AgentFeedSlot } from './session-agents-tab';
import type { SessionInspectorContent } from './session-inspector-content';
import {
  type Visit,
  type WorkbenchRow,
  WorkbenchRowList,
} from './session-workbench-sheet-rows';

const filesPage = 'checkout-files';

const filesTitle = 'Changed files';

export function changeRows(
  content: SessionInspectorContent,
  onVisit: Visit,
): WorkbenchRow[] {
  const rows = pullRequestsOf(content).map((change, index) => ({
    ...changeRow(change, content.changes),
    hidden: index >= workbenchPreviewLimit,
  }));

  const more = rows.length - workbenchPreviewLimit;

  const action = content.createPullRequest;

  return [
    ...rows,
    ...(more > 0 ? [moreChanges(more, rows, onVisit)] : []),
    filesRow(content),
    ...(action ? [{ key: 'create-pr', label: 'Create PR', ...action }] : []),
  ];
}

const moreChanges = (
  more: number,
  rows: readonly WorkbenchRow[],
  onVisit: Visit,
): WorkbenchRow => ({
  key: 'changes:all',
  label: `${more} more`,
  page: {
    title: 'Changes',
    children: (
      <WorkbenchRowList label="Changes" rows={rows} onVisit={onVisit} />
    ),
  },
});

const filesRow = (content: SessionInspectorContent): WorkbenchRow => ({
  key: filesPage,
  label: filesTitle,
  leadingMark: {
    icon: 'diff',
    tone: 'neutral',
    label: filesTitle,
    plain: true,
  },
  value: summaryOf(content)?.files.toString(),
  page: {
    title: filesTitle,
    children: content.changes ? (
      <ChangesFiles {...content.changes} />
    ) : (
      <EmptyState icon="diff" title="No changes" />
    ),
  },
});

type Changes = SessionInspectorContent['changes'];

const changeRow = (
  change: SessionPullRequest,
  changes: Changes,
): WorkbenchRow => {
  const mark = resolveChangeStage(change);

  return {
    key: `change:${change.id ?? change.number}`,
    label: `#${change.number} ${change.title}`,
    leadingMark: mark,
    status: { label: mark.label },
    page: {
      title: `Change #${change.number}`,
      children: <ChangeDetail change={change} changes={changes} />,
    },
  };
};

type PullRequestDetail = { change: SessionPullRequest; changes: Changes };

function ChangeDetail({ change, changes }: PullRequestDetail): ReactNode {
  const { push } = useSheet();

  const rows = withCheckoutFiles([change], changes?.onComparisonChange, () =>
    push(filesPage),
  );

  return (
    <ScrollView className="flex-1">
      <ChangeRows changes={rows} onOpenChange={openPullRequest} />
    </ScrollView>
  );
}

export const agentRow = (
  agent: Subagent,
  content: SessionInspectorContent,
): WorkbenchRow => ({
  key: `agent:${agent.sessionId}`,
  label: agent.title,
  leadingMark: subagentMarkDescriptor(agent),
  status: { label: subagentStateLabel(agent) },
  onPress: () => content.subagents?.onSelect?.(agent),
  page: {
    title: agent.title,
    children: (
      <AgentDetail agent={agent} renderFeed={content.renderSubagentFeed} />
    ),
  },
});

function AgentDetail({
  agent,
  renderFeed,
}: {
  agent: Subagent;
  renderFeed?: AgentFeedSlot;
}): ReactNode {
  const sheet = useSheet();

  return (
    renderFeed?.({ subagent: agent, onBack: sheet.back }) ?? (
      <EmptyState icon="sparkle" title={subagentStateLabel(agent)} />
    )
  );
}

export type Tasks = NonNullable<SessionInspectorContent['shells']>;

export const taskRow = (
  shell: Tasks['shells'][number],
  props: Tasks,
): WorkbenchRow => {
  const mark = shellRowMark(shell);

  return {
    key: `task:${shell.id}`,
    label: shellTitle(shell),
    leadingMark: mark,
    status: { label: mark.status?.label ?? mark.label },
    value: shell.status === 'running' ? shellSupporting(shell) : undefined,
    onPress: () => (props.onSelectFromWorkbench ?? props.onSelect)?.(shell),
    page: {
      title: shellTitle(shell),
      action: shellStopAction(shell, props.onStop),
      onExit: props.onDeselect,
      children: taskOutput(shell, props),
    },
  };
};

const taskOutput = (
  shell: Tasks['shells'][number],
  { output, outputSource, now }: Tasks,
): ReactNode => (
  <ShellOutput
    shell={shell}
    output={output}
    outputSource={outputSource}
    now={now}
  />
);
