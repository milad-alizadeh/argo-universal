import { Button, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { githubRepositoryFromOrigin } from './github-repository';
import { githubError } from './github-tracker';
import { loadIssue } from './issue-data';
import { IssueDetail } from './issue-detail';
import type { Issue, PageProps, IssueSelection } from './issue-types';

const headingRole = 'heading';

type GroupProps = PageProps & { title: string };

type IssueProps = GroupProps & { issue: Issue };

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

function ProjectSummary({ project, message }: PageProps): JSX.Element {
  return (
    <>
      <ProjectRepository project={project} />
      <StatusMessage message={message} />
    </>
  );
}

function ProjectRepository(
  props: Pick<PageProps, 'project'>,
): JSX.Element | null {
  if (!props.project) return null;

  return (
    <Text>
      {githubRepositoryFromOrigin(props.project.originUrl) ??
        'No GitHub remote'}
    </Text>
  );
}

const StatusMessage = ({ message }: { message: string }): JSX.Element | '' =>
  message && <Text>{message}</Text>;

function IssueGroups(props: PageProps): JSX.Element {
  return (
    <>
      <IssueGroup {...props} title="Open" />
      <IssueGroup {...props} title="Closed" />
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
      <IssueRows {...props} issues={visible} title={title} />
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

function IssueButtons(props: GroupProps): JSX.Element[] {
  return props.issues.map((issue) => (
    <IssueButton key={issue.number} {...props} issue={issue} />
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
  project,
  storage,
  trackers,
}: IssueProps): Promise<IssueSelection> {
  if (!project) throw new Error('Choose a Project.');

  return {
    type: 'issue',
    issue: await loadIssue({ project, issue, storage, trackers }),
  };
}

export { IssueDetail };
