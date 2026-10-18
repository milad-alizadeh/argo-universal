import {
  Button,
  Column,
  Row,
  Text,
  useEffect,
  useState,
} from '@argo/plugin-kit';
import { chooseTracker, selectedTracker } from './tracker-storage.js';

const githubTracker = 'github';

export function ProjectDetails({ context }) {
  const { selection, choose } = useTrackerChoice(context.projectId);

  return <TrackerChoice selection={selection} choose={choose} />;
}

function useTrackerChoice(projectId) {
  const [selection, setSelection] = useState('loading');
  useEffect(() => {
    void selectedTracker(projectId).then(setSelection);
  }, [projectId]);

  const choose = (id) => {
    return chooseTracker(projectId, id).then(() => setSelection(id));
  };

  return { selection, choose };
}

function TrackerChoice({ selection, choose }) {
  return (
    <Column gap={2}>
      <TrackerHeading />
      <Row gap={2}>
        <NoneButton selection={selection} choose={choose} />
        <GitHubButton selection={selection} choose={choose} />
      </Row>
    </Column>
  );
}

const TrackerHeading = () => <Text variant="heading">Issue tracker</Text>;

function NoneButton({ selection, choose }) {
  return (
    <TrackerButton
      label="None"
      selected={selection === null}
      disabled={selection === 'loading'}
      onPress={() => choose(null)}
    />
  );
}

function GitHubButton({ selection, choose }) {
  return (
    <TrackerButton
      label="GitHub Issues"
      selected={selection === githubTracker}
      disabled={selection === 'loading'}
      onPress={() => choose(githubTracker)}
    />
  );
}

function TrackerButton({ label, selected, disabled, onPress }) {
  return (
    <Button
      label={label}
      variant={selected ? 'default' : 'outline'}
      disabled={disabled}
      onPress={onPress}
    />
  );
}
