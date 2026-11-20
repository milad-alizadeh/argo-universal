import type { Subagent } from '@repo/contracts';
import { useSheet } from '@repo/kit/primitives/overlays/sheet';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';
import { ChangesFiles } from '#features/changes';
import {
  ChangeRows,
  ShellOutput,
  type SessionPullRequest,
  shellTitle,
  shellStopAction,
  shellSupporting,
  subagentStateLabel,
} from '#features/sessions';
import { pullRequestsOf, summaryOf } from './sections/changes-facts';
import { withCheckoutFiles } from './sections/checkout-files';
import { openPullRequest } from './sections/open-pull-request';
import type { AgentFeedSlot } from './session-agents-tab';
import type { SessionInspectorContent } from './session-inspector-content';
import type { WorkbenchRow } from './session-workbench-sheet-rows';

const filesPage = 'checkout-files';

export function changeRows(content: SessionInspectorContent): WorkbenchRow[] {
  const rows = pullRequestsOf(content).map((change) =>
    changeRow(change, content.changes),
  );

  const action = content.createPullRequest;

  return [
    ...rows,
    filesRow(content),
    ...(action ? [{ key: 'create-pr', label: 'Create PR', ...action }] : []),
  ];
}

const filesRow = (content: SessionInspectorContent): WorkbenchRow => ({
  key: filesPage,
  label: 'Changed files',
  value: summaryOf(content)?.files.toString(),
  page: {
    title: 'Changed files',
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
): WorkbenchRow => ({
  key: `change:${change.id ?? change.number}`,
  label: `#${change.number} ${change.title}`,
  page: {
    title: `Change #${change.number}`,
    children: <ChangeDetail change={change} changes={changes} />,
  },
});

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

export const agentRows = (content: SessionInspectorContent): WorkbenchRow[] =>
  (content.subagents?.subagents ?? []).map((agent) => agentRow(agent, content));

const agentRow = (
  agent: Subagent,
  content: SessionInspectorContent,
): WorkbenchRow => ({
  key: `agent:${agent.sessionId}`,
  label: agent.title,
  value: subagentStateLabel(agent),
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

type Tasks = NonNullable<SessionInspectorContent['shells']>;

export const taskRows = ({ shells }: SessionInspectorContent): WorkbenchRow[] =>
  shells?.shells.map((shell) => taskRow(shell, shells)) ?? [];

const taskRow = (
  shell: Tasks['shells'][number],
  props: Tasks,
): WorkbenchRow => ({
  key: `task:${shell.id}`,
  label: shellTitle(shell),
  value: shellSupporting(shell),
  onPress: () => (props.onSelectFromWorkbench ?? props.onSelect)?.(shell),
  page: {
    title: shellTitle(shell),
    action: shellStopAction(shell, props.onStop),
    onExit: props.onDeselect,
    children: taskOutput(shell, props),
  },
});

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
