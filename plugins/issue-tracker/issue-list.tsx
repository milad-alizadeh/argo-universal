import { Button, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue } from './github-issues';
import { githubError, githubRepositoryFromOrigin } from './github-tracker';
import { loadIssue } from './issue-data';
import { IssueDetail } from './issue-detail';
import type { IssueSelection, PageProps } from './use-issues';

const headingRole = 'heading';

type GroupProps = PageProps & { title: string };

type IssueProps = Omit<GroupProps, 'issues'> & { issue: Issue };

export function IssueList(props: PageProps): JSX.Element {
  return (
    <Stack direction="column" gap={3}>
      <IssueHeading />
      <ProjectChoices {...props} />
      <ProjectSummary {...props} />
      <IssueGroups {...props} />
    </Stack>
  );
}

function IssueHeading(): JSX.Element {
  return <Text role={headingRole}>Issues</Text>;
}

function ProjectChoices(props: PageProps): JSX.Element {
  const { projectId, onIssue } = props;

  return (
    <Stack direction="column" gap={2}>
      {props.projects.map((project) => (
        <Button
          key={project.id}
          label={project.name}
          variant={project.id === projectId ? 'default' : 'outline'}
          onPress={() => onIssue({ type: 'project', id: project.id })}
        />
      ))}
    </Stack>
  );
}

function ProjectSummary({
  projects,
  projectId,
  message,
}: PageProps): JSX.Element {
  return (
    <>
      <ProjectRepository projects={projects} projectId={projectId} />
      <StatusMessage message={message} />
    </>
  );
}

function ProjectRepository({
  projects,
  projectId,
}: Pick<PageProps, 'projects' | 'projectId'>): JSX.Element | null {
  const project = projects.find((row) => row.id === projectId);

  if (!project) return null;

  return (
    <Text>
      {githubRepositoryFromOrigin(project.originUrl) ?? 'No GitHub remote'}
    </Text>
  );
}

const StatusMessage = ({ message }: { message: string }): JSX.Element | '' =>
  message && <Text>{message}</Text>;

function IssueGroups(props: PageProps): JSX.Element {
  return (
    <>
      <IssueGroup title="Open" {...props} />
      <IssueGroup title="Closed" {...props} />
    </>
  );
}

function IssueGroup({ title, issues, ...props }: GroupProps): JSX.Element {
  const visible = issues.filter(
    (issue) => issue.status === title.toLowerCase(),
  );

  return (
    <Stack direction="column" gap={2}>
      <Text role={headingRole}>{title}</Text>
      <IssueRows issues={visible} title={title} {...props} />
    </Stack>
  );
}

function IssueRows(props: GroupProps): JSX.Element {
  return (
    <>
      {emptyState(props.title, props.issues)}
      <IssueButtons {...props} />
    </>
  );
}

function IssueButtons({ issues, ...props }: GroupProps): JSX.Element[] {
  return issues.map((issue) => (
    <IssueButton key={issue.number} issue={issue} {...props} />
  ));
}

function emptyState(title: string, issues: Issue[]): JSX.Element | false {
  return (
    issues.length === 0 && <Text>{`No ${title.toLowerCase()} Issues.`}</Text>
  );
}

function IssueButton(props: IssueProps): JSX.Element {
  return (
    <Button
      label={`#${props.issue.number}  ${props.issue.title}`}
      variant="outline"
      onPress={() => void fetchIssue(props)}
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

export { IssueDetail };
