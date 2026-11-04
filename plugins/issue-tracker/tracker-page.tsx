import { EmptyState, List, ListItem } from '@argo/plugin-kit';
import type { Argo, PageTo } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { noTracker, trackerPath, type TrackerDeps } from './project-details';
import type { PublicTracker } from './tracker-registry';

/*
 * The Tracker choice as this Plugin's own Loader page (ADR-0050), for the Project whose details row drilled into
 * it (ADR-0046): the choices are rows, and a check marks the chosen one. A press runs `chooseTracker`, which moves
 * the check at once and, once saved, makes the row behind the page show the new Tracker.
 */
export function defineTrackerPage(
  argo: Pick<Argo, 'pages' | 'operations'>,
  deps: TrackerDeps,
): void {
  argo.operations.register('chooseTracker', ({ tracker }, { projectId }) =>
    saveTracker(deps, projectId, tracker),
  );
  argo.pages.define(trackerPath, {
    load: ({ context }) => loadChoice(deps, context.projectId),
    render: (choice, to) => <TrackerChoice choice={choice} to={to} />,
  });
}

// Saves the Tracker `chooseTracker` names for the Project, and answers it.
async function saveTracker(
  deps: TrackerDeps,
  projectId: string,
  tracker: string | undefined,
): Promise<{ tracker: string | null }> {
  const chosen = knownTracker(deps, tracker);

  await deps.storage.chooseTracker(projectId, chosen);

  return { tracker: chosen };
}

// The Tracker an Operation names, or none when it names none; a name no Tracker has throws.
function knownTracker(
  { trackers }: TrackerDeps,
  tracker: string | undefined,
): string | null {
  if (tracker === undefined) return null;

  if (!trackers.has(tracker))
    throw new Error(`No Tracker is called ${tracker}.`);

  return tracker;
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
    (chosen) => ({ selection: chosen, message: '' }),
    () => ({ selection: null, message: 'Could not load the Tracker choice.' }),
  );

  return { projectId, ...selection, trackers: trackers.list() };
}

type To = PageTo;

const noProject = (
  <EmptyState
    title="No Project"
    description="Open a Project's details to choose its Issue tracker."
  />
);

function TrackerChoice({
  choice,
  to,
}: {
  choice: Choice;
  to: To;
}): JSX.Element {
  if (choice.projectId === undefined) return noProject;

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
      onPress={choose(to, options, option)}
    />
  );
}

// Runs `chooseTracker` for the option, moving the check to it at once.
const choose = (
  to: To,
  options: Option[],
  option: Option,
): ReturnType<To['run']> =>
  to.run('chooseTracker', option.id === null ? {} : { tracker: option.id }, {
    optimistic: checkMoves(options, option),
  });

// The check moves to the chosen row at once.
const checkMoves = (
  options: Option[],
  chosen: Option,
): NonNullable<ReturnType<To['run']>['optimistic']> =>
  options.map((option) => ({
    key: optionKey(option),
    props: { selected: option === chosen },
  }));
