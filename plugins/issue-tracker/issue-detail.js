import { Button, Column, Text, useState } from '@argo/plugin-kit';
import { tracker } from './tracker-registry.js';
import { updateCache } from './tracker-storage.js';
import { githubError } from './use-issues.js';

export function IssueDetail(props) {
  const { issue } = props;
  const [message, setMessage] = useState('');
  const changeStatus = () => updateIssueStatus({ ...props, setMessage });

  return (
    <Column gap={3}>
      <Button label="Back to Issues" variant="outline" onPress={props.onBack} />
      <Text variant="heading">{`#${issue.number} ${issue.title}`}</Text>
      <IssueMetadata issue={issue} />
      {message && <Text>{message}</Text>}
      <IssueActions issue={issue} changeStatus={changeStatus} />
    </Column>
  );
}

function IssueMetadata({ issue }) {
  return (
    <>
      <IssueDescription body={issue.body} />
      <IssueLabels labels={issue.labels} />
      <IssueAssignees assignees={issue.assignees} />
    </>
  );
}

const IssueDescription = ({ body }) => <Text>{body || 'No description.'}</Text>;

const IssueLabels = ({ labels }) => (
  <Text>Labels: {labels.join(', ') || 'None'}</Text>
);

const IssueAssignees = ({ assignees }) => (
  <Text>Assignees: {assignees.join(', ') || 'None'}</Text>
);

function IssueActions({ issue, changeStatus }) {
  const label = issue.status === 'open' ? 'Close Issue' : 'Reopen Issue';

  return (
    <Column gap={2}>
      <Button label={label} onPress={changeStatus} />
      <Button
        label="Open in GitHub"
        variant="outline"
        onPress={{ action: 'openUrl', url: issue.url }}
      />
    </Column>
  );
}

async function updateIssueStatus({
  issue,
  project,
  projectId,
  onChanged,
  setMessage,
}) {
  try {
    await persistStatusUpdate({ issue, project, projectId, onChanged });
  } catch (error) {
    setMessage(githubError(error));
  }
}

async function persistStatusUpdate({ issue, project, projectId, onChanged }) {
  const connection = tracker('github').createConnection(project.repository);
  const updated = await changeIssueStatus(connection, issue);
  await updateCache(projectId, updated);
  onChanged(updated);
}

async function changeIssueStatus(connection, issue) {
  const next = issue.status === 'open' ? 'closed' : 'open';
  await connection.setStatus(issue.number, next);

  return connection.getIssue(issue.number);
}
