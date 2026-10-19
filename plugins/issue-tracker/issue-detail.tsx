import { Button, Stack, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { Issue, PageProps } from './issue-types';

const headingRole = 'heading';

type IssueDetailProps = PageProps & { issue: Issue };

export function IssueDetail(props: IssueDetailProps): JSX.Element {
  const { issue } = props;

  return (
    <Stack direction="column" gap={3}>
      <Button label="Back to Issues" variant="outline" onPress={props.onBack} />
      <Text role={headingRole}>{`#${issue.number} ${issue.title}`}</Text>
      <IssueMetadata issue={issue} />
      <Button
        label="Open in GitHub"
        variant="outline"
        onPress={{ action: 'openUrl', url: issue.url }}
      />
    </Stack>
  );
}

function IssueMetadata({ issue }: { issue: Issue }): JSX.Element {
  return (
    <>
      <IssueDescription body={issue.body} />
      <IssueLabels labels={issue.labels} />
      <IssueAssignees assignees={issue.assignees} />
    </>
  );
}

const IssueDescription = ({ body }: { body: string }): JSX.Element => (
  <Text>{body || 'No description.'}</Text>
);

const IssueLabels = ({ labels }: { labels: string[] }): JSX.Element => (
  <Text>Labels: {labels.join(', ') || 'None'}</Text>
);

const IssueAssignees = ({
  assignees,
}: {
  assignees: string[];
}): JSX.Element => <Text>Assignees: {assignees.join(', ') || 'None'}</Text>;
