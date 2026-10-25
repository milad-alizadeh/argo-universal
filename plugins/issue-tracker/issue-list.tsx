import {
  EmptyState,
  Label,
  List,
  ListDetail,
  ListItem,
  Pill,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { githubError, githubRepositoryFromOrigin } from './github-tracker';
import { loadIssue } from './issue-data';
import { IssueDetail } from './issue-detail';
import type { IssueSelection, PageProps } from './use-issues';

type ListProps = PageProps & { selected?: Issue };

type IssueProps = Omit<ListProps, 'issues'> & { issue: Issue };

const noRemote = 'No GitHub remote';

const statuses = [
  { title: 'Open', status: 'open' },
  { title: 'Closed', status: 'closed' },
];

const noSelection = (
  <EmptyState
    title="Select an Issue"
    description="Choose an Issue from the list."
  />
);

export function IssuePageView({ selected, ...props }: ListProps): JSX.Element {
  return (
    <ListDetail
      title="Issues"
      list={<IssueList {...props} selected={selected} />}
      detail={selected && <IssueDetail {...props} issue={selected} />}
      empty={noSelection}
    />
  );
}

function IssueList(props: ListProps): JSX.Element {
  const { issues, message } = props;

  return (
    <List
      appearance="plain"
      header={<RepositoryLabel {...props} />}
      footer={issues.length > 0 ? message : undefined}
      empty={<EmptyState title={message || 'No Issues.'} />}
    >
      {projectSection(props)}
      {issueSections(props)}
    </List>
  );
}

function RepositoryLabel(props: ListProps): JSX.Element {
  const project = props.projects.find((row) => row.id === props.projectId);
  const repository = githubRepositoryFromOrigin(project?.originUrl);

  return (
    <Label
      text={repositoryText(project?.name, repository)}
      icon="git-issue-open"
    />
  );
}

function repositoryText(name = '', repository: string | null): string {
  return [name, repository ?? noRemote].filter(Boolean).join(' · ');
}

// A Project to show Issues of, only when there is a choice.
function projectSection(props: ListProps): JSX.Element | null {
  if (props.projects.length < 2) return null;

  return (
    <List.Section key="projects" title="Project">
      {props.projects.map((project) => (
        <ListItem
          key={project.id}
          title={project.name}
          selected={project.id === props.projectId}
          onPress={() => props.onIssue({ type: 'project', id: project.id })}
        />
      ))}
    </List.Section>
  );
}

function issueSections(props: ListProps): JSX.Element[] {
  return statuses.flatMap(({ title, status }) => {
    const issues = props.issues.filter((issue) => issue.status === status);

    return issues.length === 0 ? [] : issueSection(props, title, issues);
  });
}

function issueSection(
  props: ListProps,
  title: string,
  issues: Issue[],
): JSX.Element {
  return (
    <List.Section key={title} title={title}>
      {issues.map((issue) => (
        <IssueRow key={issue.number} {...props} issue={issue} />
      ))}
    </List.Section>
  );
}

function IssueRow(props: IssueProps): JSX.Element {
  const { issue } = props;

  return (
    <ListItem
      title={issue.title}
      subtitle={`#${issue.number}`}
      selected={props.selected?.number === issue.number}
      onPress={() => void fetchIssue(props)}
      meta={issue.labels.map((label) => (
        <Pill key={label} text={label} />
      ))}
    />
  );
}

async function fetchIssue(props: IssueProps): Promise<void> {
  try {
    props.onIssue(await selectedIssue(props));
  } catch (error) {
    props.setMessage(githubError(error));
  }
}

async function selectedIssue({
  issue,
  projects,
  projectId,
  storage,
  trackers,
}: IssueProps): Promise<IssueSelection> {
  const project = projects.find((row) => row.id === projectId);

  return {
    type: 'issue',
    // oxlint-disable-next-line typescript/no-non-null-assertion -- As in JavaScript, a missing Project fails on reading its id.
    issue: await loadIssue({ project: project!, issue, storage, trackers }),
  };
}
