import { List, ListItem } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { PublicTracker } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';
import { useProjectTracker, type TrackerChoice } from './use-project-tracker';

export type ProjectDetailsProps = {
  context: { projectId: string };
  storage: TrackerStorage;
  trackers: PublicTracker[];
};

type Option = { id: string | null; name: string };

type RowsProps = TrackerChoice & { trackers: PublicTracker[] };

// The Slot's frame is a titled List section, so the choices are its rows: a check marks the chosen one.
export function ProjectDetails(props: ProjectDetailsProps): JSX.Element {
  const choice = useProjectTracker({
    storage: props.storage,
    projectId: props.context.projectId,
  });

  return <TrackerRows {...choice} trackers={props.trackers} />;
}

function TrackerRows({ trackers, ...choice }: RowsProps): JSX.Element {
  const options: Option[] = [{ id: null, name: 'None' }, ...trackers];

  return (
    <List footer={choice.message || undefined}>
      {options.map((option) => trackerRow(option, choice))}
    </List>
  );
}

type RowChoice = Pick<TrackerChoice, 'selection' | 'choose'>;

// A keyed ListItem itself, as a List draws its children, not a component that returns one.
function trackerRow(option: Option, choice: RowChoice): JSX.Element {
  return (
    <ListItem
      key={option.id ?? 'none'}
      title={option.name}
      selected={choice.selection === option.id}
      disabled={choice.selection === undefined}
      onPress={() => void choice.choose(option.id)}
    />
  );
}
