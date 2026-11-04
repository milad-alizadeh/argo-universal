import { EmptyState, List, ListItem } from '@argo/plugin-kit';
import type { ProjectDetailsItem } from '@argo/plugin-kit';
import type { Argo, PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import type { PublicTracker, TrackerRegistry } from './tracker-registry';
import type { TrackerStorage } from './tracker-storage';

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

/*
 * The Tracker choice as this Plugin's own Loader page (ADR-0050), for the Project whose details row drilled into
 * it (ADR-0046): the choices are rows, and a check marks the chosen one. A press runs `chooseTracker`, which moves
 * the check at once and, once saved, makes the row behind the page show the new Tracker.
 */
export function defineTrackerPage(
  argo: Pick<Argo, 'pages' | 'operations'>,
  deps: TrackerDeps,
): void {
  argo.operations.register('chooseTracker', async ({ tracker }, { projectId }) => {
    if (tracker !== undefined && !deps.trackers.has(tracker))
      throw new Error(`No Tracker is called ${tracker}.`);

    await deps.storage.chooseTracker(projectId, tracker ?? null);

    return { tracker: tracker ?? null };
  });
  argo.pages.define(trackerPath, {
    load: ({ context }) => loadChoice(deps, context.projectId),
    render: (choice, to) => <ProjectDetails choice={choice} to={to} />,
  });
}

type Choice =
  | { projectId: undefined }
  | {
      projectId: string;
      selection: string | null;
      message: string;
      trackers: PublicTracker[];
    };

async function loadChoice(
  { storage, trackers }: TrackerDeps,
  projectId: string | undefined,
): Promise<Choice> {
  if (projectId === undefined) return { projectId };

  const selection = await storage.selectedTracker(projectId).then(
    (chosen) => ({ chosen, message: '' }),
    () => ({ chosen: null, message: 'Could not load the Tracker choice.' }),
  );

  return {
    projectId,
    selection: selection.chosen,
    message: selection.message,
    trackers: trackers.list(),
  };
}

type To = PageTo;

function ProjectDetails({ choice, to }: { choice: Choice; to: To }): JSX.Element {
  if (choice.projectId === undefined)
    return (
      <EmptyState
        title="No Project"
        description="Open a Project's details to choose its Issue tracker."
      />
    );

  return <TrackerRows choice={choice} to={to} />;
}

type Option = { id: string | null; name: string };

type Shown = Extract<Choice, { projectId: string }>;

function TrackerRows({ choice, to }: { choice: Shown; to: To }): JSX.Element {
  const options: Option[] = [{ id: null, name: noTracker }, ...choice.trackers];

  return (
    <List footer={choice.message || undefined}>
      {options.map((option) => trackerRow(option, options, { choice, to }))}
    </List>
  );
}

const optionKey = (option: Option): string => option.id ?? 'none';

// A keyed ListItem itself, as a List draws its children, not a component that returns one.
function trackerRow(
  option: Option,
  options: Option[],
  { choice, to }: { choice: Shown; to: To },
): JSX.Element {
  return (
    <ListItem
      key={optionKey(option)}
      title={option.name}
      selected={choice.selection === option.id}
      onPress={to.run(
        'chooseTracker',
        option.id === null ? {} : { tracker: option.id },
        { optimistic: checkMoves(options, option) },
      )}
    />
  );
}

// The check moves to the chosen row at once.
const checkMoves = (
  options: Option[],
  chosen: Option,
): NonNullable<ReturnType<To['run']>['optimistic']> =>
  options.map((option) => ({
    key: optionKey(option),
    props: { selected: option === chosen },
  }));
