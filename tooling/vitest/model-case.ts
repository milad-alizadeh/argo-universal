import { type AnyStateMachine, type EventObject, matchesState } from 'xstate';
import { fireDelay } from './model-delay';
import { isDelayEvent } from './model-edges';
import type {
  ModelCase,
  ModelPaths,
  ModelSpec,
  ModelStep,
  SnapshotOf,
} from './model-types';

const initType: string = 'xstate.init';

function executorFor<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  spec: ModelSpec<TMachine, TEvent>,
  type: string,
): ModelSpec<TMachine, TEvent>['executors'][string] {
  const executor = spec.executors[type];

  if (!executor) throw new Error(`Missing executor for ${type}`);

  return executor;
}

async function drive<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  spec: ModelSpec<TMachine, TEvent>,
  step: ModelStep<TMachine, TEvent>,
): Promise<void> {
  const { event } = step;

  if (event.type === initType) return spec.start();

  if (isDelayEvent(event)) return fireDelay(spec.running(), { ...step, event });
  await executorFor(spec, event.type)(step);
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
  spec: ModelSpec<TMachine, TEvent>,
  path: ModelPaths<TMachine, TEvent>[number],
): Promise<void> {
  for (const step of path.steps) {
    await drive(spec, step);
    spec.always?.(step.state);
    checkStates(spec.states, step.state);
  }
}

export function modelCase<
  TMachine extends AnyStateMachine,
  TEvent extends EventObject,
>(
  spec: ModelSpec<TMachine, TEvent>,
  path: ModelPaths<TMachine, TEvent>[number],
): ModelCase {
  const { label = (): undefined => undefined } = spec;

  const title = path.steps
    .map(({ event }) => eventTitle(event.type, label(event)))
    .join(' → ');

  return { title, run: (): Promise<void> => walkPath(spec, path) };
}
