import {
  Button,
  EmptyState,
  Screen,
  ScrollView,
  Stack,
  Text,
  type Argo,
  type LoaderInput,
  type PageTo,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';
import { paceData, period, type Pace } from './pace-data';
import { days, dayMs, weekStart } from './pace-metrics';
import { picker, root, type Project } from './pace-picker';
import type { Target } from './pace-search';
import { PaceView } from './pace-view';
import { repositoryOfOrigin } from './pull-reference';

type State = { previous: boolean };

const initial: State = { previous: false };

type Result = { data: Pace } | { message: string };

type ReadPace = (read: LoaderInput['read'], target: Target) => Promise<Pace>;

async function repositories(argo: Argo): Promise<Project[]> {
  return (await argo.projects.list()).flatMap(({ id, name, originUrl }) => {
    const repository = repositoryOfOrigin(originUrl);

    return repository ? [{ id, name, repository }] : [];
  });
}

function targetOf(project: Project, previous: boolean): Target {
  return {
    projectId: project.id,
    repository: project.repository,
    start: weekStart(Date.now()) - (previous ? days * dayMs : 0),
  };
}

async function load(
  argo: Argo,
  input: LoaderInput<State>,
  readPace: ReadPace,
): Promise<Result> {
  try {
    return await loadProject(argo, input, readPace);
  } catch (cause) {
    return { message: cause instanceof Error ? cause.message : String(cause) };
  }
}

async function loadProject(
  argo: Argo,
  input: LoaderInput<State>,
  readPace: ReadPace,
): Promise<Result> {
  const id = decodeURIComponent(input.params.project ?? '');
  const project = (await repositories(argo)).find((p) => p.id === id);

  if (!project) return { message: 'This Project has no GitHub repository.' };

  return {
    data: await readPace(input.read, targetOf(project, input.state.previous)),
  };
}

function weekButton(previous: boolean, to: PageTo<State>): JSX.Element {
  const label = previous ? 'View current week' : 'View previous week';

  return (
    <Button size="sm" label={label} onPress={to.set({ previous: !previous })} />
  );
}

function rangeLabel(data: Pace, previous: boolean): string {
  return (
    period(data.target.start) + (previous ? ' UTC' : ' UTC · today in progress')
  );
}

type Input = { state: State };

function repoButton(data: Pace, to: PageTo<State>): JSX.Element {
  return (
    <Button
      label={data.target.repository}
      onPress={to.go(root)}
      variant="secondary"
    />
  );
}

function controls(
  data: Pace,
  previous: boolean,
  to: PageTo<State>,
): JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      {repoButton(data, to)}
      <Text>{rangeLabel(data, previous)}</Text>
      {weekButton(previous, to)}
    </Stack>
  );
}

function unavailable(message: string, to: PageTo<State>): JSX.Element {
  return (
    <Stack direction="column" gap={3}>
      <Button label="Choose repository" onPress={to.go(root)} />
      <EmptyState title="Development data unavailable" description={message} />
    </Stack>
  );
}

function dashboard(
  result: Result,
  to: PageTo<State>,
  state: State,
): JSX.Element {
  return 'data' in result ? (
    <Stack direction="column" gap={4}>
      {controls(result.data, state.previous, to)}
      <PaceView data={result.data} />
    </Stack>
  ) : (
    unavailable(result.message, to)
  );
}

function render(
  result: Result,
  to: PageTo<State>,
  { state }: Input,
): JSX.Element {
  const body = dashboard(result, to, state);

  return (
    <Screen title="Development pace">
      <ScrollView accessibilityLabel="Development analytics">{body}</ScrollView>
    </Screen>
  );
}

const refreshMs = 300_000;

export function definePace(argo: Argo): void {
  const pace = argo.queries.define(
    'developmentPace',
    (target: Target) => paceData(argo.fetch, target),
    { projectOf: (target: Target) => target.projectId },
  );

  argo.pages.define(root, { load: () => repositories(argo), render: picker });
  argo.pages.define(`${root}/:project`, {
    every: refreshMs,
    state: initial,
    load: (input) => load(argo, input, (read, target) => read(pace(target))),
    render,
  });
}
