import { Button, Column, Text } from '@argo/plugin-kit';

const headingRole = 'heading';

export function IssueDetail(props) {
  const { issue } = props;

  return (
    <Column gap={3}>
      <Button label="Back to Issues" variant="outline" onPress={props.onBack} />
      <Text role={headingRole}>{`#${issue.number} ${issue.title}`}</Text>
      <IssueMetadata issue={issue} />
      <Button
        label="Open in GitHub"
        variant="outline"
        onPress={{ action: 'openUrl', url: issue.url }}
      />
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
