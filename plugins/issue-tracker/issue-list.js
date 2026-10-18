import { Button, Column, Text } from '@argo/plugin-kit';
import { githubError, githubRepositoryFromOrigin } from './github-tracker.js';
import { loadIssue } from './issue-data.js';
import { IssueDetail } from './issue-detail.js';

export function IssueList(props) {
  return (
    <Column gap={3}>
      <IssueHeading />
      <ProjectChoices {...props} />
      <ProjectSummary {...props} />
      <IssueGroups {...props} />
    </Column>
  );
}

function IssueHeading() {
  return <Text variant="heading">Issues</Text>;
}

function ProjectChoices({ projects, projectId, onIssue }) {
  return (
    <Column gap={2}>
      {projects.map((project) => (
        <Button
          key={project.id}
          label={project.name}
          variant={project.id === projectId ? 'default' : 'outline'}
          onPress={() => onIssue({ type: 'project', id: project.id })}
        />
      ))}
    </Column>
  );
}

function ProjectSummary({ projects, projectId, message }) {
  return (
    <>
      <ProjectRepository projects={projects} projectId={projectId} />
      <StatusMessage message={message} />
    </>
  );
}

function ProjectRepository({ projects, projectId }) {
  const project = projects.find((row) => row.id === projectId);

  if (!project) return null;

  return (
    <Text>
      {githubRepositoryFromOrigin(project.originUrl) ?? 'No GitHub remote'}
    </Text>
  );
}

const StatusMessage = ({ message }) => message && <Text>{message}</Text>;

function IssueGroups(props) {
  return (
    <>
      <IssueGroup title="Open" {...props} />
      <IssueGroup title="Closed" {...props} />
    </>
  );
}

function IssueGroup({ title, issues, ...props }) {
  const visible = issues.filter(
    (issue) => issue.status === title.toLowerCase(),
  );

  return (
    <Column gap={2}>
      <Text variant="heading">{title}</Text>
      <IssueRows issues={visible} title={title} {...props} />
    </Column>
  );
}

function IssueRows(props) {
  return (
    <>
      {emptyState(props.title, props.issues)}
      <IssueButtons {...props} />
    </>
  );
}

function IssueButtons({ issues, ...props }) {
  return issues.map((issue) => (
    <IssueButton key={issue.number} issue={issue} {...props} />
  ));
}

function emptyState(title, issues) {
  return (
    issues.length === 0 && <Text>{`No ${title.toLowerCase()} Issues.`}</Text>
  );
}

function IssueButton(props) {
  return (
    <Button
      label={`#${props.issue.number}  ${props.issue.title}`}
      variant="outline"
      onPress={() => void fetchIssue(props)}
    />
  );
}

async function fetchIssue(props) {
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
}) {
  const project = projects.find((row) => row.id === projectId);

  return {
    type: 'issue',
    issue: await loadIssue({ project, issue, storage, trackers }),
  };
}

export { IssueDetail };
