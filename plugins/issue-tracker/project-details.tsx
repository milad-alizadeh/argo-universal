import { Button, Stack, Label, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { PublicTracker, TrackerStorage } from './issue-types';
import { useProjectTracker, type TrackerChoice } from './use-project-tracker';

const headingRole = 'heading';

type ChoiceProps = Pick<TrackerChoice, 'selection' | 'choose'>;

type TrackerChoiceProps = TrackerChoice & { trackers: PublicTracker[] };

type TrackerButtonProps = ChoiceProps & { tracker: PublicTracker };

export type ProjectDetailsProps = {
  context: { projectId: string };
  storage: TrackerStorage;
  trackers: PublicTracker[];
};

export function ProjectDetails({
  context,
  storage,
  trackers,
}: ProjectDetailsProps): JSX.Element {
  const props = useProjectTracker({ storage, projectId: context.projectId });

  return (
    <Stack direction="column" gap={2}>
      <TrackerChoices {...props} trackers={trackers} />
    </Stack>
  );
}

function TrackerChoices(props: TrackerChoiceProps): JSX.Element {
  const { selection, message, choose, trackers } = props;

  return (
    <>
      <TrackerHeading />
      <NoneButton selection={selection} choose={choose} />
      <TrackerButtons
        trackers={trackers}
        selection={selection}
        choose={choose}
      />
      {message && <Text>{message}</Text>}
    </>
  );
}

type TrackerButtonsProps = ChoiceProps & { trackers: PublicTracker[] };

function TrackerButtons(props: TrackerButtonsProps): JSX.Element[] {
  const { trackers, selection, choose } = props;

  return trackers.map((tracker) => (
    <TrackerButton
      key={tracker.id}
      tracker={tracker}
      selection={selection}
      choose={choose}
    />
  ));
}

function TrackerHeading(): JSX.Element {
  return <Text role={headingRole}>Issue tracker</Text>;
}

function NoneButton({ selection, choose }: ChoiceProps): JSX.Element {
  return (
    <Button
      label="None"
      variant={selection === null ? 'default' : 'outline'}
      disabled={selection === 'loading'}
      onPress={() => choose(null)}
    />
  );
}

function TrackerButton(props: TrackerButtonProps): JSX.Element {
  const { tracker, selection, choose } = props;
  const selected = selection === tracker.id;

  return (
    <Stack direction="row" gap={2}>
      <Label text={tracker.name} icon={tracker.icon} />
      <Button
        label={`${selected ? 'Selected' : 'Select'} ${tracker.name}`}
        variant={selected ? 'default' : 'outline'}
        disabled={selection === 'loading'}
        onPress={() => choose(tracker.id)}
      />
    </Stack>
  );
}
