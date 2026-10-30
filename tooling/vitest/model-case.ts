import { type AnyStateMachine, type EventObject, matchesState } from 'xstate';
import { fireDelay } from './model-delay';
import { isDelayEvent } from './model-edges';
import { noteDelays } from './model-schedule';
import type {
  Modelled,
  ModelCase,
  ModelPaths,
  ModelStep,
  PathRun,
} from './model-types';
import { executorFor } from './model-validate';
import type { SnapshotOf } from './model-walk';

const initType: string = 'xstate.init';

async function drive<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  { graph, actor }: Modelled<TMachine, TEvent>,
  run: PathRun,
  step: ModelStep<TMachine, TEvent>,
): Promise<void> {
  const { event } = step;

  if (event.type === initType) run.actor = actor.start(graph.input);
  else if (isDelayEvent(event)) await fireDelay(run, step);
  else await executorFor(actor.executors, event.type)(step);
}

function checkStates<TMachine extends AnyStateMachine>(
  states: Record<string, (snapshot: SnapshotOf<TMachine>) => void>,
  snapshot: SnapshotOf<TMachine>,
): void {
  for (const [key, check] of Object.entries(states))
    if (matchesState(key, snapshot.value)) check(snapshot);
}

function eventTitle(type: string, suffix: string | undefined): string {
  const name = type
    .replace(/^xstate\.after\.(\w+)\..*$/, 'after $1')
    .replace(/^xstate\.(done|error)\.actor\.(\w+)$/, '$2 $1');

  return suffix ? `${name} (${suffix})` : name;
}

async function walkPath<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  modelled: Modelled<TMachine, TEvent>,
  path: ModelPaths<TMachine, TEvent>[number],
): Promise<void> {
  const run: PathRun = { actor: undefined, due: new Map() };

  for (const [index, step] of path.steps.entries()) {
    await drive(modelled, run, step);
    noteDelays(modelled, run, { step, previous: path.steps[index - 1] });
    modelled.actor.always?.(step.state);
    checkStates(modelled.actor.states, step.state);
  }
}

export function modelCase<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  modelled: Modelled<TMachine, TEvent>,
  path: ModelPaths<TMachine, TEvent>[number],
): ModelCase {
  const { label = (): undefined => undefined } = modelled.actor;

  const title = path.steps
    .map(({ event }) => eventTitle(event.type, label(event)))
    .join(' → ');

  return { title, run: (): Promise<void> => walkPath(modelled, path) };
}
