import { EmptyState, List, ListItem } from '@argo/plugin-kit';
import type { ProjectDetailsItem } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { PublicTracker, TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';
import { useProjectTracker, type TrackerChoice } from './use-project-tracker';

/*
 * Project details takes items, so the row only names the chosen Tracker and the choice itself is a page
 * of this Plugin's own, which the row drills into (ADR-0046).
 */
export const trackerPath = '/tracker';

const noTracker = 'None';

export type TrackerDeps = {
  storage: TrackerStorage;
  trackers: TrackerRegistry;
};

// What one batched call names: the Projects whose rows the App is drawing.
type ProjectContexts = Readonly<{
  contexts: readonly Readonly<{ projectId: string }>[];
}>;

function trackerName(trackers: TrackerRegistry, chosen: string | null): string {
  if (chosen === null) return noTracker;

  const tracker = trackers.get(chosen);

  return tracker ? tracker.name : noTracker;
}

// One row per Project: the Tracker it chose, or None while it has chosen none or the choice cannot be read.
async function trackerRows(
  { storage, trackers }: TrackerDeps,
  projectId: string,
): Promise<ProjectDetailsItem[]> {
  const chosen = await storage.selectedTracker(projectId).catch(() => null);

  return [
    {
      title: 'Issue tracker',
      value: trackerName(trackers, chosen),
      action: { path: trackerPath },
    },
  ];
}

// The Plugin's answer for Project details: one row for each Project asked about, keyed by its id.
export async function projectDetailsItems(
  deps: TrackerDeps,
  { contexts }: ProjectContexts,
): Promise<Record<string, ProjectDetailsItem[]>> {
  const answered = await Promise.all(
    contexts.map(
      async ({ projectId }) =>
        [projectId, await trackerRows(deps, projectId)] as const,
    ),
  );

  return Object.fromEntries(answered);
}

export type ProjectDetailsProps = TrackerDeps & {
  // The Project the page opened for, which the row that drilled in named (ADR-0046).
  context: Readonly<{ projectId?: string }>;
  // Says this Plugin's Project details rows changed, so the row behind the page shows the new Tracker.
  changed: () => Promise<void>;
};

// The Tracker choice as this Plugin's own page: the choices are rows, and a check marks the chosen one.
export function ProjectDetails(props: ProjectDetailsProps): JSX.Element {
  const { projectId } = props.context;

  if (projectId === undefined)
    return (
      <EmptyState
        title="No Project"
        description="Open a Project's details to choose its Issue tracker."
      />
    );

  return <TrackerChoices {...props} projectId={projectId} />;
}

type ChoicesProps = ProjectDetailsProps & { projectId: string };

function TrackerChoices(props: ChoicesProps): JSX.Element {
  const { storage, trackers, projectId, changed } = props;
  const choice = useProjectTracker({ storage, projectId });

  const choose = async (id: string | null): Promise<void> => {
    await choice.choose(id);
    await changed();
  };

  return <TrackerRows {...choice} choose={choose} trackers={trackers.list()} />;
}

type Option = { id: string | null; name: string };

type RowsProps = TrackerChoice & { trackers: PublicTracker[] };

function TrackerRows({ trackers, ...choice }: RowsProps): JSX.Element {
  const options: Option[] = [{ id: null, name: noTracker }, ...trackers];

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
