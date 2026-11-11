import {
  Action,
  Label,
  ListItem,
  Pill,
  type PageTo,
  type PluginProps,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { FilterState } from './filter-loader';
import type { Issue } from './github-issues';
import type { Project } from './issue-client';
import { issuePath } from './issue-paths';
import { statusMark } from './issue-status-mark';
import { statuses } from './issue-status-view';
import type { IssueNode } from './issue-tree';
import { labelPills } from './label-pills';

export type RowSource = {
  project: Project;
  to: PageTo<FilterState>;
};

// A keyed ListItem itself, as a List draws its children; its sub-Issues nest inside.
export function issueRow(source: RowSource, node: IssueNode): JSX.Element {
  return (
    <ListItem
      key={node.issue.number}
      {...rowProps(source, node.issue)}
      actions={[statusAction(source, node.issue)]}
    >
      {node.children.map((child) => issueRow(source, child))}
    </ListItem>
  );
}

type RowProps = Pick<
  PluginProps['ListItem'],
  'id' | 'leading' | 'title' | 'subtitle' | 'finished' | 'onPress' | 'meta'
>;

const rowProps = ({ project, to }: RowSource, issue: Issue): RowProps => ({
  id: String(issue.number),
  leading: statusMark(issue, `mark-${issue.number}`),
  title: issue.title,
  subtitle: `#${issue.number}`,
  finished: issue.status !== 'open',
  onPress: to.go(issuePath(project.id, issue.number)),
  meta: rowMeta(issue),
});

// What the row says about the Issue's relations before its labels.
const rowMeta = (issue: Issue): JSX.Element[] => [
  ...blockedMark(issue),
  ...progressMark(issue),
  ...labelPills(issue.labels),
];

/*
 * Spike-only UI: the row's menu closes or reopens its Issue, so one write runs as an Operation. The
 * row shows its new status at once and rolls back if gh refuses.
 */
function statusAction(source: RowSource, issue: Issue): JSX.Element {
  const { change } = statuses[issue.status];

  return (
    <Action
      key={`status-${issue.number}`}
      label={change.label}
      icon={change.icon}
      onPress={statusRun(source, issue, change.to)}
    />
  );
}

// The call, and what the row, its mark and its menu show until it settles.
const statusRun = (
  { project, to }: RowSource,
  { number }: Issue,
  status: Issue['status'],
): ReturnType<RowSource['to']['run']> =>
  to.run(
    'setStatus',
    { number, status, projectId: project.id },
    { optimistic: statusPatches(number, status) },
  );

type Patch = NonNullable<
  ReturnType<RowSource['to']['run']>['optimistic']
>[number];

const statusPatches = (number: number, status: Issue['status']): Patch[] => [
  { key: String(number), props: { finished: status !== 'open' } },
  { key: `mark-${number}`, props: markProps(status) },
  {
    key: `status-${number}`,
    props: {
      label: statuses[status].change.label,
      icon: statuses[status].change.icon,
    },
  },
];

// The Icon props of the mark the row changes to; the element's own props also carry its children and key.
function markProps(status: Issue['status']): Patch['props'] {
  const { name, tone, size, filled } = statusMark({ status }).props;

  return { name, tone, size, filled };
}

function blockedMark(issue: Issue): JSX.Element[] {
  const open = (issue.blockedBy ?? []).filter(
    (blocker) => blocker.status === 'open',
  ).length;

  if (open === 0) return [];

  return [
    <Label
      key="blocked"
      icon="refused"
      text={blockedText(open)}
      tone="warning"
    />,
  ];
}

const blockedText = (open: number): string =>
  open === 1 ? 'Blocked' : `Blocked by ${open}`;

function progressMark({ progress }: Issue): JSX.Element[] {
  if (!progress) return [];

  return [
    <Pill
      key="progress"
      text={`${progress.completed} / ${progress.total}`}
      tone="muted"
    />,
  ];
}
